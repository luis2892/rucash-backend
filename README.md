# RUCASH Backend

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

**API REST para RUCASH — Sistema POS + Gestión Financiera SaaS**

</div>

---

## Stack

| Tecnología | Uso |
|---|---|
| Node.js + TypeScript | Runtime y tipado estático |
| Express.js | Framework HTTP |
| Supabase (PostgreSQL) | Base de datos + Auth |
| JWT | Access tokens (15m) + Refresh tokens (7d) |
| bcrypt | Hash de contraseñas |
| nodemailer | Envío de emails |
| otplib | TOTP para 2FA |

---

## Estructura del Proyecto

```
src/
├── config/
│   └── supabase.ts                  # Cliente Supabase Admin
├── controllers/
│   ├── authController.ts            # Login, signup, logout
│   ├── authAdvancedController.ts    # 2FA, sessions, reset password
│   ├── productosController.ts       # CRUD + inventario avanzado
│   ├── categoriasController.ts      # Gestión de categorías
│   └── ventasController.ts          # POS y ventas
├── middleware/
│   └── auth.ts                      # JWT middleware + RBAC
├── routes/
│   ├── auth.ts                      # /api/auth
│   ├── authAdvanced.ts              # /api/auth (2FA, sessions)
│   ├── products.ts                  # /api/productos
│   ├── categorias.ts                # /api/categorias
│   └── sales.ts                     # /api/ventas
├── services/
│   ├── jwtService.ts                # Generación y verificación JWT
│   ├── emailService.ts              # Templates y envío de email
│   ├── totpService.ts               # TOTP 2FA
│   └── supabaseService.ts           # Helpers Supabase
└── types/
    └── index.ts                     # Tipos globales TypeScript
```

---

## API Endpoints

### Auth — `/api/auth`

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/signup` | Registro de nuevo usuario |
| POST | `/login` | Login con email + password |
| POST | `/logout` | Cerrar sesión |
| POST | `/refresh` | Renovar access token |
| POST | `/forgot-password` | Enviar email de reset |
| POST | `/reset-password` | Cambiar contraseña con token |
| POST | `/2fa/enable` | Activar autenticación 2FA |
| POST | `/2fa/verify` | Verificar código TOTP |
| GET  | `/sessions` | Listar sesiones activas |
| DELETE | `/sessions/:id` | Revocar sesión |

### Productos — `/api/productos`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Listar productos activos |
| GET | `/avanzado/buscar` | Búsqueda con filtros avanzados |
| GET | `/reporte/inventario` | Reporte JSON o CSV |
| GET | `/codigo/:codigo` | Buscar por código de barras |
| GET | `/:id` | Obtener producto por ID |
| POST | `/` | Crear producto |
| PUT | `/:id` | Actualizar producto |
| DELETE | `/:id` | Eliminar (soft delete) |
| PATCH | `/:id/stock` | Ajustar stock tienda/almacén |
| PATCH | `/:id/discontinuar` | Marcar como discontinuado |
| GET | `/:id/historial` | Historial de movimientos de stock |
| GET | `/:id/auditoria` | Auditoría de cambios |

### Categorías — `/api/categorias`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/` | Todos | Listar categorías activas |
| POST | `/` | ADMIN | Crear categoría |
| PUT | `/:id` | ADMIN | Actualizar categoría |
| DELETE | `/:id` | ADMIN | Desactivar categoría |

### Ventas — `/api/ventas`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Listar ventas |
| POST | `/` | Crear venta |
| GET | `/:id` | Detalle de venta |

---

## Instalación

```bash
# Instalar dependencias
npm install

# Variables de entorno
cp .env.example .env

# Modo desarrollo
npm run dev

# Build producción
npm run build && npm start
```

### Variables de Entorno

```env
PORT=3001
CORS_ORIGIN=http://localhost:5173

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# JWT
JWT_SECRET=tu_secret_aqui
JWT_REFRESH_SECRET=tu_refresh_secret_aqui
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu@email.com
SMTP_PASS=tu_password
```

---

## Roles de Usuario

| Rol | Permisos |
|---|---|
| `ADMIN` | Acceso total — crear/editar categorías, reportes, gestionar usuarios |
| `VENDEDOR` | Crear ventas, ver productos, ajustar stock tienda |
| `ALMACENERO` | Gestionar stock almacén, recibir mercadería |

---

## Sprints Completados

| Sprint | Módulo | Estado |
|---|---|---|
| Sprint 1 | Auth base (login, signup, JWT) | ✅ |
| Sprint 2 | Auth avanzada (2FA, sessions, reset password) | ✅ |
| Sprint 3 | POS básico (productos CRUD, ventas, IGV 18%) | ✅ |
| Sprint 4 | Inventario completo (auditoría, historial, reportes CSV) | ✅ |
| Sprint 5 | Gestión Financiera | 🔜 |

---

<div align="center">
  <sub>Desarrollado por <strong>Luis Felix Rosas</strong> · TARUK Soluciones Tecnológicas · 2026</sub>
</div>
