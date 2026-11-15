'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { APIProvider, AdvancedMarker, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps'
import {
  CalendarDays,
  Check,
  Compass,
  Loader2,
  Locate,
  MapPin,
  MessageCircle,
  Mic,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { BRAND } from '@/lib/brand'
import { PLACE_TYPES, PLACE_TYPE_META, TINT_HEX, type PlaceType } from '@/lib/constants'
import { api, errorMessage, useApi } from '@/lib/client'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PlaceTypeIcon } from '@/components/place/place-type-icon'
import { PlaceSheet } from '@/components/map/place-sheet'
import { LIGHT_MAP_STYLE } from '@/components/map/map-style'
import type { ExternalPlace, Meta, PlaceSummary, SearchResults } from '@/lib/types'

type LatLng = { lat: number; lng: number }

// Apple Maps opens on your neighborhood, not the whole county.
const HOME_CENTER = { lat: 34.1464, lng: -118.2478 }
const HOME_ZOOM = 13

type MapBounds = { north: number; south: number; east: number; west: number }

// Roughly the viewport at HOME_ZOOM, so the first paint mounts only nearby pins
// instead of all 500. The real bounds replace this as soon as the map is idle.
const INITIAL_BOUNDS: MapBounds = {
  north: HOME_CENTER.lat + 0.09,
  south: HOME_CENTER.lat - 0.09,
  east: HOME_CENTER.lng + 0.12,
  west: HOME_CENTER.lng - 0.12,
}

function useDebounced<T>(value: T, delay = 220) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function MapCamera({ target }: { target: (LatLng & { zoom?: number }) | null }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !target) return
    map.panTo({ lat: target.lat, lng: target.lng })
    if (target.zoom && map.getZoom() !== target.zoom) map.setZoom(target.zoom)
  }, [map, target])
  return null
}

function FitToPlaces({ places, fitKey }: { places: PlaceSummary[]; fitKey: string | null }) {
  const map = useMap()
  const fitted = useRef<string | null>(null)
  useEffect(() => {
    if (!map || !fitKey || fitted.current === fitKey || places.length < 2) return
    const bounds = new google.maps.LatLngBounds()
    for (const place of places) bounds.extend({ lat: place.lat, lng: place.lng })
    map.fitBounds(bounds, 72)
    fitted.current = fitKey
  }, [map, places, fitKey])
  return null
}

type ZoomTier = 'compact' | 'pins' | 'labeled'

function getZoomTier(zoom: number): ZoomTier {
  if (zoom < 11) return 'compact'
  if (zoom >= 13) return 'labeled'
  return 'pins'
}

const PlacePin = memo(function PlacePin({
  place,
  position,
  active,
  compact,
  showLabel,
  onSelect,
}: {
  place: PlaceSummary
  position: LatLng
  active: boolean
  compact: boolean
  showLabel: boolean
  onSelect: (place: PlaceSummary) => void
}) {
  const tint = TINT_HEX[PLACE_TYPE_META[place.type].tint]
  const handleClick = useCallback(() => onSelect(place), [onSelect, place])

  if (compact && !active) {
    return (
      <AdvancedMarker position={position} onClick={handleClick}>
        <div
          className="size-3 rounded-full border-[1.5px] border-white shadow-[0_2px_6px_rgba(46,50,48,0.35)]"
          style={{ backgroundColor: tint }}
        />
      </AdvancedMarker>
    )
  }

  return (
    <AdvancedMarker position={position} onClick={handleClick} zIndex={active ? 10 : 1}>
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'relative flex items-center justify-center rounded-full border-2 border-white text-white shadow-[0_6px_14px_-4px_rgba(46,50,48,0.45)] transition-transform duration-200',
            active ? 'size-11 bg-primary' : 'size-8',
          )}
          style={active ? undefined : { backgroundColor: tint }}
        >
          <PlaceTypeIcon type={place.type} className={active ? 'size-5' : 'size-4'} />
          {active && (
            <span
              aria-hidden
              className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 rounded-[2px] border-b-2 border-r-2 border-white bg-primary"
            />
          )}
        </div>
        {(showLabel || active) && (
          <span
            className={cn(
              'map-pin-label mt-1 max-w-[140px] truncate rounded-full px-2 py-px text-[11px] font-semibold',
              active && 'text-primary',
            )}
          >
            {place.name}
          </span>
        )}
      </div>
    </AdvancedMarker>
  )
})

