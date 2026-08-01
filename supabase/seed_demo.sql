-- ============================================================================
--  EL NEGROTE BARBER SHOP — DATOS DE DEMOSTRACIÓN
-- ----------------------------------------------------------------------------
--  Deja la base lista para enseñar el sistema funcionando: usuarios con los
--  que entrar, catálogo, clientes y ~3 meses de operación real simulada
--  (ventas por ticket, propinas, métodos de pago, caja cuadrada y descuadrada,
--  gastos, comisiones pagadas y agenda de hoy).
--
--  CÓMO USARLO
--    1. Ejecuta antes los 4 archivos de `supabase/setup/` (01 → 04).
--    2. Pega este archivo completo en el SQL Editor de Supabase y ejecútalo.
--    3. Entra a la app con cualquiera de estos usuarios:
--
--    Los correos son `usuario@demo.com`, que es el dominio configurado en
--    VITE_AUTH_EMAIL_DOMAIN. Si cambias uno, cambia el otro o el login por
--    nombre de usuario dejará de encontrar la cuenta.
--
--         Usuario   Contraseña   Rol
--         -------   ----------   -------------
--         admin     demo1234     Administrador
--         carlos    demo1234     Barbero (45 %)
--         miguel    demo1234     Barbero (40 %)
--         diego     demo1234     Barbero (38 %)
--
--  ⚠️  BORRA todos los datos operativos existentes. No lo ejecutes sobre una
--      base con información real sin haber descargado antes un respaldo
--      (Configuración → Datos → Descargar respaldo).
--
--  ⚠️  Las contraseñas son públicas y deliberadamente simples: esto es una
--      base de DEMOSTRACIÓN. Antes de operar de verdad, borra estos usuarios
--      y crea los reales desde la app.
-- ============================================================================

begin;

-- pgcrypto (crypt/gen_salt) cifra las contraseñas de los usuarios de demo.
-- En Supabase ya viene instalado en el esquema `extensions`; se añade al
-- search_path para poder invocarlo sin calificar, viva donde viva.
create extension if not exists pgcrypto;
set local search_path = public, extensions;

-- ----------------------------------------------------------------------------
--  1. Limpieza
--     De las tablas que referencian hacia las referenciadas, para no chocar
--     con las claves foráneas.
-- ----------------------------------------------------------------------------
delete from public.ventas;
delete from public.gastos;
delete from public.pagos_comision;
delete from public.movimientos_inventario;
delete from public.citas;
delete from public.caja_sesiones;
delete from public.clientes;
delete from public.servicios;
delete from public.productos_inventario;

-- Usuarios de demo previos (se recrean más abajo con datos frescos).
delete from auth.users
where email in (
  'admin@demo.com', 'carlos@demo.com',
  'miguel@demo.com', 'diego@demo.com'
);

-- ----------------------------------------------------------------------------
--  2. Usuarios de acceso
--     Se insertan directamente en auth.users. El trigger `trg_auth_nuevo_usuario`
--     crea automáticamente su perfil en `usuarios_barberos`.
--     La fila en auth.identities es lo que permite el login por contraseña.
-- ----------------------------------------------------------------------------
do $$
declare
  v_usuario   record;
  v_id        uuid;
  v_tiene_pid boolean;
