import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase';

export const marcasController = {
  async listar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { activo } = req.query;

      let query = supabase
        .from('marcas')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('nombre', { ascending: true });

      if (activo !== undefined) {
        query = query.eq('activo', activo === 'true');
      }

      const { data, error } = await query;
      if (error) throw error;

      res.json({ marcas: data || [] });
    } catch (error: any) {
      console.error('Listar marcas error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async crear(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { nombre, descripcion, logo_url } = req.body;

      if (!nombre) {
        return res.status(400).json({ message: 'nombre es requerido' });
      }

      const { data, error } = await supabase
        .from('marcas')
        .insert([{ cliente_id: clienteId, nombre, descripcion, logo_url, activo: true }])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ marca: data });
    } catch (error: any) {
      console.error('Crear marca error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async obtener(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('marcas')
        .select('*')
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .single();

      if (error || !data) {
        return res.status(404).json({ message: 'Marca no encontrada' });
      }

      res.json({ marca: data });
    } catch (error: any) {
      console.error('Obtener marca error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;
      const { nombre, descripcion, logo_url, activo } = req.body;

      const { data, error } = await supabase
        .from('marcas')
        .update({
          ...(nombre && { nombre }),
          ...(descripcion !== undefined && { descripcion }),
          ...(logo_url !== undefined && { logo_url }),
          ...(activo !== undefined && { activo }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .select()
        .single();

      if (error || !data) {
        return res.status(404).json({ message: 'Marca no encontrada' });
      }

      res.json({ marca: data });
    } catch (error: any) {
      console.error('Actualizar marca error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async eliminar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { error } = await supabase
        .from('marcas')
        .delete()
        .eq('id', id)
        .eq('cliente_id', clienteId);

      if (error) throw error;

      res.json({ message: 'Marca eliminada' });
    } catch (error: any) {
      console.error('Eliminar marca error:', error);
      res.status(500).json({ message: error.message });
    }
  },
};
