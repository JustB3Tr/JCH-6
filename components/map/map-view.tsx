'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps'
import { Crosshair, Loader2, MapPin, Plus, Search, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AddPlaceDialog } from '@/components/map/add-place-dialog'
import type { AmenityLite, PlaceLite } from '@/lib/types'

type SearchResult = {
  id: string
  name: string
  address: string
  lat: number | null
  lng: number | null
}

const GLENDALE_CENTER = { lat: 34.1908, lng: -118.2481 }
const fetcher = (url: string) => fetch(url).then((r) => r.json())

function MapController({ target }: { target: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (map && target) {
      map.panTo({ lat: target.lat, lng: target.lng })
      if (target.zoom) map.setZoom(target.zoom)
    }
  }, [map, target])
  return null
}

export function MapView({ apiKey, amenities }: { apiKey: string; amenities: AmenityLite[] }) {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<PlaceLite | null>(null)
  const [activeAmenities, setActiveAmenities] = useState<string[]>(() =>
    searchParams.get('amenity') ? [searchParams.get('amenity')!] : [],
  )
  const [target, setTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const params = new URLSearchParams()
  if (query.trim()) params.set('q', query.trim())
  if (activeAmenities.length) params.set('amenities', activeAmenities.join(','))
  const { data, isLoading } = useSWR<{ places: PlaceLite[] }>(
    `/api/places?${params.toString()}`,
    fetcher,
    { keepPreviousData: true },
  )
  const places = data?.places ?? []

  // Debounced Google Places search for the search bar.
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`)
        const json = (await res.json()) as { results: SearchResult[] }
        setResults(json.results ?? [])
        setShowResults(true)
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  // Close the results dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function toggleAmenity(slug: string) {
    setActiveAmenities((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]))
  }

  function locateMe() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 15 })
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000 },
    )
  }

  const markers = useMemo(() => places, [places])

  return (
    <div className="relative h-[calc(100vh-3.5rem)] min-h-[480px] w-full md:h-[calc(100vh-3.5rem)]">
      <APIProvider apiKey={apiKey}>
        <GoogleMap
          defaultCenter={GLENDALE_CENTER}
          defaultZoom={13}
          mapId="hangout-map"
          disableDefaultUI
          zoomControl
          clickableIcons={false}
          className="h-full w-full"
        >
          <MapController target={target} />
          {markers.map((place) => (
            <AdvancedMarker
              key={place.id}
              position={{ lat: place.lat, lng: place.lng }}
              onClick={() => setSelectedPlace(place)}
            >
              <Pin
                background={selectedPlace?.id === place.id ? '#d97706' : '#1b4332'}
                borderColor="#ffffff"
                glyphColor="#ffffff"
                scale={selectedPlace?.id === place.id ? 1.2 : 1}
              />
            </AdvancedMarker>
          ))}
        </GoogleMap>
      </APIProvider>

      {/* Search bar */}
      <div ref={searchRef} className="absolute inset-x-3 top-3 z-10 md:inset-x-auto md:start-4 md:w-96">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setShowResults(true)}
            placeholder="Search places, parks, cafes..."
            className="rounded-full bg-card ps-9 shadow-md"
            aria-label="Search places"
          />
          {searching && (
            <Loader2 className="absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
          )}

          {showResults && results.length > 0 && (
            <ul className="absolute mt-2 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-start hover:bg-secondary"
                    onClick={() => {
                      if (r.lat != null && r.lng != null) setTarget({ lat: r.lat, lng: r.lng, zoom: 15 })
                      setShowResults(false)
                    }}
                  >
                    <span className="text-sm font-medium">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{r.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Amenity filters */}
        <div className="mt-2 flex max-w-full flex-wrap gap-1.5 md:max-w-96">
          {amenities.map((a) => {
            const active = activeAmenities.includes(a.slug)
            return (
              <button
                key={a.slug}
                type="button"
                aria-pressed={active}
                onClick={() => toggleAmenity(a.slug)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                }`}
              >
                {a.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right-side controls */}
      <div className="absolute end-3 top-3 z-10 flex flex-col gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Locate me"
          onClick={locateMe}
          className="rounded-full bg-card shadow-md"
        >
          {locating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Crosshair className="size-4" aria-hidden />}
        </Button>
        <AddPlaceDialog
          amenities={amenities}
          onCreated={(place) => {
            setTarget({ lat: place.lat, lng: place.lng, zoom: 15 })
            setSelectedPlace(place as PlaceLite)
          }}
        />
      </div>

      {/* Loading indicator */}
      {isLoading && !data && (
        <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center">
          <span className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm text-muted-foreground shadow-md">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading places...
          </span>
        </div>
      )}

      {/* Popup card on pin click */}
      {selectedPlace && (
        <div className="absolute inset-x-3 bottom-3 z-20 md:inset-x-auto md:start-4 md:bottom-4 md:w-96">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{selectedPlace.type}</Badge>
                  {selectedPlace.avgRating != null && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="size-3.5 fill-amber-500 text-amber-500" aria-hidden />
                      {selectedPlace.avgRating.toFixed(1)} ({selectedPlace.feedbackCount})
                    </span>
                  )}
                </div>
                <h2 className="mt-1.5 font-semibold">{selectedPlace.name}</h2>
                {selectedPlace.address && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{selectedPlace.address}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Close place card"
                onClick={() => setSelectedPlace(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              >
                ✕
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {selectedPlace.amenities.slice(0, 4).map((a) => (
                <Badge key={a.id} variant="outline" className="text-[11px]">
                  {a.label}
                </Badge>
              ))}
              {selectedPlace.amenities.length > 4 && (
                <Badge variant="outline" className="text-[11px]">
                  +{selectedPlace.amenities.length - 4} more
                </Badge>
              )}
            </div>

            <Link
              href={`/places/${selectedPlace.id}`}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <MapPin className="size-4" aria-hidden /> View place details
            </Link>
          </div>
        </div>
      )}

      {!apiKey && (
        <div className="absolute inset-x-0 top-24 z-10 flex justify-center px-4">
          <p className="rounded-full bg-card px-4 py-2 text-xs text-muted-foreground shadow-md">
            Map preview needs a Google Maps API key — add GOOGLE_MAPS_API_KEY to enable the live map.
          </p>
        </div>
      )}
    </div>
  )
}