begin
  -- GoTrue añadió `provider_id` a auth.identities en versiones recientes.
  -- Se detecta para que el script funcione en proyectos nuevos y antiguos.
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id'
  ) into v_tiene_pid;

  for v_usuario in
    select * from (values
      ('admin',  'Ana Torres',       'admin',   '987654321'),
      ('carlos', 'Carlos Mendoza',   'barbero', '987111222'),
      ('miguel', 'Miguel Ángel Ruiz','barbero', '987333444'),
      ('diego',  'Diego Salazar',    'barbero', '987555666')
    ) as t(username, nombre, rol, telefono)
  loop
    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_id,
      'authenticated',
      'authenticated',
      v_usuario.username || '@demo.com',
      crypt('demo1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'username', v_usuario.username,
        'nombre',   v_usuario.nombre,
        'rol',      v_usuario.rol
      ),
      now() - interval '6 months',
      now(),
      '', '', '', ''
    );

    if v_tiene_pid then
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (
        gen_random_uuid(), v_id, v_id::text,
        jsonb_build_object('sub', v_id::text, 'email', v_usuario.username || '@demo.com', 'email_verified', true),
        'email', now(), now(), now()
      );
    else
      insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (
        gen_random_uuid(), v_id,
        jsonb_build_object('sub', v_id::text, 'email', v_usuario.username || '@demo.com', 'email_verified', true),
        'email', now(), now(), now()
      );
    end if;

    -- El trigger ya creó el perfil: aquí se completan los datos del negocio.
    update public.usuarios_barberos
       set telefono            = v_usuario.telefono,
           porcentaje_comision = case v_usuario.username
                                   when 'admin'  then 0
                                   when 'carlos' then 45
                                   when 'miguel' then 40
                                   else 38
                                 end,
           dias_laborables     = case v_usuario.username
                                   when 'diego' then '{2,3,4,5,6}'::int[]  -- descansa lunes
                                   else '{1,2,3,4,5,6}'::int[]
                                 end,
           hora_inicio         = case v_usuario.username when 'miguel' then '11:00' else '09:00' end::time,
           hora_fin            = case v_usuario.username when 'miguel' then '21:00' else '20:00' end::time,
           activo              = true
     where id = v_id;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
--  3. Configuración del negocio
-- ----------------------------------------------------------------------------
insert into public.configuracion (id, nombre_negocio, direccion, telefono, hora_corte_turno)
values (1, 'El Negrote Barber Shop', 'Av. Los Olivos 458, Lima', '987 654 321', 14)
on conflict (id) do update
   set nombre_negocio   = excluded.nombre_negocio,
       direccion        = excluded.direccion,
       telefono         = excluded.telefono,
       hora_corte_turno = excluded.hora_corte_turno,
       updated_at       = now();

-- ----------------------------------------------------------------------------
--  4. Catálogo de servicios
--     Precios referenciales de una barbería de barrio en Lima (Soles).
-- ----------------------------------------------------------------------------
insert into public.servicios (nombre, descripcion, categoria, precio, duracion_min, activo) values
  ('Corte Clásico',        'Corte a máquina y tijera con acabado a navaja',      'corte',       25.00, 30, true),
  ('Taper Fade',           'Degradado bajo con difuminado limpio',               'corte',       30.00, 35, true),
  ('Corte + Barba',        'Corte completo más perfilado y arreglo de barba',    'combo',       40.00, 50, true),
  ('Afeitado a Navaja',    'Afeitado clásico con toalla caliente',               'barba',       20.00, 25, true),
  ('Perfilado de Barba',   'Diseño y perfilado con navaja',                      'barba',       18.00, 20, true),
  ('Tratamiento Capilar',  'Hidratación profunda y masaje capilar',              'tratamiento', 35.00, 40, true),
  ('Corte Niño',           'Corte para menores de 12 años',                      'corte',       18.00, 25, true),
  ('Diseño de Cejas',      'Perfilado de cejas con navaja',                      'tratamiento', 10.00, 15, true),
  ('Corte Premium + Ritual','Corte, barba, mascarilla y bebida de cortesía',     'combo',       65.00, 75, false);

