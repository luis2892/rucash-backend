import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase';

export const inventarioController = {
  async listarPorUbicacion(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { ubicacion } = req.query;

      if (!ubicacion || !['tienda', 'almacen'].includes(ubicacion as string)) {
        return res.status(400).json({ message: 'Ubicación debe ser tienda o almacen' });
      }

      const stockField = ubicacion === 'tienda' ? 'stock_tienda' : 'stock_almacen';

      const { data, error } = await supabase
        .from('productos')
        .select('*, marcas(id, nombre), proveedores(id, nombre)')
        .eq('cliente_id', clienteId)
        .eq('activo', true)
        .gt(stockField, 0)
        .order('nombre', { ascending: true });

      if (error) throw error;

      res.json({ productos: data || [], ubicacion });
    } catch (error: any) {
      console.error('Listar por ubicación error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerAlertas(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;

      const { data: productos, error: prodError } = await supabase
        .from('productos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('activo', true);

      if (prodError) throw prodError;

      const alertas = [];
      for (const p of productos || []) {
        let tipo = 'NORMAL';
        if (p.stock_tienda === 0) tipo = 'SIN_STOCK';
        else if (p.stock_tienda < (p.nivel_minimo_stock || 5)) tipo = 'STOCK_BAJO';
        else if (p.stock_tienda > (p.nivel_maximo_stock || 100)) tipo = 'EXCESO';

        if (tipo !== 'NORMAL') {
          alertas.push({
            id: p.id,
            producto_id: p.id,
            nombre: p.nombre,
            tipo,
            stock_actual: p.stock_tienda,
            nivel_minimo: p.nivel_minimo_stock || 5,
            nivel_maximo: p.nivel_maximo_stock || 100,
          });
        }
      }

      res.json({ alertas });
    } catch (error: any) {
      console.error('Obtener alertas error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerResumen(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;

      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('activo', true);

      if (error) throw error;

      const resumen = {
        total_productos: data?.length || 0,
        tienda: {
          cantidad_total: 0,
          valor_total: 0,
          productos_stock_cero: 0,
        },
        almacen: {
          cantidad_total: 0,
          valor_total: 0,
          productos_stock_cero: 0,
        },
      };

      for (const p of data || []) {
        resumen.tienda.cantidad_total += p.stock_tienda || 0;
        resumen.tienda.valor_total += (p.stock_tienda || 0) * (p.precio_usd || 0);
        if (p.stock_tienda === 0) resumen.tienda.productos_stock_cero++;

        resumen.almacen.cantidad_total += p.stock_almacen || 0;
        resumen.almacen.valor_total += (p.stock_almacen || 0) * (p.precio_usd || 0);
        if (p.stock_almacen === 0) resumen.almacen.productos_stock_cero++;
      }

      res.json(resumen);
    } catch (error: any) {
      console.error('Obtener resumen error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async buscarPorCodigoBarras(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { codigo_barras } = req.body;

      if (!codigo_barras) {
        return res.status(400).json({ message: 'codigo_barras es requerido' });
      }

      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('codigo_barras', codigo_barras)
        .eq('activo', true)
        .single();

      if (error || !data) {
        return res.status(404).json({ message: 'Producto no encontrado' });
      }

      res.json({ producto: data });
    } catch (error: any) {
      console.error('Buscar por código barras error:', error);
      res.status(500).json({ message: error.message });
    }
  },
};
