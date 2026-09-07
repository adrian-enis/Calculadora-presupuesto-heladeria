# 📋 Reglas de Negocio — Heladería Dibuluc

---

## 📊 Conceptos Fundamentales

### 1. Compra
Ticket con múltiples items: material comprado, cantidad, unidad, costo.

**Items:**
- Insumo, Cantidad > 0, Unidad (ml, g, kg, l, unidad), Precio >= 0

**Regla de Borrado y Edición (KISS — Hard Delete + recalculo por delta):**
- ✅ **Método:** Hard Delete real (se borra el registro de SQLite, no queda rastro de esa compra puntual).
- ✅ **Mecanismo:** cada insumo guarda internamente `valor_total_stock` (= `costo_promedio × stock_disponible`). Esto permite deshacer una compra puntual sin necesitar el historial completo de todas las compras — solo hace falta la cantidad y el precio del ítem que se borra/edita.
- **Borrar una compra:**
  ```
  valor_total_stock -= cantidad_borrada × precio_original_del_item
  stock_disponible  -= cantidad_borrada          (piso en 0)
  costo_promedio     = valor_total_stock / stock_disponible
                        (si stock queda en 0 → costo_promedio también 0, hasta la próxima compra)
  ```
- **Editar una compra:** mismo mecanismo — primero se deshace el valor/cantidad viejos del ítem (como un borrado), después se aplican los nuevos (como una compra nueva). Es "borrar + volver a comprar" en un solo paso.
- ✅ **Efecto en Producciones:** Ninguno. `costo_lote` es snapshot congelado — corregir una compra vieja **no** cambia costos/ganancias de ventas ya registradas, solo afecta el `costo_promedio` que se usará en producciones **futuras**.
- ⚠️ **Edge case aceptado (MVP):** si parte de esa cantidad ya fue **consumida por una Producción** antes de borrar/editar la compra, el modelo no sabe de qué compra específica salió ese consumo (no rastrea lotes/FIFO, es un promedio ciego). En ese caso el recalculo es una **aproximación** (puede pisar en 0 antes de tiempo). Para el MVP es aceptable; una v2 con lotes (FIFO) lo resolvería con precisión exacta.
- ⚠️ **Trade-off aceptado:** se pierde trazabilidad de auditoría de la compra en sí (no hay "anulado", desaparece del historial) — pero el costo_promedio del insumo sí queda correcto (o aproximado, según el edge case de arriba).

**Precio $0 (Regalos):**
- Suman cantidad al `stock_disponible` del insumo.
- **NO** modifican el `costo_promedio` (se valorizan al costo_promedio vigente, no lo distorsionan).

---

### 2. Insumo
Material creado automáticamente en la primera compra. Nombre editable (retroactivo). Unidad congelada (no editable una vez creada).

**Cada insumo mantiene:**
- `stock_disponible` (cantidad que queda sin usar)
- `costo_promedio` ($/unidad, se recalcula con cada compra)

**Fórmula (inventario perpetuo, reemplaza el modelo de "últimas 3 compras"):**
```
nuevo_costo_promedio = (stock_actual × costo_actual + cant_comprada × precio_compra)
                        ────────────────────────────────────────────────────────────
                                    (stock_actual + cant_comprada)

nuevo_stock = stock_actual + cant_comprada
```

**Ejemplo:**
```
Stock previo: 0ml, costo_promedio $0
Compra: 5000ml leche por $50 → costo_promedio = $0.01/ml, stock = 5000ml

Nueva compra: 3000ml leche por $36 (subió el precio)
nuevo_costo_promedio = (5000×0.01 + 3000×0.012) / (5000+3000)
                      = (50 + 36) / 8000
                      = $0.01075/ml
nuevo_stock = 8000ml
```

**¿Por qué este modelo y no "últimas 3 compras"?**
- Refleja el stock real disponible, no un promedio histórico ciego.
- Permite saber exactamente cuánto vale lo que tenés guardado en la heladera/depósito.
- El costo de una producción depende de lo que se consume del stock actual, no de compras viejas que ya podrían estar agotadas.

---

### 3. Receta
Template reutilizable. Estado: Activo | Inactivo.

- Dropdown solo muestra Activas
- Inactivas quedan en historial (auditoría)
- La receta **no consume stock** por sí sola — solo se consume al ejecutar una Producción.
- **Edición de ingredientes:** editable **mientras no haya sido usada en ninguna Producción**. En cuanto se usa por primera vez, sus ingredientes quedan **congelados** para siempre (para no romper el `costo_lote` ya calculado de esa y futuras producciones que la referencien con la misma base). Si se necesita cambiar la fórmula después de haberla usado, se desactiva y se crea una receta nueva.

---

### 4. Producción
Instancia de hacer un lote usando una receta. Congelada al crear (estructura no editable). Estado: Activo | Anulado.

**Al producir:**
1. Por cada ingrediente de la receta: `costo_usado = cantidad_receta × costo_promedio_del_insumo` (al momento de producir)
2. `stock_disponible` del insumo **se descuenta** en `cantidad_receta`
3. `costo_lote = Σ(costo_usado)` de todos los ingredientes → queda **congelado** (snapshot, nunca cambia después)

**Validación de stock (asunción para MVP — a confirmar):**
- Si algún insumo no tiene `stock_disponible` suficiente para la receta, la Producción **se bloquea** y no se puede confirmar (no se permite stock negativo). Simplifica la lógica y evita costos inconsistentes.