-- ----------------------------------------------------------------------------
--  5. Inventario
--     El stock final lo determinan los movimientos que se generan más abajo.
-- ----------------------------------------------------------------------------
insert into public.productos_inventario (nombre, descripcion, tipo, stock, stock_minimo, precio_venta) values
  ('Cera Mate Fijación Fuerte', 'Acabado mate, fijación 8/10',        'venta',   0, 6, 28.00),
  ('Pomada Brillo Clásica',     'Efecto húmedo, fijación media',      'venta',   0, 6, 25.00),
  ('Shampoo para Barba',        'Limpieza suave sin resecar',         'venta',   0, 5, 22.00),
  ('Aceite para Barba',         'Hidrata y da brillo natural',        'venta',   0, 5, 30.00),
  ('Gel Fijador',               'Fijación fuerte de larga duración',  'venta',   0, 6, 15.00),
  ('Tónico Capilar',            'Fortalece y estimula el crecimiento','venta',   0, 6, 32.00),
  ('Talco Aftershave',          'Uso interno tras el afeitado',       'interno', 0, 4,  0.00),
  ('Alcohol en gel',            'Higiene de estación',                'interno', 0, 3,  0.00);

-- ----------------------------------------------------------------------------
--  6. Clientes
-- ----------------------------------------------------------------------------
insert into public.clientes (nombre, telefono, email, preferencias, notas, created_at)
select
  nombre,
  '9' || lpad(((row_number() over ()) * 1379117 % 100000000)::text, 8, '0'),
  case when random() < 0.35 then lower(split_part(nombre, ' ', 1)) || '@correo.com' end,
  preferencia,
  nota,
  now() - (random() * 180 || ' days')::interval
from (values
  ('Carlos Quispe',    'Fade bajo, máquina 1 a los lados',        'Viene cada 3 semanas'),
  ('Luis Mamani',      'Tijera arriba, sin máquina',              null),
  ('José Huamán',      'Barba perfilada con navaja',              'Alérgico al after shave con alcohol'),
  ('Miguel Flores',    'Corte escolar, rápido',                   'Viene con su hijo'),
  ('Jorge Rojas',      'Taper fade con línea marcada',            null),
  ('Pedro Vargas',     'Clásico con raya al costado',             'Prefiere turno de mañana'),
  ('Andrés Castillo',  'Fade medio y barba corta',                null),
  ('Diego Ramírez',    'Corte largo con capas',                   null),
  ('Roberto Sosa',     'Máquina 2 uniforme',                      'Paga siempre con Yape'),
  ('Fernando Ríos',    'Barba completa, solo perfilar',           null),
  ('Álvaro Chávez',    'Fade alto, contorno cerrado',             'Cliente desde la apertura'),
  ('Renzo Paredes',    'Corte ejecutivo',                         null),
  ('Bruno Ticona',     'Mohicano moderado',                       null),
  ('Iván Salazar',     'Corte + cejas',                           'Suele pedir cita el sábado'),
  ('Marco Ayala',      'Rapado completo',                         null),
  ('Gonzalo Medina',   'Tijera y secado',                         null),
  ('Sergio Cárdenas',  'Fade con diseño',                         'Le gusta ver el diseño antes'),
  ('Rodrigo Peña',     'Corte clásico, sin gel',                  null),
  ('Néstor Cabrera',   'Barba larga, solo puntas',                null),
  ('Julio Zapata',     'Corte niño para su hijo',                 'Trae a los dos hijos juntos'),
  ('Walter Ccahuana',  'Fade bajo con barba',                     null),
  ('Óscar Bellido',    'Corte y tratamiento capilar',             'Le interesa el tónico'),
  ('Elías Ramos',      'Máquina 1 con perfilado',                 null),
  ('Hugo Palomino',    'Corte clásico',                           null)
) as t(nombre, preferencia, nota);

-- ============================================================================
--  7. Operación simulada: cajas, ventas, gastos y comisiones
-- ============================================================================
do $$
declare
  DIAS_HISTORIAL constant int := 90;

  v_dia            date;
  v_dow            int;
  v_factor         numeric;
  v_atenciones     int;
  v_i              int;
  v_caja           uuid;
  v_ticket         uuid;
  v_hora           int;
  v_turno          turno_dia;
  v_metodo         metodo_pago;
  v_propina        numeric;
  v_descuento      numeric;
  v_barbero        record;
  v_servicio       record;
  v_producto       record;
  v_cliente_id     uuid;
  v_momento        timestamptz;

  v_ventas_efectivo numeric;
  v_gastos_efectivo numeric;
  v_inicial         numeric;
  v_esperado        numeric;
  v_contado         numeric;
  v_desfase         numeric;
