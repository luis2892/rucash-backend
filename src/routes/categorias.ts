import { Router } from 'express';
import { categoriasController } from '../controllers/categoriasController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, categoriasController.listar);
router.post('/', authMiddleware, requireRole('ADMIN'), categoriasController.crear);
router.put('/:id', authMiddleware, categoriasController.actualizar);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), categoriasController.eliminar);

export default router;
