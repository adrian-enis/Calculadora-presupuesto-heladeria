# 🤖 Prompt Guidelines — Heladería Dibuluc

> Este documento es para cuando le pedís código a una IA (Claude Code, Copilot, etc.). Define **cómo** debe escribirse el código — el **qué** ya está en `01_negocio_reglas.md` a `04_base_datos.md`.

---

## 📝 Convenciones de Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos de componente | `PascalCase.tsx` | `CostoCard.tsx` |
| Archivos de hook | `camelCase.ts`, prefijo `use` | `useProducciones.ts` |
| Archivos de service/repository/schema | `kebab-case` o `entidad.tipo.ts` | `compra.service.ts`, `compra.schema.ts` |
| Carpetas de feature | `kebab-case` plural | `producciones/`, `receta-ingredientes/` |
| Tablas SQL | `snake_case` plural | `compra_items`, `receta_ingredientes` |
| Columnas SQL | `snake_case` | `stock_disponible`, `costo_promedio` |
| Variables/funciones TS | `camelCase` | `calcularCostoLote`, `stockDisponible` |
| Tipos/Interfaces/Schemas Zod | `PascalCase` | `Compra`, `CompraSchema`, `InsumoConStock` |
| Constantes de dominio | `UPPER_SNAKE_CASE` | `UNIDADES_VALIDAS`, `ESTADO_ANULADO` |

**Nombrar en español o inglés:** se usa **español** para todo lo que sea vocabulario del negocio (`compra`, `insumo`, `costoPromedio`, `mermaDeclarada`) porque son los términos que ya están en toda la documentación — traducirlos a inglés a mitad de camino (`purchase`, `supply`) generaría desalineación entre docs y código. Términos técnicos genéricos sí van en inglés (`service`, `repository`, `hook`, `schema`).

---

## 🎨 Formato

- Prettier + ESLint por defecto de Expo (`npx expo lint`), sin configuración custom salvo que se justifique.
- Imports ordenados: librerías externas primero, luego alias internos (`@/features/...`), luego relativos (`./`).
- Sin `any` explícito — si un tipo es realmente desconocido, usar `unknown` y angostarlo.
- Funciones de `lib/` (cálculos puros) siempre con tipos de entrada y salida explícitos, sin inferencia implícita, porque son las que más se testean y reusan.

---

## 💬 Comentarios

**Comentar SOLO decisiones no obvias**, no lo que el código ya dice. Ejemplos de cuándo SÍ comentar (tomados de reglas reales del proyecto):

```ts
// El insumo no se recalcula desde el historial completo: se mantiene
// valor_total_stock aparte para poder deshacer una compra puntual por delta.
// Ver 01_negocio_reglas.md, sección 1.
function aplicarDeltaCompra(insumo: Insumo, cantidadVieja: number, precioViejo: number, ...) { ... }
```

```ts
// costo_lote es snapshot: una vez creada la producción, este valor
// NO se vuelve a tocar aunque el costo_promedio del insumo cambie después.
// Decisión confirmada explícitamente (no es un bug pendiente).
```

**NO comentar esto** (ruido, no aporta):
```ts
// suma los dos números
const total = a + b;
```

---

## ✅ Reglas para la IA al generar código

1. **Nunca reimplementar una fórmula que ya existe en `lib/`.** Si necesita `costo_promedio`, `costo_unitario`, `ganancia` o `margen`, debe importar de `lib/inventario.ts` o `lib/costos.ts` — no recalcular inline en un componente o service.
2. **Ningún componente (`app/**`, `components/**`) accede a SQLite directo.** Siempre pasa por `*.repository.ts`.
3. **Toda escritura pasa primero por el Zod schema correspondiente**, incluso si el dato ya viene "confiable" de otro service interno.
4. **Antes de tocar una columna marcada como "congelada"** en `04_base_datos.md` (`costo_lote`, ingredientes de receta ya usada, `unidad_base` de insumo), el service debe validar explícitamente que la operación esté permitida y lanzar un error claro si no.
5. **Si una regla de negocio no está clara o no está documentada**, la IA debe preguntar antes de asumir — no rellenar el vacío con una suposición silenciosa (esto ya nos pasó con Merma y con el modelo de costeo: mejor preguntar que asumir mal).
6. **Todo cálculo de dinero usa `number` con cuidado de precisión decimal** (JS/TS no tiene decimal nativo) — para el MVP alcanza con redondear a 2 decimales al mostrar, pero los cálculos intermedios no deben redondear antes de tiempo (evitar arrastre de error).