begin
  for v_dia in
    select generate_series(current_date - DIAS_HISTORIAL, current_date, '1 day')::date
  loop
    v_dow := extract(dow from v_dia);
    continue when v_dow = 0;  -- domingo cerrado

    -- Viernes y sábado concentran el trabajo de la semana.
    v_factor := case v_dow when 5 then 1.6 when 6 then 2.0 else 1.0 end;
    v_atenciones := greatest(2, round((4 + random() * 5) * v_factor)::int);

    -- ---- Caja del día ------------------------------------------------------
    v_inicial := (array[50, 80, 100, 120])[1 + floor(random() * 4)::int];
    v_caja := gen_random_uuid();

    insert into public.caja_sesiones (
      id, fecha, abierta_por, monto_inicial, estado, abierta_at
    )
    select
      v_caja, v_dia, u.id, v_inicial, 'abierta',
      v_dia + time '08:45'
    from public.usuarios_barberos u
    where u.rol = 'admin'
    limit 1;

    -- ---- Atenciones del día ------------------------------------------------
    for v_i in 1..v_atenciones loop
      select id, porcentaje_comision, nombre
        into v_barbero
        from public.usuarios_barberos
       where rol = 'barbero' and activo
       order by random()
       limit 1;

      -- Los servicios baratos y rápidos son los más pedidos: el orden por
      -- `precio * random()` reproduce esa distribución sin tablas de pesos.
      select id, precio
        into v_servicio
        from public.servicios
       where activo
       order by precio * random()
       limit 1;

      select id into v_cliente_id from public.clientes order by random() limit 1;

      v_hora   := 9 + floor(random() * 12)::int;
      v_turno  := case when v_hora < 14 then 'manana' else 'tarde_noche' end::turno_dia;
      v_momento := v_dia + make_time(v_hora, (array[0, 15, 30, 45])[1 + floor(random() * 4)::int], 0);

      -- El efectivo y Yape dominan; tarjeta y transferencia son minoritarios.
      v_metodo := (array[
        'efectivo','efectivo','efectivo','efectivo',
        'yape','yape','yape',
        'plin','tarjeta','transferencia'
      ])[1 + floor(random() * 10)::int]::metodo_pago;

      v_propina   := case when random() < 0.28 then (array[2, 3, 5, 5, 10])[1 + floor(random() * 5)::int] else 0 end;
      v_descuento := case when random() < 0.07 then 5 else 0 end;

      v_ticket := gen_random_uuid();

      -- Línea de servicio (lleva la propina y el descuento del ticket).
      insert into public.ventas (
        ticket_id, barbero_id, cliente_id, servicio_id, tipo, cantidad,
        monto, comision_monto, propina, descuento, metodo_pago,
        turno, fecha, caja_sesion_id, created_at
      ) values (
        v_ticket, v_barbero.id, v_cliente_id, v_servicio.id, 'servicio', 1,
        greatest(0, v_servicio.precio - v_descuento),
        round(greatest(0, v_servicio.precio - v_descuento) * v_barbero.porcentaje_comision / 100, 2) + v_propina,
        v_propina, v_descuento, v_metodo,
        v_turno, v_dia, v_caja, v_momento
      );

      -- ~20 % de las atenciones se lleva además un producto.
      if random() < 0.20 then
        select id, precio_venta
          into v_producto
          from public.productos_inventario
         where tipo = 'venta'
         order by random()
         limit 1;

        insert into public.ventas (
          ticket_id, barbero_id, cliente_id, producto_id, tipo, cantidad,
          monto, comision_monto, propina, descuento, metodo_pago,
          turno, fecha, caja_sesion_id, created_at
        ) values (
          v_ticket, v_barbero.id, v_cliente_id, v_producto.id, 'producto', 1,
          v_producto.precio_venta, 0, 0, 0, v_metodo,
          v_turno, v_dia, v_caja, v_momento
        );
      end if;
    end loop;

    -- ---- Gastos del día ----------------------------------------------------
    if random() < 0.45 then
      insert into public.gastos (descripcion, categoria, monto, metodo_pago, fecha, caja_sesion_id, registrado_por, created_at)
      select
        (array['Insumos de corte','Limpieza del local','Agua y luz','Café y snacks',
               'Mantenimiento de máquinas','Publicidad en redes'])[1 + floor(random() * 6)::int],
        'Operación',
        round((10 + random() * 50)::numeric, 2),
        (array['efectivo','efectivo','yape'])[1 + floor(random() * 3)::int]::metodo_pago,
        v_dia, v_caja, u.id, v_dia + time '19:00'
      from public.usuarios_barberos u where u.rol = 'admin' limit 1;
    end if;

    -- Alquiler: el gasto fijo que hace realista la utilidad neta.
    if extract(day from v_dia) = 1 then
      insert into public.gastos (descripcion, categoria, monto, metodo_pago, fecha, registrado_por, created_at)
      select 'Alquiler del local', 'Fijo', 800.00, 'transferencia', v_dia, u.id, v_dia + time '10:00'
      from public.usuarios_barberos u where u.rol = 'admin' limit 1;
    end if;

    -- ---- Cierre de caja ----------------------------------------------------
    -- La caja de hoy se deja ABIERTA para poder enseñar el arqueo en vivo.
    if v_dia < current_date then
      select coalesce(sum(monto + propina), 0) into v_ventas_efectivo
        from public.ventas where caja_sesion_id = v_caja and metodo_pago = 'efectivo';

      select coalesce(sum(monto), 0) into v_gastos_efectivo
        from public.gastos where caja_sesion_id = v_caja and metodo_pago = 'efectivo';

      v_esperado := v_inicial + v_ventas_efectivo - v_gastos_efectivo;

      -- La mayoría de los días cuadra; de vez en cuando hay un descuadre
      -- pequeño, que es lo que ocurre en la vida real.
      v_contado := case
                     when random() < 0.75 then v_esperado
                     else v_esperado + (array[-5, -2, -1, 1, 2, 5])[1 + floor(random() * 6)::int]
                   end;
      v_desfase := v_contado - v_esperado;

      update public.caja_sesiones
         set estado              = 'cerrada',
             monto_final_contado = v_contado,
             efectivo_esperado   = v_esperado,
             diferencia          = v_desfase,
             cerrada_por         = abierta_por,
             cerrada_at          = v_dia + time '21:30',
             notas               = case when v_desfase <> 0 then 'Descuadre detectado en el arqueo' end
       where id = v_caja;
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
--  8. Movimientos de inventario
--     Primero la compra inicial (dimensionada para cubrir todo lo vendido y
--     dejar un stock final concreto), después una salida por cada venta.
--     El trigger `trg_movimiento_stock` es quien ajusta el stock.
-- ----------------------------------------------------------------------------

