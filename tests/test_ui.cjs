// Prueba del recorrido completo en Chromium, usando una base temporal.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm, mkdir } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

(async () => {
  const temporal = await mkdtemp(path.join(os.tmpdir(), 'inventario-ui-'));
  const root = path.resolve(__dirname, '..');
  const url = 'http://127.0.0.1:8765';
  let servidor;
  let browser;
  let page;
  const errores = [];
  async function iniciar() {
    servidor = spawn(process.env.PYTHON || 'python', [path.join(root, 'src/app.py'), '--port', '8765', '--db', path.join(temporal, 'prueba.db')]);
    servidor.stderr.on('data', data => process.stdout.write(data));
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('El servidor no inició.')), 15000);
      servidor.once('error', error => { clearTimeout(timer); reject(error); });
      servidor.once('exit', code => { clearTimeout(timer); reject(new Error('El servidor terminó: ' + code)); });
      servidor.stdout.on('data', data => {
        if (data.toString().includes(url)) { clearTimeout(timer); resolve(); }
      });
    });
  }
  async function detener() {
    if (servidor && servidor.exitCode === null) {
      const fin = once(servidor, 'exit');
      servidor.kill();
      await fin;
    }
  }
  async function contador(id, valor) {
    await page.waitForFunction(([selector, esperado]) => document.querySelector(selector).textContent === esperado, [id, String(valor)]);
  }
  async function guardar(tipo) {
    const request = page.waitForResponse(r => /\/api\/(equipos|sectores)/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()));
    await page.getByRole('button', { name: 'Guardar ' + tipo, exact: true }).click();
    return request;
  }
  async function crearSector(nombre, cantidad) {
    await page.getByRole('button', { name: 'Sectores', exact: true }).click();
    await page.getByRole('button', { name: '+ Nuevo sector', exact: true }).click();
    await page.locator('#form-sector [name=nombre]').fill(nombre);
    assert.equal((await guardar('sector')).status(), 201);
    await page.locator('#dialogo-sector').waitFor({ state: 'hidden' });
    await contador('#total-sectores', cantidad);
  }
  try {
    await iniciar();
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errores.push(error.message));
    await page.goto(url);
    await page.getByText('Todavía no hay equipos. Creá un sector y registrá el primero.').waitFor();
    await page.getByRole('button', { name: '+ Nuevo equipo', exact: true }).click();
    await page.getByText('Primero creá un sector en la pestaña Sectores.').waitFor();
    await crearSector('Sistemas', 1);
    await crearSector('Administración', 2);
    console.log('OK: inicio vacío y alta de sectores.');

    await page.getByRole('button', { name: 'Equipos', exact: true }).click();
    await page.getByRole('button', { name: '+ Nuevo equipo', exact: true }).click();
    await page.locator('#form-equipo [name=inventario]').fill('IT-001');
    await page.locator('#form-equipo [name=nombre]').fill('PC-SISTEMAS-01');
    await page.locator('#form-equipo [name=sector_id]').selectOption({ label: 'Sistemas' });
    await page.locator('#form-equipo [name=observaciones]').fill('Revisión técnica: RAM 16 GB.');
    assert.equal((await guardar('equipo')).status(), 201);
    await page.locator('#dialogo-equipo').waitFor({ state: 'hidden' });
    await contador('#total', 1);
    await contador('#operativos', 1);
    console.log('OK: alta de equipo y contadores.');

    await page.getByRole('button', { name: '+ Nuevo equipo', exact: true }).click();
    await page.locator('#form-equipo [name=inventario]').fill('it-001');
    await page.locator('#form-equipo [name=nombre]').fill('DUPLICADO');
    assert.equal((await guardar('equipo')).status(), 409);
    await page.locator('#form-equipo .error-form').getByText('Ya existe un registro con ese inventario o nombre de sector.').waitFor();
    await page.locator('#dialogo-equipo .cancelar').click();
    await contador('#total', 1);
    console.log('OK: duplicado rechazado con mensaje visible.');

    await page.getByRole('button', { name: 'Editar PC-SISTEMAS-01', exact: true }).click();
    assert.equal(await page.locator('#form-equipo [name=observaciones]').inputValue(), 'Revisión técnica: RAM 16 GB.');
    await page.locator('#form-equipo [name=estado]').selectOption('En reparación');
    await page.locator('#form-equipo [name=sector_id]').selectOption({ label: 'Administración' });
    assert.equal((await guardar('equipo')).status(), 200);
    await page.locator('#dialogo-equipo').waitFor({ state: 'hidden' });
    await contador('#operativos', 0);
    await page.locator('#equipos').getByText('Administración', { exact: true }).waitFor();
    await page.locator('#equipos').getByText('En reparación', { exact: true }).waitFor();
    console.log('OK: edición, reasignación y actualización de estado.');

    await page.locator('#buscar').fill('NO EXISTE');
    await page.getByText('No hay equipos que coincidan con la búsqueda.').waitFor();
    await page.locator('#buscar').fill('it-001');
    await page.getByRole('button', { name: 'Editar PC-SISTEMAS-01', exact: true }).waitFor();
    await page.locator('#buscar').fill('');
    await page.locator('#filtro-estado').selectOption('Operativo');
    await page.getByText('No hay equipos que coincidan con la búsqueda.').waitFor();
    await page.locator('#filtro-estado').selectOption('En reparación');
    await page.getByRole('button', { name: 'Editar PC-SISTEMAS-01', exact: true }).waitFor();
    await page.locator('#filtro-estado').selectOption('');
    console.log('OK: búsqueda y filtros.');

    await page.getByRole('button', { name: 'Sectores', exact: true }).click();
    await page.getByRole('button', { name: 'Editar Administración', exact: true }).click();
    await page.locator('#form-sector [name=nombre]').fill('Gestión');
    assert.equal((await guardar('sector')).status(), 200);
    await page.locator('#dialogo-sector').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Editar Gestión', exact: true }).waitFor();
    page.once('dialog', dialog => dialog.accept());
    const bloqueado = page.waitForResponse(r => r.request().method() === 'DELETE');
    await page.getByRole('button', { name: 'Eliminar Gestión', exact: true }).click();
    assert.equal((await bloqueado).status(), 409);
    await page.getByText('No se puede eliminar un sector con equipos asignados.').waitFor();
    console.log('OK: renombrado de sector e integridad referencial.');

    await detener();
    await iniciar();
    await page.reload();
    await contador('#total', 1);
    await contador('#total-sectores', 2);
    await page.locator('#equipos').getByText('Gestión', { exact: true }).waitFor();
    await page.locator('#equipos').getByText('En reparación', { exact: true }).waitFor();
    console.log('OK: datos conservados tras reiniciar el servidor.');

    await mkdir(path.join(root, 'test-results'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'test-results/escritorio.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'La página no debe desbordar en móvil.');
    await page.getByRole('button', { name: 'Editar PC-SISTEMAS-01', exact: true }).click();
    await page.locator('#dialogo-equipo').waitFor();
    await page.screenshot({ path: path.join(root, 'test-results/movil.png'), fullPage: true });
    await page.locator('#dialogo-equipo .cancelar').click();
    console.log('OK: vista de escritorio y formulario móvil.');

    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Eliminar PC-SISTEMAS-01', exact: true }).click();
    await contador('#total', 1);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Eliminar PC-SISTEMAS-01', exact: true }).click();
    await contador('#total', 0);
    await page.getByRole('button', { name: 'Sectores', exact: true }).click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Eliminar Gestión', exact: true }).click();
    await contador('#total-sectores', 1);
    console.log('OK: cancelación de eliminación y bajas de equipo y sector.');
    assert.deepEqual(errores, [], 'No debe haber excepciones de JavaScript.');
    console.log('PRUEBA DE INTERFAZ COMPLETA: APROBADA.');
  } catch (error) {
    if (page) {
      await mkdir(path.join(root, 'test-results'), { recursive: true });
      await page.screenshot({ path: path.join(root, 'test-results/error.png'), fullPage: true }).catch(() => {});
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    await detener();
    await rm(temporal, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
