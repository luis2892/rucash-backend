import { handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
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
    // GET /flujo-caja/analisis
    if (req.method === "GET" && subPath === "analisis") {
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [ventasRes, deudasRes] = await Promise.all([
        supabase
          .from("ventas")
          .select("total, moneda, metodo_pago, created_at")
          .eq("cliente_id", user.cliente_id)
          .gte("created_at", inicioMes),
        supabase
          .from("deudas")
          .select("*")
          .eq("cliente_id", user.cliente_id)
          .eq("estado", "ACTIVA"),
      ]);

      const ventas = ventasRes.data || [];
      const deudas = deudasRes.data || [];

      const totalIngresos = ventas.reduce((s: number, v: any) => s + Number(v.total), 0);
      const totalDeudas = deudas.reduce((s: number, d: any) => s + Number(d.monto_usd), 0);
      const interesMensual = deudas.reduce(
        (s: number, d: any) => s + (Number(d.monto_usd) * Number(d.interes_anual)) / 12 / 100,
        0
      );

      const porMetodoPago = ventas.reduce((acc: any, v: any) => {
        acc[v.metodo_pago] = (acc[v.metodo_pago] || 0) + Number(v.total);
        return acc;
      }, {});

      return ok({
        analisis: {
          periodo: new Date().toLocaleDateString("es-PE", { month: "long", year: "numeric" }),
          ingresos_mes: Math.round(totalIngresos * 100) / 100,
          total_deudas: Math.round(totalDeudas * 100) / 100,
          interes_mensual: Math.round(interesMensual * 100) / 100,
          saldo_neto: Math.round((totalIngresos - interesMensual) * 100) / 100,
          ventas_count: ventas.length,
          por_metodo_pago: porMetodoPago,
          deudas,
        },
      });
    }

    // GET /flujo-caja
    if (req.method === "GET" && !subPath) {
      const { fecha_inicio, fecha_fin } = Object.fromEntries(url.searchParams);

      let query = supabase
        .from("flujo_caja")
        .select("*")
        .eq("cliente_id", user.cliente_id);

      if (fecha_inicio) query = query.gte("fecha", fecha_inicio);
      if (fecha_fin) query = query.lte("fecha", fecha_fin);

      const { data, error } = await query.order("fecha", { ascending: false });
      if (error) throw error;

      return ok({ flujo_caja: data });
    }

    // POST /flujo-caja
    if (req.method === "POST" && !subPath) {
      const body = await req.json();
      const { fecha, ingresos, egresos, deudas_pagadas, saldo_inicial, saldo_final, descripcion } = body;

      const { data, error } = await supabase
        .from("flujo_caja")
        .insert([{
          cliente_id: user.cliente_id,
          fecha,
          ingresos: ingresos || 0,
          egresos: egresos || 0,
          deudas_pagadas: deudas_pagadas || 0,
          saldo_inicial: saldo_inicial || 0,
          saldo_final: saldo_final || 0,
          descripcion,
        }])
        .select()
        .single();

      if (error) throw error;
      return ok({ flujo_caja: data }, 201);
    }

    return err("Ruta no encontrada", 404);
  } catch (e: any) {
    console.error("Flujo caja error:", e);
    return err(e.message || "Error interno", 500);
  }
});
