import { Router } from 'express';
import { productosController } from '../controllers/productosController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Static routes before parameterized ones
router.get('/avanzado/buscar', authMiddleware, productosController.buscarAvanzado);
router.get('/reporte/inventario', authMiddleware, productosController.generarReporteInventario);
router.get('/codigo/:codigo', authMiddleware, productosController.buscarPorCodigo);

router.get('/', authMiddleware, productosController.listar);
router.post('/', authMiddleware, productosController.crear);

router.get('/:id', authMiddleware, productosController.obtener);
router.put('/:id', authMiddleware, productosController.actualizar);
router.delete('/:id', authMiddleware, productosController.eliminar);
router.patch('/:id/stock', authMiddleware, productosController.actualizarStock);
router.patch('/:id/discontinuar', authMiddleware, productosController.discontinuar);
router.get('/:id/historial', authMiddleware, productosController.obtenerHistorialStock);
router.get('/:id/auditoria', authMiddleware, productosController.obtenerAuditoria);

export default router;
