/**
 * features/producciones/produccion.repository.ts
 *
 * Único lugar que toca SQLite para Producción. Orquesta la transacción:
 * lee receta_ingredientes + estado de insumos, delega el CÁLCULO a
 * produccion.service.ts (puro), y persiste todo de forma atómica.
 */

import { getDb } from '@/db/client';
import type { EstadoInsumo } from '@/lib/inventario';
import { calcularConsumosProduccion, validarVentaYMerma, type IngredienteReceta } from './produccion.service';

export interface ProducirLoteInput {
  recetaId: number;
  fecha: string;
  heladosProducidos: number;
  precioVenta?: number | null;
}

export interface ProducirLoteResultado {
  produccionId: number;
  costoLote: number;
}

async function obtenerIngredientesReceta(db: any, recetaId: number): Promise<IngredienteReceta[]> {
  const rows = await db.getAllAsync<{ insumo_id: number; cantidad: number }>(
    'SELECT insumo_id, cantidad FROM receta_ingredientes WHERE receta_id = ?',
    [recetaId]
  );
  return rows.map((r) => ({ insumoId: r.insumo_id, cantidad: r.cantidad }));
}

async function obtenerEstadosInsumos(db: any, insumoIds: number[]): Promise<Map<number, EstadoInsumo>> {
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

/**
 * Produce un lote: valida stock, calcula costo_lote, y persiste
 * producciones + produccion_consumos + insumos actualizados en una sola transacción.
 * Si falta stock de algún insumo, NO se escribe nada (todo o nada).
 */
export async function producirLote(input: ProducirLoteInput): Promise<ProducirLoteResultado> {
  const db = await getDb();

  const ingredientes = await obtenerIngredientesReceta(db, input.recetaId);
  if (ingredientes.length === 0) {
    throw new Error(`La receta ${input.recetaId} no tiene ingredientes cargados`);
  }

  const estadosInsumos = await obtenerEstadosInsumos(
    db,
    ingredientes.map((i) => i.insumoId)
  );

  // Cálculo puro — si falta stock, tira error acá y todavía no tocamos SQLite.
  const { consumos, estadosInsumosActualizados, costoLote } = calcularConsumosProduccion(
    ingredientes,
    estadosInsumos
  );

  let produccionId = 0;

  await db.withTransactionAsync(async () => {
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

  return { produccionId, costoLote };
}

/**
 * Registra vendidos/merma de un lote existente. Valida el invariante
 * (docs/01_negocio_reglas.md) antes de escribir, además del CHECK de SQLite.
 */
export async function registrarVentaYMerma(produccionId: number, vendidos: number, merma: number): Promise<void> {
  const db = await getDb();

  const row = await db.getFirstAsync<{ helados_producidos: number }>(
    'SELECT helados_producidos FROM producciones WHERE id = ?',
    [produccionId]
  );
  if (!row) throw new Error(`Producción ${produccionId} no existe`);

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
  await db.runAsync("UPDATE producciones SET estado = 'anulado' WHERE id = ?", [produccionId]);
}