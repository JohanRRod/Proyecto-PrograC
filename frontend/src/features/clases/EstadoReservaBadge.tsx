import { Badge, type Tono } from '@/components/ui/Badge'
import { ESTADOS_RESERVA, type EstadoReserva } from './types'

const TONOS: Record<EstadoReserva, Tono> = {
  RESERVADA: 'info',
  ASISTIO: 'exito',
  CANCELADA: 'neutro',
  INASISTENCIA: 'peligro',
}

export function EstadoReservaBadge({ estado }: { estado: EstadoReserva }) {
  return <Badge tono={TONOS[estado] ?? 'neutro'}>{ESTADOS_RESERVA[estado] ?? estado}</Badge>
}
