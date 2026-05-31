import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase';

export const ventasController = {
  async crear(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).usuario?.usuario_id;
      const clienteId = (req as any).usuario?.cliente_id;
      const { items, moneda, metodo_pago, monto_pagado, notas } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Venta sin items' });
      }

      const subtotal = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
      const impuesto = Math.round(subtotal * 0.18 * 100) / 100;
      const total = Math.round((subtotal + impuesto) * 100) / 100;
      const cambio = Math.max(0, Math.round((monto_pagado - total) * 100) / 100);

      const { data: venta, error: ventaError } = await supabase
        .from('ventas')
        .insert([{ cliente_id: clienteId, usuario_id: usuarioId, moneda, subtotal, impuesto, total, metodo_pago, monto_pagado, cambio, estado: 'COMPLETADA', notas }])
        .select().single();

      if (ventaError) throw ventaError;

      const detallesData = items.map((item: any) => ({
        venta_id: venta.id,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
      }));

      const { error: detallesError } = await supabase.from('detalles_venta').insert(detallesData);
      if (detallesError) throw detallesError;

      // Decrementar stock
      for (const item of items) {
        await supabase.rpc('decrementar_stock', {
          p_producto_id: item.producto_id,
          p_cantidad: item.cantidad,
        });
      }

      res.status(201).json({ venta: { ...venta, items } });
    } catch (error: any) {
      console.error('Crear venta error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async listar(req: Request, res: Response) {
    try {
      const clienteId = (req as any).usuario?.cliente_id;
      const { fecha_inicio, fecha_fin } = req.query;

      let query = supabase.from('ventas').select('*').eq('cliente_id', clienteId);

      if (fecha_inicio && fecha_fin) {
        query = query.gte('created_at', fecha_inicio).lte('created_at', fecha_fin);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      res.json({ ventas: data });
    } catch (error: any) {
      console.error('Listar ventas error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async obtener(req: Request, res: Response) {
    try {
      const clienteId = (req as any).usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('ventas')
        .select('*, detalles_venta(*)')
        .eq('id', id).eq('cliente_id', clienteId).single();

      if (error) throw error;
      res.json({ venta: data });
    } catch (error: any) {
      console.error('Obtener venta error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async generarComprobante(req: Request, res: Response) {
    try {
      const clienteId = (req as any).usuario?.cliente_id;
      const { id } = req.params;

      const { data: venta, error } = await supabase
        .from('ventas')
        .select('*, detalles_venta(*), usuarios(*), clientes(*)')
        .eq('id', id).eq('cliente_id', clienteId).single();

      if (error) throw error;

      res.json({
        comprobante: {
          numero: `RUC-${Date.now()}`,
          fecha: new Date().toISOString(),
          venta,
        },
      });
    } catch (error: any) {
      console.error('Generar comprobante error:', error);
      res.status(500).json({ message: error.message });
    }
  },
};
