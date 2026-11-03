-- 001_tablas.sql
-- Modelo entidad-relacion del grupo 20 traducido a PostgreSQL.
-- Nombres en espanol, minusculas y sin tildes.
-- BORRADOR: no aplicar en Supabase hasta tener la aprobacion del grupo.

-- Entidad: Alumno
create table public.alumno (
  dni      text primary key,
  nombre   text not null,
  edad     integer check (edad between 0 and 120),
  telefono text,
  nivel    text
);

-- Entidad: Monitor
create table public.monitor (
  dni_monitor text primary key,
  nombre      text not null,
  edad        integer check (edad between 16 and 120),
  telefono    text
);

-- Entidad: Sesion
create table public.sesion (
  id_sesion   bigint generated always as identity primary key,
  fecha       date not null,
  hora_inicio time not null,
  playa       text not null,
  nivel       text,
  duracion    integer not null check (duracion > 0)  -- en minutos
);

-- Relacion N:M Alumno - Sesion (en el diagrama: "Inscripcion")
create table public.inscripcion (
  dni_alumno text   not null references public.alumno (dni)        on delete cascade,
  id_sesion  bigint not null references public.sesion (id_sesion)  on delete cascade,
  primary key (dni_alumno, id_sesion)
);

-- Relacion N:M Monitor - Sesion ("imparte")
create table public.imparte (
  id_sesion   bigint not null references public.sesion (id_sesion)        on delete cascade,
  dni_monitor text   not null references public.monitor (dni_monitor)     on delete cascade,
  primary key (id_sesion, dni_monitor)
);

-- Entidad: Material escuela (1 alumno "necesita" n materiales)
-- El diagrama no indica clave, por eso se anade id_material (suposicion).
create table public.material_escuela (
  id_material   bigint generated always as identity primary key,
  tipo_material text not null,
  medida        text,
  dni_alumno    text references public.alumno (dni) on delete set null
);

-- Indices en las claves foraneas que no son el primer campo de una clave primaria
create index inscripcion_id_sesion_idx   on public.inscripcion (id_sesion);
create index imparte_dni_monitor_idx     on public.imparte (dni_monitor);
create index material_escuela_alumno_idx on public.material_escuela (dni_alumno);
