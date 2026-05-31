import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const equipoController = {
  async listarMiembros(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      res.json({ miembros: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerMiembro(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .single();

      if (error) throw error;
      res.json({ miembro: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async actualizarMiembro(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;
      const { nombre_completo, whatsapp } = req.body;

      const { data, error } = await supabase
        .from('usuarios')
        .update({ nombre_completo, whatsapp })
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .select()
        .single();

      if (error) throw error;
      res.json({ miembro: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async desactivarMiembro(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;
      const { razon } = req.body;

      const { data, error } = await supabase
        .from('usuarios')
        .update({ estado: 'INACTIVO' })
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('auditoria_permisos').insert([{
        cliente_id: clienteId,
        accion: 'DESACTIVAR_USUARIO',
        usuario_afectado_id: id,
        razon,
        realizado_por: req.usuario?.usuario_id,
      }]);

      res.json({ miembro: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async reactivarMiembro(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('usuarios')
        .update({ estado: 'ACTIVO' })
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .select()
        .single();

      if (error) throw error;
      res.json({ miembro: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async invitarUsuario(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { email, rol } = req.body;

      if (!email || !rol) {
        return res.status(400).json({ message: 'Email y rol requeridos' });
      }

      const token = crypto.randomBytes(32).toString('hex');

      const { data, error } = await supabase
        .from('invitaciones')
        .insert([{
          cliente_id: clienteId,
          email,
          rol,
          token_invitacion: token,
          fecha_expiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          invited_by: req.usuario?.usuario_id,
        }])
        .select()
        .single();

      if (error) throw error;

      const enlaceInvitacion = `${process.env.FRONTEND_URL}/unirse?token=${token}`;
      res.status(201).json({ invitacion: data, enlace: enlaceInvitacion });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async listarInvitacionesPendientes(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;

      const { data, error } = await supabase
        .from('invitaciones')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('estado', 'PENDIENTE')
        .order('fecha_envio', { ascending: false });

      if (error) throw error;
      res.json({ invitaciones: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async aceptarInvitacion(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const { password, nombre_completo } = req.body;

      const { data: invitacion, error: invError } = await supabase
        .from('invitaciones')
        .select('*')
        .eq('token_invitacion', token)
        .eq('estado', 'PENDIENTE')
        .single();

      if (invError || !invitacion) {
        return res.status(400).json({ message: 'Invitación inválida o expirada' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .insert([{
          cliente_id: invitacion.cliente_id,
          email: invitacion.email,
          password_hash: hashedPassword,
          nombre_completo: nombre_completo || invitacion.email,
          rol: invitacion.rol,
          estado: 'ACTIVO',
        }])
        .select()
        .single();

      if (userError) throw userError;

      await supabase
        .from('invitaciones')
        .update({ estado: 'ACEPTADA', aceptada_en: new Date() })
        .eq('id', invitacion.id);

      res.json({ usuario, mensaje: 'Bienvenido a RUCASH' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async cancelarInvitacion(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { error } = await supabase
        .from('invitaciones')
        .update({ estado: 'RECHAZADA' })
        .eq('id', id)
        .eq('cliente_id', clienteId);

      if (error) throw error;
      res.json({ message: 'Invitación cancelada' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async listarRoles(req: Request, res: Response) {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      res.json({ roles: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async cambiarRol(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;
      const { rol_nuevo } = req.body;

      const { data: usuarioActual } = await supabase
        .from('usuarios').select('rol').eq('id', id).single();

      const { data, error } = await supabase
        .from('usuarios')
        .update({ rol: rol_nuevo })
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('auditoria_permisos').insert([{
        cliente_id: clienteId,
        accion: 'CAMBIAR_ROL',
        usuario_afectado_id: id,
        datos_anteriores: { rol: usuarioActual?.rol },
        datos_nuevos: { rol: rol_nuevo },
        realizado_por: req.usuario?.usuario_id,
      }]);

      res.json({ miembro: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async actualizarPermisos(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { permisos } = req.body;

      for (const [recurso, permitido] of Object.entries(permisos)) {
        await supabase.from('permisos').upsert([{
          usuario_id: id,
          recurso,
          accion: 'GENERAL',
          permitido,
        }]);
      }

      res.json({ mensaje: 'Permisos actualizados' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerPerformance(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;
      const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [ventas, metas] = await Promise.all([
        supabase.from('ventas').select('total').eq('cliente_id', clienteId).eq('usuario_id', id).gte('created_at', desde),
        supabase.from('metas').select('valor_objetivo, valor_actual').eq('cliente_id', clienteId).eq('usuario_id', id),
      ]);

      const totalVentas = ventas.data?.reduce((sum: number, v: any) => sum + v.total, 0) || 0;
      const metasCumplidas = metas.data?.filter((m: any) => m.valor_actual >= m.valor_objetivo).length || 0;
      const tasaCumplimiento = (metas.data?.length || 0) > 0 ? (metasCumplidas / metas.data!.length) * 100 : 0;

      res.json({
        performance: {
          total_ventas_mes: totalVentas,
          promedio_venta: ventas.data?.length ? totalVentas / ventas.data.length : 0,
          transacciones: ventas.data?.length || 0,
          metas_cumplidas: metasCumplidas,
          tasa_cumplimiento: tasaCumplimiento,
          performance_score: Math.round(tasaCumplimiento),
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerPerformanceEquipo(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: miembros } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, rol')
        .eq('cliente_id', clienteId)
        .eq('estado', 'ACTIVO');

      const performance = await Promise.all(
        (miembros || []).map(async (m: any) => {
          const { data } = await supabase
            .from('ventas').select('total').eq('usuario_id', m.id).gte('created_at', desde);
          return {
            nombre: m.nombre_completo,
            rol: m.rol,
            total_ventas: data?.reduce((s: number, v: any) => s + v.total, 0) || 0,
            transacciones: data?.length || 0,
          };
        })
      );

      res.json({ performance });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerSesionesActivas(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('sesiones_activas')
        .select('*')
        .eq('usuario_id', id)
        .is('logout_at', null);

      if (error) throw error;
      res.json({ sesiones: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async cerrarSesion(req: Request, res: Response) {
    try {
      const { id, sesion_id } = req.params;

      const { error } = await supabase
        .from('sesiones_activas')
        .update({ logout_at: new Date() })
        .eq('id', sesion_id)
        .eq('usuario_id', id);

      if (error) throw error;
      res.json({ mensaje: 'Sesión cerrada' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};