function PlacePins({
  items,
  selectedId,
  onSelect,
  zoomTier,
}: {
  items: { place: PlaceSummary; position: LatLng }[]
  selectedId: string | null
  onSelect: (place: PlaceSummary) => void
  zoomTier: ZoomTier
}) {
  const compact = zoomTier === 'compact'
  const showLabel = zoomTier === 'labeled'
  return (
    <>
      {items.map(({ place, position }) => (
        <PlacePin
          key={place.id}
          place={place}
          position={position}
          active={selectedId === place.id}
          compact={compact}
          showLabel={showLabel}
          onSelect={onSelect}
        />
      ))}
    </>
  )
}

function ZoomButtons() {
  const map = useMap()
  const zoomBy = (delta: number) => {
    if (!map) return
    map.setZoom((map.getZoom() ?? HOME_ZOOM) + delta)
  }
  return (
    <>
      <button
        type="button"
        onClick={() => zoomBy(1)}
        aria-label="Zoom in"
        className="glass-press flex size-11 items-center justify-center text-foreground/80 hover:text-primary"
      >
        <Plus className="size-5" aria-hidden />
      </button>
      <span aria-hidden className="mx-2.5 h-px bg-border" />
      <button
        type="button"
        onClick={() => zoomBy(-1)}
        aria-label="Zoom out"
        className="glass-press flex size-11 items-center justify-center text-foreground/80 hover:text-primary"
      >
        <Minus className="size-5" aria-hidden />
      </button>
    </>
  )
}

const MAP_NAV = [
  { href: '/map', label: 'Map Explorer', icon: Compass },
  { href: '/events', label: 'Gatherings', icon: CalendarDays },
  { href: '/communities', label: 'Groups', icon: Users },
  { href: '/guide', label: 'Guide', icon: Sparkles },
]

