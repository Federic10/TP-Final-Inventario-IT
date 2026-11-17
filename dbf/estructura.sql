PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sectores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(trim(nombre)) BETWEEN 1 AND 80)
);

CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventario TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(trim(inventario)) BETWEEN 1 AND 40),
    nombre TEXT NOT NULL CHECK(length(trim(nombre)) BETWEEN 1 AND 80),
    tipo TEXT NOT NULL CHECK(tipo IN ('PC', 'Notebook', 'Servidor', 'Impresora', 'Otro')),
    estado TEXT NOT NULL CHECK(estado IN ('Operativo', 'En reparación', 'De baja')),
    sector_id INTEGER NOT NULL,
    observaciones TEXT NOT NULL DEFAULT '' CHECK(length(observaciones) <= 500),
    FOREIGN KEY (sector_id) REFERENCES sectores(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_equipos_sector ON equipos(sector_id);
