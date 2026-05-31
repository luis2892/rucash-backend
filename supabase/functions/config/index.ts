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
  // /functions/v1/config/[resource]
  const resource = parts[3] || "";

  const supabase = getSupabaseAdmin();

  try {
    // GET /config/empresa
    if (req.method === "GET" && resource === "empresa") {
      const { data, error } = await supabase
        .from("empresas_config")
        .select("*")
        .eq("cliente_id", user.cliente_id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return notFound("Configuración de empresa no encontrada");
      return ok({ config: data });
    }

    // POST /config/empresa
    if (req.method === "POST" && resource === "empresa") {
      const body = await req.json();
      const { moneda_preferida, provincia, ciudad, industria, logo_url } = body;

      const { data, error } = await supabase
        .from("empresas_config")
        .insert([{
          cliente_id: user.cliente_id,
          moneda_preferida: moneda_preferida || "USD",
          provincia,
          ciudad,
          industria,
          logo_url,
        }])
        .select()
        .single();

      if (error) throw error;
      return ok({ config: data }, 201);
    }

    // PATCH /config/empresa
    if (req.method === "PATCH" && resource === "empresa") {
      const body = await req.json();

      // Upsert: update if exists, insert if not
      const { data: existing } = await supabase
        .from("empresas_config")
        .select("id")
        .eq("cliente_id", user.cliente_id)
        .maybeSingle();

      let data, error;

      if (existing) {
        ({ data, error } = await supabase
          .from("empresas_config")
          .update({ ...body, updated_at: new Date() })
          .eq("cliente_id", user.cliente_id)
          .select()
          .single());
      } else {
        ({ data, error } = await supabase
          .from("empresas_config")
          .insert([{ cliente_id: user.cliente_id, ...body }])
          .select()
          .single());
      }

      if (error) throw error;
      return ok({ config: data });
    }

    // GET /config/sistema — admin only
    if (req.method === "GET" && resource === "sistema") {
      if (!user.es_admin_sistema) return err("Acceso denegado", 403);

      const { data, error } = await supabase
        .from("config_sistema")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return notFound("Configuración del sistema no encontrada");
      return ok({ config: data });
    }

    // PATCH /config/sistema — admin only
    if (req.method === "PATCH" && resource === "sistema") {
      if (!user.es_admin_sistema) return err("Acceso denegado", 403);

      const body = await req.json();

      // Get current config to log changes
      const { data: current } = await supabase
        .from("config_sistema")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!current) return notFound("Configuración del sistema no encontrada");

      // Log each changed field
      for (const [key, value] of Object.entries(body)) {
        const oldValue = (current as any)[key];
        if (oldValue !== value) {
          await supabase.from("config_logs").insert([{
            campo_modificado: key,
            valor_anterior: String(oldValue),
            valor_nuevo: String(value),
            usuario_id: user.usuario_id,
          }]);
        }
      }

      const { data, error } = await supabase
        .from("config_sistema")
        .update({ ...body, updated_by_usuario_id: user.usuario_id })
        .eq("id", current.id)
        .select()
        .single();

      if (error) throw error;
      return ok({ config: data });
    }

    return err("Ruta no encontrada", 404);
  } catch (e: any) {
    console.error("Config error:", e);
    return err(e.message || "Error interno", 500);
  }
});
