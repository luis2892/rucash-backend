import { Router } from 'express';
import { configController } from '../controllers/configController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Empresa Config
router.post('/empresa', authMiddleware, configController.crearEmpresaConfig);
router.get('/empresa', authMiddleware, configController.obtenerEmpresaConfig);
router.patch('/empresa', authMiddleware, configController.actualizarEmpresaConfig);

// Sistema Config (solo admin)
router.get('/sistema', authMiddleware, configController.obtenerConfigSistema);
router.patch('/sistema', authMiddleware, configController.actualizarConfigSistema);
router.get('/sistema/logs', authMiddleware, configController.obtenerConfigLogs);

export default router;
