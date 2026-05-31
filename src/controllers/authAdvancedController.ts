import { Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { jwtService } from '../services/jwtService';
import { totpService } from '../services/totpService';
import { emailService } from '../services/emailService';
import { supabaseAdmin } from '../config/supabase';
import * as crypto from 'crypto';
import bcrypt from 'bcrypt';

export const authAdvancedController = {
  // FORGOT PASSWORD
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email requerido' });

      const usuario = await supabaseService.getUsuarioByEmail(email);
      if (!usuario) {
        return res.json({ message: 'Si el email existe, recibirás un enlace de reset' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = jwtService.hashToken(resetToken);

      await supabaseService.createPasswordReset(usuario.id, tokenHash);
      await emailService.sendPasswordResetEmail(email, resetToken);
      await supabaseService.logSecurityEvent(
        usuario.id, usuario.cliente_id, 'PASSWORD_RESET_REQUESTED',
        req.ip || undefined
      );

      res.json({ message: 'Email de reset enviado' });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Error en reset de contraseña' });
    }
  },

  // RESET PASSWORD
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ message: 'Token y contraseña requeridos' });
      if (password.length < 8) return res.status(400).json({ message: 'Contraseña muy corta' });

      const tokenHash = jwtService.hashToken(token);
      const resetData = await supabaseService.validatePasswordResetToken(tokenHash);

      if (!resetData) {
        return res.status(401).json({ message: 'Token inválido o expirado' });
      }

      const newPasswordHash = await bcrypt.hash(password, 10);
      await supabaseService.resetPassword(resetData.usuario_id, tokenHash, newPasswordHash);

      res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Error reseteando contraseña' });
    }
  },

  // VERIFY EMAIL
  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: 'Token requerido' });

      const tokenHash = jwtService.hashToken(token);
      const { data: verifyData } = await supabaseAdmin
        .from('email_verification').select('usuario_id')
        .eq('token_hash', tokenHash).eq('verified', false)
        .gt('expires_at', new Date().toISOString()).single();

      if (!verifyData) {
        return res.status(401).json({ message: 'Token de verificación inválido o expirado' });
      }

      const verified = await supabaseService.verifyEmail(verifyData.usuario_id, tokenHash);
      if (!verified) return res.status(400).json({ message: 'Error verificando email' });

      res.json({ message: 'Email verificado correctamente' });
    } catch (error: any) {
      console.error('Verify email error:', error);
      res.status(500).json({ message: 'Error verificando email' });
    }
  },

  // ENABLE 2FA STEP 1
  async enable2FAStep1(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).usuario?.usuario_id;
      if (!usuarioId) return res.status(401).json({ message: 'No autenticado' });

      const { data: usuarioData } = await supabaseAdmin
        .from('usuarios').select('email').eq('id', usuarioId).single();
      if (!usuarioData) return res.status(404).json({ message: 'Usuario no encontrado' });

      const { secret, qrCode: otpauthUrl } = totpService.generateSecret(usuarioData.email);
      const qrCodeDataUrl = await totpService.generateQRCode(otpauthUrl);
      const backupCodes = totpService.generateBackupCodes();

      // Upsert 2FA record (remove old if exists)
      await supabaseAdmin.from('user_2fa').delete().eq('usuario_id', usuarioId);
      await supabaseService.create2FA(usuarioId, secret, backupCodes);

      res.json({
        secret,
        qrCode: qrCodeDataUrl,
        backupCodes,
        message: 'Escanea el código QR con tu app de autenticación',
      });
    } catch (error: any) {
      console.error('Enable 2FA step 1 error:', error);
      res.status(500).json({ message: 'Error habilitando 2FA' });
    }
  },

  // ENABLE 2FA STEP 2
  async enable2FAStep2(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).usuario?.usuario_id;
      const clienteId = (req as any).usuario?.cliente_id;
      const { code } = req.body;

      if (!usuarioId || !code) return res.status(400).json({ message: 'Usuario y código requeridos' });

      const twofa = await supabaseService.get2FA(usuarioId);
      if (!twofa || twofa.enabled) return res.status(400).json({ message: '2FA ya está habilitado' });

      const valid = totpService.verifyToken(twofa.secret_key, code);
      if (!valid) return res.status(401).json({ message: 'Código incorrecto' });

      await supabaseService.enable2FA(usuarioId);
      await supabaseService.logSecurityEvent(usuarioId, clienteId, '2FA_ENABLED', req.ip || undefined);

      res.json({ message: '2FA habilitado correctamente', backupCodes: twofa.backup_codes });
    } catch (error: any) {
      console.error('Enable 2FA step 2 error:', error);
      res.status(500).json({ message: 'Error verificando 2FA' });
    }
  },

  // DISABLE 2FA
  async disable2FA(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).usuario?.usuario_id;
      const clienteId = (req as any).usuario?.cliente_id;
      const userEmail = (req as any).usuario?.email;
      const { password, code } = req.body;

      if (!password || !code) return res.status(400).json({ message: 'Contraseña y código requeridos' });

      const usuario = await supabaseService.getUsuarioByEmail(userEmail);
      if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

      const validPassword = await supabaseService.validatePassword(password, usuario.password_hash);
      if (!validPassword) return res.status(401).json({ message: 'Contraseña incorrecta' });

      const twofa = await supabaseService.get2FA(usuarioId);
      if (!twofa || !twofa.enabled) return res.status(400).json({ message: '2FA no está habilitado' });

      const valid = totpService.verifyToken(twofa.secret_key, code);
      if (!valid) return res.status(401).json({ message: 'Código 2FA incorrecto' });

      await supabaseService.disable2FA(usuarioId);
      await emailService.send2FADisabledEmail(userEmail);
      await supabaseService.logSecurityEvent(usuarioId, clienteId, '2FA_DISABLED', req.ip || undefined);

      res.json({ message: '2FA deshabilitado' });
    } catch (error: any) {
      console.error('Disable 2FA error:', error);
      res.status(500).json({ message: 'Error deshabilitando 2FA' });
    }
  },

  // GET SESSIONS
  async getSessions(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).usuario?.usuario_id;
      if (!usuarioId) return res.status(401).json({ message: 'No autenticado' });

      const sessions = await supabaseService.getUserSessions(usuarioId);

      res.json({
        sessions: sessions.map((s: any) => ({
          id: s.id,
          device_name: s.device_name || 'Dispositivo desconocido',
          ip_address: s.ip_address,
          last_activity: s.last_activity,
          expires_at: s.expires_at,
        })),
      });
    } catch (error: any) {
      console.error('Get sessions error:', error);
      res.status(500).json({ message: 'Error obteniendo sesiones' });
    }
  },

  // LOGOUT SESSION
  async logoutSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ message: 'Session ID requerido' });

      await supabaseService.logoutSession(sessionId);
      res.json({ message: 'Sesión cerrada' });
    } catch (error: any) {
      console.error('Logout session error:', error);
      res.status(500).json({ message: 'Error cerrando sesión' });
    }
  },

  // LOGOUT ALL SESSIONS
  async logoutAllSessions(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).usuario?.usuario_id;
      if (!usuarioId) return res.status(401).json({ message: 'No autenticado' });

      await supabaseService.logoutAllSessions(usuarioId);
      res.json({ message: 'Todas las sesiones cerradas' });
    } catch (error: any) {
      console.error('Logout all sessions error:', error);
      res.status(500).json({ message: 'Error cerrando sesiones' });
    }
  },

  // GET SECURITY EVENTS
  async getSecurityEvents(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).usuario?.usuario_id;
      if (!usuarioId) return res.status(401).json({ message: 'No autenticado' });

      const { data: events, error } = await supabaseAdmin
        .from('security_events').select()
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false }).limit(50);

      if (error) throw error;
      res.json({ events });
    } catch (error: any) {
      console.error('Get security events error:', error);
      res.status(500).json({ message: 'Error obteniendo eventos' });
    }
  },
};
