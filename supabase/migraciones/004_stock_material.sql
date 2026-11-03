-- 004_stock_material.sql
-- Stock de material compartido entre sesiones:
--   * material_escuela pasa a ser un catalogo: una fila por tipo y medida, con su stock total
--   * prestamo_material: un alumno puede coger una unidad por tipo en cada sesion
--   * el stock disponible se CALCULA: stock total - unidades prestadas en las sesiones que
--     coinciden en el tiempo (cada sesion ocupa el material hasta 30 minutos despues de acabar)
--   * un trigger rechaza prestamos si no queda stock o si el alumno ya tiene ese tipo

-- 1. material_escuela: stock y medida obligatoria ---------------------------------------
alter table public.material_escuela
  add column stock integer not null default 0 check (stock >= 0);
alter table public.material_escuela alter column medida set default 'unica';
update public.material_escuela set medida = 'unica' where medida is null;
alter table public.material_escuela alter column medida set not null;
alter table public.material_escuela
  add constraint material_escuela_tipo_medida_key unique (tipo_material, medida);

-- 2. prestamo_material: la clave incluye al alumno ----------------------------------------
alter table public.prestamo_material drop constraint prestamo_material_pkey;
alter table public.prestamo_material add primary key (dni_alumno, id_sesion, id_material);
drop index public.prestamo_material_inscripcion_idx;
create index prestamo_material_material_idx on public.prestamo_material (id_material, id_sesion);

-- 3. Unidades libres de un material para una sesion ----------------------------------------
-- Una sesion ocupa el material desde su inicio hasta 30 minutos despues de acabar.
-- El uso solo sube cuando empieza una sesion, asi que basta mirar el inicio de esta sesion
-- y el inicio de las demas que caen dentro de ella; el peor de esos momentos manda.
create function public.stock_disponible(p_id_material bigint, p_id_sesion bigint)
returns integer
language plpgsql stable set search_path = public as $$
declare
  v_margen constant integer := 30;
  v_stock  integer;
  v_inicio timestamp;
  v_fin    timestamp;
  v_libres integer;
begin
  select stock into v_stock from material_escuela where id_material = p_id_material;
  select fecha + hora_inicio, fecha + hora_inicio + make_interval(mins => duracion + v_margen)
    into v_inicio, v_fin
    from sesion where id_sesion = p_id_sesion;
  if v_stock is null or v_inicio is null then
    return null;
  end if;

  select min(v_stock - (
           select count(*)
           from prestamo_material pm
           join sesion s on s.id_sesion = pm.id_sesion
           where pm.id_material = p_id_material
             and s.fecha + s.hora_inicio <= p.momento
             and p.momento < s.fecha + s.hora_inicio + make_interval(mins => s.duracion + v_margen)))
    into v_libres
  from (
    select v_inicio as momento
    union
    select s2.fecha + s2.hora_inicio
    from sesion s2
    where s2.fecha + s2.hora_inicio > v_inicio
      and s2.fecha + s2.hora_inicio < v_fin
  ) p;

  return v_libres;
end $$;

-- Todo el material con sus unidades libres para una sesion (lo usa la web)
create function public.material_disponible(p_id_sesion bigint)
returns table (id_material bigint, tipo_material text, medida text, disponible integer)
language sql stable set search_path = public as $$
  select m.id_material, m.tipo_material, m.medida, public.stock_disponible(m.id_material, p_id_sesion)
  from public.material_escuela m
  order by m.tipo_material, m.medida;
$$;

revoke execute on function public.stock_disponible(bigint, bigint) from public, anon;
revoke execute on function public.material_disponible(bigint) from public, anon;
grant execute on function public.stock_disponible(bigint, bigint) to authenticated;
grant execute on function public.material_disponible(bigint) to authenticated;

-- 4. Reglas al prestar -----------------------------------------------------------------------
create function public.comprobar_prestamo_material() returns trigger
language plpgsql set search_path = public as $$
declare
  v_tipo      text;
  v_repetidos integer;
begin
  -- Bloqueos para que dos prestamos a la vez no se cuelen los dos con la ultima unidad
  perform pg_advisory_xact_lock(new.id_material);
  perform pg_advisory_xact_lock(hashtext(new.dni_alumno || '-' || new.id_sesion::text));

  if coalesce(stock_disponible(new.id_material, new.id_sesion), 0) < 1 then
    raise exception 'No queda stock de ese material para esa sesion (se comparte con las sesiones que coinciden en el tiempo)';
  end if;

  select tipo_material into v_tipo from material_escuela where id_material = new.id_material;
  select count(*) into v_repetidos
  from prestamo_material pm
  join material_escuela m on m.id_material = pm.id_material
  where pm.dni_alumno = new.dni_alumno
    and pm.id_sesion = new.id_sesion
    and m.tipo_material = v_tipo;
  if v_repetidos > 0 then
    raise exception 'Ese alumno ya tiene % en esa sesion (maximo 1 por tipo de material)', v_tipo;
  end if;

  return new;
end $$;

create trigger prestamo_material_comprobar
  before insert on public.prestamo_material
  for each row execute function public.comprobar_prestamo_material();

-- Un prestamo no se edita: se devuelve y se vuelve a prestar (asi el trigger siempre comprueba)
create function public.prohibir_cambiar_prestamo() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'Un prestamo no se modifica: devuelvelo y vuelve a prestarlo';
end $$;

create trigger prestamo_material_no_modificar
  before update on public.prestamo_material
  for each row execute function public.prohibir_cambiar_prestamo();

-- 5. Stock inicial -------------------------------------------------------------------------------
-- Tablas: 60 en total, 15 de cada medida. Neoprenos: 70 en total repartidos por tallas.
insert into public.material_escuela (tipo_material, medida, stock) values
  ('Tabla', '6''0', 15),
  ('Tabla', '6''6', 15),
  ('Tabla', '7''0', 15),
  ('Tabla', '8''0', 15),
  ('Neopreno', 'S', 15),
  ('Neopreno', 'M', 25),
  ('Neopreno', 'L', 20),
  ('Neopreno', 'XL', 10);
