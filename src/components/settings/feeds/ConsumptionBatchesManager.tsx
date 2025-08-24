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
  Utensils,
  Users,
  Settings,
  MoreVertical,
  Clock,
  Target
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

interface ConsumptionBatch {
  id: string
  batch_name: string
  description: string
  animal_category_ids: string[]
  batch_factors: any
  default_quantity_kg: number
  feeding_frequency_per_day: number
  is_active: boolean
  is_preset: boolean
}

interface ConsumptionBatchFactor {
  id: string
  factor_name: string
  factor_type: string
  description: string
  is_active: boolean
}

interface AnimalCategory {
  id: string
  name: string
  description: string
}

interface ConsumptionBatchesManagerProps {
  farmId: string
  batches: ConsumptionBatch[]
  batchFactors: ConsumptionBatchFactor[]
  animalCategories: AnimalCategory[]
  onBatchesUpdate: (batches: ConsumptionBatch[]) => void
  onFactorsUpdate: (factors: ConsumptionBatchFactor[]) => void
  canEdit: boolean
  isMobile: boolean
}

interface BatchFormData {
  batch_name: string
  description: string
  animal_category_ids: string[]
  default_quantity_kg: string
  feeding_frequency_per_day: string
  age_factor: string
  breeding_status: string
  milk_production: string
  body_condition: string
  season: string
}

interface FactorFormData {
  factor_name: string
  factor_type: string
  description: string
}

const FACTOR_TYPES = [
  { value: 'age', label: 'Age', description: 'Based on animal age group' },
  { value: 'breeding_cycle', label: 'Breeding Cycle', description: 'Breeding or pregnancy status' },
  { value: 'milk_production', label: 'Milk Production', description: 'Daily milk yield level' },
  { value: 'custom', label: 'Custom', description: 'User-defined factor' }
]

