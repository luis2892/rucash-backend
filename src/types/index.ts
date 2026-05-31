export interface Cliente {
  id: string;
  nombre: string;
  email: string;
  ruc?: string;
  whatsapp?: string;
  plan: 'BASICO' | 'PRO' | 'EMPRESA';
  estado: 'PRUEBA' | 'ACTIVO' | 'VENCIDO';
  fecha_vencimiento?: string;
  created_at: string;
}

export interface Usuario {
  id: string;
  cliente_id: string;
  email: string;
  nombre_completo: string;
  whatsapp?: string;
  rol: 'ADMIN' | 'VENDEDOR' | 'ALMACENERO';
  estado: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
  ultimo_login?: string;
  created_at: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  email: string;
  password: string;
  full_name: string;
  whatsapp: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  usuario: Usuario;
  cliente: Cliente;
}

export interface AuditLog {
  id: string;
  usuario_id?: string;
  cliente_id: string;
  accion: string;
  entidad: string;
  entidad_id?: string;
  cambios?: Record<string, any>;
  created_at: string;
}

export interface JWTPayload {
  usuario_id: string;
  cliente_id: string;
  email: string;
  rol: string;
}

// ---- Sprint 2 Types ----

export interface User2FA {
  id: string;
  usuario_id: string;
  enabled: boolean;
  backup_codes?: string[];
  created_at: string;
}

export interface EmailVerification {
  id: string;
  usuario_id: string;
  verified: boolean;
  verified_at?: string;
  expires_at: string;
}

export interface OAuthAccount {
  id: string;
  usuario_id: string;
  provider: 'google' | 'github' | 'microsoft';
  provider_user_id: string;
  provider_email?: string;
}

export interface UserSession {
  id: string;
  usuario_id: string;
  device_name?: string;
  device_type?: string;
  ip_address?: string;
  last_activity: string;
  expires_at: string;
}

export interface SecurityEvent {
  id: string;
  usuario_id: string;
  evento: string;
  ip_address?: string;
  detalles?: Record<string, any>;
  created_at: string;
}

export interface PasswordResetPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface VerifyEmailPayload {
  token: string;
}

export interface Enable2FAPayload {
  password: string;
}

export interface Verify2FAPayload {
  code: string;
  backup: boolean;
}
