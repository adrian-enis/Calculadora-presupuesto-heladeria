import type { SQLiteDatabase } from 'expo-sqlite';
import { normalizarNombre } from '@/lib/nombres';
import type { Migration } from './types';

/**
 * Unicidad de insumos.nombre sin distinguir mayúsculas ("Leche" = "leche").
 * Si una instalación ya tiene duplicados así, no se fusionan (implicaría mezclar
 * stock/costo, y hasta unidades distintas): el más nuevo se renombra con su id,
 * ej. "leche (7)", para que la dueña lo corrija a mano.
 */
export const migration0002InsumosNombreNormalizado: Migration = {
  version: 2,
  name: 'insumos_nombre_normalizado',
  async up(db: SQLiteDatabase) {
    await db.execAsync("ALTER TABLE insumos ADD COLUMN nombre_normalizado TEXT NOT NULL DEFAULT '';");

    const insumos = await db.getAllAsync<{ id: number; nombre: string }>('SELECT id, nombre FROM insumos ORDER BY id');
    const usados = new Set<string>();

    for (const insumo of insumos) {
      let nombre = insumo.nombre;
      if (usados.has(normalizarNombre(nombre))) {
        nombre = `${insumo.nombre} (${insumo.id})`;
      }
      const normalizado = normalizarNombre(nombre);
      usados.add(normalizado);
      await db.runAsync('UPDATE insumos SET nombre = ?, nombre_normalizado = ? WHERE id = ?', [
        nombre,
        normalizado,
        insumo.id,
      ]);
    }

    await db.execAsync(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_insumos_nombre_normalizado ON insumos(nombre_normalizado);'
    );
  },
};
