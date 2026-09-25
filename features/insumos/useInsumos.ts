/**
 * features/insumos/useInsumos.ts
 *
 * Expone la lista de insumos con stock/costo (HU 2.1) y editarNombreInsumo
 * (HU 2.2) a la UI. Sin paginación: a diferencia de compras, la cantidad de
 * insumos distintos de un taller es chica.
 */

import { useCallback, useEffect, useState } from 'react';
import * as insumoService from './insumo.service';
import type { InsumoListado } from './insumo.service';
import type { EditarNombreInsumoInput } from './insumo.schema';

export function useInsumos() {
  const [insumos, setInsumos] = useState<InsumoListado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setInsumos(await insumoService.listarInsumos());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar insumos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const editarNombreInsumo = useCallback(
    async (insumoId: number, input: EditarNombreInsumoInput) => {
      await insumoService.editarNombreInsumo(insumoId, input);
      await cargar();
    },
    [cargar]
  );

  return { insumos, cargando, error, recargar: cargar, editarNombreInsumo };
}
