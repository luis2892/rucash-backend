import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase';

export const flujoCajaController = {
  async listar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { fecha_inicio, fecha_fin } = req.query;

      let query = supabase
        .from('flujo_caja')
        .select('*')
        .eq('cliente_id', clienteId);

      if (fecha_inicio) query = query.gte('fecha', fecha_inicio);
      if (fecha_fin) query = query.lte('fecha', fecha_fin);

      const { data, error } = await query.order('fecha', { ascending: false });
      if (error) throw error;

      res.json({ flujo_caja: data });
    } catch (error: any) {
      console.error('Listar flujo caja error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerProyeccion(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const meses = parseInt((req.query.meses as string) || '6');

      // Promedio de ingresos últimos 30 días
      const { data: ventasRecientes } = await supabase
        .from('ventas').select('total').eq('cliente_id', clienteId)
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());

      const ingresoMensual = (ventasRecientes || []).reduce((s: number, v: any) => s + Number(v.total), 0);

      // Deudas activas — interés mensual como egreso recurrente
      const { data: deudas } = await supabase
        .from('deudas').select('monto_usd, interes_anual').eq('cliente_id', clienteId).eq('estado', 'ACTIVA');

      const egresoMensualDeudas = (deudas || []).reduce(
        (s: number, d: any) => s + (Number(d.monto_usd) * Number(d.interes_anual)) / 12 / 100, 0
      );

      const proyeccion = [];
      let saldo = 0;

      for (let i = 0; i < meses; i++) {
        const fecha = new Date();
        fecha.setMonth(fecha.getMonth() + i);

        saldo = saldo + ingresoMensual - egresoMensualDeudas;
        proyeccion.push({
          mes: fecha.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }),
          ingresos: Math.round(ingresoMensual * 100) / 100,
          egresos: Math.round(egresoMensualDeudas * 100) / 100,
          saldo: Math.round(saldo * 100) / 100,
        });
      }

      res.json({ proyeccion });
    } catch (error: any) {
      console.error('Proyección error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async generarReporte(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;

      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [ventasRes, deudasRes] = await Promise.all([
        supabase.from('ventas').select('total, moneda, metodo_pago, created_at')
          .eq('cliente_id', clienteId).gte('created_at', inicioMes),
        supabase.from('deudas').select('*').eq('cliente_id', clienteId).eq('estado', 'ACTIVA'),
      ]);

      const ventas = ventasRes.data || [];
      const deudas = deudasRes.data || [];

      const totalIngresos = ventas.reduce((s: number, v: any) => s + Number(v.total), 0);
      const totalDeudas = deudas.reduce((s: number, d: any) => s + Number(d.monto_usd), 0);
      const interesMensual = deudas.reduce(
        (s: number, d: any) => s + (Number(d.monto_usd) * Number(d.interes_anual)) / 12 / 100, 0
      );

      // Ventas por método de pago
      const porMetodoPago = ventas.reduce((acc: any, v: any) => {
        acc[v.metodo_pago] = (acc[v.metodo_pago] || 0) + Number(v.total);
        return acc;
      }, {});

      res.json({
        reporte: {
          periodo: new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }),
          ingresos_mes: Math.round(totalIngresos * 100) / 100,
          total_deudas: Math.round(totalDeudas * 100) / 100,
          interes_mensual: Math.round(interesMensual * 100) / 100,
          saldo_neto: Math.round((totalIngresos - interesMensual) * 100) / 100,
          ventas_count: ventas.length,
          por_metodo_pago: porMetodoPago,
          deudas,
        },
      });
    } catch (error: any) {
      console.error('Reporte error:', error);
      res.status(500).json({ message: error.message });
    }
  },
};
