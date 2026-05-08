'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, Layers, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { HousingPen, HousingUnit, HousingBuilding, SpecialHousingType } from '@/types/housing'
import { Input } from '@/components/ui/Input'

interface CreatePenModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (pen: HousingPen) => void
  onUpdate?: (pen: HousingPen) => void
  onDelete?: (penId: string) => void
  selectedBuildingId: string | null
  selectedUnitId: string | null
  buildings: HousingBuilding[]
  units: HousingUnit[]
  farmId: string
  editingPen?: HousingPen | null
}

export function CreatePenModal({
  isOpen,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
  selectedBuildingId,
  selectedUnitId,
  buildings,
  units,
  farmId,
  editingPen,
}: CreatePenModalProps) {
  const isEditing = !!editingPen
  const [buildingSelect, setBuildingSelect] = useState(selectedBuildingId || '')
  const [unitSelect, setUnitSelect] = useState(selectedUnitId || '')
  const [penNumber, setPenNumber] = useState('')
  const [penType, setPenType] = useState<SpecialHousingType>('regular_housing')
  const [capacity, setCapacity] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [ventilation, setVentilation] = useState('good')
  const [lighting, setLighting] = useState('automated')
  const [waterAccess, setWaterAccess] = useState('yes')
  const [bedding, setBedding] = useState('rubber mats')
  const [drainage, setDrainage] = useState('good')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update useEffect to handle editing pre-population
  useEffect(() => {
    if (editingPen) {
      setBuildingSelect(editingPen.building_id)
      setUnitSelect(editingPen.unit_id)
      setPenNumber(editingPen.pen_number)
      setPenType(editingPen.special_type)
      setCapacity(editingPen.capacity?.toString() || '')
      if (editingPen.dimensions) {
        setLength(editingPen.dimensions.length_meters?.toString() || '')
        setWidth(editingPen.dimensions.width_meters?.toString() || '')
        setHeight(editingPen.dimensions.height_meters?.toString() || '')
      }
      if (editingPen.conditions) {
        setVentilation(editingPen.conditions.ventilation_quality || 'good')
        setLighting(editingPen.conditions.lighting_type || 'automated')
        setWaterAccess(editingPen.conditions.water_access ? 'yes' : 'no')
        setBedding(editingPen.conditions.bedding_type || 'rubber mats')
        setDrainage(editingPen.conditions.drainage || 'good')
      }
    } else {
      if (selectedBuildingId) {
        setBuildingSelect(selectedBuildingId)
        if (selectedUnitId) {
          setUnitSelect(selectedUnitId)
        } else {
          setUnitSelect('')
        }
      } else {
        setBuildingSelect('')
        setUnitSelect('')
      }
      // Reset form when modal opens for new pen
      setPenNumber('')
      setCapacity('')
      setLength('')
      setWidth('')
      setHeight('')
      setError(null)
    }
  }, [isOpen, selectedBuildingId, selectedUnitId, editingPen])

  const selectedBuilding = buildings.find(b => b.id === buildingSelect)
  const selectedUnit = units.find(u => u.id === unitSelect && u.building_id === buildingSelect)
  
  // Filter units by selected building
  const availableUnits = units.filter(u => u.building_id === buildingSelect)

  // Calculate area
  const area = length && width ? (parseFloat(length) * parseFloat(width)).toFixed(2) : '0'

  if (!isOpen) return null

  const housingTypes: Record<SpecialHousingType, string> = {
    regular_housing: 'Regular Housing',
    isolation_pen: 'Isolation Pen',
    maternity_pen: 'Maternity Pen',
    dry_cow_pen: 'Dry Cow Pen',
    calf_housing: 'Calf Housing',
    quarantine_zone: 'Quarantine Zone',
    weighing_zone: 'Weighing Zone',
    treatment_zone: 'Treatment Zone',
    milking_parlor: 'Milking Parlor',
  }

  const validateForm = () => {
    if (!penNumber.trim()) return 'Pen number is required'
    if (!buildingSelect) return 'Building selection is required'
    if (!unitSelect) return 'Unit selection is required'
    if (!capacity || parseInt(capacity) <= 0) return 'Valid capacity is required'
    if (!length || parseFloat(length) <= 0) return 'Valid length is required'
    if (!width || parseFloat(width) <= 0) return 'Valid width is required'
    if (!height || parseFloat(height) <= 0) return 'Valid height is required'
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
      const payload = {
        building_id: buildingSelect,
        unit_id: unitSelect,
        pen_number: penNumber,
        special_type: penType,
        capacity: parseInt(capacity),
        dimensions: {
          length_meters: parseFloat(length),
          width_meters: parseFloat(width),
          height_meters: parseFloat(height),
          area_sqm: parseFloat(area),
        },
        conditions: {
          ventilation_quality: ventilation,
          lighting_type: lighting,
          water_access: waterAccess === 'yes',
          bedding_type: bedding,
          drainage: drainage,
        }
      }

      const url = isEditing
        ? `/api/housing/pens/${editingPen.id}`
        : '/api/housing/pens'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'create'} pen`)

      if (isEditing) {
        onUpdate?.(result.data)
      } else {
        onAdd(result.data)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} pen. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editingPen || !window.confirm('Are you sure you want to delete this pen? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/housing/pens/${editingPen.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete pen')
      }

      onDelete?.(editingPen.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pen')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center lg:p-4 z-50">
      <div className="w-full lg:max-w-2xl bg-white rounded-t-2xl lg:rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Pen/Stall' : 'Create New Pen/Stall'}
          </h2>
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

          {/* Hierarchy Section */}
          <div className="space-y-3 bg-gray-50 rounded-lg p-3">
            {/* Building Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Building *</label>
              <Select value={buildingSelect} onValueChange={(val) => {
                setBuildingSelect(val)
                setUnitSelect('') // Reset unit when building changes
              }}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Select building">
                    {buildingSelect && selectedBuilding ? (
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4" />
                        <span>{selectedBuilding.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Select building</span>
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
            </div>

            {/* Unit Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Unit *</label>
              <Select value={unitSelect} onValueChange={setUnitSelect} disabled={!buildingSelect}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder={buildingSelect ? 'Select unit' : 'Select building first'}>
                    {unitSelect && selectedUnit ? (
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4" />
                        <span>{selectedUnit.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">
                        {buildingSelect ? 'Select unit' : 'Select building first'}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableUnits.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4" />
                        <span>{unit.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUnit && (
                <p className="text-xs text-gray-600">
                  Capacity: {selectedUnit.total_capacity} animals • Type: {selectedUnit.unit_type}
                </p>
              )}
            </div>
          </div>

          {/* Pen Details Section */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">Pen Details</h3>

            {/* Pen Number */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Pen Number *</label>
              <Input
                placeholder="e.g., L-01, D-02, ISO-01"
                value={penNumber}
                onChange={(e) => setPenNumber(e.target.value)}
                required
              />
            </div>

            {/* Pen Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Housing Type *</label>
              <Select value={penType} onValueChange={(val) => setPenType(val as SpecialHousingType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(housingTypes).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Capacity */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Capacity (animals) *</label>
              <Input
                type="number"
                placeholder="e.g., 10"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Dimensions Section */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">Dimensions (meters)</h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Length (m) *</label>
                <Input
                  type="number"
                  placeholder="Length"
                  min="0.1"
                  step="0.1"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Width (m) *</label>
                <Input
                  type="number"
                  placeholder="Width"
                  min="0.1"
                  step="0.1"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Height (m) *</label>
                <Input
                  type="number"
                  placeholder="Height"
                  min="0.1"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  required
                />
              </div>
            </div>

            {length && width && (
              <div className="bg-blue-50 p-2 rounded text-xs text-blue-800">
                <strong>Area:</strong> {area} m²
              </div>
            )}
          </div>

          {/* Environmental Conditions */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">Environmental Conditions</h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Ventilation */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Ventilation</label>
                <Select value={ventilation} onValueChange={setVentilation}>
                  <SelectTrigger className="w-full text-sm">
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
                <label className="text-xs font-medium text-gray-700">Lighting</label>
                <Select value={lighting} onValueChange={setLighting}>
                  <SelectTrigger className="w-full text-sm">
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
                <label className="text-xs font-medium text-gray-700">Water Access</label>
                <Select value={waterAccess} onValueChange={setWaterAccess}>
                  <SelectTrigger className="w-full text-sm">
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
                <label className="text-xs font-medium text-gray-700">Bedding Type</label>
                <Select value={bedding} onValueChange={setBedding}>
                  <SelectTrigger className="w-full text-sm">
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
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-medium text-gray-700">Drainage</label>
                <Select value={drainage} onValueChange={setDrainage}>
                  <SelectTrigger className="w-full text-sm">
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
          </div>

          {/* Summary Preview */}
          {penNumber && capacity && selectedUnit && selectedBuilding && (
            <Card className="bg-green-50 border-green-200 p-3">
              <p className="text-xs text-green-800 font-medium">Pen Summary</p>
              <div className="mt-2 space-y-1 text-xs text-green-700">
                <p>
                  <strong>{selectedBuilding.name}</strong> → <strong>{selectedUnit.name}</strong>
                </p>
                <p>
                  Pen <strong>{penNumber}</strong> ({housingTypes[penType]})
                </p>
                <p>Capacity: {capacity} animals • Area: {area} m²</p>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2 border-t pt-4">
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={deleting || loading}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading || deleting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || deleting || !buildingSelect || !unitSelect}
            >
              {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Pen' : 'Create Pen')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
