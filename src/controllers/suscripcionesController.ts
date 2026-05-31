import { Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';
import { supabaseAdmin } from '../config/supabase';

export const suscripcionesController = {
  async crear(req: Request, res: Response) {
    try {
      const { cliente_id, plan, fecha_vencimiento, monto_pagado, metodo_pago, notas } = req.body;

      if (!cliente_id || !plan || !fecha_vencimiento) {
        return res.status(400).json({ message: 'Campos requeridos: cliente_id, plan, fecha_vencimiento' });
      }

      const suscripcion = await supabaseService.createSuscripcion(
        cliente_id,
        plan,
        new Date(fecha_vencimiento),
        'ACTIVO'
      );

      res.status(201).json({ suscripcion });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async listarTodas(req: Request, res: Response) {
    try {
      const { estado } = req.query;

      let query = supabaseAdmin.from('suscripciones').select('*, clientes(*)');
      if (estado) query = query.eq('estado', estado);

      const { data, error } = await query.order('fecha_vencimiento', { ascending: true });
      if (error) throw error;

      res.json({ suscripciones: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtener(req: Request, res: Response) {
    try {
      const { cliente_id } = req.params;

      const suscripcion = await supabaseService.getSuscripcion(cliente_id);
      if (!suscripcion) {
        return res.status(404).json({ message: 'Suscripción no encontrada' });
      }

      res.json({ suscripcion });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const { cliente_id } = req.params;
      const { plan, fecha_vencimiento, estado, monto_pagado, metodo_pago, notas } = req.body;

      const updates: any = {};
      if (plan) updates.plan = plan;
      if (fecha_vencimiento) updates.fecha_vencimiento = fecha_vencimiento;
      if (estado) updates.estado = estado;
      if (monto_pagado) updates.monto_pagado = monto_pagado;
      if (metodo_pago) updates.metodo_pago = metodo_pago;
      if (notas) updates.notas = notas;
      updates.updated_at = new Date();

      const suscripcion = await supabaseService.updateSuscripcion(cliente_id, updates);

      res.json({ suscripcion });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async verificarVencimientos(req: Request, res: Response) {
    try {
      const suscripciones = await supabaseService.getAllSuscripciones();
      const hoy = new Date();
      const procesos = [];

      for (const suscripcion of suscripciones) {
        const fechaVencimiento = new Date(suscripcion.fecha_vencimiento);
        const diasFaltantes = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        if (diasFaltantes <= 0) {
          procesos.push(supabaseService.updateSuscripcion(suscripcion.cliente_id, { estado: 'BLOQUEADO' }));
          procesos.push(supabaseService.createAlertaSuscripcion(suscripcion.cliente_id, 'VENCIDA'));
        } else if (diasFaltantes <= 7) {
          if (diasFaltantes <= 3) {
            procesos.push(supabaseService.createAlertaSuscripcion(suscripcion.cliente_id, 'VENCE_3_DIAS'));
          } else {
            procesos.push(supabaseService.createAlertaSuscripcion(suscripcion.cliente_id, 'VENCE_7_DIAS'));
          }

          if (diasFaltantes === 0) {
            procesos.push(supabaseService.createAlertaSuscripcion(suscripcion.cliente_id, 'VENCE_HOY'));
          }

          procesos.push(supabaseService.updateSuscripcion(suscripcion.cliente_id, { estado: 'ACTIVO_PRONTO_VENCE' }));
        }
      }

      await Promise.all(procesos);

      res.json({ message: 'Vencimientos verificados', procesados: procesos.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async getAlertas(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;

      const alertas = await supabaseService.getAlertasSuscripcion(clienteId);

      res.json({ alertas });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};
