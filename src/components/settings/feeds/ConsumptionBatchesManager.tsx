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
  Utensils,
  Users,
  Settings,
  MoreVertical,
  Clock,
  Target,
  Tags,
  Scale
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

interface FeedCategoryQuantity {
  category_id: string
  quantity_kg: number
  unit: 'kg' | 'grams'
}

interface ConsumptionBatch {
  id: string
  batch_name: string
  description: string
  animal_category_ids: string[]
  feed_type_categories: FeedCategoryQuantity[]
  batch_factors: any
  default_quantity_kg: number
  daily_consumption_per_animal_kg: number
  consumption_unit: 'kg' | 'grams'
  feeding_frequency_per_day: number
  feeding_times: string[]
  feeding_schedule: any
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

interface FeedTypeCategory {
  id: string
  name: string
  description: string
  color: string
}

interface ConsumptionBatchesManagerProps {
  farmId: string
  batches: ConsumptionBatch[]
  batchFactors: ConsumptionBatchFactor[]
  animalCategories: AnimalCategory[]
  feedTypeCategories: FeedTypeCategory[]
  onBatchesUpdate: (batches: ConsumptionBatch[]) => void
  onFactorsUpdate: (factors: ConsumptionBatchFactor[]) => void
  canEdit: boolean
  isMobile: boolean
}

interface BatchFormData {
  batch_name: string
  description: string
  animal_category_ids: string[]
  feed_type_categories: FeedCategoryQuantity[]
  default_quantity_kg: string
  daily_consumption_per_animal_kg: string
  consumption_unit: 'kg' | 'grams'
  feeding_frequency_per_day: string
  feeding_times: string[]
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

const DEFAULT_FEEDING_TIMES = ['06:00', '12:00', '18:00']

export function ConsumptionBatchesManager({
  farmId,
  batches,
  batchFactors,
  animalCategories,
  feedTypeCategories,
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
    feed_type_categories: [],
    default_quantity_kg: '',
    daily_consumption_per_animal_kg: '',
    consumption_unit: 'kg',
    feeding_frequency_per_day: '2',
    feeding_times: ['06:00', '18:00'],
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

  const resetBatchForm = useCallback(() => {
    setBatchFormData({
      batch_name: '',
      description: '',
      animal_category_ids: [],
      feed_type_categories: [],
      default_quantity_kg: '',
      daily_consumption_per_animal_kg: '',
      consumption_unit: 'kg',
      feeding_frequency_per_day: '2',
      feeding_times: ['06:00', '18:00'],
      age_factor: '',
      breeding_status: '',
      milk_production: '',
      body_condition: '',
      season: ''
    })
  }, [])

  const resetFactorForm = useCallback(() => {
    setFactorFormData({
      factor_name: '',
      factor_type: 'custom',
      description: ''
    })
  }, [])

  const handleAddBatch = useCallback(() => {
    resetBatchForm()
    setShowBatchModal(true)
  }, [resetBatchForm])

  const handleEditBatch = useCallback((batch: ConsumptionBatch) => {
    setBatchFormData({
      batch_name: batch.batch_name,
      description: batch.description || '',
      animal_category_ids: batch.animal_category_ids || [],
      feed_type_categories: batch.feed_type_categories || [],
      default_quantity_kg: batch.default_quantity_kg?.toString() || '',
      daily_consumption_per_animal_kg: batch.daily_consumption_per_animal_kg?.toString() || '',
      consumption_unit: batch.consumption_unit || 'kg',
      feeding_frequency_per_day: batch.feeding_frequency_per_day?.toString() || '2',
      feeding_times: batch.feeding_times || ['06:00', '18:00'],
      age_factor: batch.batch_factors?.age || '',
      breeding_status: batch.batch_factors?.breeding_status || '',
      milk_production: batch.batch_factors?.milk_production || '',
      body_condition: batch.batch_factors?.body_condition || '',
      season: batch.batch_factors?.season || ''
    })
    setEditingBatch(batch)
    setShowBatchModal(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setShowBatchModal(false)
    setEditingBatch(null)
    resetBatchForm()
  }, [resetBatchForm])

  const handleFeedingFrequencyChange = useCallback((frequency: number) => {
    const newTimes = DEFAULT_FEEDING_TIMES.slice(0, frequency)
    setBatchFormData(prev => ({
      ...prev,
      feeding_frequency_per_day: frequency.toString(),
      feeding_times: newTimes
    }))
  }, [])

  const handleFeedingTimeChange = useCallback((index: number, time: string) => {
    setBatchFormData(prev => ({
      ...prev,
      feeding_times: prev.feeding_times.map((t, i) => i === index ? time : t)
    }))
  }, [])

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
        feed_type_categories: batchFormData.feed_type_categories,
        batch_factors: batchFactors,
        default_quantity_kg: parseFloat(batchFormData.default_quantity_kg) || 0,
        daily_consumption_per_animal_kg: parseFloat(batchFormData.daily_consumption_per_animal_kg) || 0,
        consumption_unit: batchFormData.consumption_unit,
        feeding_frequency_per_day: parseInt(batchFormData.feeding_frequency_per_day) || 2,
        feeding_times: batchFormData.feeding_times,
        feeding_schedule: {
          times: batchFormData.feeding_times,
          frequency: parseInt(batchFormData.feeding_frequency_per_day),
          feed_categories: batchFormData.feed_type_categories
        },
        is_active: true,
        is_preset: false
      }

      const url = editingBatch
        ? `/api/farms/${farmId}/feed-management/consumption-batches/${editingBatch.id}`
        : `/api/farms/${farmId}/feed-management/consumption-batches`

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

      handleModalClose()
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
      const response = await fetch(`/api/farms/${farmId}/feed-management/consumption-batches/${deletingBatch.id}`, {
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

  // Memoized event handlers
  const handleBatchNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBatchFormData(prev => ({ ...prev, batch_name: e.target.value }))
  }, [])

  const handleBatchDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBatchFormData(prev => ({ ...prev, description: e.target.value }))
  }, [])

