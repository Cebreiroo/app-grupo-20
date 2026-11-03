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

  if (error) {
    document.getElementById('lista').replaceChildren();
    mostrarMensaje('mensaje-lista', 'No se pudieron cargar las sesiones: ' + error.message, true);
    return;
  }
  sesionesCargadas = data;
  if (hayUsuario) rellenarSelectorSesiones(data);
  pintarSesiones();
}

// Guarda las sesiones recibidas para poder filtrarlas sin volver a pedirlas a Supabase
let sesionesCargadas = [];

// Devuelve solo las sesiones que cumplen los filtros que haya rellenados
function sesionesFiltradas() {
  const nivel = document.getElementById('filtro-nivel').value;
  const playa = document.getElementById('filtro-playa').value.trim().toLowerCase();
  const fecha = document.getElementById('filtro-fecha').value;
  return sesionesCargadas.filter((s) =>
    (nivel === '' || s.nivel === nivel) &&
    (playa === '' || s.playa.toLowerCase().includes(playa)) &&
    (fecha === '' || s.fecha === fecha)
  );
}

function pintarSesiones() {
  const lista = document.getElementById('lista');
  lista.replaceChildren();
  const sesiones = sesionesFiltradas();

  if (sesionesCargadas.length === 0) {
    mostrarMensaje('mensaje-lista', 'Todavía no hay sesiones.', false);
  } else if (sesiones.length === 0) {
    mostrarMensaje('mensaje-lista', 'Ninguna sesión cumple los filtros.', false);
  } else {
    mostrarMensaje('mensaje-lista', '', false);
  }

  for (const sesion of sesiones) {
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
    if (hayUsuario) {
      const celdaDetalle = document.createElement('td');
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.textContent = 'Ver';
      boton.addEventListener('click', () => mostrarDetalle(sesion));
      celdaDetalle.appendChild(boton);
      fila.appendChild(celdaDetalle);
    }
    lista.appendChild(fila);
  }
}

// PARTE 5c: detalle de una sesión con sus monitores y alumnos
function rellenarLista(idLista, textos, textoVacio) {
  const lista = document.getElementById(idLista);
  lista.replaceChildren();
  for (const texto of (textos.length > 0 ? textos : [textoVacio])) {
    const elemento = document.createElement('li');
    elemento.textContent = texto;
    lista.appendChild(elemento);
  }
}

async function mostrarDetalle(sesion) {
  // imparte(monitor(...)) significa: de cada fila de imparte, trae también los datos de su monitor
  const { data, error } = await cliente
    .from('sesion')
    .select('id_sesion, imparte(monitor(nombre, dni_monitor)), inscripcion(alumno(nombre, dni))')
    .eq('id_sesion', sesion.id_sesion)
    .single();
  if (error) {
    mostrarMensaje('mensaje-lista', 'No se pudo cargar el detalle: ' + error.message, true);
    return;
  }
  document.getElementById('detalle-resumen').textContent =
    sesion.fecha + ' ' + sesion.hora_inicio.slice(0, 5) + ' en ' + sesion.playa +
    ' (nivel ' + (sesion.nivel ?? '-') + ', ' + sesion.duracion + ' min)';
  rellenarLista('detalle-monitores',
    data.imparte.map((i) => i.monitor.nombre + ' (' + i.monitor.dni_monitor + ')'),
    'Todavía no hay monitores asignados.');
  rellenarLista('detalle-alumnos',
    data.inscripcion.map((i) => i.alumno.nombre + ' (' + i.alumno.dni + ')'),
    'Todavía no hay alumnos inscritos.');
  document.getElementById('detalle-sesion').hidden = false;
}

document.getElementById('btn-cerrar-detalle').addEventListener('click', () => {
  document.getElementById('detalle-sesion').hidden = true;
});

// Cada vez que cambia un filtro se vuelve a pintar la tabla
for (const id of ['filtro-nivel', 'filtro-playa', 'filtro-fecha']) {
  document.getElementById(id).addEventListener('input', pintarSesiones);
}
document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
  document.getElementById('filtro-nivel').value = '';
  document.getElementById('filtro-playa').value = '';
  document.getElementById('filtro-fecha').value = '';
  pintarSesiones();
});

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
  document.getElementById('col-detalle').hidden = !hayUsuario;
  if (!hayUsuario) document.getElementById('detalle-sesion').hidden = true;
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
