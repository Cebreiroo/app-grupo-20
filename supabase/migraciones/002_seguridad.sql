-- 002_seguridad.sql
-- RLS (Row Level Security) activado en todas las tablas + politicas iniciales.
-- BORRADOR: no aplicar en Supabase hasta tener la aprobacion del grupo.
--
-- Roles de Supabase:
--   anon          = visitante sin iniciar sesion (usa la publishable key)
--   authenticated = usuario que ha iniciado sesion
-- Con RLS activado y sin politica, nadie puede nada. Cada politica abre un permiso.

alter table public.alumno           enable row level security;
alter table public.monitor          enable row level security;
alter table public.sesion           enable row level security;
alter table public.inscripcion      enable row level security;
alter table public.imparte          enable row level security;
alter table public.material_escuela enable row level security;

-- SESION: el horario y la playa pueden verlo todos; solo usuarios con sesion iniciada lo modifican.
create policy "sesion_lectura_publica" on public.sesion
  for select to anon, authenticated using (true);
create policy "sesion_insertar" on public.sesion
  for insert to authenticated with check (true);
create policy "sesion_actualizar" on public.sesion
  for update to authenticated using (true) with check (true);
create policy "sesion_borrar" on public.sesion
  for delete to authenticated using (true);

-- ALUMNO (datos personales): solo usuarios con sesion iniciada, lectura y escritura.
create policy "alumno_leer" on public.alumno
  for select to authenticated using (true);
create policy "alumno_insertar" on public.alumno
  for insert to authenticated with check (true);
create policy "alumno_actualizar" on public.alumno
  for update to authenticated using (true) with check (true);
create policy "alumno_borrar" on public.alumno
  for delete to authenticated using (true);

-- MONITOR (datos personales): igual que alumno.
create policy "monitor_leer" on public.monitor
  for select to authenticated using (true);
create policy "monitor_insertar" on public.monitor
  for insert to authenticated with check (true);
create policy "monitor_actualizar" on public.monitor
  for update to authenticated using (true) with check (true);
create policy "monitor_borrar" on public.monitor
  for delete to authenticated using (true);

-- INSCRIPCION: solo usuarios con sesion iniciada (relaciona DNI con sesiones).
create policy "inscripcion_leer" on public.inscripcion
  for select to authenticated using (true);
create policy "inscripcion_insertar" on public.inscripcion
  for insert to authenticated with check (true);
create policy "inscripcion_actualizar" on public.inscripcion
  for update to authenticated using (true) with check (true);
create policy "inscripcion_borrar" on public.inscripcion
  for delete to authenticated using (true);

-- IMPARTE: solo usuarios con sesion iniciada.
create policy "imparte_leer" on public.imparte
  for select to authenticated using (true);
create policy "imparte_insertar" on public.imparte
  for insert to authenticated with check (true);
create policy "imparte_actualizar" on public.imparte
  for update to authenticated using (true) with check (true);
create policy "imparte_borrar" on public.imparte
  for delete to authenticated using (true);

-- MATERIAL_ESCUELA: solo usuarios con sesion iniciada (incluye el DNI del alumno).
create policy "material_leer" on public.material_escuela
  for select to authenticated using (true);
create policy "material_insertar" on public.material_escuela
  for insert to authenticated with check (true);
create policy "material_actualizar" on public.material_escuela
  for update to authenticated using (true) with check (true);
create policy "material_borrar" on public.material_escuela
  for delete to authenticated using (true);
