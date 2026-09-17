/**
 * features/recetas/receta.service.ts
 *
 * Valida con Zod antes de tocar el repository (docs/03_arquitectura.md) y expone
 * puedeEditarse() para que la UI decida si mostrar la pantalla de edición
 * (HU 3.1b). El repository igual re-valida al escribir, de forma atómica —
 * este chequeo acá es solo advisory para la UI, no el único gate.
 */

import { costoDeConsumo } from '@/lib/inventario';
import type { Unidad } from '@/lib/unidades';
import * as recetaRepository from './receta.repository';
import {
  CrearRecetaSchema,
  EditarIngredientesRecetaSchema,
  type CrearRecetaInput,
  type EditarIngredientesRecetaInput,
} from './receta.schema';

export async function crearReceta(inputRaw: CrearRecetaInput) {
  const input = CrearRecetaSchema.parse(inputRaw);
  return recetaRepository.crearReceta(input);
}

export async function puedeEditarse(recetaId: number): Promise<boolean> {
  return !(await recetaRepository.tieneProduccionesAsociadas(recetaId));
}

export async function editarIngredientesReceta(recetaId: number, inputRaw: EditarIngredientesRecetaInput) {
  const input = EditarIngredientesRecetaSchema.parse(inputRaw);
  return recetaRepository.editarIngredientesReceta(recetaId, input);
}

export { desactivarReceta, obtenerReceta, listarRecetasActivas, listarRecetas } from './receta.repository';

export interface RecetaConCosto {
  id: number;
  nombre: string;
  estado: string;
  ingredientes: { insumoNombre: string; cantidad: number; unidadBase: Unidad }[];
  costoEstimado: number;
}

/** Recetas activas con costo estimado del lote (pantalla "Mis Recetas"). */
export async function listarRecetasConCosto(): Promise<RecetaConCosto[]> {
  const recetas = await recetaRepository.listarRecetasConIngredientes();
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
