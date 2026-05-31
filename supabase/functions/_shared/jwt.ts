import jwt from "npm:jsonwebtoken";

const JWT_SECRET = Deno.env.get("JWT_SECRET")!;
const REFRESH_SECRET = Deno.env.get("REFRESH_SECRET")!;

export function signToken(payload: object, expiresIn = "7d"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn, algorithm: "HS256" });
}

export function signRefreshToken(payload: object): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "30d", algorithm: "HS256" });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): any {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch {
    return null;
  }
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
