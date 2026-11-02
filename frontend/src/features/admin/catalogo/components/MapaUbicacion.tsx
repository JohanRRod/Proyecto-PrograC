import { useEffect } from 'react'
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Coordenada } from '@/features/catalog/geo'

const redondear = (n: number) => Math.round(n * 1e6) / 1e6

const pin = L.divIcon({
  className: 'flex-marker',
  iconSize: [32, 42],
  iconAnchor: [16, 40],
  html: `<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true">
    <path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1Z"
      fill="var(--color-plate-blue)" stroke="var(--color-surface)" stroke-width="2"/>
    <circle cx="16" cy="15.5" r="5" fill="var(--color-surface)"/>
  </svg>`,
})

interface Props {
  posicion: Coordenada | null
  /** Dónde mirar cuando todavía no hay ubicación (el país elegido). */
  centro: Coordenada
  /** Las demás sedes, como referencia. */
  otras: { id: number; nombre: string; posicion: Coordenada }[]
  onCambiar: (posicion: Coordenada) => void
}

/** Mapa para ubicar una sede: clic para colocar el marcador o arrastrarlo para ajustarlo. */
export function MapaUbicacion({ posicion, centro, otras, onCambiar }: Props) {
  const cambiar = (lat: number, lng: number) => onCambiar([redondear(lat), redondear(lng)])

  return (
    <MapContainer
      center={posicion ?? centro}
      zoom={posicion ? 15 : 6}
      minZoom={3}
      scrollWheelZoom
      className="size-full"
      aria-label="Mapa para ubicar la sede"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {otras.map((s) => (
        <CircleMarker
          key={s.id}
          center={s.posicion}
          radius={6}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#64748b', fillOpacity: 0.9 }}
        >
          <Tooltip direction="top">{s.nombre}</Tooltip>
        </CircleMarker>
      ))}
      {posicion && (
        <Marker
          position={posicion}
          icon={pin}
          draggable
          autoPan
          title="Ubicación de la sede"
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = (e.target as L.Marker).getLatLng()
              cambiar(lat, lng)
            },
          }}
        />
      )}
      <AlHacerClic onClic={cambiar} />
      <Seguir posicion={posicion} centro={centro} />
    </MapContainer>
  )
}

function AlHacerClic({ onClic }: { onClic: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClic(e.latlng.lat, e.latlng.lng) })
  return null
}

/**
 * Si se escribe la latitud/longitud a mano, el mapa va hacia ese punto.
 * Sin ubicación, al cambiar de país el mapa se mueve a ese país.
 */
function Seguir({ posicion, centro }: { posicion: Coordenada | null; centro: Coordenada }) {
  const mapa = useMap()
  const [lat, lng] = posicion ?? [Number.NaN, Number.NaN]
  const [cLat, cLng] = centro

  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (!mapa.getBounds().contains([lat, lng])) mapa.setView([lat, lng], Math.max(mapa.getZoom(), 14))
    }
  }, [mapa, lat, lng])

  useEffect(() => {
    if (!Number.isFinite(lat)) mapa.setView([cLat, cLng], 6)
    // Solo cuando cambia el país; no al mover el marcador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa, cLat, cLng])

  return null
}
