/**
 * features/producciones/produccion.service.ts
 *
 * Orquesta la lógica de "producir un lote" (docs/01_negocio_reglas.md, sección 4).
 * No toca SQLite acá — recibe el estado ya leído (por el repository) y devuelve
 * los datos listos para persistir. Esto lo hace testeable sin mockear la DB.
 */

import { consumirStock, costoDeConsumo, type EstadoInsumo } from '@/lib/inventario';

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

    if (ingrediente.cantidad > estadoActual.stockDisponible) {
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

/**
 * Invariante crítico de Producción (docs/01_negocio_reglas.md, sección 4).
 * Se valida acá ADEMÁS del CHECK de SQLite — doble seguro, y da un mensaje
 * de error más claro que el que tira SQLite por un CHECK violado.
 */
export function validarVentaYMerma(producidos: number, vendidos: number, merma: number): void {
  if (vendidos + merma > producidos) {
    throw new Error(
      `vendidos + merma (${vendidos + merma}) no puede superar helados_producidos (${producidos})`
    );
  }
  if (vendidos < 0 || merma < 0) {
    throw new Error('helados_vendidos y merma_declarada no pueden ser negativos');
  }
}