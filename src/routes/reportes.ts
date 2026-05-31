import { Router } from 'express';
import { reportesController } from '../controllers/reportesController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Plantillas (static before /:id)
router.get('/plantillas', authMiddleware, reportesController.listarPlantillas);
router.post('/plantillas', authMiddleware, reportesController.crearPlantilla);
router.get('/plantillas/:id', authMiddleware, reportesController.obtenerPlantilla);
router.put('/plantillas/:id', authMiddleware, reportesController.actualizarPlantilla);

// Reportes guardados
router.get('/', authMiddleware, reportesController.listarReportes);
router.post('/', authMiddleware, reportesController.crearReporte);
router.get('/:id', authMiddleware, reportesController.obtenerReporte);
router.put('/:id', authMiddleware, reportesController.actualizarReporte);
router.delete('/:id', authMiddleware, reportesController.eliminarReporte);

// Generar y exportar
router.post('/:id/generar', authMiddleware, reportesController.generarDatos);
router.get('/:id/exportar-csv', authMiddleware, reportesController.exportarCSV);
router.post('/:id/exportar-pdf', authMiddleware, reportesController.exportarPDF);
router.post('/:id/exportar-excel', authMiddleware, reportesController.exportarExcel);

// Programación
router.post('/:id/programar', authMiddleware, reportesController.programarReporte);
router.get('/:id/programacion', authMiddleware, reportesController.obtenerProgramacion);
router.put('/:id/programacion', authMiddleware, reportesController.actualizarProgramacion);

// Compartir
router.post('/:id/compartir', authMiddleware, reportesController.compartirReporte);
router.get('/:id/comparticiones', authMiddleware, reportesController.obtenerComparticiones);
router.delete('/comparticiones/:token', reportesController.revocarComparticion);

export default router;
