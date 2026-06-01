import { Router } from 'express';
import { marcasController } from '../controllers/marcasController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, marcasController.listar);
router.post('/', authMiddleware, requireRole('ADMIN'), marcasController.crear);
router.get('/:id', authMiddleware, marcasController.obtener);
router.put('/:id', authMiddleware, requireRole('ADMIN'), marcasController.actualizar);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), marcasController.eliminar);

export default router;
