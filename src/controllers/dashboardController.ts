import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase';

export const dashboardController = {
  async obtenerResumenDashboard(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;

      const [ventasData, metasData, equipoData, deudasData] = await Promise.all([
        supabase.from('ventas').select('total').eq('cliente_id', clienteId)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('metas').select('*').eq('cliente_id', clienteId).eq('estado', 'ACTIVA'),
        supabase.from('usuarios').select('*').eq('cliente_id', clienteId),
        supabase.from('deudas').select('*').eq('cliente_id', clienteId).eq('estado', 'ACTIVA'),
      ]);

      res.json({
        resumen: {
          ventas_hoy: ventasData.data?.reduce((sum: number, v: any) => sum + v.total, 0) || 0,
          metas_activas: metasData.data?.length || 0,
          metas_cumplidas: metasData.data?.filter((m: any) => m.valor_actual >= m.valor_objetivo).length || 0,
          equipo_total: equipoData.data?.length || 0,
          deudas_activas: deudasData.data?.length || 0,
          total_deudas: deudasData.data?.reduce((sum: number, d: any) => sum + (d.monto_usd || 0), 0) || 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerWidgets(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const usuarioId = req.usuario?.usuario_id;

      const { data, error } = await supabase
        .from('widgets_dashboard')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('usuario_id', usuarioId)
        .eq('visible', true)
        .order('orden', { ascending: true });

      if (error) throw error;
      res.json({ widgets: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async crearWidget(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const usuarioId = req.usuario?.usuario_id;
      const { tipo, titulo, tamaño, configuracion } = req.body;

      const { data, error } = await supabase
        .from('widgets_dashboard')
        .insert([{ cliente_id: clienteId, usuario_id: usuarioId, tipo, titulo, tamaño: tamaño || 'medium', configuracion, visible: true }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ widget: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async actualizarWidget(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('widgets_dashboard')
        .update(req.body)
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .select()
        .single();

      if (error) throw error;
      res.json({ widget: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async eliminarWidget(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { error } = await supabase
        .from('widgets_dashboard')
        .update({ visible: false })
        .eq('id', id)
        .eq('cliente_id', clienteId);

      if (error) throw error;
      res.json({ message: 'Widget eliminado' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async reordenarWidgets(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { widgets } = req.body;

      for (const widget of widgets) {
        await supabase
          .from('widgets_dashboard')
          .update({ orden: widget.orden })
          .eq('id', widget.id)
          .eq('cliente_id', clienteId);
      }

      res.json({ message: 'Widgets reordenados' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerLogActividad(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const limite = parseInt((req.query.limite as string) || '50');

      const { data, error } = await supabase
        .from('logs_actividad')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
        .limit(limite);

      if (error) throw error;
      res.json({ logs: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerEstadisticasActividad(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;

      const { data, error } = await supabase
        .from('logs_actividad')
        .select('accion, usuario_id')
        .eq('cliente_id', clienteId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      res.json({
        estadisticas: {
          total_acciones: data?.length || 0,
          acciones_por_tipo: data?.reduce((acc: any, log: any) => {
            acc[log.accion] = (acc[log.accion] || 0) + 1;
            return acc;
          }, {}),
          usuarios_activos: new Set(data?.map((l: any) => l.usuario_id)).size,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerSuscripcion(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;

      const { data, error } = await supabase
        .from('suscripciones')
        .select('*')
        .eq('cliente_id', clienteId)
        .single();

      if (error) throw error;
      res.json({ suscripcion: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerUsoSuscripcion(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;

      const [suscripcion, usuarios] = await Promise.all([
        supabase.from('suscripciones').select('*').eq('cliente_id', clienteId).single(),
        supabase.from('usuarios').select('id').eq('cliente_id', clienteId).eq('estado', 'ACTIVO'),
      ]);

      const usuariosUsados = usuarios.data?.length || 0;
      const limite = suscripcion.data?.usuarios_limite || 1;

      res.json({
        uso: {
          plan: suscripcion.data?.plan,
          usuarios_limite: limite,
          usuarios_usados: usuariosUsados,
          porcentaje_uso: (usuariosUsados / limite) * 100,
          vencimiento: suscripcion.data?.fecha_vencimiento,
          dias_restantes: Math.ceil(
            (new Date(suscripcion.data?.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ),
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};
