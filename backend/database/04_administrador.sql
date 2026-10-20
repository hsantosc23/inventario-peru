-- Ejecutar en orden (01 -> 05) en Supabase -> SQL Editor

-- ---------------------------------------------------------------------
-- 6. FUNCIONES DEL ADMINISTRADOR
-- ---------------------------------------------------------------------
create or replace function public.admin_listar_negocios()
returns table (
  id uuid, email text, email_confirmado boolean, nombre text, tipo text,
  whatsapp text, estado text, fecha_registro timestamptz, prueba_hasta timestamptz,
  total_productos bigint, precio_acordado numeric, notas text, pagado_hasta date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;
  return query
    select n.id, u.email::text, (u.email_confirmed_at is not null), n.nombre, n.tipo,
           n.whatsapp, n.estado, n.fecha_registro, n.prueba_hasta,
           (select count(*) from public.productos p where p.negocio_id = n.id),
           n.precio_acordado, n.notas, n.pagado_hasta
    from public.negocios n
    join auth.users u on u.id = n.owner_id
    order by n.fecha_registro desc;
end;
$$;

create or replace function public.admin_cambiar_estado(p_negocio uuid, p_estado text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  if p_estado not in ('prueba', 'activo', 'suspendido') then
    raise exception 'Estado inválido';
  end if;
  update public.negocios set estado = p_estado where id = p_negocio;
end;
$$;

create or replace function public.admin_extender_prueba(p_negocio uuid, p_dias integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  update public.negocios
  set prueba_hasta = greatest(prueba_hasta, now()) + make_interval(days => p_dias),
      estado = case when estado = 'activo' then 'activo' else 'prueba' end
  where id = p_negocio;
end;
$$;

create or replace function public.admin_guardar_datos(
  p_negocio uuid, p_precio numeric, p_notas text, p_pagado date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  update public.negocios
  set precio_acordado = p_precio, notas = p_notas, pagado_hasta = p_pagado
  where id = p_negocio;
end;
$$;