  const handleDefaultQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBatchFormData(prev => ({ ...prev, default_quantity_kg: e.target.value }))
  }, [])

  const handleDailyConsumptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBatchFormData(prev => ({ ...prev, daily_consumption_per_animal_kg: e.target.value }))
  }, [])

  const handleConsumptionUnitChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setBatchFormData(prev => ({ ...prev, consumption_unit: e.target.value as 'kg' | 'grams' }))
  }, [])

  const handleCategoryToggle = (categoryId: string) => {
    const currentIds = batchFormData.animal_category_ids
    const newIds = currentIds.includes(categoryId)
      ? currentIds.filter(id => id !== categoryId)
      : [...currentIds, categoryId]

    setBatchFormData({ ...batchFormData, animal_category_ids: newIds })
  }

  const handleFeedCategoryToggle = (categoryId: string) => {
    const currentCategories = batchFormData.feed_type_categories
    const existingIndex = currentCategories.findIndex(fc => fc.category_id === categoryId)
    
    if (existingIndex >= 0) {
      // Remove the category
      setBatchFormData({ 
        ...batchFormData, 
        feed_type_categories: currentCategories.filter((_, index) => index !== existingIndex)
      })
    } else {
      // Add the category with default values
      setBatchFormData({ 
        ...batchFormData, 
        feed_type_categories: [
          ...currentCategories, 
          { category_id: categoryId, quantity_kg: 0, unit: 'kg' }
        ]
      })
    }
  }

  const handleFeedCategoryQuantityChange = (categoryId: string, quantity: number) => {
    setBatchFormData(prev => ({
      ...prev,
      feed_type_categories: prev.feed_type_categories.map(fc => 
        fc.category_id === categoryId 
          ? { ...fc, quantity_kg: quantity }
          : fc
      )
    }))
  }

  const handleFeedCategoryUnitChange = (categoryId: string, unit: 'kg' | 'grams') => {
    setBatchFormData(prev => ({
      ...prev,
      feed_type_categories: prev.feed_type_categories.map(fc => 
        fc.category_id === categoryId 
          ? { ...fc, unit: unit }
          : fc
      )
    }))
  }

  const getCategoryNames = (categoryIds: string[]) => {
    return categoryIds
      .map(id => animalCategories.find(cat => cat.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  const getFeedCategoryNames = (feedCategories: FeedCategoryQuantity[]) => {
    return feedCategories
      .map(fc => {
        const category = feedTypeCategories.find(cat => cat.id === fc.category_id)
        return category ? `${category.name} (${fc.quantity_kg}${fc.unit})` : null
      })
      .filter(Boolean)
      .join(', ')
  }

  const getFeedCategoryColors = (feedCategories: FeedCategoryQuantity[]) => {
    return feedCategories
      .map(fc => feedTypeCategories.find(cat => cat.id === fc.category_id)?.color)
      .filter(Boolean)
  }

  const getFeedCategoryDisplay = (feedCategories: FeedCategoryQuantity[]) => {
    return feedCategories.map(fc => {
      const category = feedTypeCategories.find(cat => cat.id === fc.category_id)
      return category ? {
        name: category.name,
        color: category.color,
        quantity: fc.quantity_kg,
        unit: fc.unit
      } : null
    }).filter(Boolean)
  }

  const formatFeedingTimes = (times: string[]) => {
    return times.map(time => {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours)
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${displayHour}:${minutes} ${period}`
    }).join(', ')
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
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeSubTab === 'batches'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <Utensils className="w-4 h-4 inline mr-2" />
          Consumption Batches
        </button>
        <button
          onClick={() => setActiveSubTab('factors')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeSubTab === 'factors'
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
                Create feeding templates with specific feed types and schedules
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
                className={`p-4 border rounded-lg ${isMobile ? 'space-y-3' : 'flex items-center justify-between'
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
                      {batch.daily_consumption_per_animal_kg > 0 && (
                        <div className="flex items-center space-x-1">
                          <Scale className="w-3 h-3" />
                          <span>{batch.daily_consumption_per_animal_kg} {batch.consumption_unit}/animal/day</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{batch.feeding_frequency_per_day}x daily</span>
                      </div>
                      {batch.feeding_times?.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatFeedingTimes(batch.feeding_times)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {batch.animal_category_ids?.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3 text-blue-600" />
                          <span className="text-xs text-blue-600">{getCategoryNames(batch.animal_category_ids)}</span>
                        </div>
                      )}
                      
                      {batch.feed_type_categories?.length > 0 && (
                        <div className="flex items-start space-x-2 mt-1">
                          <Tags className="w-3 h-3 text-green-600 mt-0.5" />
                          <div className="flex flex-col space-y-1">
                            {getFeedCategoryDisplay(batch.feed_type_categories).map((category, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: category?.color || '#gray-200' }}
                                />
                                <span className="text-xs text-green-600">
                                  {category?.name}: {category?.quantity}{category?.unit}
                                </span>
                              </div>
                            ))}
                          </div>
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
                <p className="text-sm">Create feeding templates with specific schedules and feed types.</p>
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
      <Modal
        isOpen={showBatchModal}
        onClose={handleModalClose}
        className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingBatch ? 'Edit Consumption Batch' : 'Add New Consumption Batch'}
          </h3>

          <form onSubmit={handleSubmitBatch} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Basic Information</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="batch_name">Batch Name *</Label>
                  <Input
                    id="batch_name"
                    key={editingBatch ? editingBatch.id : undefined}
                    value={batchFormData.batch_name}
                    onChange={handleBatchNameChange}
                    placeholder="e.g., High Production Dairy Cows"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    key={editingBatch ? editingBatch.id : undefined}
                    value={batchFormData.description}
                    onChange={handleBatchDescriptionChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                    placeholder="Describe this feeding batch..."
                  />
                </div>
              </div>
            </div>

            {/* Feeding Quantities */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Feeding Quantities</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="default_quantity_kg">Quantity per Feeding (kg)</Label>
                  <Input
                    id="default_quantity_kg"
                    type="number"
                    step="0.1"
                    value={batchFormData.default_quantity_kg}
                    onChange={handleDefaultQuantityChange}
                    placeholder="25.0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Total amount per feeding session</p>
                </div>

                <div>
                  <Label htmlFor="daily_consumption">Daily Consumption per Animal</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="daily_consumption"
                      type="number"
                      step="0.001"
                      value={batchFormData.daily_consumption_per_animal_kg}
                      onChange={handleDailyConsumptionChange}
                      placeholder="2.5"
                      className="flex-1"
                    />
                    <select
                      value={batchFormData.consumption_unit}
                      onChange={handleConsumptionUnitChange}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green"
                    >
                      <option value="kg">kg</option>
                      <option value="grams">grams</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Individual animal daily requirement</p>
                </div>

                <div>
                  <Label htmlFor="feeding_frequency_per_day">Feedings per Day</Label>
                  <select
                    id="feeding_frequency_per_day"
                    value={batchFormData.feeding_frequency_per_day}
                    onChange={(e) => handleFeedingFrequencyChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green"
                  >
                    <option value="1">1 time daily</option>
                    <option value="2">2 times daily</option>
                    <option value="3">3 times daily</option>
                    <option value="4">4 times daily</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Feeding Schedule */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Feeding Schedule</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {batchFormData.feeding_times.map((time, index) => (
                  <div key={index}>
                    <Label htmlFor={`feeding_time_${index}`}>Feeding {index + 1}</Label>
                    <Input
                      id={`feeding_time_${index}`}
                      type="time"
                      value={time}
                      onChange={(e) => handleFeedingTimeChange(index, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Set specific times for each daily feeding. This helps with scheduling and notifications.
              </p>
            </div>

            {/* Feed Type Categories with Quantities */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Feed Type Categories & Quantities</h4>
              <div className="space-y-3">
                {feedTypeCategories.map((category) => {
                  const isSelected = batchFormData.feed_type_categories.some(fc => fc.category_id === category.id)
                  const feedCategoryData = batchFormData.feed_type_categories.find(fc => fc.category_id === category.id)
                  
                  return (
                    <div key={category.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleFeedCategoryToggle(category.id)}
                          className="h-4 w-4 text-farm-green border-gray-300 rounded focus:ring-farm-green"
                        />
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                        {category.description && (
                          <span className="text-sm text-gray-500">- {category.description}</span>
                        )}
                      </div>
                      
                      {isSelected && (
                        <div className="ml-7 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`quantity_${category.id}`}>Quantity per Feeding</Label>
                            <Input
                              id={`quantity_${category.id}`}
                              type="number"
                              step="0.001"
                              value={feedCategoryData?.quantity_kg || ''}
                              onChange={(e) => handleFeedCategoryQuantityChange(category.id, parseFloat(e.target.value) || 0)}
                              placeholder="0.0"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`unit_${category.id}`}>Unit</Label>
                            <select
                              id={`unit_${category.id}`}
                              value={feedCategoryData?.unit || 'kg'}
                              onChange={(e) => handleFeedCategoryUnitChange(category.id, e.target.value as 'kg' | 'grams')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green"
                            >
                              <option value="kg">kg</option>
                              <option value="grams">grams</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500">
                Select feed categories and specify the amount needed per feeding session. This helps with precise feed preparation and inventory planning.
              </p>
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
                    onChange={(e) => setBatchFormData(prev => ({ ...prev, age_factor: e.target.value }))}
                    placeholder="e.g., young, mature, senior"
                  />
                </div>

                <div>
                  <Label htmlFor="breeding_status">Breeding Status</Label>
                  <Input
                    id="breeding_status"
                    value={batchFormData.breeding_status}
                    onChange={(e) => setBatchFormData(prev => ({ ...prev, breeding_status: e.target.value }))}
                    placeholder="e.g., pregnant, dry, lactating"
                  />
                </div>

                <div>
                  <Label htmlFor="milk_production">Milk Production Level</Label>
                  <Input
                    id="milk_production"
                    value={batchFormData.milk_production}
                    onChange={(e) => setBatchFormData(prev => ({ ...prev, milk_production: e.target.value }))}
                    placeholder="e.g., high, medium, low"
                  />
                </div>

                <div>
                  <Label htmlFor="body_condition">Body Condition</Label>
                  <Input
                    id="body_condition"
                    value={batchFormData.body_condition}
                    onChange={(e) => setBatchFormData(prev => ({ ...prev, body_condition: e.target.value }))}
                    placeholder="e.g., good, thin, fat"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <LoadingSpinner size="sm" /> : (editingBatch ? 'Update Batch' : 'Create Batch')}
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