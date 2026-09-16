/**
 * features/producciones/produccion.repository.ts
 *
 * Único lugar que toca SQLite para Producción. Orquesta la transacción:
 * lee receta_ingredientes + estado de insumos, delega el CÁLCULO a
 * produccion.service.ts (puro), y persiste todo de forma atómica.
 */

import { getDb } from '@/db/client';
import type { EstadoInsumo } from '@/lib/inventario';
import type { SQLiteDatabase } from 'expo-sqlite';
import { calcularConsumosProduccion, validarVentaYMerma, type IngredienteReceta } from './produccion.service';
import { ProducirLoteSchema, type ProducirLoteInput } from './produccion.schema';

export interface ProducirLoteResultado {
  produccionId: number;
  costoLote: number;
}

async function obtenerIngredientesReceta(db: SQLiteDatabase, recetaId: number): Promise<IngredienteReceta[]> {
  const rows = await db.getAllAsync<{ insumo_id: number; cantidad: number }>(
    'SELECT insumo_id, cantidad FROM receta_ingredientes WHERE receta_id = ?',
    [recetaId]
  );
  return rows.map((r) => ({ insumoId: r.insumo_id, cantidad: r.cantidad }));
}

async function obtenerEstadosInsumos(db: SQLiteDatabase, insumoIds: number[]): Promise<Map<number, EstadoInsumo>> {
  const estados = new Map<number, EstadoInsumo>();
  for (const id of insumoIds) {
    const row = await db.getFirstAsync<{
      stock_disponible: number;
      costo_promedio: number;
      valor_total_stock: number;
    }>('SELECT stock_disponible, costo_promedio, valor_total_stock FROM insumos WHERE id = ?', [id]);

    if (!row) throw new Error(`Insumo ${id} no existe`);

    estados.set(id, {
      stockDisponible: row.stock_disponible,
      costoPromedio: row.costo_promedio,
      valorTotalStock: row.valor_total_stock,
    });
  }
  return estados;
}

async function assertRecetaActiva(db: SQLiteDatabase, recetaId: number): Promise<void> {
  const row = await db.getFirstAsync<{ estado: string }>('SELECT estado FROM recetas WHERE id = ?', [recetaId]);
  if (!row) throw new Error(`La receta ${recetaId} no existe`);
  if (row.estado !== 'activo') {
    throw new Error(`La receta ${recetaId} está inactiva: no se puede producir con ella`);
  }
}

/**
 * Produce un lote: valida stock, calcula costo_lote, y persiste
 * producciones + produccion_consumos + insumos actualizados en una sola transacción.
 * Si falta stock de algún insumo, NO se escribe nada (todo o nada).
 */
export async function producirLote(inputRaw: ProducirLoteInput): Promise<ProducirLoteResultado> {
  // Zod es la puerta de entrada: fecha futura, heladosProducidos <= 0 y tipos
  // inválidos se rechazan acá, no en el CHECK de SQLite a mitad de transacción.
  const input = ProducirLoteSchema.parse(inputRaw);
  const db = await getDb();

  let produccionId = 0;
  let costoLoteFinal = 0;

  // Las lecturas van DENTRO de la transacción: leer el stock afuera y escribirlo
  // adentro deja una ventana donde una compra concurrente invalida el cálculo.
  await db.withTransactionAsync(async () => {
    await assertRecetaActiva(db, input.recetaId);

    const ingredientes = await obtenerIngredientesReceta(db, input.recetaId);
    if (ingredientes.length === 0) {
      throw new Error(`La receta ${input.recetaId} no tiene ingredientes cargados`);
    }

    const estadosInsumos = await obtenerEstadosInsumos(
      db,
      ingredientes.map((i) => i.insumoId)
    );

    // Cálculo puro. Si falta stock lanza acá y la transacción hace rollback: no se escribe nada.
    const { consumos, estadosInsumosActualizados, costoLote } = calcularConsumosProduccion(
      ingredientes,
      estadosInsumos
    );
    costoLoteFinal = costoLote;

    const result = await db.runAsync(
      `INSERT INTO producciones (receta_id, fecha, helados_producidos, costo_lote, precio_venta)
       VALUES (?, ?, ?, ?, ?)`,
      [input.recetaId, input.fecha, input.heladosProducidos, costoLote, input.precioVenta ?? null]
    );
    produccionId = result.lastInsertRowId;

    for (const consumo of consumos) {
      await db.runAsync(
        `INSERT INTO produccion_consumos (produccion_id, insumo_id, cantidad_usada, costo_promedio_momento, costo_usado)
         VALUES (?, ?, ?, ?, ?)`,
        [produccionId, consumo.insumoId, consumo.cantidadUsada, consumo.costoPromedioMomento, consumo.costoUsado]
      );
    }

    for (const [insumoId, estado] of estadosInsumosActualizados) {
      await db.runAsync(
        `UPDATE insumos SET stock_disponible = ?, costo_promedio = ?, valor_total_stock = ? WHERE id = ?`,
        [estado.stockDisponible, estado.costoPromedio, estado.valorTotalStock, insumoId]
      );
    }
  });

  return { produccionId, costoLote: costoLoteFinal };
}

/**
 * Registra vendidos/merma de un lote existente. Valida el invariante
 * (docs/01_negocio_reglas.md) antes de escribir, además del CHECK de SQLite.
 */
export async function registrarVentaYMerma(produccionId: number, vendidos: number, merma: number): Promise<void> {
  const db = await getDb();

  const row = await db.getFirstAsync<{ helados_producidos: number; estado: string }>(
    'SELECT helados_producidos, estado FROM producciones WHERE id = ?',
    [produccionId]
  );
  if (!row) throw new Error(`Producción ${produccionId} no existe`);
  if (row.estado !== 'activo') {
    throw new Error(`La producción ${produccionId} está anulada: no admite cambios`);
  }

  validarVentaYMerma(row.helados_producidos, vendidos, merma);

  await db.runAsync('UPDATE producciones SET helados_vendidos = ?, merma_declarada = ? WHERE id = ?', [
    vendidos,
    merma,
    produccionId,
  ]);
}

/**
 * Anula una producción. Decisión confirmada (README.md / 01_negocio_reglas.md):
 * NO se revierte el stock consumido — es intencional, no un olvido.
 */
export async function anularProduccion(produccionId: number): Promise<void> {
  const db = await getDb();
  // El WHERE ... AND estado = 'activo' hace la anulación idempotente y detecta
  // el id inexistente sin un SELECT previo.
  const result = await db.runAsync(
    "UPDATE producciones SET estado = 'anulado' WHERE id = ? AND estado = 'activo'",
    [produccionId]
  );
  if (result.changes === 0) {
    throw new Error(`Producción ${produccionId} inexistente o ya anulada`);
  }
}