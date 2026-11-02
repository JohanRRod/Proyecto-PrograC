import { useState } from 'react'
import { Aviso } from '@/components/ui/Aviso'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { Plan } from '@/features/catalog/types'
import { estadoPermanencia } from '@/features/member/permanencia'
import { ApiError } from '@/lib/http'
import { formatoFecha, formatoMoneda } from '@/lib/format'
import { useCobrar } from '../../pagos/hooks'
import { SelectorMetodo } from '../../pagos/components/SelectorMetodo'
import type { MetodoPago } from '../../pagos/types'
import { useCancelar } from '../hooks'
import { CANCELACION_PENDIENTE, YA_HAY_CANCELACION, type Membresia } from '../types'

type Paso = 'motivo' | 'penalizacion'

interface Props {
  abierto: boolean
  clienteId: string
  membresia: Membresia
  plan: Plan | undefined
  metodos: MetodoPago[]
  onCerrar: () => void
  onTerminado: (mensaje: string) => void
}

/**
 * Cancelación en dos pasos, como funciona el backend:
 *  1. Se registra la solicitud con su motivo; el backend calcula la penalización.
 *  2. Si hay penalización, la membresía sigue activa hasta cobrarla. Al cobrarla queda cancelada.
 */
export function CancelarModal({ abierto, clienteId, membresia, plan, metodos, onCerrar, onTerminado }: Props) {
  const cancelar = useCancelar(clienteId)
  const cobrar = useCobrar(clienteId)
  const [paso, setPaso] = useState<Paso>('motivo')
  const [motivo, setMotivo] = useState('')
  const [penalizacion, setPenalizacion] = useState<number | null>(null)
  const [metodoId, setMetodoId] = useState('')
  const [rechazado, setRechazado] = useState(false)

  const estimada = estadoPermanencia(membresia.fechaInicio, membresia.fechaFinPermanenciaMinima, plan)
  const metodoSugerido = metodoId || (membresia.metodoPagoId ? String(membresia.metodoPagoId) : '')
  const ocupado = cancelar.isPending || cobrar.isPending

  const cerrar = () => {
    cancelar.reset()
    cobrar.reset()
    setPaso('motivo')
    setMotivo('')
    setPenalizacion(null)
    setMetodoId('')
    setRechazado(false)
    onCerrar()
  }

  const solicitar = () =>
    cancelar.mutate(
      { membresiaId: membresia.id, motivo: motivo.trim() },
      {
        onSuccess: (r) => {
          if (r.resultado === CANCELACION_PENDIENTE) {
            setPenalizacion(Number(r.montoPenalizacion))
            setPaso('penalizacion')
          } else {
            onTerminado('Membresía cancelada sin penalización: ya había cumplido la permanencia mínima.')
            cerrar()
          }
        },
        onError: (e) => {
          // Ya se pidió antes: solo falta cobrar la penalización.
          if (e instanceof ApiError && e.message.startsWith(YA_HAY_CANCELACION)) {
            setPenalizacion(estimada.penalizacion)
            setPaso('penalizacion')
            cancelar.reset()
          }
        },
      },
    )

  const cobrarPenalizacion = () => {
    setRechazado(false)
    cobrar.mutate(
      { membresiaId: membresia.id, metodoPagoId: Number(metodoSugerido), concepto: 'PENALIZACION_CANCELACION' },
      {
        onSuccess: (cobro) => {
          if (cobro.estado_transaccion === 'EXITOSO') {
            onTerminado(`Penalización de ${formatoMoneda(cobro.monto_total_cobrado)} cobrada. La membresía quedó cancelada.`)
            cerrar()
          } else {
            setRechazado(true)
          }
        },
      },
    )
  }

  return (
    <Modal
      abierto={abierto}
      titulo={paso === 'motivo' ? 'Cancelar membresía' : 'Cobrar penalización'}
      bloqueado={ocupado}
      onCerrar={cerrar}
    >
      {paso === 'motivo' ? (
        <div className="space-y-4">
          <div className="rounded-control bg-chalk px-3 py-2.5 text-[0.95rem]">
            {estimada.cumplida ? (
              <p>Ya cumplió la permanencia mínima: se cancela sin penalización.</p>
            ) : (
              <p>
                La permanencia termina el {formatoFecha(membresia.fechaFinPermanenciaMinima)}. Faltan{' '}
                {estimada.mesesRestantes} {estimada.mesesRestantes === 1 ? 'mes' : 'meses'}, así que se cobra una
                penalización de aproximadamente{' '}
                <span className="font-semibold">{formatoMoneda(estimada.penalizacion ?? 0)}</span>.
              </p>
            )}
          </div>

          {cancelar.isError && (
            <Aviso tono="error">
              {cancelar.error instanceof ApiError ? cancelar.error.message : 'No se pudo registrar la cancelación.'}
            </Aviso>
          )}

          <div>
            <label htmlFor="motivo-cancelacion" className="mb-1.5 block text-sm font-medium text-ink-soft">
              Motivo
            </label>
            <textarea
              id="motivo-cancelacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value.slice(0, 1000))}
              rows={3}
              placeholder="Por ejemplo, se muda de ciudad"
              className="w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-base placeholder:text-steel/70 focus:border-plate-blue focus:outline-none focus:ring-2 focus:ring-plate-blue/20"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variante="secundario" onClick={cerrar} disabled={ocupado}>
              Volver
            </Button>
            <Button variante="peligro" onClick={solicitar} disabled={!motivo.trim()} cargando={cancelar.isPending}>
              Cancelar membresía
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p>
            La cancelación quedó registrada, pero la membresía sigue activa hasta que se cobre la penalización
            {penalizacion !== null && (
              <>
                {' '}
                de <span className="font-semibold">{formatoMoneda(penalizacion)}</span>
              </>
            )}
            .
          </p>
          {cobrar.isError && (
            <Aviso tono="error">{cobrar.error instanceof ApiError ? cobrar.error.message : 'No se pudo hacer el cobro.'}</Aviso>
          )}
          {rechazado && <Aviso tono="error">El cobro fue rechazado por fondos insuficientes. Prueba con otro método.</Aviso>}
          <SelectorMetodo metodos={metodos} value={metodoSugerido} onChange={(e) => setMetodoId(e.target.value)} />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variante="secundario" onClick={cerrar} disabled={ocupado}>
              Cobrar después
            </Button>
            <Button onClick={cobrarPenalizacion} disabled={!metodoSugerido} cargando={cobrar.isPending}>
              Cobrar penalización
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
