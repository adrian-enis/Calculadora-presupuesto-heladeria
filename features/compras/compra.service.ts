/**
 * features/compras/compra.service.ts
 *
 * Reglas de Compra (docs/01_negocio_reglas.md, sección 1): cada item actualiza
 * stock y costo_promedio de su insumo por inventario perpetuo, y editar/borrar
 * se resuelve por delta (lib/inventario.ts). Todo en una transacción: si un
 * item falla (ej. unidad de otra categoría), no se escribe nada.
 */

import { enTransaccion, getDb } from '@/db/client';
import * as insumoRepository from '@/features/insumos/insumo.repository';
import { obtenerOCrearInsumo } from '@/features/insumos/insumo.service';
import { deshacerEntrada, editarEntrada, registrarEntrada } from '@/lib/inventario';
import { convertirACantidadBase } from '@/lib/unidades';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as compraRepository from './compra.repository';
import type { CompraListada } from './compra.repository';
import { CompraSchema, EditarCompraItemSchema, type CompraInput, type EditarCompraItemInput } from './compra.schema';

export type { CompraListada };

async function obtenerInsumoOFallar(db: SQLiteDatabase, insumoId: number) {
  const insumo = await insumoRepository.obtenerEstadoInsumo(db, insumoId);
  if (!insumo) throw new Error(`Insumo ${insumoId} no existe`);
  return insumo;
}

/** HU 1.1: si un insumo no existe, se crea con la unidad del item. */
export async function registrarCompra(inputRaw: CompraInput): Promise<{ compraId: number }> {
  const input = CompraSchema.parse(inputRaw);

  return enTransaccion(async (db) => {
    const compraId = await compraRepository.insertarCompra(db, input.fecha);

    for (const item of input.items) {
      const insumo = await obtenerOCrearInsumo(db, item.insumoNombre, item.unidad);
      const cantidadBase = convertirACantidadBase(item.cantidad, item.unidad, insumo.unidadBase);

      await insumoRepository.actualizarEstadoInsumo(db, insumo.id, registrarEntrada(insumo.estado, cantidadBase, item.precio));
      await compraRepository.insertarCompraItem(db, {
        compraId,
        insumoId: insumo.id,
        cantidad: item.cantidad,
        unidad: item.unidad,
        cantidadBase,
        precio: item.precio,
      });
    }

    return { compraId };
  });
}

/**
 * HU 1.2: deshace el valor viejo y aplica el nuevo en un solo delta. No toca
 * costo_lote de producciones pasadas — ese valor queda congelado.
 */
export async function editarCompraItem(compraItemId: number, inputRaw: EditarCompraItemInput): Promise<void> {
  const input = EditarCompraItemSchema.parse(inputRaw);

  await enTransaccion(async (db) => {
    const anterior = await compraRepository.obtenerCompraItem(db, compraItemId);
    if (!anterior) throw new Error(`El item de compra ${compraItemId} no existe`);

    const insumo = await obtenerInsumoOFallar(db, anterior.insumoId);
    const cantidadBase = convertirACantidadBase(input.cantidad, input.unidad, insumo.unidadBase);
    const estadoNuevo = editarEntrada(insumo.estado, anterior.cantidadBase, anterior.precio, cantidadBase, input.precio);

    await insumoRepository.actualizarEstadoInsumo(db, insumo.id, estadoNuevo);
    await compraRepository.actualizarCompraItem(db, compraItemId, { ...input, cantidadBase });
  });
}

/**
 * HU 1.3, hard delete: el delta sobre insumos va ANTES del delete, porque el
 * ON DELETE CASCADE se lleva los compra_items que hacen falta para calcularlo.
 */
export async function eliminarCompra(compraId: number): Promise<void> {
  await enTransaccion(async (db) => {
    if (!(await compraRepository.existeCompra(db, compraId))) {
      throw new Error(`La compra ${compraId} no existe`);
    }

    for (const item of await compraRepository.listarItemsDeCompra(db, compraId)) {
      const insumo = await obtenerInsumoOFallar(db, item.insumoId);
      await insumoRepository.actualizarEstadoInsumo(
        db,
        insumo.id,
        deshacerEntrada(insumo.estado, item.cantidadBase, item.precio)
      );
    }

    await compraRepository.borrarCompra(db, compraId);
  });
}

export async function listarCompras(limit: number, offset: number): Promise<CompraListada[]> {
  return compraRepository.listarCompras(await getDb(), limit, offset);
}