**Propiedades:**
- `helados_producidos` (congelado)
- `helados_vendidos` (actualizable)
- `merma_declarada` (actualizable, manual — el usuario la declara, no se calcula sola)
- `costo_lote` (snapshot del día, nunca cambia aunque después cambie el costo_promedio del insumo)
- `precio_venta` (puede variar entre lotes)

**Validación Crítica:** `vendidos + merma <= producidos` (siempre)

**Anulación:** Si se registró un error (ej: 50 en lugar de 5), se cambia el estado a Anulado. No cuenta en reportes. El stock consumido por esa producción **no se revierte automáticamente** (simplificación MVP — a confirmar si esto molesta en la práctica).

---

### 5. Stock de Helados vs Merma
```
Stock Disponible de Helados = Helados Producidos - Helados Vendidos - Merma

Merma = Manual (el usuario declara qué se perdió, no se calcula solo)
```
> Nota: esto es el stock de **helados terminados**, no confundir con el `stock_disponible` de **insumos** (sección 2), que es harina/leche/etc. sin usar.

---

### 6. Costo Unitario
`Costo Unitario = Costo del Lote / Helados Producidos`

### 7. Ganancia
`Ganancia = Precio Venta - Costo Unitario`

### 8. Margen
`Margen (%) = (Ganancia / Precio Venta) × 100`

---

## ✅ Validaciones (Resumen)

**COMPRA:**
- ✓ Cantidad > 0, Precio >= 0, Fecha <= Hoy
- ✓ Conversión de unidad válida (no kg → ml, no mezclar categorías de unidad)
- ✓ Al borrar/editar: descuenta/ajusta stock del insumo (piso en 0, nunca negativo) Y recalcula costo_promedio por delta (ver sección 1)

**INSUMO:**
- ✓ Nombre único, editable (retroactivo)
- ✓ Unidad congelada (no editable)
- ✓ `stock_disponible` nunca negativo

**RECETA:**
- ✓ Nombre único, ingredientes > 0
- ✓ Ingredientes no duplicados
- ✓ Ingredientes editables solo si la receta nunca fue usada en una Producción; si ya se usó, quedan bloqueados

**PRODUCCIÓN:**
- ✓ Helados producidos > 0
- ✓ vendidos + merma <= producidos (invariante)
- ✓ Stock suficiente de cada insumo antes de confirmar (bloquea si no alcanza)

---

## 🎯 Decisiones de Diseño

**1. Inventario perpetuo (no promedio de últimas 3 compras)**
- El costo se recalcula con cada compra usando lo que queda en stock + lo nuevo
- Evita el problema de "compré $50 pero la receta solo usó $37" — el sobrante queda valorizado y disponible

**2. Snapshot de costo en Producción (congelado)**
- Auditoría: se sabe exactamente qué costó ese lote ese día
- No hay sorpresas retroactivas si después cambia el costo_promedio del insumo

**3. Hard Delete en Compras (no "Anulado"), con recalculo por delta**
- Simplicidad ante todo para el MVP (KISS): se borra el registro, no se guarda "anulado"
- Se acepta perder trazabilidad de auditoría de la compra en sí, pero el costo_promedio del insumo SÍ se corrige (usando `valor_total_stock`, no historial completo)
- Excepción conocida: si ya se consumió parte de esa compra en una Producción, el recalculo es aproximado (ver edge case en sección 1)

**4. Estado "Anulado" solo en Producción (no en Compra)**
- Permite corregir errores de producción sin perder el historial de lotes reales
- Números correctos (no cuenta en reportes)

**5. Recetas con estados (Activo/Inactivo)**
- Dropdown limpio (solo Activas)
- Historial visible (Inactivas)

**6. Compras multi-item**
- 1 ticket = N productos (más cercano a la realidad de una compra real)

**7. Merma manual, no derivada**
- El usuario declara qué se perdió (se quemó, se cayó, etc.)
- No se asume automáticamente que "no vendido = merma", porque podría ser stock guardado para vender después

---

## 🔄 Flujo General

1. **Compra** → Sistema crea/actualiza Insumos, ajusta `stock_disponible` y `costo_promedio` (fórmula ponderada con lo que queda en stock)
2. **Receta** → Define cantidades de insumos necesarias (no consume nada todavía)
3. **Producción** → Consume stock real de cada insumo, calcula `costo_lote` con el `costo_promedio` vigente al momento de producir, congela ese costo
4. **Precio Venta** → Usuario define, calcula ganancia/margen
5. **Anulación (solo Producción)** → Si hay error, cambiar estado (visible pero no cuenta en reportes)
6. **Borrado/Edición (solo Compra)** → Hard delete, ajusta stock y recalcula costo_promedio del insumo por delta; no toca producciones pasadas (snapshot congelado)

---

## 📌 Pendiente de confirmar
- [ ] ¿Bloquear producción si falta stock de algún insumo, o permitir de todos modos con advertencia?
- [ ] Al anular una Producción, ¿se debería devolver el stock consumido al insumo? (hoy: no se revierte)

---

## 📌 Lo Crítico

✅ Compra: Hard Delete + recalculo de costo_promedio por delta (aproximado si ya se consumió parte del stock)
✅ Producción: Anulado (nunca se borra, snapshot de costo se mantiene)
✅ Costo de insumo = inventario perpetuo (stock + costo_promedio), NO promedio de últimas N compras
✅ Snapshot de `costo_lote` = congelado, no retroactivo
✅ Validar siempre: vendidos + merma <= producidos
✅ Merma = manual, nunca derivada automáticamente
✅ Regalos ($0): suman stock, no mueven costo_promedio

---