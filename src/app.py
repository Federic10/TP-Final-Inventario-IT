"""Servidor local: rutas HTTP, archivos de la vista y respuestas JSON."""
import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from controllers.inventario import Controlador, ErrorAPI
from models.inventario import Inventario

SRC = Path(__file__).resolve().parent


def crear_servidor(database, port=8000):
    controlador = Controlador(Inventario(database))

    class Handler(BaseHTTPRequestHandler):
        def responder(self, status, contenido, tipo='application/json; charset=utf-8'):
            if tipo.startswith('application/json'):
                contenido = json.dumps(contenido, ensure_ascii=False).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', tipo)
            self.send_header('Content-Length', str(len(contenido)))
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(contenido)

        def procesar(self):
            ruta = urlsplit(self.path).path
            archivos = {
                '/': (SRC / 'views' / 'index.html', 'text/html; charset=utf-8'),
                '/static/app.js': (SRC / 'static' / 'app.js', 'text/javascript; charset=utf-8'),
                '/static/style.css': (SRC / 'static' / 'style.css', 'text/css; charset=utf-8')
            }
            if ruta in archivos and self.command == 'GET':
                archivo, tipo = archivos[ruta]
                self.responder(200, archivo.read_bytes(), tipo)
                return
            try:
                partes = ruta.strip('/').split('/')
                if len(partes) not in (2, 3) or partes[0] != 'api':
                    raise ErrorAPI('Ruta inexistente.', 404)
                identificador = None
                if len(partes) == 3:
                    if not partes[2].isascii() or not partes[2].isdigit() or len(partes[2]) > 9:
                        raise ErrorAPI('Identificador inválido.', 400)
                    identificador = int(partes[2])
                datos = None
                if self.command in ('POST', 'PUT'):
                    if self.headers.get_content_type() != 'application/json':
                        raise ErrorAPI('Se requiere Content-Type: application/json.', 415)
                    try:
                        longitud = int(self.headers.get('Content-Length', '0'))
                        if not 0 < longitud <= 16384:
                            raise ErrorAPI('El cuerpo debe tener entre 1 y 16384 bytes.', 413)
                        datos = json.loads(self.rfile.read(longitud))
                    except (ValueError, UnicodeDecodeError) as error:
                        raise ErrorAPI('JSON inválido.') from error
                status, resultado = controlador.procesar(self.command, partes[1], identificador, datos)
                self.responder(status, resultado)
            except ErrorAPI as error:
                self.responder(error.status, {'error': str(error)})

        do_GET = procesar
        do_POST = procesar
        do_PUT = procesar
        do_DELETE = procesar

    return ThreadingHTTPServer(('127.0.0.1', port), Handler)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Inventario IT - TP Final')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--db', type=Path, default=SRC.parent / 'data' / 'inventario.db')
    args = parser.parse_args()
    servidor = crear_servidor(args.db, args.port)
    print(f'Inventario IT: http://127.0.0.1:{servidor.server_port}', flush=True)
    print('Para detener el servidor: Ctrl+C', flush=True)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        servidor.server_close()
