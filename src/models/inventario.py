"""Modelo: conexión SQLite y consultas parametrizadas."""
import sqlite3
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class Inventario:
    def __init__(self, database):
        self.database = Path(database)
        self.database.parent.mkdir(parents=True, exist_ok=True)
        with self.conexion() as db:
            db.executescript((ROOT / 'dbf' / 'estructura.sql').read_text(encoding='utf-8'))

    @contextmanager
    def conexion(self):
        db = sqlite3.connect(self.database)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys = ON')
        try:
            with db:
                yield db
        finally:
            db.close()

    def listar(self, recurso, identificador=None):
        # Los nombres de tablas son constantes; los datos van como parámetros.
        if recurso == 'equipos':
            sql = '''SELECT e.*, s.nombre AS sector FROM equipos e
                     JOIN sectores s ON s.id = e.sector_id'''
            alias = 'e'
        else:
            sql, alias = 'SELECT s.* FROM sectores s', 's'
        params = ()
        if identificador is not None:
            sql += f' WHERE {alias}.id = ?'
            params = (identificador,)
        sql += f' ORDER BY {alias}.id DESC'
        with self.conexion() as db:
            return [dict(row) for row in db.execute(sql, params).fetchall()]

    def guardar(self, recurso, datos, identificador=None):
        campos = ('nombre',) if recurso == 'sectores' else (
            'inventario', 'nombre', 'tipo', 'estado', 'sector_id', 'observaciones')
        valores = tuple(datos[campo] for campo in campos)
        with self.conexion() as db:
            if identificador is None:
                sql = f"INSERT INTO {recurso} ({', '.join(campos)}) VALUES ({', '.join('?' for _ in campos)})"
                identificador = db.execute(sql, valores).lastrowid
            else:
                sql = f"UPDATE {recurso} SET {', '.join(c + ' = ?' for c in campos)} WHERE id = ?"
                if db.execute(sql, valores + (identificador,)).rowcount == 0:
                    return None
        return self.listar(recurso, identificador)[0]

    def eliminar(self, recurso, identificador):
        with self.conexion() as db:
            return db.execute(f'DELETE FROM {recurso} WHERE id = ?', (identificador,)).rowcount > 0
