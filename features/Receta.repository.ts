/**
 * features/Receta.repository.ts
 *
 * Único lugar que toca SQLite para Recetas. A diferencia de Compra, cargar un
 * ingrediente NO toca stock/costo_promedio del insumo — receta_ingredientes
 * es solo "cuánto se necesita por lote", el consumo real ocurre en Producción.
 */

import { getDb } from '@/db/client';
import { convertirACantidadBase, type Unidad } from '@/lib/unidades';
import type { SQLiteDatabase } from 'expo-sqlite';
import { obtenerOCrearInsumo } from './Insumo.repository';
import {
  CrearRecetaSchema,
  EditarIngredientesRecetaSchema,
  type CrearRecetaInput,
  type EditarIngredientesRecetaInput,
  type RecetaIngredienteInput,
} from './Receta.schema';

async function insertarIngredientes(
  db: SQLiteDatabase,
  recetaId: number,
  ingredientes: RecetaIngredienteInput[]
): Promise<void> {
  for (const ingrediente of ingredientes) {
    const insumo = await obtenerOCrearInsumo(db, ingrediente.insumoNombre, ingrediente.unidad);
    const cantidadBase = convertirACantidadBase(ingrediente.cantidad, ingrediente.unidad, insumo.unidadBase);

    await db.runAsync('INSERT INTO receta_ingredientes (receta_id, insumo_id, cantidad) VALUES (?, ?, ?)', [
      recetaId,
      insumo.id,
      cantidadBase,
    ]);
  }
}

async function tieneProduccionesAsociadas(db: SQLiteDatabase, recetaId: number): Promise<boolean> {
  const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM producciones WHERE receta_id = ? LIMIT 1', [
    recetaId,
  ]);
  return row !== null;
}

/** Crea una receta con sus ingredientes (HU 3.1). Si un insumo no existe, se crea. */
export async function crearReceta(inputRaw: CrearRecetaInput): Promise<{ recetaId: number }> {
  const input = CrearRecetaSchema.parse(inputRaw);
  const db = await getDb();

  let recetaId = 0;

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync('INSERT INTO recetas (nombre) VALUES (?)', [input.nombre]);
    recetaId = result.lastInsertRowId;
    await insertarIngredientes(db, recetaId, input.ingredientes);
  });

  return { recetaId };
}

/**
 * Reemplaza los ingredientes de una receta (HU 3.1b). Bloqueado si la receta
 * ya fue usada en alguna Producción — no se puede expresar como CHECK de
 * SQLite (depende de otra tabla), queda a cargo de este repository.
 */
export async function editarIngredientesReceta(recetaId: number, inputRaw: EditarIngredientesRecetaInput): Promise<void> {
  const input = EditarIngredientesRecetaSchema.parse(inputRaw);
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    const receta = await db.getFirstAsync<{ id: number }>('SELECT id FROM recetas WHERE id = ?', [recetaId]);
    if (!receta) throw new Error(`La receta ${recetaId} no existe`);

    if (await tieneProduccionesAsociadas(db, recetaId)) {
      throw new Error(`La receta ${recetaId} ya fue usada en una producción: sus ingredientes no se pueden editar`);
    }

    await db.runAsync('DELETE FROM receta_ingredientes WHERE receta_id = ?', [recetaId]);
    await insertarIngredientes(db, recetaId, input.ingredientes);
  });
}

/** Desactiva una receta (HU 3.2): no se puede volver a usar para producir, pero no borra su historial. */
export async function desactivarReceta(recetaId: number): Promise<void> {
  const db = await getDb();

  const result = await db.runAsync("UPDATE recetas SET estado = 'inactivo' WHERE id = ? AND estado = 'activo'", [
    recetaId,
  ]);
  if (result.changes === 0) {
    throw new Error(`Receta ${recetaId} inexistente o ya inactiva`);
  }
}

export interface RecetaIngredienteDetalle {
  insumoId: number;
  insumoNombre: string;
  cantidad: number;
  unidadBase: Unidad;
}

export interface RecetaDetalle {
  id: number;
  nombre: string;
  estado: string;
  ingredientes: RecetaIngredienteDetalle[];
}

export async function obtenerReceta(recetaId: number): Promise<RecetaDetalle | null> {
  const db = await getDb();

  const receta = await db.getFirstAsync<{ id: number; nombre: string; estado: string }>(
    'SELECT id, nombre, estado FROM recetas WHERE id = ?',
    [recetaId]
  );
  if (!receta) return null;

  const ingredientes = await db.getAllAsync<{
    insumo_id: number;
    insumo_nombre: string;
    cantidad: number;
    unidad_base: Unidad;
  }>(
    `SELECT ri.insumo_id, i.nombre AS insumo_nombre, ri.cantidad, i.unidad_base
     FROM receta_ingredientes ri JOIN insumos i ON i.id = ri.insumo_id
     WHERE ri.receta_id = ?`,
    [recetaId]
  );

  return {
    id: receta.id,
    nombre: receta.nombre,
    estado: receta.estado,
    ingredientes: ingredientes.map((i) => ({
      insumoId: i.insumo_id,
      insumoNombre: i.insumo_nombre,
      cantidad: i.cantidad,
      unidadBase: i.unidad_base,
    })),
  };
}

/** Recetas activas, para elegir al producir un lote. */
export async function listarRecetasActivas(): Promise<{ id: number; nombre: string }[]> {
  const db = await getDb();
  return db.getAllAsync<{ id: number; nombre: string }>(
    "SELECT id, nombre FROM recetas WHERE estado = 'activo' ORDER BY nombre"
  );
}
