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
  // /functions/v1/reportes/[id or 'plantillas']/[action]
  const afterBase = parts.slice(3);
  const idOrResource = afterBase[0] || "";
  const action = afterBase[1] || "";

  const supabase = getSupabaseAdmin();

  try {
    // GET /reportes
    if (req.method === "GET" && !idOrResource) {
      const { data, error } = await supabase
        .from("reportes_guardados")
        .select("*, plantillas_reportes(nombre, tipo)")
        .eq("cliente_id", user.cliente_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return ok({ reportes: data });
    }

    // GET /reportes/plantillas
    if (req.method === "GET" && idOrResource === "plantillas") {
      const { tipo } = Object.fromEntries(url.searchParams);

      let query = supabase
        .from("plantillas_reportes")
        .select("*")
        .eq("cliente_id", user.cliente_id);

      if (tipo) query = query.eq("tipo", tipo);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return ok({ plantillas: data });
    }

    // GET /reportes/:id
    if (req.method === "GET" && idOrResource && idOrResource !== "plantillas") {
      const { data, error } = await supabase
        .from("reportes_guardados")
        .select("*, plantillas_reportes(*)")
        .eq("id", idOrResource)
        .eq("cliente_id", user.cliente_id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Reporte no encontrado");
        throw error;
      }

      return ok({ reporte: data });
    }

    // POST /reportes
    if (req.method === "POST" && !idOrResource) {
      const body = await req.json();
      const { nombre, descripcion, plantilla_id, filtros_aplicados } = body;

      if (!nombre) return err("Nombre requerido", 400);

      const { data, error } = await supabase
        .from("reportes_guardados")
        .insert([{
          cliente_id: user.cliente_id,
          nombre,
          descripcion,
          plantilla_id,
          filtros_aplicados: filtros_aplicados || {},
          created_by: user.usuario_id,
        }])
        .select()
        .single();

      if (error) throw error;
      return ok({ reporte: data }, 201);
    }

    // PATCH /reportes/:id
    if (req.method === "PATCH" && idOrResource && !action) {
      const body = await req.json();

      const { data, error } = await supabase
        .from("reportes_guardados")
        .update({ ...body, updated_at: new Date() })
        .eq("id", idOrResource)
        .eq("cliente_id", user.cliente_id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Reporte no encontrado");
        throw error;
      }

      return ok({ reporte: data });
    }

    // DELETE /reportes/:id
    if (req.method === "DELETE" && idOrResource) {
      const { error } = await supabase
        .from("reportes_guardados")
        .delete()
        .eq("id", idOrResource)
        .eq("cliente_id", user.cliente_id);

      if (error) throw error;
      return ok({ message: "Reporte eliminado" });
    }

    return err("Ruta no encontrada", 404);
  } catch (e: any) {
    console.error("Reportes error:", e);
    return err(e.message || "Error interno", 500);
  }
});
