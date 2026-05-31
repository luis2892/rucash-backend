import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase';

export const deudasController = {
  async crear(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { tipo, acreedor, monto_usd, interes_anual, fecha_vencimiento, notas } = req.body;

      if (!tipo || !acreedor || !monto_usd) {
        return res.status(400).json({ message: 'Campos requeridos: tipo, acreedor, monto_usd' });
      }

      const { data, error } = await supabase
        .from('deudas')
        .insert([{
          cliente_id: clienteId,
          tipo,
          acreedor,
          monto_usd,
          monto_sol: Math.round(monto_usd * 3.82 * 100) / 100,
          interes_anual: interes_anual || 0,
          fecha_vencimiento,
          estado: 'ACTIVA',
          notas,
        }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ deuda: data });
    } catch (error: any) {
      console.error('Crear deuda error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async listar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { estado } = req.query;

      let query = supabase
        .from('deudas')
        .select('*')
        .eq('cliente_id', clienteId);

      if (estado) query = query.eq('estado', estado);

      const { data, error } = await query.order('fecha_vencimiento', { ascending: true, nullsFirst: false });
      if (error) throw error;

      res.json({ deudas: data });
    } catch (error: any) {
      console.error('Listar deudas error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async obtener(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('deudas')
        .select('*, pagos_deuda(*)')
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .single();

      if (error) throw error;
      res.json({ deuda: data });
    } catch (error: any) {
      console.error('Obtener deuda error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('deudas')
        .update({ ...req.body, updated_at: new Date() })
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .select()
        .single();

      if (error) throw error;
      res.json({ deuda: data });
    } catch (error: any) {
      console.error('Actualizar deuda error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async registrarPago(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { monto_pagado, metodo, referencia } = req.body;

      const { data: pago, error: pagoError } = await supabase
        .from('pagos_deuda')
        .insert([{ deuda_id: id, monto_pagado, metodo, referencia, fecha_pago: new Date() }])
        .select()
        .single();

      if (pagoError) throw pagoError;

      // Verificar si la deuda quedó pagada
      const { data: deuda } = await supabase
        .from('deudas').select('monto_usd').eq('id', id).single();

      const { data: pagos } = await supabase
        .from('pagos_deuda').select('monto_pagado').eq('deuda_id', id);

      const totalPagado = (pagos || []).reduce((s: number, p: any) => s + Number(p.monto_pagado), 0);

      if (deuda && totalPagado >= Number(deuda.monto_usd)) {
        await supabase.from('deudas').update({ estado: 'PAGADA', updated_at: new Date() }).eq('id', id);
      }

      res.status(201).json({ pago });
    } catch (error: any) {
      console.error('Registrar pago error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerCronograma(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('cronograma_pagos')
        .select('*')
        .eq('deuda_id', id)
        .order('numero_cuota', { ascending: true });

      if (error) throw error;
      res.json({ cronograma: data });
    } catch (error: any) {
      console.error('Cronograma error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerAnalisis(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;

      const { data: deudas } = await supabase
        .from('deudas').select('*').eq('cliente_id', clienteId).eq('estado', 'ACTIVA');

      const totalDeudas = (deudas || []).reduce((s: number, d: any) => s + Number(d.monto_usd), 0);
      const interesMensual = (deudas || []).reduce(
        (s: number, d: any) => s + (Number(d.monto_usd) * Number(d.interes_anual)) / 12 / 100, 0
      );

      const { data: ventas } = await supabase
        .from('ventas').select('total').eq('cliente_id', clienteId)
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());

      const totalIngresos = (ventas || []).reduce((s: number, v: any) => s + Number(v.total), 0);
      const ratioDeudaIngresos = totalIngresos > 0 ? (totalDeudas / totalIngresos) * 100 : 0;

      res.json({
        analisis: {
          total_deudas: totalDeudas,
          deudas_activas: (deudas || []).length,
          interes_mensual_estimado: interesMensual,
          ratio_deuda_ingresos: ratioDeudaIngresos,
          ingresos_mes: totalIngresos,
        },
      });
    } catch (error: any) {
      console.error('Análisis error:', error);
      res.status(500).json({ message: error.message });
    }
  },
};