export function MapScreen({
  apiKey,
  mapId,
  meta,
  initialQuery = '',
  initialType = 'all',
}: {
  apiKey: string
  mapId?: string
  meta: Meta
  initialQuery?: string
  initialType?: PlaceType | 'all'
}) {
  const { status } = useSession()
  const [query, setQuery] = useState(initialQuery)
  const debouncedQuery = useDebounced(query)
  const [type, setType] = useState<PlaceType | 'all'>(initialType)
  const [amenities, setAmenities] = useState<string[]>([])
  const [selected, setSelected] = useState<PlaceSummary | null>(null)
  const [camera, setCamera] = useState<(LatLng & { zoom?: number }) | null>(null)
  const [location, setLocation] = useState<LatLng | null>(null)
  const [locating, setLocating] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const centerRef = useRef<LatLng>(HOME_CENTER)
  const [zoomTier, setZoomTier] = useState<ZoomTier>(() => getZoomTier(HOME_ZOOM))
  const [bounds, setBounds] = useState<MapBounds>(INITIAL_BOUNDS)
  const [satellite, setSatellite] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const placesPath = useMemo(() => {
    const params = new URLSearchParams({ limit: '500' })
    if (type !== 'all') params.set('types', type)
    if (amenities.length) params.set('amenities', amenities.join(','))
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
    if (location) params.set('near', `${location.lat},${location.lng}`)
    return `/api/places?${params}`
  }, [type, amenities, debouncedQuery, location])

  const { data, mutate, isLoading } = useApi<{ places: PlaceSummary[] }>(placesPath)
  const places = data?.places ?? []
  const markerItems = useMemo(
    () => places.map((place) => ({ place, position: { lat: place.lat, lng: place.lng } })),
    [places],
  )

  // Only mount pins inside the viewport (plus a small margin). The selected
  // place always stays mounted so its card never loses its pin.
  const visibleItems = useMemo(() => {
    const padLat = (bounds.north - bounds.south) * 0.12
    const padLng = (bounds.east - bounds.west) * 0.12
    return markerItems.filter(({ place, position }) => {
      if (place.id === selected?.id) return true
      return (
        position.lat >= bounds.south - padLat &&
        position.lat <= bounds.north + padLat &&
        position.lng >= bounds.west - padLng &&
        position.lng <= bounds.east + padLng
      )
    })
  }, [markerItems, bounds, selected?.id])

  const searchPath =
    debouncedQuery.trim().length >= 2
      ? `/api/search?q=${encodeURIComponent(debouncedQuery.trim())}&external=1${
          location ? `&near=${location.lat},${location.lng}` : ''
        }`
      : null
  const { data: results, isLoading: searching } = useApi<SearchResults>(searchPath)

  const activeFilters = amenities.length + (type === 'all' ? 0 : 1)
  const fitKey =
    debouncedQuery.trim() || activeFilters > 0 ? `${debouncedQuery}|${type}|${amenities.join(',')}` : null

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setNotice('This browser cannot share your location.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude }
        setLocation(point)
        setCamera({ ...point, zoom: 13 })
        setLocating(false)
      },
      () => {
        setLocating(false)
        setNotice('Location is off. Turn it on in your browser to see what is nearby.')
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [])

  const toggleSave = useCallback(
    async (place: PlaceSummary) => {
      setSavingId(place.id)
      const next = !place.saved
      setSelected((current) => (current?.id === place.id ? { ...current, saved: next } : current))
      try {
        await api(`/api/places/${place.id}/save`, { method: next ? 'PUT' : 'DELETE' })
        await mutate()
      } catch (error) {
        setSelected((current) => (current?.id === place.id ? { ...current, saved: !next } : current))
        setNotice(errorMessage(error))
      } finally {
        setSavingId(null)
      }
    },
    [mutate],
  )

  const selectPlace = useCallback((place: PlaceSummary) => {
    setSelected(place)
    setSearchOpen(false)
    setCamera({ lat: place.lat, lng: place.lng, zoom: 15 })
  }, [])

  const addExternal = useCallback(
    async (external: ExternalPlace) => {
      try {
        const result = await api<{ id: string; existing: boolean }>('/api/places', {
          method: 'POST',
          body: JSON.stringify({
            name: external.name,
            description: '',
            type: 'other',
            lat: external.lat,
            lng: external.lng,
            address: external.address,
            googlePlaceId: external.googlePlaceId,
            amenities: [],
          }),
        })
        await mutate()
        setNotice(result.existing ? 'That spot is already on the map.' : `${external.name} added to the map.`)
        setQuery('')
        setSearchOpen(false)
      } catch (error) {
        setNotice(errorMessage(error))
      }
    },
    [mutate],
  )

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4200)
    return () => clearTimeout(timer)
  }, [notice])

  return (
    <APIProvider apiKey={apiKey} libraries={['marker']}>
      <div className="relative h-dvh w-full overflow-hidden">
        <GoogleMap
          mapId={mapId}
          defaultCenter={HOME_CENTER}
          defaultZoom={HOME_ZOOM}
          mapTypeId={satellite ? 'hybrid' : 'roadmap'}
          disableDefaultUI
          gestureHandling="greedy"
          clickableIcons={false}
          styles={mapId ? undefined : LIGHT_MAP_STYLE}
          onCameraChanged={(event) => {
            centerRef.current = event.detail.center
            const nextTier = getZoomTier(event.detail.zoom)
            setZoomTier((current) => (current === nextTier ? current : nextTier))
          }}
          onIdle={(event) => {
            const next = event.map.getBounds()
            if (!next) return
            const ne = next.getNorthEast()
            const sw = next.getSouthWest()
            const box = { north: ne.lat(), east: ne.lng(), south: sw.lat(), west: sw.lng() }
            setBounds((current) =>
              Math.abs(current.north - box.north) < 0.0008 &&
              Math.abs(current.south - box.south) < 0.0008 &&
              Math.abs(current.east - box.east) < 0.0008 &&
              Math.abs(current.west - box.west) < 0.0008
                ? current
                : box,
            )
          }}
          onClick={() => setSelected(null)}
          className={cn('map-canvas absolute inset-0', satellite && 'satellite')}
        >
          <PlacePins items={visibleItems} selectedId={selected?.id ?? null} onSelect={selectPlace} zoomTier={zoomTier} />
          <MapCamera target={camera} />
          <FitToPlaces places={places} fitKey={fitKey} />
        </GoogleMap>
        {!satellite && <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#f6efe2]/20" />}

        {/* Top controls */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 px-3 pt-[max(env(safe-area-inset-top),0.75rem)] md:px-6 md:pt-6">
          <div className="pointer-events-auto flex w-full min-w-0 flex-col gap-2 md:w-[min(500px,40vw)]">
            <div className="glass glass-strong flex h-14 items-center gap-2.5 rounded-full pl-4 pr-2">
              <Link href="/" className="hidden shrink-0 items-center xl:flex" aria-label={`${BRAND.name} home`}>
                <Image
                  src="/images/outly-wordmark.png"
                  alt={BRAND.name}
                  width={1014}
                  height={421}
                  className="h-7 w-auto"
                />
              </Link>
              <span aria-hidden className="hidden h-6 w-px shrink-0 bg-border xl:block" />
              <Search className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search parks, green spaces, gatherings…"
                aria-label="Search places, events and groups"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setSearchOpen(false)
                  }}
                  aria-label="Clear search"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              ) : (
                <Link
                  href="/guide"
                  aria-label="Talk to the guide"
                  className="glass-press flex size-9 shrink-0 items-center justify-center rounded-full text-primary hover:bg-accent/50"
                >
                  <Mic className="size-[18px]" aria-hidden />
                </Link>
              )}
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                aria-label={activeFilters ? `Filters, ${activeFilters} active` : 'Filters'}
                className={cn(
                  'glass-press relative flex size-10 shrink-0 items-center justify-center rounded-full transition-colors',
                  activeFilters ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground/75 hover:text-primary',
                )}
              >
                <SlidersHorizontal className="size-[18px]" aria-hidden />
                {activeFilters > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-tertiary text-[10px] font-bold text-white">
                    {activeFilters}
                  </span>
                )}
              </button>
            </div>

            <div className="no-scrollbar -mx-3 flex items-center gap-1.5 overflow-x-auto px-3 pb-1 md:mx-0 md:px-0">
              <button
                type="button"
                onClick={() => setType('all')}
                aria-pressed={type === 'all'}
                className={cn(
                  'glass-press shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold shadow-sm',
                  type === 'all'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground/80 hover:border-primary/50',
                )}
              >
                All spots
              </button>

              {meta.types.map((entry) => {
                const info = PLACE_TYPE_META[entry.type]
                const active = type === entry.type
                return (
                  <button
                    key={entry.type}
                    type="button"
                    onClick={() => setType(active ? 'all' : entry.type)}
                    aria-pressed={active}
                    className={cn(
                      'glass-press flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold shadow-sm',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-foreground/80 hover:border-primary/50',
                    )}
                  >
                    <PlaceTypeIcon
                      type={entry.type}
                      className="size-3.5"
                      style={active ? undefined : { color: TINT_HEX[info.tint] }}
                    />
                    {info.plural}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pointer-events-auto hidden shrink-0 items-center gap-2 md:flex">
            <nav aria-label="Main" className="glass glass-strong flex items-center gap-0.5 rounded-full p-1.5">
              {MAP_NAV.map((item) => {
                const active = item.href === '/map'
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    title={item.label}
                    className={cn(
                      'flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors lg:px-4',
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <item.icon className="size-[18px] lg:hidden" aria-hidden />
                    <span className="sr-only lg:not-sr-only">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="glass glass-strong flex items-center gap-1 rounded-full p-1.5">
              <Link
                href="/chat"
                aria-label="Group chat"
                className="flex size-10 items-center justify-center rounded-full text-foreground/75 transition-colors hover:bg-muted hover:text-primary"
              >
                <MessageCircle className="size-[18px]" aria-hidden />
              </Link>
              {status === 'authenticated' ? (
                <Link
                  href="/profile"
                  aria-label="Your profile"
                  className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  <UserRound className="size-[18px]" aria-hidden />
                </Link>
              ) : (
                <Link
                  href="/sign-in"
                  className="flex h-10 items-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Bottom-right map controls */}
        <div
          className={cn(
            'absolute bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-3 z-20 flex-col items-end gap-2 md:bottom-6 md:right-6',
            selected ? 'hidden md:flex' : 'flex',
          )}
        >
          <div className="glass glass-strong flex items-center gap-0.5 rounded-full p-1" role="group" aria-label="Map style">
            {[
              { label: 'Map', value: false },
              { label: 'Satellite', value: true },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setSatellite(option.value)}
                aria-pressed={satellite === option.value}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                  satellite === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <span
              role="status"
              className="glass glass-strong flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold text-foreground"
            >
              <span aria-hidden className="size-2 rounded-full bg-primary" />
              {isLoading ? 'Loading spots…' : `${places.length.toLocaleString()} ${places.length === 1 ? 'spot' : 'spots'}`}
              <span className="hidden font-normal text-tertiary sm:inline">
                {location ? 'near you' : 'across LA County'}
              </span>
            </span>

            <div className="glass glass-strong flex flex-col overflow-hidden rounded-2xl">
              <ZoomButtons />
              <span aria-hidden className="mx-2.5 h-px bg-border" />
              <button
                type="button"
                onClick={locate}
                aria-label="Show my location"
                className="glass-press flex size-11 items-center justify-center text-primary"
              >
                {locating ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Locate className="size-5" aria-hidden />}
              </button>
              <span aria-hidden className="mx-2.5 h-px bg-border" />
              <button
                type="button"
                onClick={() => setAdding(true)}
                aria-label="Add a place"
                className="glass-press flex size-11 items-center justify-center text-foreground/80 hover:text-primary"
              >
                <MapPin className="size-5" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {selected && (
          <PlaceSheet
            place={selected}
            onClose={() => setSelected(null)}
            onToggleSave={toggleSave}
            saving={savingId === selected.id}
          />
        )}

        {searchOpen && debouncedQuery.trim().length >= 2 && (
          <SearchPanel
            results={results}
            loading={searching}
            onSelectPlace={selectPlace}
            onAddExternal={addExternal}
            onClose={() => setSearchOpen(false)}
          />
        )}

        {filtersOpen && (
          <FilterPanel
            amenities={meta.amenities}
            selected={amenities}
            onToggle={(slug) =>
              setAmenities((current) =>
                current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
              )
            }
            onClear={() => {
              setAmenities([])
              setType('all')
            }}
            onClose={() => setFiltersOpen(false)}
          />
        )}

        {adding && (
          <AddPlacePanel
            center={centerRef.current}
            onClose={() => setAdding(false)}
            onAdded={async (name) => {
              setAdding(false)
              await mutate().catch(() => {})
              setNotice(`${name} added to the map.`)
            }}
          />
        )}

        {notice && (
          <div
            role="status"
            className="glass glass-strong animate-rise absolute inset-x-0 top-[calc(env(safe-area-inset-top)+7.5rem)] z-50 mx-auto w-fit max-w-[90%] rounded-full px-4 py-2 text-[13px] font-medium"
          >
            {notice}
          </div>
        )}
      </div>
    </APIProvider>
  )
}

function SearchPanel({
  results,
  loading,
  onSelectPlace,
  onAddExternal,
  onClose,
}: {
  results: SearchResults | undefined
  loading: boolean
  onSelectPlace: (place: PlaceSummary) => void
  onAddExternal: (place: ExternalPlace) => void
  onClose: () => void
}) {
  const empty =
    !loading &&
    results &&
    !results.places.length &&
    !results.events.length &&
    !results.communities.length &&
    !results.external.length

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-black/10 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="glass glass-strong animate-sheet-in mx-auto mt-[calc(env(safe-area-inset-top)+4.5rem)] w-[calc(100%-1.5rem)] max-w-[520px] overflow-hidden rounded-3xl md:ml-6 md:mt-[5.5rem] md:w-[min(500px,40vw)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="max-h-[62vh] overflow-y-auto overscroll-contain p-2">
          {loading && (
            <p className="flex items-center gap-2 px-3 py-4 text-[13px] text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Searching…
            </p>
          )}

          {empty && (
            <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
              Nothing matched. Try a neighborhood, a vibe, or a type of place.
            </p>
          )}

          {results?.places.length ? (
            <Section title="Places">
              {results.places.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => onSelectPlace(place)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-foreground/[0.06]"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: TINT_HEX[PLACE_TYPE_META[place.type].tint] }}
                  >
                    <PlaceTypeIcon type={place.type} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{place.name}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {PLACE_TYPE_META[place.type].label}
                      {place.area ? ` · ${place.area}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </Section>
          ) : null}

          {results?.events.length ? (
            <Section title="Events">
              {results.events.map((event) => (
                <Link
                  key={event.id}
                  href="/events"
                  className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-foreground/[0.06]"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <CalendarDays className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{event.title}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {formatDateTime(event.startsAt)}
                      {event.place ? ` · ${event.place.name}` : ''}
                    </span>
                  </span>
                </Link>
              ))}
            </Section>
          ) : null}

          {results?.communities.length ? (
            <Section title="Groups">
              {results.communities.map((community) => (
                <Link
                  key={community.id}
                  href={`/communities/${community.slug}`}
                  className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-foreground/[0.06]"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: TINT_HEX[community.tint as keyof typeof TINT_HEX] ?? '#8E8E93' }}
                  >
                    <Users className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{community.name}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {community.memberCount} members
                    </span>
                  </span>
                </Link>
              ))}
            </Section>
          ) : null}

          {results?.external.length ? (
            <Section title="Not on the map yet">
              {results.external.map((place) => (
                <button
                  key={place.googlePlaceId}
                  type="button"
                  onClick={() => onAddExternal(place)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-foreground/[0.06]"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.08] text-muted-foreground">
                    <MapPin className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{place.name}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{place.address}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-primary/12 px-2.5 py-1 text-[11.5px] font-semibold text-primary">
                    Add
                  </span>
                </button>
              ))}
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

function FilterPanel({
  amenities,
  selected,
  onToggle,
  onClear,
  onClose,
}: {
  amenities: Meta['amenities']
  selected: string[]
  onToggle: (slug: string) => void
  onClear: () => void
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/20 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="glass glass-strong animate-sheet-in w-full max-w-[460px] rounded-t-[30px] px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-3 sm:mb-24 sm:rounded-[30px] sm:pb-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-foreground/20" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold tracking-tight">What do you need?</h2>
          <button type="button" onClick={onClear} className="text-[13px] font-medium text-primary">
            Clear
          </button>
        </div>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">Places must have everything you pick.</p>

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {amenities.map((amenity) => {
            const active = selected.includes(amenity.slug)
            return (
              <li key={amenity.slug}>
                <button
                  type="button"
                  onClick={() => onToggle(amenity.slug)}
                  aria-pressed={active}
                  className={cn(
                    'glass-press flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors',
                    active ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06] text-foreground/80',
                  )}
                >
                  {active && <Check className="size-3.5" aria-hidden />}
                  {amenity.label}
                  <span className={cn('text-[11px]', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {amenity.count}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-11 w-full rounded-2xl bg-primary text-[14px] font-semibold text-primary-foreground"
        >
          Show {selected.length ? 'matching' : 'all'} spots
        </button>
      </div>
    </div>
  )
}

function AddPlacePanel({
  center,
  onClose,
  onAdded,
}: {
  center: LatLng
  onClose: () => void
  onAdded: (name: string) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<PlaceType>('park')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api('/api/places', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          type,
          lat: center.lat,
          lng: center.lng,
          amenities: [],
        }),
      })
      onAdded(name)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/20 backdrop-blur-[2px]" onClick={onClose}>
      <form
        onSubmit={submit}
        className="glass glass-strong animate-sheet-in w-full max-w-[460px] rounded-t-[30px] px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-3 sm:mb-24 sm:rounded-[30px] sm:pb-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-foreground/20" aria-hidden />
        <h2 className="text-[17px] font-semibold tracking-tight">Add a spot</h2>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          It drops at the center of the map. Pan first to place it.
        </p>

        <label className="mt-3 block text-[12px] font-medium text-muted-foreground" htmlFor="place-name">
          Name
        </label>
        <input
          id="place-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          placeholder="Sunken City overlook"
          className="mt-1 h-11 w-full rounded-2xl bg-foreground/[0.06] px-3.5 text-[14px] outline-none focus:ring-2 focus:ring-primary/40"
        />

        <label className="mt-3 block text-[12px] font-medium text-muted-foreground" htmlFor="place-type">
          Type
        </label>
        <select
          id="place-type"
          value={type}
          onChange={(event) => setType(event.target.value as PlaceType)}
          className="mt-1 h-11 w-full rounded-2xl bg-foreground/[0.06] px-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/40"
        >
          {PLACE_TYPES.map((value) => (
            <option key={value} value={value}>
              {PLACE_TYPE_META[value].label}
            </option>
          ))}
        </select>

        <label className="mt-3 block text-[12px] font-medium text-muted-foreground" htmlFor="place-notes">
          Why it is good for a meetup
        </label>
        <textarea
          id="place-notes"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Shaded benches, quiet on weekday mornings, five minutes from the Metro."
          className="mt-1 w-full resize-none rounded-2xl bg-foreground/[0.06] px-3.5 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-primary/40"
        />

        {error && (
          <p role="alert" className="mt-2 text-[12.5px] text-destructive">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-2xl bg-foreground/[0.06] text-[14px] font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-[14px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Add spot
          </button>
        </div>
      </form>
    </div>
  )
}
