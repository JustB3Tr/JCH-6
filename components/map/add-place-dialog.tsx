'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { AmenityLite, PlaceLite } from '@/lib/types'

const placeTypes = ['park', 'plaza', 'cafe', 'trail', 'other'] as const

export function AddPlaceDialog({
  amenities,
  onCreated,
}: {
  amenities: AmenityLite[]
  onCreated?: (place: PlaceLite) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<(typeof placeTypes)[number]>('park')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const latNum = Number(lat)
    const lngNum = Number(lng)
    if (!name.trim() || Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      setError('Name and valid latitude/longitude are required.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          address: address.trim() || null,
          lat: latNum,
          lng: lngNum,
          description: description.trim(),
          amenitySlugs: selected,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Could not save the place.')
      }
      const data = (await res.json()) as { place: PlaceLite & { amenities: AmenityLite[] } }
      onCreated?.({ ...data.place, amenities: data.place.amenities ?? [], feedbackCount: 0, avgRating: null })
      setOpen(false)
      setName('')
      setAddress('')
      setLat('')
      setLng('')
      setDescription('')
      setSelected([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="icon" aria-label="Add a place" className="rounded-full shadow-md"><Plus className="size-4" aria-hidden /></Button>} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Suggest a hangout spot</DialogTitle>
          <DialogDescription>
            Share a park, plaza, cafe or trail others can meet at. Tip: right-click the map in Google Maps to copy
            coordinates.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="place-name">Name</Label>
            <Input id="place-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="place-type">Type</Label>
              <select
                id="place-type"
                value={type}
                onChange={(e) => setType(e.target.value as (typeof placeTypes)[number])}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {placeTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="place-address">Address (optional)</Label>
              <Input id="place-address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="place-lat">Latitude</Label>
              <Input id="place-lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="34.1908" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="place-lng">Longitude</Label>
              <Input id="place-lng" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-118.2481" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="place-description">Description</Label>
            <Textarea id="place-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Amenities</legend>
            <div className="flex flex-wrap gap-1.5">
              {amenities.map((a) => {
                const active = selected.includes(a.slug)
                return (
                  <button
                    key={a.slug}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected((prev) => (active ? prev.filter((s) => s !== a.slug) : [...prev, a.slug]))}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {a.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Save place
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
