import { supabaseAdmin } from '../config/supabase';
import bcrypt from 'bcrypt';
import { Cliente, Usuario } from '../types';

export const supabaseService = {
  // ---- Sprint 1 methods ----

  async createCliente(email: string, nombre: string, whatsapp: string): Promise<Cliente> {
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .insert([{ email, nombre, whatsapp, estado: 'PRUEBA', fecha_vencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }])
      .select().single();
    if (error) throw new Error(`Error creando cliente: ${error.message}`);
    return data;
  },

  async createUsuario(clienteId: string, email: string, password: string, fullName: string, whatsapp: string): Promise<Usuario> {
    const passwordHash = await bcrypt.hash(password, 10);
    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .insert([{ cliente_id: clienteId, email, password_hash: passwordHash, nombre_completo: fullName, whatsapp, rol: 'ADMIN', estado: 'ACTIVO' }])
      .select().single();
    if (error) throw new Error(`Error creando usuario: ${error.message}`);
    return data;
  },

  async getUsuarioByEmail(email: string) {
    const { data, error } = await supabaseAdmin
      .from('usuarios').select('*, clientes(*)').eq('email', email).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  async createRefreshToken(usuarioId: string, hashedToken: string) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const { data, error } = await supabaseAdmin
      .from('refresh_tokens')
      .insert([{ usuario_id: usuarioId, token_hash: hashedToken, expires_at: expiresAt }])
      .select().single();
    if (error) throw new Error(`Error creando refresh token: ${error.message}`);
    return data;
  },

  async validateRefreshToken(usuarioId: string, hashedToken: string) {
    const { data, error } = await supabaseAdmin
      .from('refresh_tokens').select()
      .eq('usuario_id', usuarioId).eq('token_hash', hashedToken)
      .gt('expires_at', new Date().toISOString()).single();
    if (error) {
      if (error.code === 'PGRST116') return false;
      throw error;
    }
    return !!data;
  },

  async logAudit(usuarioId: string | null, clienteId: string, accion: string, entidad: string, entidadId?: string, cambios?: Record<string, any>) {
    const { error } = await supabaseAdmin.from('audit_logs')
      .insert([{ usuario_id: usuarioId, cliente_id: clienteId, accion, entidad, entidad_id: entidadId, cambios }]);
    if (error) console.error('Error logging audit:', error);
  },

  // ---- Sprint 2 methods ----

  // Email verification
  async createEmailVerification(usuarioId: string, tokenHash: string) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const { data, error } = await supabaseAdmin.from('email_verification')
      .insert([{ usuario_id: usuarioId, token_hash: tokenHash, expires_at: expiresAt }])
      .select().single();
    if (error) throw new Error(`Error creating email verification: ${error.message}`);
    return data;
  },

  async verifyEmail(usuarioId: string, tokenHash: string) {
    const { data, error } = await supabaseAdmin.from('email_verification').select()
      .eq('usuario_id', usuarioId).eq('token_hash', tokenHash)
      .gt('expires_at', new Date().toISOString()).single();
    if (error) return false;
    await supabaseAdmin.from('email_verification')
      .update({ verified: true, verified_at: new Date() }).eq('id', data.id);
    return true;
  },

  async isEmailVerified(usuarioId: string): Promise<boolean> {
    const { data } = await supabaseAdmin.from('email_verification')
      .select('verified').eq('usuario_id', usuarioId).single();
    return data?.verified || false;
  },

  // 2FA
  async create2FA(usuarioId: string, secretKey: string, backupCodes: string[]) {
    const { data, error } = await supabaseAdmin.from('user_2fa')
      .insert([{ usuario_id: usuarioId, secret_key: secretKey, backup_codes: backupCodes, enabled: false }])
      .select().single();
    if (error) throw new Error(`Error creating 2FA: ${error.message}`);
    return data;
  },

  async enable2FA(usuarioId: string) {
    const { data, error } = await supabaseAdmin.from('user_2fa')
      .update({ enabled: true }).eq('usuario_id', usuarioId).select().single();
    if (error) throw new Error(`Error enabling 2FA: ${error.message}`);
    return data;
  },

  async disable2FA(usuarioId: string) {
    const { data, error } = await supabaseAdmin.from('user_2fa')
      .update({ enabled: false }).eq('usuario_id', usuarioId).select().single();
    if (error) throw new Error(`Error disabling 2FA: ${error.message}`);
    return data;
  },

  async get2FA(usuarioId: string) {
    const { data } = await supabaseAdmin.from('user_2fa').select().eq('usuario_id', usuarioId).single();
    return data;
  },

  // Password reset
  async createPasswordReset(usuarioId: string, tokenHash: string) {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const { data, error } = await supabaseAdmin.from('password_reset')
      .insert([{ usuario_id: usuarioId, token_hash: tokenHash, expires_at: expiresAt }])
      .select().single();
    if (error) throw new Error(`Error creating password reset: ${error.message}`);
    return data;
  },

  async validatePasswordResetToken(tokenHash: string) {
    const { data, error } = await supabaseAdmin.from('password_reset').select()
      .eq('token_hash', tokenHash).eq('used', false)
      .gt('expires_at', new Date().toISOString()).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async resetPassword(usuarioId: string, tokenHash: string, newPasswordHash: string) {
    await supabaseAdmin.from('password_reset')
      .update({ used: true, used_at: new Date() })
      .eq('usuario_id', usuarioId).eq('token_hash', tokenHash);
    const { error } = await supabaseAdmin.from('usuarios')
      .update({ password_hash: newPasswordHash }).eq('id', usuarioId);
    if (error) throw new Error(`Error resetting password: ${error.message}`);
  },

  // OAuth
  async getOAuthAccount(provider: string, providerUserId: string) {
    const { data } = await supabaseAdmin.from('oauth_accounts')
      .select('*, usuarios(*)')
      .eq('provider', provider).eq('provider_user_id', providerUserId).single();
    return data;
  },

  async createOAuthAccount(usuarioId: string, provider: string, providerUserId: string, providerEmail?: string) {
    const { data, error } = await supabaseAdmin.from('oauth_accounts')
      .insert([{ usuario_id: usuarioId, provider, provider_user_id: providerUserId, provider_email: providerEmail }])
      .select().single();
    if (error) throw new Error(`Error creating OAuth account: ${error.message}`);
    return data;
  },

  // Sessions
  async createSession(usuarioId: string, deviceName?: string, ipAddress?: string, userAgent?: string) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const { data, error } = await supabaseAdmin.from('user_sessions')
      .insert([{ usuario_id: usuarioId, device_name: deviceName, ip_address: ipAddress, user_agent: userAgent, expires_at: expiresAt }])
      .select().single();
    if (error) throw new Error(`Error creating session: ${error.message}`);
    return data;
  },

  async getUserSessions(usuarioId: string) {
    const { data, error } = await supabaseAdmin.from('user_sessions').select()
      .eq('usuario_id', usuarioId).gt('expires_at', new Date().toISOString())
      .order('last_activity', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async logoutSession(sessionId: string) {
    const { error } = await supabaseAdmin.from('user_sessions').delete().eq('id', sessionId);
    if (error) throw error;
  },

  async logoutAllSessions(usuarioId: string) {
    const { error } = await supabaseAdmin.from('user_sessions').delete().eq('usuario_id', usuarioId);
    if (error) throw error;
  },

  // Security events
  async logSecurityEvent(usuarioId: string, clienteId: string, evento: string, ipAddress?: string, userAgent?: string, detalles?: Record<string, any>) {
    const { error } = await supabaseAdmin.from('security_events')
      .insert([{ usuario_id: usuarioId, cliente_id: clienteId, evento, ip_address: ipAddress, user_agent: userAgent, detalles }]);
    if (error) console.error('Error logging security event:', error);
  },

  // ---- Sprint 5 methods ----

  // Empresas Config
  async createEmpresaConfig(clienteId: string, data: any) {
    const { data: result, error } = await supabaseAdmin
      .from('empresas_config')
      .insert([{ cliente_id: clienteId, ...data }])
      .select().single();
    if (error) throw new Error(`Error creating empresa config: ${error.message}`);
    return result;
  },

  async getEmpresaConfig(clienteId: string) {
    const { data, error } = await supabaseAdmin
      .from('empresas_config')
      .select()
      .eq('cliente_id', clienteId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async updateEmpresaConfig(clienteId: string, updates: any) {
    const { data, error } = await supabaseAdmin
      .from('empresas_config')
      .update(updates)
      .eq('cliente_id', clienteId)
      .select().single();
    if (error) throw new Error(`Error updating empresa config: ${error.message}`);
    return data;
  },

  // Suscripciones
  async createSuscripcion(clienteId: string, plan: string, fechaVencimiento: Date, estado: string = 'ACTIVO') {
    const { data, error } = await supabaseAdmin
      .from('suscripciones')
      .insert([{ cliente_id: clienteId, plan, fecha_vencimiento: fechaVencimiento, estado }])
      .select().single();
    if (error) throw new Error(`Error creating suscripción: ${error.message}`);
    return data;
  },

  async getSuscripcion(clienteId: string) {
    const { data, error } = await supabaseAdmin
      .from('suscripciones')
      .select()
      .eq('cliente_id', clienteId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async getAllSuscripciones() {
    const { data, error } = await supabaseAdmin
      .from('suscripciones')
      .select();
    if (error) throw error;
    return data || [];
  },

  async updateSuscripcion(clienteId: string, updates: any) {
    const { data, error } = await supabaseAdmin
      .from('suscripciones')
      .update(updates)
      .eq('cliente_id', clienteId)
      .select().single();
    if (error) throw new Error(`Error updating suscripción: ${error.message}`);
    return data;
  },

  // Alertas Suscripción
  async createAlertaSuscripcion(clienteId: string, tipo: string) {
    const { data, error } = await supabaseAdmin
      .from('alertas_suscripcion')
      .insert([{ cliente_id: clienteId, tipo }])
      .select().single();
    if (error) throw new Error(`Error creating alerta suscripción: ${error.message}`);
    return data;
  },

  async getAlertasSuscripcion(clienteId: string) {
    const { data, error } = await supabaseAdmin
      .from('alertas_suscripcion')
      .select()
      .eq('cliente_id', clienteId)
      .eq('enviado_a', false);
    if (error) throw error;
    return data || [];
  },

  // Config Sistema
  async getConfigSistema() {
    const { data, error } = await supabaseAdmin
      .from('config_sistema')
      .select()
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async updateConfigSistema(updates: any, usuarioId: string) {
    const config = await this.getConfigSistema();
    const { data, error } = await supabaseAdmin
      .from('config_sistema')
      .update({ ...updates, updated_by_usuario_id: usuarioId, updated_at: new Date() })
      .eq('id', config?.id || '')
      .select().single();
    if (error) throw new Error(`Error updating config sistema: ${error.message}`);
    return data;
  },

  async logConfigChange(field: string, oldValue: any, newValue: any, usuarioId: string) {
    const { error } = await supabaseAdmin
      .from('config_logs')
      .insert([{ campo_modificado: field, valor_anterior: oldValue, valor_nuevo: newValue, usuario_id: usuarioId }]);
    if (error) console.error('Error logging config change:', error);
  },

  // Proveedores
  async createProveedor(clienteId: string, data: any) {
    const { data: result, error } = await supabaseAdmin
      .from('proveedores')
      .insert([{ cliente_id: clienteId, ...data }])
      .select().single();
    if (error) throw new Error(`Error creating proveedor: ${error.message}`);
    return result;
  },

  async getProveedores(clienteId: string) {
    const { data, error } = await supabaseAdmin
      .from('proveedores')
      .select()
      .eq('cliente_id', clienteId)
      .eq('activo', true)
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getProveedor(id: string) {
    const { data, error } = await supabaseAdmin
      .from('proveedores')
      .select()
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async updateProveedor(id: string, updates: any) {
    const { data, error } = await supabaseAdmin
      .from('proveedores')
      .update(updates)
      .eq('id', id)
      .select().single();
    if (error) throw new Error(`Error updating proveedor: ${error.message}`);
    return data;
  },

  async deactivateProveedor(id: string) {
    return this.updateProveedor(id, { activo: false });
  },

  // Deudas
  async createDeuda(clienteId: string, data: any) {
    const { data: result, error } = await supabaseAdmin
      .from('deudas')
      .insert([{ cliente_id: clienteId, ...data }])
      .select().single();
    if (error) throw new Error(`Error creating deuda: ${error.message}`);
    return result;
  },

  async getDeudas(clienteId: string, estado?: string) {
    let query = supabaseAdmin
      .from('deudas')
      .select()
      .eq('cliente_id', clienteId);
    if (estado) query = query.eq('estado', estado);
    const { data, error } = await query.order('fecha_vencimiento', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getDeuda(id: string) {
    const { data, error } = await supabaseAdmin
      .from('deudas')
      .select()
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async updateDeuda(id: string, updates: any) {
    const { data, error } = await supabaseAdmin
      .from('deudas')
      .update(updates)
      .eq('id', id)
      .select().single();
    if (error) throw new Error(`Error updating deuda: ${error.message}`);
    return data;
  },

  // Pagos Deuda
  async createPagoDeuda(deudaId: string, monto: number, fechaPago: Date, metodoPago: string) {
    const { data, error } = await supabaseAdmin
      .from('pagos_deuda')
      .insert([{ deuda_id: deudaId, monto_pagado: monto, fecha_pago: fechaPago, metodo_pago: metodoPago }])
      .select().single();
    if (error) throw new Error(`Error creating pago deuda: ${error.message}`);
    return data;
  },

  async getPagosDeuda(deudaId: string) {
    const { data, error } = await supabaseAdmin
      .from('pagos_deuda')
      .select()
      .eq('deuda_id', deudaId)
      .order('fecha_pago', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Cuentas
  async createCuenta(clienteId: string, data: any) {
    const { data: result, error } = await supabaseAdmin
      .from('cuentas')
      .insert([{ cliente_id: clienteId, ...data }])
      .select().single();
    if (error) throw new Error(`Error creating cuenta: ${error.message}`);
    return result;
  },

  async getCuentas(clienteId: string) {
    const { data, error } = await supabaseAdmin
      .from('cuentas')
      .select()
      .eq('cliente_id', clienteId)
      .eq('activo', true)
      .order('banco', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getCuenta(id: string) {
    const { data, error } = await supabaseAdmin
      .from('cuentas')
      .select()
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async updateCuenta(id: string, updates: any) {
    const { data, error } = await supabaseAdmin
      .from('cuentas')
      .update(updates)
      .eq('id', id)
      .select().single();
    if (error) throw new Error(`Error updating cuenta: ${error.message}`);
    return data;
  },

  // Transacciones Financieras
  async createTransaccion(cuentaId: string, tipo: string, monto: number, concepto: string, saldoAnterior: number) {
    const saldoNuevo = tipo === 'INGRESO' ? saldoAnterior + monto : saldoAnterior - monto;
    const { data, error } = await supabaseAdmin
      .from('transacciones_financieras')
      .insert([{ cuenta_id: cuentaId, tipo, monto, concepto, saldo_anterior: saldoAnterior, saldo_nuevo: saldoNuevo }])
      .select().single();
    if (error) throw new Error(`Error creating transacción: ${error.message}`);
    return data;
  },

  async getTransacciones(cuentaId: string) {
    const { data, error } = await supabaseAdmin
      .from('transacciones_financieras')
      .select()
      .eq('cuenta_id', cuentaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};
