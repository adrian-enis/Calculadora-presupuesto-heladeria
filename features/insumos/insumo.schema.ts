import { z } from 'zod';

export const EditarNombreInsumoSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre del insumo es obligatorio'),
});

export type EditarNombreInsumoInput = z.infer<typeof EditarNombreInsumoSchema>;
