import { useState } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ApiError } from '@/lib/http'
import { formatoMoneda } from '@/lib/format'
import { useCobrar } from '../hooks'
import type { Cobro, MetodoPago } from '../types'
import { SelectorMetodo } from './SelectorMetodo'

interface Props {
  abierto: boolean
  clienteId: string
  membresiaId: number
  metodos: MetodoPago[]
  metodoSugeridoId: number | null
  onCerrar: () => void
  onCobrado: (cobro: Cobro) => void
}

/**
 * Cobro manual de la mensualidad vencida (por ejemplo, para reactivar una membresía suspendida).
 * El backend decide el monto y si hay una mensualidad pendiente que cobrar.
 */
export function CobrarModal({ abierto, clienteId, membresiaId, metodos, metodoSugeridoId, onCerrar, onCobrado }: Props) {
  const cobrar = useCobrar(clienteId)
  const [metodoId, setMetodoId] = useState('')
  const [rechazado, setRechazado] = useState<Cobro | null>(null)

  const elegido = metodoId || (metodoSugeridoId ? String(metodoSugeridoId) : '')

  const cerrar = () => {
    cobrar.reset()
    setRechazado(null)
    setMetodoId('')
    onCerrar()
  }

  const enviar = () => {
    setRechazado(null)
    cobrar.mutate(
      { membresiaId, metodoPagoId: Number(elegido), concepto: 'MENSUALIDAD' },
      {
        onSuccess: (cobro) => {
          if (cobro.estado_transaccion === 'EXITOSO') {
            onCobrado(cobro)
            cerrar()
          } else {
            setRechazado(cobro)
          }
        },
      },
    )
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Cobrar mensualidad"
      descripcion="Cobra la mensualidad vencida que esté pendiente. Si la membresía estaba suspendida y queda al día, se reactiva."
      bloqueado={cobrar.isPending}
      onCerrar={cerrar}
    >
      <div className="space-y-4">
        {cobrar.isError && (
          <Aviso tono="error">{cobrar.error instanceof ApiError ? cobrar.error.message : 'No se pudo hacer el cobro.'}</Aviso>
        )}
        {rechazado && (
          <Aviso tono="error">
            El cobro de {formatoMoneda(rechazado.monto_total_cobrado)} fue rechazado por fondos insuficientes. Prueba con
            otro método.
          </Aviso>
        )}
        <SelectorMetodo metodos={metodos} value={elegido} onChange={(e) => setMetodoId(e.target.value)} />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variante="secundario" onClick={cerrar} disabled={cobrar.isPending}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={!elegido} cargando={cobrar.isPending}>
            Cobrar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
