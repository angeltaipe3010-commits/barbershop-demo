-- ============================================================================
--  Hardening de seguridad (hallazgos de auditoría)
--  1) Fijar search_path en funciones SECURITY DEFINER (evita inyección por
--     manipulación de search_path; lo exige el linter de Supabase).
--  2) fn_actualizar_stock pasa a SECURITY DEFINER para que el stock se ajuste
--     siempre, incluso si un barbero registra una salida (RLS no bloquea).
-- ============================================================================

-- Trigger de comisión (al completar cita) — añade search_path
create or replace function public.fn_registrar_venta_al_completar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
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
    values (new.id, new.barbero_id, new.cliente_id, new.servicio_id, v_precio,
            round(v_precio * v_porcentaje / 100, 2), new.turno,
            (new.fecha_hora at time zone 'America/Lima')::date, 'servicio');
  end if;
  return new;
end;
$$;

-- Trigger de stock — SECURITY DEFINER + search_path
create or replace function public.fn_actualizar_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.tipo = 'entrada' then
    update public.productos_inventario set stock = stock + new.cantidad where id = new.producto_id;
  else
    update public.productos_inventario set stock = greatest(stock - new.cantidad, 0) where id = new.producto_id;
  end if;
  return new;
end;
$$;
