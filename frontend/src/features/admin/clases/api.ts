import { api } from '@/lib/http'
import type {
  Clase,
  ClaseDatos,
  EstadoReserva,
  Instructor,
  InstructorDatos,
  Ocupacion,
  Reserva,
  ReservaDeClase,
} from '@/features/clases/types'

// Clases
export const listarClases = () => api<Clase[]>('/clases')
export const crearClase = (datos: ClaseDatos) => api<Clase>('/clases', { method: 'POST', json: datos })
export const actualizarClase = (id: number, datos: ClaseDatos) => api<Clase>(`/clases/${id}`, { method: 'PUT', json: datos })

export const consultarOcupacion = (sucursalId: number, desde: string, hasta: string) =>
  api<Ocupacion[]>(`/clases/ocupacion?${new URLSearchParams({ sucursalId: String(sucursalId), desde, hasta })}`)

export const listarReservasDeClase = (claseId: number, fecha: string) =>
  api<ReservaDeClase[]>(`/clases/${claseId}/reservas?${new URLSearchParams({ fecha })}`)

// Reservas
export const reservarParaCliente = (datos: { claseId: number; clienteId: string; fechaClase: string }) =>
  api<Reserva>('/reservas', { method: 'POST', json: datos })
export const cancelarReserva = (id: number) => api<Reserva>(`/reservas/${id}/cancelar`, { method: 'PATCH' })
export const marcarAsistencia = (id: number, estado: Extract<EstadoReserva, 'ASISTIO' | 'INASISTENCIA'>) =>
  api<Reserva>(`/reservas/${id}/asistencia`, { method: 'PATCH', json: { estado } })

// Instructores
export const listarInstructores = () => api<Instructor[]>('/instructores')
export const crearInstructor = (datos: InstructorDatos) => api<Instructor>('/instructores', { method: 'POST', json: datos })
export const actualizarInstructor = (id: number, datos: InstructorDatos) =>
  api<Instructor>(`/instructores/${id}`, { method: 'PUT', json: datos })
