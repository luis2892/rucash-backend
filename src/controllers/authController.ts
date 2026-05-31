import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../services/supabaseService';
import { jwtService } from '../services/jwtService';
import { SignUpPayload, LoginPayload } from '../types';

export const authController = {
  async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        email, password, full_name, whatsapp,
        empresa_nombre, ruc, industria, provincia, ciudad,
      }: SignUpPayload = req.body;

      if (!email || !password || !full_name || !whatsapp) {
        return res.status(400).json({ message: 'Todos los campos son requeridos' });
      }

      const usuarioExistente = await supabaseService.getUsuarioByEmail(email);
      if (usuarioExistente) {
        return res.status(409).json({ message: 'El email ya está registrado' });
      }

      // Crear cliente con nombre de empresa si se proporciona
      const nombreCliente = empresa_nombre || full_name;
      const cliente = await supabaseService.createCliente(email, nombreCliente, whatsapp, ruc);
      const usuario = await supabaseService.createUsuario(cliente.id, email, password, full_name, whatsapp);

      // Crear empresa config si hay datos adicionales
      if (industria || provincia || ciudad) {
        await supabaseService.createEmpresaConfig(cliente.id, {
          moneda_preferida: 'USD',
          industria,
          provincia,
          ciudad,
        });
      }

      const jwtPayload = {
        usuario_id: usuario.id,
        cliente_id: cliente.id,
        email: usuario.email,
        rol: usuario.rol,
        es_admin_sistema: false,
      };

      const accessToken = jwtService.generateAccessToken(jwtPayload);
      const refreshToken = jwtService.generateRefreshToken(jwtPayload);
      const hashedRefreshToken = jwtService.hashToken(refreshToken);
      await supabaseService.createRefreshToken(usuario.id, hashedRefreshToken);
      await supabaseService.logAudit(null, cliente.id, 'SIGNUP', 'clientes', cliente.id);

      res.status(201).json({
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
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      res.status(500).json({ message: error.message || 'Error en signup' });
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password }: LoginPayload = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña requeridos' });
      }

      const usuario = await supabaseService.getUsuarioByEmail(email);
      if (!usuario) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }

      const passwordValida = await supabaseService.validatePassword(password, usuario.password_hash);
      if (!passwordValida) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }

      if (usuario.estado !== 'ACTIVO') {
        return res.status(403).json({ message: 'Usuario inactivo o suspendido' });
      }

      const esAdmin = usuario.es_admin_sistema === true;

      const jwtPayload = {
        usuario_id: usuario.id,
        cliente_id: usuario.cliente_id,
        email: usuario.email,
        rol: usuario.rol,
        es_admin_sistema: esAdmin,
      };

      const accessToken = jwtService.generateAccessToken(jwtPayload);
      const refreshToken = jwtService.generateRefreshToken(jwtPayload);
      const hashedRefreshToken = jwtService.hashToken(refreshToken);
      await supabaseService.createRefreshToken(usuario.id, hashedRefreshToken);

      await supabaseService.logAudit(usuario.id, usuario.cliente_id, 'LOGIN', 'usuarios', usuario.id);

      res.json({
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
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ message: error.message || 'Error en login' });
    }
  },

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({ message: 'Refresh token requerido' });
      }

      const payload = jwtService.verifyRefreshToken(refresh_token);
      if (!payload) {
        return res.status(401).json({ message: 'Refresh token inválido o expirado' });
      }

      const hashedToken = jwtService.hashToken(refresh_token);
      const tokenValido = await supabaseService.validateRefreshToken(payload.usuario_id, hashedToken);
      if (!tokenValido) {
        return res.status(401).json({ message: 'Refresh token no encontrado' });
      }

      const newAccessToken = jwtService.generateAccessToken({
        usuario_id: payload.usuario_id,
        cliente_id: payload.cliente_id,
        email: payload.email,
        rol: payload.rol,
        es_admin_sistema: payload.es_admin_sistema,
      });

      res.json({ access_token: newAccessToken, refresh_token });
    } catch (error: any) {
      console.error('Refresh token error:', error);
      res.status(500).json({ message: error.message || 'Error refrescando token' });
    }
  },

  async me(req: Request, res: Response) {
    try {
      const usuarioId = req.usuario?.usuario_id;
      if (!usuarioId) return res.status(401).json({ message: 'No autenticado' });

      const usuario = await supabaseService.getUsuarioById(usuarioId);
      if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

      res.json({
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const usuarioId = req.usuario?.usuario_id;
      const clienteId = req.usuario?.cliente_id;
      if (usuarioId && clienteId) {
        await supabaseService.logAudit(usuarioId, clienteId, 'LOGOUT', 'usuarios', usuarioId);
      }
      res.json({ message: 'Logout exitoso' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};
