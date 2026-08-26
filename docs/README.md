# 🍦 Heladería Dibuluc — Sistema de Costos y Rentabilidad

## 📌 Visión General

**El Problema:**
Tu mamá vende helados. Gasta dinero en materiales, produce lotes, vende helados. Pero no sabe exactamente cuánto le cuesta producir cada sabor ni cuánto retorna realmente de sus ventas. Todo se hace "a ojo".

**La Solución:**
Una aplicación móvil que transforma datos de compras, recetas y producción en **métricas de negocio accionables**. La app responde:

- ¿Cuánto me cuesta producir cada helado?
- ¿Cuál es mi ganancia real por sabor?
- ¿Cuál es mi margen de ganancia?
- ¿Cuánto retorna mi inversión en materiales?

**El Impacto:**
De "gasté $100" a "gasté $100, produje 150 helados, mi costo es $0.67 cada uno, y si vendo a $1.50, gano $124.50 brutos".

---

## 🎯 Flujo de Negocio Central

```
HISTORIAL DE COMPRAS (Múltiples, con precios cambiantes)
     ↓
Compra #1: Leche 5L $10   (01/08/2024)
Compra #2: Leche 5L $12   (15/08/2024)
Compra #3: Leche 5L $13   (01/09/2024)
     ↓
INSUMOS CON PRECIO UNITARIO (Costo Promedio Ponderado)
     ↓
Leche: ($10 + $12 + $13) / 15L = $0.0027/ml
Arequipe: $0.008/g (promedio de sus compras)
     ↓
RECETA (Template)
     ↓
Arequipe: 2000ml leche + 500g arequipe + ...
     ↓
PRODUCCIÓN (Realidad, usa costo promedio actual)
     ↓
Hoy hice el lote: 24 helados, costó $14.20
     ↓
COSTO UNITARIO
     ↓
$14.20 / 24 = $0.59 por helado
     ↓
PRECIO DE VENTA
     ↓
$1.50 por helado
     ↓
GANANCIA
     ↓
$0.91 por helado, 60.7% margen
```

**⚠️ Punto crítico:** Cuando tu mamá hace una nueva compra, el costo promedio de los insumos se recalcula automáticamente. Esto puede afectar el costo de futuras producciones. La app mantiene el **historial completo de compras** (máx 8-10 últimos registros visibles) para auditoría y análisis.

---

## 📚 Índice de Documentación

| Documento | Propósito |
|-----------|-----------|
| **README.md** | 👈 Estás aquí. Visión general + índice + prompt IA |
| **[01_negocio_y_reglas.md](./docs/01_negocio_y_reglas.md)** | Visión del producto, reglas de negocio, decisiones de diseño |
| **[02_historias_usuario.md](./docs/02_historias_usuario.md)** | Flujos de pantalla, casos de uso, aceptance criteria |
| **[03_arquitectura.md](./docs/03_arquitectura.md)** | Patrones (MVVM/Clean), carpetas, stack conventions |
| **[04_base_datos.md](./docs/04_base_datos.md)** | Modelos de datos, relaciones, persistencia local (SQLite/Hive) |
| **[05_prompt_guidelines.md](./docs/05_prompt_guidelines.md)** | Reglas de estilo de código para IA, system prompt |

---

## 🛠️ Stack Tecnológico

```
📱 Frontend         React Native + Expo
🎯 Lenguaje         TypeScript
💾 Base de datos    SQLite (expo-sqlite)
🗂️ Estado           Zod (validación) + React Hook Form
🧭 Navegación       Expo Router (file-based)
🎨 UI               NativeWind (Tailwind-like)
🧮 Lógica           TypeScript puro
```

---

## 🎬 Cómo Usar Esta Documentación

### Para Product Managers / Stakeholders:
Lean **01_negocio_y_reglas.md** y **02_historias_usuario.md**.

