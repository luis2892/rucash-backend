import { Router } from 'express';
import { equipoController } from '../controllers/equipoController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, requireRole('ADMIN'), equipoController.listarMiembros);
router.get('/invitaciones/pendientes', authMiddleware, requireRole('ADMIN'), equipoController.listarInvitacionesPendientes);
router.get('/roles/disponibles', authMiddleware, equipoController.listarRoles);
router.get('/team/performance-general', authMiddleware, requireRole('ADMIN'), equipoController.obtenerPerformanceEquipo);
router.get('/:id', authMiddleware, requireRole('ADMIN'), equipoController.obtenerMiembro);
router.put('/:id', authMiddleware, requireRole('ADMIN'), equipoController.actualizarMiembro);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), equipoController.desactivarMiembro);
router.post('/:id/reactivar', authMiddleware, requireRole('ADMIN'), equipoController.reactivarMiembro);
router.put('/:id/rol', authMiddleware, requireRole('ADMIN'), equipoController.cambiarRol);
router.put('/:id/permisos', authMiddleware, requireRole('ADMIN'), equipoController.actualizarPermisos);
router.get('/:id/performance', authMiddleware, equipoController.obtenerPerformance);
router.get('/:id/sesiones', authMiddleware, requireRole('ADMIN'), equipoController.obtenerSesionesActivas);
router.delete('/:id/sesiones/:sesion_id', authMiddleware, requireRole('ADMIN'), equipoController.cerrarSesion);
router.post('/invitar', authMiddleware, requireRole('ADMIN'), equipoController.invitarUsuario);
router.post('/invitaciones/:token/aceptar', equipoController.aceptarInvitacion);
router.delete('/invitaciones/:id', authMiddleware, requireRole('ADMIN'), equipoController.cancelarInvitacion);

export default router;
