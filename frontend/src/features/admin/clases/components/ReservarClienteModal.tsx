import { useState } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { BuscadorCliente } from '@/features/admin/clientes/components/BuscadorCliente'
import type { Cliente } from '@/features/admin/clientes/types'
import { ERRORES_RESERVA, mensajeDe } from '@/features/clases/errores'

interface Props {
  abierto: boolean
  descripcion: string
  guardando: boolean
  error: unknown
  onReservar: (cliente: Cliente) => void
  onCerrar: () => void
}

/** Reservar un lugar a nombre de un cliente (por ejemplo, si lo pide en recepción o por teléfono). */
export function ReservarClienteModal({ abierto, descripcion, guardando, error, onReservar, onCerrar }: Props) {
  return (
    <Modal abierto={abierto} titulo="Reservar a un cliente" descripcion={descripcion} bloqueado={guardando} onCerrar={onCerrar}>
      <Contenido guardando={guardando} error={error} onReservar={onReservar} onCerrar={onCerrar} />
    </Modal>
  )
}

function Contenido({ guardando, error, onReservar, onCerrar }: Omit<Props, 'abierto' | 'descripcion'>) {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const mensajeError = mensajeDe(error, ERRORES_RESERVA, 'No se pudo reservar. Intenta de nuevo.')

  return (
    <div className="space-y-4">
      {mensajeError && <Aviso tono="error">{mensajeError}</Aviso>}
      <BuscadorCliente valor={cliente} onElegir={setCliente} />
      <p className="text-sm text-steel">Se revisa que tenga membresía activa y que su plan incluya esta sede y esta clase.</p>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variante="secundario" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Button>
        <Button disabled={!cliente} cargando={guardando} onClick={() => cliente && onReservar(cliente)}>
          Reservar
        </Button>
      </div>
    </div>
  )
}
