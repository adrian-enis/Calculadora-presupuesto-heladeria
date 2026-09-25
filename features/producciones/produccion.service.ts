/**
 * features/producciones/produccion.service.ts
 *
 * Reglas de Producción (docs/01_negocio_reglas.md, sección 4): solo recetas
 * activas, se bloquea entera si falta stock, costo_lote queda congelado como
 * snapshot, y vendidos + merma <= producidos. El cálculo del lote vive en
 * lib/produccion.ts; acá se lee, se valida y se persiste en una transacción.
 */

import { enTransaccion, getDb } from '@/db/client';
import * as insumoRepository from '@/features/insumos/insumo.repository';
import * as recetaRepository from '@/features/recetas/receta.repository';
import { costoUnitario, ganancia, margen } from '@/lib/costos';
import type { EstadoInsumo } from '@/lib/inventario';
import { calcularConsumosProduccion } from '@/lib/produccion';
import * as produccionRepository from './produccion.repository';
import type { ProduccionListada } from './produccion.repository';
import {
  createVentaMermaSchema,
  ProducirLoteSchema,
  type ProducirLoteInput,
  type VentaMermaInput,
} from './produccion.schema';

export type { ProduccionListada };

export interface ProducirLoteResultado {
  produccionId: number;
  costoLote: number;
}

/**
 * HU 4.1. Las lecturas van DENTRO de la transacción: leer el stock afuera y
 * escribirlo adentro deja una ventana donde una compra concurrente invalida
 * el cálculo. Si falta stock, calcularConsumosProduccion lanza y no se escribe nada.
 */
export async function producirLote(inputRaw: ProducirLoteInput): Promise<ProducirLoteResultado> {
  const input = ProducirLoteSchema.parse(inputRaw);

  return enTransaccion(async (db) => {
    const receta = await recetaRepository.obtenerReceta(db, input.recetaId);
    if (!receta) throw new Error(`La receta ${input.recetaId} no existe`);
    if (receta.estado !== 'activo') {
      throw new Error(`La receta ${input.recetaId} está inactiva: no se puede producir con ella`);
    }
    if (receta.ingredientes.length === 0) {
      throw new Error(`La receta ${input.recetaId} no tiene ingredientes cargados`);
    }

    const estadosInsumos = new Map<number, EstadoInsumo>();
    for (const { insumoId } of receta.ingredientes) {
      const insumo = await insumoRepository.obtenerEstadoInsumo(db, insumoId);
      if (!insumo) throw new Error(`Insumo ${insumoId} no existe`);
      estadosInsumos.set(insumoId, insumo.estado);
    }

    const { consumos, estadosInsumosActualizados, costoLote } = calcularConsumosProduccion(
      receta.ingredientes.map(({ insumoId, cantidad }) => ({ insumoId, cantidad })),
      estadosInsumos
    );

    const produccionId = await produccionRepository.insertarProduccion(db, {
      recetaId: input.recetaId,
      fecha: input.fecha,
      heladosProducidos: input.heladosProducidos,
      costoLote,
      precioVenta: input.precioVenta ?? null,
    });
    for (const consumo of consumos) {
      await produccionRepository.insertarConsumo(db, produccionId, consumo);
    }
    for (const [insumoId, estado] of estadosInsumosActualizados) {
      await insumoRepository.actualizarEstadoInsumo(db, insumoId, estado);
    }

    return { produccionId, costoLote };
  });
}

/**
 * HU 4.2. El schema se arma con helados_producidos de esta producción puntual
 * (mismo schema que usa el formulario); el CHECK de SQLite queda como doble seguro.
 */
export async function registrarVentaYMerma(produccionId: number, inputRaw: VentaMermaInput): Promise<void> {
  await enTransaccion(async (db) => {
    const produccion = await produccionRepository.obtenerProduccion(db, produccionId);
    if (!produccion) throw new Error(`Producción ${produccionId} no existe`);
    if (produccion.estado !== 'activo') {
      throw new Error(`La producción ${produccionId} está anulada: no admite cambios`);
    }

    const input = createVentaMermaSchema(produccion.heladosProducidos).parse(inputRaw);
    await produccionRepository.actualizarVentaYMerma(db, produccionId, input.heladosVendidos, input.mermaDeclarada);
  });
}

/** HU 4.3. Decisión confirmada: NO se revierte el stock consumido — es intencional, no un olvido. */
export async function anularProduccion(produccionId: number): Promise<void> {
  if (!(await produccionRepository.anularProduccion(await getDb(), produccionId))) {
    throw new Error(`Producción ${produccionId} inexistente o ya anulada`);
  }
}

export async function listarProducciones(limit: number, offset: number): Promise<ProduccionListada[]> {
  return produccionRepository.listarProducciones(await getDb(), limit, offset);
}

export interface ProduccionDetalle extends ProduccionListada {
  costoUnitario: number;
  ganancia: number | null;
  margen: number | null;
}

/**
 * HU 4.4. ganancia y margen quedan null si todavía no se cargó precio_venta —
 * no hay con qué compararlos.
 */
export async function obtenerProduccion(produccionId: number): Promise<ProduccionDetalle | null> {
  const produccion = await produccionRepository.obtenerProduccion(await getDb(), produccionId);
  if (!produccion) return null;

  const costoUnit = costoUnitario(produccion.costoLote, produccion.heladosProducidos);
  return {
    ...produccion,
    costoUnitario: costoUnit,
    ganancia: produccion.precioVenta === null ? null : ganancia(produccion.precioVenta, costoUnit),
    // margen() divide por precioVenta: con precioVenta = 0 el % no está definido.
    margen: !produccion.precioVenta ? null : margen(produccion.precioVenta, costoUnit),
  };
}
