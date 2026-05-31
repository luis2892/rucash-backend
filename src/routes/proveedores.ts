import { Router } from 'express';
import { proveedoresController } from '../controllers/proveedoresController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, proveedoresController.crear);
router.get('/', authMiddleware, proveedoresController.listar);
router.get('/:id', authMiddleware, proveedoresController.obtener);
router.patch('/:id', authMiddleware, proveedoresController.actualizar);
router.delete('/:id', authMiddleware, proveedoresController.desactivar);

export default router;
