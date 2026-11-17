# Guía para entender y demostrar el proyecto

## El problema

El sistema lleva un registro sencillo de equipos informáticos. Cada equipo tiene un número de inventario, un nombre, un tipo, un estado y un sector. La elección del tema se relaciona con tareas habituales de soporte e infraestructura.

## Qué significa CRUD

| Operación | Acción en pantalla | Método de la API | SQL |
| --- | --- | --- | --- |
| Create | Nuevo equipo o sector | POST | INSERT |
| Read | Listado y búsqueda | GET | SELECT |
| Update | Editar | PUT | UPDATE |
| Delete | Eliminar | DELETE | DELETE |

## Qué pasa al guardar un equipo

1. El usuario completa el formulario HTML y presiona Guardar.
2. `app.js` toma los datos del formulario y los envía como JSON con `fetch`.
3. `app.py` recibe el POST en `/api/equipos`.
4. El controlador valida los campos y comprueba que exista el sector.
5. El modelo ejecuta un INSERT parametrizado en SQLite.
6. SQLite guarda el registro y genera su identificador.
7. La API devuelve el equipo creado con estado HTTP 201.
8. La vista vuelve a consultar la lista y actualiza la tabla.

Seguí este recorrido en los archivos antes de la presentación. Probá cambiar una etiqueta de la vista y agregar un sector con un nombre propio para familiarizarte con el proyecto.

## Por qué hay dos tablas

Separar sectores evita repetir su nombre en cada equipo. Si cambia el nombre de un sector, se modifica una sola fila. Los equipos guardan su identificador mediante una clave foránea. Esta relación es de uno a muchos.

La clave primaria identifica una fila. La clave foránea relaciona una fila con otra tabla. La restricción UNIQUE impide repetir el inventario y el nombre del sector. La eliminación restringida evita dejar equipos apuntando a un sector inexistente.

## Consultas que conviene reconocer

```sql
-- Listar equipos mostrando el sector
SELECT e.*, s.nombre AS sector
FROM equipos e
JOIN sectores s ON s.id = e.sector_id;

-- Crear un sector (el ? se reemplaza mediante parámetros)
INSERT INTO sectores (nombre) VALUES (?);

-- Renombrar un sector
UPDATE sectores SET nombre = ? WHERE id = ?;

-- Eliminar un sector sin equipos
DELETE FROM sectores WHERE id = ?;
```

Los valores enviados por el usuario se pasan como parámetros, no se concatenan en el SQL. Los nombres de tablas se seleccionan de una lista permitida en el controlador.

## Recorrido de demostración

1. Ejecutar el programa y abrir la dirección local.
2. Crear los sectores Sistemas y Administración.
3. Crear IT-001, PC-SISTEMAS-01, tipo PC, estado Operativo, asignado a Sistemas.
4. Buscar IT-001 y probar el filtro de estado.
5. Editar el equipo, asignarlo a Administración y cambiarlo a En reparación.
6. Renombrar Administración como Gestión. Verificar el nuevo nombre en Equipos.
7. Intentar borrar Gestión. El sistema debe impedirlo porque tiene un equipo.
8. Cerrar el servidor y volver a iniciarlo. Comprobar que los datos siguen.
9. Eliminar el equipo y después eliminar Gestión.
10. Mostrar `estructura.sql`, las carpetas del MVC y las pruebas.

## Preguntas que deberías poder responder

- ¿Dónde están las consultas SQL? En `src/models/inventario.py`.
- ¿Dónde se validan los datos? En `src/controllers/inventario.py`, además de los controles básicos del HTML.
- ¿Dónde se guardan? En `data/inventario.db`, creado automáticamente.
- ¿Por qué SQLite? Guarda una base relacional en un archivo y simplifica la ejecución local.
- ¿Por qué Python sin framework? Para usar la biblioteca estándar, reducir la instalación y mantener visible el recorrido HTTP. El servidor de Python se usa para este ejercicio local.
- ¿Cuál es la API? Las rutas `/api/sectores` y `/api/equipos`, con GET, POST, PUT y DELETE.
- ¿Se consume una API externa? No. La aplicación implementa y consume su propia API HTTP.
- ¿Dónde se realiza la búsqueda? En el navegador, sobre los registros consultados a la API. Es suficiente para este inventario pequeño.
- ¿Por qué no hay un ejecutable en dist? Python interpreta el código; la consigna requiere ejecutables solo si los hay.

## Antes de entregar

Comprobar el nombre del alumno en README y en el pie de la página. Ejecutar las pruebas y recorrer las operaciones en pantalla. Revisar las reglas de la materia sobre asistencia con herramientas y declarar su uso si corresponde. La guía ayuda a estudiar el código; no reemplaza entenderlo ni acredita autoría personal.
