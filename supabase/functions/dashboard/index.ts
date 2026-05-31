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
  // /functions/v1/dashboard/[resource]/[id]
  const afterBase = parts.slice(3);
  const resource = afterBase[0] || "";
  const id = afterBase[1] || "";

  const supabase = getSupabaseAdmin();

  try {
    // GET /dashboard/resumen
    if (req.method === "GET" && resource === "resumen") {
      const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [ventasData, metasData, equipoData, deudasData] = await Promise.all([
        supabase.from("ventas").select("total").eq("cliente_id", user.cliente_id).gte("created_at", ayer),
        supabase.from("metas").select("*").eq("cliente_id", user.cliente_id).eq("estado", "ACTIVA"),
        supabase.from("usuarios").select("*").eq("cliente_id", user.cliente_id),
        supabase.from("deudas").select("*").eq("cliente_id", user.cliente_id).eq("estado", "ACTIVA"),
      ]);

      return ok({
        resumen: {
          ventas_hoy: ventasData.data?.reduce((sum: number, v: any) => sum + v.total, 0) || 0,
          metas_activas: metasData.data?.length || 0,
          metas_cumplidas: metasData.data?.filter((m: any) => m.valor_actual >= m.valor_objetivo).length || 0,
          equipo_total: equipoData.data?.length || 0,
          deudas_activas: deudasData.data?.length || 0,
          total_deudas: deudasData.data?.reduce((sum: number, d: any) => sum + (d.monto_usd || 0), 0) || 0,
        },
      });
    }

    // GET /dashboard/widgets
    if (req.method === "GET" && resource === "widgets" && !id) {
      const { data, error } = await supabase
        .from("widgets_dashboard")
        .select("*")
        .eq("cliente_id", user.cliente_id)
        .eq("usuario_id", user.usuario_id)
        .eq("visible", true)
        .order("orden", { ascending: true });

      if (error) throw error;
      return ok({ widgets: data });
    }

    // POST /dashboard/widgets
    if (req.method === "POST" && resource === "widgets") {
      const body = await req.json();
      const { tipo, titulo, tamaño, configuracion } = body;

      const { data, error } = await supabase
        .from("widgets_dashboard")
        .insert([{
          cliente_id: user.cliente_id,
          usuario_id: user.usuario_id,
          tipo,
          titulo,
          tamaño: tamaño || "medium",
          configuracion,
          visible: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return ok({ widget: data }, 201);
    }

    // PATCH /dashboard/widgets/:id
    if (req.method === "PATCH" && resource === "widgets" && id) {
      const body = await req.json();

      const { data, error } = await supabase
        .from("widgets_dashboard")
        .update(body)
        .eq("id", id)
        .eq("cliente_id", user.cliente_id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Widget no encontrado");
        throw error;
      }

      return ok({ widget: data });
    }

    // DELETE /dashboard/widgets/:id
    if (req.method === "DELETE" && resource === "widgets" && id) {
      const { error } = await supabase
        .from("widgets_dashboard")
        .update({ visible: false })
        .eq("id", id)
        .eq("cliente_id", user.cliente_id);

      if (error) throw error;
      return ok({ message: "Widget eliminado" });
    }

    return err("Ruta no encontrada", 404);
  } catch (e: any) {
    console.error("Dashboard error:", e);
    return err(e.message || "Error interno", 500);
  }
});
