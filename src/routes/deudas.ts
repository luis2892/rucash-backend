import { Router } from 'express';
import { deudasController } from '../controllers/deudasController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Static routes before parameterized
router.get('/analisis/resumen', authMiddleware, deudasController.obtenerAnalisis);

router.get('/', authMiddleware, deudasController.listar);
router.post('/', authMiddleware, deudasController.crear);
router.get('/:id', authMiddleware, deudasController.obtener);
router.put('/:id', authMiddleware, deudasController.actualizar);
router.post('/:id/pagar', authMiddleware, deudasController.registrarPago);
router.get('/:id/cronograma', authMiddleware, deudasController.obtenerCronograma);

export default router;
