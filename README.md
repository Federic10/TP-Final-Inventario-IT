# TP Final

**Alumno:** Federico Fabián Silva  
**Proyecto:** Inventario IT  
**Lenguaje:** Python 3.10 o superior  
**Base de datos:** SQLite

Aplicación web local para registrar equipos informáticos y asignarlos a sectores. Permite realizar altas, consultas, modificaciones y bajas de equipos y sectores. Incluye búsqueda de equipos y filtro por estado.

## Cómo ejecutar

1. Instalar Python 3.10 o superior, con soporte para SQLite (incluido en la instalación habitual de Python para Windows). En Windows, marcar la opción para agregar Python al PATH.
2. Extraer el proyecto en una carpeta.
3. Abrir una terminal dentro de esa carpeta y ejecutar:

```bash
python src/app.py
```

En Linux o macOS puede ser necesario usar `python3` en lugar de `python`.
En Windows también se puede ejecutar `iniciar.bat`.

4. Abrir http://127.0.0.1:8000 en un navegador actualizado.
5. Crear un sector desde la pestaña **Sectores**.
6. Volver a **Equipos** y registrar el primer equipo.

Para detener el programa, presionar `Ctrl+C` en la terminal. No requiere paquetes de pip, internet ni un servidor de base de datos independiente. La aplicación comienza vacía para que se puedan cargar datos propios.

Si el puerto está ocupado:

```bash
python src/app.py --port 8080
```

En ese caso, abrir http://127.0.0.1:8080.

## Funciones

- CRUD de sectores.
- CRUD de equipos, con inventario único, nombre, tipo, estado, sector y observaciones.
- Consulta individual de registros mediante la API.
- Búsqueda por inventario, nombre o sector y filtro por estado.
- Cantidad de equipos, equipos operativos y sectores.
- Validación de campos y mensajes de error.
- Protección de la relación: no se permite borrar sectores con equipos asignados.
- Persistencia en un archivo SQLite que se conserva al cerrar el programa.

## Estructura de entrega

| Carpeta o archivo | Contenido |
| --- | --- |
| `src/app.py` | Inicio del servidor y rutas HTTP |
| `src/models/inventario.py` | Modelo: acceso a SQLite y consultas SQL |
| `src/controllers/inventario.py` | Controlador: validaciones y operaciones del CRUD |
| `src/views/index.html` | Vista: interfaz HTML |
| `src/static/` | Estilos y JavaScript que consume la API |
| `dbf/estructura.sql` | Estructura de las dos tablas y su relación |
| `dist/README.md` | Aclaración sobre ejecutables |
| `tests/test_api.py` | Pruebas automáticas de integración |
| `docs/GUIA.md` | Explicación del proyecto y recorrido para la demostración |

## Base de datos y relación

Un sector puede tener muchos equipos. Cada equipo pertenece a un único sector.

| Tabla | Campos |
| --- | --- |
| `sectores` | `id` (PK), `nombre` (único) |
| `equipos` | `id` (PK), `inventario` (único), `nombre`, `tipo`, `estado`, `sector_id` (FK), `observaciones` |

La clave foránea `equipos.sector_id` referencia `sectores.id` con `ON DELETE RESTRICT`. La API activa `PRAGMA foreign_keys = ON` en cada conexión. Los listados de equipos usan un `JOIN` para mostrar el nombre del sector.

El archivo `dbf/estructura.sql` se ejecuta automáticamente al iniciar y crea las tablas si todavía no existen. Los datos se guardan en `data/inventario.db`. Para hacer una copia de respaldo, detener la aplicación y copiar ese archivo. El archivo de datos no se incluye en el repositorio.

## API HTTP

La interfaz consume una API local mediante `fetch`. Para enviar datos se utiliza `Content-Type: application/json`.

| Método | Sectores | Equipos | Acción |
| --- | --- | --- | --- |
| GET | `/api/sectores` | `/api/equipos` | Listar |
| GET | `/api/sectores/1` | `/api/equipos/1` | Consultar uno |
| POST | `/api/sectores` | `/api/equipos` | Crear |
| PUT | `/api/sectores/1` | `/api/equipos/1` | Modificar todos los campos editables |
| DELETE | `/api/sectores/1` | `/api/equipos/1` | Eliminar |

Ejemplo para crear un sector:

```json
{"nombre": "Sistemas"}
```

Ejemplo para crear un equipo, usando un `sector_id` existente:

```json
{
  "inventario": "IT-001",
  "nombre": "PC-SISTEMAS-01",
  "tipo": "PC",
  "estado": "Operativo",
  "sector_id": 1,
  "observaciones": "Equipo de prueba"
}
```

Respuestas: `200` consulta/modificación/baja; `201` alta; `400` datos inválidos; `404` registro o ruta inexistente; `405` operación no admitida; `409` duplicado o sector con equipos; `413` cuerpo fuera del tamaño permitido; `415` formato distinto de JSON. Los errores se devuelven como `{"error": "Descripción"}`.

## Patrón MVC

- **Modelo:** consulta y modifica la base de datos.
- **Vista:** presenta los formularios y las tablas en el navegador.
- **Controlador:** valida los datos y coordina las operaciones del modelo.

`app.py` recibe las solicitudes HTTP, llama al controlador y envía las respuestas. El JavaScript de la vista actualiza la pantalla a partir del JSON recibido.

## Relación con la consigna

| Requisito | Implementación |
| --- | --- |
| CRUD sobre una base de datos | Altas, consultas, modificaciones y bajas en SQLite |
| API | API HTTP propia, consumida por la vista |
| MVC | Modelo, vista y controlador separados |
| Dos tablas relacionadas | Sectores y equipos, con clave foránea |
| Carpetas requeridas | `src`, `dbf` y `dist` |
| README | Título TP Final, alumno y descripción |

## Pruebas

Desde la carpeta principal:

```bash
python -m unittest discover -s tests -v
```

Las pruebas usan bases temporales y comprueban los dos CRUD, persistencia, duplicados, validaciones, relación entre tablas, errores HTTP y archivos servidos. No alteran los datos de uso.

## Subir a GitHub

Crear un repositorio vacío llamado `TP-Final-Inventario-IT`, sin agregar README desde GitHub. Desde la terminal de la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Agregar TP Final de inventario IT"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TP-Final-Inventario-IT.git
git push -u origin main
```

Reemplazar `TU_USUARIO` por el usuario real. También se pueden cargar los archivos desde **Add file → Upload files**, conservando las carpetas. Subir el contenido extraído, no solamente el ZIP. Verificar que `README.md`, `src`, `dbf` y `dist` estén en la raíz del repositorio y entregar su enlace. Si se usa un repositorio privado, dar acceso al docente según su indicación.

## Alcance

Proyecto académico de uso local. Escucha únicamente en `127.0.0.1`, sin autenticación ni despliegue público. Usa el servidor HTTP incluido en Python y no genera un ejecutable compilado. Se excluyen del repositorio la base de datos y los archivos temporales.
