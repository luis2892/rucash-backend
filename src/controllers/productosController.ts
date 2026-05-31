import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase';

export const productosController = {
  async listar(req: Request, res: Response) {
    try {
      const clienteId = (req as any).usuario?.cliente_id;
      const { search, categoria } = req.query;

      let query = supabase
        .from('productos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('activo', true);

      if (search) {
        query = query.or(`nombre.ilike.%${search}%,codigo_barras.ilike.%${search}%`);
      }
      if (categoria) {
        query = query.eq('categoria', categoria);
      }

      const { data, error } = await query.order('nombre', { ascending: true });
      if (error) throw error;

      res.json({ productos: data });
    } catch (error: any) {
      console.error('Listar productos error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async buscarPorCodigo(req: Request, res: Response) {
    try {
      const clienteId = (req as any).usuario?.cliente_id;
      const { codigo } = req.params;

      const { data, error } = await supabase
        .from('productos').select('*')
        .eq('cliente_id', clienteId)
        .eq('codigo_barras', codigo)
        .eq('activo', true).single();

      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ message: 'Producto no encontrado' });
        throw error;
      }

      res.json({ producto: data });
    } catch (error: any) {
      console.error('Buscar producto error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async crear(req: Request, res: Response) {
    try {
      const clienteId = (req as any).usuario?.cliente_id;
      const { nombre, descripcion, codigo_barras, categoria, precio_usd, precio_sol, costo_usd, stock_tienda, stock_almacen } = req.body;

      if (!nombre || !codigo_barras || !precio_usd) {
        return res.status(400).json({ message: 'Campos requeridos faltantes: nombre, codigo_barras, precio_usd' });
      }

      const { data, error } = await supabase
        .from('productos')
        .insert([{
          cliente_id: clienteId,
          nombre, descripcion, codigo_barras, categoria,
          precio_usd,
          precio_sol: precio_sol || Math.round(precio_usd * 3.8 * 100) / 100,
          costo_usd,
          stock_tienda: stock_tienda || 0,
          stock_almacen: stock_almacen || 0,
          activo: true,
        }])
        .select().single();

      if (error) throw error;
      res.status(201).json({ producto: data });
    } catch (error: any) {
      console.error('Crear producto error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const clienteId = (req as any).usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('productos')
        .update({ ...req.body, updated_at: new Date() })
        .eq('id', id).eq('cliente_id', clienteId)
        .select().single();

      if (error) throw error;
      res.json({ producto: data });
    } catch (error: any) {
      console.error('Actualizar producto error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async eliminar(req: Request, res: Response) {
    try {
      const clienteId = (req as any).usuario?.cliente_id;
      const { id } = req.params;

      const { error } = await supabase
        .from('productos')
        .update({ activo: false, updated_at: new Date() })
        .eq('id', id).eq('cliente_id', clienteId);

      if (error) throw error;
      res.json({ message: 'Producto eliminado' });
    } catch (error: any) {
      console.error('Eliminar producto error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async actualizarStock(req: Request, res: Response) {
    try {
      const clienteId = (req as any).usuario?.cliente_id;
      const { id } = req.params;
      const { tipo, cantidad } = req.body;

      const field = tipo === 'tienda' ? 'stock_tienda' : 'stock_almacen';

      const { data, error } = await supabase
        .from('productos').select(field)
        .eq('id', id).eq('cliente_id', clienteId).single();

      if (error) throw error;

      const nuevoStock = Math.max(0, data[field] + cantidad);

      const { data: updated, error: updateError } = await supabase
        .from('productos')
        .update({ [field]: nuevoStock, updated_at: new Date() })
        .eq('id', id).eq('cliente_id', clienteId)
        .select().single();

      if (updateError) throw updateError;
      res.json({ producto: updated });
    } catch (error: any) {
      console.error('Actualizar stock error:', error);
      res.status(500).json({ message: error.message });
    }
  },
};
