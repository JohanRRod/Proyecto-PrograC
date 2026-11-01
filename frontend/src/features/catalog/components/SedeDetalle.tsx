import type { ReactNode } from 'react'
import { ArrowLeft, Clock, MapPin, Navigation, Phone, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { clasesBoton } from '@/components/ui/botonEstilos'
import { Cargando, ErrorCarga, Vacio } from '@/components/ui/StateMessage'
import { formatoHora } from '@/lib/format'
import { enlaceComoLlegar } from '../geo'
import { useAmenidadesSucursal } from '../hooks'
import type { Sucursal } from '../types'

export function SedeDetalle({ sede, distancia, onVolver }: { sede: Sucursal; distancia: string | null; onVolver: () => void }) {
  const amenidades = useAmenidadesSucursal(sede.id)

  return (
    <div>
      <button
        type="button"
        onClick={onVolver}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-plate-blue hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Todas las sedes
      </button>

      <h2 className="text-2xl">{sede.nombre}</h2>
      <p className="mt-0.5 text-steel">
        {sede.ciudad}, {sede.pais}
        {distancia && <span>, {distancia} de ti</span>}
      </p>
      {sede.es_sede_vip && (
        <Badge tono="tinta" className="mt-3">
          Tiene zonas Black
        </Badge>
      )}

      <dl className="mt-5 space-y-3 text-[0.95rem]">
        <Dato icono={<MapPin className="size-4" />} etiqueta="Dirección">
          {sede.direccion}
        </Dato>
        <Dato icono={<Clock className="size-4" />} etiqueta="Horario">
          Todos los días de {formatoHora(sede.horario_apertura)} a {formatoHora(sede.horario_cierre)}
        </Dato>
        {sede.telefono && (
          <Dato icono={<Phone className="size-4" />} etiqueta="Teléfono">
            <a href={`tel:${sede.telefono.replaceAll(' ', '')}`} className="text-plate-blue hover:underline">
              {sede.telefono}
            </a>
          </Dato>
        )}
        <Dato icono={<Users className="size-4" />} etiqueta="Capacidad">
          Hasta {sede.capacidad_maxima.toLocaleString('es-GT')} personas a la vez
        </Dato>
      </dl>

      <a
        href={enlaceComoLlegar(sede)}
        target="_blank"
        rel="noreferrer"
        className={clasesBoton('secundario', 'md', 'mt-5 w-full sm:w-auto')}
      >
        <Navigation className="size-4" aria-hidden="true" />
        Cómo llegar
      </a>

      <h3 className="mt-8 text-lg">Amenidades</h3>
      {amenidades.isPending ? (
        <Cargando className="py-6" />
      ) : amenidades.isError ? (
        <ErrorCarga error={amenidades.error} onReintentar={() => void amenidades.refetch()} />
      ) : amenidades.data.length === 0 ? (
        <Vacio titulo="Sin amenidades registradas" descripcion="Esta sede aún no tiene amenidades cargadas." />
      ) : (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {amenidades.data.map((a) => (
            <li key={a.id} className="py-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={a.disponible ? 'font-medium' : 'font-medium text-steel line-through'}>{a.nombre}</span>
                {a.requiere_plan_vip && <Badge tono="tinta">Solo plan Black</Badge>}
                {!a.disponible && <Badge tono="aviso">No disponible</Badge>}
              </div>
              {a.descripcion && <p className="mt-0.5 text-sm text-steel">{a.descripcion}</p>}
              {(a.capacidad_zona || a.horario_especial) && (
                <p className="mt-0.5 text-sm text-steel">
                  {a.capacidad_zona ? `Cupo de ${a.capacidad_zona} personas` : null}
                  {a.capacidad_zona && a.horario_especial ? '. ' : null}
                  {a.horario_especial}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Dato({ icono, etiqueta, children }: { icono: ReactNode; etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="mt-0.5 text-steel" title={etiqueta}>
        <span aria-hidden="true">{icono}</span>
        <span className="sr-only">{etiqueta}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  )
}
