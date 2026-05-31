import { Router } from 'express';
import { flujoCajaController } from '../controllers/flujoCajaController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/proyeccion', authMiddleware, flujoCajaController.obtenerProyeccion);
router.get('/reporte', authMiddleware, flujoCajaController.generarReporte);
router.get('/', authMiddleware, flujoCajaController.listar);

export default router;
