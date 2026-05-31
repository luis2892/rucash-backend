import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase';

const pct = (actual: number, objetivo: number) =>
  objetivo > 0 ? Math.round((actual / objetivo) * 10000) / 100 : 0;

export const metasController = {
  async crear(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { nombre, descripcion, tipo, categoria, valor_objetivo, usuario_id, fecha_inicio, fecha_fin, prioridad, notas } = req.body;

      if (!nombre || !tipo || !valor_objetivo || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ message: 'Campos requeridos: nombre, tipo, valor_objetivo, fechas' });
      }

      const { data, error } = await supabase
        .from('metas')
        .insert([{
          cliente_id: clienteId, nombre, descripcion, tipo, categoria,
          valor_objetivo, usuario_id, fecha_inicio, fecha_fin,
          prioridad: prioridad || 0, notas, estado: 'ACTIVA',
        }])
        .select().single();

      if (error) throw error;
      res.status(201).json({ meta: { ...data, porcentaje_cumplimiento: 0 } });
    } catch (error: any) {
      console.error('Crear meta error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async listar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { tipo, categoria, estado } = req.query;

      let query = supabase.from('metas').select('*').eq('cliente_id', clienteId);

      if (estado) query = query.eq('estado', estado);
      else query = query.eq('estado', 'ACTIVA');
      if (tipo) query = query.eq('tipo', tipo);
      if (categoria) query = query.eq('categoria', categoria);

      const { data, error } = await query.order('prioridad', { ascending: false });
      if (error) throw error;

      const metas = (data || []).map((m: any) => ({
        ...m,
        porcentaje_cumplimiento: pct(Number(m.valor_actual), Number(m.valor_objetivo)),
      }));

      res.json({ metas });
    } catch (error: any) {
      console.error('Listar metas error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async obtener(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('metas').select('*').eq('id', id).eq('cliente_id', clienteId).single();

      if (error) throw error;
      res.json({ meta: { ...data, porcentaje_cumplimiento: pct(Number(data.valor_actual), Number(data.valor_objetivo)) } });
    } catch (error: any) {
      console.error('Obtener meta error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('metas')
        .update({ ...req.body, updated_at: new Date() })
        .eq('id', id).eq('cliente_id', clienteId)
        .select().single();

      if (error) throw error;
      res.json({ meta: data });
    } catch (error: any) {
      console.error('Actualizar meta error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async registrarMovimiento(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const usuarioId = req.usuario?.usuario_id;
      const { id } = req.params;
      const { valor_nuevo, descripcion } = req.body;

      const { data: meta } = await supabase
        .from('metas').select('valor_actual, valor_objetivo').eq('id', id).single();

      if (!meta) return res.status(404).json({ message: 'Meta no encontrada' });

      const diferencia = valor_nuevo - Number(meta.valor_actual);
      const porcentajeProgreso = pct(valor_nuevo, Number(meta.valor_objetivo));

      const { data: movimiento, error: movError } = await supabase
        .from('movimientos_meta')
        .insert([{
          meta_id: id, cliente_id: clienteId, usuario_id: usuarioId,
          valor_anterior: meta.valor_actual, valor_nuevo, diferencia,
          porcentaje_progreso: porcentajeProgreso, descripcion,
        }])
        .select().single();

      if (movError) throw movError;

      // Actualizar valor_actual y estado si se completó
      const nuevoEstado = valor_nuevo >= Number(meta.valor_objetivo) ? 'COMPLETADA' : 'ACTIVA';
      const { data: metaActualizada } = await supabase
        .from('metas')
        .update({ valor_actual: valor_nuevo, estado: nuevoEstado, updated_at: new Date() })
        .eq('id', id).select().single();

      res.status(201).json({ movimiento, meta: metaActualizada });
    } catch (error: any) {
      console.error('Registrar movimiento error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerMovimientos(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('movimientos_meta').select('*')
        .eq('meta_id', id).eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ movimientos: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerResumen(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;

      const { data: metas } = await supabase
        .from('metas').select('*').eq('cliente_id', clienteId).eq('estado', 'ACTIVA');

      const lista = metas || [];
      const completadas = lista.filter((m: any) => Number(m.valor_actual) >= Number(m.valor_objetivo));
      const cumplimientoGeneral = lista.length > 0
        ? lista.reduce((s: number, m: any) => s + pct(Number(m.valor_actual), Number(m.valor_objetivo)), 0) / lista.length
        : 0;

      res.json({
        resumen: {
          total_metas: lista.length,
          metas_completadas: completadas.length,
          porcentaje_cumplimiento_general: Math.round(cumplimientoGeneral * 100) / 100,
          metas_por_tipo: {
            diarias: lista.filter((m: any) => m.tipo === 'DIARIA').length,
            semanales: lista.filter((m: any) => m.tipo === 'SEMANAL').length,
            mensuales: lista.filter((m: any) => m.tipo === 'MENSUAL').length,
            anuales: lista.filter((m: any) => m.tipo === 'ANUAL').length,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerAnalisisDetallado(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { periodo } = req.query;

      // Calcular análisis desde ventas reales
      const { data: ventas } = await supabase
        .from('ventas').select('total, created_at')
        .eq('cliente_id', clienteId)
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
        .order('created_at', { ascending: true });

      // Agrupar por día
      const porDia: Record<string, number[]> = {};
      (ventas || []).forEach((v: any) => {
        const fecha = new Date(v.created_at).toISOString().split('T')[0];
        if (!porDia[fecha]) porDia[fecha] = [];
        porDia[fecha].push(Number(v.total));
      });

      const analisis = Object.entries(porDia).map(([fecha, totales]) => ({
        periodo: fecha,
        total_ventas: totales.reduce((s, t) => s + t, 0),
        promedio_venta: totales.reduce((s, t) => s + t, 0) / totales.length,
        numero_transacciones: totales.length,
        ticket_promedio: totales.reduce((s, t) => s + t, 0) / totales.length,
        tasa_cumplimiento: 75, // mock hasta tener metas vinculadas
      }));

      res.json({ analisis });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerHistorico(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const meses = parseInt((req.query.meses as string) || '12');

      const { data, error } = await supabase
        .from('historico_metas').select('*').eq('cliente_id', clienteId)
        .order('mes', { ascending: false }).limit(meses);

      if (error) throw error;
      res.json({ historico: data || [] });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerPorVendedor(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { vendedor_id } = req.params;

      const { data, error } = await supabase
        .from('metas').select('*')
        .eq('cliente_id', clienteId).eq('usuario_id', vendedor_id).eq('estado', 'ACTIVA');

      if (error) throw error;
      const metas = (data || []).map((m: any) => ({
        ...m, porcentaje_cumplimiento: pct(Number(m.valor_actual), Number(m.valor_objetivo)),
      }));
      res.json({ metas });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};
