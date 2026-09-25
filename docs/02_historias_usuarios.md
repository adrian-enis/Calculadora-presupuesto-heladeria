# 📋 Historias de Usuario — Heladería Dibuluc

> Basado en `01_negocio_reglas.md`. Formato: `Como... Quiero... Para...` + criterios de aceptación (Dado/Cuando/Entonces).
> Usuario único de la app: tu mamá (dueña del negocio).

---

## Épica 1 — Compras

### HU 1.1 — Registrar una compra
**Como** dueña del negocio
**Quiero** registrar una compra con uno o más materiales, cantidad, unidad y costo
**Para** que el sistema calcule el stock y costo promedio de mis insumos

**Criterios de aceptación:**
- Dado que cargo una compra con Insumo + Cantidad (>0) + Unidad (ml/g/kg/l/unidad) + Precio (>=0)
  - Cuando confirmo
  - Entonces: si el insumo no existe, se crea automáticamente; se actualiza `stock_disponible` y `costo_promedio` según la fórmula de inventario perpetuo
- Dado que la compra tiene varios items (ticket multi-item)
  - Entonces cada item actualiza su insumo por separado
- Dado que intento cargar Cantidad <= 0, Precio < 0, o Fecha futura
  - Entonces el sistema rechaza el guardado con mensaje de error
- Dado que intento convertir unidades de categorías distintas (ej. kg → ml)
  - Entonces el sistema lo bloquea

---

### HU 1.2 — Editar una compra
**Como** dueña del negocio
**Quiero** corregir una compra si me equivoqué al cargarla
**Para** que el stock y costo promedio del insumo queden correctos

**Criterios de aceptación:**
- Dado que edito cantidad y/o precio de un item de una compra existente
  - Cuando confirmo
  - Entonces el sistema deshace el valor/cantidad viejos de ese item y aplica los nuevos (recalcula `costo_promedio` por delta, sin tocar el resto del historial)
- Dado que parte del stock de esa compra ya fue consumido por una Producción
  - Entonces el recalculo es una aproximación (no hay lotes/FIFO en el MVP) — el sistema no bloquea, pero es un comportamiento conocido, no un bug
- Dado que la compra editada ya fue usada en una Producción pasada
  - Entonces el `costo_lote` de esa Producción **no cambia** (snapshot congelado)

---

### HU 1.3 — Eliminar una compra
**Como** dueña del negocio
**Quiero** borrar una compra cargada por error
**Para** no dejar basura en mi historial

**Criterios de aceptación:**
- Dado que elimino una compra
  - Cuando confirmo
  - Entonces el registro se borra de la base de datos (hard delete, sin "anulado")
  - Y el `stock_disponible` del insumo se descuenta (piso en 0, nunca negativo)
  - Y el `costo_promedio` del insumo se recalcula por delta
- Dado que esa compra generó stock ya usado en una Producción
  - Entonces la Producción y su `costo_lote` no se modifican

---

### HU 1.4 — Ver historial de compras
**Como** dueña del negocio
**Quiero** ver mis últimas compras ordenadas por fecha
**Para** auditar qué compré y detectar cambios de precio

**Criterios de aceptación:**
- Dado que entro al historial de compras
  - Entonces veo las últimas 8–10 compras, más reciente primero, con fecha + items + precios
- Dado que hay más de 10 compras
  - Entonces aparece un botón "Ver más" para cargar el resto
- Dado que toco una compra de la lista
  - Entonces veo el detalle completo de sus items

---

## Épica 2 — Insumos

### HU 2.1 — Ver insumos y su costo actual
**Como** dueña del negocio
**Quiero** ver de un vistazo cuánto stock tengo de cada insumo y a qué costo
**Para** saber qué me queda y cuánto vale

**Criterios de aceptación:**
- Dado que entro a la lista de insumos
  - Entonces veo, por cada uno: nombre, `stock_disponible`, `costo_promedio` (por unidad base)
- Dado que un insumo tiene `stock_disponible = 0`
  - Entonces se muestra igual en la lista (no desaparece), marcado como sin stock

### HU 2.2 — Editar nombre de un insumo
**Como** dueña del negocio
**Quiero** corregir el nombre de un insumo si lo escribí mal
**Para** que se vea prolijo en todos lados, incluso en compras viejas

**Criterios de aceptación:**
- Dado que edito el nombre de un insumo
  - Entonces el cambio es retroactivo (se ve el nombre nuevo en compras y recetas pasadas)
- Dado que intento editar la unidad de un insumo ya creado
  - Entonces el sistema lo bloquea (unidad congelada)

---

## Épica 3 — Recetas

### HU 3.1 — Crear una receta
**Como** dueña del negocio
**Quiero** definir qué insumos y cantidades lleva cada sabor
**Para** poder producir lotes de forma consistente

