import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase';
import crypto from 'crypto';

export const reportesController = {
  // ── PLANTILLAS ────────────────────────────────────────────────

  async listarPlantillas(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { tipo } = req.query;

      let query = supabase.from('plantillas_reportes').select('*').eq('cliente_id', clienteId);
      if (tipo) query = query.eq('tipo', tipo);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      res.json({ plantillas: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerPlantilla(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('plantillas_reportes').select('*')
        .eq('id', id).eq('cliente_id', clienteId).single();

      if (error) throw error;
      res.json({ plantilla: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async crearPlantilla(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { nombre, descripcion, tipo, estructura, es_publica } = req.body;

      if (!nombre || !tipo || !estructura) {
        return res.status(400).json({ message: 'Campos requeridos: nombre, tipo, estructura' });
      }

      const { data, error } = await supabase
        .from('plantillas_reportes')
        .insert([{ cliente_id: clienteId, nombre, descripcion, tipo, estructura, es_publica: es_publica || false, created_by: req.usuario?.usuario_id }])
        .select().single();

      if (error) throw error;
      res.status(201).json({ plantilla: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async actualizarPlantilla(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('plantillas_reportes')
        .update({ ...req.body, updated_at: new Date() })
        .eq('id', id).eq('cliente_id', clienteId)
        .select().single();

      if (error) throw error;
      res.json({ plantilla: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  // ── REPORTES GUARDADOS ────────────────────────────────────────

  async crearReporte(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { nombre, descripcion, plantilla_id, filtros_aplicados } = req.body;

      if (!nombre) return res.status(400).json({ message: 'Nombre requerido' });

      const { data, error } = await supabase
        .from('reportes_guardados')
        .insert([{ cliente_id: clienteId, nombre, descripcion, plantilla_id, filtros_aplicados: filtros_aplicados || {}, created_by: req.usuario?.usuario_id }])
        .select().single();

      if (error) throw error;
      res.status(201).json({ reporte: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async listarReportes(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;

      const { data, error } = await supabase
        .from('reportes_guardados')
        .select('*, plantillas_reportes(nombre, tipo)')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ reportes: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerReporte(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('reportes_guardados')
        .select('*, plantillas_reportes(*)')
        .eq('id', id).eq('cliente_id', clienteId).single();

      if (error) throw error;
      res.json({ reporte: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async actualizarReporte(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('reportes_guardados')
        .update({ ...req.body, updated_at: new Date() })
        .eq('id', id).eq('cliente_id', clienteId)
        .select().single();

      if (error) throw error;
      res.json({ reporte: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async eliminarReporte(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { error } = await supabase
        .from('reportes_guardados').delete()
        .eq('id', id).eq('cliente_id', clienteId);

      if (error) throw error;
      res.json({ message: 'Reporte eliminado' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  // ── GENERAR Y EXPORTAR ────────────────────────────────────────

  async generarDatos(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data: reporte, error } = await supabase
        .from('reportes_guardados').select('*, plantillas_reportes(*)')
        .eq('id', id).eq('cliente_id', clienteId).single();

      if (error) throw error;

      const tipo = (reporte as any).plantillas_reportes?.tipo;
      let datos: any[] = [];

      const tablaMap: Record<string, string> = {
        VENTAS: 'ventas', INVENTARIO: 'productos',
        DEUDAS: 'deudas', METAS: 'metas', FLUJO_CAJA: 'flujo_caja',
      };

      const tabla = tablaMap[tipo];
      if (tabla) {
        const { data: rows } = await supabase.from(tabla).select('*').eq('cliente_id', clienteId);
        datos = rows || [];
      }

      await supabase.from('reportes_guardados')
        .update({ resultado_datos: { filas: datos, total: datos.length }, fecha_generacion: new Date() })
        .eq('id', id);

      res.json({ datos, cantidad: datos.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async exportarCSV(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      // Generar datos primero
      const { data: reporte } = await supabase
        .from('reportes_guardados').select('*, plantillas_reportes(*)')
        .eq('id', id).eq('cliente_id', clienteId).single();

      const tipo = (reporte as any)?.plantillas_reportes?.tipo;
      const tablaMap: Record<string, string> = {
        VENTAS: 'ventas', INVENTARIO: 'productos', DEUDAS: 'deudas', METAS: 'metas',
      };
      const tabla = tablaMap[tipo] || 'ventas';
      const { data: rows } = await supabase.from(tabla).select('*').eq('cliente_id', clienteId);
      const datos = rows || [];

      // Generar CSV
      const headers = datos.length > 0 ? Object.keys(datos[0]).join(',') : '';
      const csvRows = datos.map((row: any) =>
        Object.values(row).map((v: any) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(',')
      );
      const csv = [headers, ...csvRows].join('\n');

      // Log exportación
      await supabase.from('historial_exportaciones').insert([{
        cliente_id: clienteId, reporte_id: id, tipo_exportacion: 'CSV',
        nombre_archivo: `${(reporte as any).nombre}.csv`, usuario_id: req.usuario?.usuario_id,
      }]);

      await supabase.from('reportes_guardados').update({ formato_ultima_exportacion: 'CSV' }).eq('id', id);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${(reporte as any).nombre}.csv"`);
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async exportarPDF(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data: reporte } = await supabase
        .from('reportes_guardados').select('*').eq('id', id).eq('cliente_id', clienteId).single();

      await supabase.from('historial_exportaciones').insert([{
        cliente_id: clienteId, reporte_id: id, tipo_exportacion: 'PDF',
        nombre_archivo: `${(reporte as any).nombre}.pdf`, usuario_id: req.usuario?.usuario_id,
      }]);
      await supabase.from('reportes_guardados').update({ formato_ultima_exportacion: 'PDF' }).eq('id', id);

      res.json({ mensaje: 'PDF marcado para generación', reporte_id: id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async exportarExcel(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data: reporte } = await supabase
        .from('reportes_guardados').select('*').eq('id', id).eq('cliente_id', clienteId).single();

      await supabase.from('historial_exportaciones').insert([{
        cliente_id: clienteId, reporte_id: id, tipo_exportacion: 'EXCEL',
        nombre_archivo: `${(reporte as any).nombre}.xlsx`, usuario_id: req.usuario?.usuario_id,
      }]);
      await supabase.from('reportes_guardados').update({ formato_ultima_exportacion: 'EXCEL' }).eq('id', id);

      res.json({ mensaje: 'Excel marcado para generación', reporte_id: id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  // ── PROGRAMACIÓN ──────────────────────────────────────────────

  async programarReporte(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;
      const { frecuencia, dia_semana, dia_mes, hora, emails_destinatarios } = req.body;

      if (!frecuencia || !emails_destinatarios?.length) {
        return res.status(400).json({ message: 'frecuencia y emails_destinatarios requeridos' });
      }

      const proximaEjecucion = new Date();
      const [h, m] = (hora || '08:00').split(':');
      proximaEjecucion.setHours(parseInt(h), parseInt(m), 0, 0);
      if (proximaEjecucion <= new Date()) proximaEjecucion.setDate(proximaEjecucion.getDate() + 1);

      const { data, error } = await supabase
        .from('reportes_programados')
        .insert([{ cliente_id: clienteId, reporte_id: id, frecuencia, dia_semana, dia_mes, hora: hora || '08:00:00', emails_destinatarios, proxima_ejecucion: proximaEjecucion.toISOString(), created_by: req.usuario?.usuario_id }])
        .select().single();

      if (error) throw error;
      res.status(201).json({ programacion: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerProgramacion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('reportes_programados').select('*').eq('reporte_id', id);
      if (error) throw error;
      res.json({ programacion: data?.[0] || null });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async actualizarProgramacion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('reportes_programados').update({ ...req.body, updated_at: new Date() })
        .eq('reporte_id', id).select().single();
      if (error) throw error;
      res.json({ programacion: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  // ── COMPARTIR ─────────────────────────────────────────────────

  async compartirReporte(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;
      const { compartido_con_email, nivel_acceso, fecha_expiracion } = req.body;

      if (!compartido_con_email) return res.status(400).json({ message: 'Email requerido' });

      const token = crypto.randomBytes(32).toString('hex');

      const { data, error } = await supabase
        .from('comparticiones_reportes')
        .insert([{ reporte_id: id, cliente_id: clienteId, compartido_con_email, nivel_acceso: nivel_acceso || 'VER', token_acceso: token, fecha_expiracion, created_by: req.usuario?.usuario_id }])
        .select().single();

      if (error) throw error;
      res.status(201).json({ comparticion: data, enlace: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reportes/publico/${token}` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerComparticiones(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('comparticiones_reportes').select('*').eq('reporte_id', id);
      if (error) throw error;
      res.json({ comparticiones: data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async revocarComparticion(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const { error } = await supabase
        .from('comparticiones_reportes').delete().eq('token_acceso', token);
      if (error) throw error;
      res.json({ message: 'Compartición revocada' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};
