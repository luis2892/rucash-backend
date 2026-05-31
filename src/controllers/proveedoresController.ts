import { Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';

export const proveedoresController = {
  async crear(req: Request, res: Response) {
    try {
      const clienteId = req.usuario!.cliente_id;
      const { nombre, email, telefono, numero_whatsapp, ciudad, direccion, ruc_proveedor, notas } = req.body;

      if (!nombre) {
        return res.status(400).json({ message: 'Campo requerido: nombre' });
      }

      const proveedor = await supabaseService.createProveedor(clienteId, {
        nombre,
        email,
        telefono,
        numero_whatsapp,
        ciudad,
        direccion,
        ruc_proveedor,
        notas,
        activo: true,
      });

      res.status(201).json({ proveedor });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async listar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario!.cliente_id;

      const proveedores = await supabaseService.getProveedores(clienteId);

      res.json({ proveedores });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtener(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const proveedor = await supabaseService.getProveedor(id);
      if (!proveedor) {
        return res.status(404).json({ message: 'Proveedor no encontrado' });
      }

      res.json({ proveedor });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      updates.updated_at = new Date();

      const proveedor = await supabaseService.updateProveedor(id, updates);

      res.json({ proveedor });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async desactivar(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const proveedor = await supabaseService.deactivateProveedor(id);

      res.json({ proveedor });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};
