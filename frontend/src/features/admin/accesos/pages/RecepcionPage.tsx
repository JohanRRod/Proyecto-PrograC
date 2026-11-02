import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { CheckCircle2, DoorOpen, XCircle } from 'lucide-react'
import { Aviso } from '@/components/ui/Aviso'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { SelectField } from '@/components/ui/SelectField'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAmenidadesSucursal, useSucursales } from '@/features/catalog/hooks'
import { ApiError } from '@/lib/http'
import { cn } from '@/lib/cn'
import { BuscadorCliente } from '../../clientes/components/BuscadorCliente'
import { useClientes } from '../../clientes/hooks'
import { nombreCompleto, type Cliente } from '../../clientes/types'
import { HistorialAccesos } from '../components/HistorialAccesos'
import { useRegistrarEntrada } from '../hooks'
import { motivoLegible, TIPOS_ACCESO } from '../motivos'
import type { ResultadoCheckIn } from '../types'

/** La recepción de una sede casi siempre es la misma: se recuerda en este equipo. */
const CLAVE_SEDE = 'flexpass.recepcion.sede'

function leerSede(): string {
  try {
    return localStorage.getItem(CLAVE_SEDE) ?? ''
  } catch {
    return ''
  }
}

function guardarSede(id: string) {
  try {
    localStorage.setItem(CLAVE_SEDE, id)
  } catch {
    // Sin almacenamiento: solo no se recuerda la sede.
  }
}

export function RecepcionPage() {
  const sucursales = useSucursales()
  const clientes = useClientes()
  const registrar = useRegistrarEntrada()
  const [params] = useSearchParams()

  const [sedeId, setSedeId] = useState(leerSede)
  const [zonaId, setZonaId] = useState('')
  const [elegido, setElegido] = useState<Cliente | null>(null)
  const [resultado, setResultado] = useState<{ datos: ResultadoCheckIn; cliente: Cliente } | null>(null)

  // Si se llega desde el detalle de un cliente (?cliente=id), queda preseleccionado.
  const desdeUrl = params.get('cliente')
  const cliente = elegido ?? (desdeUrl ? (clientes.data?.find((c) => c.id === desdeUrl) ?? null) : null)

  const zonas = useAmenidadesSucursal(sedeId ? Number(sedeId) : null)
  const sede = sucursales.data?.find((s) => String(s.id) === sedeId)

  const limpiarResultado = () => {
    setResultado(null)
    registrar.reset()
  }

  const enviar = () => {
    if (!cliente || !sedeId) return
    const actual = cliente
    registrar.mutate(
      { clienteId: actual.id, sucursalId: Number(sedeId), amenidadId: zonaId ? Number(zonaId) : null },
      { onSuccess: (datos) => setResultado({ datos, cliente: actual }) },
    )
  }

  return (
    <>
      <PageHeader
        titulo="Recepción"
        descripcion="Registra la entrada de un cliente. El sistema revisa su plan y dice si puede pasar."
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Panel className="space-y-4 p-4 sm:p-5">
            <SelectField
              label="Sede donde estás"
              value={sedeId}
              disabled={sucursales.isPending}
              onChange={(e) => {
                setSedeId(e.target.value)
                guardarSede(e.target.value)
                setZonaId('')
                limpiarResultado()
              }}
            >
              <option value="">{sucursales.isPending ? 'Cargando sedes…' : 'Elige la sede'}</option>
              {sucursales.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} ({s.ciudad}, {s.pais})
                </option>
              ))}
            </SelectField>

            <BuscadorCliente
              valor={cliente}
              onElegir={(c) => {
                setElegido(c)
                limpiarResultado()
              }}
            />

            <SelectField
              label="Zona (opcional)"
              value={zonaId}
              disabled={!sedeId || zonas.isPending}
              ayuda="Déjalo en blanco para registrar solo la entrada a la sede."
              onChange={(e) => {
                setZonaId(e.target.value)
                limpiarResultado()
              }}
            >
              <option value="">Solo entrada a la sede</option>
              {zonas.data?.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                  {z.requiere_plan_vip ? ' (Black)' : ''}
                  {z.disponible ? '' : ' (no disponible)'}
                </option>
              ))}
            </SelectField>

            {registrar.isError && (
              <Aviso tono="error">
                {registrar.error instanceof ApiError ? registrar.error.message : 'No se pudo registrar la entrada.'}
              </Aviso>
            )}

            <Button
              className="w-full"
              disabled={!cliente || !sedeId}
              cargando={registrar.isPending}
              icono={<DoorOpen className="size-4" aria-hidden="true" />}
              onClick={enviar}
            >
              Registrar entrada
            </Button>
          </Panel>

          {resultado && <Resultado resultado={resultado.datos} cliente={resultado.cliente} sede={sede?.nombre} />}
        </div>

        {cliente ? (
          <HistorialAccesos clienteId={cliente.id} titulo={`Accesos de ${nombreCompleto(cliente)}`} />
        ) : (
          <Panel className="p-6 text-center text-steel">Elige un cliente para ver sus entradas anteriores.</Panel>
        )}
      </div>
    </>
  )
}

/** El momento clave de la recepción: verde si pasa, rojo y el porqué si no. */
function Resultado({ resultado, cliente, sede }: { resultado: ResultadoCheckIn; cliente: Cliente; sede?: string }) {
  const ok = resultado.permitido
  const Icono = ok ? CheckCircle2 : XCircle

  return (
    <section
      role="status"
      aria-live="polite"
      className={cn(
        'flex gap-4 rounded-panel border-2 p-5',
        ok ? 'border-plate-green bg-plate-green-soft' : 'border-plate-red bg-plate-red-soft',
      )}
    >
      <Icono className={cn('size-10 shrink-0', ok ? 'text-plate-green' : 'text-plate-red')} aria-hidden="true" />
      <div>
        <p className={cn('font-display text-2xl font-bold', ok ? 'text-plate-green' : 'text-plate-red')}>
          {ok ? 'Puede pasar' : 'Acceso rechazado'}
        </p>
        <p className="mt-1 font-medium">{nombreCompleto(cliente)}</p>
        <p className="mt-1 text-ink-soft">
          {ok
            ? `${TIPOS_ACCESO[resultado.tipo] ?? resultado.tipo}${sede ? ` en ${sede}` : ''}.`
            : motivoLegible(resultado.motivo)}
        </p>
      </div>
    </section>
  )
}
