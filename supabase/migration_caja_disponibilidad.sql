-- ============================================================================
--  Arqueo de caja con descuadre persistido + disponibilidad del barbero.
--  Todo con "add column if not exists" y valores por defecto → seguro de
--  re-ejecutar y no rompe filas existentes.
-- ============================================================================

-- 1. Caja: guardar el efectivo esperado y la diferencia (descuadre) del cierre.
alter table public.caja_sesiones
  add column if not exists efectivo_esperado numeric(10,2),
  add column if not exists diferencia        numeric(10,2);

comment on column public.caja_sesiones.efectivo_esperado is
  'Efectivo que debería haber al cerrar = inicial + ventas efectivo − gastos efectivo.';
comment on column public.caja_sesiones.diferencia is
  'Descuadre = contado − esperado. Positivo = sobrante, negativo = faltante.';

-- 2. Disponibilidad del barbero: días laborables y horario de atención.
--    dias_laborables: convención JS getDay() → 0=domingo … 6=sábado.
--    Por defecto: lunes a sábado (1..6), 09:00–21:00.
alter table public.usuarios_barberos
  add column if not exists dias_laborables int[] not null default '{1,2,3,4,5,6}',
  add column if not exists hora_inicio     time  not null default '09:00',
  add column if not exists hora_fin        time  not null default '21:00';

comment on column public.usuarios_barberos.dias_laborables is
  'Días que trabaja el barbero (0=dom … 6=sáb), convención JS getDay().';
