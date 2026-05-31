# 🔐 RUCASH Backend

API REST para RUCASH — Sistema de gestión POS y financiera.

## 🚀 Inicio Rápido

```bash
git clone https://github.com/luis2892/rucash-backend.git
cd rucash-backend
npm install
cp .env.example .env   # Editar credenciales
npm run dev
```

**Servidor:** http://localhost:3001

## 📡 Endpoints

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/signup` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/refresh-token` | Renovar token |
| POST | `/api/auth/logout` | Cerrar sesión |
| POST | `/api/auth/forgot-password` | Recuperar contraseña |
| POST | `/api/auth/reset-password` | Resetear contraseña |
| POST | `/api/auth/verify-email` | Verificar email |
| POST | `/api/auth/2fa/enable/step1` | Generar QR 2FA |
| POST | `/api/auth/2fa/enable/step2` | Confirmar 2FA |
| POST | `/api/auth/2fa/disable` | Deshabilitar 2FA |
| GET  | `/api/auth/sessions` | Ver sesiones activas |
| GET  | `/api/auth/security-events` | Ver eventos de seguridad |

### Productos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/productos` | Listar productos |
| GET | `/api/productos/codigo/:codigo` | Buscar por código |
| POST | `/api/productos` | Crear producto |
| PUT | `/api/productos/:id` | Actualizar |
| DELETE | `/api/productos/:id` | Soft delete |
| PATCH | `/api/productos/:id/stock` | Actualizar stock |

### Ventas
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/ventas` | Crear venta |
| GET | `/api/ventas` | Listar ventas |
| GET | `/api/ventas/:id` | Obtener venta |
| POST | `/api/ventas/:id/comprobante` | Generar comprobante |

## 🔑 Variables de Entorno

```env
NODE_ENV=development
PORT=3001
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=xxxxx
JWT_SECRET=xxxxx
REFRESH_SECRET=xxxxx
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

## 📁 Estructura

```
src/
├── config/         # Supabase client
├── middleware/      # auth.ts, errorHandler.ts
├── routes/          # auth, authAdvanced, products, sales
├── controllers/     # authController, authAdvancedController, productosController, ventasController
├── services/        # jwtService, totpService, emailService, supabaseService
├── types/           # TypeScript interfaces
└── index.ts         # Entry point
```

## 🛠️ Scripts

```bash
npm run dev     # Desarrollo con hot-reload
npm run build   # Build TypeScript
npm start       # Producción
```

## 🔗 Repos relacionados

- [Frontend](https://github.com/luis2892/rucash-frontend)
- [Base de Datos](https://github.com/luis2892/rucash-database)
- [Documentación](https://github.com/luis2892/rucash-docs)

---
© 2026 TARUK · Desarrollado por Luis Felix Rosas
