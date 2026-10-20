-- Ejecutar en orden (01 -> 05) en Supabase -> SQL Editor

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
