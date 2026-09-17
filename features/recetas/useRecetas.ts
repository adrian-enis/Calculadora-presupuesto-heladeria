/**
 * features/recetas/useRecetas.ts
 *
 * Expone las recetas activas con ingredientes y costo estimado del lote
 * (pantalla "Mis Recetas") y las acciones de receta.service.ts a la UI.
 */

import { useCallback, useEffect, useState } from 'react';
import * as recetaService from './receta.service';
import type { RecetaConCosto } from './receta.service';
import type { CrearRecetaInput, EditarIngredientesRecetaInput } from './receta.schema';

export function useRecetas() {
  const [recetas, setRecetas] = useState<RecetaConCosto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setRecetas(await recetaService.listarRecetasConCosto());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar recetas');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crearReceta = useCallback(
    async (input: CrearRecetaInput) => {
      const resultado = await recetaService.crearReceta(input);
      await cargar();
      return resultado;
    },
    [cargar]
  );

  const editarIngredientesReceta = useCallback(
    (recetaId: number, input: EditarIngredientesRecetaInput) => recetaService.editarIngredientesReceta(recetaId, input),
    []
  );

  const desactivarReceta = useCallback(
    async (recetaId: number) => {
      await recetaService.desactivarReceta(recetaId);
      await cargar();
    },
    [cargar]
  );

  return {
    recetas,
    cargando,
    error,
    recargar: cargar,
    crearReceta,
    editarIngredientesReceta,
    desactivarReceta,
    puedeEditarse: recetaService.puedeEditarse,
    obtenerReceta: recetaService.obtenerReceta,
  };
}
