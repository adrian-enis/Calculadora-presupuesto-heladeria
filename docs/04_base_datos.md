# 🗄️ Base de Datos — Heladería Dibuluc (SQLite)

> Cada tabla y constraint acá mapea 1:1 a una regla de `01_negocio_reglas.md`. Si una regla de negocio cambia, esta tabla es la primera que hay que revisar.

---

## 🧭 Diagrama de Relaciones

```
insumos ──────────────┐
   │                    │
   │ 1:N                │ 1:N
   ▼                    ▼
compra_items      receta_ingredientes      produccion_consumos
   │                    │                          │
   │ N:1                │ N:1                      │ N:1
   ▼                    ▼                          ▼
compras            recetas                  producciones
                                                    │
                                                    │ N:1
                                                    ▼
                                              (recetas)
```

- Una **Compra** tiene muchos **compra_items** (ticket multi-item)
- Un **Insumo** aparece en muchos `compra_items` y en muchos `receta_ingredientes`
- Una **Receta** tiene muchos `receta_ingredientes`
- Una **Producción** referencia una **Receta** y tiene muchos `produccion_consumos` (snapshot de qué y cuánto se gastó de cada insumo, a qué costo, en ESA producción puntual)

---

## 📋 Tablas

### `insumos`
```sql
CREATE TABLE insumos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre            TEXT NOT NULL UNIQUE,
  unidad_base       TEXT NOT NULL CHECK (unidad_base IN ('ml', 'g', 'kg', 'l', 'unidad')),
  stock_disponible  REAL NOT NULL DEFAULT 0 CHECK (stock_disponible >= 0),
  costo_promedio    REAL NOT NULL DEFAULT 0 CHECK (costo_promedio >= 0),
  valor_total_stock REAL NOT NULL DEFAULT 0,   -- = costo_promedio * stock_disponible, se mantiene aparte para el delta al editar/borrar compras
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
```
- `unidad_base` se fija en la primera compra y **nunca se edita** (regla: "unidad congelada").
- `nombre` es editable, es la única columna que puede cambiar retroactivamente (regla: "nombre editable retroactivo").
- `valor_total_stock` existe específicamente para poder recalcular por delta al editar/borrar una compra sin necesitar el historial completo (ver `01_negocio_reglas.md`, sección 1).

---

