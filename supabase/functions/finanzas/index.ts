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
  // /functions/v1/finanzas/cuentas/[id]/transacciones
  const afterBase = parts.slice(3);
  const resource = afterBase[0] || ""; // 'cuentas'
  const id = afterBase[1] || "";       // cuenta id
  const subResource = afterBase[2] || ""; // 'transacciones'

  const supabase = getSupabaseAdmin();

  try {
    // GET /finanzas/cuentas
    if (req.method === "GET" && resource === "cuentas" && !id) {
      const { data, error } = await supabase
        .from("cuentas")
        .select("*")
        .eq("cliente_id", user.cliente_id)
        .eq("activo", true)
        .order("banco", { ascending: true });

      if (error) throw error;
      return ok({ cuentas: data });
    }

    // GET /finanzas/cuentas/:id/transacciones
    if (req.method === "GET" && resource === "cuentas" && id && subResource === "transacciones") {
      const { fecha_inicio, fecha_fin } = Object.fromEntries(url.searchParams);

      let query = supabase
        .from("transacciones_financieras")
        .select("*")
        .eq("cuenta_id", id);

      if (fecha_inicio) query = query.gte("created_at", fecha_inicio);
      if (fecha_fin) query = query.lte("created_at", fecha_fin);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return ok({ transacciones: data });
    }

    // POST /finanzas/cuentas
    if (req.method === "POST" && resource === "cuentas" && !id) {
      const body = await req.json();
      const { banco, tipo_cuenta, numero_cuenta, saldo, moneda } = body;

      const { data, error } = await supabase
        .from("cuentas")
        .insert([{
          cliente_id: user.cliente_id,
          banco,
          tipo_cuenta,
          numero_cuenta,
          saldo: saldo || 0,
          moneda: moneda || "USD",
          activo: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return ok({ cuenta: data }, 201);
    }

    // PATCH /finanzas/cuentas/:id
    if (req.method === "PATCH" && resource === "cuentas" && id && !subResource) {
      const body = await req.json();

      const { data, error } = await supabase
        .from("cuentas")
        .update({ ...body, updated_at: new Date() })
        .eq("id", id)
        .eq("cliente_id", user.cliente_id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Cuenta no encontrada");
        throw error;
      }

      return ok({ cuenta: data });
    }

    // POST /finanzas/cuentas/:id/transacciones
    if (req.method === "POST" && resource === "cuentas" && id && subResource === "transacciones") {
      const body = await req.json();
      const { tipo, monto, concepto } = body;

      if (!tipo || !monto || !concepto) {
        return err("Campos requeridos: tipo, monto, concepto", 400);
      }

      // Get current account balance
      const { data: cuenta, error: cuentaError } = await supabase
        .from("cuentas")
        .select("saldo, cliente_id")
        .eq("id", id)
        .single();

      if (cuentaError) {
        if (cuentaError.code === "PGRST116") return notFound("Cuenta no encontrada");
        throw cuentaError;
      }

      if (cuenta.cliente_id !== user.cliente_id) {
        return err("Acceso denegado", 403);
      }

      const saldoAnterior = Number(cuenta.saldo);
      const saldoNuevo = tipo === "INGRESO"
        ? saldoAnterior + Number(monto)
        : saldoAnterior - Number(monto);

      // Create transaction
      const { data: transaccion, error: transError } = await supabase
        .from("transacciones_financieras")
        .insert([{
          cuenta_id: id,
          tipo,
          monto,
          concepto,
          saldo_anterior: saldoAnterior,
          saldo_nuevo: saldoNuevo,
        }])
        .select()
        .single();

      if (transError) throw transError;

      // Update account balance
      await supabase
        .from("cuentas")
        .update({ saldo: saldoNuevo, updated_at: new Date() })
        .eq("id", id);

      return ok({ transaccion }, 201);
    }

    return err("Ruta no encontrada", 404);
  } catch (e: any) {
    console.error("Finanzas error:", e);
    return err(e.message || "Error interno", 500);
  }
});
