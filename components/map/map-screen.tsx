'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { APIProvider, AdvancedMarker, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps'
import {
  CalendarDays,
  Check,
  Loader2,
  Locate,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { LA_CENTER, PLACE_TYPES, PLACE_TYPE_META, TINT_HEX, type PlaceType } from '@/lib/constants'
import { api, errorMessage, useApi } from '@/lib/client'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { PlaceTypeIcon } from '@/components/place/place-type-icon'
import { PlaceSheet } from '@/components/map/place-sheet'
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from '@/components/map/map-style'
import type { ExternalPlace, Meta, PlaceSummary, SearchResults } from '@/lib/types'

type LatLng = { lat: number; lng: number }

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
    if (target.zoom) map.setZoom(target.zoom)
  }, [map, target])
  return null
}

function FitToPlaces({ places }: { places: PlaceSummary[] }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (!map || fitted.current || places.length < 2) return
    const bounds = new google.maps.LatLngBounds()
    for (const place of places) bounds.extend({ lat: place.lat, lng: place.lng })
    map.fitBounds(bounds, 72)
    fitted.current = true
  }, [map, places])
  return null
}

/**
 * Pins scale with the zoom level: at county scale they are small dots so the
 * map reads as a density of places, and they become full category pins once
 * the user is close enough for them to be individually useful.
 */
function PlacePins({
  places,
  selectedId,
  onSelect,
  compact,
}: {
  places: PlaceSummary[]
  selectedId: string | null
  onSelect: (place: PlaceSummary) => void
  compact: boolean
}) {
  return (
    <>
      {places.map((place) => {
        const tint = TINT_HEX[PLACE_TYPE_META[place.type].tint]
        const active = selectedId === place.id

        if (compact && !active) {
          return (
            <AdvancedMarker
              key={place.id}
              position={{ lat: place.lat, lng: place.lng }}
              onClick={() => onSelect(place)}
            >
              <div
                className="size-3 rounded-full border-[1.5px] border-white shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
                style={{ backgroundColor: tint }}
              />
            </AdvancedMarker>
          )
        }

        return (
          <AdvancedMarker
            key={place.id}
            position={{ lat: place.lat, lng: place.lng }}
            onClick={() => onSelect(place)}
            zIndex={active ? 10 : 1}
          >
            <div
              className={cn(
                'relative flex items-center justify-center rounded-full border-2 border-white text-white shadow-[0_6px_16px_-4px_rgba(0,0,0,0.45)] transition-transform duration-200',
                active ? 'size-11 scale-105' : 'size-8',
              )}
              style={{ backgroundColor: tint }}
            >
              <PlaceTypeIcon type={place.type} className={active ? 'size-5' : 'size-4'} />
              <span
                aria-hidden
                className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 rounded-[2px] border-b-2 border-r-2 border-white"
                style={{ backgroundColor: tint }}
              />
            </div>
          </AdvancedMarker>
        )
      })}
    </>
  )
}

export function MapScreen({ apiKey, mapId, meta }: { apiKey: string; mapId?: string; meta: Meta }) {
  const dark = useColorScheme()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query)
  const [type, setType] = useState<PlaceType | 'all'>('all')
  const [amenities, setAmenities] = useState<string[]>([])
  const [selected, setSelected] = useState<PlaceSummary | null>(null)
  const [camera, setCamera] = useState<(LatLng & { zoom?: number }) | null>(null)
  const [location, setLocation] = useState<LatLng | null>(null)
  const [locating, setLocating] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [center, setCenter] = useState<LatLng>(LA_CENTER)
  const [zoom, setZoom] = useState(10)
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

  const searchPath =
    debouncedQuery.trim().length >= 2
      ? `/api/search?q=${encodeURIComponent(debouncedQuery.trim())}&external=1${
          location ? `&near=${location.lat},${location.lng}` : ''
        }`
      : null
  const { data: results, isLoading: searching } = useApi<SearchResults>(searchPath)

  const activeFilters = amenities.length + (type === 'all' ? 0 : 1)

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
          defaultCenter={LA_CENTER}
          defaultZoom={10}
          disableDefaultUI
          gestureHandling="greedy"
          clickableIcons={false}
          styles={dark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
          onCameraChanged={(event) => {
            setCenter(event.detail.center)
            setZoom(event.detail.zoom)
          }}
          onClick={() => setSelected(null)}
          className="map-canvas absolute inset-0"
        >
          <PlacePins
            places={places}
            selectedId={selected?.id ?? null}
            onSelect={selectPlace}
            compact={zoom < 11}
          />
          <MapCamera target={camera} />
          <FitToPlaces places={places} />
        </GoogleMap>

        {/* Top controls */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-2 px-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
          <div className="pointer-events-auto mx-auto w-full max-w-[520px]">
            <div className="glass glass-strong flex items-center gap-2 rounded-full px-3.5 py-2.5">
              <Search className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search places, events, groups"
                aria-label="Search places, events and groups"
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setSearchOpen(false)
                  }}
                  aria-label="Clear search"
                  className="flex size-6 items-center justify-center rounded-full bg-foreground/10 text-muted-foreground"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              ) : (
                <Link
                  href="/guide"
                  aria-label="Ask the guide"
                  className="flex size-7 items-center justify-center rounded-full bg-primary/12 text-primary"
                >
                  <Sparkles className="size-4" aria-hidden />
                </Link>
              )}
            </div>

            <div className="no-scrollbar mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className={cn(
                  'glass glass-press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold',
                  activeFilters ? 'text-primary' : 'text-foreground/80',
                )}
              >
                <SlidersHorizontal className="size-3.5" aria-hidden />
                Filters
                {activeFilters > 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {activeFilters}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setType('all')}
                aria-pressed={type === 'all'}
                className={cn(
                  'glass glass-press shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold',
                  type === 'all' ? 'bg-primary text-primary-foreground' : 'text-foreground/80',
                )}
              >
                All
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
                      'glass glass-press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold',
                      active ? 'text-white' : 'text-foreground/80',
                    )}
                    style={active ? { backgroundColor: TINT_HEX[info.tint] } : undefined}
                  >
                    <PlaceTypeIcon type={entry.type} className="size-3.5" />
                    {info.plural}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right-side map controls */}
        <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
          <button
            type="button"
            onClick={locate}
            aria-label="Show my location"
            className="glass glass-press flex size-11 items-center justify-center rounded-full text-primary"
          >
            {locating ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Locate className="size-5" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-label="Add a place"
            className="glass glass-press flex size-11 items-center justify-center rounded-full text-foreground/80"
          >
            <Plus className="size-5" aria-hidden />
          </button>
        </div>

        {/* Result count */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-20 flex justify-center">
          {!selected && (
            <span className="glass glass-thin rounded-full px-3 py-1.5 text-[12px] font-medium text-foreground/70">
              {isLoading ? 'Loading spots…' : `${places.length} ${places.length === 1 ? 'spot' : 'spots'}`}
              {location ? ' near you' : ' across LA County'}
            </span>
          )}
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
            center={center}
            onClose={() => setAdding(false)}
            onAdded={async (name) => {
              setAdding(false)
              await mutate()
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
        className="glass glass-strong animate-sheet-in mx-auto mt-[calc(env(safe-area-inset-top)+4.75rem)] w-[calc(100%-1.5rem)] max-w-[520px] overflow-hidden rounded-[26px]"
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