### Para Desarrolladores:
1. Lee **03_arquitectura.md** (estructura del proyecto)
2. Lee **04_base_datos.md** (qué persistes y cómo)
3. Lee **05_prompt_guidelines.md** (cómo escribir prompts para código)
4. Clona el repo, sigue la estructura, y codifica.

### Para IA (Claude/Copilot):
Siempre incluye este prompt base en tus requests:

---

## 🤖 Prompt Base para IA

**Copia esto antes de cualquier request de código:**

```
Rol: Eres un arquitecto de software senior con 10+ años en proyectos 
a pequeña y gran escala. Entiendes lógica compleja, spec-driven development
y haces énfasis en código limpio, mantenible y type-safe.

Contexto: Estamos construyendo Heladería Dibuluc, un MVP móvil 
(React Native + Expo + TypeScript + SQLite) para gestionar costos 
y rentabilidad de producción de helados.

Modelo de Negocio:
1. Compras: Tu mamá compra materiales (Leche 5L por $10)
2. Insumos: La app calcula costo unitario ($0.002/ml)
3. Recetas: Template de qué lleva cada sabor (2000ml leche + 500g arequipe...)
4. Producción: Cada vez que se hace un lote (24 helados, costó $14.20)
5. Costo unitario: $14.20 / 24 = $0.59 por helado
6. Precio de venta: Define tu mamá ($1.50)
7. Ganancia: $0.91 por helado, 60.7% margen

Restricciones:
- Todo es local (SQLite), sin backend
- Validar con Zod antes de guardar cualquier dato
- Tipos TypeScript explícitos (no any)
- Componentes reutilizables con NativeWind
- Cálculos de costos siempre en helpers/utils, no en componentes
- Las fechas de compras son críticas (historial de precios)
- Historial de compras: máximo 8-10 visibles, con opción de "Ver más"
- Costo promedio se recalcula cada vez que hay nueva compra
- Las producciones antiguas NO se modifican cuando cambia el precio (costo congelado)

Decisiones ya tomadas:
- Costo promedio ponderado (no FIFO/LIFO)
- Merma = helados producidos - helados vendidos
- Insumos se actualizan con cada compra (mantienen historial)
- Receta ≠ Producción (receta es template, producción es instancia)
- Historial de compras: guardamos TODAS, mostramos las últimas 8-10 en la lista principal
- Cuando registra compra nueva → costo promedio se recalcula automáticamente
- Producciones pasadas conservan su costo original (snapshot congelado)

Cuando codifiques:
1. Primero tipos (Zod + TypeScript)
2. Luego lógica (helpers, utils)
3. Luego componentes (UI)
4. Comenta decisiones no obvias
5. Incluye ejemplos de datos en tus comentarios

Referencia:
- Docs: /docs/
- Stack: React Native, Expo, TypeScript, SQLite, Zod, React Hook Form, Expo Router, NativeWind
```

---

## 📊 Historial de Compras — Vista Principal

**La app mostrará una vista dedicada al historial de compras:**

```
┌─────────────────────────────────────┐
│     HISTORIAL DE COMPRAS            │
├─────────────────────────────────────┤
│                                     │
│ Compra #10 ✓                       │
│ 01 septiembre 2024                │
│ Leche 5L → $13                     │
│ Arequipe 1kg → $9                  │
│ Chocolate 500g → $7                │
│                                     │
│ Compra #9                           │
│ 20 agosto 2024                     │
│ Leche 5L → $12                     │
│ Azúcar 2kg → $5                    │
│ Crema 1L → $8                      │
│                                     │
│ Compra #8                           │
│ 15 agosto 2024                     │
│ Leche 5L → $10                     │
│                                     │
│ [Ver más...]  (si hay >8)          │
│                                     │
└─────────────────────────────────────┘
```

**Características:**
- ✅ Máximo 8-10 compras visibles en la lista
- ✅ Ordenadas de más reciente a más antigua
- ✅ Cada compra muestra: fecha, materiales comprados, precio
- ✅ Botón "Ver más" si hay historial anterior
- ✅ Opción de eliminar/editar (solo compras recientes, con validaciones)
- ✅ Al tocar una compra, muestra detalles completos

