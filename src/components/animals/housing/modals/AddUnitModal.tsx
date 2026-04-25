'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { HousingUnit, HousingBuilding } from '@/types/housing'
import { Input } from '@/components/ui/Input'

interface AddUnitModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (unit: HousingUnit) => void
  selectedBuildingId: string | null
  buildings: HousingBuilding[]
  farmId: string
}

export function AddUnitModal({
  isOpen,
  onClose,
  onAdd,
  selectedBuildingId,
  buildings,
  farmId,
}: AddUnitModalProps) {
  const [unitName, setUnitName] = useState('')
  const [unitType, setUnitType] = useState<string>('section')
  const [capacity, setCapacity] = useState('')
  const [ventilation, setVentilation] = useState('good')
  const [lighting, setLighting] = useState('automated')
  const [waterAccess, setWaterAccess] = useState('yes')
  const [bedding, setBedding] = useState('rubber mats')
  const [drainage, setDrainage] = useState('good')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [buildingSelect, setBuildingSelect] = useState<string>(selectedBuildingId || '')

  const selectedBuilding = buildings.find(b => b.id === buildingSelect)

  if (!isOpen) return null

  const validateForm = () => {
    if (!unitName.trim()) return 'Unit name is required'
    if (!buildingSelect) return 'Building selection is required'
    if (!capacity || parseInt(capacity) <= 0) return 'Valid capacity is required'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/housing/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building_id: buildingSelect,
          name: unitName,
          unit_type: unitType,
          total_capacity: parseInt(capacity),
          environmental_conditions: {
            ventilation_quality: ventilation,
            lighting_type: lighting,
            water_access: waterAccess === 'yes',
            bedding_type: bedding,
            drainage,
          },
        }),
      })

      const result = await res.json()
      console.log('Unit creation response:', result, 'Status:', res.status)
      
      if (!res.ok) {
        throw new Error(result.error || `API Error: ${res.status}`)
      }

      if (!result.data) {
        throw new Error('No unit data returned from server')
      }

      console.log('Unit created successfully:', result.data)
      onAdd(result.data as HousingUnit)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create unit. Please try again.'
      console.error('Error creating unit:', errorMsg, err)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center lg:p-4 z-50">
      <div className="w-full lg:max-w-2xl bg-white rounded-t-2xl lg:rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add New Unit</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 lg:p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Building Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Building *</label>
            <Select value={buildingSelect} onValueChange={setBuildingSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a building">
                  {buildingSelect && selectedBuilding ? (
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4" />
                      <span>{selectedBuilding.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Select a building</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {buildings.map(building => (
                  <SelectItem key={building.id} value={building.id}>
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4" />
                      <span>{building.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBuilding && (
              <p className="text-xs text-gray-600">
                Location: {selectedBuilding.location} • Capacity: {selectedBuilding.total_capacity} animals
              </p>
            )}
          </div>

          {/* Unit Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Unit Name *</label>
            <Input
              placeholder="e.g., Lactating Section, Dry Cow Area"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              required
            />
          </div>

          {/* Unit Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Unit Type *</label>
            <Select value={unitType} onValueChange={setUnitType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="section">Section</SelectItem>
                <SelectItem value="zone">Zone</SelectItem>
                <SelectItem value="block">Block</SelectItem>
                <SelectItem value="wing">Wing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Total Capacity (animals) *</label>
            <Input
              type="number"
              placeholder="e.g., 60"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />
          </div>

          {/* Environmental Conditions Section */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">Environmental Conditions</h3>

            {/* Ventilation */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Ventilation Quality</label>
              <Select value={ventilation} onValueChange={setVentilation}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Lighting */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Lighting Type</label>
              <Select value={lighting} onValueChange={setLighting}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automated">Automated</SelectItem>
                  <SelectItem value="supplemental">Supplemental</SelectItem>
                  <SelectItem value="natural">Natural</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Water Access */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Water Access</label>
              <Select value={waterAccess} onValueChange={setWaterAccess}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bedding Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Bedding Type</label>
              <Select value={bedding} onValueChange={setBedding}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rubber mats">Rubber Mats</SelectItem>
                  <SelectItem value="straw">Straw</SelectItem>
                  <SelectItem value="sand">Sand</SelectItem>
                  <SelectItem value="sawdust">Sawdust</SelectItem>
                  <SelectItem value="concrete">Concrete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Drainage */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Drainage</label>
              <Select value={drainage} onValueChange={setDrainage}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Preview */}
          {unitName && capacity && (
            <Card className="bg-blue-50 border-blue-200 p-3">
              <p className="text-xs text-blue-800 font-medium">Unit Summary</p>
              <div className="mt-2 space-y-1 text-xs text-blue-700">
                <p>
                  <strong>{unitName}</strong> ({unitType})
                </p>
                <p>Capacity: {capacity} animals</p>
                {selectedBuilding && <p>Building: {selectedBuilding.name}</p>}
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !buildingSelect}
            >
              {loading ? 'Creating...' : 'Create Unit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
