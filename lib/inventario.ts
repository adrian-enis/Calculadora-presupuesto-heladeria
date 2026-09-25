/**
 * lib/inventario.ts
 *
 * Fórmulas puras del modelo de "inventario perpetuo" (docs/01_negocio_reglas.md, sección 1 y 2).
 * Sin efectos secundarios, sin SQL — reciben el estado actual del insumo y devuelven el nuevo estado.
 * Esto es lo que hace que se puedan testear sin levantar la app ni mockear SQLite.
 */

export interface EstadoInsumo {
  stockDisponible: number;
  costoPromedio: number;
  valorTotalStock: number; // = costoPromedio * stockDisponible (se mantiene aparte para los deltas)
}

// Absorbe residuos de coma flotante (ej: 0.1 + 0.2 - 0.3) al decidir si el stock quedó en 0.
const EPSILON_STOCK = 1e-9;

/**
 * Stock en 0 implica valor en 0: lo que se agotó o se borró se lleva su valor.
 * Sin esto, deshacer/consumir podía dejar "valor fantasma" (stock 0 con valor > 0)
 * que la próxima compra heredaba, inflando el costo_promedio de producciones futuras.
 */
function normalizarEstado(stockDisponible: number, valorTotalStock: number): EstadoInsumo {
  if (stockDisponible <= EPSILON_STOCK) {
    return { stockDisponible: 0, costoPromedio: 0, valorTotalStock: 0 };
  }
  const valor = Math.max(0, valorTotalStock);
  return { stockDisponible, costoPromedio: valor / stockDisponible, valorTotalStock: valor };
}

/**
 * Registra una entrada de stock (compra nueva, o la mitad "aplicar" de una edición).
 * cantidadBase: cantidad ya convertida a la unidad_base del insumo.
 * precioTotal: costo total pagado por esa cantidad (tal cual lo carga el usuario).
 */
export function registrarEntrada(estado: EstadoInsumo, cantidadBase: number, precioTotal: number): EstadoInsumo {
  // Normalizar primero limpia valor fantasma ya persistido en DBs anteriores a este fix.
  const base = normalizarEstado(estado.stockDisponible, estado.valorTotalStock);
  return normalizarEstado(base.stockDisponible + cantidadBase, base.valorTotalStock + precioTotal);
}

/**
 * Deshace una entrada de stock previamente registrada (borrar compra, o la mitad
 * "deshacer" de una edición). docs/01_negocio_reglas.md, sección 1: "Regla de Borrado y Edición".
 *
 * cantidadBaseVieja / precioTotalViejo deben ser los mismos valores originales del item.
 *
 * Piso en 0: si cantidadBaseVieja es mayor al stock actual (porque ya se consumió
 * parte en una Producción), el resultado es una aproximación — ver el edge case
 * documentado en 01_negocio_reglas.md.
 */
export function deshacerEntrada(estado: EstadoInsumo, cantidadBaseVieja: number, precioTotalViejo: number): EstadoInsumo {
  return normalizarEstado(
    Math.max(0, estado.stockDisponible - cantidadBaseVieja),
    estado.valorTotalStock - precioTotalViejo
  );
}

/**
 * Editar una compra = deshacer el item viejo + registrar el item nuevo, en un solo paso.
 * Es el service (compra.service.ts) el que decide los valores viejo/nuevo a partir
 * de la fila de compra_items antes y después del formulario de edición.
 */
export function editarEntrada(
  estado: EstadoInsumo,
  cantidadBaseVieja: number,
  precioTotalViejo: number,
  cantidadBaseNueva: number,
  precioTotalNuevo: number
): EstadoInsumo {
  const estadoSinViejo = deshacerEntrada(estado, cantidadBaseVieja, precioTotalViejo);
  return registrarEntrada(estadoSinViejo, cantidadBaseNueva, precioTotalNuevo);
}

/**
 * Valor monetario de consumir `cantidad` a costo promedio vigente.
 * Única definición de la fórmula: la usan consumirStock() y produccion.service.
 */
export function costoDeConsumo(estado: EstadoInsumo, cantidad: number): number {
  return cantidad * estado.costoPromedio;
}

/**
 * Consumir stock al producir un lote (docs/01_negocio_reglas.md, sección 4).
 * No modifica costoPromedio — solo se descuenta cantidad y valor (salvo que el
 * stock se agote: ahí todo queda en 0, igual que en normalizarEstado).
 * Lanza error si no hay stock suficiente (regla: producción se bloquea).
 */
export function consumirStock(estado: EstadoInsumo, cantidadUsada: number): EstadoInsumo {
  if (cantidadUsada > estado.stockDisponible) {
    throw new Error(
      `Stock insuficiente: se necesitan ${cantidadUsada}, hay ${estado.stockDisponible} disponibles`
    );
  }
  const costoUsado = costoDeConsumo(estado, cantidadUsada);
  const stockDisponible = estado.stockDisponible - cantidadUsada;
  const valorTotalStock = estado.valorTotalStock - costoUsado;

  if (stockDisponible <= EPSILON_STOCK) {
    return { stockDisponible: 0, costoPromedio: 0, valorTotalStock: 0 };
  }
  return { stockDisponible, costoPromedio: estado.costoPromedio, valorTotalStock: Math.max(0, valorTotalStock) };
}