-- Compra inicial. El stock objetivo deja dos productos bajo mínimo, para que
-- se vea funcionando el aviso de reposición.
insert into public.movimientos_inventario (producto_id, tipo, cantidad, motivo, barbero_id, created_at)
select
  p.id,
  'entrada',
  coalesce(v.vendidos, 0) + case p.nombre
                              when 'Tónico Capilar' then 3   -- quedará bajo mínimo
                              when 'Aceite para Barba' then 4 -- quedará bajo mínimo
                              when 'Talco Aftershave' then 9
                              when 'Alcohol en gel' then 6
                              else 22
                            end,
  'Compra inicial de mercadería',
  (select id from public.usuarios_barberos where rol = 'admin' limit 1),
  current_date - 90
from public.productos_inventario p
left join (
  select producto_id, sum(cantidad)::int as vendidos
    from public.ventas
   where tipo = 'producto' and producto_id is not null
   group by producto_id
) v on v.producto_id = p.id;

-- Una salida por cada producto vendido.
insert into public.movimientos_inventario (producto_id, tipo, cantidad, motivo, barbero_id, created_at)
select producto_id, 'salida', cantidad, 'Venta directa', barbero_id, created_at
from public.ventas
where tipo = 'producto' and producto_id is not null;

-- Consumo interno del material que no se vende.
insert into public.movimientos_inventario (producto_id, tipo, cantidad, motivo, barbero_id, created_at)
select
  p.id, 'salida', 1, 'Consumo interno',
  (select id from public.usuarios_barberos where rol = 'barbero' and activo order by random() limit 1),
  current_date - (random() * 60)::int
