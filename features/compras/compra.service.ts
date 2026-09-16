/**
 * features/compras/compra.service.ts
 *
 * Valida con Zod antes de tocar el repository (docs/03_arquitectura.md). No hay
 * fórmula propia de Compra que extraer: el cálculo de costo_promedio vive en
 * lib/inventario.ts y ya lo usa compra.repository.ts.
 */

import * as compraRepository from './compra.repository';
import { CompraSchema, EditarCompraItemSchema, type CompraInput, type EditarCompraItemInput } from './compra.schema';

export async function registrarCompra(inputRaw: CompraInput) {
  const input = CompraSchema.parse(inputRaw);
  return compraRepository.registrarCompra(input);
}

export async function editarCompraItem(compraItemId: number, inputRaw: EditarCompraItemInput) {
  const input = EditarCompraItemSchema.parse(inputRaw);
  return compraRepository.editarCompraItem(compraItemId, input);
}

export { eliminarCompra, listarCompras } from './compra.repository';
