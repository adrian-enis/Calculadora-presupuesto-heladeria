import { UNIDADES } from '@/lib/unidades';
import { z } from 'zod';

export const CompraItemSchema = z.object({
  insumoNombre: z.string().trim().min(1, 'El nombre del insumo es obligatorio'),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  unidad: z.enum(UNIDADES),
  precio: z.number().nonnegative('El precio no puede ser negativo'),
});

export const CompraSchema = z.object({
  fecha: z.string().refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v) <= new Date(), {
    message: 'La fecha no puede ser futura',
  }),
  items: z.array(CompraItemSchema).min(1, 'La compra debe tener al menos un item'),
});

export type CompraItemInput = z.infer<typeof CompraItemSchema>;
export type CompraInput = z.infer<typeof CompraSchema>;

export const EditarCompraItemSchema = z.object({
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  unidad: z.enum(UNIDADES),
  precio: z.number().nonnegative('El precio no puede ser negativo'),
});

export type EditarCompraItemInput = z.infer<typeof EditarCompraItemSchema>;
