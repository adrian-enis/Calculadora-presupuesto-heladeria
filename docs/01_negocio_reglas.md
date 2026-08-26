# 📋 Reglas de Negocio — Heladería Dibuluc

---

## 📊 Conceptos Fundamentales

### 1. Compra
Ticket con múltiples items. Nunca se borra (auditoría). Se puede anular si hay error.

**Items:**
- Insumo, Cantidad > 0, Unidad (ml, g, kg, l, unidad), Precio >= 0

**Estados:** Activo (cuenta en cálculos) | Anulado (visible pero cantidad/precio = 0)

**Regla:** ANULAR ≠ ELIMINAR
- ❌ Eliminar: Desaparece, auditoría perdida
- ✅ Anular: Visible, no afecta cálculos

**Conversión:** Sistema convierte unidad a unidad_base del insumo (L → ml automático)

**Precio $0 (Regalos):** Permitido pero excluido del promedio de costo

---

### 2. Insumo
Material creado automáticamente en primera compra. Nombre editable (retroactivo). Unidad congelada.

**Costo Actual:** Promedio de últimas 3 compras ACTIVAS con precio > 0

```
Ejemplo:
Compra #1: 5L × $10 → se ignora
Compra #2: 5L × $12 → incluir
Compra #3: 3L × $8  → incluir

Costo = ($12 + $8) / (5 + 3) = $2.50/L
```

**¿Por qué últimas 3?** Refleja precio actual (no histórico viejo), suaviza ofertas.

---

### 3. Receta
Template reutilizable. Ingredientes congelados. Estado: Activo | Inactivo.

- Dropdown solo muestra Activas
- Inactivas quedan en historial (auditoría)

---

### 4. Producción
Instancia de hacer un lote. Congelada al crear (estructura no editable). Estado: Activo | Anulado.

**Propiedades:**
- helados_producidos (congelado)
- helados_vendidos (actualizable)
- merma_declarada (actualizable, manual)
- costo_lote (snapshot del día, nunca cambia)
- precio_venta (puede variar entre lotes)

**Validación Crítica:** `vendidos + merma <= producidos` (siempre)

**Anulación:** Si registraste error (ej: 50 en lugar de 5), cambias estado a Anulado. No cuenta en reportes.

---

### 5. Stock vs Merma
```
Stock Disponible = Helados Producidos - Helados Vendidos - Merma

Merma = Manual (usuario declara qué se perdió)
Stock = Lo que queda en heladera para vender después
```

---

### 6. Costo Unitario
`Costo = Costo Lote / Helados Producidos`

---

### 7. Ganancia
`Ganancia = Precio Venta - Costo Unitario`

---

### 8. Margen
`Margen (%) = (Ganancia / Precio Venta) × 100`

---

## ✅ Validaciones (Resumen)

**COMPRA:**
- ✓ Cantidad > 0, Precio >= 0, Fecha <= Hoy
- ✓ Conversión de unidad válida (no kg → ml)
- ✓ Incluir precio > 0 en cálculo de costo (excluir $0)

**INSUMO:**
- ✓ Nombre único, editable (retroactivo)
- ✓ Unidad congelada (no editable)

**RECETA:**
- ✓ Nombre único, ingredientes > 0
- ✓ Ingredientes no duplicados

**PRODUCCIÓN:**
- ✓ Helados producidos > 0
- ✓ vendidos + merma <= producidos (invariante)

---

## 🎯 Decisiones de Diseño

**1. Promedio de últimas 3 compras (no histórico total)**
- Refleja precio actual del mercado
- Leche de hace 6 meses ya se vendió (no la tienes)
- Evita que precios viejos distorsionen márgenes

**2. Snapshot de costo (congelado)**
- Auditoría: sé qué pasó ese día
- No sorpresas retroactivas

**3. Estado "Anulado" (no eliminar)**
- Permite corregir errores
- Auditoría completa
- Números correctos (cantidad/precio = 0 en cálculos)

**4. Recetas con estados (Activo/Inactivo)**
- Dropdown limpio (solo Activas)
- Historial visible (Inactivas)

**5. Compras multi-item**
- 1 ticket = N productos (más cercano a realidad)

---

## 🔄 Flujo General

1. **Compra** → Sistema crea Insumos automáticamente, convierte unidades, calcula costo promedio (últimas 3, precio > 0)
2. **Receta** → Calcula costo lote usando costos actuales de insumos
3. **Producción** → Snapshot del costo ese día, calcula costo unitario
4. **Precio Venta** → Usuario define, calcula ganancia/margen
5. **Anulación** → Si error, cambiar estado (visible pero no afecta cálculos)

---

## 📌 Lo Crítico

✅ NUNCA eliminar (auditoría)  
✅ ANULAR cuando hay error (auditoría + números correctos)  
✅ Costo promedio = últimas 3 compras (precio > 0)  
✅ Snapshot = congelado (no retroactivo)  
✅ Validar siempre: vendidos + merma <= producidos  
✅ Estados: Activo | Inactivo | Anulado (según contexto)

---