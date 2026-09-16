/**
 * features/insumos/insumo.repository.ts
 *
 * Helpers de SQLite sobre `insumos` compartidos por Compra y Receta (ambas
 * necesitan "buscar o crear por nombre" y "actualizar estado de inventario").
 */

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

export async function obtenerOCrearInsumo(
  db: SQLiteDatabase,
  nombre: string,
  unidadSolicitada: Unidad
): Promise<InsumoConEstado> {
  const existente = await db.getFirstAsync<{
    id: number;
    unidad_base: Unidad;
    stock_disponible: number;
    costo_promedio: number;
    valor_total_stock: number;
  }>('SELECT id, unidad_base, stock_disponible, costo_promedio, valor_total_stock FROM insumos WHERE nombre = ?', [
    nombre,
  ]);

  if (existente) {
    return { id: existente.id, unidadBase: existente.unidad_base, estado: filaAEstado(existente) };
  }

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
