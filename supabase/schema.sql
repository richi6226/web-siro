-- =====================================================================
-- SIRO Inmobiliaria — Esquema del catálogo de propiedades (Supabase)
-- Ejecutar una vez en: Supabase → SQL Editor → New query → Run
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Administradores
--    Solo los usuarios de esta tabla pueden crear/editar propiedades.
--    El registro público se desactiva en Authentication → Providers.
--    is_admin() vive en el esquema "private", que la API no expone.
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists "admin ve su propia fila" on public.admins;
create policy "admin ve su propia fila" on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;


-- ---------------------------------------------------------------------
-- 2. Propiedades (datos públicos)
-- ---------------------------------------------------------------------
create sequence if not exists public.property_ref_seq start 1;

create table if not exists public.properties (
  id                uuid primary key default gen_random_uuid(),
  referencia        text not null unique
                    default ('SIRO-' || lpad(nextval('public.property_ref_seq')::text, 4, '0')),
  slug              text not null unique,
  titulo            text not null,

  operacion         text not null default 'venta'
                    check (operacion in ('venta', 'alquiler')),
  tipo              text not null
                    check (tipo in ('piso', 'atico', 'duplex', 'estudio', 'casa', 'chalet',
                                    'caserio', 'local', 'oficina', 'garaje', 'trastero', 'terreno')),
  estado            text not null default 'borrador'
                    check (estado in ('borrador', 'publicada', 'reservada', 'vendida', 'alquilada')),
  destacada         boolean not null default false,

  -- Precio en euros (venta) o euros/mes (alquiler)
  precio            integer check (precio is null or precio >= 0),
  precio_a_consultar boolean not null default false,
  gastos_comunidad  integer check (gastos_comunidad is null or gastos_comunidad >= 0),

  -- Ubicación pública (la dirección exacta va en property_private)
  municipio         text not null,
  zona              text,

  -- Superficie y distribución
  m2_construidos    integer check (m2_construidos is null or m2_construidos >= 0),
  m2_utiles         integer check (m2_utiles is null or m2_utiles >= 0),
  m2_parcela        integer check (m2_parcela is null or m2_parcela >= 0),
  habitaciones      smallint check (habitaciones is null or habitaciones >= 0),
  banos             smallint check (banos is null or banos >= 0),
  planta            text,
  ano_construccion  smallint,
  conservacion      text check (conservacion is null or conservacion in
                                ('obra_nueva', 'buen_estado', 'reformado', 'a_reformar')),

  -- Extras marcados con casillas en el panel (ascensor, garaje, terraza…)
  caracteristicas   text[] not null default '{}',

  -- Certificado energético (obligatorio en anuncios de venta/alquiler en España)
  cert_energetico   text check (cert_energetico is null or cert_energetico in
                                ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'en_tramite', 'exento')),
  consumo_energia   numeric(7, 2),   -- kWh/m² año
  emisiones_co2     numeric(7, 2),   -- kg CO₂/m² año

  descripcion       text,
  video_url         text,
  tour_url          text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  publicada_at      timestamptz
);

create index if not exists properties_estado_idx    on public.properties (estado);
create index if not exists properties_municipio_idx on public.properties (municipio);
create index if not exists properties_destacada_idx on public.properties (destacada) where destacada;


-- ---------------------------------------------------------------------
-- 3. Datos privados de cada propiedad (solo administradores)
-- ---------------------------------------------------------------------
create table if not exists public.property_private (
  property_id        uuid primary key references public.properties (id) on delete cascade,
  direccion          text,
  propietario_nombre text,
  propietario_telefono text,
  notas              text,
  updated_at         timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 4. Fotos (los archivos viven en Storage, aquí solo el orden y rutas)
-- ---------------------------------------------------------------------
create table if not exists public.property_images (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  path        text not null,          -- versión grande (WebP, máx. 1920 px)
  thumb_path  text not null,          -- miniatura (WebP, máx. 640 px)
  width       integer,
  height      integer,
  posicion    integer not null default 0,   -- 0 = portada
  alt         text,
  created_at  timestamptz not null default now()
);

create index if not exists property_images_property_idx
  on public.property_images (property_id, posicion);


-- ---------------------------------------------------------------------
-- 5. Fechas automáticas
-- ---------------------------------------------------------------------
create or replace function public.touch_property()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.estado <> 'borrador' and new.publicada_at is null then
    new.publicada_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists properties_touch on public.properties;
create trigger properties_touch
  before insert or update on public.properties
  for each row execute function public.touch_property();


-- ---------------------------------------------------------------------
-- 6. Seguridad (Row Level Security)
--    Público: solo lee propiedades que no están en borrador.
--    Administradores: lo pueden todo.
-- ---------------------------------------------------------------------
alter table public.properties       enable row level security;
alter table public.property_private enable row level security;
alter table public.property_images  enable row level security;

drop policy if exists "lectura de propiedades" on public.properties;
create policy "lectura de propiedades" on public.properties
  for select to anon, authenticated
  using (estado <> 'borrador' or (select private.is_admin()));

drop policy if exists "admins crean propiedades" on public.properties;
create policy "admins crean propiedades" on public.properties
  for insert to authenticated with check ((select private.is_admin()));

drop policy if exists "admins editan propiedades" on public.properties;
create policy "admins editan propiedades" on public.properties
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "admins borran propiedades" on public.properties;
create policy "admins borran propiedades" on public.properties
  for delete to authenticated using ((select private.is_admin()));

drop policy if exists "admins gestionan datos privados" on public.property_private;
create policy "admins gestionan datos privados" on public.property_private
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "lectura de fotos" on public.property_images;
create policy "lectura de fotos" on public.property_images
  for select to anon, authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_id and (p.estado <> 'borrador' or (select private.is_admin()))
  ));

drop policy if exists "admins crean fotos" on public.property_images;
create policy "admins crean fotos" on public.property_images
  for insert to authenticated with check ((select private.is_admin()));

drop policy if exists "admins editan fotos" on public.property_images;
create policy "admins editan fotos" on public.property_images
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "admins borran fotos" on public.property_images;
create policy "admins borran fotos" on public.property_images
  for delete to authenticated using ((select private.is_admin()));


-- ---------------------------------------------------------------------
-- 7. Almacenamiento de fotos (bucket público de solo lectura)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('propiedades', 'propiedades', true, 5242880,
        array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Listar y borrar archivos exige también permiso de lectura (las URLs públicas no lo necesitan)
drop policy if exists "admins listan fotos" on storage.objects;
create policy "admins listan fotos" on storage.objects
  for select to authenticated
  using (bucket_id = 'propiedades' and (select private.is_admin()));

drop policy if exists "admins suben fotos" on storage.objects;
create policy "admins suben fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'propiedades' and (select private.is_admin()));

drop policy if exists "admins modifican fotos" on storage.objects;
create policy "admins modifican fotos" on storage.objects
  for update to authenticated
  using (bucket_id = 'propiedades' and (select private.is_admin()));

drop policy if exists "admins borran fotos" on storage.objects;
create policy "admins borran fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'propiedades' and (select private.is_admin()));


-- ---------------------------------------------------------------------
-- 8. Dar de alta a los administradores
--    1) Authentication → Users → "Add user" (email + contraseña) para
--       Raquel y para Ricardo (registro público desactivado).
--    2) Ejecutar esto:
-- ---------------------------------------------------------------------
-- insert into public.admins (user_id, email)
-- select id, email from auth.users
-- on conflict (user_id) do nothing;