from public.productos_inventario p
where p.tipo = 'interno';

-- ----------------------------------------------------------------------------
--  9. Pagos de comisión
--     Liquidaciones semanales cerradas hasta hace dos semanas: así queda un
--     saldo pendiente visible en la vista de Liquidación.
-- ----------------------------------------------------------------------------
insert into public.pagos_comision (barbero_id, monto, notas, fecha, registrado_por, created_at)
select
  v.barbero_id,
  round(sum(v.comision_monto), 2),
  'Liquidación semanal',
  (date_trunc('week', v.fecha)::date + 7),
  (select id from public.usuarios_barberos where rol = 'admin' limit 1),
  (date_trunc('week', v.fecha)::date + 7)::timestamptz
from public.ventas v
where v.fecha < date_trunc('week', current_date)::date - 14
group by v.barbero_id, date_trunc('week', v.fecha)
having sum(v.comision_monto) > 0;

-- ----------------------------------------------------------------------------
--  10. Agenda de hoy y mañana
--      Mezcla de estados para que la vista de Agenda muestre el flujo completo.
-- ----------------------------------------------------------------------------
insert into public.citas (cliente_id, barbero_id, servicio_id, fecha_hora, estado, turno, notas)
select
  (select id from public.clientes order by random() limit 1),
  b.id,
  (select id from public.servicios where activo order by random() limit 1),
  d.dia + make_time(h.hora, (array[0, 30])[1 + floor(random() * 2)::int], 0),
  case
    when d.dia > current_date then (array['pendiente','confirmada','confirmada'])[1 + floor(random() * 3)::int]
    when h.hora < extract(hour from now()) then 'completada'
    else (array['pendiente','confirmada','confirmada','en_proceso'])[1 + floor(random() * 4)::int]
  end::estado_cita,
  case when h.hora < 14 then 'manana' else 'tarde_noche' end::turno_dia,
  case when random() < 0.25
       then (array['Cliente frecuente','Pidió el mismo corte de la vez pasada','Viene con su hijo'])[1 + floor(random() * 3)::int]
  end
from (values (current_date), (current_date + 1)) as d(dia)
cross join (values (9), (11), (13), (16), (18), (20)) as h(hora)
-- El orden depende del día y la hora de la fila, así que el LATERAL se
-- reevalúa por cita y cada una cae en un barbero distinto.
cross join lateral (
  select id from public.usuarios_barberos
   where rol = 'barbero' and activo
   order by md5(d.dia::text || h.hora::text || random()::text)
   limit 1
) b;

commit;

-- ============================================================================
--  Resumen de lo generado
-- ============================================================================
select 'usuarios'   as tabla, count(*) as filas from public.usuarios_barberos
union all select 'clientes',     count(*) from public.clientes
union all select 'servicios',    count(*) from public.servicios
union all select 'productos',    count(*) from public.productos_inventario
union all select 'ventas',       count(*) from public.ventas
union all select 'citas',        count(*) from public.citas
union all select 'gastos',       count(*) from public.gastos
union all select 'cajas',        count(*) from public.caja_sesiones
union all select 'pagos',        count(*) from public.pagos_comision
union all select 'movimientos',  count(*) from public.movimientos_inventario;
