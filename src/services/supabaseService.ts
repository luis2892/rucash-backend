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
};
