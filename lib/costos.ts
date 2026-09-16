/**
 * lib/costos.ts
 *
 * Fórmulas puras de costo unitario, ganancia y margen (docs/01_negocio_reglas.md,
 * secciones 7-8; docs/README.md). costo_lote llega como snapshot congelado de
 * Producción — estas funciones no lo recalculan, solo lo dividen/comparan.
 */

export function costoUnitario(costoLote: number, heladosProducidos: number): number {
  if (heladosProducidos <= 0) {
    throw new Error('heladosProducidos debe ser mayor a 0 para calcular costo unitario');
  }
  return costoLote / heladosProducidos;
}

export function ganancia(precioVenta: number, costoUnitarioValor: number): number {
  return precioVenta - costoUnitarioValor;
}

export function margen(precioVenta: number, costoUnitarioValor: number): number {
  if (precioVenta <= 0) {
    throw new Error('precioVenta debe ser mayor a 0 para calcular margen');
  }
  return (ganancia(precioVenta, costoUnitarioValor) / precioVenta) * 100;
}
