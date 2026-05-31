import { Request, Response } from 'express';
import { supabaseService } from '../services/supabaseService';

export const configController = {
  // ---- Empresa Config ----

  async crearEmpresaConfig(req: Request, res: Response) {
    try {
      const clienteId = req.usuario!.cliente_id;
      const { moneda_preferida, provincia, ciudad, industria } = req.body;

      const config = await supabaseService.createEmpresaConfig(clienteId, {
        moneda_preferida: moneda_preferida || 'USD',
        provincia,
        ciudad,
        industria,
      });

      res.status(201).json({ config });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerEmpresaConfig(req: Request, res: Response) {
    try {
      const clienteId = req.usuario!.cliente_id;

      const config = await supabaseService.getEmpresaConfig(clienteId);
      if (!config) {
        return res.status(404).json({ message: 'Configuración de empresa no encontrada' });
      }

      res.json({ config });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async actualizarEmpresaConfig(req: Request, res: Response) {
    try {
      const clienteId = req.usuario!.cliente_id;
      const updates = req.body;

      const config = await supabaseService.updateEmpresaConfig(clienteId, updates);

      res.json({ config });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  // ---- Sistema Config ----

  async obtenerConfigSistema(req: Request, res: Response) {
    try {
      const config = await supabaseService.getConfigSistema();
      if (!config) {
        return res.status(404).json({ message: 'Configuración del sistema no encontrada' });
      }

      res.json({ config });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async actualizarConfigSistema(req: Request, res: Response) {
    try {
      const usuarioId = req.usuario!.usuario_id;
      const updates = req.body;

      const config = await supabaseService.getConfigSistema();
      if (!config) {
        return res.status(404).json({ message: 'Configuración del sistema no encontrada' });
      }

      // Log cada cambio
      for (const [key, value] of Object.entries(updates)) {
        const oldValue = (config as any)[key];
        if (oldValue !== value) {
          await supabaseService.logConfigChange(key, oldValue, value, usuarioId);
        }
      }

      const updatedConfig = await supabaseService.updateConfigSistema(updates, usuarioId);

      res.json({ config: updatedConfig });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerConfigLogs(req: Request, res: Response) {
    try {
      const { data, error } = await (
        require('../config/supabase').supabaseAdmin
      )
        .from('config_logs')
        .select('*, usuarios(nombre_completo)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      res.json({ logs: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};
