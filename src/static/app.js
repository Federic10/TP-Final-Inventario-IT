'use strict';
const $ = (selector) => document.querySelector(selector);
let equipos = [];
let sectores = [];

async function api(ruta, metodo = 'GET', datos) {
  const opciones = { method: metodo };
  if (datos !== undefined) {
    opciones.headers = { 'Content-Type': 'application/json' };
    opciones.body = JSON.stringify(datos);
  }
  const respuesta = await fetch('/api/' + ruta, opciones);
  const resultado = await respuesta.json();
  if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo completar la operación.');
  return resultado;
}

function mensaje(texto, error = false) {
  $('#mensaje').hidden = false;
  $('#mensaje').textContent = texto;
  $('#mensaje').className = error ? 'error' : 'exito';
}

function celda(fila, valor) {
  const td = document.createElement('td');
  td.textContent = valor;
  fila.append(td);
  return td;
}

function botones(fila, recurso, registro) {
  const td = document.createElement('td');
  td.className = 'botones';
  for (const accion of ['Editar', 'Eliminar']) {
    const boton = document.createElement('button');
    boton.textContent = accion;
    boton.className = accion === 'Eliminar' ? 'peligro' : 'secundario';
    boton.setAttribute('aria-label', `${accion} ${registro.nombre}`);
    boton.onclick = () => accion === 'Editar' ? abrir(recurso, registro) : eliminar(recurso, registro);
    td.append(boton);
  }
  fila.append(td);
}

function vacio(cuerpo, columnas, texto) {
  if (!cuerpo.children.length) {
    const td = celda(cuerpo.appendChild(document.createElement('tr')), texto);
    td.colSpan = columnas;
    td.className = 'vacio';
  }
}

function renderizar() {
  $('#total').textContent = equipos.length;
  $('#operativos').textContent = equipos.filter(e => e.estado === 'Operativo').length;
  $('#total-sectores').textContent = sectores.length;
  const busqueda = $('#buscar').value.trim().toLocaleLowerCase();
  const estado = $('#filtro-estado').value;
  $('#equipos').replaceChildren();
  for (const equipo of equipos.filter(e => (!estado || e.estado === estado) &&
    `${e.inventario} ${e.nombre} ${e.sector}`.toLocaleLowerCase().includes(busqueda))) {
    const fila = document.createElement('tr');
    for (const campo of ['inventario', 'nombre', 'tipo', 'sector']) celda(fila, equipo[campo]);
    const estadoCelda = celda(fila, '');
    const badge = document.createElement('span');
    badge.className = 'badge ' + (equipo.estado === 'Operativo' ? 'verde' : equipo.estado === 'En reparación' ? 'ambar' : 'gris');
    badge.textContent = equipo.estado;
    estadoCelda.append(badge);
    botones(fila, 'equipos', equipo);
    $('#equipos').append(fila);
  }
  vacio($('#equipos'), 6, equipos.length ? 'No hay equipos que coincidan con la búsqueda.' : 'Todavía no hay equipos. Creá un sector y registrá el primero.');
  $('#sectores').replaceChildren();
  for (const sector of sectores) {
    const fila = document.createElement('tr');
    celda(fila, sector.nombre);
    celda(fila, equipos.filter(e => e.sector_id === sector.id).length);
    botones(fila, 'sectores', sector);
    $('#sectores').append(fila);
  }
  vacio($('#sectores'), 3, 'Todavía no hay sectores. Agregá el primero.');
}

async function cargar() {
  [equipos, sectores] = await Promise.all([api('equipos'), api('sectores')]);
  renderizar();
}

function abrir(recurso, registro = {}) {
  const singular = recurso === 'equipos' ? 'equipo' : 'sector';
  if (recurso === 'equipos' && !sectores.length) {
    mensaje('Primero creá un sector en la pestaña Sectores.', true);
    return;
  }
  const form = $('#form-' + singular);
  form.reset();
  form.querySelector('.error-form').textContent = '';
  if (recurso === 'equipos') {
    $('#sector-equipo').replaceChildren();
    for (const sector of sectores) {
      const opcion = document.createElement('option');
      opcion.value = sector.id;
      opcion.textContent = sector.nombre;
      $('#sector-equipo').append(opcion);
    }
  }
  form.elements.id.value = '';
  for (const [campo, valor] of Object.entries(registro)) {
    if (form.elements.namedItem(campo)) form.elements.namedItem(campo).value = valor;
  }
  $('#titulo-' + singular).textContent = (registro.id ? 'Editar ' : 'Nuevo ') + singular;
  $('#dialogo-' + singular).showModal();
}

async function eliminar(recurso, registro) {
  if (!confirm(`¿Eliminar "${registro.nombre}"? Esta acción no se puede deshacer.`)) return;
  try {
    await api(`${recurso}/${registro.id}`, 'DELETE');
    await cargar();
    mensaje('Registro eliminado.');
  } catch (error) { mensaje(error.message, true); }
}

for (const singular of ['equipo', 'sector']) {
  const recurso = singular === 'equipo' ? 'equipos' : 'sectores';
  $('#nuevo-' + singular).onclick = () => abrir(recurso);
  $('#form-' + singular).onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const datos = Object.fromEntries(new FormData(form));
    const id = datos.id;
    delete datos.id;
    if (singular === 'equipo') datos.sector_id = Number(datos.sector_id);
    const boton = form.querySelector('[type="submit"]');
    boton.disabled = true;
    try {
      await api(recurso + (id ? '/' + id : ''), id ? 'PUT' : 'POST', datos);
      $('#dialogo-' + singular).close();
      await cargar();
      mensaje('Registro guardado.');
    } catch (error) { form.querySelector('.error-form').textContent = error.message; }
    finally { boton.disabled = false; }
  };
}
for (const boton of document.querySelectorAll('.cancelar')) boton.onclick = () => boton.closest('dialog').close();
for (const boton of document.querySelectorAll('[data-tab]')) boton.onclick = () => {
  for (const tab of document.querySelectorAll('[data-tab]')) tab.classList.toggle('activo', tab === boton);
  $('#panel-equipos').hidden = boton.dataset.tab !== 'equipos';
  $('#panel-sectores').hidden = boton.dataset.tab !== 'sectores';
};
$('#buscar').oninput = renderizar;
$('#filtro-estado').onchange = renderizar;
cargar().catch(error => mensaje('No se pudieron cargar los datos: ' + error.message, true));
