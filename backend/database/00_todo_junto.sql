-- =====================================================================
-- SUPABASE COMPLETO: inventario para negocios y hostales
-- Para un proyecto NUEVO. Pega todo en SQL Editor -> Run (una sola vez).
-- Incluye: esquema, registro automático, prueba de 7 días, solo lectura
-- al vencer, panel de administrador, stock mínimo y datos privados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------
create table public.negocios (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null unique references auth.users(id) on delete cascade,
  nombre          text,
  tipo            text check (tipo in ('tienda', 'hostal')),
  modalidades     text[],                                   -- hostal: hora, noche, dia_completo
  whatsapp        text check (whatsapp is null or whatsapp ~ '^[0-9]{9}$'),
  estado          text not null default 'prueba'
                  check (estado in ('prueba', 'activo', 'suspendido')),
  fecha_registro  timestamptz not null default now(),
  prueba_hasta    timestamptz not null default (now() + interval '7 days'),
  precio_acordado numeric(10,2),                            -- privado del administrador
  notas           text,                                     -- privado del administrador
  pagado_hasta    date                                      -- privado del administrador
);

create table public.productos (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null references public.negocios(id) on delete cascade,
  codigo       text not null,
  nombre       text not null,
  precio       numeric(10,2) not null check (precio >= 0),
  stock        integer not null default 0,
  stock_minimo integer not null default 0 check (stock_minimo >= 0),
  created_at   timestamptz not null default now(),
  unique (negocio_id, codigo)
);

create table public.habitaciones (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null references public.negocios(id) on delete cascade,
  numero       text not null,
  tipo         text,
  precio_noche numeric(10,2) check (precio_noche >= 0),
  unique (negocio_id, numero)
);

create table public.huespedes (
  id               uuid primary key default gen_random_uuid(),
  negocio_id       uuid not null references public.negocios(id) on delete cascade,
  habitacion_id    uuid references public.habitaciones(id) on delete set null,
  nombre           text not null,
  documento_tipo   text check (documento_tipo in ('DNI', 'CE', 'PASAPORTE')),
  documento_numero text,
  fecha_ingreso    date not null default current_date,
  fecha_salida     date,
  created_at       timestamptz not null default now()
);

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create index on public.productos (negocio_id, codigo);
create index on public.huespedes (negocio_id, fecha_ingreso);

-- ---------------------------------------------------------------------
-- 2. REGISTRO AUTOMÁTICO: al crearse un usuario se crea su negocio
-- ---------------------------------------------------------------------
create or replace function public.crear_negocio_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.negocios (owner_id, whatsapp)
  values (new.id, nullif(new.raw_user_meta_data ->> 'whatsapp', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_negocio_al_registrarse();

-- ---------------------------------------------------------------------
-- 3. FUNCIONES AUXILIARES
-- ---------------------------------------------------------------------
create or replace function public.mi_negocio_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.negocios where owner_id = (select auth.uid());
$$;

-- TRUE si puede editar: plan activo o prueba vigente
create or replace function public.puede_editar()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.negocios n
    where n.owner_id = (select auth.uid())
      and (
        n.estado = 'activo'
        or (n.estado = 'prueba' and n.prueba_hasta > now())
      )
  );
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- ---------------------------------------------------------------------
-- 4. SEGURIDAD (RLS) de productos, habitaciones y huespedes
--    VER: lo propio siempre. AGREGAR/EDITAR/BORRAR: solo si puede_editar().
--    El administrador puede VER todo (solo lectura).
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['productos', 'habitaciones', 'huespedes'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy "ver_propios" on public.%I for select to authenticated
         using (negocio_id = public.mi_negocio_id())', t);

    execute format(
      'create policy "agregar_si_activo" on public.%I for insert to authenticated
         with check (negocio_id = public.mi_negocio_id() and public.puede_editar())', t);

    execute format(
      'create policy "editar_si_activo" on public.%I for update to authenticated
         using (negocio_id = public.mi_negocio_id() and public.puede_editar())
         with check (negocio_id = public.mi_negocio_id() and public.puede_editar())', t);

    execute format(
      'create policy "borrar_si_activo" on public.%I for delete to authenticated
         using (negocio_id = public.mi_negocio_id() and public.puede_editar())', t);

    execute format(
      'create policy "admin_ve_todo" on public.%I for select to authenticated
         using (public.es_admin())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. SEGURIDAD de negocios
--    El cliente ve su negocio SIN las columnas privadas, y solo puede
--    cambiar nombre, tipo, whatsapp y modalidades (nunca estado ni fechas).
-- ---------------------------------------------------------------------
alter table public.negocios enable row level security;

create policy "ver_mi_negocio" on public.negocios
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "editar_mi_negocio" on public.negocios
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "admin_ve_todo" on public.negocios
  for select to authenticated
  using (public.es_admin());

revoke select, update on public.negocios from authenticated, anon;
grant select (id, owner_id, nombre, tipo, whatsapp, estado, fecha_registro, prueba_hasta, modalidades)
  on public.negocios to authenticated;
grant update (nombre, tipo, whatsapp, modalidades) on public.negocios to authenticated;

-- La tabla admins no se lee desde la web (RLS activa y sin políticas)
alter table public.admins enable row level security;

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

-- ---------------------------------------------------------------------
-- 7. PERMISOS DE EJECUCIÓN (las funciones no se exponen al público anónimo)
-- ---------------------------------------------------------------------
revoke execute on function public.crear_negocio_al_registrarse() from public, anon, authenticated;
revoke execute on function public.mi_negocio_id() from public, anon;
revoke execute on function public.puede_editar() from public, anon;
revoke execute on function public.es_admin() from public, anon;
revoke execute on function public.admin_listar_negocios() from public, anon;
revoke execute on function public.admin_cambiar_estado(uuid, text) from public, anon;
revoke execute on function public.admin_extender_prueba(uuid, integer) from public, anon;
revoke execute on function public.admin_guardar_datos(uuid, numeric, text, date) from public, anon;

-- ---------------------------------------------------------------------
-- 8. DESPUÉS DE REGISTRARTE EN TU APP, HAZTE ADMINISTRADOR
--    (cambia el correo, quita los "--" y ejecuta solo este bloque)
-- ---------------------------------------------------------------------
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'TU-CORREO@ejemplo.com';

-- ---------------------------------------------------------------------
-- 9. ACTIVAR UN NEGOCIO MANUALMENTE (también puedes hacerlo desde admin.html)
-- ---------------------------------------------------------------------
-- update public.negocios set estado = 'activo' where id = 'ID-DEL-NEGOCIO';
