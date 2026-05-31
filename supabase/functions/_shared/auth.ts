import { verifyToken } from "./jwt.ts";

export interface AuthUser {
  usuario_id: string;
  cliente_id: string;
  email: string;
  rol: string;
  es_admin_sistema: boolean;
}

export function verifyAuth(req: Request): AuthUser | null {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) return null;
  return payload as AuthUser;
}
