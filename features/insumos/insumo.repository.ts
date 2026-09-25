/**
 * features/insumos/insumo.repository.ts
 *
 * Helpers de SQLite sobre `insumos` compartidos por Compra y Receta (Compra
 * busca o crea por nombre; Receta solo busca — ver obtenerOCrearInsumo).
 */

import { getDb } from '@/db/client';
import type { EstadoInsumo } from '@/lib/inventario';
import type { Unidad } from '@/lib/unidades';
import type { SQLiteDatabase } from 'expo-sqlite';

export interface InsumoConEstado {
  id: number;
  unidadBase: Unidad;
  estado: EstadoInsumo;
}

function filaAEstado(row: {
  stock_disponible: number;
  costo_promedio: number;
  valor_total_stock: number;
}): EstadoInsumo {
  return {
    stockDisponible: row.stock_disponible,
    costoPromedio: row.costo_promedio,
    valorTotalStock: row.valor_total_stock,
  };
}

export async function buscarInsumoPorNombre(db: SQLiteDatabase, nombre: string): Promise<InsumoConEstado | null> {
  const row = await db.getFirstAsync<{
    id: number;
    unidad_base: Unidad;
    stock_disponible: number;
    costo_promedio: number;
    valor_total_stock: number;
  }>('SELECT id, unidad_base, stock_disponible, costo_promedio, valor_total_stock FROM insumos WHERE nombre = ?', [
    nombre,
  ]);
  return row ? { id: row.id, unidadBase: row.unidad_base, estado: filaAEstado(row) } : null;
}

/** Solo Compra crea insumos (HU 1.1); Receta únicamente referencia los ya comprados. */
export async function obtenerOCrearInsumo(
  db: SQLiteDatabase,
  nombre: string,
  unidadSolicitada: Unidad
): Promise<InsumoConEstado> {
  const existente = await buscarInsumoPorNombre(db, nombre);
  if (existente) return existente;

  const result = await db.runAsync('INSERT INTO insumos (nombre, unidad_base) VALUES (?, ?)', [
    nombre,
    unidadSolicitada,
  ]);

  return {
    id: result.lastInsertRowId,
    unidadBase: unidadSolicitada,
    estado: { stockDisponible: 0, costoPromedio: 0, valorTotalStock: 0 },
  };
}

export async function obtenerEstadoInsumo(db: SQLiteDatabase, insumoId: number): Promise<InsumoConEstado | null> {
  const row = await db.getFirstAsync<{
    id: number;
    unidad_base: Unidad;
    stock_disponible: number;
    costo_promedio: number;
    valor_total_stock: number;
  }>('SELECT id, unidad_base, stock_disponible, costo_promedio, valor_total_stock FROM insumos WHERE id = ?', [
    insumoId,
  ]);
  if (!row) return null;
  return { id: row.id, unidadBase: row.unidad_base, estado: filaAEstado(row) };
}

export async function actualizarEstadoInsumo(db: SQLiteDatabase, insumoId: number, estado: EstadoInsumo): Promise<void> {
  await db.runAsync('UPDATE insumos SET stock_disponible = ?, costo_promedio = ?, valor_total_stock = ? WHERE id = ?', [
    estado.stockDisponible,
    estado.costoPromedio,
    estado.valorTotalStock,
    insumoId,
  ]);
}

export interface InsumoListado {
  id: number;
  nombre: string;
  unidadBase: Unidad;
  stockDisponible: number;
  costoPromedio: number;
}

/** Lista todos los insumos, incluso sin stock (HU 2.1: no desaparecen). */
export async function listarInsumos(): Promise<InsumoListado[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    nombre: string;
    unidad_base: Unidad;
    stock_disponible: number;
    costo_promedio: number;
  }>('SELECT id, nombre, unidad_base, stock_disponible, costo_promedio FROM insumos ORDER BY nombre');

  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    unidadBase: r.unidad_base,
    stockDisponible: r.stock_disponible,
    costoPromedio: r.costo_promedio,
  }));
}

/**
 * Corrige el nombre de un insumo (HU 2.2), retroactivo a compras/recetas
 * pasadas porque esas tablas solo guardan insumo_id. unidad_base es congelada:
 * a propósito no existe un editarUnidadInsumo().
 */
export async function editarNombreInsumo(insumoId: number, nombre: string): Promise<void> {
  const db = await getDb();
  const result = await db.runAsync('UPDATE insumos SET nombre = ? WHERE id = ?', [nombre, insumoId]);
  if (result.changes === 0) {
    throw new Error(`Insumo ${insumoId} no existe`);
  }
}
