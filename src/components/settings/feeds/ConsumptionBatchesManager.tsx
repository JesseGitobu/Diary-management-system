'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
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
  Scale,
  Eye,
  UserPlus,
  UserMinus,
  TrendingUp,
  Filter,
  CheckCircle,
  Circle,
  BarChart3
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
  target_mode: string // 'category' | 'specific' | 'mixed'
  targeted_animals_count?: number
  category_animals_count?: number
  specific_animals_count?: number
}

interface BatchTargetedAnimal {
  animal_id: string
  tag_number: string
  name: string | null
  gender: string | null
  birth_date: string | null
  production_status: string | null
  status: string
  days_in_milk: number | null
  current_daily_production: number | null
  age_days: number | null
  source: string // 'category' | 'specific'
  is_active: boolean
}

interface AnimalBatchFactor {
  animal_id: string
  animal_tag: string
  factor_id: string
  factor_name: string
  factor_type: string
  factor_value: string
  is_active: boolean
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
  target_mode: string
  age_factor: string
  breeding_status: string
  milk_production: string
  body_condition: string
  season: string
}

const DEFAULT_FEEDING_TIMES = ['06:00', '12:00', '18:00']
const TARGET_MODE_OPTIONS = [
  { value: 'category', label: 'Animal Categories', description: 'Target animals by categories' },
  { value: 'specific', label: 'Specific Animals', description: 'Target individual animals' },
  { value: 'mixed', label: 'Mixed Targeting', description: 'Combine categories and specific animals' }
]

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
  const [showAnimalModal, setShowAnimalModal] = useState(false)
  const [showFactorsModal, setShowFactorsModal] = useState(false)
  const [showInsightsModal, setShowInsightsModal] = useState(false)
  const [editingBatch, setEditingBatch] = useState<ConsumptionBatch | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<ConsumptionBatch | null>(null)
  const [deletingBatch, setDeletingBatch] = useState<ConsumptionBatch | null>(null)
  const [loading, setLoading] = useState(false)
  const [targetedAnimals, setTargetedAnimals] = useState<BatchTargetedAnimal[]>([])
  const [availableAnimals, setAvailableAnimals] = useState<BatchTargetedAnimal[]>([])
  const [animalFactors, setAnimalFactors] = useState<AnimalBatchFactor[]>([])
  const [batchInsights, setBatchInsights] = useState<any>(null)

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
    target_mode: 'category',
    age_factor: '',
    breeding_status: '',
    milk_production: '',
    body_condition: '',
    season: ''
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
      target_mode: 'category',
      age_factor: '',
      breeding_status: '',
      milk_production: '',
      body_condition: '',
      season: ''
    })
  }, [])

  const fetchBatchAnimals = async (batchId: string) => {
    try {
      const response = await fetch(
        `/api/farms/${farmId}/feed-management/consumption-batches/${batchId}/animals?include_available=true`
      )

      if (response.ok) {
        const result = await response.json()
        setTargetedAnimals(result.data.targeted || [])
        setAvailableAnimals(result.data.available || [])
      }
    } catch (error) {
      console.error('Error fetching batch animals:', error)
    }
  }

  const fetchBatchFactors = async (batchId: string) => {
    try {
      const response = await fetch(
        `/api/farms/${farmId}/feed-management/consumption-batches/${batchId}/factors`
      )

      if (response.ok) {
        const result = await response.json()
        setAnimalFactors(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching batch factors:', error)
    }
  }

  const fetchBatchInsights = async (batchId: string) => {
    try {
      const response = await fetch(
        `/api/farms/${farmId}/feed-management/consumption-batches/${batchId}/insights`
      )

      if (response.ok) {
        const result = await response.json()
        setBatchInsights(result.data || null)
      }
    } catch (error) {
      console.error('Error fetching batch insights:', error)
    }
  }

  const handleViewAnimals = async (batch: ConsumptionBatch) => {
    setSelectedBatch(batch)
    setLoading(true)
    await fetchBatchAnimals(batch.id)
    setLoading(false)
    setShowAnimalModal(true)
  }

  const handleViewFactors = async (batch: ConsumptionBatch) => {
    setSelectedBatch(batch)
    setLoading(true)
    await fetchBatchFactors(batch.id)
    setLoading(false)
    setShowFactorsModal(true)
  }

  const handleViewInsights = async (batch: ConsumptionBatch) => {
    setSelectedBatch(batch)
    setLoading(true)
    await fetchBatchInsights(batch.id)
    setLoading(false)
    setShowInsightsModal(true)
  }

  const handleAddAnimalToBatch = async (animalId: string) => {
    if (!selectedBatch) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/farms/${farmId}/feed-management/consumption-batches/${selectedBatch.id}/animals`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ animal_id: animalId })
        }
      )

      if (response.ok) {
        await fetchBatchAnimals(selectedBatch.id)
      }
    } catch (error) {
      console.error('Error adding animal to batch:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveAnimalFromBatch = async (animalId: string) => {
    if (!selectedBatch) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/farms/${farmId}/feed-management/consumption-batches/${selectedBatch.id}/animals/${animalId}`,
        {
          method: 'DELETE'
        }
      )

      if (response.ok) {
        await fetchBatchAnimals(selectedBatch.id)
      }
    } catch (error) {
      console.error('Error removing animal from batch:', error)
    } finally {
      setLoading(false)
    }
  }

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
      target_mode: batch.target_mode || 'category',
      age_factor: batch.batch_factors?.age || '',
      breeding_status: batch.batch_factors?.breeding_status || '',
      milk_production: batch.batch_factors?.milk_production || '',
      body_condition: batch.batch_factors?.body_condition || '',
      season: batch.batch_factors?.season || ''
    })
    setEditingBatch(batch)
    setShowBatchModal(true)
  }, [])

  const formatAge = (ageDays: number | null) => {
    if (!ageDays) return 'Unknown'
    if (ageDays < 30) return `${ageDays} days`
    if (ageDays < 365) return `${Math.floor(ageDays / 30)} months`
    const years = Math.floor(ageDays / 365)
    const months = Math.floor((ageDays % 365) / 30)
    return `${years}y ${months}m`
  }

  const getTargetModeDisplay = (mode: string) => {
    switch (mode) {
      case 'category': return { label: 'Categories', color: 'blue' }
      case 'specific': return { label: 'Specific', color: 'green' }
      case 'mixed': return { label: 'Mixed', color: 'purple' }
      default: return { label: 'Unknown', color: 'gray' }
    }
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
        feed_type_categories: batchFormData.feed_type_categories,
        batch_factors: batchFactors,
        default_quantity_kg: parseFloat(batchFormData.default_quantity_kg) || 0,
        daily_consumption_per_animal_kg: parseFloat(batchFormData.daily_consumption_per_animal_kg) || 0,
        consumption_unit: batchFormData.consumption_unit,
        feeding_frequency_per_day: parseInt(batchFormData.feeding_frequency_per_day) || 2,
        feeding_times: batchFormData.feeding_times,
        target_mode: batchFormData.target_mode,
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
        throw new Error(error.error || 'Failed to save batch')
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
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to save batch'}`)
    } finally {
      setLoading(false)
    }
  }

  // 2. ADD MISSING FORM HANDLERS (place these after your existing handlers)
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
      setBatchFormData({
        ...batchFormData,
        feed_type_categories: currentCategories.filter((_, index) => index !== existingIndex)
      })
    } else {
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

  const BatchActionButtons = ({ batch }: { batch: ConsumptionBatch }) => {
    if (isMobile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewAnimals(batch)}>
              <Eye className="mr-2 h-4 w-4" />
              View Animals ({batch.targeted_animals_count || 0})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleViewFactors(batch)}>
              <Settings className="mr-2 h-4 w-4" />
              Manage Factors
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleViewInsights(batch)}>
              <BarChart3 className="mr-2 h-4 w-4" />
              View Insights
            </DropdownMenuItem>
            {canEdit && (
              <>
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
              </>
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
          onClick={() => handleViewAnimals(batch)}
        >
          <Eye className="h-4 w-4 mr-1" />
          {batch.targeted_animals_count || 0} Animals
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewFactors(batch)}
        >
          <Settings className="h-4 w-4 mr-1" />
          Factors
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewInsights(batch)}
        >
          <BarChart3 className="h-4 w-4 mr-1" />
          Insights
        </Button>
        {canEdit && (
          <>
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
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Batches View */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Consumption Batches</h3>
            <p className="text-sm text-gray-600">
              Create feeding templates with specific animal targeting and customized factors
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
          {batches.map((batch) => {
            const targetModeDisplay = getTargetModeDisplay(batch.target_mode || 'category')

            return (
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
                      <Badge
                        variant="outline"
                        className={`text-xs text-${targetModeDisplay.color}-700 bg-${targetModeDisplay.color}-50`}
                      >
                        {targetModeDisplay.label}
                      </Badge>
                      {!batch.is_active && (
                        <Badge variant="outline" className="text-xs">Inactive</Badge>
                      )}
                    </div>

                    {batch.description && (
                      <p className="text-sm text-gray-600 mb-2">{batch.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{batch.targeted_animals_count || 0} targeted animals</span>
                      </div>
                      {batch.target_mode === 'mixed' && (
                        <>
                          <span>•</span>
                          <span>{batch.category_animals_count || 0} from categories</span>
                          <span>•</span>
                          <span>{batch.specific_animals_count || 0} specific</span>
                        </>
                      )}
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Target className="w-3 h-3" />
                        <span>{batch.default_quantity_kg}kg per feeding</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{batch.feeding_frequency_per_day}x daily</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {batch.animal_category_ids?.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3 text-blue-600" />
                          <span className="text-xs text-blue-600">
                            {batch.animal_category_ids.length} categories
                          </span>
                        </div>
                      )}

                      {batch.feed_type_categories?.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Tags className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-green-600">
                            {batch.feed_type_categories.length} feed types
                          </span>
                        </div>
                      )}

                      {batch.batch_factors && Object.keys(batch.batch_factors).length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Settings className="w-3 h-3 text-purple-600" />
                          <span className="text-xs text-purple-600">
                            {Object.keys(batch.batch_factors).length} factors
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={isMobile ? 'self-end' : ''}>
                  <BatchActionButtons batch={batch} />
                </div>
              </div>
            )
          })}

          {batches.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Utensils className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <h3 className="font-medium text-gray-900 mb-1">No consumption batches yet</h3>
              <p className="text-sm">Create feeding templates with animal-specific targeting.</p>
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

      {/* Batch Animals Modal */}
      <Modal
        isOpen={showAnimalModal}
        onClose={() => setShowAnimalModal(false)}
        className="max-w-6xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Animals in "{selectedBatch?.batch_name}"
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Targeted Animals */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Targeted Animals ({targetedAnimals.length})
                </h4>
                {targetedAnimals.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {targetedAnimals.map((animal) => (
                      <div key={animal.animal_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <span className="font-medium">#{animal.tag_number}</span>
                            {animal.name && (
                              <span className="text-gray-600">({animal.name})</span>
                            )}
                            <Badge
                              variant={animal.source === 'specific' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {animal.source}
                            </Badge>
                            {animal.gender && (
                              <Badge variant="outline" className="text-xs">
                                {animal.gender}
                              </Badge>
                            )}
                            {animal.production_status && (
                              <Badge variant="secondary" className="text-xs">
                                {animal.production_status}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center space-x-4">
                            <span>Age: {formatAge(animal.age_days)}</span>
                            {animal.days_in_milk && (
                              <span>DIM: {animal.days_in_milk}</span>
                            )}
                            {animal.current_daily_production && (
                              <span>Production: {animal.current_daily_production}L/day</span>
                            )}
                          </div>
                        </div>
                        {canEdit && animal.source === 'specific' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveAnimalFromBatch(animal.animal_id)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No animals targeted in this batch.</p>
                )}
              </div>

              {/* Available Animals to Add */}
              {canEdit && availableAnimals.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Available Animals ({availableAnimals.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableAnimals.map((animal) => (
                      <div key={animal.animal_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <span className="font-medium">#{animal.tag_number}</span>
                            {animal.name && (
                              <span className="text-gray-600">({animal.name})</span>
                            )}
                            {animal.gender && (
                              <Badge variant="outline" className="text-xs">
                                {animal.gender}
                              </Badge>
                            )}
                            {animal.production_status && (
                              <Badge variant="secondary" className="text-xs">
                                {animal.production_status}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center space-x-4">
                            <span>Age: {formatAge(animal.age_days)}</span>
                            {animal.days_in_milk && (
                              <span>DIM: {animal.days_in_milk}</span>
                            )}
                            {animal.current_daily_production && (
                              <span>Production: {animal.current_daily_production}L/day</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddAnimalToBatch(animal.animal_id)}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowAnimalModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Batch Factors Modal */}
      <Modal
        isOpen={showFactorsModal}
        onClose={() => setShowFactorsModal(false)}
        className="max-w-6xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Manage Factors: "{selectedBatch?.batch_name}"
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Available Factors */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Available Factors</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {batchFactors.map((factor) => (
                    <div key={factor.id} className="text-sm">
                      <span className="font-medium">{factor.factor_name}</span>
                      <span className="text-blue-700 block text-xs">{factor.factor_type}</span>
                    </div>
                  ))}
                </div>
                {batchFactors.length === 0 && (
                  <p className="text-sm text-blue-700">No factors defined yet. Create factors in the main settings.</p>
                )}
              </div>

              {/* Animals and Their Factors */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Animals in Batch ({targetedAnimals.length})
                </h4>
                {targetedAnimals.length > 0 ? (
                  <div className="space-y-4">
                    {targetedAnimals.map((animal) => {
                      // Use a different variable name to avoid conflict
                      const currentAnimalFactors = animalFactors.filter((f: AnimalBatchFactor) => f.animal_id === animal.animal_id)

                      return (
                        <div key={animal.animal_id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className="font-medium">#{animal.tag_number}</span>
                              {animal.name && (
                                <span className="text-gray-600">({animal.name})</span>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {animal.source}
                              </Badge>
                              {animal.gender && (
                                <Badge variant="secondary" className="text-xs">
                                  {animal.gender}
                                </Badge>
                              )}
                              {animal.production_status && (
                                <Badge variant="outline" className="text-xs">
                                  {animal.production_status}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {currentAnimalFactors.length} factor(s) set
                            </div>
                          </div>

                          {/* Factor Input Fields */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {batchFactors.map((factor) => {
                              const currentFactor = currentAnimalFactors.find((af: AnimalBatchFactor) => af.factor_id === factor.id)
                              const factorKey = `${animal.animal_id}-${factor.id}`

                              return (
                                <div key={factorKey} className="space-y-1">
                                  <Label className="text-xs font-medium">
                                    {factor.factor_name}
                                    <span className="text-gray-500 ml-1">({factor.factor_type})</span>
                                  </Label>
                                  <Input
                                    value={currentFactor?.factor_value || ''}
                                    onChange={(e) => {
                                      const newValue = e.target.value
                                      setAnimalFactors((prev: AnimalBatchFactor[]) => {
                                        const filtered = prev.filter((f: AnimalBatchFactor) =>
                                          !(f.animal_id === animal.animal_id && f.factor_id === factor.id)
                                        )

                                        if (newValue.trim()) {
                                          return [...filtered, {
                                            animal_id: animal.animal_id,
                                            animal_tag: animal.tag_number,
                                            factor_id: factor.id,
                                            factor_name: factor.factor_name,
                                            factor_type: factor.factor_type,
                                            factor_value: newValue,
                                            is_active: true
                                          }]
                                        }

                                        return filtered
                                      })
                                    }}
                                    placeholder={`Enter ${factor.factor_name.toLowerCase()}`}
                                    className="text-xs"
                                  />
                                  {factor.description && (
                                    <p className="text-xs text-gray-500">{factor.description}</p>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {currentAnimalFactors.length === 0 && batchFactors.length > 0 && (
                            <div className="mt-3 p-2 bg-yellow-50 rounded text-sm text-yellow-800">
                              No factors set for this animal. Fill in the fields above to add factors.
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                    <p>No animals in this batch to set factors for.</p>
                  </div>
                )}
              </div>

              {/* Bulk Actions */}
              {targetedAnimals.length > 0 && batchFactors.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Bulk Actions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Apply factor to all animals</Label>
                      <div className="flex space-x-2 mt-1">
                        <select
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onChange={(e) => {
                            if (!e.target.value) return
                            const [factorId, factorValue] = e.target.value.split('|')

                            setAnimalFactors((prev: AnimalBatchFactor[]) => {
                              const filtered = prev.filter((f: AnimalBatchFactor) => f.factor_id !== factorId)
                              const factor = batchFactors.find(bf => bf.id === factorId)

                              if (factor) {
                                const newFactors = targetedAnimals.map(animal => ({
                                  animal_id: animal.animal_id,
                                  animal_tag: animal.tag_number,
                                  factor_id: factorId,
                                  factor_name: factor.factor_name,
                                  factor_type: factor.factor_type,
                                  factor_value: factorValue,
                                  is_active: true
                                }))

                                return [...filtered, ...newFactors]
                              }

                              return filtered
                            })
                          }}
                        >
                          <option value="">Select factor and value...</option>
                          {batchFactors.map(factor => (
                            <optgroup key={factor.id} label={factor.factor_name}>
                              <option value={`${factor.id}|high`}>High {factor.factor_name}</option>
                              <option value={`${factor.id}|medium`}>Medium {factor.factor_name}</option>
                              <option value={`${factor.id}|low`}>Low {factor.factor_name}</option>
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Clear all factors</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 w-full text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('Are you sure you want to clear all factors for all animals?')) {
                            setAnimalFactors([])
                          }
                        }}
                      >
                        Clear All Factors
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setShowFactorsModal(false)}
            >
              Cancel
            </Button>
            <div className="space-x-3">
              <Button
                variant="outline"
                onClick={async () => {
                  if (!selectedBatch) return
                  setLoading(true)
                  await fetchBatchFactors(selectedBatch.id)
                  setLoading(false)
                }}
                disabled={loading}
              >
                Reset Changes
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedBatch) return

                  setLoading(true)
                  try {
                    // Prepare factor updates
                    const factorUpdates = animalFactors.map((factor: AnimalBatchFactor) => ({
                      animal_id: factor.animal_id,
                      factor_id: factor.factor_id,
                      factor_value: factor.factor_value
                    }))

                    const response = await fetch(
                      `/api/farms/${farmId}/feed-management/consumption-batches/${selectedBatch.id}/factors`,
                      {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ factors: factorUpdates })
                      }
                    )

                    if (response.ok) {
                      setShowFactorsModal(false)
                      // Optionally refresh the batch data
                    } else {
                      const error = await response.json()
                      alert(`Error saving factors: ${error.error}`)
                    }
                  } catch (error) {
                    console.error('Error saving factors:', error)
                    alert('Failed to save factors')
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Save Factors'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Batch Insights Modal */}
      <Modal
        isOpen={showInsightsModal}
        onClose={() => setShowInsightsModal(false)}
        className="max-w-4xl"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Batch Insights: "{selectedBatch?.batch_name}"
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : batchInsights ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Total Animals</h4>
                <div className="text-2xl font-bold text-blue-600">{batchInsights.totalAnimals}</div>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>From categories: {batchInsights.animalsBySource.category}</div>
                  <div>Specific: {batchInsights.animalsBySource.specific}</div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Gender Distribution</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <div>Female: {batchInsights.animalsByGender.female}</div>
                  <div>Male: {batchInsights.animalsByGender.male}</div>
                  {batchInsights.animalsByGender.unknown > 0 && (
                    <div>Unknown: {batchInsights.animalsByGender.unknown}</div>
                  )}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Production Status</h4>
                <div className="text-sm text-purple-700 space-y-1">
                  {Object.entries(batchInsights.animalsByProductionStatus).map(([status, count]) => (
                    <div key={status}>{status}: {count as number}</div>
                  ))}
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">Average Age</h4>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.floor(batchInsights.averageAge / 365)}y {Math.floor((batchInsights.averageAge % 365) / 30)}m
                </div>
              </div>

              <div className="bg-indigo-50 p-4 rounded-lg">
                <h4 className="font-medium text-indigo-900 mb-2">Avg Daily Production</h4>
                <div className="text-2xl font-bold text-indigo-600">
                  {batchInsights.averageDailyProduction?.toFixed(1) || 0}L
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Batch Factors</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>Total factors: {batchInsights.factorsCount}</div>
                  <div>Animals with factors: {batchInsights.animalsWithFactors}</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No insights available.</p>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowInsightsModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showBatchModal}
        onClose={handleModalClose}
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
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
                    value={batchFormData.batch_name}
                    onChange={(e) => setBatchFormData(prev => ({ ...prev, batch_name: e.target.value }))}
                    placeholder="e.g., High Production Dairy Cows"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={batchFormData.description}
                    onChange={(e) => setBatchFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe this feeding batch..."
                  />
                </div>

                <div>
                  <Label htmlFor="target_mode">Targeting Mode</Label>
                  <select
                    id="target_mode"
                    value={batchFormData.target_mode}
                    onChange={(e) => setBatchFormData(prev => ({ ...prev, target_mode: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TARGET_MODE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">How animals will be targeted for this batch</p>
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
                    onChange={(e) => setBatchFormData(prev => ({ ...prev, default_quantity_kg: e.target.value }))}
                    placeholder="25.0"
                  />
                </div>

                <div>
                  <Label htmlFor="daily_consumption">Daily Consumption per Animal</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="daily_consumption"
                      type="number"
                      step="0.001"
                      value={batchFormData.daily_consumption_per_animal_kg}
                      onChange={(e) => setBatchFormData(prev => ({ ...prev, daily_consumption_per_animal_kg: e.target.value }))}
                      placeholder="2.5"
                      className="flex-1"
                    />
                    <select
                      value={batchFormData.consumption_unit}
                      onChange={(e) => setBatchFormData(prev => ({ ...prev, consumption_unit: e.target.value as 'kg' | 'grams' }))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="kg">kg</option>
                      <option value="grams">grams</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="feeding_frequency">Feedings per Day</Label>
                  <select
                    id="feeding_frequency"
                    value={batchFormData.feeding_frequency_per_day}
                    onChange={(e) => handleFeedingFrequencyChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            </div>

            {/* Animal Categories - Only show if target_mode includes 'category' */}
            {(batchFormData.target_mode === 'category' || batchFormData.target_mode === 'mixed') && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Target Animal Categories</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {animalCategories.map((category) => (
                    <label key={category.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={batchFormData.animal_category_ids.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{category.name}</div>
                        {category.description && (
                          <div className="text-xs text-gray-500">{category.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Feed Type Categories */}
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
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                        <div className="ml-7">
                          <Label htmlFor={`quantity_${category.id}`}>Quantity per Feeding (kg)</Label>
                          <Input
                            id={`quantity_${category.id}`}
                            type="number"
                            step="0.001"
                            value={feedCategoryData?.quantity_kg || ''}
                            onChange={(e) => handleFeedCategoryQuantityChange(category.id, parseFloat(e.target.value) || 0)}
                            placeholder="0.0"
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
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
              Are you sure you want to delete "{deletingBatch?.batch_name}"? This will also remove all animal targeting and factors. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deletingBatch) return

                setLoading(true)
                try {
                  const response = await fetch(
                    `/api/farms/${farmId}/feed-management/consumption-batches/${deletingBatch.id}`,
                    { method: 'DELETE' }
                  )

                  if (response.ok) {
                    onBatchesUpdate(batches.filter(batch => batch.id !== deletingBatch.id))
                    setDeletingBatch(null)
                  }
                } catch (error) {
                  console.error('Error deleting batch:', error)
                } finally {
                  setLoading(false)
                }
              }}
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