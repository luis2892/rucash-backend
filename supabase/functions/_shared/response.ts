import { corsHeaders } from "./cors.ts";

export function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function err(message: string, status = 500): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function notFound(msg = "No encontrado"): Response {
  return err(msg, 404);
}
