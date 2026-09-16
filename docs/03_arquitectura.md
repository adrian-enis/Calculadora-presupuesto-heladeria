# 🏗️ Arquitectura — Heladería Dibuluc

> Objetivo: separar claramente **reglas de negocio** (de `01_negocio_reglas.md`) del código de UI, para que los cálculos de costos sean testeables, auditables y no vivan escondidos dentro de componentes.

---

## 🎯 Patrón: Capas simples (no Clean Architecture completa)

Para un MVP de una sola persona no hace falta Clean Architecture con casos de uso/entidades/puertos. Alcanza con **3 capas bien separadas**:

```
UI (screens/components)
   ↓ usa
HOOKS (orquestan, exponen estado a la UI)
   ↓ llaman a
SERVICES (reglas de negocio de 01_negocio_reglas.md — puro TypeScript, sin UI)
   ↓ usan
REPOSITORIES (acceso a SQLite — SQL puro, sin lógica de negocio)
```

**Regla de oro:** un componente de React **nunca** hace `SELECT`/`INSERT` directo ni calcula `costo_promedio` a mano. Todo pasa por `services/`.

---

## 📁 Estructura de Carpetas

```
app/                          # Expo Router — pantallas (file-based routing)
  (tabs)/
    compras/
      index.tsx               # Historial de compras
      nueva.tsx                # Nueva compra
      [id].tsx                 # Detalle/editar compra
    insumos/
      index.tsx
    recetas/
      index.tsx
      nueva.tsx
      [id].tsx
    producciones/
      index.tsx
      nueva.tsx
      [id].tsx                 # Detalle: costo, ganancia, margen, vender/merma
  _layout.tsx

components/                   # UI reutilizable, sin lógica de negocio
  ui/                          # Botones, inputs, cards genéricas
  compras/                     # Componentes específicos de una feature
  producciones/

features/                     # Núcleo de negocio, organizado por dominio
  compras/
    compra.schema.ts           # Zod schema + tipos TS
    compra.service.ts          # registrarCompra(), editarCompra(), eliminarCompra()
    compra.repository.ts       # queries SQL de compras
    useCompras.ts               # hook: expone data + acciones a la UI
  insumos/
    insumo.schema.ts
    insumo.service.ts           # recalcularCostoPromedio(), aplicarDelta()
    insumo.repository.ts
    useInsumos.ts
  recetas/
    receta.schema.ts
    receta.service.ts           # crearReceta(), puedeEditarse() [ver HU 3.1b]
    receta.repository.ts
    useRecetas.ts
  producciones/
    produccion.schema.ts
    produccion.service.ts       # producirLote(), calcularCostoLote(), anular()
    produccion.repository.ts
    useProducciones.ts

db/
  schema.sql                    # DDL de todas las tablas
  migrations/                    # Cambios incrementales al schema
  client.ts                      # Inicialización de expo-sqlite
  seed.ts                        # Datos iniciales de dev/demo, invocación manual — no corre al arrancar

lib/
  costos.ts                      # Funciones puras: costoUnitario(), ganancia(), margen()
  inventario.ts                  # Funciones puras: nuevoCostoPromedio(), aplicarDelta()
  unidades.ts                    # Conversión de unidades (L→ml) y validación de categorías

types/
  common.ts                      # Tipos compartidos (Unidad, Estado, etc.)
```

---

## 🧩 Por qué esta separación (mapeo directo a las reglas de negocio)

| Carpeta | Qué contiene | Ejemplo tomado de `01_negocio_reglas.md` |
|---|---|---|
| `lib/inventario.ts` | Fórmulas puras de costo promedio ponderado | `nuevoCostoPromedio(stockActual, costoActual, cantComprada, precioCompra)` |
| `lib/costos.ts` | Fórmulas de costo unitario / ganancia / margen | `costoUnitario(costoLote, producidos)` |
| `features/compras/compra.service.ts` | Orquesta: crear/editar/borrar compra + delta en insumo | Usa `lib/inventario.ts`, nunca reimplementa la fórmula |
| `features/producciones/produccion.service.ts` | Valida stock suficiente, congela `costo_lote`, valida `vendidos + merma <= producidos` | Regla crítica de Producción |
| `features/recetas/receta.service.ts` | `puedeEditarse(recetaId)` → chequea si tiene producciones asociadas | Regla HU 3.1b |

**Por qué funciones puras en `lib/`:** son las más fáciles de testear (sin mockear SQLite) y las más críticas de tener bien — un error en `nuevoCostoPromedio` afecta todo el negocio.

---

## 🗄️ Convenciones de Base de Datos (SQLite)

- Nombres de tabla en `snake_case` plural: `compras`, `compra_items`, `insumos`, `recetas`, `receta_ingredientes`, `producciones`.
- Toda tabla con estados (`Activo`/`Anulado`/`Inactivo`) usa una columna `estado TEXT` con valores fijos, nunca `boolean` suelto (para poder agregar estados futuros sin migrar tipos).
- Los campos "congelados" (ej. `costo_lote`, ingredientes de receta ya usada) se escriben una sola vez y el `service` correspondiente rechaza cualquier `UPDATE` posterior — no confiar solo en la UI para bloquear la edición.
- Ver `04_base_datos.md` para el detalle de tablas y relaciones (próximo documento).

---

## ✅ Validación con Zod

- Cada feature tiene su propio `*.schema.ts` con el Zod schema **y** el tipo TS derivado (`z.infer<typeof CompraSchema>`), para no duplicar tipos a mano.
- La validación ocurre en el `service`, antes de tocar el repository — así la regla de negocio se cumple sin importar si el dato viene del formulario, de un test, o de un futuro import masivo.
- React Hook Form usa el mismo schema para validar en el formulario (vía `@hookform/resolvers/zod`), evitando reglas duplicadas entre form y backend local.

---

## 🎨 UI (NativeWind)

- Estilos con clases Tailwind vía NativeWind — sin hojas de estilo separadas por componente.
- Componentes de `components/ui/` no importan nada de `features/` — son genéricos y reciben todo por props.
- Componentes de `components/<feature>/` sí pueden usar los hooks de esa feature (ej. `components/producciones/CostoCard.tsx` usa `useProducciones`).

---

## 🧭 Navegación (Expo Router)

- Rutas basadas en archivos, agrupadas por feature (`app/(tabs)/compras/`, `app/(tabs)/producciones/`, etc.)
- Pantallas (`app/**/*.tsx`) son "tontas": arman el layout y consumen hooks de `features/`. No deberían tener lógica de cálculo ni SQL directo.

---

## 📌 Regla no negociable

> **Ningún componente de React llama directo a SQLite ni reimplementa una fórmula de `01_negocio_reglas.md`.**
> Si una pantalla necesita un cálculo, existe (o se crea) una función en `lib/` o un método en `*.service.ts`. Esto es lo que permite que mañana se pueda testear la lógica de negocio sin levantar la app.