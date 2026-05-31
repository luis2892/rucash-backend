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
  // /functions/v1/suscripciones/[resource or cliente_id]
  const afterBase = parts.slice(3);
  const idOrResource = afterBase[0] || "";

  const supabase = getSupabaseAdmin();

  try {
    // GET /suscripciones — obtener del cliente actual
    if (req.method === "GET" && !idOrResource) {
      const { data, error } = await supabase
        .from("suscripciones")
        .select("*")
        .eq("cliente_id", user.cliente_id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return notFound("Suscripción no encontrada");
      return ok({ suscripcion: data });
    }

    // GET /suscripciones/todas — admin only
    if (req.method === "GET" && idOrResource === "todas") {
      if (!user.es_admin_sistema) return err("Acceso denegado", 403);

      const { estado } = Object.fromEntries(url.searchParams);

      let query = supabase.from("suscripciones").select("*, clientes(*)");
      if (estado) query = query.eq("estado", estado);

      const { data, error } = await query.order("fecha_vencimiento", { ascending: true });
      if (error) throw error;
      return ok({ suscripciones: data });
    }

    // POST /suscripciones — admin only
    if (req.method === "POST" && !idOrResource) {
      if (!user.es_admin_sistema) return err("Acceso denegado", 403);

      const body = await req.json();
      const { cliente_id, plan, fecha_vencimiento, usuarios_limite, precio_mensual, notas } = body;

      if (!cliente_id || !plan || !fecha_vencimiento) {
        return err("Campos requeridos: cliente_id, plan, fecha_vencimiento", 400);
      }

      const planLimites: Record<string, number> = {
        HOBBY: 2,
        PRO: 5,
        ENTERPRISE: 999,
      };

      const { data, error } = await supabase
        .from("suscripciones")
        .insert([{
          cliente_id,
          plan,
          usuarios_limite: usuarios_limite || planLimites[plan] || 2,
          usuarios_actuales: 0,
          fecha_inicio: new Date(),
          fecha_vencimiento,
          estado: "ACTIVO",
          precio_mensual,
          notas,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update cliente plan and expiration
      await supabase
        .from("clientes")
        .update({ plan, estado: "ACTIVO", fecha_vencimiento })
        .eq("id", cliente_id);

      return ok({ suscripcion: data }, 201);
    }

    // PATCH /suscripciones/:cliente_id — admin only
    if (req.method === "PATCH" && idOrResource && idOrResource !== "verificar-vencimientos") {
      if (!user.es_admin_sistema) return err("Acceso denegado", 403);

      const body = await req.json();
      const updates: any = {};

      if (body.plan) updates.plan = body.plan;
      if (body.fecha_vencimiento) updates.fecha_vencimiento = body.fecha_vencimiento;
      if (body.estado) updates.estado = body.estado;
      if (body.precio_mensual) updates.precio_mensual = body.precio_mensual;
      if (body.usuarios_limite) updates.usuarios_limite = body.usuarios_limite;
      if (body.notas) updates.notas = body.notas;
      updates.updated_at = new Date();

      const { data, error } = await supabase
        .from("suscripciones")
        .update(updates)
        .eq("cliente_id", idOrResource)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Suscripción no encontrada");
        throw error;
      }

      // Sync cliente if plan or vencimiento changed
      const clienteUpdates: any = {};
      if (body.plan) clienteUpdates.plan = body.plan;
      if (body.fecha_vencimiento) clienteUpdates.fecha_vencimiento = body.fecha_vencimiento;
      if (body.estado) clienteUpdates.estado = body.estado === "ACTIVO" ? "ACTIVO" : "BLOQUEADO";

      if (Object.keys(clienteUpdates).length > 0) {
        await supabase.from("clientes").update(clienteUpdates).eq("id", idOrResource);
      }

      return ok({ suscripcion: data });
    }

    // POST /suscripciones/verificar-vencimientos — admin only (cron job)
    if (req.method === "POST" && idOrResource === "verificar-vencimientos") {
      if (!user.es_admin_sistema) return err("Acceso denegado", 403);

      const { data: suscripciones } = await supabase
        .from("suscripciones")
        .select("*")
        .in("estado", ["ACTIVO", "ACTIVO_PRONTO_VENCE"]);

      const hoy = new Date();
      const procesos: Promise<any>[] = [];
      let procesados = 0;

      for (const sus of suscripciones || []) {
        const fechaVencimiento = new Date(sus.fecha_vencimiento);
        const diasFaltantes = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        if (diasFaltantes <= 0) {
          procesos.push(
            supabase.from("suscripciones").update({ estado: "BLOQUEADO" }).eq("id", sus.id),
            supabase.from("clientes").update({ estado: "BLOQUEADO" }).eq("id", sus.cliente_id)
          );
          procesados++;
        } else if (diasFaltantes <= 7) {
          procesos.push(
            supabase.from("suscripciones").update({ estado: "ACTIVO_PRONTO_VENCE" }).eq("id", sus.id)
          );
          procesados++;
        }
      }

      await Promise.all(procesos);
      return ok({ message: "Vencimientos verificados", procesados });
    }

    return err("Ruta no encontrada", 404);
  } catch (e: any) {
    console.error("Suscripciones error:", e);
    return err(e.message || "Error interno", 500);
  }
});
