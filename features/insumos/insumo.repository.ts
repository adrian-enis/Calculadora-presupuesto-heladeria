/**
 * features/insumos/insumo.repository.ts
 *
 * SQL puro sobre `insumos`, sin reglas de negocio: quién puede crear un insumo
 * o renombrarlo lo decide insumo.service.ts. Recibe `db` para poder correr
 * dentro de la transacción del service que lo llama (compras, recetas, producciones).
 */

import type { EstadoInsumo } from '@/lib/inventario';
import { normalizarNombre } from '@/lib/nombres';
import type { Unidad } from '@/lib/unidades';
import type { SQLiteDatabase } from 'expo-sqlite';

export interface InsumoConEstado {
  id: number;
  unidadBase: Unidad;
  estado: EstadoInsumo;
}

interface FilaInsumoConEstado {
  id: number;
  unidad_base: Unidad;
  stock_disponible: number;
  costo_promedio: number;
  valor_total_stock: number;
}

function filaAInsumoConEstado(row: FilaInsumoConEstado): InsumoConEstado {
  return {
    id: row.id,
    unidadBase: row.unidad_base,
    estado: {
      stockDisponible: row.stock_disponible,
      costoPromedio: row.costo_promedio,
      valorTotalStock: row.valor_total_stock,
    },
  };
}

export async function buscarInsumoPorNombre(db: SQLiteDatabase, nombre: string): Promise<InsumoConEstado | null> {
  const row = await db.getFirstAsync<FilaInsumoConEstado>(
    'SELECT id, unidad_base, stock_disponible, costo_promedio, valor_total_stock FROM insumos WHERE nombre_normalizado = ?',
    [normalizarNombre(nombre)]
  );
  return row ? filaAInsumoConEstado(row) : null;
}

export async function obtenerEstadoInsumo(db: SQLiteDatabase, insumoId: number): Promise<InsumoConEstado | null> {
  const row = await db.getFirstAsync<FilaInsumoConEstado>(
    'SELECT id, unidad_base, stock_disponible, costo_promedio, valor_total_stock FROM insumos WHERE id = ?',
    [insumoId]
  );
  return row ? filaAInsumoConEstado(row) : null;
}

export async function insertarInsumo(db: SQLiteDatabase, nombre: string, unidadBase: Unidad): Promise<InsumoConEstado> {
  const result = await db.runAsync('INSERT INTO insumos (nombre, nombre_normalizado, unidad_base) VALUES (?, ?, ?)', [
    nombre,
    normalizarNombre(nombre),
    unidadBase,
  ]);
  return {
    id: result.lastInsertRowId,
    unidadBase,
    estado: { stockDisponible: 0, costoPromedio: 0, valorTotalStock: 0 },
  };
}

export async function actualizarEstadoInsumo(db: SQLiteDatabase, insumoId: number, estado: EstadoInsumo): Promise<void> {
  await db.runAsync('UPDATE insumos SET stock_disponible = ?, costo_promedio = ?, valor_total_stock = ? WHERE id = ?', [
    estado.stockDisponible,
    estado.costoPromedio,
    estado.valorTotalStock,
    insumoId,
  ]);
}

/** Devuelve false si el insumo no existe. unidad_base es congelada: a propósito no hay actualizarUnidad. */
export async function actualizarNombreInsumo(db: SQLiteDatabase, insumoId: number, nombre: string): Promise<boolean> {
  const result = await db.runAsync('UPDATE insumos SET nombre = ?, nombre_normalizado = ? WHERE id = ?', [
    nombre,
    normalizarNombre(nombre),
    insumoId,
  ]);
  return result.changes > 0;
}

export interface InsumoListado {
  id: number;
  nombre: string;
  unidadBase: Unidad;
  stockDisponible: number;
  costoPromedio: number;
}

/** Todos los insumos, incluso sin stock (HU 2.1: no desaparecen). */
export async function listarInsumos(db: SQLiteDatabase): Promise<InsumoListado[]> {
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
