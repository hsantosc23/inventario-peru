-- Ejecutar en orden (01 -> 05) en Supabase -> SQL Editor

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
