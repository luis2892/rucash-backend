import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../config/supabase';

export const productosController = {
  async listar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { search, categoria } = req.query;

      let query = supabase
        .from('productos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('activo', true)
        .eq('discontinuado', false);

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

  async buscarAvanzado(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const {
        search,
        categoria,
        stock_minimo,
        stock_maximo,
        precio_minimo,
        precio_maximo,
        discontinuado,
        proveedor,
      } = req.query;

      let query = supabase
        .from('productos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('activo', true);

      if (search) {
        query = query.or(
          `nombre.ilike.%${search}%,codigo_barras.ilike.%${search}%,descripcion.ilike.%${search}%`
        );
      }
      if (categoria) query = query.eq('categoria', categoria);
      if (proveedor) query = query.eq('proveedor', proveedor);
      if (stock_minimo) query = query.gte('stock_tienda', parseInt(stock_minimo as string));
      if (stock_maximo) query = query.lte('stock_tienda', parseInt(stock_maximo as string));
      if (precio_minimo) query = query.gte('precio_usd', parseFloat(precio_minimo as string));
      if (precio_maximo) query = query.lte('precio_usd', parseFloat(precio_maximo as string));

      query = query.eq('discontinuado', discontinuado === 'true');

      const { data, error } = await query.order('nombre', { ascending: true });
      if (error) throw error;

      res.json({ productos: data, total: data?.length || 0 });
    } catch (error: any) {
      console.error('Búsqueda avanzada error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async generarReporteInventario(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { formato = 'json' } = req.query;

      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('activo', true);

      if (error) throw error;

      const totalProductos = data?.length || 0;
      const totalValorTienda = data?.reduce((sum: number, p: any) => sum + p.precio_usd * p.stock_tienda, 0) || 0;
      const totalValorAlmacen = data?.reduce((sum: number, p: any) => sum + p.precio_usd * p.stock_almacen, 0) || 0;
      const sinStock = data?.filter((p: any) => p.stock_tienda === 0).length || 0;
      const stockBajo = data?.filter((p: any) => p.stock_tienda < (p.nivel_minimo_stock || 5)).length || 0;

      if (formato === 'csv') {
        const csv = [
          ['Código', 'Nombre', 'Categoría', 'Precio USD', 'Stock Tienda', 'Stock Almacén', 'Valor Tienda', 'Valor Almacén'].join(','),
          ...data!.map((p: any) =>
            [
              p.codigo_barras,
              `"${p.nombre}"`,
              p.categoria || '',
              p.precio_usd,
              p.stock_tienda,
              p.stock_almacen,
              (p.precio_usd * p.stock_tienda).toFixed(2),
              (p.precio_usd * p.stock_almacen).toFixed(2),
            ].join(',')
          ),
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=inventario-${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
      }

      res.json({
        reporte: {
          fecha: new Date().toISOString(),
          totalProductos,
          totalValorTienda,
          totalValorAlmacen,
          totalValorInventario: totalValorTienda + totalValorAlmacen,
          sinStock,
          stockBajo,
          productos: data,
        },
      });
    } catch (error: any) {
      console.error('Generar reporte error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async buscarPorCodigo(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { codigo } = req.params;

      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('codigo_barras', codigo)
        .eq('activo', true)
        .single();

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

  async obtener(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ message: 'Producto no encontrado' });
        throw error;
      }

      res.json({ producto: data });
    } catch (error: any) {
      console.error('Obtener producto error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async crear(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const usuarioId = req.usuario?.usuario_id;
      const { nombre, descripcion, codigo_barras, categoria, precio_usd, precio_sol, costo_usd, stock_tienda, stock_almacen, nivel_minimo_stock, proveedor } = req.body;

      if (!nombre || !codigo_barras || !precio_usd) {
        return res.status(400).json({ message: 'Campos requeridos: nombre, codigo_barras, precio_usd' });
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
          nivel_minimo_stock: nivel_minimo_stock || 5,
          proveedor,
          activo: true,
          discontinuado: false,
        }])
        .select()
        .single();

      if (error) throw error;

      await supabase.from('auditoria_productos').insert([{
        cliente_id: clienteId,
        usuario_id: usuarioId,
        producto_id: data.id,
        accion: 'CREATE',
        valor_nuevo: JSON.stringify({ nombre, precio_usd }),
      }]);

      res.status(201).json({ producto: data });
    } catch (error: any) {
      console.error('Crear producto error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const usuarioId = req.usuario?.usuario_id;
      const { id } = req.params;

      // Snapshot before update for audit
      const { data: antes } = await supabase
        .from('productos').select('*').eq('id', id).eq('cliente_id', clienteId).single();

      const { data, error } = await supabase
        .from('productos')
        .update({ ...req.body, updated_at: new Date() })
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .select()
        .single();

      if (error) throw error;

      // Log changed fields
      if (antes) {
        const changedFields = Object.keys(req.body).filter(
          k => (antes as any)[k] !== req.body[k]
        );
        for (const campo of changedFields) {
          await supabase.from('auditoria_productos').insert([{
            cliente_id: clienteId,
            usuario_id: usuarioId,
            producto_id: id,
            accion: 'UPDATE',
            campo_modificado: campo,
            valor_anterior: String((antes as any)[campo]),
            valor_nuevo: String(req.body[campo]),
          }]);
        }
      }

      res.json({ producto: data });
    } catch (error: any) {
      console.error('Actualizar producto error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async eliminar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const usuarioId = req.usuario?.usuario_id;
      const { id } = req.params;

      const { error } = await supabase
        .from('productos')
        .update({ activo: false, updated_at: new Date() })
        .eq('id', id)
        .eq('cliente_id', clienteId);

      if (error) throw error;

      await supabase.from('auditoria_productos').insert([{
        cliente_id: clienteId,
        usuario_id: usuarioId,
        producto_id: id,
        accion: 'DELETE',
      }]);

      res.json({ message: 'Producto eliminado' });
    } catch (error: any) {
      console.error('Eliminar producto error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async actualizarStock(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const usuarioId = req.usuario?.usuario_id;
      const { id } = req.params;
      const { tipo, cantidad, notas } = req.body;

      const field = tipo === 'tienda' ? 'stock_tienda' : 'stock_almacen';

      const { data, error } = await supabase
        .from('productos')
        .select(field)
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .single();

      if (error) throw error;

      const stockAnterior = (data as any)[field];
      const nuevoStock = Math.max(0, stockAnterior + cantidad);

      const { data: updated, error: updateError } = await supabase
        .from('productos')
        .update({ [field]: nuevoStock, updated_at: new Date() })
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .select()
        .single();

      if (updateError) throw updateError;

      await supabase.from('historial_stock').insert([{
        cliente_id: clienteId,
        producto_id: id,
        usuario_id: usuarioId,
        tipo: cantidad > 0 ? 'COMPRA' : 'AJUSTE',
        cantidad,
        stock_anterior: stockAnterior,
        stock_nuevo: nuevoStock,
        ubicacion: tipo,
        notas,
      }]);

      res.json({ producto: updated });
    } catch (error: any) {
      console.error('Actualizar stock error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async discontinuar(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const usuarioId = req.usuario?.usuario_id;
      const { id } = req.params;
      const { razon } = req.body;

      const { data, error } = await supabase
        .from('productos')
        .update({ discontinuado: true, fecha_discontinuado: new Date(), updated_at: new Date() })
        .eq('id', id)
        .eq('cliente_id', clienteId)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('auditoria_productos').insert([{
        cliente_id: clienteId,
        usuario_id: usuarioId,
        producto_id: id,
        accion: 'UPDATE',
        campo_modificado: 'discontinuado',
        valor_anterior: 'false',
        valor_nuevo: 'true',
        razon,
      }]);

      res.json({ producto: data });
    } catch (error: any) {
      console.error('Discontinuar producto error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerHistorialStock(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id: producto_id } = req.params;
      const { dias = '30' } = req.query;

      const { data, error } = await supabase
        .from('historial_stock')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('producto_id', producto_id)
        .gte('created_at', new Date(Date.now() - parseInt(dias as string) * 86400000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({ historial: data });
    } catch (error: any) {
      console.error('Obtener historial error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  async obtenerAuditoria(req: Request, res: Response) {
    try {
      const clienteId = req.usuario?.cliente_id;
      const { id: producto_id } = req.params;

      const { data, error } = await supabase
        .from('auditoria_productos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('producto_id', producto_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      res.json({ auditoria: data });
    } catch (error: any) {
      console.error('Obtener auditoría error:', error);
      res.status(500).json({ message: error.message });
    }
  },
};