### `compras`
```sql
CREATE TABLE compras (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha       TEXT NOT NULL,               -- validar en service: fecha <= hoy
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `compra_items`
```sql
CREATE TABLE compra_items (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  compra_id           INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  insumo_id           INTEGER NOT NULL REFERENCES insumos(id),
  cantidad            REAL NOT NULL CHECK (cantidad > 0),
  unidad              TEXT NOT NULL CHECK (unidad IN ('ml', 'g', 'kg', 'l', 'unidad')),
  cantidad_base       REAL NOT NULL,        -- cantidad ya convertida a unidad_base del insumo (ej: 5 L -> 5000 ml)
  precio              REAL NOT NULL CHECK (precio >= 0),
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_compra_items_insumo ON compra_items(insumo_id);
CREATE INDEX idx_compra_items_compra ON compra_items(compra_id);
```
- Se guarda `unidad` y `cantidad` **tal cual las tipeó** (auditoría de lo que realmente compró) **y** `cantidad_base` ya convertida (lo que usa el service para calcular costo_promedio) — así no hay que reconvertir ni repetir lógica de conversión en cada lectura.
- `ON DELETE CASCADE`: si se borra una `compra` (hard delete), sus items se van con ella. El **service** es responsable de aplicar el delta a `insumos` **antes** de dejar que se ejecute este cascade (ver nota más abajo).

---

### `recetas`
```sql
CREATE TABLE recetas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL UNIQUE,
  estado      TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `receta_ingredientes`
```sql
CREATE TABLE receta_ingredientes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  receta_id   INTEGER NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  insumo_id   INTEGER NOT NULL REFERENCES insumos(id),
  cantidad    REAL NOT NULL CHECK (cantidad > 0),   -- siempre en unidad_base del insumo, sin conversión pendiente

  UNIQUE (receta_id, insumo_id)                      -- regla: ingredientes no duplicados
);

CREATE INDEX idx_receta_ingredientes_receta ON receta_ingredientes(receta_id);
```
- `cantidad` se guarda directamente en la `unidad_base` del insumo (ej: si `insumos.unidad_base = 'ml'`, acá va en ml) — evita tener que convertir de nuevo al momento de producir.
- **Editable solo si la receta nunca fue usada en una Producción** (regla HU 3.1b). Esto se valida en `receta.service.ts` — chequeando si existe algún `producciones.receta_id` que la referencie — no se puede expresar como constraint SQL simple, queda a cargo del service.

---

### `producciones`
```sql
CREATE TABLE producciones (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  receta_id           INTEGER NOT NULL REFERENCES recetas(id),
  fecha               TEXT NOT NULL,
  helados_producidos  INTEGER NOT NULL CHECK (helados_producidos > 0),
  helados_vendidos    INTEGER NOT NULL DEFAULT 0 CHECK (helados_vendidos >= 0),
  merma_declarada     INTEGER NOT NULL DEFAULT 0 CHECK (merma_declarada >= 0),
  costo_lote          REAL NOT NULL,        -- snapshot congelado, se escribe una sola vez
  precio_venta        REAL CHECK (precio_venta IS NULL OR precio_venta >= 0),
  estado              TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'anulado')),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),

  CHECK (helados_vendidos + merma_declarada <= helados_producidos)   -- invariante crítico
);

CREATE INDEX idx_producciones_receta ON producciones(receta_id);
CREATE INDEX idx_producciones_fecha ON producciones(fecha);
```
- El `CHECK` de `vendidos + merma <= producidos` está a nivel SQLite además de en el service — doble seguro, porque es LA regla más crítica del sistema.
- `costo_lote` y la estructura general (receta, cantidades) **no tienen UPDATE permitido** una vez creada la fila — lo bloquea el service, no la tabla (SQLite no tiene "columnas inmutables" nativas).

---

### `produccion_consumos`
```sql
CREATE TABLE produccion_consumos (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  produccion_id         INTEGER NOT NULL REFERENCES producciones(id) ON DELETE CASCADE,
  insumo_id             INTEGER NOT NULL REFERENCES insumos(id),
  cantidad_usada        REAL NOT NULL CHECK (cantidad_usada > 0),
  costo_promedio_momento REAL NOT NULL,     -- costo_promedio del insumo AL MOMENTO de producir
  costo_usado           REAL NOT NULL       -- cantidad_usada * costo_promedio_momento
);

CREATE INDEX idx_produccion_consumos_produccion ON produccion_consumos(produccion_id);
```
- **Por qué existe esta tabla y no alcanza con `receta_ingredientes`:** dos producciones de la misma receta, en fechas distintas, consumen a costos distintos (el `costo_promedio` del insumo cambia con el tiempo). Esta tabla es el snapshot congelado por producción — es lo que garantiza que `costo_lote` nunca cambie retroactivamente aunque el insumo suba de precio después.
- `Σ(costo_usado)` de todas las filas de una producción = `producciones.costo_lote` (se calcula una vez, al producir, y no se vuelve a tocar).

---

## 🔗 Reglas que NO están en el schema (viven en el service, no en SQL)

| Regla | Por qué no es un constraint SQL | Dónde vive |
|---|---|---|
| Costo promedio ponderado al comprar | Requiere leer stock actual antes de escribir | `insumo.service.ts` → `lib/inventario.ts` |
| Delta al editar/borrar compra | Requiere leer valor anterior del item antes de aplicar el cambio | `compra.service.ts` |
| Bloquear producción si falta stock | Requiere comparar contra varias filas de `receta_ingredientes` a la vez | `produccion.service.ts` |
| Receta editable solo si no fue usada | Requiere un `EXISTS` contra `producciones` | `receta.service.ts` |
| Conversión de unidad (L → ml, no kg → ml) | Lógica de categorías de unidad, no relacional | `lib/unidades.ts` |

---

## 📌 Nota sobre el Hard Delete de Compras

El `ON DELETE CASCADE` de `compra_items` borra los items automáticamente a nivel SQL, pero el **ajuste de stock y costo_promedio del insumo debe ejecutarse ANTES de ese delete**, dentro de la misma transacción, en `compra.service.ts`:

```
1. Leer compra_items de la compra a borrar
2. Por cada item: aplicar delta a insumos.stock_disponible y valor_total_stock, recalcular costo_promedio
3. Recién ahí: DELETE FROM compras WHERE id = ?  (dispara el cascade sobre compra_items)
```
Todo dentro de una transacción SQLite (`BEGIN` / `COMMIT`) para que no quede el stock a mitad de ajustar si algo falla.

---

## 🚀 Próximo paso
Con esto, `03_arquitectura.md` (services/repositories) y este documento ya alcanzan para empezar a codear `db/schema.sql` y los primeros `*.repository.ts`.