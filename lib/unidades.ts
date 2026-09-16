export type Unidad = 'ml' | 'g' | 'kg' | 'l' | 'unidad';

type Categoria = 'peso' | 'volumen' | 'conteo';

const CATEGORIA: Record<Unidad, Categoria> = {
  g: 'peso',
  kg: 'peso',
  ml: 'volumen',
  l: 'volumen',
  unidad: 'conteo',
};

// factor a la unidad chica de su categoría (g para peso, ml para volumen)
const FACTOR_A_UNIDAD_CHICA: Record<Unidad, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  unidad: 1,
};

export function mismaCategoria(a: Unidad, b: Unidad): boolean {
  return CATEGORIA[a] === CATEGORIA[b];
}

/** Convierte cantidad entre unidades de la misma categoría (docs/01_negocio_reglas.md: L→ml sí, kg→ml no). */
export function convertir(cantidad: number, desde: Unidad, hasta: Unidad): number {
  if (!mismaCategoria(desde, hasta)) {
    throw new Error(`No se puede convertir de ${desde} a ${hasta}: son categorías distintas`);
  }
  return (cantidad * FACTOR_A_UNIDAD_CHICA[desde]) / FACTOR_A_UNIDAD_CHICA[hasta];
}

/**
 * Convierte una cantidad cargada por el usuario a la unidad_base de un insumo
 * (compra_items.cantidad_base, receta_ingredientes.cantidad). Comparten esta
 * regla Compra y Receta: cargar en una unidad de otra categoría se bloquea.
 */
export function convertirACantidadBase(cantidad: number, unidad: Unidad, unidadBaseInsumo: Unidad): number {
  if (!mismaCategoria(unidad, unidadBaseInsumo)) {
    throw new Error(
      `No se puede cargar en ${unidad} un insumo cuya unidad base es ${unidadBaseInsumo}: son categorías distintas`
    );
  }
  return convertir(cantidad, unidad, unidadBaseInsumo);
}
