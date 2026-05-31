import { Router } from 'express';
import { metasController } from '../controllers/metasController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Static routes before parameterized ones
router.get('/analisis/resumen', authMiddleware, metasController.obtenerResumen);
router.get('/analisis/detalle', authMiddleware, metasController.obtenerAnalisisDetallado);
router.get('/historico', authMiddleware, metasController.obtenerHistorico);

router.get('/', authMiddleware, metasController.listar);
router.post('/', authMiddleware, metasController.crear);
router.get('/:id', authMiddleware, metasController.obtener);
router.put('/:id', authMiddleware, metasController.actualizar);
router.post('/:id/movimiento', authMiddleware, metasController.registrarMovimiento);
router.get('/:id/movimientos', authMiddleware, metasController.obtenerMovimientos);
router.get('/vendedor/:vendedor_id', authMiddleware, metasController.obtenerPorVendedor);

export default router;
