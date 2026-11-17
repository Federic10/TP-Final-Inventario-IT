"""Pruebas HTTP con una base temporal: no modifican los datos de uso."""
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from app import crear_servidor


class APITest(unittest.TestCase):
    def setUp(self):
        self.temporal = tempfile.TemporaryDirectory()
        self.db = Path(self.temporal.name) / 'test.db'
        self.servidor = crear_servidor(self.db, 0)
        self.hilo = threading.Thread(target=self.servidor.serve_forever, daemon=True)
        self.hilo.start()
        self.url = f'http://127.0.0.1:{self.servidor.server_port}'

    def tearDown(self):
        self.servidor.shutdown()
        self.servidor.server_close()
        self.hilo.join()
        self.temporal.cleanup()

    def pedir(self, ruta, metodo='GET', datos=None):
        contenido = json.dumps(datos).encode() if datos is not None else None
        req = Request(self.url + ruta, data=contenido, method=metodo,
                      headers={'Content-Type': 'application/json'})
        try:
            respuesta = urlopen(req, timeout=5)
        except HTTPError as error:
            respuesta = error
        with respuesta:
            return respuesta.status, json.loads(respuesta.read())

    def sector(self):
        return self.pedir('/api/sectores', 'POST', {'nombre': 'Sistemas'})[1]['id']

    def equipo(self, sector):
        return {'inventario': 'IT-001', 'nombre': 'PC-01', 'tipo': 'PC',
                'estado': 'Operativo', 'sector_id': sector, 'observaciones': ''}

    def test_crud_sectores(self):
        status, registro = self.pedir('/api/sectores', 'POST', {'nombre': 'Sistemas'})
        self.assertEqual(status, 201)
        ruta = f"/api/sectores/{registro['id']}"
        self.assertEqual(self.pedir(ruta)[1]['nombre'], 'Sistemas')
        self.assertEqual(self.pedir(ruta, 'PUT', {'nombre': 'Soporte'})[1]['nombre'], 'Soporte')
        self.assertEqual(len(self.pedir('/api/sectores')[1]), 1)
        self.assertEqual(self.pedir(ruta, 'DELETE')[0], 200)
        self.assertEqual(self.pedir(ruta)[0], 404)

    def test_crud_equipos_y_persistencia(self):
        datos = self.equipo(self.sector())
        status, equipo = self.pedir('/api/equipos', 'POST', datos)
        self.assertEqual(status, 201)
        ruta = f"/api/equipos/{equipo['id']}"
        self.assertEqual(self.pedir(ruta)[1]['sector'], 'Sistemas')
        datos['estado'] = 'En reparación'
        self.assertEqual(self.pedir(ruta, 'PUT', datos)[1]['estado'], 'En reparación')
        from models.inventario import Inventario
        self.assertEqual(Inventario(self.db).listar('equipos')[0]['estado'], 'En reparación')
        self.assertEqual(self.pedir(ruta, 'DELETE')[0], 200)
        self.assertEqual(self.pedir('/api/equipos')[1], [])

    def test_sector_con_equipos_no_se_borra(self):
        sector = self.sector()
        self.pedir('/api/equipos', 'POST', self.equipo(sector))
        self.assertEqual(self.pedir(f'/api/sectores/{sector}', 'DELETE')[0], 409)
        self.assertEqual(len(self.pedir('/api/sectores')[1]), 1)

    def test_duplicados_sin_distinguir_mayusculas(self):
        sector = self.sector()
        self.assertEqual(self.pedir('/api/sectores', 'POST', {'nombre': 'sistemas'})[0], 409)
        datos = self.equipo(sector)
        self.pedir('/api/equipos', 'POST', datos)
        datos['inventario'] = 'it-001'
        self.assertEqual(self.pedir('/api/equipos', 'POST', datos)[0], 409)

    def test_validacion_y_relacion(self):
        for datos in ({}, [], {'nombre': 3}, {'nombre': '  '}, {'nombre': 'x' * 81}):
            self.assertEqual(self.pedir('/api/sectores', 'POST', datos)[0], 400)
        datos = self.equipo(999)
        self.assertEqual(self.pedir('/api/equipos', 'POST', datos)[0], 400)
        datos['sector_id'] = self.sector()
        for campo, valor in [('tipo', 'Inválido'), ('estado', 'Error'), ('sector_id', True), ('observaciones', 'x' * 501)]:
            invalido = dict(datos, **{campo: valor})
            self.assertEqual(self.pedir('/api/equipos', 'POST', invalido)[0], 400)
        self.assertEqual(self.pedir('/api/equipos')[1], [])

    def test_rutas_y_registros_inexistentes(self):
        self.assertEqual(self.pedir('/api/otra')[0], 404)
        self.assertEqual(self.pedir('/api/equipos/abc')[0], 400)
        self.assertEqual(self.pedir('/api/equipos/999')[0], 404)
        self.assertEqual(self.pedir('/api/sectores/999', 'PUT', {'nombre': 'Otro'})[0], 404)
        self.assertEqual(self.pedir('/api/sectores/999', 'DELETE')[0], 404)
        self.assertEqual(self.pedir('/api/sectores', 'DELETE')[0], 405)
        self.assertEqual(self.pedir('/api/sectores/1', 'POST', {'nombre': 'Otro'})[0], 405)

    def test_json_malformado(self):
        req = Request(self.url + '/api/sectores', data=b'{error', method='POST',
                      headers={'Content-Type': 'application/json'})
        with self.assertRaises(HTTPError) as error:
            urlopen(req, timeout=5)
        self.assertEqual(error.exception.code, 400)
        error.exception.close()

    def test_vista_y_archivos_privados(self):
        for ruta in ['/', '/static/app.js', '/static/style.css']:
            with urlopen(self.url + ruta, timeout=5) as respuesta:
                self.assertEqual(respuesta.status, 200)
                self.assertGreater(len(respuesta.read()), 100)
        self.assertEqual(self.pedir('/data/inventario.db')[0], 404)
        self.assertEqual(self.pedir('/src/app.py')[0], 404)


if __name__ == '__main__':
    unittest.main()
