/**
 * lib/produccion.ts
 *
 * Cálculo puro de "producir un lote" (docs/01_negocio_reglas.md, sección 4).
 * Recibe el estado de insumos ya leído y devuelve lo que hay que persistir;
 * la lectura/escritura la orquesta produccion.service.ts. Testeable sin SQLite.
 * (El invariante vendidos + merma <= producidos vive en createVentaMermaSchema.)
 */

import { consumirStock, costoDeConsumo, hayStockSuficiente, type EstadoInsumo } from '@/lib/inventario';

export interface IngredienteReceta {
  insumoId: number;
  cantidad: number; // en unidad_base del insumo (ver 04_base_datos.md, receta_ingredientes)
}

export interface ConsumoCalculado {
  insumoId: number;
  cantidadUsada: number;
  costoPromedioMomento: number;
  costoUsado: number;
}

export interface ResultadoProduccion {
  consumos: ConsumoCalculado[];
  estadosInsumosActualizados: Map<number, EstadoInsumo>;
  costoLote: number;
}

/**
 * Calcula qué se consume de cada insumo al producir un lote, y arma las filas
 * que van a produccion_consumos (docs/04_base_datos.md).
 *
 * Si algún insumo no tiene stock suficiente, lanza error y NO devuelve nada parcial
 * — la regla es "la producción se bloquea entera" (docs/01_negocio_reglas.md, sección 4),
 * no se permite consumir la mitad de los insumos y dejar el resto sin producir.
 */
export function calcularConsumosProduccion(
  ingredientes: IngredienteReceta[],
  estadosInsumos: Map<number, EstadoInsumo>
): ResultadoProduccion {
  const consumos: ConsumoCalculado[] = [];
  const estadosActualizados = new Map(estadosInsumos);
  let costoLote = 0;

  for (const ingrediente of ingredientes) {
    const estadoActual = estadosActualizados.get(ingrediente.insumoId);
    if (!estadoActual) {
      throw new Error(`Insumo ${ingrediente.insumoId} de la receta no tiene estado cargado`);
    }

    if (!hayStockSuficiente(estadoActual, ingrediente.cantidad)) {
      throw new Error(
        `Stock insuficiente del insumo ${ingrediente.insumoId}: se necesitan ${ingrediente.cantidad}, ` +
          `hay ${estadoActual.stockDisponible} disponibles`
      );
    }
    const estadoNuevo = consumirStock(estadoActual, ingrediente.cantidad);

    const costoUsado = costoDeConsumo(estadoActual, ingrediente.cantidad);

    consumos.push({
      insumoId: ingrediente.insumoId,
      cantidadUsada: ingrediente.cantidad,
      costoPromedioMomento: estadoActual.costoPromedio,
      costoUsado,
    });

    estadosActualizados.set(ingrediente.insumoId, estadoNuevo);
    costoLote += costoUsado;
  }

  return { consumos, estadosInsumosActualizados: estadosActualizados, costoLote };
}