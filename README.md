# Inventario Perú

Sistema web de inventario para negocios y hostales, con prueba gratis de 7 días.

## Estructura
```
frontend/            -> lo que se sube a Vercel
  index.html           página de inicio, registro, acceso y panel
  admin/index.html     panel de administrador (tudominio.com/admin/)
  css/                 estilos (styles.css, admin.css)
  js/                  config, cliente Supabase, auth, inventario, admin...
  images/              logo y favicon
backend/             -> base de datos y lógica en Supabase
  database/            SQL por módulos, ejecutar en orden 01 a 05
```

## Puesta en marcha
1. Supabase: ejecuta `backend/database/01` a `05` en orden (o solo `00_todo_junto.sql`).
2. Edita `frontend/js/config.js` con tu URL y clave anon de Supabase.
3. Vercel: importa el proyecto y en Settings -> Root Directory elige `frontend`.
4. Regístrate en la app, confirma tu correo y ejecuta el bloque de administrador de `05_permisos_y_extras.sql`.
5. Cambia el logo reemplazando `frontend/images/logo.svg` y `favicon.svg`.

## Sobre el backend
Hoy no hay servidor propio: Supabase es el backend (base de datos, login y reglas de seguridad).
Un servidor (por ejemplo Python con FastAPI: `main.py`, `app/`, `clients/`) solo hará falta
para cosas como confirmar pagos automáticos o enviar avisos por WhatsApp.
