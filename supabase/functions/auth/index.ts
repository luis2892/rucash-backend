import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { ok, err } from "../_shared/response.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { hashPassword, comparePassword } from "../_shared/bcrypt.ts";
import { signToken, signRefreshToken, hashToken, verifyRefreshToken } from "../_shared/jwt.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // pathname: /functions/v1/auth/login → parts[3] = 'login'
  const action = parts[3] || "";

  const supabase = getSupabaseAdmin();

  try {
    // POST /auth/signup
    if (req.method === "POST" && action === "signup") {
      const body = await req.json();
      const { email, password, full_name, whatsapp, empresa_nombre, ruc, industria, provincia, ciudad } = body;

      if (!email || !password || !full_name || !whatsapp) {
        return err("Todos los campos son requeridos: email, password, full_name, whatsapp", 400);
      }

      // Check existing user
      const { data: existente } = await supabase
        .from("usuarios")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existente) {
        return err("El email ya está registrado", 409);
      }

      // Create cliente
      const fechaVencimiento = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const nombreCliente = empresa_nombre || full_name;

      const { data: cliente, error: clienteError } = await supabase
        .from("clientes")
        .insert([{
          email,
          nombre: nombreCliente,
          whatsapp,
          ruc: ruc || null,
          estado: "PRUEBA",
          fecha_vencimiento: fechaVencimiento,
        }])
        .select()
        .single();

      if (clienteError) throw clienteError;

      // Create usuario
      const passwordHash = await hashPassword(password);
      const { data: usuario, error: usuarioError } = await supabase
        .from("usuarios")
        .insert([{
          cliente_id: cliente.id,
          email,
          password_hash: passwordHash,
          nombre_completo: full_name,
          whatsapp,
          rol: "ADMIN",
          estado: "ACTIVO",
          es_admin_sistema: false,
        }])
        .select()
        .single();

      if (usuarioError) throw usuarioError;

      // Create empresa config if extra data
      if (industria || provincia || ciudad) {
        await supabase.from("empresas_config").insert([{
          cliente_id: cliente.id,
          moneda_preferida: "USD",
          industria: industria || null,
          provincia: provincia || null,
          ciudad: ciudad || null,
        }]);
      }

      const jwtPayload = {
        usuario_id: usuario.id,
        cliente_id: cliente.id,
        email: usuario.email,
        rol: usuario.rol,
        es_admin_sistema: false,
      };

      const accessToken = signToken(jwtPayload);
      const refreshToken = signRefreshToken(jwtPayload);
      const hashedRefreshToken = await hashToken(refreshToken);

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await supabase.from("refresh_tokens").insert([{
        usuario_id: usuario.id,
        token_hash: hashedRefreshToken,
        expires_at: expiresAt,
      }]);

      await supabase.from("audit_logs").insert([{
        usuario_id: null,
        cliente_id: cliente.id,
        accion: "SIGNUP",
        entidad: "clientes",
        entidad_id: cliente.id,
      }]);

      return ok({
        access_token: accessToken,
        refresh_token: refreshToken,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre_completo: usuario.nombre_completo,
          rol: usuario.rol,
          es_admin_sistema: false,
        },
        cliente: {
          id: cliente.id,
          nombre: cliente.nombre,
          plan: cliente.plan,
          estado: cliente.estado,
        },
      }, 201);
    }

    // POST /auth/login
    if (req.method === "POST" && action === "login") {
      const body = await req.json();
      const { email, password } = body;

      if (!email || !password) {
        return err("Email y contraseña requeridos", 400);
      }

      const { data: usuario, error: usuarioError } = await supabase
        .from("usuarios")
        .select("*, clientes(*)")
        .eq("email", email)
        .maybeSingle();

      if (usuarioError && usuarioError.code !== "PGRST116") throw usuarioError;
      if (!usuario) return err("Credenciales inválidas", 401);

      const passwordValida = await comparePassword(password, usuario.password_hash);
      if (!passwordValida) return err("Credenciales inválidas", 401);

      if (usuario.estado !== "ACTIVO") {
        return err("Usuario inactivo o suspendido", 403);
      }

      const esAdmin = usuario.es_admin_sistema === true;
      const jwtPayload = {
        usuario_id: usuario.id,
        cliente_id: usuario.cliente_id,
        email: usuario.email,
        rol: usuario.rol,
        es_admin_sistema: esAdmin,
      };

      const accessToken = signToken(jwtPayload);
      const refreshToken = signRefreshToken(jwtPayload);
      const hashedRefreshToken = await hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await supabase.from("refresh_tokens").insert([{
        usuario_id: usuario.id,
        token_hash: hashedRefreshToken,
        expires_at: expiresAt,
      }]);

      // Update last login
      await supabase
        .from("usuarios")
        .update({ ultimo_login: new Date() })
        .eq("id", usuario.id);

      await supabase.from("audit_logs").insert([{
        usuario_id: usuario.id,
        cliente_id: usuario.cliente_id,
        accion: "LOGIN",
        entidad: "usuarios",
        entidad_id: usuario.id,
      }]);

      return ok({
        access_token: accessToken,
        refresh_token: refreshToken,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre_completo: usuario.nombre_completo,
          rol: usuario.rol,
          es_admin_sistema: esAdmin,
        },
        cliente: {
          id: usuario.clientes.id,
          nombre: usuario.clientes.nombre,
          plan: usuario.clientes.plan,
          estado: usuario.clientes.estado,
        },
      });
    }

    // GET /auth/me
    if (req.method === "GET" && action === "me") {
      const user = verifyAuth(req);
      if (!user) return err("No autorizado", 401);

      const { data: usuario, error: usuarioError } = await supabase
        .from("usuarios")
        .select("*, clientes(*)")
        .eq("id", user.usuario_id)
        .single();

      if (usuarioError) {
        if (usuarioError.code === "PGRST116") return err("Usuario no encontrado", 404);
        throw usuarioError;
      }

      return ok({
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre_completo: usuario.nombre_completo,
          rol: usuario.rol,
          es_admin_sistema: usuario.es_admin_sistema,
          whatsapp: usuario.whatsapp,
        },
        cliente: {
          id: usuario.clientes.id,
          nombre: usuario.clientes.nombre,
          plan: usuario.clientes.plan,
          estado: usuario.clientes.estado,
          ruc: usuario.clientes.ruc,
        },
      });
    }

    // POST /auth/logout
    if (req.method === "POST" && action === "logout") {
      const user = verifyAuth(req);
      if (user) {
        await supabase.from("audit_logs").insert([{
          usuario_id: user.usuario_id,
          cliente_id: user.cliente_id,
          accion: "LOGOUT",
          entidad: "usuarios",
          entidad_id: user.usuario_id,
        }]);
      }
      return ok({ message: "Logout exitoso" });
    }

    // POST /auth/refresh-token
    if (req.method === "POST" && action === "refresh-token") {
      const body = await req.json();
      const { refresh_token } = body;

      if (!refresh_token) return err("Refresh token requerido", 400);

      const payload = verifyRefreshToken(refresh_token);
      if (!payload) return err("Refresh token inválido o expirado", 401);

      const hashedToken = await hashToken(refresh_token);

      const { data: tokenRecord } = await supabase
        .from("refresh_tokens")
        .select()
        .eq("usuario_id", payload.usuario_id)
        .eq("token_hash", hashedToken)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!tokenRecord) return err("Refresh token no encontrado", 401);

      const newAccessToken = signToken({
        usuario_id: payload.usuario_id,
        cliente_id: payload.cliente_id,
        email: payload.email,
        rol: payload.rol,
        es_admin_sistema: payload.es_admin_sistema,
      });

      return ok({ access_token: newAccessToken, refresh_token });
    }

    return err("Ruta no encontrada", 404);
  } catch (e: any) {
    console.error("Auth error:", e);
    return err(e.message || "Error interno", 500);
  }
});
