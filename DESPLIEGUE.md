# 🚀 Guía de despliegue

Hay dos despliegues posibles y no se parecen en esfuerzo:

- **[Demo para portafolio](#-demo-para-portafolio-2-minutos)** — 2 minutos, sin
  base de datos ni cuentas.
- **[Instalación real para una barbería](#-instalación-real-para-una-barbería)**
  — 20–30 minutos, con su propio Supabase.

---

## ⚡ Demo para portafolio (2 minutos)

La app trae una base **SQLite que corre dentro del navegador**, así que un
despliegue de demostración no necesita servidor, cuenta de Supabase ni variables
de entorno.

1. Sube el repo a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New… → Project** → importa el
   repo. Vercel detecta Vite solo.
3. **Deploy**. No añadas ninguna variable de entorno.

Listo. Quien entre verá el login con dos botones de acceso directo
(Administrador y Barbero) y la barbería ya funcionando con dos meses de
historial. Los datos viven en el navegador de cada visitante: puede crear
clientes, cobrar, abrir caja y anular tickets sin afectar a nadie más.

> Si prefieres dejarlo explícito en vez de depender del comportamiento por
> defecto, añade la variable `VITE_DEMO` con valor `true`.

Para pasar ese mismo despliegue a producción más adelante no hay que tocar
código: se añaden `VITE_DEMO=false`, `VITE_SUPABASE_URL` y
`VITE_SUPABASE_ANON_KEY`, y se vuelve a desplegar.

---

## 🏪 Instalación real para una barbería

Esta parte explica cómo montar el CRM para **una barbería nueva**. Cada barbería
tiene su **propio proyecto Supabase + su propio deploy**, así sus datos nunca se
mezclan con los de otra.

> Tiempo estimado por barbería: **20–30 minutos**.

---

## Resumen de lo que harás
1. Crear un proyecto Supabase nuevo.
2. Cargar el esquema de base de datos (`schema.sql`).
3. Desplegar la Edge Function (alta/baja de barberos).
4. Crear el primer usuario administrador.
5. Desplegar el frontend en Vercel con las credenciales de esa barbería.
6. Configurar el negocio (nombre, logo) desde la app.

---

## 1. Crear el proyecto Supabase
1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Nombre: ej. `barberia-elnegrote`. Región: **South America (São Paulo)** (la más cercana a Perú).
3. Guarda la contraseña de la base de datos.
4. El plan **Free** alcanza para empezar (500 MB, suficiente para una barbería pequeña por bastante tiempo).

## 2. Cargar el esquema
En **SQL Editor** → **New query**, ejecuta en este orden:

1. [`supabase/schema.sql`](supabase/schema.sql) — tablas base, triggers
   (comisión, stock, alta de perfil), RLS y la RPC de cobro.
2. **Todas** las `supabase/migration_*.sql`. Añaden lo que el esquema base no
   trae: punto de venta, caja diaria, gastos, configuración del negocio,
   liquidación de comisiones, disponibilidad del barbero, storage de fotos y
   el hardening de seguridad.

   Orden recomendado (son idempotentes, pero este orden evita dependencias):

   ```
   migration_pos.sql
   migration_username.sql
   migration_admin.sql
   migration_liquidacion.sql
   migration_caja_disponibilidad.sql
   migration_cobro_rpc.sql
   migration_peru.sql
   migration_hardening.sql
   migration_fix_trigger.sql
   migration_datos.sql
   ```

> Sin las migraciones la app arranca pero fallan Caja, Gastos, Configuración y
> Liquidación: esas tablas no existen todavía.

## 3. Desplegar la Edge Function
Necesaria para crear/eliminar/resetear barberos (usa la clave de servicio del lado servidor).

```bash
# Una sola vez en tu PC:
npm install -g supabase   # o usa: npx supabase ...

supabase login            # token de tu cuenta (sbp_...)
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy admin-barberos
```
> `TU_PROJECT_REF` está en Project Settings → General → Reference ID.

## 4. Crear el primer administrador
Como aún no hay nadie, créalo desde el panel:
1. **Authentication → Users → Add user**.
2. Email: `admin@<loquesea>.com` (correo interno, no se usa para entrar).
   - Marca **Auto Confirm User**.
3. En **User Metadata** pon:
   ```json
   { "username": "admin", "nombre": "Administrador", "rol": "admin" }
   ```
4. El trigger crea su perfil automáticamente.
5. A partir de ahí, el admin crea a los barberos **desde la app** (sección Barberos).

> **Importante:** activa el dominio interno. En la app, el login arma el correo
> como `usuario@DOMINIO`. Define ese dominio en el `.env` con
> `VITE_AUTH_EMAIL_DOMAIN` (ej. `elnegrote.com`) y úsalo igual en el email del paso 2.

## 5. Desplegar el frontend en Vercel
1. Sube el código a un repositorio (GitHub) o usa el mismo repo para todas.
2. En [vercel.com](https://vercel.com) → **Import Project** → framework **Vite**.
3. En **Environment Variables** pon las de ESTA barbería:
   ```
   VITE_DEMO=false
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...   (Project Settings → API)
   VITE_AUTH_EMAIL_DOMAIN=elnegrote.com
   VITE_LOCALE=es-PE
   VITE_CURRENCY=PEN
   ```
   > `VITE_DEMO=false` es importante: sin él, un despliegue al que le falten las
   > credenciales arrancaría con la base de demostración en vez de avisar del
   > fallo de configuración.
4. Deploy. Te da una URL (ej. `barberia-elnegrote.vercel.app`).
   - Opcional: conéctale un subdominio propio (`negrote.tudominio.com`).

> Para cada barbería nueva: mismo repo, **otro proyecto en Vercel** con **otras
> variables de entorno** (las de su Supabase).

## 6. Configurar el negocio
1. Entra a la app con `admin` / (la contraseña que pusiste).
2. **Configuración** → nombre del negocio, logo, dirección, hora de corte de turno.
3. (Opcional) **Configuración → Datos → Cargar demo** para enseñarle al cliente
   cómo se ve el sistema con movimiento real, y luego **Limpiar todos los
   datos** antes de entregar.
4. Carga el catálogo real: **Servicios**, **Inventario** y los **Barberos**.

> Para una demo comercial completa —con usuarios ya creados y 3 meses de
> historial— usa [`supabase/seed_demo.sql`](supabase/seed_demo.sql) en vez de
> los pasos 4 y 6. **No lo ejecutes en la instalación que vas a entregar**: sus
> contraseñas son públicas.

---

## ✅ Checklist rápido por barbería
- [ ] Proyecto Supabase creado (región São Paulo)
- [ ] `schema.sql` ejecutado
- [ ] Todas las `migration_*.sql` ejecutadas
- [ ] Edge Function `admin-barberos` desplegada
- [ ] Usuario admin creado (con metadata `rol: admin`)
- [ ] Frontend desplegado en Vercel con SUS variables de entorno
- [ ] Negocio configurado (nombre, logo, dominio de login)
- [ ] Catálogo cargado (servicios, productos, barberos)
- [ ] Datos de ejemplo limpiados antes de entregar

## 💸 Costos de referencia (para tu precio de venta)
- **Supabase Free:** S/ 0 (suficiente para empezar). Si crece: Pro ~US$25/mes.
- **Vercel Hobby:** S/ 0 para uso normal.
- Tu modelo de cobro sugerido: **instalación única + mensualidad de soporte** por local.

## 🔐 Seguridad por instalación
- Cada barbería usa **solo** su `anon key` (publishable) en el frontend.
- La `service_role` y el token `sbp_` **nunca** van al navegador ni al repo.
- Si compartes credenciales por error, **rótalas** en Project Settings → API.
