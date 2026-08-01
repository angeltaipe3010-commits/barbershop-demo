# 💈 El Negrote Barber Shop — CRM Interno

Sistema de gestión integral de la barbería: agenda, clientes, punto de venta,
caja diaria, inventario, gastos y liquidación de comisiones. Uso **estrictamente
interno**, con dos roles (Administrador y Barbero).

---

## 🎭 Dos modos de ejecución

La app funciona igual de dos maneras distintas, y se elige con **una sola
variable de entorno**:

| `VITE_DEMO` | Base de datos                              | Para qué                          |
| ----------- | ------------------------------------------ | --------------------------------- |
| `true`      | **SQLite** (WebAssembly) en el navegador    | Portafolio, pruebas, enseñar la app |
| `false`     | **Supabase** (PostgreSQL + Auth + RLS)      | Producción, una barbería real     |

La frontera entre ambos es un único archivo,
[`src/services/supabase.js`](src/services/supabase.js), que exporta un cliente u
otro. Todo lo demás —`services/api`, los hooks y las vistas— es idéntico y no
sabe cuál está usando.

**El modo demo no necesita nada**: ni cuenta, ni servidor, ni credenciales. Al
abrir la app por primera vez crea la base, la siembra con dos meses de
operación y deja cuatro usuarios listos:

| Usuario | Contraseña | Rol           |
| ------- | ---------- | ------------- |
| `admin` | `demo1234` | Administrador |
| `juan`  | `demo1234` | Barbero       |
| `marco` | `demo1234` | Barbero       |
| `kevin` | `demo1234` | Barbero       |

Los datos se guardan en IndexedDB, así que sobreviven a la recarga y se borran
limpiando los datos del sitio.

> ⚠️ El modo demo **no es seguro y no pretende serlo**: las contraseñas están en
> claro y el filtrado por rol es cosmético, porque el navegador tiene la base
> entera. Es un escaparate, no un sistema multiusuario. La seguridad real la dan
> las políticas RLS de PostgreSQL, que solo existen en el modo Supabase.

---

## 🧱 Stack

| Capa       | Tecnología                                        |
| ---------- | ------------------------------------------------- |
| Frontend   | React 18 + Vite 5                                 |
| Estilos    | Tailwind CSS (sistema de diseño propio)           |
| Backend/BD | Supabase (PostgreSQL + Auth + Storage)            |
| Demo       | SQLite vía [sql.js](https://sql.js.org) + IndexedDB |
| Hosting    | Vercel                                            |
| Offline    | PWA (service worker + cola de cobros)             |

---

## 🚀 Puesta en marcha

### 1. Dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env
```

Para la **demo** basta con esto (y es lo que trae `.env.example`):

```
VITE_DEMO=true
```

Para **producción**, pon `VITE_DEMO=false` y rellena con los valores de
**Project Settings → API** de tu proyecto Supabase:

```
VITE_DEMO=false
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

> Si dejas `VITE_DEMO` sin declarar y tampoco hay credenciales, la app arranca
> en demo. Así un despliegue nuevo funciona sin configurar una sola variable.
> Con `VITE_DEMO=false` y credenciales ausentes, en cambio, lo dice a la cara:
> muestra una pantalla explicando qué falta en vez de disimularlo con datos de
> mentira.

### 3. Base de datos *(solo en modo Supabase)*

En el **SQL Editor** de Supabase, en este orden:

1. [`supabase/schema.sql`](supabase/schema.sql) — tablas, triggers y RLS.
2. Todas las [`supabase/migration_*.sql`](supabase/) — POS, caja, gastos,
   liquidación, hardening y localización.
3. *(Opcional, recomendado para la demo)*
   [`supabase/seed_demo.sql`](supabase/seed_demo.sql) — ver **Datos de
   demostración**.

En modo demo este paso no existe: el esquema equivalente se crea solo desde
[`src/services/demo/esquema.js`](src/services/demo/esquema.js).

### 4. Desarrollo

```bash
npm run dev      # servidor local en :5173
npm run lint     # ESLint
npm run check    # lint + build (lo que conviene correr antes de desplegar)
```

### 5. Producción

```bash
npm run build    # genera dist/
npm run preview  # sirve dist/ localmente para comprobarlo
```

En Vercel: importa el repo (framework **Vite**). [`vercel.json`](vercel.json) ya
trae el rewrite de SPA, las cabeceras de seguridad y la política de caché.

- **Demo**: no hace falta configurar nada. Si quieres dejarlo explícito, añade
  `VITE_DEMO=true`.
- **Producción**: añade `VITE_DEMO=false`, `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_ANON_KEY`.

---

## 🧪 Cómo funciona el modo demo

No hay servidor: hay un **cliente falso** que imita la superficie de
`supabase-js` y la resuelve contra SQLite compilado a WebAssembly.

| Archivo                                                                | Qué hace                                                                     |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`esquema.js`](src/services/demo/esquema.js)                           | Las 11 tablas, la vista y los 2 triggers, traducidos de `supabase/setup/` a SQLite |
| [`almacen.js`](src/services/demo/almacen.js)                           | Arranca sql.js y vuelca la base a IndexedDB                                  |
| [`consulta.js`](src/services/demo/consulta.js)                         | Traduce la cadena de PostgREST (`.select().eq().order()`) a SQL              |
| [`relaciones.js`](src/services/demo/relaciones.js)                     | Resuelve los embeds `cliente:clientes(nombre)`, incluidas las pistas `!fkey` |
| [`rpc.js`](src/services/demo/rpc.js)                                   | `registrar_cobro` (atómica e idempotente) y `liquidacion_barberos`           |
| [`auth.js`](src/services/demo/auth.js)                                 | Sesión, login y alta/baja de cuentas                                         |
| [`semilla.js`](src/services/demo/semilla.js)                           | Los dos meses de operación que ves al entrar                                 |
| [`cliente.js`](src/services/demo/cliente.js)                           | Ensambla todo con la forma de un cliente de Supabase                         |

