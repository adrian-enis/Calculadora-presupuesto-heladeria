/**
 * features/Compra.repository.ts
 *
 * Único lugar que toca SQLite para Compras. Orquesta la transacción: lee/crea
 * el insumo (Insumo.repository.ts), delega el cálculo (conversión de unidad
 * en lib/unidades.ts + fórmula de inventario en lib/inventario.ts), y persiste
 * todo atómico.
 */

import { getDb } from '@/db/client';
import { deshacerEntrada, editarEntrada, registrarEntrada, type EstadoInsumo } from '@/lib/inventario';
import { convertirACantidadBase } from '@/lib/unidades';
import type { Unidad } from '@/lib/unidades';
import type { SQLiteDatabase } from 'expo-sqlite';
import { actualizarEstadoInsumo, obtenerOCrearInsumo } from './Insumo.repository';
import { CompraSchema, EditarCompraItemSchema, type CompraInput, type EditarCompraItemInput } from './Compra.schema';

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

async function obtenerInsumoDeItem(
  db: SQLiteDatabase,
  compraItemId: number
): Promise<{ insumoId: number; cantidadBaseVieja: number; precioViejo: number; unidadBase: Unidad; estado: EstadoInsumo } | null> {
  const row = await db.getFirstAsync<{
    insumo_id: number;
    cantidad_base: number;
    precio: number;
    unidad_base: Unidad;
    stock_disponible: number;
    costo_promedio: number;
    valor_total_stock: number;
  }>(
    `SELECT ci.insumo_id, ci.cantidad_base, ci.precio,
            i.unidad_base, i.stock_disponible, i.costo_promedio, i.valor_total_stock
     FROM compra_items ci JOIN insumos i ON i.id = ci.insumo_id
     WHERE ci.id = ?`,
    [compraItemId]
  );
  if (!row) return null;

  return {
    insumoId: row.insumo_id,
    cantidadBaseVieja: row.cantidad_base,
    precioViejo: row.precio,
    unidadBase: row.unidad_base,
    estado: filaAEstado(row),
  };
}

/**
 * Registra una compra con uno o más items. Si un insumo no existe, se crea
 * (HU 1.1). Todo o nada: si algún item tiene una unidad de categoría distinta
 * a la unidad_base de su insumo, se aborta la transacción entera.
 */
export async function registrarCompra(inputRaw: CompraInput): Promise<{ compraId: number }> {
  const input = CompraSchema.parse(inputRaw);
  const db = await getDb();

  let compraId = 0;

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync('INSERT INTO compras (fecha) VALUES (?)', [input.fecha]);
    compraId = result.lastInsertRowId;

    for (const item of input.items) {
      const insumo = await obtenerOCrearInsumo(db, item.insumoNombre, item.unidad);
      const cantidadBase = convertirACantidadBase(item.cantidad, item.unidad, insumo.unidadBase);
      const estadoNuevo = registrarEntrada(insumo.estado, cantidadBase, item.precio);

      await actualizarEstadoInsumo(db, insumo.id, estadoNuevo);
      await db.runAsync(
        `INSERT INTO compra_items (compra_id, insumo_id, cantidad, unidad, cantidad_base, precio)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [compraId, insumo.id, item.cantidad, item.unidad, cantidadBase, item.precio]
      );
    }
  });

  return { compraId };
}

/**
 * Corrige cantidad/unidad/precio de un item ya cargado (HU 1.2): deshace el
 * valor viejo y aplica el nuevo en un solo delta sobre costo_promedio. No
 * toca costo_lote de producciones pasadas — ese valor queda congelado.
 */
export async function editarCompraItem(compraItemId: number, inputRaw: EditarCompraItemInput): Promise<void> {
  const input = EditarCompraItemSchema.parse(inputRaw);
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    const anterior = await obtenerInsumoDeItem(db, compraItemId);
    if (!anterior) throw new Error(`El item de compra ${compraItemId} no existe`);

    const cantidadBaseNueva = convertirACantidadBase(input.cantidad, input.unidad, anterior.unidadBase);
    const estadoNuevo = editarEntrada(
      anterior.estado,
      anterior.cantidadBaseVieja,
      anterior.precioViejo,
      cantidadBaseNueva,
      input.precio
    );

    await actualizarEstadoInsumo(db, anterior.insumoId, estadoNuevo);
    await db.runAsync('UPDATE compra_items SET cantidad = ?, unidad = ?, cantidad_base = ?, precio = ? WHERE id = ?', [
      input.cantidad,
      input.unidad,
      cantidadBaseNueva,
      input.precio,
      compraItemId,
    ]);
  });
}

/**
 * Hard delete de una compra completa (HU 1.3): deshace el stock de cada item
 * antes de borrar, y el ON DELETE CASCADE se encarga de compra_items.
 */
export async function eliminarCompra(compraId: number): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    const items = await db.getAllAsync<{ insumo_id: number; cantidad_base: number; precio: number }>(
      'SELECT insumo_id, cantidad_base, precio FROM compra_items WHERE compra_id = ?',
      [compraId]
    );

    const compra = await db.getFirstAsync<{ id: number }>('SELECT id FROM compras WHERE id = ?', [compraId]);
    if (!compra) throw new Error(`La compra ${compraId} no existe`);

    for (const item of items) {
      const row = await db.getFirstAsync<{ stock_disponible: number; costo_promedio: number; valor_total_stock: number }>(
        'SELECT stock_disponible, costo_promedio, valor_total_stock FROM insumos WHERE id = ?',
        [item.insumo_id]
      );
      if (!row) throw new Error(`Insumo ${item.insumo_id} no existe`);

      const estadoNuevo = deshacerEntrada(filaAEstado(row), item.cantidad_base, item.precio);
      await actualizarEstadoInsumo(db, item.insumo_id, estadoNuevo);
    }

    await db.runAsync('DELETE FROM compras WHERE id = ?', [compraId]);
  });
}

export interface CompraListada {
  id: number;
  fecha: string;
  items: { insumoNombre: string; cantidad: number; unidad: Unidad; precio: number }[];
}

/** Historial de compras paginado, más reciente primero (HU 1.4). */
export async function listarCompras(limit: number, offset: number): Promise<CompraListada[]> {
  const db = await getDb();

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
