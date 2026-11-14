import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { regionLabel, type Area } from '@/data/areas'
import { REGION_COLOR } from '@/lib/region-color'

const LA_CENTER: [number, number] = [34.05, -118.28]
const iconCache = new Map<string, L.DivIcon>()

function MapViewportSync({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const initial = useRef(true)

  useEffect(() => {
    if (initial.current) {
      initial.current = false
      return
    }
    map.setView(center, zoom, { animate: false })
  }, [map, center[0], center[1], zoom])

  return null
}

function MapBoundsSync({ areas, enabled }: { areas: Area[]; enabled: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (!enabled || areas.length === 0) return
    if (areas.length === 1) {
      map.setView([areas[0].lat, areas[0].lng], 12, { animate: false })
      return
    }
    const bounds = L.latLngBounds(areas.map((area) => [area.lat, area.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 11, animate: false })
  }, [map, areas, enabled])

  return null
}

function pinIcon(color: string, active = false) {
  const key = `${color}-${active}`
  const cached = iconCache.get(key)
  if (cached) return cached
  const size = active ? 20 : 14
  const icon = L.divIcon({
    className: '',
    html: `<span style="
      display:block;width:${size}px;height:${size}px;border-radius:999px;
      background:${color};border:2.5px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
  iconCache.set(key, icon)
  return icon
}

function AreaPopup({ area }: { area: Area }) {
  return (
    <Popup>
      <div className="min-w-[180px]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {regionLabel(area.region)}
        </p>
        <p className="mt-0.5 text-[14px] font-semibold text-foreground">{area.name}</p>
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{area.identity}</p>
        <Link
          to={`/area/${area.slug}`}
          className="leaflet-area-link mt-2 inline-block text-[12px] font-semibold hover:underline"
        >
          Open place
        </Link>
      </div>
    </Popup>
  )
}

export function AreaMap({
  areas,
  theme,
  center = LA_CENTER,
  zoom = 9,
  className = 'h-[420px]',
  interactive = true,
  showPopups = true,
  fitToAreas = false,
}: {
  areas: Area[]
  theme: 'light' | 'dark'
  center?: [number, number]
  zoom?: number
  className?: string
  interactive?: boolean
  showPopups?: boolean
  fitToAreas?: boolean
}) {
  // Esri's Canvas basemaps are keyless and ship a matching dark variant, so the
  // map stays quiet in both themes without an API key in the static bundle.
  const tiles = useMemo(
    () =>
      theme === 'dark'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    [theme],
  )
  const useCanvasPins = areas.length > 80

  return (
    <div className={`overflow-hidden rounded-2xl border border-border ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        preferCanvas={useCanvasPins}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
        zoomControl={interactive}
        className="size-full"
        attributionControl
      >
        {fitToAreas ? <MapBoundsSync areas={areas} enabled /> : <MapViewportSync center={center} zoom={zoom} />}
        <TileLayer
          key={tiles}
          url={tiles}
          attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ'
          maxZoom={16}
        />
        {areas.map((area) =>
          useCanvasPins ? (
            <CircleMarker
              key={area.slug}
              center={[area.lat, area.lng]}
              radius={5}
              pathOptions={{
                color: '#fff',
                weight: 1.5,
                fillColor: REGION_COLOR[area.region],
                fillOpacity: 0.9,
              }}
            >
              {showPopups && <AreaPopup area={area} />}
            </CircleMarker>
          ) : (
            <Marker
              key={area.slug}
              position={[area.lat, area.lng]}
              icon={pinIcon(REGION_COLOR[area.region], areas.length === 1)}
              title={area.name}
            >
              {showPopups && <AreaPopup area={area} />}
            </Marker>
          ),
        )}
      </MapContainer>
    </div>
  )
}
