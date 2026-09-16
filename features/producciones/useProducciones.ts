/**
 * features/producciones/useProducciones.ts
 *
 * Expone el historial de producciones paginado y las acciones de
 * produccion.repository.ts a la UI. Misma técnica de "una fila de más" que
 * useCompras.ts para saber si hay más sin un endpoint de conteo aparte.
 */

import { useCallback, useEffect, useState } from 'react';
import * as produccionRepository from './produccion.repository';
import type { ProduccionListada } from './produccion.repository';
import type { ProducirLoteInput, VentaMermaInput } from './produccion.schema';

const PAGE_SIZE = 10;

export function useProducciones() {
  const [producciones, setProducciones] = useState<ProduccionListada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hayMas, setHayMas] = useState(false);

  const cargar = useCallback(async (offset: number, reemplazar: boolean) => {
    setCargando(true);
    setError(null);
    try {
      const pagina = await produccionRepository.listarProducciones(PAGE_SIZE + 1, offset);
      const hayMasPaginas = pagina.length > PAGE_SIZE;
      const items = hayMasPaginas ? pagina.slice(0, PAGE_SIZE) : pagina;
      setProducciones((prev) => (reemplazar ? items : [...prev, ...items]));
      setHayMas(hayMasPaginas);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el historial de producciones');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(0, true);
  }, [cargar]);

  const cargarMas = useCallback(() => cargar(producciones.length, false), [cargar, producciones.length]);

  const producirLote = useCallback(
    async (input: ProducirLoteInput) => {
      const resultado = await produccionRepository.producirLote(input);
      await cargar(0, true);
      return resultado;
    },
    [cargar]
  );

  const registrarVentaYMerma = useCallback(
    async (produccionId: number, input: VentaMermaInput) => {
      await produccionRepository.registrarVentaYMerma(produccionId, input.heladosVendidos, input.mermaDeclarada);
      await cargar(0, true);
    },
    [cargar]
  );

  const anularProduccion = useCallback(
    async (produccionId: number) => {
      await produccionRepository.anularProduccion(produccionId);
      await cargar(0, true);
    },
    [cargar]
  );

  return {
    producciones,
    cargando,
    error,
    hayMas,
    cargarMas,
    producirLote,
    registrarVentaYMerma,
    anularProduccion,
    obtenerProduccion: produccionRepository.obtenerProduccion,
  };
}
