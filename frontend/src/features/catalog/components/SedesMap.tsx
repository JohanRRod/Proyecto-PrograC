import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { coordenada, type Coordenada } from '../geo'
import type { Sucursal } from '../types'

/** Centro inicial aproximado entre Guatemala, México y Colombia. */
const CENTRO_INICIAL: Coordenada = [14.5, -88]

/**
 * Marcador propio (sin imágenes de Leaflet): un disco.
 * Azul = sede regular, tinta = sede con zonas Black. La sede seleccionada crece.
 */
function icono(vip: boolean, seleccionada: boolean): L.DivIcon {
  const tam = seleccionada ? 34 : 24
  const relleno = vip ? 'var(--color-ink)' : 'var(--color-plate-blue)'
  const aro = vip ? 'var(--color-plate-blue)' : 'var(--color-surface)'
  return L.divIcon({
    className: 'flex-marker',
    iconSize: [tam, tam],
    iconAnchor: [tam / 2, tam / 2],
    tooltipAnchor: [0, -tam / 2],
    html: `<svg viewBox="0 0 24 24" width="${tam}" height="${tam}" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="${relleno}" stroke="${aro}" stroke-width="${seleccionada ? 3 : 2.5}"/>
      <circle cx="12" cy="12" r="2.8" fill="var(--color-chalk)"/>
    </svg>`,
  })
}

interface Props {
  sedes: Sucursal[]
  seleccionadaId: number | null
  ubicacionUsuario: Coordenada | null
  onSeleccionar: (id: number) => void
}

export function SedesMap({ sedes, seleccionadaId, ubicacionUsuario, onSeleccionar }: Props) {
  return (
    <MapContainer
      center={CENTRO_INICIAL}
      zoom={4}
      minZoom={3}
      scrollWheelZoom
      className="size-full"
      attributionControl
      aria-label="Mapa de sedes FlexPass"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {sedes.map((s) => {
        const sel = s.id === seleccionadaId
        return (
          <Marker
            key={s.id}
            position={coordenada(s)}
            icon={icono(s.es_sede_vip, sel)}
            zIndexOffset={sel ? 1000 : 0}
            title={s.nombre}
            eventHandlers={{ click: () => onSeleccionar(s.id) }}
          >
            <Tooltip direction="top">{s.nombre}</Tooltip>
          </Marker>
        )
      })}
      {ubicacionUsuario && (
        <Marker
          position={ubicacionUsuario}
          interactive={false}
          icon={L.divIcon({
            className: 'flex-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            html: '<span style="display:block;width:16px;height:16px;border-radius:50%;background:var(--color-plate-green);border:3px solid #fff;box-shadow:0 0 0 1px var(--color-plate-green)"></span>',
          })}
        />
      )}
      <Encuadre sedes={sedes} seleccionadaId={seleccionadaId} />
    </MapContainer>
  )
}

/**
 * Mantiene el mapa enfocado: muestra todas las sedes visibles o acerca a la seleccionada.
 * Solo se mueve cuando cambia el filtro o la selección, no en cada render.
 */
function Encuadre({ sedes, seleccionadaId }: { sedes: Sucursal[]; seleccionadaId: number | null }) {
  const map = useMap()
  const clave = useMemo(() => sedes.map((s) => s.id).join(','), [sedes])
  const seleccionada = sedes.find((s) => s.id === seleccionadaId) ?? null

  useEffect(() => {
    // El contenedor puede cambiar de tamaño entre escritorio y móvil.
    const observador = new ResizeObserver(() => map.invalidateSize())
    observador.observe(map.getContainer())
    return () => observador.disconnect()
  }, [map])

  useEffect(() => {
    const animar = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (seleccionada) {
      map.flyTo(coordenada(seleccionada), Math.max(map.getZoom(), 15), { animate: animar, duration: 0.8 })
      return
    }
    if (sedes.length === 0) return
    const limites = L.latLngBounds(sedes.map(coordenada))
    map.flyToBounds(limites, { padding: [48, 48], maxZoom: 13, animate: animar, duration: 0.8 })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reaccionar al filtro y a la selección
  }, [clave, seleccionada?.id, map])

  return null
}
