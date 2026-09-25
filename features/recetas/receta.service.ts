/**
 * features/recetas/receta.service.ts
 *
 * Reglas de Receta (docs/01_negocio_reglas.md, sección 3): solo insumos ya
 * comprados, ingredientes convertidos a la unidad_base del insumo, y edición
 * bloqueada una vez usada en una Producción (HU 3.1b). puedeEditarse() es
 * advisory para la UI; editarIngredientesReceta re-valida dentro de la transacción.
 */

import { enTransaccion, getDb } from '@/db/client';
import * as insumoRepository from '@/features/insumos/insumo.repository';
import { costoDeConsumo } from '@/lib/inventario';
import { convertirACantidadBase, type Unidad } from '@/lib/unidades';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as recetaRepository from './receta.repository';
import type { RecetaDetalle } from './receta.repository';
import {
  CrearRecetaSchema,
  EditarIngredientesRecetaSchema,
  type CrearRecetaInput,
  type EditarIngredientesRecetaInput,
  type RecetaIngredienteInput,
} from './receta.schema';

export type { RecetaDetalle };

async function agregarIngredientes(
  db: SQLiteDatabase,
  recetaId: number,
  ingredientes: RecetaIngredienteInput[]
): Promise<void> {
  for (const ingrediente of ingredientes) {
    const insumo = await insumoRepository.buscarInsumoPorNombre(db, ingrediente.insumoNombre);
    if (!insumo) {
      throw new Error(`El insumo "${ingrediente.insumoNombre}" no existe: registralo primero con una compra`);
    }
    const cantidadBase = convertirACantidadBase(ingrediente.cantidad, ingrediente.unidad, insumo.unidadBase);
    await recetaRepository.insertarIngrediente(db, recetaId, insumo.id, cantidadBase);
  }
}

/** HU 3.1: la receta nace Activa. */
export async function crearReceta(inputRaw: CrearRecetaInput): Promise<{ recetaId: number }> {
  const input = CrearRecetaSchema.parse(inputRaw);

  return enTransaccion(async (db) => {
    const recetaId = await recetaRepository.insertarReceta(db, input.nombre);
    await agregarIngredientes(db, recetaId, input.ingredientes);
    return { recetaId };
  });
}

export async function puedeEditarse(recetaId: number): Promise<boolean> {
  return !(await recetaRepository.tieneProduccionesAsociadas(await getDb(), recetaId));
}

/** HU 3.1b: reemplaza los ingredientes solo si la receta nunca se usó en una Producción. */
export async function editarIngredientesReceta(recetaId: number, inputRaw: EditarIngredientesRecetaInput): Promise<void> {
  const input = EditarIngredientesRecetaSchema.parse(inputRaw);

  await enTransaccion(async (db) => {
    if (!(await recetaRepository.obtenerReceta(db, recetaId))) {
      throw new Error(`La receta ${recetaId} no existe`);
    }
    if (await recetaRepository.tieneProduccionesAsociadas(db, recetaId)) {
      throw new Error(`La receta ${recetaId} ya fue usada en una producción: sus ingredientes no se pueden editar`);
    }
    await recetaRepository.borrarIngredientes(db, recetaId);
    await agregarIngredientes(db, recetaId, input.ingredientes);
  });
}

/** HU 3.2: sale del dropdown de producir, pero su historial queda intacto. */
export async function desactivarReceta(recetaId: number): Promise<void> {
  if (!(await recetaRepository.desactivarReceta(await getDb(), recetaId))) {
    throw new Error(`Receta ${recetaId} inexistente o ya inactiva`);
  }
}

export async function obtenerReceta(recetaId: number): Promise<RecetaDetalle | null> {
  return recetaRepository.obtenerReceta(await getDb(), recetaId);
}

/** Recetas activas, para elegir al producir un lote. */
export async function listarRecetasActivas(): Promise<{ id: number; nombre: string }[]> {
  return recetaRepository.listarRecetasActivas(await getDb());
}

/** Todas las recetas (HU 3.2: las inactivas siguen visibles). */
export async function listarRecetas(): Promise<{ id: number; nombre: string; estado: string }[]> {
  return recetaRepository.listarRecetas(await getDb());
}

export interface RecetaConCosto {
  id: number;
  nombre: string;
  estado: string;
  ingredientes: { insumoNombre: string; cantidad: number; unidadBase: Unidad }[];
  costoEstimado: number;
}

/** Recetas activas con costo estimado del lote (pantalla "Mis Recetas"). */
export async function listarRecetasConCosto(): Promise<RecetaConCosto[]> {
  const recetas = await recetaRepository.listarRecetasConIngredientes(await getDb());
  return recetas.map((receta) => ({
    id: receta.id,
    nombre: receta.nombre,
    estado: receta.estado,
    ingredientes: receta.ingredientes.map(({ insumoNombre, cantidad, unidadBase }) => ({
      insumoNombre,
      cantidad,
      unidadBase,
    })),
    costoEstimado: receta.ingredientes.reduce(
      (total, ingrediente) =>
        total +
        costoDeConsumo(
          { stockDisponible: 0, costoPromedio: ingrediente.costoPromedioInsumo, valorTotalStock: 0 },
          ingrediente.cantidad
        ),
      0
    ),
  }));
}