---

## 🧪 Testing (mínimo viable)

Para el MVP no se pide cobertura completa, pero si se agregan tests, priorizar en este orden:
1. `lib/inventario.ts` (fórmula de costo promedio + delta) — es el corazón del negocio
2. `lib/costos.ts` (costo unitario, ganancia, margen)
3. `lib/produccion.ts` (validación de stock suficiente) y `createVentaMermaSchema` en `produccion.schema.ts` (invariante `vendidos + merma <= producidos`)

Todo lo demás (UI, navegación) se prueba manualmente para este MVP.

---

## 🤖 Prompt Base (copiar antes de cualquier request de código)

```
Rol: Arquitecto de software senior, énfasis en código limpio, mantenible y type-safe.

Contexto: Heladería Dibuluc, MVP móvil (React Native + Expo + TypeScript + SQLite)
para calcular costos y rentabilidad de producción de helados. Un solo usuario (dueña
del negocio), sin backend, sin multiusuario.

Documentación de referencia (leer antes de codear, en este orden):
1. docs/01_negocio_reglas.md   → reglas de negocio, fuente de verdad
2. docs/02_historias_usuario.md → flujos y criterios de aceptación
3. docs/03_arquitectura.md      → capas, carpetas, dónde va cada cosa
4. docs/04_base_datos.md        → schema SQLite, qué está congelado y qué no

Modelo de negocio (resumen — el detalle completo está en 01_negocio_reglas.md):
1. Compra: registra insumo + cantidad + costo total (multi-item por ticket)
2. Insumo: stock_disponible + costo_promedio, recalculado con cada compra
   (inventario perpetuo, NO promedio de últimas N compras)
3. Receta: template de ingredientes, editable SOLO hasta su primer uso en una Producción
4. Producción: consume stock real según receta, calcula costo_lote real (no lo comprado),
   snapshot congelado para siempre — no se recalcula aunque cambien precios después
5. Compra: Hard Delete + recalculo de costo_promedio por delta (no requiere historial completo)
6. Merma es declarada manualmente por el usuario (no derivada)
7. Costo unitario = costo_lote / helados_producidos
8. Ganancia = precio_venta - costo_unitario

Restricciones técnicas:
- Todo local (SQLite vía expo-sqlite), sin backend
- Validar con Zod antes de guardar cualquier dato (mismo schema en form y service)
- Tipos TypeScript explícitos, sin any
- Cálculos de costos SIEMPRE en lib/ o *.service.ts, nunca en componentes
- Componentes reutilizables con NativeWind
- Producciones pasadas conservan su costo_lote original (snapshot congelado, no retroactivo)
- Si una regla no está clara en la documentación, preguntar antes de asumir

Cuando codifiques:
1. Primero tipos (Zod + TypeScript, en el *.schema.ts de la feature correspondiente)
2. Luego lógica (helpers en lib/, funciones puras y testeables)
3. Luego service/repository (orquestación + SQL)
4. Luego hook (expone a la UI)
5. Recién al final, componentes/pantallas
6. Comenta solo decisiones no obvias, citando la sección de la doc si aplica
```

---

## 📌 Checklist antes de aceptar código generado por IA

- [ ] ¿Usa las fórmulas de `lib/`, o las reimplementó por su cuenta?
- [ ] ¿Algún componente toca SQLite directo?
- [ ] ¿Respeta qué campos están "congelados" (no editables después de creados)?
- [ ] ¿El nombre de tablas/columnas coincide con `04_base_datos.md`?
- [ ] ¿Faltó preguntar algo que no estaba en la doc, y en cambio se asumió?