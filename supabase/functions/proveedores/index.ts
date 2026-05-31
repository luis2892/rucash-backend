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
  const subPath = parts.slice(3).join("/");

  const supabase = getSupabaseAdmin();

  try {
    // GET /proveedores
    if (req.method === "GET" && !subPath) {
      const { data, error } = await supabase
        .from("proveedores")
        .select("*")
        .eq("cliente_id", user.cliente_id)
        .eq("activo", true)
        .order("nombre", { ascending: true });

      if (error) throw error;
      return ok({ proveedores: data });
    }

    // GET /proveedores/:id
    if (req.method === "GET" && subPath) {
      const { data, error } = await supabase
        .from("proveedores")
        .select("*")
        .eq("id", subPath)
        .eq("cliente_id", user.cliente_id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Proveedor no encontrado");
        throw error;
      }

      return ok({ proveedor: data });
    }

    // POST /proveedores
    if (req.method === "POST" && !subPath) {
      const body = await req.json();
      const { nombre, email, telefono, numero_whatsapp, ciudad, direccion, ruc_proveedor, notas } = body;

      if (!nombre) return err("Campo requerido: nombre", 400);

      const { data, error } = await supabase
        .from("proveedores")
        .insert([{
          cliente_id: user.cliente_id,
          nombre,
          email,
          telefono,
          numero_whatsapp,
          ciudad,
          direccion,
          ruc_proveedor,
          notas,
          activo: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return ok({ proveedor: data }, 201);
    }

    // PATCH /proveedores/:id
    if (req.method === "PATCH" && subPath) {
      const body = await req.json();

      const { data, error } = await supabase
        .from("proveedores")
        .update({ ...body, updated_at: new Date() })
        .eq("id", subPath)
        .eq("cliente_id", user.cliente_id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Proveedor no encontrado");
        throw error;
      }

      return ok({ proveedor: data });
    }

    // DELETE /proveedores/:id (soft delete)
    if (req.method === "DELETE" && subPath) {
      const { error } = await supabase
        .from("proveedores")
        .update({ activo: false })
        .eq("id", subPath)
        .eq("cliente_id", user.cliente_id);

      if (error) throw error;
      return ok({ message: "Proveedor desactivado" });
    }

    return err("Ruta no encontrada", 404);
  } catch (e: any) {
    console.error("Proveedores error:", e);
    return err(e.message || "Error interno", 500);
  }
});