Lo que **sí** se comporta como en producción: los triggers de stock y de
comisión al completar una cita, la atomicidad del cobro, la idempotencia por
ticket y el reparto de propina/descuento en la primera línea.

Lo que **no**: RLS de verdad, hash de contraseñas, y el `.wasm` de 660 KB que
hay que descargar la primera vez (queda precacheado por el service worker).

---

## 🎬 Datos de demostración

[`supabase/seed_demo.sql`](supabase/seed_demo.sql) deja la base lista para
enseñar el sistema funcionando: usuarios con los que entrar, catálogo,
24 clientes y **~3 meses de operación simulada** (ventas por ticket con
propinas y métodos de pago mezclados, cajas cuadradas y descuadradas, gastos
fijos y variables, comisiones liquidadas y agenda de hoy y mañana).

Usuarios que crea:

| Usuario  | Contraseña | Rol            |
| -------- | ---------- | -------------- |
| `admin`  | `demo1234` | Administrador  |
| `carlos` | `demo1234` | Barbero (45 %) |
| `miguel` | `demo1234` | Barbero (40 %) |
| `diego`  | `demo1234` | Barbero (38 %) |

> ⚠️ **Borra todos los datos operativos existentes** y sus contraseñas son
> públicas. Es para demostrar, no para operar. Antes de usarlo de verdad:
> elimina esos usuarios, crea los reales desde **Barberos** y vacía los datos
> desde **Configuración → Datos → Limpiar todos los datos**.

También hay un sembrador equivalente dentro de la app
(**Configuración → Datos → Cargar demo**), útil cuando ya tienes barberos
creados y solo quieres poblar la operación.

---

## 👥 Roles

| Sección                                         | Administrador               | Barbero                     |
| ----------------------------------------------- | --------------------------- | --------------------------- |
| Inicio                                          | Reporte del día del negocio | Su jornada y sus comisiones |
| Agenda                                          | Todas las citas             | Solo las suyas              |
| Clientes                                        | ✅ CRUD                     | ✅ CRUD                     |
| Ventas                                          | Todas + anular              | Solo las suyas              |
| Mis comisiones                                  | —                           | ✅                          |
| Servicios                                       | ✅                          | ❌                          |
| Inventario                                      | ✅                          | ❌ (solo registra salidas)  |
| Caja / Gastos / Bóveda / Liquidación / Reportes | ✅                          | ❌                          |
| Barberos / Configuración                        | ✅                          | ❌                          |

> El frontend solo **oculta** lo que no corresponde: la seguridad real la
> aplica **Row Level Security (RLS)** en Supabase. Aunque alguien fuerce una
> URL, la base rechaza lo que no le toca.

---

## 📂 Estructura

Organizada por **funcionalidad**, no por tipo de archivo: todo lo que toca la
agenda vive junto, y lo compartido está explícitamente en `shared/`.

```
src/
├── app/                  # Arranque: router, navegación, pantallas de estado
│   ├── App.jsx           #   rutas (cada sección se carga bajo demanda)
│   ├── navegacion.jsx    #   fuente ÚNICA del menú y los permisos por rol
│   ├── ErrorBoundary.jsx #   red de seguridad ante errores de render
│   └── Pantalla*.jsx     #   carga, configuración faltante, 404
│
├── layout/               # Shell autenticado: Sidebar, Topbar, Layout
│
├── features/             # Una carpeta por área de negocio
│   ├── auth/             #   sesión, login, protección de rutas
│   ├── dashboard/        #   paneles de admin y de barbero
│   ├── agenda/           #   citas
│   ├── clientes/         #   fichas e historial
│   ├── ventas/           #   POS, cobro, tickets, venta rápida
│   ├── comisiones/       #   vista del barbero
│   ├── catalogo/         #   servicios
│   ├── inventario/       #   productos y movimientos de stock
│   ├── caja/             #   apertura, arqueo y cierre
│   ├── finanzas/         #   gastos, bóveda, liquidación
│   ├── reportes/
│   ├── staff/            #   barberos
│   └── configuracion/    #   negocio y zona de datos
│
├── shared/
│   ├── ui/               # Librería de componentes (Boton, Modal, Tabla…)
│   ├── marca/            # Logo y acentos del bastón de barbero
│   ├── lib/              # format, periodos, exportar
│   └── hooks/            # utilidades transversales
│
├── services/
│   ├── supabase.js       # cliente
│   ├── offline.js        # cola de cobros sin conexión
│   └── api/              # acceso a datos por dominio
│
├── index.css             # capas base/components/utilities + animaciones
└── main.jsx
```

