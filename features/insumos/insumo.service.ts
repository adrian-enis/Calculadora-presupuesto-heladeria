/**
 * features/insumos/insumo.service.ts
 *
 * Reglas de Insumo (docs/01_negocio_reglas.md, sección 2): nombre único sin
 * distinguir mayúsculas y editable retroactivamente, unidad congelada, y solo
 * una Compra puede crear un insumo (obtenerOCrearInsumo, que corre dentro de
 * la transacción de compra.service.ts).
 */

import { enTransaccion, getDb } from '@/db/client';
import type { Unidad } from '@/lib/unidades';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as insumoRepository from './insumo.repository';
import type { InsumoConEstado, InsumoListado } from './insumo.repository';
import { EditarNombreInsumoSchema, type EditarNombreInsumoInput } from './insumo.schema';

export type { InsumoConEstado, InsumoListado };

/** Solo Compra crea insumos (HU 1.1); Receta únicamente referencia los ya comprados. */
export async function obtenerOCrearInsumo(
  db: SQLiteDatabase,
  nombre: string,
  unidadSolicitada: Unidad
): Promise<InsumoConEstado> {
  const existente = await insumoRepository.buscarInsumoPorNombre(db, nombre);
  return existente ?? insumoRepository.insertarInsumo(db, nombre, unidadSolicitada);
}

/**
 * HU 2.2: retroactivo a compras/recetas pasadas porque esas tablas solo guardan
 * insumo_id. El chequeo de duplicado da un mensaje claro; el índice único de
 * nombre_normalizado es el gate real.
 */
export async function editarNombreInsumo(insumoId: number, inputRaw: EditarNombreInsumoInput): Promise<void> {
  const { nombre } = EditarNombreInsumoSchema.parse(inputRaw);

  await enTransaccion(async (db) => {
    const otro = await insumoRepository.buscarInsumoPorNombre(db, nombre);
    if (otro && otro.id !== insumoId) throw new Error(`Ya existe un insumo llamado "${nombre}"`);

    if (!(await insumoRepository.actualizarNombreInsumo(db, insumoId, nombre))) {
      throw new Error(`Insumo ${insumoId} no existe`);
    }
  });
}

export async function listarInsumos(): Promise<InsumoListado[]> {
  return insumoRepository.listarInsumos(await getDb());
}
