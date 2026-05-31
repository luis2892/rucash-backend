import { handleCors } from "../_shared/cors.ts";
import { ok, err, notFound } from "../_shared/response.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

function pct(actual: number, objetivo: number): number {
  return objetivo > 0 ? Math.round((actual / objetivo) * 10000) / 100 : 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  const user = verifyAuth(req);
  if (!user) return err("No autorizado", 401);

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // /functions/v1/metas/[id]/[action]
  const afterBase = parts.slice(3);
  const id = afterBase[0] || "";
  const action = afterBase[1] || "";

  const supabase = getSupabaseAdmin();

  try {
    // GET /metas
    if (req.method === "GET" && !id) {
      const { tipo, categoria, estado } = Object.fromEntries(url.searchParams);

      let query = supabase.from("metas").select("*").eq("cliente_id", user.cliente_id);

      if (estado) query = query.eq("estado", estado);
      else query = query.eq("estado", "ACTIVA");
      if (tipo) query = query.eq("tipo", tipo);
      if (categoria) query = query.eq("categoria", categoria);

      const { data, error } = await query.order("prioridad", { ascending: false });
      if (error) throw error;

      const metas = (data || []).map((m: any) => ({
        ...m,
        porcentaje_cumplimiento: pct(Number(m.valor_actual), Number(m.valor_objetivo)),
      }));

      return ok({ metas });
    }

    // GET /metas/:id
    if (req.method === "GET" && id && !action) {
      const { data, error } = await supabase
        .from("metas")
        .select("*")
        .eq("id", id)
        .eq("cliente_id", user.cliente_id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Meta no encontrada");
        throw error;
      }

      return ok({
        meta: {
          ...data,
          porcentaje_cumplimiento: pct(Number(data.valor_actual), Number(data.valor_objetivo)),
        },
      });
    }

    // POST /metas
    if (req.method === "POST" && !id) {
      const body = await req.json();
      const { nombre, descripcion, tipo, categoria, valor_objetivo, usuario_id, fecha_inicio, fecha_fin, prioridad, notas } = body;

      if (!nombre || !tipo || !valor_objetivo || !fecha_inicio || !fecha_fin) {
        return err("Campos requeridos: nombre, tipo, valor_objetivo, fechas", 400);
      }

      const { data, error } = await supabase
        .from("metas")
        .insert([{
          cliente_id: user.cliente_id,
          nombre,
          descripcion,
          tipo,
          categoria,
          valor_objetivo,
          valor_actual: 0,
          usuario_id: usuario_id || user.usuario_id,
          fecha_inicio,
          fecha_fin,
          prioridad: prioridad || 0,
          notas,
          estado: "ACTIVA",
        }])
        .select()
        .single();

      if (error) throw error;
      return ok({ meta: { ...data, porcentaje_cumplimiento: 0 } }, 201);
    }

    // PATCH /metas/:id
    if (req.method === "PATCH" && id && !action) {
      const body = await req.json();

      const { data, error } = await supabase
        .from("metas")
        .update({ ...body, updated_at: new Date() })
        .eq("id", id)
        .eq("cliente_id", user.cliente_id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Meta no encontrada");
        throw error;
      }

      return ok({ meta: data });
    }

    // POST /metas/:id/movimiento
    if (req.method === "POST" && id && action === "movimiento") {
      const body = await req.json();
      const { valor_nuevo, descripcion } = body;

      const { data: meta } = await supabase
        .from("metas")
        .select("valor_actual, valor_objetivo")
        .eq("id", id)
        .single();

      if (!meta) return notFound("Meta no encontrada");

      const diferencia = valor_nuevo - Number(meta.valor_actual);
      const porcentajeProgreso = pct(valor_nuevo, Number(meta.valor_objetivo));

      const { data: movimiento, error: movError } = await supabase
        .from("movimientos_meta")
        .insert([{
          meta_id: id,
          cliente_id: user.cliente_id,
          usuario_id: user.usuario_id,
          valor_anterior: meta.valor_actual,
          valor_nuevo,
          diferencia,
          descripcion,
        }])
        .select()
        .single();

      if (movError) throw movError;

      const nuevoEstado = valor_nuevo >= Number(meta.valor_objetivo) ? "COMPLETADA" : "ACTIVA";
      const { data: metaActualizada } = await supabase
        .from("metas")
        .update({ valor_actual: valor_nuevo, estado: nuevoEstado, updated_at: new Date() })
        .eq("id", id)
        .select()
        .single();

      return ok({ movimiento, meta: metaActualizada }, 201);
    }

    // DELETE /metas/:id
    if (req.method === "DELETE" && id) {
      const { error } = await supabase
        .from("metas")
        .update({ estado: "CANCELADA" })
        .eq("id", id)
        .eq("cliente_id", user.cliente_id);

      if (error) throw error;
      return ok({ message: "Meta eliminada" });
    }

    return err("Ruta no encontrada", 404);
  } catch (e: any) {
    console.error("Metas error:", e);
    return err(e.message || "Error interno", 500);
  }
});
