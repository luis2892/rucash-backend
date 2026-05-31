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
  const subPath = parts.slice(3).join("/");

  const supabase = getSupabaseAdmin();

  try {
    // GET /categorias
    if (req.method === "GET" && !subPath) {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .eq("cliente_id", user.cliente_id)
        .eq("activo", true)
        .order("orden", { ascending: true });

      if (error) throw error;
      return ok({ categorias: data });
    }

    // POST /categorias
    if (req.method === "POST" && !subPath) {
      const body = await req.json();
      const { nombre, descripcion, icono, color, orden } = body;

      if (!nombre) return err("Nombre requerido", 400);

      const { data, error } = await supabase
        .from("categorias")
        .insert([{
          cliente_id: user.cliente_id,
          nombre,
          descripcion,
          icono,
          color,
          orden: orden || 0,
          activo: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return ok({ categoria: data }, 201);
    }

    // PATCH /categorias/:id
    if (req.method === "PATCH" && subPath) {
      const body = await req.json();

      const { data, error } = await supabase
        .from("categorias")
        .update({ ...body, updated_at: new Date() })
        .eq("id", subPath)
        .eq("cliente_id", user.cliente_id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") return notFound("Categoría no encontrada");
        throw error;
      }

      return ok({ categoria: data });
    }

    // DELETE /categorias/:id (soft delete)
    if (req.method === "DELETE" && subPath) {
      const { error } = await supabase
        .from("categorias")
        .update({ activo: false })
        .eq("id", subPath)
        .eq("cliente_id", user.cliente_id);

      if (error) throw error;
      return ok({ message: "Categoría eliminada" });
    }

    return err("Ruta no encontrada", 404);
  } catch (e: any) {
    console.error("Categorias error:", e);
    return err(e.message || "Error interno", 500);
  }
});
