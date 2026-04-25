'use client'

import { useState } from 'react'
import { X, AlertCircle, MapPin, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { HousingBuilding } from '@/types/housing'

interface AddBuildingModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (building: HousingBuilding) => void
}

export function AddBuildingModal({
  isOpen,
  onClose,
  onAdd,
}: AddBuildingModalProps) {
  const [buildingName, setBuildingName] = useState<string>('')
  const [buildingType, setBuildingType] = useState<string>('dairy_barn')
  const [capacity, setCapacity] = useState<string>('')
  const [location, setLocation] = useState<string>('')
  const [yearBuilt, setYearBuilt] = useState<string>(new Date().getFullYear().toString())
  const [status, setStatus] = useState<'active' | 'inactive' | 'maintenance'>('active')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const buildingTypes = [
    { value: 'cow_barn', label: 'Cow Barn' },
    { value: 'calf_barn', label: 'Calf Barn' },
    { value: 'cow_field', label: 'Cow Field' },
    { value: 'milking_parlor', label: 'Milking Parlor' }
  ]

  const handleAdd = async () => {
  if (!buildingName || !capacity ) {
    setError('Please fill in all required fields')
    return
  }

  setLoading(true)
  setError('')

  try {
    const response = await fetch('/api/housing/buildings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: buildingName,
        type: buildingType,
        total_capacity: capacity,
        location: location,
        year_built: yearBuilt,
        status: status,
        notes: notes
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to add building')
    }

    // Pass the saved building from DB back to the parent component
    onAdd(result.data)

    // Reset and Close
    setBuildingName('')
    setCapacity('')
    setLocation('')
    onClose()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to add building')
  } finally {
    setLoading(false)
  }
}

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center lg:p-4 z-50">
      <div className="w-full lg:max-w-2xl bg-white rounded-t-2xl lg:rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add New Building</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-6 space-y-6">
          {error && (
            <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Building Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Building Name *
            </label>
            <input
              type="text"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              placeholder="e.g., Main Dairy Barn"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Building Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Building Type *
            </label>
            <Select value={buildingType} onValueChange={setBuildingType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {buildingTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Capacity & Location */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Total Capacity (animals) *
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g., 120"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>Location </span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., North Field"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Year Built & Status */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Year Built</span>
              </label>
              <input
                type="number"
                value={yearBuilt}
                onChange={(e) => setYearBuilt(e.target.value)}
                placeholder={new Date().getFullYear().toString()}
                min="1900"
                max={new Date().getFullYear()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Status
              </label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information about this building..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
            <p className="text-sm font-medium text-gray-900">Building Summary</p>
            <div className="text-sm text-gray-700 space-y-1">
              {buildingName && (
                <p>Name: <span className="font-medium">{buildingName}</span></p>
              )}
              <p>Type: <span className="font-medium">{buildingTypes.find(t => t.value === buildingType)?.label}</span></p>
              {capacity && (
                <p>Capacity: <span className="font-medium">{capacity} animals</span></p>
              )}
              {location && (
                <p>Location: <span className="font-medium">{location}</span></p>
              )}
              <p>Status: <span className="font-medium capitalize">{status}</span></p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!buildingName || !capacity || !location || loading}
              className="flex-1"
            >
              {loading ? 'Adding...' : 'Add Building'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
