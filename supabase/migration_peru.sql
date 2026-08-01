-- ============================================================================
--  Migración: localización Perú (zona horaria America/Lima).
--  Corrige la fecha con que se registran las ventas/comisiones para que los
--  reportes diarios cuadren con las citas de tarde/noche (Perú = UTC-5).
--  Ejecuta en el SQL Editor si ya tenías el schema desplegado.
-- ============================================================================
create or replace function public.fn_registrar_venta_al_completar()
returns trigger
language plpgsql
security definer
as $$
declare
  v_precio       numeric(10,2);
  v_porcentaje   numeric(5,2);
begin
  if new.estado = 'completada' and old.estado is distinct from 'completada' then
    select precio into v_precio from public.servicios where id = new.servicio_id;
    select porcentaje_comision into v_porcentaje from public.usuarios_barberos where id = new.barbero_id;

    v_precio     := coalesce(v_precio, 0);
    v_porcentaje := coalesce(v_porcentaje, 0);

    insert into public.ventas (cita_id, barbero_id, cliente_id, servicio_id, monto, comision_monto, turno, fecha)
    values (
      new.id,
      new.barbero_id,
      new.cliente_id,
      new.servicio_id,
      v_precio,
      round(v_precio * v_porcentaje / 100, 2),
      new.turno,
      (new.fecha_hora at time zone 'America/Lima')::date
    );
  end if;
  return new;
end;
$$;
