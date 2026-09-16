import { migration0001Initial } from './0001_initial';
import type { Migration } from './types';

/**
 * Orden de aplicación. Agregar una migración nueva = agregar un archivo
 * NNNN_nombre.ts con version = NNNN (siguiente correlativo, nunca reutilizar
 * ni reordenar un version ya publicado) y sumarlo acá al final de la lista.
 */
export const migrations: Migration[] = [migration0001Initial];

export type { Migration };
