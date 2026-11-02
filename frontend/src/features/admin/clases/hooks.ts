import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { ClaseDatos, EstadoReserva, InstructorDatos } from '@/features/clases/types'
import {
  actualizarClase,
  actualizarInstructor,
  cancelarReserva,
  consultarOcupacion,
  crearClase,
  crearInstructor,
  listarClases,
  listarInstructores,
  listarReservasDeClase,
  marcarAsistencia,
  reservarParaCliente,
} from './api'

export const clasesAdminKeys = {
  todo: ['admin', 'clases'] as const,
  clases: ['admin', 'clases', 'lista'] as const,
  instructores: ['admin', 'clases', 'instructores'] as const,
  ocupacion: (sede: number, desde: string, hasta: string) => ['admin', 'clases', 'ocupacion', sede, desde, hasta] as const,
  reservas: (clase: number, fecha: string) => ['admin', 'clases', 'reservas', clase, fecha] as const,
}

const refrescar = (qc: QueryClient) => void qc.invalidateQueries({ queryKey: clasesAdminKeys.todo })

export const useClases = () => useQuery({ queryKey: clasesAdminKeys.clases, queryFn: listarClases })

export const useInstructores = () => useQuery({ queryKey: clasesAdminKeys.instructores, queryFn: listarInstructores })

export const useOcupacion = (sede: number | null, desde: string, hasta: string) =>
  useQuery({
    queryKey: clasesAdminKeys.ocupacion(sede ?? 0, desde, hasta),
    queryFn: () => consultarOcupacion(sede as number, desde, hasta),
    enabled: sede !== null,
  })

export const useReservasDeClase = (clase: number, fecha: string) =>
  useQuery({
    queryKey: clasesAdminKeys.reservas(clase, fecha),
    queryFn: () => listarReservasDeClase(clase, fecha),
    enabled: Number.isFinite(clase),
  })

export function useGuardarClase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id?: number; datos: ClaseDatos }) => (id ? actualizarClase(id, datos) : crearClase(datos)),
    onSuccess: () => refrescar(qc),
  })
}

export function useGuardarInstructor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id?: number; datos: InstructorDatos }) =>
      id ? actualizarInstructor(id, datos) : crearInstructor(datos),
    onSuccess: () => refrescar(qc),
  })
}

export function useReservarParaCliente() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: reservarParaCliente, onSuccess: () => refrescar(qc) })
}

export function useCancelarReserva() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: cancelarReserva, onSuccess: () => refrescar(qc) })
}

export function useMarcarAsistencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: Extract<EstadoReserva, 'ASISTIO' | 'INASISTENCIA'> }) =>
      marcarAsistencia(id, estado),
    onSuccess: () => refrescar(qc),
  })
}
