-- Heladería Dibuluc — Schema SQLite
-- Fuente de verdad: docs/04_base_datos.md
-- Ejecutar una sola vez al inicializar la app (ver db/client.ts)

PRAGMA foreign_keys = ON;

-- ============================================================
-- INSUMOS
-- ============================================================
CREATE TABLE IF NOT EXISTS insumos (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre              TEXT NOT NULL UNIQUE,
  unidad_base         TEXT NOT NULL CHECK (unidad_base IN ('ml', 'g', 'kg', 'l', 'unidad')),
  stock_disponible    REAL NOT NULL DEFAULT 0 CHECK (stock_disponible >= 0),
  costo_promedio      REAL NOT NULL DEFAULT 0 CHECK (costo_promedio >= 0),
  valor_total_stock   REAL NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- COMPRAS
-- ============================================================
CREATE TABLE IF NOT EXISTS compras (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha       TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS compra_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  compra_id       INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  insumo_id       INTEGER NOT NULL REFERENCES insumos(id),
  cantidad        REAL NOT NULL CHECK (cantidad > 0),
  unidad          TEXT NOT NULL CHECK (unidad IN ('ml', 'g', 'kg', 'l', 'unidad')),
  cantidad_base   REAL NOT NULL,
  precio          REAL NOT NULL CHECK (precio >= 0),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_compra_items_insumo ON compra_items(insumo_id);
CREATE INDEX IF NOT EXISTS idx_compra_items_compra ON compra_items(compra_id);

-- ============================================================
-- RECETAS
-- ============================================================
CREATE TABLE IF NOT EXISTS recetas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL UNIQUE,
  estado      TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS receta_ingredientes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  receta_id   INTEGER NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  insumo_id   INTEGER NOT NULL REFERENCES insumos(id),
  cantidad    REAL NOT NULL CHECK (cantidad > 0),
  UNIQUE (receta_id, insumo_id)
);

CREATE INDEX IF NOT EXISTS idx_receta_ingredientes_receta ON receta_ingredientes(receta_id);

-- ============================================================
-- PRODUCCIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS producciones (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  receta_id           INTEGER NOT NULL REFERENCES recetas(id),
  fecha               TEXT NOT NULL,
  helados_producidos  INTEGER NOT NULL CHECK (helados_producidos > 0),
  helados_vendidos    INTEGER NOT NULL DEFAULT 0 CHECK (helados_vendidos >= 0),
  merma_declarada     INTEGER NOT NULL DEFAULT 0 CHECK (merma_declarada >= 0),
  costo_lote          REAL NOT NULL,
  precio_venta        REAL CHECK (precio_venta IS NULL OR precio_venta >= 0),
  estado              TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'anulado')),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (helados_vendidos + merma_declarada <= helados_producidos)
);

CREATE INDEX IF NOT EXISTS idx_producciones_receta ON producciones(receta_id);
CREATE INDEX IF NOT EXISTS idx_producciones_fecha ON producciones(fecha);

CREATE TABLE IF NOT EXISTS produccion_consumos (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  produccion_id           INTEGER NOT NULL REFERENCES producciones(id) ON DELETE CASCADE,
  insumo_id               INTEGER NOT NULL REFERENCES insumos(id),
  cantidad_usada          REAL NOT NULL CHECK (cantidad_usada > 0),
  costo_promedio_momento  REAL NOT NULL,
  costo_usado             REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_produccion_consumos_produccion ON produccion_consumos(produccion_id);