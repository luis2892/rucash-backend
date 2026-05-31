import { Router } from 'express';
import { ventasController } from '../controllers/ventasController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, ventasController.crear);
router.get('/', authMiddleware, ventasController.listar);
router.get('/:id', authMiddleware, ventasController.obtener);
router.post('/:id/comprobante', authMiddleware, ventasController.generarComprobante);

export default router;
