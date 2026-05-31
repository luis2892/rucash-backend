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
  // /functions/v1/deudas/[id]/[action]
  const afterBase = parts.slice(3);
  const id = afterBase[0] || "";
  const action = afterBase[1] || "";

  const supabase = getSupabaseAdmin();

  try {
    // GET /deudas
    if (req.method === "GET" && !id) {
      const { estado } = Object.fromEntries(url.searchParams);

      let query = supabase
        .from("deudas")
        .select("*")
        .eq("cliente_id", user.cliente_id);

      if (estado) query = query.eq("estado", estado);

      const { data, error } = await query.order("fecha_vencimiento", { ascending: true, nullsFirst: false });
      if (error) throw error;

      return ok({ deudas: data });
    }

    // GET /deudas/:id
    if (req.method === "GET" && id && !action) {
      const { data, error } = await supabase
        .from("deudas")
        .select("*, pagos_deuda(*)")
        .eq("id", id)
        .eq("cliente_id", user.cliente_id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Deuda no encontrada");
        throw error;
      }

      return ok({ deuda: data });
    }

    // POST /deudas
    if (req.method === "POST" && !id) {
      const body = await req.json();
      const { tipo, acreedor, monto_usd, interes_anual, fecha_vencimiento, notas } = body;

      if (!tipo || !acreedor || !monto_usd) {
        return err("Campos requeridos: tipo, acreedor, monto_usd", 400);
      }

      const { data, error } = await supabase
        .from("deudas")
        .insert([{
          cliente_id: user.cliente_id,
          tipo,
          acreedor,
          monto_usd,
          monto_sol: Math.round(monto_usd * 3.82 * 100) / 100,
          interes_anual: interes_anual || 0,
          fecha_vencimiento,
          estado: "ACTIVA",
          notas,
        }])
        .select()
        .single();

      if (error) throw error;
      return ok({ deuda: data }, 201);
    }

    // PATCH /deudas/:id
    if (req.method === "PATCH" && id && !action) {
      const body = await req.json();

      const { data, error } = await supabase
        .from("deudas")
        .update({ ...body, updated_at: new Date() })
        .eq("id", id)
        .eq("cliente_id", user.cliente_id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Deuda no encontrada");
        throw error;
      }

      return ok({ deuda: data });
    }

    // POST /deudas/:id/pagar
    if (req.method === "POST" && id && action === "pagar") {
      const body = await req.json();
      const { monto_pagado, metodo, referencia } = body;

      const { data: pago, error: pagoError } = await supabase
        .from("pagos_deuda")
        .insert([{
          deuda_id: id,
          monto_pagado,
          metodo,
          referencia,
          fecha_pago: new Date(),
        }])
        .select()
        .single();

      if (pagoError) throw pagoError;

      // Check if debt is fully paid
      const { data: deuda } = await supabase
        .from("deudas")
        .select("monto_usd")
        .eq("id", id)
        .single();

      const { data: pagos } = await supabase
        .from("pagos_deuda")
        .select("monto_pagado")
        .eq("deuda_id", id);

      const totalPagado = (pagos || []).reduce((s: number, p: any) => s + Number(p.monto_pagado), 0);

      if (deuda && totalPagado >= Number(deuda.monto_usd)) {
        await supabase
          .from("deudas")
          .update({ estado: "PAGADA", updated_at: new Date() })
          .eq("id", id);
      }

      return ok({ pago }, 201);
    }

    return err("Ruta no encontrada", 404);
  } catch (e: any) {
    console.error("Deudas error:", e);
    return err(e.message || "Error interno", 500);
  }
});