export function ConsumptionBatchesManager({
  farmId,
  batches,
  batchFactors,
  animalCategories,
  onBatchesUpdate,
  onFactorsUpdate,
  canEdit,
  isMobile
}: ConsumptionBatchesManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState('batches')
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showFactorModal, setShowFactorModal] = useState(false)
  const [editingBatch, setEditingBatch] = useState<ConsumptionBatch | null>(null)
  const [editingFactor, setEditingFactor] = useState<ConsumptionBatchFactor | null>(null)
  const [deletingBatch, setDeletingBatch] = useState<ConsumptionBatch | null>(null)
  const [deletingFactor, setDeletingFactor] = useState<ConsumptionBatchFactor | null>(null)
  const [loading, setLoading] = useState(false)
  
  const [batchFormData, setBatchFormData] = useState<BatchFormData>({
    batch_name: '',
    description: '',
    animal_category_ids: [],
    default_quantity_kg: '',
    feeding_frequency_per_day: '2',
    age_factor: '',
    breeding_status: '',
    milk_production: '',
    body_condition: '',
    season: ''
  })
  
  const [factorFormData, setFactorFormData] = useState<FactorFormData>({
    factor_name: '',
    factor_type: 'custom',
    description: ''
  })

  const resetBatchForm = () => {
    setBatchFormData({
      batch_name: '',
      description: '',
      animal_category_ids: [],
      default_quantity_kg: '',
      feeding_frequency_per_day: '2',
      age_factor: '',
      breeding_status: '',
      milk_production: '',
      body_condition: '',
      season: ''
    })
  }

  const resetFactorForm = () => {
    setFactorFormData({
      factor_name: '',
      factor_type: 'custom',
      description: ''
    })
  }

  const handleAddBatch = () => {
    resetBatchForm()
    setShowBatchModal(true)
  }

  const handleEditBatch = (batch: ConsumptionBatch) => {
    setBatchFormData({
      batch_name: batch.batch_name,
      description: batch.description || '',
      animal_category_ids: batch.animal_category_ids || [],
      default_quantity_kg: batch.default_quantity_kg?.toString() || '',
      feeding_frequency_per_day: batch.feeding_frequency_per_day?.toString() || '2',
      age_factor: batch.batch_factors?.age || '',
      breeding_status: batch.batch_factors?.breeding_status || '',
      milk_production: batch.batch_factors?.milk_production || '',
      body_condition: batch.batch_factors?.body_condition || '',
      season: batch.batch_factors?.season || ''
    })
    setEditingBatch(batch)
    setShowBatchModal(true)
  }

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!batchFormData.batch_name.trim()) return

    setLoading(true)
    try {
      const batchFactors = {
        age: batchFormData.age_factor,
        breeding_status: batchFormData.breeding_status,
        milk_production: batchFormData.milk_production,
        body_condition: batchFormData.body_condition,
        season: batchFormData.season
      }

      // Remove empty factors
      Object.keys(batchFactors).forEach(key => {
        if (!batchFactors[key as keyof typeof batchFactors]) {
          delete batchFactors[key as keyof typeof batchFactors]
        }
      })

      const payload = {
        batch_name: batchFormData.batch_name,
        description: batchFormData.description,
        animal_category_ids: batchFormData.animal_category_ids,
        batch_factors: batchFactors,
        default_quantity_kg: parseFloat(batchFormData.default_quantity_kg) || 0,
        feeding_frequency_per_day: parseInt(batchFormData.feeding_frequency_per_day) || 2,
        is_active: true,
        is_preset: false
      }

      const url = editingBatch 
        ? `/api/settings/feed-management/consumption-batches/${editingBatch.id}`
        : '/api/settings/feed-management/consumption-batches'
      
      const method = editingBatch ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save batch')
      }

      const result = await response.json()
      
      if (editingBatch) {
        onBatchesUpdate(batches.map(batch => 
          batch.id === editingBatch.id ? result.data : batch
        ))
      } else {
        onBatchesUpdate([...batches, result.data])
      }

      setShowBatchModal(false)
      setEditingBatch(null)
      resetBatchForm()
    } catch (error) {
      console.error('Error saving batch:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBatch = async () => {
    if (!deletingBatch) return

    setLoading(true)
    try {
      const response = await fetch(`/api/settings/feed-management/consumption-batches/${deletingBatch.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete batch')
      }

      onBatchesUpdate(batches.filter(batch => batch.id !== deletingBatch.id))
      setDeletingBatch(null)
    } catch (error) {
      console.error('Error deleting batch:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryToggle = (categoryId: string) => {
    const currentIds = batchFormData.animal_category_ids
    const newIds = currentIds.includes(categoryId)
      ? currentIds.filter(id => id !== categoryId)
      : [...currentIds, categoryId]
    
    setBatchFormData({ ...batchFormData, animal_category_ids: newIds })
  }

  const getCategoryNames = (categoryIds: string[]) => {
    return categoryIds
      .map(id => animalCategories.find(cat => cat.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  const getFactorsByType = (type: string) => {
    return batchFactors.filter(factor => factor.factor_type === type)
  }

  const BatchActionButtons = ({ batch }: { batch: ConsumptionBatch }) => {
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
            <DropdownMenuItem onClick={() => handleEditBatch(batch)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {!batch.is_preset && (
              <DropdownMenuItem 
                onClick={() => setDeletingBatch(batch)}
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
          onClick={() => handleEditBatch(batch)}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        {!batch.is_preset && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeletingBatch(batch)}
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
      {/* Sub-navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveSubTab('batches')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeSubTab === 'batches'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Utensils className="w-4 h-4 inline mr-2" />
          Consumption Batches
        </button>
        <button
          onClick={() => setActiveSubTab('factors')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeSubTab === 'factors'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          Batch Factors
        </button>
      </div>

      {/* Consumption Batches Tab */}
      {activeSubTab === 'batches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Consumption Batches</h3>
              <p className="text-sm text-gray-600">
                Create feeding templates for different animal groups
              </p>
            </div>
            {canEdit && (
              <Button onClick={handleAddBatch}>
                <Plus className="w-4 h-4 mr-2" />
                Add Batch
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className={`p-4 border rounded-lg ${
                  isMobile ? 'space-y-3' : 'flex items-center justify-between'
                }`}
              >
                <div className={`flex-1 ${isMobile ? 'space-y-2' : 'flex items-center space-x-4'}`}>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Utensils className="w-5 h-5 text-orange-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{batch.batch_name}</h4>
                      {batch.is_preset && (
                        <Badge variant="secondary" className="text-xs">Preset</Badge>
                      )}
                      {!batch.is_active && (
                        <Badge variant="outline" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    
                    {batch.description && (
                      <p className="text-sm text-gray-600 mb-2">{batch.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Target className="w-3 h-3" />
                        <span>{batch.default_quantity_kg}kg per feeding</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{batch.feeding_frequency_per_day}x daily</span>
                      </div>
                      {batch.animal_category_ids?.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{getCategoryNames(batch.animal_category_ids)}</span>
                        </div>
                      )}
                    </div>
                    
                    {batch.batch_factors && Object.keys(batch.batch_factors).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(batch.batch_factors).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}: {value as string}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className={isMobile ? 'self-end' : ''}>
                  <BatchActionButtons batch={batch} />
                </div>
              </div>
            ))}

            {batches.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Utensils className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">No consumption batches yet</h3>
                <p className="text-sm">Create feeding templates for efficient batch feeding.</p>
                {canEdit && (
                  <Button className="mt-4" onClick={handleAddBatch}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Batch
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Batch Factors Tab */}
      {activeSubTab === 'factors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Batch Factors</h3>
              <p className="text-sm text-gray-600">
                Define factors that influence feeding requirements
              </p>
            </div>
            {canEdit && (
              <Button onClick={() => setShowFactorModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Factor
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {FACTOR_TYPES.map((type) => {
              const typeFactors = getFactorsByType(type.value)
              return (
                <div key={type.value} className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{type.label}</h4>
                  <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                  
                  {typeFactors.length > 0 ? (
                    <div className="space-y-2">
                      {typeFactors.map((factor) => (
                        <div key={factor.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{factor.factor_name}</span>
                            {factor.description && (
                              <span className="text-sm text-gray-600 ml-2">- {factor.description}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No {type.label.toLowerCase()} factors defined</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Batch Modal */}
      <Modal isOpen={showBatchModal} onClose={() => {
        setShowBatchModal(false)
        setEditingBatch(null)
        resetBatchForm()
      }} className="max-w-2xl">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingBatch ? 'Edit Consumption Batch' : 'Add New Consumption Batch'}
          </h3>

          <form onSubmit={handleSubmitBatch} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Basic Information</h4>
              
              <div>
                <Label htmlFor="batch_name">Batch Name *</Label>
                <Input
                  id="batch_name"
                  value={batchFormData.batch_name}
                  onChange={(e) => setBatchFormData({ ...batchFormData, batch_name: e.target.value })}
                  placeholder="e.g., High Production Cows"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={batchFormData.description}
                  onChange={(e) => setBatchFormData({ ...batchFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Describe this feeding batch..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="default_quantity_kg">Default Quantity (kg)</Label>
                  <Input
                    id="default_quantity_kg"
                    type="number"
                    step="0.1"
                    value={batchFormData.default_quantity_kg}
                    onChange={(e) => setBatchFormData({ ...batchFormData, default_quantity_kg: e.target.value })}
                    placeholder="e.g., 25.0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="feeding_frequency_per_day">Feedings per Day</Label>
                  <Input
                    id="feeding_frequency_per_day"
                    type="number"
                    min="1"
                    max="6"
                    value={batchFormData.feeding_frequency_per_day}
                    onChange={(e) => setBatchFormData({ ...batchFormData, feeding_frequency_per_day: e.target.value })}
                    placeholder="2"
                  />
                </div>
              </div>
            </div>

            {/* Animal Categories */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Target Animal Categories</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {animalCategories.map((category) => (
                  <label key={category.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={batchFormData.animal_category_ids.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                      className="h-4 w-4 text-farm-green border-gray-300 rounded focus:ring-farm-green"
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Batch Factors */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Batch Factors (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age_factor">Age Factor</Label>
                  <Input
                    id="age_factor"
                    value={batchFormData.age_factor}
                    onChange={(e) => setBatchFormData({ ...batchFormData, age_factor: e.target.value })}
                    placeholder="e.g., young, mature, senior"
                  />
                </div>
                
                <div>
                  <Label htmlFor="breeding_status">Breeding Status</Label>
                  <Input
                    id="breeding_status"
                    value={batchFormData.breeding_status}
                    onChange={(e) => setBatchFormData({ ...batchFormData, breeding_status: e.target.value })}
                    placeholder="e.g., pregnant, dry, lactating"
                  />
                </div>
                
                <div>
                  <Label htmlFor="milk_production">Milk Production Level</Label>
                  <Input
                    id="milk_production"
                    value={batchFormData.milk_production}
                    onChange={(e) => setBatchFormData({ ...batchFormData, milk_production: e.target.value })}
                    placeholder="e.g., high, medium, low"
                  />
                </div>
                
                <div>
                  <Label htmlFor="body_condition">Body Condition</Label>
                  <Input
                    id="body_condition"
                    value={batchFormData.body_condition}
                    onChange={(e) => setBatchFormData({ ...batchFormData, body_condition: e.target.value })}
                    placeholder="e.g., good, thin, fat"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowBatchModal(false)
                  setEditingBatch(null)
                  resetBatchForm()
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <LoadingSpinner size="sm" /> : (editingBatch ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Batch Confirmation */}
      <AlertDialog open={!!deletingBatch} onOpenChange={() => setDeletingBatch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Consumption Batch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingBatch?.batch_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBatch}
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