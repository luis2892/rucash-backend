import { Router } from 'express';
import { productosController } from '../controllers/productosController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, productosController.listar);
router.get('/codigo/:codigo', authMiddleware, productosController.buscarPorCodigo);
router.post('/', authMiddleware, productosController.crear);
router.put('/:id', authMiddleware, productosController.actualizar);
router.delete('/:id', authMiddleware, productosController.eliminar);
router.patch('/:id/stock', authMiddleware, productosController.actualizarStock);

export default router;
