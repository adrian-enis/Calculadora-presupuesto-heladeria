/**
 * features/compras/compra.repository.ts
 *
 * SQL puro sobre `compras` y `compra_items`. El orden de las operaciones
 * (delta en insumos ANTES del delete en cascada, docs/04_base_datos.md) y la
 * transacción los decide compra.service.ts.
 */

import type { Unidad } from '@/lib/unidades';
import type { SQLiteDatabase } from 'expo-sqlite';

export interface CompraItemFila {
  compraId: number;
  insumoId: number;
  cantidad: number;
  unidad: Unidad;
  cantidadBase: number;
  precio: number;
}

/** Lo mínimo para deshacer un item en insumos: qué insumo y cuánto entró a qué precio. */
export interface CompraItemEntrada {
  insumoId: number;
  cantidadBase: number;
  precio: number;
}

export async function insertarCompra(db: SQLiteDatabase, fecha: string): Promise<number> {
  const result = await db.runAsync('INSERT INTO compras (fecha) VALUES (?)', [fecha]);
  return result.lastInsertRowId;
}

export async function insertarCompraItem(db: SQLiteDatabase, item: CompraItemFila): Promise<void> {
  await db.runAsync(
    `INSERT INTO compra_items (compra_id, insumo_id, cantidad, unidad, cantidad_base, precio)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [item.compraId, item.insumoId, item.cantidad, item.unidad, item.cantidadBase, item.precio]
  );
}

export async function obtenerCompraItem(db: SQLiteDatabase, compraItemId: number): Promise<CompraItemEntrada | null> {
  const row = await db.getFirstAsync<{ insumo_id: number; cantidad_base: number; precio: number }>(
    'SELECT insumo_id, cantidad_base, precio FROM compra_items WHERE id = ?',
    [compraItemId]
  );
  return row ? { insumoId: row.insumo_id, cantidadBase: row.cantidad_base, precio: row.precio } : null;
}

export async function actualizarCompraItem(
  db: SQLiteDatabase,
  compraItemId: number,
  item: { cantidad: number; unidad: Unidad; cantidadBase: number; precio: number }
): Promise<void> {
  await db.runAsync('UPDATE compra_items SET cantidad = ?, unidad = ?, cantidad_base = ?, precio = ? WHERE id = ?', [
    item.cantidad,
    item.unidad,
    item.cantidadBase,
    item.precio,
    compraItemId,
  ]);
}

export async function existeCompra(db: SQLiteDatabase, compraId: number): Promise<boolean> {
  return (await db.getFirstAsync<{ id: number }>('SELECT id FROM compras WHERE id = ?', [compraId])) !== null;
}

export async function listarItemsDeCompra(db: SQLiteDatabase, compraId: number): Promise<CompraItemEntrada[]> {
  const rows = await db.getAllAsync<{ insumo_id: number; cantidad_base: number; precio: number }>(
    'SELECT insumo_id, cantidad_base, precio FROM compra_items WHERE compra_id = ?',
    [compraId]
  );
  return rows.map((r) => ({ insumoId: r.insumo_id, cantidadBase: r.cantidad_base, precio: r.precio }));
}

/** Hard delete: ON DELETE CASCADE se lleva los compra_items. */
export async function borrarCompra(db: SQLiteDatabase, compraId: number): Promise<void> {
  await db.runAsync('DELETE FROM compras WHERE id = ?', [compraId]);
}

export interface CompraListada {
  id: number;
  fecha: string;
  items: { insumoNombre: string; cantidad: number; unidad: Unidad; precio: number }[];
}

/** Historial de compras paginado, más reciente primero (HU 1.4). */
export async function listarCompras(db: SQLiteDatabase, limit: number, offset: number): Promise<CompraListada[]> {
  const compras = await db.getAllAsync<{ id: number; fecha: string }>(
    'SELECT id, fecha FROM compras ORDER BY fecha DESC, id DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  if (compras.length === 0) return [];

  const placeholders = compras.map(() => '?').join(', ');
  const items = await db.getAllAsync<{
    compra_id: number;
    insumo_nombre: string;
    cantidad: number;
    unidad: Unidad;
    precio: number;
  }>(
    `SELECT ci.compra_id, i.nombre AS insumo_nombre, ci.cantidad, ci.unidad, ci.precio
     FROM compra_items ci JOIN insumos i ON i.id = ci.insumo_id
     WHERE ci.compra_id IN (${placeholders})`,
    compras.map((c) => c.id)
  );

  return compras.map((c) => ({
    id: c.id,
    fecha: c.fecha,
    items: items
      .filter((i) => i.compra_id === c.id)
      .map((i) => ({ insumoNombre: i.insumo_nombre, cantidad: i.cantidad, unidad: i.unidad, precio: i.precio })),
  }));
}
