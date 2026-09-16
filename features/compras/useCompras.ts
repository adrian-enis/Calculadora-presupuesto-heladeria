/**
 * features/compras/useCompras.ts
 *
 * Expone el historial de compras paginado (HU 1.4) y las acciones de
 * compra.service.ts a la UI. Pide una fila de más por página para saber si
 * "hay más" sin agregar un endpoint de conteo aparte. Cada acción de
 * escritura refresca la primera página — MVP de un solo usuario, no hace
 * falta invalidación fina.
 */

import { useCallback, useEffect, useState } from 'react';
import * as compraService from './compra.service';
import type { CompraListada } from './compra.repository';
import type { CompraInput, EditarCompraItemInput } from './compra.schema';

const PAGE_SIZE = 10;

export function useCompras() {
  const [compras, setCompras] = useState<CompraListada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hayMas, setHayMas] = useState(false);

  const cargar = useCallback(async (offset: number, reemplazar: boolean) => {
    setCargando(true);
    setError(null);
    try {
      const pagina = await compraService.listarCompras(PAGE_SIZE + 1, offset);
      const hayMasPaginas = pagina.length > PAGE_SIZE;
      const items = hayMasPaginas ? pagina.slice(0, PAGE_SIZE) : pagina;
      setCompras((prev) => (reemplazar ? items : [...prev, ...items]));
      setHayMas(hayMasPaginas);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el historial de compras');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(0, true);
  }, [cargar]);

  const cargarMas = useCallback(() => cargar(compras.length, false), [cargar, compras.length]);

  const registrarCompra = useCallback(
    async (input: CompraInput) => {
      const resultado = await compraService.registrarCompra(input);
      await cargar(0, true);
      return resultado;
    },
    [cargar]
  );

  const editarCompraItem = useCallback(
    async (compraItemId: number, input: EditarCompraItemInput) => {
      await compraService.editarCompraItem(compraItemId, input);
      await cargar(0, true);
    },
    [cargar]
  );

  const eliminarCompra = useCallback(
    async (compraId: number) => {
      await compraService.eliminarCompra(compraId);
      await cargar(0, true);
    },
    [cargar]
  );

  return { compras, cargando, error, hayMas, cargarMas, registrarCompra, editarCompraItem, eliminarCompra };
}
