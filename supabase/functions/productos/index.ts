import { handleCors } from "../_shared/cors.ts";
import { ok, err, notFound } from "../_shared/response.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  const user = verifyAuth(req);
  if (!user) return err("No autorizado", 401);

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // /functions/v1/productos/[id or 'buscar']
  const subPath = parts.slice(3).join("/");

  const supabase = getSupabaseAdmin();

  try {
    // GET /productos/buscar
    if (req.method === "GET" && subPath === "buscar") {
      const { search, categoria, stock_minimo, stock_maximo, precio_minimo, precio_maximo, discontinuado, proveedor } = Object.fromEntries(url.searchParams);

      let query = supabase.from("productos").select("*").eq("cliente_id", user.cliente_id).eq("activo", true);

      if (search) {
        query = query.or(`nombre.ilike.%${search}%,codigo_barras.ilike.%${search}%,descripcion.ilike.%${search}%`);
      }
      if (categoria) query = query.eq("categoria", categoria);
      if (proveedor) query = query.eq("proveedor", proveedor);
      if (stock_minimo) query = query.gte("stock_tienda", parseInt(stock_minimo));
      if (stock_maximo) query = query.lte("stock_tienda", parseInt(stock_maximo));
      if (precio_minimo) query = query.gte("precio_usd", parseFloat(precio_minimo));
      if (precio_maximo) query = query.lte("precio_usd", parseFloat(precio_maximo));

      query = query.eq("discontinuado", discontinuado === "true");

      const { data, error } = await query.order("nombre", { ascending: true });
      if (error) throw error;

      return ok({ productos: data, total: data?.length || 0 });
    }

    // GET /productos
    if (req.method === "GET" && !subPath) {
      const { search, categoria } = Object.fromEntries(url.searchParams);

      let query = supabase
        .from("productos")
        .select("*")
        .eq("cliente_id", user.cliente_id)
        .eq("activo", true)
        .eq("discontinuado", false);

      if (search) {
        query = query.or(`nombre.ilike.%${search}%,codigo_barras.ilike.%${search}%`);
      }
      if (categoria) {
        query = query.eq("categoria", categoria);
      }

      const { data, error } = await query.order("nombre", { ascending: true });
      if (error) throw error;

      return ok({ productos: data });
    }

    // GET /productos/:id
    if (req.method === "GET" && subPath) {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("id", subPath)
        .eq("cliente_id", user.cliente_id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Producto no encontrado");
        throw error;
      }

      return ok({ producto: data });
    }

    // POST /productos
    if (req.method === "POST" && !subPath) {
      const body = await req.json();
      const { nombre, descripcion, codigo_barras, categoria, precio_usd, precio_sol, costo_usd, stock_tienda, stock_almacen, nivel_minimo_stock, proveedor } = body;

      if (!nombre || !codigo_barras || !precio_usd) {
        return err("Campos requeridos: nombre, codigo_barras, precio_usd", 400);
      }

      const { data, error } = await supabase
        .from("productos")
        .insert([{
          cliente_id: user.cliente_id,
          nombre,
          descripcion,
          codigo_barras,
          categoria,
          precio_usd,
          precio_sol: precio_sol || Math.round(precio_usd * 3.8 * 100) / 100,
          costo_usd,
          stock_tienda: stock_tienda || 0,
          stock_almacen: stock_almacen || 0,
          nivel_minimo_stock: nivel_minimo_stock || 5,
          proveedor,
          activo: true,
          discontinuado: false,
        }])
        .select()
        .single();

      if (error) throw error;

      await supabase.from("auditoria_productos").insert([{
        cliente_id: user.cliente_id,
        usuario_id: user.usuario_id,
        producto_id: data.id,
        accion: "CREATE",
        valor_nuevo: JSON.stringify({ nombre, precio_usd }),
      }]);

      return ok({ producto: data }, 201);
    }

    // PATCH /productos/:id
    if (req.method === "PATCH" && subPath) {
      const body = await req.json();

      // Snapshot before update for audit
      const { data: antes } = await supabase
        .from("productos")
        .select("*")
        .eq("id", subPath)
        .eq("cliente_id", user.cliente_id)
        .single();

      const { data, error } = await supabase
        .from("productos")
        .update({ ...body, updated_at: new Date() })
        .eq("id", subPath)
        .eq("cliente_id", user.cliente_id)
        .select()
        .single();

      if (error) throw error;

      if (antes) {
        const changedFields = Object.keys(body).filter((k) => (antes as any)[k] !== body[k]);
        for (const campo of changedFields) {
          await supabase.from("auditoria_productos").insert([{
            cliente_id: user.cliente_id,
            usuario_id: user.usuario_id,
            producto_id: subPath,
            accion: "UPDATE",
            campo_modificado: campo,
            valor_anterior: String((antes as any)[campo]),
            valor_nuevo: String(body[campo]),
          }]);
        }
      }

      return ok({ producto: data });
    }

    // DELETE /productos/:id (soft delete)
    if (req.method === "DELETE" && subPath) {
      const { error } = await supabase
        .from("productos")
        .update({ activo: false, updated_at: new Date() })
        .eq("id", subPath)
        .eq("cliente_id", user.cliente_id);

      if (error) throw error;

      await supabase.from("auditoria_productos").insert([{
        cliente_id: user.cliente_id,
        usuario_id: user.usuario_id,
        producto_id: subPath,
        accion: "DELETE",
      }]);

      return ok({ message: "Producto eliminado" });
    }

    return err("Ruta no encontrada", 404);
  } catch (e: any) {
    console.error("Productos error:", e);
    return err(e.message || "Error interno", 500);
  }
});
