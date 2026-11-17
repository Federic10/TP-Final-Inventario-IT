# TP Final

**Alumno:** Federico Fabián Silva  
**Proyecto:** Inventario IT

Aplicación para llevar un inventario de equipos informáticos y organizarlos por sector. Está desarrollada con Python, SQLite, HTML, CSS y JavaScript.

## Funciones

- Agregar, consultar, editar y eliminar equipos y sectores.
- Buscar equipos por inventario, nombre o sector.
- Filtrar por estado: operativo, en reparación o de baja.
- Evitar números de inventario repetidos y la eliminación de sectores con equipos asignados.

## Cómo ejecutarlo

Se necesita Python 3.10 o superior. Desde la carpeta del proyecto, ejecutar:

```bash
python src/app.py
```

Después abrir [http://127.0.0.1:8000](http://127.0.0.1:8000) en el navegador. En Windows también se puede iniciar con `iniciar.bat`.

Primero hay que crear un sector y después cargar los equipos. La base de datos se crea automáticamente en `data/inventario.db` y conserva los datos al cerrar el programa. Para detenerlo, presionar `Ctrl+C` en la terminal.

## Organización

| Carpeta | Contenido |
| --- | --- |
| `src` | Código fuente, separado en modelo, vista y controlador |
| `dbf` | Archivo SQL con la estructura de las tablas |
| `dist` | Aclaración sobre la ejecución con Python |
| `tests` | Pruebas de la API |
| `docs` | Guía de funcionamiento |

La base tiene dos tablas relacionadas: `sectores` y `equipos`. Cada equipo pertenece a un sector. La interfaz se comunica con una API HTTP propia para realizar las operaciones del CRUD.

## Pruebas

```bash
python -m unittest discover -s tests -v
```