**Criterios de aceptación:**
- Dado que creo una receta con nombre único y al menos 1 ingrediente (cantidad > 0)
  - Cuando confirmo
  - Entonces la receta queda Activa y disponible para producir
- Dado que intento agregar el mismo insumo dos veces en la misma receta
  - Entonces el sistema lo bloquea (ingredientes no duplicados)
- Dado que agrego un insumo que nunca fue comprado
  - Entonces el sistema lo bloquea y me pide registrarlo primero con una compra (la receta no crea insumos)

### HU 3.1b — Editar ingredientes de una receta
**Como** dueña del negocio
**Quiero** poder corregir la fórmula de una receta si aún no la usé
**Para** no tener que borrar y recrear todo por un error de tipeo

**Criterios de aceptación:**
- Dado que la receta **nunca fue usada** en ninguna Producción
  - Entonces puedo editar libremente sus ingredientes y cantidades
- Dado que la receta **ya fue usada** al menos una vez en una Producción
  - Entonces sus ingredientes quedan bloqueados (no editables)
  - Y si necesito cambiar la fórmula, debo desactivarla y crear una receta nueva

### HU 3.2 — Desactivar una receta
**Como** dueña del negocio
**Quiero** dejar de usar una receta vieja sin perder su historial
**Para** que no me aparezca en el dropdown pero siga en mis reportes pasados

**Criterios de aceptación:**
- Dado que cambio el estado de una receta a Inactivo
  - Entonces deja de aparecer en el dropdown de "nueva producción"
  - Y las producciones pasadas que la usaron siguen intactas
- Dado que quiero producir
  - Entonces el dropdown solo muestra recetas Activas

---

## Épica 4 — Producción

### HU 4.1 — Producir un lote
**Como** dueña del negocio
**Quiero** registrar que hice un lote de una receta
**Para** saber cuánto me costó y descontar los insumos usados

**Criterios de aceptación:**
- Dado que elijo una receta Activa y cargo `helados_producidos` (> 0)
  - Cuando confirmo
  - Entonces por cada ingrediente: se calcula `costo_usado = cantidad_receta × costo_promedio_del_insumo` (vigente en ese momento)
  - Y se descuenta `cantidad_receta` del `stock_disponible` de cada insumo
  - Y `costo_lote = Σ(costo_usado)` queda guardado como snapshot (no cambia después)
- Dado que algún insumo de la receta no tiene stock suficiente
  - Entonces el sistema **bloquea** la producción y avisa cuál insumo falta
- Dado que la producción se confirmó
  - Entonces su estructura (receta, cantidades, costo_lote) queda congelada — no editable

### HU 4.2 — Registrar ventas y merma de un lote
**Como** dueña del negocio
**Quiero** actualizar cuántos helados vendí y cuántos se perdieron
**Para** saber cuánto stock de helados me queda

**Criterios de aceptación:**
- Dado que actualizo `helados_vendidos` y/o `merma_declarada` de una producción
  - Cuando `vendidos + merma <= producidos`
  - Entonces se guarda correctamente
- Dado que `vendidos + merma > producidos`
  - Entonces el sistema rechaza el cambio con error
- La merma es siempre declarada a mano — nunca se calcula sola

### HU 4.3 — Anular una producción
**Como** dueña del negocio
**Quiero** anular una producción que cargué mal (ej: 50 en vez de 5)
**Para** que no distorsione mis reportes

**Criterios de aceptación:**
- Dado que cambio el estado de una producción a Anulado
  - Entonces deja de contar en reportes de costos/ganancia
  - Pero sigue visible en el historial (auditoría)
  - Y el stock de insumos consumido **no se devuelve automáticamente** (comportamiento conocido del MVP)

### HU 4.4 — Ver costo, ganancia y margen de un lote
**Como** dueña del negocio
**Quiero** ver cuánto costó cada helado, cuánto gano y qué margen tengo
**Para** decidir si mi precio de venta es correcto

**Criterios de aceptación:**
- Dado que defino un `precio_venta` para la producción
  - Entonces veo automáticamente:
    - `costo_unitario = costo_lote / helados_producidos`
    - `ganancia = precio_venta - costo_unitario`
    - `margen % = (ganancia / precio_venta) × 100`
- Dado que el material subió de precio después de producir el lote
  - Entonces estos números **no cambian** — quedan fijos al momento de producir (snapshot congelado, decisión ya confirmada)

---

## 📌 Notas de alcance (MVP)
- No hay multiusuario ni roles — un solo usuario controla todo.
- No hay tracking de lotes/FIFO por insumo — el costo es un promedio ponderado único por insumo.
- No hay reversión automática de stock al anular una producción.
- No hay "costo de reposición" en tiempo real — solo costo histórico congelado (decisión confirmada).