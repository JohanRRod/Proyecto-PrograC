import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { buscarConversaciones, buscarOperaciones, obtenerOperacion, opcionesBitacora } from './api'
import type { FiltrosBitacora } from './types'

export const TAMANO_PAGINA = 25

export const useOperaciones = (f: FiltrosBitacora, pagina: number) =>
  useQuery({
    queryKey: ['admin', 'bitacora', 'operaciones', f, pagina],
    queryFn: () => buscarOperaciones(f, pagina, TAMANO_PAGINA),
    placeholderData: keepPreviousData,
  })

export const useOperacion = (id: number | null) =>
  useQuery({
    queryKey: ['admin', 'bitacora', 'operacion', id],
    queryFn: () => obtenerOperacion(id as number),
    enabled: id !== null,
  })

export const useOpcionesBitacora = () =>
  useQuery({ queryKey: ['admin', 'bitacora', 'opciones'], queryFn: opcionesBitacora, staleTime: 60_000 })

export const useConversaciones = (desde: string, hasta: string, pagina: number) =>
  useQuery({
    queryKey: ['admin', 'bitacora', 'ia', desde, hasta, pagina],
    queryFn: () => buscarConversaciones(desde, hasta, pagina, TAMANO_PAGINA),
    placeholderData: keepPreviousData,
  })
