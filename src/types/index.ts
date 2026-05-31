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

// ---- Sprint 3 Types ----

export interface Producto {
  id: string;
  cliente_id: string;
  nombre: string;
  descripcion?: string;
  codigo_barras: string;
  categoria?: string;
  precio_usd: number;
  precio_sol: number;
  costo_usd?: number;
  stock_tienda: number;
  stock_almacen: number;
  activo: boolean;
  discontinuado?: boolean;
  fecha_discontinuado?: string;
  nivel_minimo_stock?: number;
  proveedor?: string;
  foto_url?: string;
  created_at: string;
  updated_at?: string;
}

// ---- Sprint 4 Types ----

export interface Categoria {
  id: string;
  cliente_id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at?: string;
}

export interface AuditoriaProducto {
  id: string;
  cliente_id: string;
  usuario_id?: string;
  producto_id: string;
  accion: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTOCK';
  campo_modificado?: string;
  valor_anterior?: string;
  valor_nuevo?: string;
  razon?: string;
  created_at: string;
}

export interface AlertaStock {
  id: string;
  cliente_id: string;
  producto_id: string;
  tipo: 'STOCK_BAJO' | 'SIN_STOCK' | 'EXCESO';
  nivel_minimo: number;
  stock_actual: number;
  estado: 'ACTIVA' | 'RESUELTA';
  created_at: string;
}

export interface HistorialStock {
  id: string;
  cliente_id: string;
  producto_id: string;
  usuario_id?: string;
  tipo: 'VENTA' | 'COMPRA' | 'AJUSTE' | 'DEVOLUCION';
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  ubicacion: 'tienda' | 'almacen';
  notas?: string;
  created_at: string;
}

// ---- Sprint 8 Types ----

export interface WidgetDashboard {
  id: string;
  cliente_id: string;
  usuario_id: string;
  tipo: 'VENTAS' | 'METAS' | 'EQUIPO' | 'INVENTARIO' | 'DEUDAS' | 'FLUJO_CAJA' | 'REPORTES' | 'ACTIVIDAD';
  titulo: string;
  posicion: number;
  tamaño: 'small' | 'medium' | 'large';
  configuracion?: Record<string, any>;
  visible: boolean;
  orden: number;
}

export interface LogActividad {
  id: string;
  cliente_id: string;
  usuario_id?: string;
  accion: string;
  recurso: string;
  descripcion?: string;
  detalles?: Record<string, any>;
  created_at: string;
}

export interface Suscripcion {
  id: string;
  cliente_id: string;
  plan: 'BASICO' | 'PRO' | 'EMPRESA';
  usuarios_limite: number;
  usuarios_actuales: number;
  fecha_inicio: string;
  fecha_vencimiento: string;
  renovacion_automatica: boolean;
  precio_mensual: number;
  estado: 'ACTIVA' | 'VENCIDA' | 'CANCELADA' | 'SUSPENDIDA';
}

export interface Invitacion {
  id: string;
  cliente_id: string;
  email: string;
  rol: string;
  estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'EXPIRADA';
  token_invitacion: string;
  fecha_envio: string;
  fecha_expiracion?: string;
}

export interface SesionActiva {
  id: string;
  usuario_id: string;
  cliente_id: string;
  ip_address: string;
  dispositivo: string;
  ubicacion?: string;
  login_at: string;
  ultima_actividad: string;
  logout_at?: string;
}

export interface ProductoFiltros {
  search?: string;
  categoria?: string;
  stock_minimo?: number;
  stock_maximo?: number;
  precio_minimo?: number;
  precio_maximo?: number;
  discontinuado?: boolean;
  proveedor?: string;
}
