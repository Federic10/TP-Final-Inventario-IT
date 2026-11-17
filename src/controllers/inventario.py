"""Controlador: valida entradas y decide la respuesta de la API."""
import sqlite3


class ErrorAPI(Exception):
    def __init__(self, mensaje, status=400):
        super().__init__(mensaje)
        self.status = status


def texto(datos, campo, limite, obligatorio=True):
    valor = datos.get(campo, '')
    if not isinstance(valor, str):
        raise ErrorAPI(f'{campo}: debe ser texto.')
    valor = valor.strip()
    if (obligatorio and not valor) or len(valor) > limite:
        raise ErrorAPI(f'{campo}: completá el campo (máximo {limite} caracteres).')
    return valor


class Controlador:
    def __init__(self, modelo):
        self.modelo = modelo

    def validar(self, recurso, datos):
        if not isinstance(datos, dict):
            raise ErrorAPI('El cuerpo debe ser un objeto JSON.')
        resultado = {'nombre': texto(datos, 'nombre', 80)}
        if recurso == 'equipos':
            resultado.update({
                'inventario': texto(datos, 'inventario', 40),
                'tipo': texto(datos, 'tipo', 30),
                'estado': texto(datos, 'estado', 30),
                'observaciones': texto(datos, 'observaciones', 500, False)
            })
            if resultado['tipo'] not in ('PC', 'Notebook', 'Servidor', 'Impresora', 'Otro'):
                raise ErrorAPI('Tipo de equipo inválido.')
            if resultado['estado'] not in ('Operativo', 'En reparación', 'De baja'):
                raise ErrorAPI('Estado inválido.')
            sector = datos.get('sector_id')
            if type(sector) is not int or sector < 1:
                raise ErrorAPI('Seleccioná un sector válido.')
            if not self.modelo.listar('sectores', sector):
                raise ErrorAPI('El sector no existe.')
            resultado['sector_id'] = sector
        return resultado

    def procesar(self, metodo, recurso, identificador=None, datos=None):
        if recurso not in ('equipos', 'sectores'):
            raise ErrorAPI('Recurso inexistente.', 404)
        if metodo == 'GET':
            resultado = self.modelo.listar(recurso, identificador)
            if identificador is not None and not resultado:
                raise ErrorAPI('Registro inexistente.', 404)
            return 200, resultado[0] if identificador is not None else resultado
        if metodo == 'POST' and identificador is not None:
            raise ErrorAPI('POST requiere la URL de la colección.', 405)
        if metodo in ('PUT', 'DELETE') and identificador is None:
            raise ErrorAPI('Falta el identificador del registro.', 405)
        if metodo not in ('POST', 'PUT', 'DELETE'):
            raise ErrorAPI('Método no permitido.', 405)
        try:
            if metodo == 'DELETE':
                if not self.modelo.eliminar(recurso, identificador):
                    raise ErrorAPI('Registro inexistente.', 404)
                return 200, {'mensaje': 'Registro eliminado.'}
            if metodo == 'PUT' and not self.modelo.listar(recurso, identificador):
                raise ErrorAPI('Registro inexistente.', 404)
            resultado = self.modelo.guardar(recurso, self.validar(recurso, datos), identificador)
            return (201 if metodo == 'POST' else 200), resultado
        except sqlite3.IntegrityError as error:
            if 'UNIQUE' in str(error):
                mensaje = 'Ya existe un registro con ese inventario o nombre de sector.'
            elif 'FOREIGN KEY' in str(error):
                mensaje = 'No se puede eliminar un sector con equipos asignados.'
            else:
                mensaje = 'Los datos no cumplen las restricciones de la base.'
            raise ErrorAPI(mensaje, 409) from error
