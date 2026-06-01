import { Router } from 'express';
import { inventarioController } from '../controllers/inventarioController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/resumen', authMiddleware, inventarioController.obtenerResumen);
router.get('/alertas', authMiddleware, inventarioController.obtenerAlertas);
router.post('/scan', authMiddleware, inventarioController.buscarPorCodigoBarras);
router.get('/', authMiddleware, inventarioController.listarPorUbicacion);

export default router;
