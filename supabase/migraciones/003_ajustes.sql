-- 003_ajustes.sql
-- Ajustes tras las respuestas del grupo:
--   * niveles cerrados (iniciacion, medio, avanzado)
--   * material = inventario de la escuela que se presta por sesion
--   * borrar una sesion con inscripciones queda bloqueado
--   * aforo: maximo 3 monitores por sesion y 5 alumnos por monitor
-- BORRADOR: no aplicar en Supabase hasta tener la aprobacion del grupo.

-- 1. Niveles cerrados --------------------------------------------------------
alter table public.alumno
  add constraint alumno_nivel_check check (nivel in ('iniciacion', 'medio', 'avanzado'));
alter table public.sesion
  add constraint sesion_nivel_check check (nivel in ('iniciacion', 'medio', 'avanzado'));

-- 2. Material: inventario + prestamo por inscripcion -------------------------
-- Cada fila de material_escuela es una pieza fisica (por ejemplo, una tabla de 7'0").
drop index public.material_escuela_alumno_idx;
alter table public.material_escuela drop column dni_alumno;

-- Un alumno, en una sesion concreta, usa una pieza de material.
-- Cuelga de inscripcion: solo se puede pedir material para una sesion a la que ya estas apuntado.
create table public.prestamo_material (
  id_material bigint not null references public.material_escuela (id_material) on delete restrict,
  dni_alumno  text   not null,
  id_sesion   bigint not null,
  primary key (id_material, id_sesion),  -- una pieza no puede estar en dos manos en la misma sesion
  foreign key (dni_alumno, id_sesion)
    references public.inscripcion (dni_alumno, id_sesion) on delete cascade
);
create index prestamo_material_inscripcion_idx on public.prestamo_material (dni_alumno, id_sesion);

alter table public.prestamo_material enable row level security;
create policy "prestamo_leer" on public.prestamo_material
  for select to authenticated using (true);
create policy "prestamo_insertar" on public.prestamo_material
  for insert to authenticated with check (true);
create policy "prestamo_actualizar" on public.prestamo_material
  for update to authenticated using (true) with check (true);
create policy "prestamo_borrar" on public.prestamo_material
  for delete to authenticated using (true);

-- 3. Borrar una sesion con inscripciones: bloqueado --------------------------
alter table public.inscripcion
  drop constraint inscripcion_id_sesion_fkey,
  add constraint inscripcion_id_sesion_fkey
    foreign key (id_sesion) references public.sesion (id_sesion) on delete restrict;

-- 4. Aforo -------------------------------------------------------------------
-- Maximo 3 monitores por sesion.
create function public.comprobar_max_monitores() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.imparte where id_sesion = new.id_sesion) >= 3 then
    raise exception 'Una sesion no puede tener mas de 3 monitores';
  end if;
  return new;
end $$;

create trigger imparte_max_monitores
  before insert or update of id_sesion on public.imparte
  for each row execute function public.comprobar_max_monitores();

-- Maximo 5 alumnos por cada monitor asignado a la sesion.
create function public.comprobar_aforo() returns trigger
language plpgsql set search_path = public as $$
declare
  v_monitores integer;
  v_alumnos   integer;
begin
  select count(*) into v_monitores from public.imparte     where id_sesion = new.id_sesion;
  select count(*) into v_alumnos   from public.inscripcion where id_sesion = new.id_sesion;
  if v_alumnos >= 5 * v_monitores then
    raise exception 'Sesion completa: maximo 5 alumnos por monitor (monitores: %, alumnos: %)',
      v_monitores, v_alumnos;
  end if;
  return new;
end $$;

create trigger inscripcion_aforo
  before insert or update of id_sesion on public.inscripcion
  for each row execute function public.comprobar_aforo();

-- No se puede quitar un monitor si los alumnos ya inscritos dejarian de caber.
create function public.comprobar_quitar_monitor() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.inscripcion where id_sesion = old.id_sesion)
     > 5 * ((select count(*) from public.imparte where id_sesion = old.id_sesion) - 1) then
    raise exception 'No se puede quitar el monitor: los alumnos inscritos no cabrian';
  end if;
  return old;
end $$;

create trigger imparte_quitar_monitor
  before delete on public.imparte
  for each row execute function public.comprobar_quitar_monitor();
