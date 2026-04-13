// src/components/settings/feeds/WeightConversionsManager.tsx

'use client'

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog'
import {
  Plus,
  Edit,
  Trash2,
  Scale,
  Calculator,
  MoreVertical
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

// Quantifiable weight and volume units for dropdown selection
// Includes standard metric/imperial weight units and liquid volume units
// All units represent measurable quantities for feed management
const QUANTIFIABLE_WEIGHT_UNITS = [
  // Standard Metric Weight Units
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'mg', label: 'Milligrams (mg)' },
  { value: 't', label: 'Metric Tons (t)' },

  // Imperial Weight Units
  { value: 'lbs', label: 'Pounds (lbs)' },
  { value: 'oz', label: 'Ounces (oz)' },
  { value: 'st', label: 'Stone (st)' },

  // Liquid Volume Units (Metric)
  { value: 'L', label: 'Liters (L)' },
  { value: 'mL', label: 'Milliliters (mL)' },
  { value: 'cL', label: 'Centiliters (cL)' },
  { value: 'dL', label: 'Deciliters (dL)' },

  // Liquid Volume Units (Imperial/US)
  { value: 'gal', label: 'Gallons (gal)' },
  { value: 'qt', label: 'Quarts (qt)' },
  { value: 'pt', label: 'Pints (pt)' },
  { value: 'cup', label: 'Cups (cup)' },
  { value: 'fl oz', label: 'Fluid Ounces (fl oz)' },
  { value: 'tbsp', label: 'Tablespoons (tbsp)' },
  { value: 'tsp', label: 'Teaspoons (tsp)' },
] as const

interface FeedUnitConversion {
  id: string
  farm_id: string
  from_unit: string
  to_unit: string
  conversion_factor: number
  unit_name?: string
  is_default: boolean
  is_active: boolean
  created_at?: string
}

interface FeedUnitConversionsManagerProps {
  farmId: string
  conversions: FeedUnitConversion[]
  onConversionsUpdate: (conversions: FeedUnitConversion[]) => void
  canEdit: boolean
  isMobile: boolean
}

interface ConversionFormData {
  from_unit: string
  to_unit: string
  conversion_factor: string
  unit_name: string
}