**Regla de dependencias:** `features/` puede importar de `shared/` y
`services/`; `shared/` nunca importa de `features/`.

El alias `@/` apunta a `src/`, así que no hay cadenas de `../../..`.

---

## 🎨 Sistema de diseño

Todo el lenguaje visual (color, elevación, ritmo, movimiento) vive en
[`tailwind.config.js`](tailwind.config.js) y [`src/index.css`](src/index.css).
Las vistas **no inventan valores**: consumen tokens.

- **Superficie** `ink-*`: neutros ligeramente cálidos, no gris de dashboard.
- **Marca** `marca-*`: escala completa del rojo del isotipo.
- **Semánticos**: `exito`, `aviso`, `peligro`, `info` — el color significa algo.
- **Movimiento**: curvas nombradas por intención (`salida`, `rebote`) y
  utilidades de aparición (`animate-aparecer`, `.escalonar`, `<Aparecer>`).

La animación es **sutil y funcional**: el contenido entra de abajo hacia
arriba, las listas se escalonan, los indicadores se deslizan en vez de
parpadear, las barras crecen desde su origen y los contadores aterrizan en su
cifra. Todo respeta `prefers-reduced-motion`: con esa preferencia activa el
contenido aparece igual, pero sin desplazamiento.

---

## ⚙️ Lógica automática (en la base de datos)

- **Comisión automática:** al pasar una cita a `completada`, un trigger crea la
  venta y calcula la comisión con el `%` del barbero — salvo que el cobro ya la
  hubiera registrado.
- **Cobro atómico:** `registrar_cobro()` guarda todo el ticket en una sola
  transacción y es **idempotente por `ticket_id`**, así que reintentar (o
  sincronizar un cobro offline) nunca duplica una venta.
- **Inventario:** cada movimiento (`entrada`/`salida`) ajusta el stock.
- **Alta de perfil:** al registrar un usuario en Auth se crea su fila de staff.

---

## 📶 Modo sin conexión

La app es una PWA: se instala en el móvil y abre sin internet. Si se cobra
estando sin red, el ticket se guarda en el dispositivo, la barra superior lo
indica, y se sincroniza solo al reconectar. Como la RPC es idempotente, no hay
riesgo de cobrar dos veces.

---

## 👤 Gestión de barberos (alta y baja)

Crear y eliminar usuarios necesita la `service_role` key, que **nunca** debe
llegar al navegador. Por eso vive en una **Edge Function**
([`supabase/functions/admin-barberos`](supabase/functions/admin-barberos/index.ts)):
el frontend la invoca con el JWT del admin, la función valida que sea admin y
recién ahí usa la clave de servicio.

Desplegarla (una sola vez):

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy admin-barberos
```

> Editar el perfil, cambiar el % y activar/desactivar funcionan sin la función
> (vía RLS de admin). Solo **alta, baja y reseteo de contraseña** dependen de
> ella. Si no está desplegada, la app lo dice con el comando exacto a ejecutar.

---

## 🔐 Seguridad

- El rol vive en los metadatos de Supabase Auth (viaja firmado en el JWT) y se
  refleja en `usuarios_barberos`.
- Las funciones `mi_rol()` / `es_admin()` alimentan las políticas RLS.
- El barbero solo lee/escribe **sus** citas y ventas; nunca finanzas globales,
  catálogo ni entradas de inventario.
- Las funciones `SECURITY DEFINER` fijan `search_path`
  (`migration_hardening.sql`).
- `vercel.json` añade HSTS, `X-Frame-Options: DENY`, `nosniff` y
  `Referrer-Policy`.

---

## 🛠️ Nota: Rollup en Windows con Application Control

Si el equipo bloquea binarios nativos (`.node`), Vite/Rollup falla al arrancar
con `ERR_DLOPEN_FAILED`. El proyecto lo resuelve solo:
[`scripts/ensure-rollup.cjs`](scripts/ensure-rollup.cjs) corre en `postinstall`,
detecta el bloqueo y solo entonces redirige Rollup a su build WASM. En Vercel y
Linux no modifica nada.
