import { handleCors } from "../_shared/cors.ts";
import { ok, err, notFound } from "../_shared/response.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { hashPassword } from "../_shared/bcrypt.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  const user = verifyAuth(req);
  if (!user) return err("No autorizado", 401);

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // /functions/v1/equipo/[id or 'invitar']/[action]
  const afterBase = parts.slice(3);
  const idOrAction = afterBase[0] || "";
  const action = afterBase[1] || "";

  const supabase = getSupabaseAdmin();

  try {
    // GET /equipo
    if (req.method === "GET" && !idOrAction) {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, email, nombre_completo, rol, estado, whatsapp, ultimo_login, created_at")
        .eq("cliente_id", user.cliente_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return ok({ miembros: data });
    }

    // GET /equipo/:id
    if (req.method === "GET" && idOrAction && idOrAction !== "invitar") {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, email, nombre_completo, rol, estado, whatsapp, ultimo_login, created_at")
        .eq("id", idOrAction)
        .eq("cliente_id", user.cliente_id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Miembro no encontrado");
        throw error;
      }

      return ok({ miembro: data });
    }

    // PATCH /equipo/:id
    if (req.method === "PATCH" && idOrAction && idOrAction !== "invitar" && !action) {
      const body = await req.json();
      const { nombre_completo, whatsapp } = body;

      const { data, error } = await supabase
        .from("usuarios")
        .update({ nombre_completo, whatsapp })
        .eq("id", idOrAction)
        .eq("cliente_id", user.cliente_id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Miembro no encontrado");
        throw error;
      }

      return ok({ miembro: data });
    }

    // PATCH /equipo/:id/estado
    if (req.method === "PATCH" && idOrAction && action === "estado") {
      const body = await req.json();
      const { estado } = body;

      if (!["ACTIVO", "INACTIVO"].includes(estado)) {
        return err("Estado inválido. Usa ACTIVO o INACTIVO", 400);
      }

      const { data, error } = await supabase
        .from("usuarios")
        .update({ estado })
        .eq("id", idOrAction)
        .eq("cliente_id", user.cliente_id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Miembro no encontrado");
        throw error;
      }

      const accion = estado === "ACTIVO" ? "REACTIVAR_USUARIO" : "DESACTIVAR_USUARIO";
      await supabase.from("auditoria_permisos").insert([{
        cliente_id: user.cliente_id,
        accion,
        usuario_afectado_id: idOrAction,
        realizado_por: user.usuario_id,
        datos_nuevos: { estado },
      }]);

      return ok({ miembro: data });
    }

    // POST /equipo/invitar
    if (req.method === "POST" && idOrAction === "invitar") {
      const body = await req.json();
      const { email, rol } = body;

      if (!email || !rol) return err("Email y rol requeridos", 400);

      // Generate secure token using Web Crypto
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, "0")).join("");

      const { data, error } = await supabase
        .from("invitaciones")
        .insert([{
          cliente_id: user.cliente_id,
          email,
          rol,
          token_invitacion: token,
          estado: "PENDIENTE",
          fecha_expiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          invited_by: user.usuario_id,
        }])
        .select()
        .single();

      if (error) throw error;

      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const frontendUrl = supabaseUrl.replace(".supabase.co", "").replace("https://", "http://localhost:5173");
      const enlaceInvitacion = `http://localhost:5173/unirse?token=${token}`;

      return ok({ invitacion: data, enlace: enlaceInvitacion }, 201);
    }

    return err("Ruta no encontrada", 404);
  } catch (e: any) {
    console.error("Equipo error:", e);
    return err(e.message || "Error interno", 500);
  }
});
