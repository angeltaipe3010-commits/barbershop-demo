-- ============================================================================
--  Cobro atómico: registra todo el ticket en UNA transacción.
--  Idempotente por ticket_id (reintentos no duplican → seguro para offline).
-- ============================================================================
create or replace function public.registrar_cobro(
  p_ticket_id   uuid,
  p_barbero_id  uuid,
  p_cliente_id  uuid,
  p_cita_id     uuid,
  p_metodo_pago metodo_pago,
  p_propina     numeric,
  p_descuento   numeric,
  p_turno       turno_dia,
  p_fecha       date,
  p_items       jsonb
) returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_caja uuid;
  v_item jsonb;
  v_i    int := 0;
begin
  -- Autorización: el barbero solo cobra lo suyo; el admin, cualquier cosa.
  if not (public.es_admin() or p_barbero_id = auth.uid()) then
    raise exception 'No autorizado para registrar este cobro';
  end if;

  -- Idempotencia: si el ticket ya se registró, no hacer nada.
  if exists (select 1 from public.ventas where ticket_id = p_ticket_id) then
    return;
  end if;

  select id into v_caja from public.caja_sesiones where estado = 'abierta' limit 1;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.ventas (
      ticket_id, cita_id, barbero_id, cliente_id, servicio_id, producto_id,
      tipo, cantidad, monto, comision_monto, propina, descuento, metodo_pago,
      turno, fecha, caja_sesion_id
    ) values (
      p_ticket_id, p_cita_id, p_barbero_id, p_cliente_id,
      nullif(v_item->>'servicio_id', '')::uuid,
      nullif(v_item->>'producto_id', '')::uuid,
      (v_item->>'tipo')::tipo_item_venta,
      coalesce((v_item->>'cantidad')::int, 1),
      (v_item->>'monto')::numeric,
      coalesce((v_item->>'comision_monto')::numeric, 0),
      case when v_i = 0 then coalesce(p_propina, 0) else 0 end,
      case when v_i = 0 then coalesce(p_descuento, 0) else 0 end,
      p_metodo_pago, p_turno, p_fecha, v_caja
    );

    -- Descontar stock de productos (el trigger ajusta el stock)
    if (v_item->>'tipo') = 'producto' then
      insert into public.movimientos_inventario (producto_id, tipo, cantidad, motivo, barbero_id)
      values (nullif(v_item->>'producto_id', '')::uuid, 'salida',
              coalesce((v_item->>'cantidad')::int, 1), 'Venta directa', p_barbero_id);
    end if;

    v_i := v_i + 1;
  end loop;

  -- Marcar la cita como completada (el trigger ya no duplica: hay ventas)
  if p_cita_id is not null then
    update public.citas set estado = 'completada' where id = p_cita_id;
  end if;
end;
$$;

revoke all on function public.registrar_cobro(uuid,uuid,uuid,uuid,metodo_pago,numeric,numeric,turno_dia,date,jsonb) from public;
grant execute on function public.registrar_cobro(uuid,uuid,uuid,uuid,metodo_pago,numeric,numeric,turno_dia,date,jsonb) to authenticated;
