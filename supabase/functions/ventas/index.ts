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
  // /functions/v1/ventas/[id]/[action]
  const afterBase = parts.slice(3); // e.g. ['123', 'anular'] or ['123'] or []
  const id = afterBase[0] || "";
  const action = afterBase[1] || "";

  const supabase = getSupabaseAdmin();

  try {
    // GET /ventas
    if (req.method === "GET" && !id) {
      const { fecha_inicio, fecha_fin } = Object.fromEntries(url.searchParams);

      let query = supabase
        .from("ventas")
        .select("*")
        .eq("cliente_id", user.cliente_id);

      if (fecha_inicio && fecha_fin) {
        query = query.gte("created_at", fecha_inicio).lte("created_at", fecha_fin);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      return ok({ ventas: data });
    }

    // GET /ventas/:id
    if (req.method === "GET" && id && !action) {
      const { data, error } = await supabase
        .from("ventas")
        .select("*, detalles_venta(*)")
        .eq("id", id)
        .eq("cliente_id", user.cliente_id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Venta no encontrada");
        throw error;
      }

      return ok({ venta: data });
    }

    // POST /ventas
    if (req.method === "POST" && !id) {
      const body = await req.json();
      const { items, moneda, metodo_pago, monto_pagado, notas } = body;

      if (!items || items.length === 0) {
        return err("Venta sin items", 400);
      }

      const subtotal = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
      const impuesto = Math.round(subtotal * 0.18 * 100) / 100;
      const total = Math.round((subtotal + impuesto) * 100) / 100;
      const cambio = Math.max(0, Math.round((monto_pagado - total) * 100) / 100);

      const { data: venta, error: ventaError } = await supabase
        .from("ventas")
        .insert([{
          cliente_id: user.cliente_id,
          usuario_id: user.usuario_id,
          moneda,
          subtotal,
          impuesto,
          total,
          metodo_pago,
          monto_pagado,
          cambio,
          estado: "COMPLETADA",
          notas,
        }])
        .select()
        .single();

      if (ventaError) throw ventaError;

      const detallesData = items.map((item: any) => ({
        venta_id: venta.id,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
      }));

      const { error: detallesError } = await supabase.from("detalles_venta").insert(detallesData);
      if (detallesError) throw detallesError;

      // Decrementar stock via RPC
      for (const item of items) {
        await supabase.rpc("decrementar_stock", {
          p_producto_id: item.producto_id,
          p_cantidad: item.cantidad,
        });
      }

      return ok({ venta: { ...venta, items } }, 201);
    }

    // PATCH /ventas/:id/anular
    if (req.method === "PATCH" && id && action === "anular") {
      const { data, error } = await supabase
        .from("ventas")
        .update({ estado: "ANULADA", updated_at: new Date() })
        .eq("id", id)
        .eq("cliente_id", user.cliente_id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Venta no encontrada");
        throw error;
      }

      await supabase.from("audit_logs").insert([{
        usuario_id: user.usuario_id,
        cliente_id: user.cliente_id,
        accion: "ANULAR_VENTA",
        entidad: "ventas",
        entidad_id: id,
      }]);

      return ok({ venta: data });
    }

    return err("Ruta no encontrada", 404);
  } catch (e: any) {
    console.error("Ventas error:", e);
    return err(e.message || "Error interno", 500);
  }
});
