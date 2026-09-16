/**
 * features/producciones/produccion.schema.ts
 *
 * Mismo schema se usa en el formulario (React Hook Form + @hookform/resolvers/zod)
 * y en el service antes de persistir — evita reglas duplicadas.
 */

import { z } from 'zod';

export const ProducirLoteSchema = z.object({
  recetaId: z.number().int().positive(),
  fecha: z.string().refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v) <= new Date(), {
    message: 'La fecha no puede ser futura',
  }),
  heladosProducidos: z.number().int().positive({ message: 'Debe producir al menos 1 helado' }),
  precioVenta: z.number().nonnegative().nullable().optional(),
});

export type ProducirLoteInput = z.infer<typeof ProducirLoteSchema>;

/**
 * El invariante vendidos + merma <= producidos depende de un valor externo
 * (helados_producidos, ya guardado en la producción), por eso es una función
 * que arma el schema, no un schema fijo — así el formulario puede validar
 * en vivo contra el producido real de esa producción puntual.
 */
export function createVentaMermaSchema(heladosProducidos: number) {
  return z
    .object({
      heladosVendidos: z.number().int().nonnegative(),
      mermaDeclarada: z.number().int().nonnegative(),
    })
    .refine((data) => data.heladosVendidos + data.mermaDeclarada <= heladosProducidos, {
      message: `vendidos + merma no puede superar ${heladosProducidos} (helados producidos)`,
      path: ['heladosVendidos'],
    });
}

export type VentaMermaInput = z.infer<ReturnType<typeof createVentaMermaSchema>>;