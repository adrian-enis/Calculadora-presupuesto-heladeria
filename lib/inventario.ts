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

/**
 * Registra una entrada de stock (compra nueva, o la mitad "aplicar" de una edición).
 * cantidadBase: cantidad ya convertida a la unidad_base del insumo.
 * precioTotal: costo total pagado por esa cantidad (tal cual lo carga el usuario).
 */
export function registrarEntrada(estado: EstadoInsumo, cantidadBase: number, precioTotal: number): EstadoInsumo {
  const stockDisponible = estado.stockDisponible + cantidadBase;
  const valorTotalStock = estado.valorTotalStock + precioTotal;
  const costoPromedio = stockDisponible > 0 ? valorTotalStock / stockDisponible : 0;

  return { stockDisponible, costoPromedio, valorTotalStock };
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
  const stockDisponible = Math.max(0, estado.stockDisponible - cantidadBaseVieja);
  const valorTotalStock = Math.max(0, estado.valorTotalStock - precioTotalViejo);
  const costoPromedio = stockDisponible > 0 ? valorTotalStock / stockDisponible : 0;

  return { stockDisponible, costoPromedio, valorTotalStock };
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
 * Consumir stock al producir un lote (docs/01_negocio_reglas.md, sección 4).
 * No modifica costoPromedio — solo se descuenta cantidad y valor.
 * Lanza error si no hay stock suficiente (regla: producción se bloquea).
 */
export function consumirStock(estado: EstadoInsumo, cantidadUsada: number): EstadoInsumo {
  if (cantidadUsada > estado.stockDisponible) {
    throw new Error(
      `Stock insuficiente: se necesitan ${cantidadUsada}, hay ${estado.stockDisponible} disponibles`
    );
  }

  const costoUsado = cantidadUsada * estado.costoPromedio;
  const stockDisponible = estado.stockDisponible - cantidadUsada;
  const valorTotalStock = estado.valorTotalStock - costoUsado;

  return { stockDisponible, costoPromedio: estado.costoPromedio, valorTotalStock };
}