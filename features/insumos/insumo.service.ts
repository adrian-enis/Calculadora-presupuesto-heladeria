/**
 * features/insumos/insumo.service.ts
 *
 * Valida con Zod antes de tocar el repository (docs/03_arquitectura.md).
 * obtenerOCrearInsumo/actualizarEstadoInsumo no se re-exportan acá: son
 * helpers internos usados por compra.repository.ts y receta.repository.ts,
 * no una operación que dispare la UI directamente.
 */

import * as insumoRepository from './insumo.repository';
import { EditarNombreInsumoSchema, type EditarNombreInsumoInput } from './insumo.schema';

export async function editarNombreInsumo(insumoId: number, inputRaw: EditarNombreInsumoInput) {
  const input = EditarNombreInsumoSchema.parse(inputRaw);
  return insumoRepository.editarNombreInsumo(insumoId, input.nombre);
}

export { listarInsumos } from './insumo.repository';
