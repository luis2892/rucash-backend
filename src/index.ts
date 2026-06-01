import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'express-async-errors';

import authRoutes from './routes/auth';
import authAdvancedRoutes from './routes/authAdvanced';
import productosRoutes from './routes/products';
import ventasRoutes from './routes/sales';
import categoriasRoutes from './routes/categorias';
import marcasRoutes from './routes/marcas';
import inventarioRoutes from './routes/inventario';
import deudasRoutes from './routes/deudas';
import flujoCajaRoutes from './routes/flujo-caja';
import metasRoutes from './routes/metas';
import reportesRoutes from './routes/reportes';
import dashboardRoutes from './routes/dashboard';
import equipoRoutes from './routes/equipo';
import suscripcionesRoutes from './routes/suscripciones';
import configRoutes from './routes/config';
import proveedoresRoutes from './routes/proveedores';
import { errorHandler } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('combined'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/auth', authAdvancedRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/marcas', marcasRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/deudas', deudasRoutes);
app.use('/api/flujo-caja', flujoCajaRoutes);
app.use('/api/metas', metasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/equipo', equipoRoutes);
app.use('/api/suscripciones', suscripcionesRoutes);
app.use('/api/config', configRoutes);
app.use('/api/proveedores', proveedoresRoutes);

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🛒 POS endpoints: /api/productos, /api/ventas`);
});

export default app;
