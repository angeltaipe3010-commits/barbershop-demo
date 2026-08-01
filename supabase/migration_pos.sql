-- ============================================================================
--  Migración: Punto de venta (POS) / Cobro
--  Extiende `ventas` para soportar método de pago, propina, descuento,
--  productos y agrupación por ticket. Protege el trigger de comisión para
--  que no duplique la venta cuando el cobro ya la registró.
-- ============================================================================

-- 1. Tipos
do $$ begin
  create type metodo_pago as enum ('efectivo','yape','plin','tarjeta','transferencia');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_item_venta as enum ('servicio','producto');
exception when duplicate_object then null; end $$;

-- 2. Nuevas columnas en ventas
alter table public.ventas
  add column if not exists tipo         tipo_item_venta not null default 'servicio',
  add column if not exists cantidad     integer not null default 1 check (cantidad > 0),
  add column if not exists metodo_pago  metodo_pago not null default 'efectivo',
  add column if not exists propina      numeric(10,2) not null default 0 check (propina >= 0),
  add column if not exists descuento    numeric(10,2) not null default 0 check (descuento >= 0),
  add column if not exists ticket_id    uuid;

create index if not exists idx_ventas_ticket on public.ventas (ticket_id);

-- 3. Trigger de comisión: solo auto-crea la venta si NO existe ya una para esa
--    cita (es decir, si se completó sin pasar por el cobro/POS).
create or replace function public.fn_registrar_venta_al_completar()
returns trigger
language plpgsql
security definer
as $$
declare
  v_precio       numeric(10,2);
  v_porcentaje   numeric(5,2);
begin
  if new.estado = 'completada'
     and old.estado is distinct from 'completada'
     and not exists (select 1 from public.ventas where cita_id = new.id) then

    select precio into v_precio from public.servicios where id = new.servicio_id;
    select porcentaje_comision into v_porcentaje from public.usuarios_barberos where id = new.barbero_id;

    v_precio     := coalesce(v_precio, 0);
    v_porcentaje := coalesce(v_porcentaje, 0);

    insert into public.ventas (cita_id, barbero_id, cliente_id, servicio_id, monto, comision_monto, turno, fecha, tipo)
    values (
      new.id,
      new.barbero_id,
      new.cliente_id,
      new.servicio_id,
      v_precio,
      round(v_precio * v_porcentaje / 100, 2),
      new.turno,
      (new.fecha_hora at time zone 'America/Lima')::date,
      'servicio'
    );
  end if;
  return new;
end;
$$;
