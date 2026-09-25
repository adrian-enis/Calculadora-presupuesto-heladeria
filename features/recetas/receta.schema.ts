import { normalizarNombre } from '@/lib/nombres';
import { UNIDADES } from '@/lib/unidades';
import { z } from 'zod';

export const RecetaIngredienteSchema = z.object({
  insumoNombre: z.string().trim().min(1, 'El nombre del insumo es obligatorio'),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  unidad: z.enum(UNIDADES),
});

function sinIngredientesDuplicados(ingredientes: { insumoNombre: string }[]): boolean {
  const nombres = ingredientes.map((i) => normalizarNombre(i.insumoNombre));
  return new Set(nombres).size === nombres.length;
}

export const CrearRecetaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre de la receta es obligatorio'),
  ingredientes: z
    .array(RecetaIngredienteSchema)
    .min(1, 'La receta debe tener al menos un ingrediente')
    .refine(sinIngredientesDuplicados, { message: 'Un mismo insumo no puede repetirse en la receta' }),
});

export type RecetaIngredienteInput = z.infer<typeof RecetaIngredienteSchema>;
export type CrearRecetaInput = z.infer<typeof CrearRecetaSchema>;

export const EditarIngredientesRecetaSchema = z.object({
  ingredientes: z
    .array(RecetaIngredienteSchema)
    .min(1, 'La receta debe tener al menos un ingrediente')
    .refine(sinIngredientesDuplicados, { message: 'Un mismo insumo no puede repetirse en la receta' }),
});

export type EditarIngredientesRecetaInput = z.infer<typeof EditarIngredientesRecetaSchema>;
