-- Ejecutar en orden (01 -> 05) en Supabase -> SQL Editor

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
