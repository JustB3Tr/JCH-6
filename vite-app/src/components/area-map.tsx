import { useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { regionLabel, type Area } from '@/data/areas'
import { REGION_COLOR } from '@/lib/region-color'

const LA_CENTER: [number, number] = [34.05, -118.28]

function pinIcon(color: string, active = false) {
  const size = active ? 20 : 14
  return L.divIcon({
    className: '',
    html: `<span style="
      display:block;width:${size}px;height:${size}px;border-radius:999px;
      background:${color};border:2.5px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export function AreaMap({
  areas,
  theme,
  center = LA_CENTER,
  zoom = 9,
  className = 'h-[420px]',
  interactive = true,
}: {
  areas: Area[]
  theme: 'light' | 'dark'
  center?: [number, number]
  zoom?: number
  className?: string
  interactive?: boolean
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

  return (
    <div className={`overflow-hidden rounded-2xl border border-border ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        className="size-full"
        attributionControl
      >
        <TileLayer
          key={tiles}
          url={tiles}
          attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ'
          maxZoom={16}
        />
        {areas.map((area) => (
          <Marker
            key={area.slug}
            position={[area.lat, area.lng]}
            icon={pinIcon(REGION_COLOR[area.region], areas.length === 1)}
            title={area.name}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                  {regionLabel(area.region)}
                </p>
                <p className="mt-0.5 text-[14px] font-semibold text-neutral-900">{area.name}</p>
                <p className="mt-1 text-[12px] leading-snug text-neutral-600">{area.identity}</p>
                <Link
                  to={`/area/${area.slug}`}
                  className="mt-2 inline-block text-[12px] font-semibold text-primary"
                >
                  Open area
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
