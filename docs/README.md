# 🍦 Heladería Dibuluc — Sistema de Costos y Rentabilidad (MVP)

## 📌 El Problema
Se compran insumos, se hacen recetas, se producen helados. Hoy todo se calcula "a ojo": no se sabe cuánto cuesta cada helado ni cuánto queda de ganancia real.

## 🎯 La Solución (una frase)
Registrás **compras** → la app calcula el **costo real de cada insumo** → armás una **receta** → cada vez que **producís** un lote, la app te dice cuántos helados salieron, cuántos se perdieron, y cuánto costó cada uno **según lo que realmente se gastó**, no según lo que se compró.

---

## 🔄 Flujo de Negocio (modelo de inventario, no promedio histórico)

```
COMPRA
  Registrás lo que compraste: material, cantidad, unidad (ml/g/kg/l/unidad), costo total
  → Ejemplo: Leche 5000ml $50

INSUMO (se actualiza automático con cada compra)
  Cada insumo tiene:
    - stock_disponible   (cuánto queda sin usar)
    - costo_promedio     ($/unidad, se recalcula con cada compra)

  Al comprar:
    nuevo_costo_promedio = (stock_actual × costo_actual + cant_comprada × precio_compra)
                            ────────────────────────────────────────────────────────────
                                        (stock_actual + cant_comprada)
    stock_disponible += cant_comprada

  Ejemplo:
    Stock previo: 0ml a $0
    Compra: 5000ml por $50 → costo_promedio = $0.01/ml, stock = 5000ml

RECETA (template, no consume nada todavía)
  Define cuánto lleva cada sabor:
  → Arequipe: 2000ml leche + 500g arequipe + 300g azúcar + 500ml crema

PRODUCCIÓN (acá se consume el stock real)
  Al producir un lote de una receta:
    - Por cada ingrediente: costo_usado = cantidad_usada × costo_promedio_del_insumo (AL MOMENTO de producir)
    - stock_disponible del insumo -= cantidad_usada
    - costo_lote = suma de todos los costo_usado
    - Lo que no se gasta queda como SOBRANTE en stock, al mismo costo_promedio, para la próxima producción

  Ejemplo:
    Compraste $50 en insumos, pero la receta usó solo $37 en ingredientes
    → costo_lote = $37 (no $50)
    → el resto queda disponible como stock para la próxima vez

COSTO UNITARIO
  costo_unitario = costo_lote / helados_producidos

GANANCIA Y MARGEN
  ganancia = precio_venta - costo_unitario
  margen % = (ganancia / precio_venta) × 100
```

**⚠️ Punto clave:** el costo de una producción depende de lo que *efectivamente se consumió* de cada insumo, no de lo que costó la última compra ni de un promedio histórico fijo. Comprar $50 no significa gastar $50 — el sobrante queda en stock a su costo promedio, listo para la próxima producción.

---

## 📋 Definiciones Clave

### Compra
Registro de qué se compró, en qué cantidad/unidad, y a qué costo total.
```
Fecha: 2024-01-15
Leche     | 5000 ml | $50
Arequipe  | 1000 g  | $8
```
- **Editar / Eliminar:** ✅ Resuelto — Hard Delete (se borra el registro). Al borrar o editar, se ajusta el `stock_disponible` del insumo Y se recalcula su `costo_promedio` (usando el valor/cantidad de ese ítem, sin necesitar historial completo). Detalle completo en `01_negocio_reglas.md`.

### Insumo
Lo que la app deriva de las compras: cuánto queda (`stock_disponible`) y a qué costo (`costo_promedio`).
```
Leche | stock: 3000ml | costo_promedio: $0.01/ml
```

### Receta
Template: "para hacer Arequipe necesito X de esto y Y de lo otro". No consume stock por sí sola, solo se usa cuando se produce.

### Producción
Instancia real de un lote. Consume stock, calcula costo real, y registra:
```
Fecha: 2024-01-15
Receta: Arequipe
Helados producidos: 24
Helados vendidos: 22
Merma: 2               (declarada por el usuario, no automática)
Costo del lote: $37    (según lo realmente consumido, no lo comprado)
Costo unitario: $37 / 24 = $1.54
```

### Costo Unitario / Ganancia / Margen
```
Costo unitario = Costo del lote / Helados producidos
Ganancia       = Precio de venta - Costo unitario
Margen (%)     = (Ganancia / Precio de venta) × 100
```

---

## 🛠️ Stack Tecnológico
```
📱 Frontend      React Native + Expo
🎯 Lenguaje      TypeScript
💾 Base de datos SQLite (expo-sqlite)
🗂️ Validación    Zod + React Hook Form
🧭 Navegación    Expo Router (file-based)
🎨 UI            NativeWind (Tailwind-like)
```

---

## 🤖 Prompt Base para IA

```
Rol: Arquitecto de software senior, énfasis en código limpio, mantenible y type-safe.

Contexto: Heladería Dibuluc, MVP móvil (React Native + Expo + TypeScript + SQLite)
para calcular costos y rentabilidad de producción de helados.

Modelo de negocio (INVENTARIO PERPETUO, no promedio histórico fijo):
1. Compra: registra insumo + cantidad + costo total
2. Insumo: mantiene stock_disponible y costo_promedio, recalculado con cada compra
3. Receta: template de ingredientes (no consume stock)
4. Producción: consume stock real según receta, calcula costo_lote real (no el total comprado)
5. Sobrante de insumos queda en stock a su costo_promedio para la próxima producción
6. Compra: Hard Delete + recalculo de costo_promedio por delta (no requiere historial completo)
7. Merma es declarada manualmente por el usuario (no derivada)
8. Costo unitario = costo_lote / helados_producidos
9. Ganancia = precio_venta - costo_unitario

Restricciones:
- Todo local (SQLite), sin backend
- Validar con Zod antes de guardar
- Tipos TypeScript explícitos (no any)
- Cálculos de costos en helpers/utils, nunca en componentes
- Producciones pasadas conservan su costo_lote original (snapshot congelado, no retroactivo)

Cuando codifiques:
1. Tipos (Zod + TypeScript)
2. Lógica (helpers, utils)
3. Componentes (UI)
4. Comenta solo decisiones no obvias
```

---

## 📌 Pendiente de definir
- [ ] Validación: ¿qué pasa si se intenta producir una receta y no hay stock suficiente de algún insumo? (hoy: se bloquea)
- [ ] Al anular una Producción, ¿se devuelve el stock consumido al insumo? (hoy: no se revierte)

---

**Última actualización:** 2026-08-27
**Estado:** 🟡 Modelo de costeo en revisión (cambio de "promedio histórico" a "inventario perpetuo")