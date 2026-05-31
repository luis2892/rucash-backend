import { Router } from 'express';
import { suscripcionesController } from '../controllers/suscripcionesController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, suscripcionesController.crear);
router.get('/todas', authMiddleware, suscripcionesController.listarTodas);
router.get('/:cliente_id', authMiddleware, suscripcionesController.obtener);
router.patch('/:cliente_id', authMiddleware, suscripcionesController.actualizar);
router.post('/verificar/vencimientos', authMiddleware, suscripcionesController.verificarVencimientos);
router.get('/alertas/mi-cliente', authMiddleware, suscripcionesController.getAlertas);

export default router;
