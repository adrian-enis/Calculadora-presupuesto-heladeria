/**
 * features/producciones/produccion.repository.ts
 *
 * SQL puro sobre `producciones` y `produccion_consumos`. Validar stock,
 * congelar costo_lote y el invariante vendidos + merma <= producidos los
 * resuelve produccion.service.ts (el CHECK de SQLite queda como doble seguro).
 */

import type { ConsumoCalculado } from '@/lib/produccion';
import type { SQLiteDatabase } from 'expo-sqlite';

export async function insertarProduccion(
  db: SQLiteDatabase,
  produccion: { recetaId: number; fecha: string; heladosProducidos: number; costoLote: number; precioVenta: number | null }
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO producciones (receta_id, fecha, helados_producidos, costo_lote, precio_venta)
     VALUES (?, ?, ?, ?, ?)`,
    [produccion.recetaId, produccion.fecha, produccion.heladosProducidos, produccion.costoLote, produccion.precioVenta]
  );
  return result.lastInsertRowId;
}

export async function insertarConsumo(db: SQLiteDatabase, produccionId: number, consumo: ConsumoCalculado): Promise<void> {
  await db.runAsync(
    `INSERT INTO produccion_consumos (produccion_id, insumo_id, cantidad_usada, costo_promedio_momento, costo_usado)
     VALUES (?, ?, ?, ?, ?)`,
    [produccionId, consumo.insumoId, consumo.cantidadUsada, consumo.costoPromedioMomento, consumo.costoUsado]
  );
}

export async function actualizarVentaYMerma(
  db: SQLiteDatabase,
  produccionId: number,
  vendidos: number,
  merma: number
): Promise<void> {
  await db.runAsync('UPDATE producciones SET helados_vendidos = ?, merma_declarada = ? WHERE id = ?', [
    vendidos,
    merma,
    produccionId,
  ]);
}

/** Devuelve false si no existe o ya estaba anulada (el WHERE la hace idempotente). */
export async function anularProduccion(db: SQLiteDatabase, produccionId: number): Promise<boolean> {
  const result = await db.runAsync("UPDATE producciones SET estado = 'anulado' WHERE id = ? AND estado = 'activo'", [
    produccionId,
  ]);
  return result.changes > 0;
}

export interface ProduccionListada {
  id: number;
  recetaNombre: string;
  fecha: string;
  heladosProducidos: number;
  heladosVendidos: number;
  mermaDeclarada: number;
  costoLote: number;
  precioVenta: number | null;
  estado: string;
}

interface FilaProduccion {
  id: number;
  receta_nombre: string;
  fecha: string;
  helados_producidos: number;
  helados_vendidos: number;
  merma_declarada: number;
  costo_lote: number;
  precio_venta: number | null;
  estado: string;
}

const SELECT_PRODUCCION = `
  SELECT p.id, r.nombre AS receta_nombre, p.fecha, p.helados_producidos, p.helados_vendidos,
         p.merma_declarada, p.costo_lote, p.precio_venta, p.estado
  FROM producciones p JOIN recetas r ON r.id = p.receta_id`;

function filaAProduccionListada(row: FilaProduccion): ProduccionListada {
  return {
    id: row.id,
    recetaNombre: row.receta_nombre,
    fecha: row.fecha,
    heladosProducidos: row.helados_producidos,
    heladosVendidos: row.helados_vendidos,
    mermaDeclarada: row.merma_declarada,
    costoLote: row.costo_lote,
    precioVenta: row.precio_venta,
    estado: row.estado,
  };
}

/** Historial de producciones, más reciente primero. */
export async function listarProducciones(db: SQLiteDatabase, limit: number, offset: number): Promise<ProduccionListada[]> {
  const rows = await db.getAllAsync<FilaProduccion>(
    `${SELECT_PRODUCCION} ORDER BY p.fecha DESC, p.id DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows.map(filaAProduccionListada);
}

export async function obtenerProduccion(db: SQLiteDatabase, produccionId: number): Promise<ProduccionListada | null> {
  const row = await db.getFirstAsync<FilaProduccion>(`${SELECT_PRODUCCION} WHERE p.id = ?`, [produccionId]);
  return row ? filaAProduccionListada(row) : null;
}