export function FeedUnitConversionsManager({
  farmId,
  conversions,
  onConversionsUpdate,
  canEdit,
  isMobile
}: FeedUnitConversionsManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingConversion, setEditingConversion] = useState<FeedUnitConversion | null>(null)
  const [deletingConversion, setDeletingConversion] = useState<FeedUnitConversion | null>(null)
  const [loading, setLoading] = useState(false)
  const [testQuantity, setTestQuantity] = useState<string>('100')
  const [formData, setFormData] = useState<ConversionFormData>({
    from_unit: '',
    to_unit: 'kg',
    conversion_factor: '',
    unit_name: ''
  })

  const resetForm = useCallback(() => {
    setFormData({
      from_unit: '',
      to_unit: 'kg', // Default to kilograms
      conversion_factor: '',
      unit_name: ''
    })
  }, [])

  const handleAdd = useCallback(() => {
    resetForm()
    setShowAddModal(true)
  }, [resetForm])

  const handleEdit = useCallback((conversion: FeedUnitConversion) => {
    setFormData({
      from_unit: conversion.from_unit,
      to_unit: conversion.to_unit,
      conversion_factor: conversion.conversion_factor.toString(),
      unit_name: conversion.unit_name || ''
    })
    setEditingConversion(conversion)
    setShowAddModal(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setShowAddModal(false)
    setEditingConversion(null)
    resetForm()
  }, [resetForm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.from_unit.trim() || !formData.to_unit.trim() || !formData.conversion_factor) return

    setLoading(true)
    try {
      const payload = {
        from_unit: formData.from_unit,
        to_unit: formData.to_unit,
        conversion_factor: parseFloat(formData.conversion_factor),
        unit_name: formData.unit_name,
        is_default: false,
        is_active: true
      }

      const url = editingConversion
        ? `/api/farms/${farmId}/feed-management/weight-conversions/${editingConversion.id}`
        : `/api/farms/${farmId}/feed-management/weight-conversions`

      const method = editingConversion ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save weight conversion')
      }

      const result = await response.json()

      if (editingConversion) {
        onConversionsUpdate(conversions.map(conv =>
          conv.id === editingConversion.id ? result.data : conv
        ))
      } else {
        onConversionsUpdate([...conversions, result.data])
      }

      handleModalClose()
    } catch (error) {
      console.error('Error saving weight conversion:', error)
      // You might want to show a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingConversion) return

    setLoading(true)
    try {
      const response = await fetch(`/api/farms/${farmId}/feed-management/weight-conversions/${deletingConversion.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete weight conversion')
      }

      onConversionsUpdate(conversions.filter(conv => conv.id !== deletingConversion.id))
      setDeletingConversion(null)
    } catch (error) {
      console.error('Error deleting weight conversion:', error)
    } finally {
      setLoading(false)
    }
  }


  // Memoized event handlers to prevent input focus issues
  const handleFromUnitChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, from_unit: e.target.value }))
  }, [])

  const handleConversionFactorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, conversion_factor: e.target.value }))
  }, [])

  const handleUnitNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, unit_name: e.target.value }))
  }, [])



  const calculateConversion = (quantity: number, conversion: FeedUnitConversion) => {
    return (quantity * conversion.conversion_factor).toFixed(2)
  }

  // Sort conversions: defaults first, then by unit name or from_unit
  const sortedConversions = useMemo(() =>
    [...conversions].sort((a, b) => {
      if (a.is_default !== b.is_default) {
        return a.is_default ? -1 : 1
      }
      const aName = a.unit_name || a.from_unit
      const bName = b.unit_name || b.from_unit
      return aName.localeCompare(bName)
    }), [conversions])

  const ActionButtons = ({ conversion }: { conversion: FeedUnitConversion }) => {
    if (!canEdit) return null

    if (isMobile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(conversion)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {!conversion.is_default && (
              <DropdownMenuItem
                onClick={() => setDeletingConversion(conversion)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return (
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEdit(conversion)}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        {!conversion.is_default && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeletingConversion(conversion)}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Feed Unit Conversions</h3>
          <p className="text-sm text-gray-600">
            Set up custom conversions between weight and volume units for feed measurements
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Conversion
          </Button>
        )}
      </div>

      {/* Conversion Calculator */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h4 className="font-medium text-blue-800">Quick Conversion Calculator</h4>
        </div>

        <div className="flex items-center space-x-3 mb-3">
          <Input
            type="number"
            value={testQuantity}
            onChange={(e) => setTestQuantity(e.target.value)}
            className="w-24"
            placeholder="100"
          />
          <span className="text-sm text-blue-700">units converts to:</span>
        </div>

        <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
          {sortedConversions.slice(0, 6).map((conversion) => (
            <div key={conversion.id} className="bg-white p-3 rounded border">
              <div className="text-sm font-medium">
                {parseFloat(testQuantity || '0')} {conversion.from_unit} = {' '}
                <span className="text-blue-600">
                  {calculateConversion(parseFloat(testQuantity || '0'), conversion)} {conversion.to_unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversions List */}
      <div className="space-y-3">
        {sortedConversions.map((conversion) => (
          <div
            key={conversion.id}
            className={`flex items-center justify-between p-4 border rounded-lg ${isMobile ? 'flex-col space-y-3' : 'flex-row'
              }`}
          >
            <div className={`flex items-center space-x-4 ${isMobile ? 'self-start w-full' : 'flex-1'}`}>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-gray-600" />
              </div>

              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium">{conversion.unit_name || conversion.from_unit}</h4>
                  <Badge variant="outline" className="text-xs">
                    {conversion.from_unit} → {conversion.to_unit}
                  </Badge>
                  {conversion.is_default && (
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  )}
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <div>1 {conversion.from_unit} = {conversion.conversion_factor} {conversion.to_unit}</div>
                </div>
              </div>
            </div>

            <div className={`flex items-center space-x-4 ${isMobile ? 'self-end' : ''}`}>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">
                  {conversion.conversion_factor}x
                </div>
                <div className="text-xs text-gray-500">to {conversion.to_unit}</div>
              </div>
              <ActionButtons conversion={conversion} />
            </div>
          </div>
        ))}

        {conversions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Scale className="mx-auto h-8 w-8 text-gray-400 mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No feed unit conversions yet</h3>
            <p className="text-sm">Create conversions between different weight and volume units for accurate feed measurements.</p>
            {canEdit && (
              <Button className="mt-4" onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add Feed Unit Conversion
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleModalClose}
        className="max-w-lg">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingConversion ? 'Edit Feed Unit Conversion' : 'Add New Feed Unit Conversion'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="from_unit">From Unit *</Label>
                <Input
                  id="from_unit"
                  key={editingConversion ? editingConversion.id : undefined}
                  value={formData.from_unit}
                  onChange={handleFromUnitChange}
                  placeholder="e.g., sack, drum, pail"
                  required
                />
              </div>

              <div>
                <Label htmlFor="to_unit">To Unit *</Label>
                <Select
                  value={formData.to_unit}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, to_unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select weight or volume unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUANTIFIABLE_WEIGHT_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="unit_name">Display Name</Label>
              <Input
                id="unit_name"
                key={editingConversion ? editingConversion.id : undefined}
                value={formData.unit_name}
                onChange={handleUnitNameChange}
                placeholder="e.g., Traditional Debe"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional friendly name for this conversion
              </p>
            </div>

            <div>
              <Label htmlFor="conversion_factor">Conversion Factor *</Label>
              <Input
                id="conversion_factor"
                key={editingConversion ? editingConversion.id : undefined}
                type="number"
                step="0.0001"
                value={formData.conversion_factor}
                onChange={handleConversionFactorChange}
                placeholder="e.g., 15.0 (1 from_unit = 15.0 to_units)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                How many {QUANTIFIABLE_WEIGHT_UNITS.find(u => u.value === formData.to_unit)?.label || 'selected units'} does 1 {formData.from_unit || 'from_unit'} equal?
              </p>
            </div>

            {/* Preview */}
            {formData.conversion_factor && formData.from_unit && formData.to_unit && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Preview:</h4>
                <div className="text-sm text-blue-700">
                  1 {formData.from_unit} = {formData.conversion_factor} {formData.to_unit}
                  <br />
                  10 {formData.from_unit} = {(parseFloat(formData.conversion_factor) * 10).toFixed(2)} {formData.to_unit}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <LoadingSpinner size="sm" /> : (editingConversion ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingConversion} onOpenChange={() => setDeletingConversion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Weight Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingConversion?.unit_name || deletingConversion?.from_unit}" ({deletingConversion?.from_unit} → {deletingConversion?.to_unit})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}