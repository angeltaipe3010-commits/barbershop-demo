// ----------------------------------------------------------------------------
//  Esquema SQLite del modo demo.
//
//  Es la traducción 1:1 de `supabase/setup/01_tablas.sql` y de los triggers de
//  `02_funciones.sql`. Las diferencias son solo de dialecto:
//
//    uuid        → text            (el id lo genera la app o `UUID_SQL`)
//    timestamptz → text ISO-8601
//    date        → text 'YYYY-MM-DD'
//    numeric     → real
//    boolean     → integer 0/1     (se convierte al leer, ver motor.js)
//    int[]       → text JSON       (idem)
//    enum        → text + check    (SQLite no tiene tipos enumerados)
//
//  Lo que NO se traduce son las políticas RLS: en el navegador no hay servidor
//  en quien confiar, así que el filtrado por rol se emula en consulta.js. Es
//  suficiente para una demo, pero no es seguridad real — ver README.
// ----------------------------------------------------------------------------

// Generador de UUID v4 en SQL puro, para los triggers que insertan filas.
export const UUID_SQL = `(
  lower(hex(randomblob(4))) || '-' ||
  lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', abs(random()) % 4 + 1, 1) ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  lower(hex(randomblob(6)))
)`

// Marca de tiempo ISO con milisegundos, igual que `now()` serializado por PostgREST.
const AHORA_SQL = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`

export const ESQUEMA = `
pragma foreign_keys = on;

-- ---- Credenciales del modo demo -------------------------------------------
-- Sustituye a auth.users. Las contraseñas van en claro a propósito: son de
-- juguete, viven solo en el navegador de quien mira el portafolio y no
-- protegen nada. Nunca reutilices este patrón con datos reales.
create table if not exists demo_credenciales (
  id       text primary key,
  username text unique not null,
  password text not null
);

-- ---- Perfil del staff ------------------------------------------------------
create table if not exists usuarios_barberos (
  id                  text primary key,
  username            text unique,
  nombre              text not null,
  telefono            text,
  rol                 text not null default 'barbero' check (rol in ('admin','barbero')),
  porcentaje_comision real not null default 40
                      check (porcentaje_comision >= 0 and porcentaje_comision <= 100),
  foto_url            text,
  activo              integer not null default 1,
  dias_laborables     text not null default '[1,2,3,4,5,6]',
  hora_inicio         text not null default '09:00',
  hora_fin            text not null default '21:00',
  created_at          text not null default ${AHORA_SQL}
);

-- ---- Clientes --------------------------------------------------------------
create table if not exists clientes (
  id           text primary key,
  nombre       text not null,
  telefono     text,
  email        text,
  preferencias text,
  notas        text,
  created_at   text not null default ${AHORA_SQL}
);

-- ---- Catálogo de servicios -------------------------------------------------
create table if not exists servicios (
  id           text primary key,
  nombre       text not null,
  descripcion  text,
  categoria    text,
  precio       real not null check (precio >= 0),
  duracion_min integer not null default 30 check (duracion_min > 0),
  activo       integer not null default 1,
  created_at   text not null default ${AHORA_SQL}
);

-- ---- Inventario ------------------------------------------------------------
create table if not exists productos_inventario (
  id           text primary key,
  nombre       text not null,
  descripcion  text,
  tipo         text not null default 'venta' check (tipo in ('interno','venta')),
  stock        integer not null default 0 check (stock >= 0),
  stock_minimo integer not null default 5 check (stock_minimo >= 0),
  precio_venta real not null default 0 check (precio_venta >= 0),
  foto_url     text,
  created_at   text not null default ${AHORA_SQL}
);

create view if not exists productos_stock_bajo as
  select * from productos_inventario where stock <= stock_minimo;

-- ---- Agenda ----------------------------------------------------------------
create table if not exists citas (
  id          text primary key,
  cliente_id  text references clientes(id) on delete set null,
  barbero_id  text not null references usuarios_barberos(id) on delete cascade,
  servicio_id text references servicios(id) on delete set null,
  fecha_hora  text not null,
  estado      text not null default 'pendiente'
              check (estado in ('pendiente','confirmada','en_proceso','completada','cancelada')),
  turno       text not null default 'manana' check (turno in ('manana','tarde_noche')),
  notas       text,
  created_at  text not null default ${AHORA_SQL}
);

create index if not exists idx_citas_barbero_fecha on citas (barbero_id, fecha_hora);
create index if not exists idx_citas_estado        on citas (estado);

-- ---- Configuración del negocio (fila única) --------------------------------
create table if not exists configuracion (
  id               integer primary key check (id = 1),
  nombre_negocio   text not null default 'El Negrote Barber Shop',
  direccion        text,
  telefono         text,
  hora_corte_turno integer not null default 14 check (hora_corte_turno between 0 and 23),
  logo_url         text,
  updated_at       text not null default ${AHORA_SQL}
);

insert or ignore into configuracion (id) values (1);

-- ---- Sesiones de caja ------------------------------------------------------
create table if not exists caja_sesiones (
  id                  text primary key,
  fecha               text not null default (date('now')),
  abierta_por         text references usuarios_barberos(id),
  cerrada_por         text references usuarios_barberos(id),
  monto_inicial       real not null default 0 check (monto_inicial >= 0),
  monto_final_contado real,
  efectivo_esperado   real,
  diferencia          real,
  estado              text not null default 'abierta' check (estado in ('abierta','cerrada')),
  notas               text,
  abierta_at          text not null default ${AHORA_SQL},
  cerrada_at          text
);

