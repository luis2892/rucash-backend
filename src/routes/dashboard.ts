import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/resumen', authMiddleware, dashboardController.obtenerResumenDashboard);
router.get('/widgets', authMiddleware, dashboardController.obtenerWidgets);
router.post('/widgets', authMiddleware, dashboardController.crearWidget);
router.put('/widgets/:id', authMiddleware, dashboardController.actualizarWidget);
router.delete('/widgets/:id', authMiddleware, dashboardController.eliminarWidget);
router.post('/widgets/reordenar', authMiddleware, dashboardController.reordenarWidgets);
router.get('/actividad', authMiddleware, dashboardController.obtenerLogActividad);
router.get('/actividad/estadisticas', authMiddleware, dashboardController.obtenerEstadisticasActividad);
router.get('/suscripcion', authMiddleware, dashboardController.obtenerSuscripcion);
router.get('/suscripcion/uso', authMiddleware, dashboardController.obtenerUsoSuscripcion);

export default router;
