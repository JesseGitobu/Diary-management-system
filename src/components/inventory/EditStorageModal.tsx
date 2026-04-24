'use client'
// src/components/inventory/EditStorageModal.tsx

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// ── Validation schema (mirrors AddStorageModal) ───────────────────────────────
const storageSchema = z.object({
  name:                    z.string().min(1, 'Storage location name is required'),
  type:                    z.string().min(1, 'Storage type is required'),
  status:                  z.string().min(1, 'Status is required'),
  location:                z.string().optional(),
  building:                z.string().optional(),
  floor_level:             z.string().optional(),
  capacity:                z.string().optional(),
  capacity_unit:           z.string().optional(),
  temperature_controlled:  z.boolean().optional(),
  min_temperature:         z.number().optional(),
  max_temperature:         z.number().optional(),
  humidity_controlled:     z.boolean().optional(),
  min_humidity:            z.number().optional(),
  max_humidity:            z.number().optional(),
  restricted_access:       z.boolean().optional(),
  requires_authorization:  z.boolean().optional(),
  description:             z.string().optional(),
  notes:                   z.string().optional(),
})

type StorageFormData = z.infer<typeof storageSchema>

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_TYPES = [
  { value: 'feedstore',         label: 'Feedstore / Feed Room' },
  { value: 'siloBunker',        label: 'Silage Bunker / Silage Pit' },
  { value: 'feedBunker',        label: 'Feed Bunker' },
  { value: 'forageStorage',     label: 'Forage & Hay Storage' },
  { value: 'silo',              label: 'Silo / Grain Storage' },
  { value: 'climateControlled', label: 'Climate Controlled Room' },
  { value: 'coldStorage',       label: 'Cold Storage / Refrigeration' },
  { value: 'dryStorage',        label: 'Dry Storage' },
  { value: 'quarantine',        label: 'Quarantine Area' },
  { value: 'medicineStore',     label: 'Medicine / Veterinary Store' },
  { value: 'equipmentStorage',  label: 'Equipment Storage' },
  { value: 'warehouseGeneral',  label: 'General Warehouse' },
  { value: 'other',             label: 'Other' },
]

const STORAGE_CATEGORIES = [
  { value: 'feed',         label: 'Feed & Forage' },
  { value: 'medical',      label: 'Medical & Veterinary' },
  { value: 'equipment',    label: 'Equipment' },
  { value: 'supplies',     label: 'Supplies' },
  { value: 'chemicals',    label: 'Chemicals' },
  { value: 'machines',     label: 'Machines & Mechanical Equipment' },
  { value: 'construction', label: 'Construction Materials' },
  { value: 'dairy',        label: 'Dairy Products' },
  { value: 'seeds',        label: 'Seeds' },
  { value: 'other',        label: 'Other' },
]