-- Índice parcial: replica "solo puede haber UNA caja abierta a la vez".
create unique index if not exists idx_una_caja_abierta
  on caja_sesiones (estado) where estado = 'abierta';

-- ---- Movimientos de inventario --------------------------------------------
create table if not exists movimientos_inventario (
  id          text primary key,
  producto_id text not null references productos_inventario(id) on delete cascade,
  tipo        text not null check (tipo in ('entrada','salida')),
  cantidad    integer not null check (cantidad > 0),
  motivo      text,
  barbero_id  text references usuarios_barberos(id) on delete set null,
  created_at  text not null default ${AHORA_SQL}
);

-- ---- Ventas (una fila por línea; se agrupan por ticket_id) -----------------
create table if not exists ventas (
  id             text primary key,
  ticket_id      text,
  cita_id        text references citas(id) on delete set null,
  barbero_id     text not null references usuarios_barberos(id) on delete cascade,
  cliente_id     text references clientes(id) on delete set null,
  servicio_id    text references servicios(id) on delete set null,
  producto_id    text references productos_inventario(id) on delete set null,
  tipo           text not null default 'servicio' check (tipo in ('servicio','producto')),
  cantidad       integer not null default 1 check (cantidad > 0),
  monto          real not null check (monto >= 0),
  comision_monto real not null default 0,
  propina        real not null default 0 check (propina >= 0),
  descuento      real not null default 0 check (descuento >= 0),
  metodo_pago    text not null default 'efectivo'
                 check (metodo_pago in ('efectivo','yape','plin','tarjeta','transferencia')),
  turno          text not null default 'manana' check (turno in ('manana','tarde_noche')),
  fecha          text not null default (date('now')),
  caja_sesion_id text references caja_sesiones(id),
  created_at     text not null default ${AHORA_SQL}
);

create index if not exists idx_ventas_barbero_fecha on ventas (barbero_id, fecha);
create index if not exists idx_ventas_ticket        on ventas (ticket_id);

-- ---- Gastos ----------------------------------------------------------------
create table if not exists gastos (
  id             text primary key,
  descripcion    text not null,
  categoria      text,
  monto          real not null check (monto >= 0),
  metodo_pago    text not null default 'efectivo'
                 check (metodo_pago in ('efectivo','yape','plin','tarjeta','transferencia')),
  fecha          text not null default (date('now')),
  caja_sesion_id text references caja_sesiones(id),
  registrado_por text references usuarios_barberos(id),
  created_at     text not null default ${AHORA_SQL}
);

-- ---- Pagos de comisión (liquidación) ---------------------------------------
create table if not exists pagos_comision (
  id             text primary key,
  barbero_id     text not null references usuarios_barberos(id) on delete cascade,
  monto          real not null check (monto > 0),
  notas          text,
  fecha          text not null default (date('now')),
  registrado_por text references usuarios_barberos(id),
  created_at     text not null default ${AHORA_SQL}
);

-- ---- Trigger: comisión automática al completar una cita --------------------
-- Igual que fn_registrar_venta_al_completar: solo genera la venta si la cita no
-- pasó antes por el cobro del POS.
create trigger if not exists trg_cita_completada
after update on citas
when new.estado = 'completada'
 and (old.estado is null or old.estado <> 'completada')
 and not exists (select 1 from ventas where cita_id = new.id)
begin
  insert into ventas (
    id, cita_id, barbero_id, cliente_id, servicio_id,
    monto, comision_monto, turno, fecha, tipo
  ) values (
    ${UUID_SQL},
    new.id, new.barbero_id, new.cliente_id, new.servicio_id,
    coalesce((select precio from servicios where id = new.servicio_id), 0),
    round(
      coalesce((select precio from servicios where id = new.servicio_id), 0) *
      coalesce((select porcentaje_comision from usuarios_barberos where id = new.barbero_id), 0) / 100,
      2
    ),
    new.turno,
    -- La hora ya viene en local: basta con quedarse con la parte de fecha.
    substr(new.fecha_hora, 1, 10),
    'servicio'
  );
end;

-- ---- Trigger: ajuste de stock ----------------------------------------------
create trigger if not exists trg_movimiento_stock
after insert on movimientos_inventario
begin
  update productos_inventario
     set stock = case
                   when new.tipo = 'entrada' then stock + new.cantidad
                   else max(stock - new.cantidad, 0)
                 end
   where id = new.producto_id;
end;
`

// ---- Metadatos que el motor necesita para convertir tipos -------------------

// Columnas que en Postgres son boolean y aquí viven como 0/1.
export const COLUMNAS_BOOLEANAS = {
  usuarios_barberos: ['activo'],
  servicios: ['activo'],
}

// Columnas que en Postgres son array/jsonb y aquí viven como texto JSON.
export const COLUMNAS_JSON = {
  usuarios_barberos: ['dias_laborables'],
}

// Tablas cuyo `id` es un uuid generado por la app (configuracion usa el fijo 1).
export const TABLAS_CON_UUID = [
  'usuarios_barberos',
  'clientes',
  'servicios',
  'productos_inventario',
  'citas',
  'caja_sesiones',
  'movimientos_inventario',
  'ventas',
  'gastos',
  'pagos_comision',
]

// Vistas: son de solo lectura y no tienen columna `id` propia que rellenar.
export const VISTAS = ['productos_stock_bajo']
