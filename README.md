# RUCASH Backend — Supabase Edge Functions

<div align="center">

![Deno](https://img.shields.io/badge/Deno-1.x-000000?style=for-the-badge&logo=deno&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Edge_Functions-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

**Backend serverless para RUCASH — Sistema POS + Gestión Financiera SaaS**

</div>

---

## Arquitectura

El backend fue migrado de **Express.js (Node.js)** a **Supabase Edge Functions (Deno)** para aprovechar:

- Despliegue serverless sin servidores que administrar
- Ejecución en el edge, más cerca del usuario
- Integración nativa con Supabase PostgreSQL y RLS
- Escalado automático

**Proyecto Supabase**: `kvbbcanhyjekjygwyaog`

---

## Estructura

```
supabase/
  config.toml
  functions/
    _shared/
      cors.ts          # Headers CORS y handler OPTIONS
      supabase.ts      # Cliente Supabase Admin (bypass RLS)
      jwt.ts           # sign/verify JWT con jsonwebtoken
      bcrypt.ts        # hash/compare passwords con bcryptjs
      response.ts      # helpers ok(), err(), notFound()
      auth.ts          # verifyAuth() — extrae usuario del Bearer token
    auth/
      index.ts         # signup, login, me, logout, refresh-token
    productos/
      index.ts         # CRUD productos + búsqueda avanzada
    ventas/
      index.ts         # Crear ventas, listar, anular
    categorias/
      index.ts         # CRUD categorías
    deudas/
      index.ts         # CRUD deudas + registrar pagos
    flujo-caja/
      index.ts         # Registros de flujo de caja + análisis
    metas/
      index.ts         # CRUD metas + movimientos de progreso
    dashboard/
      index.ts         # KPIs, widgets del usuario
    equipo/
      index.ts         # Gestión de miembros + invitaciones
    reportes/
      index.ts         # Reportes guardados + plantillas
    proveedores/
      index.ts         # CRUD proveedores
    config/
      index.ts         # Config empresa y sistema
    suscripciones/
      index.ts         # Gestión de suscripciones + cron vencimientos
    finanzas/
      index.ts         # Cuentas bancarias + transacciones
```

---

## Endpoints

Todos los endpoints están en: `https://kvbbcanhyjekjygwyaog.supabase.co/functions/v1/`

### Auth — `/auth`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/signup` | No | Registro de nuevo usuario + cliente |
| POST | `/auth/login` | No | Login con email + password |
| GET | `/auth/me` | Si | Datos del usuario actual |
| POST | `/auth/logout` | Si | Logout (audit log) |
| POST | `/auth/refresh-token` | No | Renovar access token |

### Productos — `/productos`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/productos` | Listar activos (filtros: search, categoria) |
| GET | `/productos/buscar` | Búsqueda avanzada con múltiples filtros |
| GET | `/productos/:id` | Obtener por ID |
| POST | `/productos` | Crear |
| PATCH | `/productos/:id` | Actualizar (con auditoría) |
| DELETE | `/productos/:id` | Soft delete (activo=false) |

### Ventas — `/ventas`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/ventas` | Listar (filtros: fecha_inicio, fecha_fin) |
| GET | `/ventas/:id` | Obtener con detalles |
| POST | `/ventas` | Crear venta + decrementar stock via RPC |
| PATCH | `/ventas/:id/anular` | Anular venta |

### Categorías — `/categorias`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/categorias` | Listar activas |
| POST | `/categorias` | Crear |
| PATCH | `/categorias/:id` | Actualizar |
| DELETE | `/categorias/:id` | Soft delete |

### Deudas — `/deudas`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/deudas` | Listar (filtro: estado) |
| GET | `/deudas/:id` | Obtener con pagos |
| POST | `/deudas` | Crear |
| PATCH | `/deudas/:id` | Actualizar |
| POST | `/deudas/:id/pagar` | Registrar pago |

### Flujo de Caja — `/flujo-caja`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/flujo-caja` | Listar (filtros: fecha_inicio, fecha_fin) |
| POST | `/flujo-caja` | Crear registro |
| GET | `/flujo-caja/analisis` | Análisis resumen del mes actual |

### Metas — `/metas`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/metas` | Listar activas (filtros: tipo, categoria, estado) |
| GET | `/metas/:id` | Obtener por ID |
| POST | `/metas` | Crear |
| PATCH | `/metas/:id` | Actualizar |
| POST | `/metas/:id/movimiento` | Registrar progreso |
| DELETE | `/metas/:id` | Marcar como cancelada |

### Dashboard — `/dashboard`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/dashboard/resumen` | KPIs del día (ventas, metas, equipo, deudas) |
| GET | `/dashboard/widgets` | Widgets del usuario actual |
| POST | `/dashboard/widgets` | Crear widget |
| PATCH | `/dashboard/widgets/:id` | Actualizar widget |
| DELETE | `/dashboard/widgets/:id` | Ocultar widget |

### Equipo — `/equipo`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/equipo` | Listar miembros del cliente |
| GET | `/equipo/:id` | Obtener miembro |
| PATCH | `/equipo/:id` | Actualizar datos |
| PATCH | `/equipo/:id/estado` | Cambiar estado ACTIVO/INACTIVO |
| POST | `/equipo/invitar` | Crear invitación |

### Reportes — `/reportes`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/reportes` | Listar reportes guardados |
| GET | `/reportes/plantillas` | Listar plantillas |
| GET | `/reportes/:id` | Obtener reporte |
| POST | `/reportes` | Crear reporte |
| PATCH | `/reportes/:id` | Actualizar reporte |
| DELETE | `/reportes/:id` | Eliminar reporte |

### Proveedores — `/proveedores`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/proveedores` | Listar activos |
| GET | `/proveedores/:id` | Obtener por ID |
| POST | `/proveedores` | Crear |
| PATCH | `/proveedores/:id` | Actualizar |
| DELETE | `/proveedores/:id` | Soft delete |

### Config — `/config`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/config/empresa` | Usuario | Config empresa del cliente |
| POST | `/config/empresa` | Usuario | Crear config empresa |
| PATCH | `/config/empresa` | Usuario | Actualizar config empresa |
| GET | `/config/sistema` | Admin | Config global del sistema |
| PATCH | `/config/sistema` | Admin | Actualizar (con audit log) |

### Suscripciones — `/suscripciones`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/suscripciones` | Usuario | Suscripción del cliente actual |
| GET | `/suscripciones/todas` | Admin | Todas las suscripciones |
| POST | `/suscripciones` | Admin | Crear suscripción |
| PATCH | `/suscripciones/:cliente_id` | Admin | Actualizar |
| POST | `/suscripciones/verificar-vencimientos` | Admin | Cron job vencimientos |

### Finanzas — `/finanzas`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/finanzas/cuentas` | Listar cuentas activas |
| POST | `/finanzas/cuentas` | Crear cuenta |
| PATCH | `/finanzas/cuentas/:id` | Actualizar cuenta |
| GET | `/finanzas/cuentas/:id/transacciones` | Listar transacciones |
| POST | `/finanzas/cuentas/:id/transacciones` | Crear transacción |

---

## Deploy

### Requisitos previos

```bash
npm install -g supabase
supabase login
```

### Configurar secrets

```bash
supabase secrets set --project-ref kvbbcanhyjekjygwyaog \
  JWT_SECRET=a3f8c9e2d1b5f7a4c6e8d2f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7 \
  REFRESH_SECRET=f7e5d3c1b9a7f5e3d1c9b7a5f3e1d9c7b5a3f1e9d7c5b3a1f9e7d5c3b1a9f
```

### Deployar todas las funciones

```bash
supabase functions deploy --project-ref kvbbcanhyjekjygwyaog
```

### Deployar una función individual

```bash
supabase functions deploy auth --project-ref kvbbcanhyjekjygwyaog
supabase functions deploy productos --project-ref kvbbcanhyjekjygwyaog
supabase functions deploy ventas --project-ref kvbbcanhyjekjygwyaog
# etc.
```

---

## Desarrollo local

```bash
# Iniciar stack local de Supabase
supabase start

# Servir funciones localmente (hot reload)
supabase functions serve --env-file .env.local

# El servidor local corre en:
# http://localhost:54321/functions/v1/
```

Archivo `.env.local` para desarrollo:

```env
JWT_SECRET=a3f8c9e2d1b5f7a4c6e8d2f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7
REFRESH_SECRET=f7e5d3c1b9a7f5e3d1c9b7a5f3e1d9c7b5a3f1e9d7c5b3a1f9e7d5c3b1a9f
```

Las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son inyectadas automáticamente por Supabase al ejecutar las funciones.

---

## Variables de entorno

| Variable | Descripción | Disponibilidad |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase | Auto-inyectada |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypass RLS) | Auto-inyectada |
| `JWT_SECRET` | Secret para access tokens | Configurar con `supabase secrets set` |
| `REFRESH_SECRET` | Secret para refresh tokens | Configurar con `supabase secrets set` |

---

## Sprints Completados

| Sprint | Módulo | Estado |
|---|---|---|
| Sprint 1-4 | Auth, POS, Inventario, Dashboard Básico | Migrado |
| Sprint 5 | Proveedores, Config, Suscripciones, Finanzas | Migrado |
| Sprint 8 | Dashboard Dueño + Equipo | Migrado |

---

<div align="center">
  <sub>Desarrollado por <strong>Luis Felix Rosas</strong> · TARUK Soluciones Tecnológicas · 2026</sub>
</div>
