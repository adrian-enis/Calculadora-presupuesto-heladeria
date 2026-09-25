/**
 * features/recetas/receta.repository.ts
 *
 * SQL puro sobre `recetas` y `receta_ingredientes`. Qué insumos se aceptan y
 * cuándo se pueden editar los ingredientes (HU 3.1b) lo decide receta.service.ts.
 */

import type { Unidad } from '@/lib/unidades';
import type { SQLiteDatabase } from 'expo-sqlite';

export async function insertarReceta(db: SQLiteDatabase, nombre: string): Promise<number> {
  const result = await db.runAsync('INSERT INTO recetas (nombre) VALUES (?)', [nombre]);
  return result.lastInsertRowId;
}

/** cantidad ya en unidad_base del insumo (docs/04_base_datos.md, receta_ingredientes). */
export async function insertarIngrediente(
  db: SQLiteDatabase,
  recetaId: number,
  insumoId: number,
  cantidad: number
): Promise<void> {
  await db.runAsync('INSERT INTO receta_ingredientes (receta_id, insumo_id, cantidad) VALUES (?, ?, ?)', [
    recetaId,
    insumoId,
    cantidad,
  ]);
}

export async function borrarIngredientes(db: SQLiteDatabase, recetaId: number): Promise<void> {
  await db.runAsync('DELETE FROM receta_ingredientes WHERE receta_id = ?', [recetaId]);
}

export async function tieneProduccionesAsociadas(db: SQLiteDatabase, recetaId: number): Promise<boolean> {
  const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM producciones WHERE receta_id = ? LIMIT 1', [
    recetaId,
  ]);
  return row !== null;
}

/** Devuelve false si la receta no existe o ya estaba inactiva. */
export async function desactivarReceta(db: SQLiteDatabase, recetaId: number): Promise<boolean> {
  const result = await db.runAsync("UPDATE recetas SET estado = 'inactivo' WHERE id = ? AND estado = 'activo'", [
    recetaId,
  ]);
  return result.changes > 0;
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

export async function obtenerReceta(db: SQLiteDatabase, recetaId: number): Promise<RecetaDetalle | null> {
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

export async function listarRecetasActivas(db: SQLiteDatabase): Promise<{ id: number; nombre: string }[]> {
  return db.getAllAsync<{ id: number; nombre: string }>(
    "SELECT id, nombre FROM recetas WHERE estado = 'activo' ORDER BY nombre"
  );
}

export async function listarRecetas(db: SQLiteDatabase): Promise<{ id: number; nombre: string; estado: string }[]> {
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

/** Recetas activas con el costo_promedio crudo de cada insumo; el costo estimado lo calcula el service. */
export async function listarRecetasConIngredientes(db: SQLiteDatabase): Promise<RecetaConIngredientes[]> {
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
