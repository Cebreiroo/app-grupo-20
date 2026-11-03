// PARTE 4: conexión con Supabase (la publishable key es pública por diseño; la seguridad la da RLS)
const SUPABASE_URL = 'https://ecmkodlfmxmwlncxxoik.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ksICiDz4rmTde3bdbNZMeA_EvEI_Xz7';
const cliente = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Regla del grupo: cada monitor atiende como máximo a 5 alumnos
const ALUMNOS_POR_MONITOR = 5;
let hayUsuario = false;

// Plazas libres = 5 x monitores de la sesión - alumnos ya inscritos (nunca menos de 0)
function plazasLibres(sesion) {
  const monitores = sesion.imparte[0].count;
  const inscritos = sesion.inscripcion[0].count;
  return Math.max(0, ALUMNOS_POR_MONITOR * monitores - inscritos);
}

function mostrarMensaje(id, texto, esError) {
  const elemento = document.getElementById(id);
  elemento.textContent = texto;
  elemento.className = 'mensaje ' + (esError ? 'error' : 'ok');
}

// PARTE 5: leer las sesiones y pintarlas en la tabla
async function cargarSesiones() {
  // Las tablas imparte e inscripcion solo las puede leer un usuario con sesión iniciada,
  // así que las plazas solo se piden (y se enseñan) cuando hay sesión.
  const columnas = hayUsuario ? '*, imparte(count), inscripcion(count)' : '*';
  const { data, error } = await cliente
    .from('sesion')
    .select(columnas)
    .order('fecha')
    .order('hora_inicio');

  const lista = document.getElementById('lista');
  lista.replaceChildren();

  if (error) {
    mostrarMensaje('mensaje-lista', 'No se pudieron cargar las sesiones: ' + error.message, true);
    return;
  }
  mostrarMensaje('mensaje-lista', data.length === 0 ? 'Todavía no hay sesiones.' : '', false);
  if (hayUsuario) rellenarSelectorSesiones(data);

  for (const sesion of data) {
    const fila = document.createElement('tr');
    const celdas = [
      sesion.fecha,
      sesion.hora_inicio.slice(0, 5),
      sesion.playa,
      sesion.nivel ?? '-',
      sesion.duracion + ' min'
    ];
    if (hayUsuario) celdas.push(plazasLibres(sesion));
    for (const texto of celdas) {
      const celda = document.createElement('td');
      celda.textContent = texto; // textContent evita que se cuele HTML en la página
      fila.appendChild(celda);
    }
    lista.appendChild(fila);
  }
}

// PARTE 5b: rellenar los desplegables de "Asignar un monitor a una sesión"
function rellenarSelector(idSelect, opciones) {
  const select = document.getElementById(idSelect);
  select.replaceChildren();
  for (const { valor, texto } of opciones) {
    const opcion = document.createElement('option');
    opcion.value = valor;
    opcion.textContent = texto;
    select.appendChild(opcion);
  }
}

function rellenarSelectorSesiones(sesiones) {
  rellenarSelector('asignar-sesion', sesiones.map((s) => ({
    valor: s.id_sesion,
    texto: s.fecha + ' ' + s.hora_inicio.slice(0, 5) + ' ' + s.playa
  })));
}

async function cargarMonitores() {
  const { data, error } = await cliente.from('monitor').select('dni_monitor, nombre').order('nombre');
  if (error) {
    mostrarMensaje('mensaje-asignar', 'No se pudieron cargar los monitores: ' + error.message, true);
    return;
  }
  rellenarSelector('asignar-monitor', data.map((m) => ({
    valor: m.dni_monitor,
    texto: m.nombre + ' (' + m.dni_monitor + ')'
  })));
}

// PARTE 6: iniciar y cerrar sesión
document.getElementById('form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const { error } = await cliente.auth.signInWithPassword({
    email: document.getElementById('correo').value,
    password: document.getElementById('clave').value
  });
  document.getElementById('clave').value = '';
  mostrarMensaje('mensaje-login', error ? 'No se pudo iniciar sesión: ' + error.message : '', true);
});

document.getElementById('btn-salir').addEventListener('click', () => cliente.auth.signOut());

// Enseña u oculta el formulario según haya o no sesión iniciada
function actualizarVista(sesionAuth) {
  const habiaUsuario = hayUsuario;
  hayUsuario = sesionAuth !== null;
  document.getElementById('zona-login').hidden = hayUsuario;
  document.getElementById('zona-formulario').hidden = !hayUsuario;
  document.getElementById('col-plazas').hidden = !hayUsuario;
  document.getElementById('zona-monitores').hidden = !hayUsuario;
  document.getElementById('usuario').textContent = hayUsuario ? sesionAuth.user.email : '';
  // Al entrar o salir cambia lo que se puede ver, así que se recarga la lista
  if (habiaUsuario !== hayUsuario) {
    cargarSesiones();
    if (hayUsuario) cargarMonitores();
  }
}
cliente.auth.onAuthStateChange((_evento, sesionAuth) => actualizarVista(sesionAuth));

// PARTE 7: añadir una sesión nueva
document.getElementById('form-sesion').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const { error } = await cliente.from('sesion').insert({
    fecha: document.getElementById('fecha').value,
    hora_inicio: document.getElementById('hora').value,
    playa: document.getElementById('playa').value.trim(),
    nivel: document.getElementById('nivel').value,
    duracion: Number(document.getElementById('duracion').value)
  });
  if (error) {
    mostrarMensaje('mensaje-form', 'No se pudo añadir: ' + error.message, true);
    return;
  }
  mostrarMensaje('mensaje-form', 'Sesión añadida.', false);
  evento.target.reset();
  cargarSesiones();
});

// PARTE 8: añadir un monitor nuevo
document.getElementById('form-monitor').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const telefono = document.getElementById('monitor-telefono').value.trim();
  const { error } = await cliente.from('monitor').insert({
    dni_monitor: document.getElementById('monitor-dni').value.trim(),
    nombre: document.getElementById('monitor-nombre').value.trim(),
    edad: Number(document.getElementById('monitor-edad').value),
    telefono: telefono === '' ? null : telefono
  });
  if (error) {
    const texto = error.code === '23505' ? 'Ya existe un monitor con ese DNI.' : error.message;
    mostrarMensaje('mensaje-monitor', 'No se pudo añadir: ' + texto, true);
    return;
  }
  mostrarMensaje('mensaje-monitor', 'Monitor añadido.', false);
  evento.target.reset();
  cargarMonitores();
});

// PARTE 9: asignar un monitor a una sesión (tabla imparte)
document.getElementById('form-asignar').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const { error } = await cliente.from('imparte').insert({
    id_sesion: Number(document.getElementById('asignar-sesion').value),
    dni_monitor: document.getElementById('asignar-monitor').value
  });
  if (error) {
    // 23505 = ese monitor ya estaba en esa sesión; el límite de 3 monitores lo avisa la base de datos
    const texto = error.code === '23505' ? 'Ese monitor ya está asignado a esa sesión.' : error.message;
    mostrarMensaje('mensaje-asignar', 'No se pudo asignar: ' + texto, true);
    return;
  }
  mostrarMensaje('mensaje-asignar', 'Monitor asignado.', false);
  cargarSesiones();
});

cargarSesiones();
