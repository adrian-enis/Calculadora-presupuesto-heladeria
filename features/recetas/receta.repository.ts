/**
 * features/recetas/receta.repository.ts
 *
 * Único lugar que toca SQLite para Recetas. A diferencia de Compra, cargar un
 * ingrediente NO toca stock/costo_promedio del insumo — receta_ingredientes
 * es solo "cuánto se necesita por lote", el consumo real ocurre en Producción.
 */

import { getDb } from '@/db/client';
import { buscarInsumoPorNombre } from '@/features/insumos/insumo.repository';
import { convertirACantidadBase, type Unidad } from '@/lib/unidades';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { CrearRecetaInput, EditarIngredientesRecetaInput, RecetaIngredienteInput } from './receta.schema';

async function insertarIngredientes(
  db: SQLiteDatabase,
  recetaId: number,
  ingredientes: RecetaIngredienteInput[]
): Promise<void> {
  for (const ingrediente of ingredientes) {
    const insumo = await buscarInsumoPorNombre(db, ingrediente.insumoNombre);
    if (!insumo) {
      throw new Error(`El insumo "${ingrediente.insumoNombre}" no existe: registralo primero con una compra`);
    }
    const cantidadBase = convertirACantidadBase(ingrediente.cantidad, ingrediente.unidad, insumo.unidadBase);

    await db.runAsync('INSERT INTO receta_ingredientes (receta_id, insumo_id, cantidad) VALUES (?, ?, ?)', [
      recetaId,
      insumo.id,
      cantidadBase,
    ]);
  }
}

/** HU 3.1b: si tiene producciones asociadas, sus ingredientes quedan bloqueados. */
export async function tieneProduccionesAsociadas(recetaId: number): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM producciones WHERE receta_id = ? LIMIT 1', [
    recetaId,
  ]);
  return row !== null;
}

/** Crea una receta con sus ingredientes (HU 3.1). Todo insumo debe existir (creado por una compra). */
export async function crearReceta(input: CrearRecetaInput): Promise<{ recetaId: number }> {
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
export async function editarIngredientesReceta(recetaId: number, input: EditarIngredientesRecetaInput): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    const receta = await db.getFirstAsync<{ id: number }>('SELECT id FROM recetas WHERE id = ?', [recetaId]);
    if (!receta) throw new Error(`La receta ${recetaId} no existe`);

    if (await tieneProduccionesAsociadas(recetaId)) {
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

/** Todas las recetas (HU 3.2: las inactivas siguen visibles, solo salen del dropdown de producir). */
export async function listarRecetas(): Promise<{ id: number; nombre: string; estado: string }[]> {
  const db = await getDb();
  return db.getAllAsync<{ id: number; nombre: string; estado: string }>(
    'SELECT id, nombre, estado FROM recetas ORDER BY nombre'
  );
}

export interface RecetaIngredienteConCostoPromedio {
  insumoNombre: string;
  cantidad: number;
  unidadBase: Unidad;
  costoPromedioInsumo: number;
}

export interface RecetaConIngredientes {
  id: number;
  nombre: string;
  estado: string;
  ingredientes: RecetaIngredienteConCostoPromedio[];
}

/**
 * Recetas activas con sus ingredientes y el costo_promedio actual de cada
 * insumo (pantalla "Mis Recetas"). El costo_promedio se lleva crudo: el
 * costo estimado del lote se calcula en receta.service.ts con
 * lib/inventario.ts, no acá (este repository es SQL puro).
 */
export async function listarRecetasConIngredientes(): Promise<RecetaConIngredientes[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    receta_id: number;
    receta_nombre: string;
    estado: string;
    insumo_nombre: string;
    cantidad: number;
    unidad_base: Unidad;
    costo_promedio: number;
  }>(
    `SELECT r.id AS receta_id, r.nombre AS receta_nombre, r.estado,
            i.nombre AS insumo_nombre, ri.cantidad, i.unidad_base, i.costo_promedio
     FROM recetas r
     JOIN receta_ingredientes ri ON ri.receta_id = r.id
     JOIN insumos i ON i.id = ri.insumo_id
     WHERE r.estado = 'activo'
     ORDER BY r.nombre, i.nombre`
  );

  const recetasPorId = new Map<number, RecetaConIngredientes>();
  for (const row of rows) {
    let receta = recetasPorId.get(row.receta_id);
    if (!receta) {
      receta = { id: row.receta_id, nombre: row.receta_nombre, estado: row.estado, ingredientes: [] };
      recetasPorId.set(row.receta_id, receta);
    }
    receta.ingredientes.push({
      insumoNombre: row.insumo_nombre,
      cantidad: row.cantidad,
      unidadBase: row.unidad_base,
      costoPromedioInsumo: row.costo_promedio,
    });
  }
  return [...recetasPorId.values()];
}
