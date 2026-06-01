import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase';

export const categoriasController = {
  async listar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;

      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (error) throw error;

      res.json({ categorias: data });
    } catch (error: any) {
      console.error('Listar categorías error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async crear(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { nombre, descripcion, icono, color, orden } = req.body;

      if (!nombre) {
        return res.status(400).json({ message: 'Nombre requerido' });
      }

      const { data, error } = await supabase
        .from('categorias')
        .insert([{ cliente_id: clienteId, nombre, descripcion, icono, color, orden: orden || 0 }])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ categoria: data });
    } catch (error: any) {
      console.error('Crear categoría error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;
      const userRole = req.usuario?.rol;

      const { data: categoria, error: catError } = await supabase
        .from('categorias')
        .select('*')
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .single();

      if (catError || !categoria) {
        return res.status(404).json({ message: 'Categoría no encontrada' });
      }

      if (userRole !== 'ADMIN' && (!categoria.permite_edicion_almacenero || userRole !== 'ALMACENERO')) {
        return res.status(403).json({ message: 'No tienes permisos para editar esta categoría' });
      }

      const updates = { ...req.body, updated_at: new Date() };
      const { data, error } = await supabase
        .from('categorias')
        .update(updates)
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .select()
        .single();

      if (error) throw error;

      res.json({ categoria: data });
    } catch (error: any) {
      console.error('Actualizar categoría error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async eliminar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { error } = await supabase
        .from('categorias')
        .update({ activo: false })
        .eq('id', id)
        .eq('cliente_id', clienteId);

      if (error) throw error;

      res.json({ message: 'Categoría eliminada' });
    } catch (error: any) {
      console.error('Eliminar categoría error:', error);
      res.status(500).json({ message: error.message });
    }
  },
};
