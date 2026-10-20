-- Ejecutar en orden (01 -> 05) en Supabase -> SQL Editor

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
