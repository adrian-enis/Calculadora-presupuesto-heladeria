/**
 * db/seed.ts
 *
 * Carga las 6 recetas base del negocio para tener datos reales al probar
 * Producción antes de que exista la UI de Recetas. No se llama al arrancar
 * la app — se invoca a mano una sola vez (ej: un botón de dev temporal o
 * `useEffect` en una pantalla) llamando a `seedRecetasIniciales()`.
 *
 * Idempotente por nombre de receta: si ya existe, la salta.
 *
 * Normalizaciones sobre el texto original:
 * - "Base Cremosa Semi Industrial": la fuente dice "10 g de aceite de girasol",
 *   pero ese insumo ya quedó con unidad_base 'ml' (120 ml en la primera receta)
 *   — se cargó como 10 ml. Confirmar con la dueña si en este taller se pesa distinto.
 * - "Base Cremosa 2": la fuente encadena "Base Cremosa 2" + "Preparación II" en
 *   una sola receta. Se fusionaron cantidades del mismo insumo (agua, azúcar,
 *   Emustab/"emulsionante") sumándolas, porque receta_ingredientes no admite el
 *   mismo insumo dos veces. Se omitió "Adicionales: chocolate al gusto y 100 g
 *   de maní" — son toppings sin cantidad fija de base, no ingredientes de la mezcla.
 * - Se omitieron las notas de esencia/sustitución de la receta 2 (cantidad
 *   condicional a la marca, no un valor fijo).
 */

import { getDb } from './client';
import { crearReceta } from '@/features/Receta.repository';
import type { CrearRecetaInput } from '@/features/Receta.schema';

const RECETAS_INICIALES: CrearRecetaInput[] = [
  {
    nombre: 'Base Cremosa Helados',
    ingredientes: [
      { insumoNombre: 'agua', cantidad: 1.5, unidad: 'l' },
      { insumoNombre: 'aceite de girasol', cantidad: 120, unidad: 'ml' },
      { insumoNombre: 'manteca vegetal', cantidad: 80, unidad: 'g' },
      { insumoNombre: 'leche en polvo', cantidad: 350, unidad: 'g' },
      { insumoNombre: 'azúcar', cantidad: 380, unidad: 'g' },
      { insumoNombre: 'dextrosa', cantidad: 70, unidad: 'g' },
      { insumoNombre: 'propilenglicol', cantidad: 5, unidad: 'ml' },
      { insumoNombre: 'CMC', cantidad: 6, unidad: 'g' },
      { insumoNombre: 'Emustab', cantidad: 10, unidad: 'g' },
      { insumoNombre: 'crema Chantilly', cantidad: 500, unidad: 'ml' },
    ],
  },
  {
    nombre: 'Base Cremosa Semi Industrial (Taller)',
    ingredientes: [
      { insumoNombre: 'agua', cantidad: 600, unidad: 'ml' },
      { insumoNombre: 'leche evaporada', cantidad: 345, unidad: 'ml' },
      { insumoNombre: 'azúcar', cantidad: 250, unidad: 'g' },
      { insumoNombre: 'leche', cantidad: 150, unidad: 'g' },
      { insumoNombre: 'cacao', cantidad: 70, unidad: 'g' },
      { insumoNombre: 'aceite de girasol', cantidad: 10, unidad: 'ml' },
      { insumoNombre: 'Emustab', cantidad: 10, unidad: 'g' },
      { insumoNombre: 'CMC', cantidad: 4, unidad: 'g' },
    ],
  },
  {
    nombre: 'Chupis Actualizados (Hela2s)',
    ingredientes: [
      { insumoNombre: 'agua', cantidad: 1, unidad: 'l' },
      { insumoNombre: 'azúcar', cantidad: 250, unidad: 'g' },
      { insumoNombre: 'dextrosa', cantidad: 40, unidad: 'g' },
      { insumoNombre: 'ácido cítrico', cantidad: 4, unidad: 'g' },
      { insumoNombre: 'CMC', cantidad: 3, unidad: 'g' },
    ],
  },
  {
    nombre: 'Helados Cremosos - Preparación Base 1 (Hela2s)',
    ingredientes: [
      { insumoNombre: 'agua', cantidad: 400, unidad: 'ml' },
      { insumoNombre: 'crema Chantilly', cantidad: 0.5, unidad: 'l' },
      { insumoNombre: 'azúcar', cantidad: 150, unidad: 'g' },
      { insumoNombre: 'leche en polvo', cantidad: 150, unidad: 'g' },
      { insumoNombre: 'Emustab', cantidad: 5, unidad: 'g' },
      { insumoNombre: 'CMC', cantidad: 2, unidad: 'g' },
    ],
  },
  {
    nombre: 'Base Cremosa 2 (Hela2s)',
    ingredientes: [
      { insumoNombre: 'agua', cantidad: 1.12, unidad: 'l' },
      { insumoNombre: 'leche condensada', cantidad: 395, unidad: 'g' },
      { insumoNombre: 'leche', cantidad: 300, unidad: 'g' },
      { insumoNombre: 'azúcar', cantidad: 220, unidad: 'g' },
      { insumoNombre: 'manteca vegetal', cantidad: 100, unidad: 'g' },
      { insumoNombre: 'esencia', cantidad: 35, unidad: 'ml' },
      { insumoNombre: 'Emustab', cantidad: 16, unidad: 'g' },
      { insumoNombre: 'CMC', cantidad: 4, unidad: 'g' },
      { insumoNombre: 'leche en polvo', cantidad: 50, unidad: 'g' },
    ],
  },
  {
    nombre: 'Paletas tipo Magnum (Hela2s)',
    ingredientes: [
      { insumoNombre: 'agua', cantidad: 600, unidad: 'ml' },
      { insumoNombre: 'crema Chantilly', cantidad: 200, unidad: 'ml' },
      { insumoNombre: 'azúcar', cantidad: 200, unidad: 'g' },
      { insumoNombre: 'leche en polvo', cantidad: 120, unidad: 'g' },
      { insumoNombre: 'dextrosa', cantidad: 69, unidad: 'g' },
      { insumoNombre: 'liga neutra', cantidad: 8, unidad: 'g' },
      { insumoNombre: 'Emustab', cantidad: 4, unidad: 'g' },
      { insumoNombre: 'CMC', cantidad: 2, unidad: 'g' },
    ],
  },
];

export async function seedRecetasIniciales(): Promise<void> {
  const db = await getDb();

  for (const receta of RECETAS_INICIALES) {
    const existente = await db.getFirstAsync<{ id: number }>('SELECT id FROM recetas WHERE nombre = ?', [
      receta.nombre,
    ]);
    if (existente) continue;
    await crearReceta(receta);
  }
}
