'use client'

import { useState } from 'react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

interface WeightConversion {
  id: string
  unit_name: string
  unit_symbol: string
  conversion_to_kg: number
  description: string
  is_default: boolean
}

interface WeightConversionsManagerProps {
  farmId: string
  conversions: WeightConversion[]
  onConversionsUpdate: (conversions: WeightConversion[]) => void
  canEdit: boolean
  isMobile: boolean
}

interface ConversionFormData {
  unit_name: string
  unit_symbol: string
  conversion_to_kg: string
  description: string
}

export function WeightConversionsManager({
  farmId,
  conversions,
  onConversionsUpdate,
  canEdit,
  isMobile
}: WeightConversionsManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingConversion, setEditingConversion] = useState<WeightConversion | null>(null)
  const [deletingConversion, setDeletingConversion] = useState<WeightConversion | null>(null)
  const [loading, setLoading] = useState(false)
  const [testQuantity, setTestQuantity] = useState<string>('100')
  const [formData, setFormData] = useState<ConversionFormData>({
    unit_name: '',
    unit_symbol: '',
    conversion_to_kg: '',
    description: ''
  })

  const resetForm = () => {
    setFormData({
      unit_name: '',
      unit_symbol: '',
      conversion_to_kg: '',
      description: ''
    })
  }

  const handleAdd = () => {
    resetForm()
    setShowAddModal(true)
  }

  const handleEdit = (conversion: WeightConversion) => {
    setFormData({
      unit_name: conversion.unit_name,
      unit_symbol: conversion.unit_symbol,
      conversion_to_kg: conversion.conversion_to_kg.toString(),
      description: conversion.description || ''
    })
    setEditingConversion(conversion)
    setShowAddModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.unit_name.trim() || !formData.unit_symbol.trim() || !formData.conversion_to_kg) return

    setLoading(true)
    try {
      const payload = {
        unit_name: formData.unit_name,
        unit_symbol: formData.unit_symbol,
        conversion_to_kg: parseFloat(formData.conversion_to_kg),
        description: formData.description,
        is_default: false
      }

      const url = editingConversion 
        ? `/api/settings/feed-management/weight-conversions/${editingConversion.id}`
        : '/api/settings/feed-management/weight-conversions'
      
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

      setShowAddModal(false)
      setEditingConversion(null)
      resetForm()
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
      const response = await fetch(`/api/settings/feed-management/weight-conversions/${deletingConversion.id}`, {
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

  const calculateConversion = (quantity: number, conversion: WeightConversion) => {
    return (quantity * conversion.conversion_to_kg).toFixed(2)
  }

  // Sort conversions: defaults first, then by unit name
  const sortedConversions = [...conversions].sort((a, b) => {
    if (a.is_default !== b.is_default) {
      return a.is_default ? -1 : 1
    }
    return a.unit_name.localeCompare(b.unit_name)
  })

  const ActionButtons = ({ conversion }: { conversion: WeightConversion }) => {
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
          <h3 className="text-lg font-medium">Weight Conversions</h3>
          <p className="text-sm text-gray-600">
            Set up custom weight units when scales aren't available
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Unit
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
                {parseFloat(testQuantity || '0')} {conversion.unit_symbol} = {' '}
                <span className="text-blue-600">
                  {calculateConversion(parseFloat(testQuantity || '0'), conversion)} kg
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
            className={`flex items-center justify-between p-4 border rounded-lg ${
              isMobile ? 'flex-col space-y-3' : 'flex-row'
            }`}
          >
            <div className={`flex items-center space-x-4 ${isMobile ? 'self-start w-full' : 'flex-1'}`}>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-gray-600" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium">{conversion.unit_name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {conversion.unit_symbol}
                  </Badge>
                  {conversion.is_default && (
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  )}
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <div>1 {conversion.unit_symbol} = {conversion.conversion_to_kg} kg</div>
                  {conversion.description && (
                    <div>{conversion.description}</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className={`flex items-center space-x-4 ${isMobile ? 'self-end' : ''}`}>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">
                  {conversion.conversion_to_kg}x
                </div>
                <div className="text-xs text-gray-500">to kg</div>
              </div>
              <ActionButtons conversion={conversion} />
            </div>
          </div>
        ))}

        {conversions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Scale className="mx-auto h-8 w-8 text-gray-400 mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No weight conversions yet</h3>
            <p className="text-sm">Create custom weight units for easier feed measurements.</p>
            {canEdit && (
              <Button className="mt-4" onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add Weight Unit
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showAddModal} onClose={() => {
        setShowAddModal(false)
        setEditingConversion(null)
        resetForm()
      }} className="max-w-lg">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingConversion ? 'Edit Weight Unit' : 'Add New Weight Unit'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit_name">Unit Name *</Label>
                <Input
                  id="unit_name"
                  value={formData.unit_name}
                  onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
                  placeholder="e.g., Debe, Sack"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="unit_symbol">Symbol *</Label>
                <Input
                  id="unit_symbol"
                  value={formData.unit_symbol}
                  onChange={(e) => setFormData({ ...formData, unit_symbol: e.target.value })}
                  placeholder="e.g., debe, sack"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="conversion_to_kg">Conversion to KG *</Label>
              <Input
                id="conversion_to_kg"
                type="number"
                step="0.0001"
                value={formData.conversion_to_kg}
                onChange={(e) => setFormData({ ...formData, conversion_to_kg: e.target.value })}
                placeholder="e.g., 15.0 (1 unit = 15.0 kg)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                How many kilograms does 1 unit equal?
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                placeholder="Describe this weight unit..."
              />
            </div>

            {/* Preview */}
            {formData.conversion_to_kg && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Preview:</h4>
                <div className="text-sm text-blue-700">
                  1 {formData.unit_symbol || 'unit'} = {formData.conversion_to_kg} kg
                  <br />
                  10 {formData.unit_symbol || 'units'} = {(parseFloat(formData.conversion_to_kg) * 10).toFixed(2)} kg
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddModal(false)
                  setEditingConversion(null)
                  resetForm()
                }}
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
              Are you sure you want to delete "{deletingConversion?.unit_name}" ({deletingConversion?.unit_symbol})? 
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