const CAPACITY_UNITS = [
  { value: 'kg',     label: 'Kilograms (kg)' },
  { value: 'tons',   label: 'Metric Tonnes' },
  { value: 'liters', label: 'Liters (L)' },
  { value: 'units',  label: 'Number of Units' },
  { value: 'sqft',   label: 'Square Feet (sqft)' },
  { value: 'sqm',    label: 'Square Meters (sqm)' },
]

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pt-2 pb-1">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface EditStorageModalProps {
  storage: any
  isOpen: boolean
  onClose: () => void
  onStorageUpdated: (updated: any) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export function EditStorageModal({ storage, isOpen, onClose, onStorageUpdated }: EditStorageModalProps) {
  const [loading, setLoading]                     = useState(false)
  const [error, setError]                         = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const form = useForm<StorageFormData>({
    resolver: zodResolver(storageSchema),
    defaultValues: {
      name:                    '',
      type:                    'dryStorage',
      status:                  'active',
      location:                '',
      building:                '',
      floor_level:             '',
      capacity:                '',
      capacity_unit:           'kg',
      temperature_controlled:  false,
      min_temperature:         undefined,
      max_temperature:         undefined,
      humidity_controlled:     false,
      min_humidity:            undefined,
      max_humidity:            undefined,
      restricted_access:       false,
      requires_authorization:  false,
      description:             '',
      notes:                   '',
    },
  })

  const watchTempControlled     = form.watch('temperature_controlled')
  const watchHumidityControlled = form.watch('humidity_controlled')

  // ── Populate form when storage changes ───────────────────────────────────
  useEffect(() => {
    if (!storage) return
    const typeKey = storage.storage_type ?? storage.type ?? 'dryStorage'
    form.reset({
      name:                    storage.name               ?? '',
      type:                    typeKey,
      status:                  storage.status             ?? 'active',
      location:                storage.location           ?? '',
      building:                storage.building           ?? '',
      floor_level:             storage.floor_level        ?? '',
      capacity:                storage.capacity != null   ? String(storage.capacity) : '',
      capacity_unit:           storage.capacity_unit      ?? 'kg',
      temperature_controlled:  storage.temperature_controlled ?? false,
      min_temperature:         storage.min_temperature    ?? undefined,
      max_temperature:         storage.max_temperature    ?? undefined,
      humidity_controlled:     storage.humidity_controlled ?? false,
      min_humidity:            storage.min_humidity       ?? undefined,
      max_humidity:            storage.max_humidity       ?? undefined,
      restricted_access:       storage.restricted_access  ?? false,
      requires_authorization:  storage.requires_authorization ?? false,
      description:             storage.description        ?? '',
      notes:                   storage.notes              ?? '',
    })
    setSelectedCategories(
      Array.isArray(storage.categories) ? storage.categories : []
    )
    setError(null)
  }, [storage, form])

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (data: StorageFormData) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/storage/${storage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:                   data.name,
          type:                   data.type,
          status:                 data.status,
          location:               data.location?.trim()  || null,
          building:               data.building?.trim()  || null,
          floor_level:            data.floor_level       || null,
          capacity:               data.capacity ? Number(data.capacity) : null,
          capacity_unit:          data.capacity_unit     || null,
          temperature_controlled: data.temperature_controlled  ?? false,
          min_temperature:        data.min_temperature   ?? null,
          max_temperature:        data.max_temperature   ?? null,
          humidity_controlled:    data.humidity_controlled    ?? false,
          min_humidity:           data.min_humidity      ?? null,
          max_humidity:           data.max_humidity      ?? null,
          restricted_access:      data.restricted_access ?? false,
          requires_authorization: data.requires_authorization ?? false,
          categories:             selectedCategories.length > 0 ? selectedCategories : null,
          description:            data.description?.trim() || null,
          notes:                  data.notes?.trim()       || null,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to update storage location')

      onStorageUpdated(result.storage)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const selectClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent'
  const textareaClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent'

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-8">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-900">Edit Storage Location</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Update the details for <strong>{storage?.name}</strong>.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">

          {/* ── 1. Basic Information ──────────────────────────────────── */}
          <div>
            <SectionHeader title="Basic Information" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="md:col-span-2">
                <Label htmlFor="edit-name">Storage Location Name *</Label>
                <Input
                  id="edit-name"
                  {...form.register('name')}
                  error={form.formState.errors.name?.message}
                  placeholder="e.g., Main Feedstore, Climate Room A"
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Storage Type *</Label>
                <select id="edit-type" {...form.register('type')} className={selectClass}>
                  {STORAGE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <select id="edit-status" {...form.register('status')} className={selectClass}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Under Maintenance</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* ── 2. Location Details ───────────────────────────────────── */}
          <div>
            <SectionHeader title="Location Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <Label htmlFor="edit-location">Location / Area</Label>
                <Input
                  id="edit-location"
                  {...form.register('location')}
                  placeholder="e.g., North Wing, South Field"
                />
              </div>
              <div>
                <Label htmlFor="edit-building">Building / Structure</Label>
                <Input
                  id="edit-building"
                  {...form.register('building')}
                  placeholder="e.g., Warehouse A, Barn 2"
                />
              </div>
              <div>
                <Label htmlFor="edit-floor_level">Floor Level</Label>
                <select id="edit-floor_level" {...form.register('floor_level')} className={selectClass}>
                  <option value="">— Select floor level —</option>
                  <option value="ground">Ground Floor</option>
                  <option value="basement">Basement</option>
                  <option value="floor1">First Floor</option>
                  <option value="floor2">Second Floor</option>
                  <option value="floor3">Third Floor</option>
                  <option value="outdoor">Outdoor</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* ── 3. Capacity ───────────────────────────────────────────── */}
          <div>
            <SectionHeader title="Capacity" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <Label htmlFor="edit-capacity">Storage Capacity</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register('capacity')}
                  placeholder="e.g., 5000"
                />
              </div>
              <div>
                <Label htmlFor="edit-capacity_unit">Capacity Unit</Label>
                <select id="edit-capacity_unit" {...form.register('capacity_unit')} className={selectClass}>
                  {CAPACITY_UNITS.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* ── 4. Environmental Conditions ───────────────────────────── */}
          <div>
            <SectionHeader title="Environmental Conditions" subtitle="Specify storage conditions if applicable" />
            <div className="mt-3 space-y-4">
              {/* Temperature */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('temperature_controlled')}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-900">Temperature Controlled</span>
                </label>
                {watchTempControlled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label htmlFor="edit-min_temperature">Min Temperature (°C)</Label>
                      <Input
                        id="edit-min_temperature"
                        type="number"
                        step="0.1"
                        {...form.register('min_temperature', { valueAsNumber: true })}
                        placeholder="e.g., 5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-max_temperature">Max Temperature (°C)</Label>
                      <Input
                        id="edit-max_temperature"
                        type="number"
                        step="0.1"
                        {...form.register('max_temperature', { valueAsNumber: true })}
                        placeholder="e.g., 15"
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Humidity */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('humidity_controlled')}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-900">Humidity Controlled</span>
                </label>
                {watchHumidityControlled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label htmlFor="edit-min_humidity">Min Humidity (%)</Label>
                      <Input
                        id="edit-min_humidity"
                        type="number"
                        min="0"
                        max="100"
                        {...form.register('min_humidity', { valueAsNumber: true })}
                        placeholder="e.g., 40"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-max_humidity">Max Humidity (%)</Label>
                      <Input
                        id="edit-max_humidity"
                        type="number"
                        min="0"
                        max="100"
                        {...form.register('max_humidity', { valueAsNumber: true })}
                        placeholder="e.g., 60"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* ── 5. Access & Security ──────────────────────────────────── */}
          <div>
            <SectionHeader title="Access & Security" />
            <div className="mt-3 space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...form.register('restricted_access')}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-900">Restricted Access Only</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...form.register('requires_authorization')}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-900">Requires Authorization</span>
              </label>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* ── 6. Item Categories ────────────────────────────────────── */}
          <div>
            <SectionHeader title="Item Categories" subtitle="Select which types of inventory this storage holds" />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {STORAGE_CATEGORIES.map(category => (
                <label key={category.value} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.value)}
                    onChange={() => toggleCategory(category.value)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-900">{category.label}</span>
                </label>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* ── 7. Notes & Description ────────────────────────────────── */}
          <div>
            <SectionHeader title="Notes & Description" />
            <div className="grid grid-cols-1 gap-4 mt-3">
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <textarea
                  id="edit-description"
                  {...form.register('description')}
                  rows={2}
                  className={textareaClass}
                  placeholder="Brief description of this storage location"
                />
              </div>
              <div>
                <Label htmlFor="edit-notes">Additional Notes</Label>
                <textarea
                  id="edit-notes"
                  {...form.register('notes')}
                  rows={2}
                  className={textareaClass}
                  placeholder="Special handling instructions, maintenance schedule, hazards, etc."
                />
              </div>
            </div>
          </div>

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 sticky bottom-0 bg-white pb-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