**¿Por qué es importante?**
- Auditoría: Poder ver exactamente qué compró y cuándo
- Análisis: Detectar cuándo suben/bajan los precios
- Recálculos: Cuando hay una compra nueva, los costos promedio se actualizan automáticamente

---

## 📋 Definiciones Clave

### Compra
Un registro de qué material compró tu mamá en una fecha específica.

**Ejemplo de una compra:**
```
Fecha: 2024-01-15
Leche | 5000 ml | $10
Arequipe | 1000 g | $8
Chocolate | 500 g | $6
```

**Ejemplo de histórico (múltiples compras del mismo material a precios diferentes):**
```
Compra #1 (01/01/2024): Leche 5L $10  → $0.002/ml
Compra #2 (15/01/2024): Leche 5L $11  → $0.0022/ml
Compra #3 (01/02/2024): Leche 5L $13  → $0.0026/ml

Costo Promedio Ponderado:
($10 + $11 + $13) / 15L = $0.0024/ml ← Usado para cálculos de producción
```

### Insumo
Lo que la app deriva de las compras: costo unitario.
```
Leche | ml | $0.002/ml (promedio de todas las compras)
```

### Receta
El template: "Para hacer Helado de Arequipe necesito..."
```
Arequipe:
  - Leche: 2000 ml
  - Arequipe: 500 g
  - Azúcar: 300 g
  - Crema: 500 ml
```

### Producción
Una instancia real: "Hoy hice el lote de Arequipe"
```
Fecha: 2024-01-15
Receta: Arequipe
Costo del lote: $14.20 (calculado automáticamente)
Helados producidos: 24
Helados vendidos: 22
Merma: 2
```

### Costo Unitario
Costo del lote ÷ Helados producidos
```
$14.20 / 24 = $0.59 por helado
```

### Ganancia
Precio de venta - Costo unitario
```
$1.50 - $0.59 = $0.91 por helado
```

### Margen
Ganancia / Precio de venta × 100
```
($0.91 / $1.50) × 100 = 60.7%
```

### Costo Promedio Ponderado
Es cómo la app calcula el costo actual de cada insumo considerando **todas las compras previas**.

**Fórmula:**
```
Costo Promedio = (Suma de todos los gastos) / (Suma de todas las cantidades)
```

**Ejemplo real:**
```
Insumo: Leche

Compra #1: 5000 ml por $10   → Total gastado: $10
Compra #2: 5000 ml por $12   → Total gastado: $12
Compra #3: 3000 ml por $8    → Total gastado: $8

Total ml comprados: 13000
Total gastado: $30

Costo promedio = $30 / 13000 ml = $0.00231 por ml
```

**¿Cuándo se actualiza?**
- Cada vez que tu mamá registra una **nueva compra**
- La app recalcula automáticamente el costo promedio de ese insumo
- Las **futuras producciones** usarán este nuevo costo promedio
- Las **producciones pasadas** conservan su costo original (no retroactivo)

---

## 🚀 Próximos Pasos

- [ ] Leer **01_negocio_y_reglas.md** (clarificar decisiones)
- [ ] Revisar **02_historias_usuario.md** (validar flujos)
- [ ] Diseñar datos en **04_base_datos.md** (tablas SQLite)
- [ ] Definir componentes en **03_arquitectura.md** (estructura)
- [ ] Codificar usando **05_prompt_guidelines.md** (standards)

---

## 📞 Notas

- Esta es la **v1** de la documentación. Evolucionará con el desarrollo.
- El modelo de negocio está validado (ver análisis previo).
- El stack está decidido. No cambiar sin consenso.
- Cada documento es autónomo pero se referencia mutuamente.

---

**Última actualización:** 2024-01-18  
**Estado:** 🟢 Especificación lista para desarrollo  
**Responsable:** Arquitectura del producto