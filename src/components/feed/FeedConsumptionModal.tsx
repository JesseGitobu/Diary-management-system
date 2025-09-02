// components/feed/FeedConsumptionModal.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Switch } from '@/components/ui/Switch'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { 
  Plus, 
  Minus,
  Users, 
  User, 
  Wheat, 
  Clock, 
  Calculator,
  AlertTriangle,
  CheckCircle,
  X,
  Target,
  Tags,
  Utensils,
  TrendingUp,
  TrendingDown,
  Equal,
  Edit3,
  ChevronDown,
  ChevronUp,
  Eye,
  Info
} from 'lucide-react'

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
  daily_consumption_per_animal_kg: number
  consumption_unit: 'kg' | 'grams'
  feeding_frequency_per_day: number
  feeding_times: string[]
  batch_factors: any
  is_active: boolean
  targeted_animals_count?: number
  category_animals_count?: number
  specific_animals_count?: number
  target_mode?: string
}

interface FeedTypeCategory {
  id: string
  name: string
  description: string
  color: string
}

interface AnimalCategory {
  id: string
  name: string
  description: string
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

interface FeedConsumptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (consumption: any) => void
  farmId: string
  feedTypes: any[]
  animals: any[]
  inventory: any[]
  consumptionBatches?: ConsumptionBatch[]
  feedTypeCategories?: FeedTypeCategory[]
  animalCategories?: AnimalCategory[]
  isMobile?: boolean
  editingRecord?: any
}

interface ConsumptionEntry {
  feedTypeId: string
  quantityKg: number
  animalIds: string[]
  notes?: string
}

interface BatchQuantityStatus {
  categoryId: string
  categoryName: string
  recommendedKg: number
  actualKg: number
  status: 'under' | 'over' | 'perfect'
  percentage: number
}

export function FeedConsumptionModal({
  isOpen,
  onClose,
  onSuccess,
  farmId,
  feedTypes,
  animals,
  inventory,
  consumptionBatches = [],
  feedTypeCategories = [],
  animalCategories = [],
  isMobile = false,
  editingRecord
}: FeedConsumptionModalProps) {
  const [feedingMode, setFeedingMode] = useState<'individual' | 'batch'>('individual')
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [selectedFeedType, setSelectedFeedType] = useState('')
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([])
  const [quantity, setQuantity] = useState('')
  const [feedingTime, setFeedingTime] = useState(new Date().toTimeString().slice(0, 5))
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [multipleEntries, setMultipleEntries] = useState<ConsumptionEntry[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [animalCount, setAnimalCount] = useState<number>(1)
  const [perCowQuantity, setPerCowQuantity] = useState('')

  // New states for batch animal targeting
  const [batchAnimalsLoading, setBatchAnimalsLoading] = useState(false)
  const [batchTargetedAnimals, setBatchTargetedAnimals] = useState<BatchTargetedAnimal[]>([])
  const [showBatchAnimals, setShowBatchAnimals] = useState(false)

  const { isMobile: deviceIsMobile } = useDeviceInfo()
  const isMobileView = isMobile || deviceIsMobile
  const isEditMode = !!editingRecord

  // Get available feed types with inventory
  const availableFeedTypes = useMemo(() => {
    const feedTypesWithStock = feedTypes.map(feedType => {
      // Calculate total available stock for this feed type
      const totalStock = inventory
        .filter(item => item.feed_type_id === feedType.id)
        .reduce((sum, item) => sum + item.quantity_kg, 0)
      
      return {
        ...feedType,
        totalStock,
        hasStock: totalStock > 0 || isEditMode // Allow editing even if no stock
      }
    }).filter(feedType => feedType.hasStock)
    
    return feedTypesWithStock
  }, [feedTypes, inventory, isEditMode])

  // Get selected batch and feed type data
  const selectedConsumptionBatch = useMemo(() => 
    consumptionBatches.find(batch => batch.id === selectedBatch),
    [consumptionBatches, selectedBatch]
  )

  const selectedFeedTypeData = useMemo(() => 
    availableFeedTypes.find(ft => ft.id === selectedFeedType),
    [availableFeedTypes, selectedFeedType]
  )

  // Fetch batch targeted animals when batch is selected
  const fetchBatchAnimals = async (batchId: string) => {
    if (!batchId) {
      setBatchTargetedAnimals([])
      return
    }

    setBatchAnimalsLoading(true)
    try {
      const response = await fetch(
        `/api/farms/${farmId}/feed-management/consumption-batches/${batchId}/animals`
      )

      if (response.ok) {
        const result = await response.json()
        setBatchTargetedAnimals(result.data?.targeted || [])
      } else {
        console.error('Failed to fetch batch animals')
        setBatchTargetedAnimals([])
      }
    } catch (error) {
      console.error('Error fetching batch animals:', error)
      setBatchTargetedAnimals([])
    } finally {
      setBatchAnimalsLoading(false)
    }
  }

  // Effect to fetch animals when batch changes
  useEffect(() => {
    if (selectedBatch && feedingMode === 'batch') {
      fetchBatchAnimals(selectedBatch)
      // Auto-update animal count based on targeted animals count
      const batch = consumptionBatches.find(b => b.id === selectedBatch)
      if (batch?.targeted_animals_count) {
        setAnimalCount(batch.targeted_animals_count)
      }
    }
  }, [selectedBatch, feedingMode, consumptionBatches, farmId])

  // Format age helper function
  const formatAge = (ageDays: number | null) => {
    if (!ageDays) return 'Unknown'
    if (ageDays < 30) return `${ageDays} days`
    if (ageDays < 365) return `${Math.floor(ageDays / 30)} months`
    const years = Math.floor(ageDays / 365)
    const months = Math.floor((ageDays % 365) / 30)
    return `${years}y ${months}m`
  }

  // Calculate quantity recommendations and status
  const quantityAnalysis = useMemo(() => {
    if (!selectedConsumptionBatch || !selectedFeedTypeData || !perCowQuantity || animalCount <= 0) {
      return null
    }

    // Find the feed category for the selected feed type
    const feedCategory = selectedFeedTypeData.feed_category_id
    const batchFeedCategory = (selectedConsumptionBatch.feed_type_categories || []).find(
      fc => fc.category_id === feedCategory
    )

    if (!batchFeedCategory) return null

    const category = feedTypeCategories.find(cat => cat.id === feedCategory)
    const perCowActual = parseFloat(perCowQuantity)
    const totalActualThisSession = perCowActual * animalCount
    
    // Calculate recommended amounts
    const recommendedPerCowPerSession = batchFeedCategory.unit === 'grams' 
      ? batchFeedCategory.quantity_kg / 1000 
      : batchFeedCategory.quantity_kg
    const recommendedThisSession = recommendedPerCowPerSession * animalCount
    
    // Daily calculations
    const feedingFrequency = selectedConsumptionBatch.feeding_frequency_per_day
    const recommendedPerCowDaily = recommendedPerCowPerSession * feedingFrequency
    const recommendedDailyTotal = recommendedPerCowDaily * animalCount
    
    // Session performance
    const sessionPerformance = recommendedThisSession > 0 ? (totalActualThisSession / recommendedThisSession) * 100 : 0
    let sessionStatus: 'under' | 'over' | 'perfect' = 'perfect'
    
    if (sessionPerformance < 90) sessionStatus = 'under'
    else if (sessionPerformance > 110) sessionStatus = 'over'
    
    // Remaining calculations
    const sessionVariance = totalActualThisSession - recommendedThisSession
    const remainingSessionsToday = feedingFrequency - 1
    const remainingRecommendedTotal = recommendedPerCowPerSession * animalCount * remainingSessionsToday
    
    // Adjust remaining amounts based on current session performance
    const suggestedRemainingTotal = remainingRecommendedTotal - (sessionVariance * remainingSessionsToday / feedingFrequency)

    return {
      categoryId: feedCategory,
      categoryName: category?.name || 'Unknown Category',
      // This session
      recommendedThisSession,
      actualThisSession: totalActualThisSession,
      sessionVariance,
      sessionStatus,
      sessionPerformance: Math.round(sessionPerformance),
      // Per cow
      recommendedPerCow: recommendedPerCowPerSession,
      actualPerCow: perCowActual,
      // Daily totals
      recommendedDailyTotal,
      recommendedPerCowDaily,
      // Remaining sessions
      remainingSessionsToday,
      remainingRecommendedTotal,
      suggestedRemainingTotal: Math.max(0, suggestedRemainingTotal),
      unit: batchFeedCategory.unit,
      feedingFrequency
    }
  }, [selectedConsumptionBatch, selectedFeedTypeData, perCowQuantity, animalCount, feedTypeCategories])

  // Filter animals by batch categories
  const batchAnimals = useMemo(() => {
    if (!selectedConsumptionBatch || selectedConsumptionBatch.animal_category_ids.length === 0) {
      return animals
    }
    
    return animals.filter(animal => 
      selectedConsumptionBatch.animal_category_ids.some(categoryId => 
        animal.category_id === categoryId || animal.animal_category_id === categoryId
      )
    )
  }, [animals, selectedConsumptionBatch])

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (editingRecord) {
        // Pre-populate form with editing record data
        setFeedingMode(editingRecord.feeding_mode || 'individual')
        setSelectedFeedType(editingRecord.feed_type_id || '')
        setQuantity(editingRecord.quantity_kg?.toString() || '')
        setAnimalCount(editingRecord.animal_count || 1)
        
        // Calculate per cow quantity for batch mode
        if (editingRecord.feeding_mode === 'batch' && editingRecord.animal_count > 0) {
          setPerCowQuantity((editingRecord.quantity_kg / editingRecord.animal_count).toFixed(1))
        }
        
        // Set feeding time
        if (editingRecord.feeding_time) {
          const feedingDate = new Date(editingRecord.feeding_time)
          const timeString = feedingDate.toTimeString().slice(0, 5)
          setFeedingTime(timeString)
        }
        
        // Set notes
        setNotes(editingRecord.notes || '')
        
        // Set selected animals if individual mode and we have consumption_animals data
        if (editingRecord.feeding_mode === 'individual' && editingRecord.consumption_animals) {
          const animalIds = editingRecord.consumption_animals.map((ca: any) => ca.animal_id)
          setSelectedAnimals(animalIds)
        }
        
        // Set batch if available
        if (editingRecord.consumption_batch_id) {
          setSelectedBatch(editingRecord.consumption_batch_id)
        }
      } else {
        resetForm()
      }
    }
  }, [isOpen, editingRecord])

  const resetForm = () => {
    setFeedingMode('individual')
    setSelectedBatch('')
    setSelectedFeedType('')
    setSelectedAnimals([])
    setQuantity('')
    setPerCowQuantity('')
    setFeedingTime(new Date().toTimeString().slice(0, 5))
    setNotes('')
    setErrors({})
    setMultipleEntries([])
    setShowAdvanced(false)
    setAnimalCount(1)
    setBatchTargetedAnimals([])
    setShowBatchAnimals(false)
  }

  const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {}

  if (feedingMode === 'individual') {
    if (!selectedFeedType) newErrors.feedType = 'Please select a feed type'
    if (selectedAnimals.length === 0) newErrors.animals = 'Please select at least one animal'
    if (!quantity || parseFloat(quantity) <= 0) {
      newErrors.quantity = 'Please enter a valid quantity'
    } else if (!isEditMode && selectedFeedTypeData && parseFloat(quantity) > selectedFeedTypeData.totalStock) {
      newErrors.quantity = `Insufficient stock. Only ${selectedFeedTypeData.totalStock}kg available`
    }
  }
  
  if (feedingMode === 'batch') {
    if (!selectedBatch || selectedBatch === 'none') newErrors.batch = 'Please select a consumption batch'
    if (!selectedFeedType) newErrors.feedType = 'Please select a feed type'
    if (!perCowQuantity || parseFloat(perCowQuantity) <= 0) {
      newErrors.perCowQuantity = 'Please enter amount per cow'
    } else if (!isEditMode && selectedFeedTypeData) {
      const totalQuantityNeeded = parseFloat(perCowQuantity) * animalCount
      if (totalQuantityNeeded > selectedFeedTypeData.totalStock) {
        newErrors.perCowQuantity = `Insufficient stock. Only ${selectedFeedTypeData.totalStock}kg available (${(selectedFeedTypeData.totalStock / animalCount).toFixed(1)}kg per cow max)`
      }
    }
    if (animalCount <= 0) newErrors.animalCount = 'Please enter a valid animal count'
    
    // CRITICAL VALIDATION: Check that animals are loaded for the batch
    if (batchTargetedAnimals.length === 0 && !batchAnimalsLoading) {
      newErrors.batch = 'No animals found in selected batch. Please check batch configuration or select a different batch.'
    }
    
    // Validate animal count doesn't exceed targeted animals
    if (batchTargetedAnimals.length > 0 && animalCount > batchTargetedAnimals.length) {
      newErrors.animalCount = `Animal count cannot exceed the number of targeted animals (${batchTargetedAnimals.length}) in the selected batch.`
    }
    
    // Check if batch animals are still loading
    if (batchAnimalsLoading) {
      newErrors.batch = 'Loading batch animals, please wait...'
    }
  }

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}

  const handleAnimalToggle = (animalId: string) => {
    setSelectedAnimals(prev => 
      prev.includes(animalId) 
        ? prev.filter(id => id !== animalId)
        : [...prev, animalId]
    )
  }

  const addBatchEntry = () => {
    if (!selectedFeedType || !quantity || selectedAnimals.length === 0) {
      setErrors({ batch: 'Please fill all fields before adding entry' })
      return
    }

    const newEntry: ConsumptionEntry = {
      feedTypeId: selectedFeedType,
      quantityKg: parseFloat(quantity),
      animalIds: [...selectedAnimals],
      notes
    }

    setMultipleEntries(prev => [...prev, newEntry])
    
    // Reset fields for next entry
    setSelectedFeedType('')
    setSelectedAnimals([])
    setQuantity('')
    setNotes('')
    setErrors({})
  }

  const removeBatchEntry = (index: number) => {
    setMultipleEntries(prev => prev.filter((_, i) => i !== index))
  }

  const getTotalQuantity = () => {
    if (feedingMode === 'individual') {
      return parseFloat(quantity) || 0
    }
    return (parseFloat(perCowQuantity) || 0) * animalCount
  }

  const getTotalAnimals = () => {
    if (feedingMode === 'individual') {
      return selectedAnimals.length
    }
    return animalCount
  }

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  if (!validateForm()) return

  setIsSubmitting(true)
  try {
    // Create proper timestamp from feeding time
    const today = new Date()
    const [hours, minutes] = feedingTime.split(':')
    today.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    const feedingTimestamp = today.toISOString()

    let consumptionData: any = {
      farmId,
      feedingTime: feedingTimestamp,
      mode: feedingMode,
      batchId: feedingMode === 'batch' ? selectedBatch : null
    }

    if (feedingMode === 'individual') {
      consumptionData.entries = [{
        feedTypeId: selectedFeedType,
        quantityKg: parseFloat(quantity),
        animalIds: selectedAnimals,
        notes
      }]
    } else {
      // BATCH MODE: Get the actual animal IDs from the batch
      const batchAnimalIds = batchTargetedAnimals.map(animal => animal.animal_id)
      
      // Validate we have animals before proceeding
      if (batchAnimalIds.length === 0) {
        throw new Error('No animals found in the selected batch. Please check the batch configuration or select a different batch.')
      }

      // Validate animal count matches
      if (animalCount > batchAnimalIds.length) {
        throw new Error(`Animal count (${animalCount}) cannot exceed the number of targeted animals in the batch (${batchAnimalIds.length}).`)
      }

      // For batch mode, we can either use all targeted animals or a subset
      const finalAnimalIds = animalCount < batchAnimalIds.length 
        ? batchAnimalIds.slice(0, animalCount) // Use first N animals if less than total
        : batchAnimalIds // Use all animals if count matches or exceeds

      consumptionData.entries = [{
        feedTypeId: selectedFeedType,
        quantityKg: getTotalQuantity(),
        animalIds: finalAnimalIds, // FIXED: Use actual animal IDs
        animalCount: animalCount,
        perCowQuantityKg: parseFloat(perCowQuantity),
        batchId: selectedBatch,
        notes: `Batch: ${selectedConsumptionBatch?.batch_name} - ${parseFloat(perCowQuantity)}kg per cow${notes ? `\n${notes}` : ''}`
      }]
    }

    // Add record ID for updates
    if (isEditMode) {
      consumptionData.recordId = editingRecord.id
    }

    console.log('Sending consumption data:', consumptionData)

    const url = isEditMode ? `/api/feed/consumption/${editingRecord.id}` : '/api/feed/consumption'
    const method = isEditMode ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(consumptionData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'record'} consumption`)
    }

    const result = await response.json()
    onSuccess(result)
    onClose()
  } catch (error) {
    console.error(`Error ${isEditMode ? 'updating' : 'recording'} consumption:`, error)
    setErrors({ submit: error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'record'} consumption. Please try again.` })
  } finally {
    setIsSubmitting(false)
  }
}

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'under': return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'over': return <TrendingUp className="w-4 h-4 text-orange-500" />
      case 'perfect': return <Equal className="w-4 h-4 text-green-500" />
      default: return <Target className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'under': return 'border-red-200 bg-red-50'
      case 'over': return 'border-orange-200 bg-orange-50'
      case 'perfect': return 'border-green-200 bg-green-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const selectedFeedTypeName = feedTypes.find(ft => ft.id === selectedFeedType)?.name || ''

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={`${isMobileView ? 'max-w-full mx-4 my-4 h-[95vh] overflow-y-auto' : 'max-w-4xl max-h-[90vh] overflow-y-auto'}`}
    >
      <div className={`${isMobileView ? 'p-4' : 'p-6'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 flex items-center space-x-2`}>
              {isEditMode ? (
                <Edit3 className={`${isMobileView ? 'w-6 h-6' : 'w-8 h-8'} text-blue-600`} />
              ) : (
                <Wheat className={`${isMobileView ? 'w-6 h-6' : 'w-8 h-8'} text-green-600`} />
              )}
              <span>{isEditMode ? 'Edit Feed Consumption' : 'Record Feed Consumption'}</span>
            </h2>
            <p className={`text-gray-600 mt-1 ${isMobileView ? 'text-sm' : ''}`}>
              {isEditMode 
                ? 'Update this feeding record'
                : 'Track individual or batch feeding for your animals'
              }
            </p>
          </div>
          <Button variant="ghost" onClick={onClose} size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feeding Mode Selection */}
          <Card>
            <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
              <CardTitle className={`${isMobileView ? 'text-lg' : ''}`}>Feeding Mode</CardTitle>
              <CardDescription className={`${isMobileView ? 'text-sm' : ''}`}>
                Choose how you want to record feeding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={feedingMode} onValueChange={(value) => setFeedingMode(value as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="individual" className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Individual</span>
                  </TabsTrigger>
                  <TabsTrigger value="batch" className="flex items-center space-x-2">
                    <Utensils className="w-4 h-4" />
                    <span>Batch Template</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Individual Feeding */}
          {feedingMode === 'individual' && (
            <div className="space-y-6">
              {/* Feed Selection */}
              <Card>
                <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                  <CardTitle className={`${isMobileView ? 'text-lg' : ''}`}>Feed Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                    <div>
                      <Label htmlFor="feedType">Feed Type *</Label>
                      <Select value={selectedFeedType} onValueChange={setSelectedFeedType}>
                        <SelectTrigger className={errors.feedType ? 'border-red-300' : ''}>
                          <SelectValue placeholder="Select feed type" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFeedTypes.map(feedType => (
                            <SelectItem key={feedType.id} value={feedType.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{feedType.name}</span>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {feedType.totalStock.toFixed(1)}kg available
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                          {availableFeedTypes.length === 0 && (
                            <SelectItem value="no-stock" disabled>
                              No feeds with stock available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {errors.feedType && <p className="text-sm text-red-600 mt-1">{errors.feedType}</p>}
                    </div>

                    <div>
                      <Label htmlFor="quantity">Quantity (kg) *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.1"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Enter quantity in kg"
                        className={errors.quantity ? 'border-red-300' : ''}
                      />
                      {errors.quantity && <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="feedingTime">Feeding Time</Label>
                    <Input
                      id="feedingTime"
                      type="time"
                      value={feedingTime}
                      onChange={(e) => setFeedingTime(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Animal Selection */}
              <Card>
                <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                  <CardTitle className={`${isMobileView ? 'text-lg' : ''}`}>Select Animals</CardTitle>
                  <CardDescription className={`${isMobileView ? 'text-sm' : ''}`}>
                    Choose which animals received this feed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-3`}>
                    {animals.map(animal => (
                      <div
                        key={animal.id}
                        onClick={() => handleAnimalToggle(animal.id)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedAnimals.includes(animal.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-medium ${isMobileView ? 'text-sm' : ''}`}>
                              {animal.name || `Animal ${animal.tag_number}`}
                            </p>
                            {animal.tag_number && (
                              <p className={`text-gray-600 ${isMobileView ? 'text-xs' : 'text-sm'} font-mono`}>
                                Tag: {animal.tag_number}
                              </p>
                            )}
                            <p className={`text-gray-500 ${isMobileView ? 'text-xs' : 'text-sm'}`}>
                              {animal.breed} • {animal.category}
                            </p>
                          </div>
                          {selectedAnimals.includes(animal.id) && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {animals.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <User className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                      <p className={isMobileView ? 'text-sm' : ''}>No animals found</p>
                    </div>
                  )}
                  
                  {errors.animals && <p className="text-sm text-red-600 mt-2">{errors.animals}</p>}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Batch Feeding */}
          {feedingMode === 'batch' && (
            <div className="space-y-6">
              {/* Feed Type and Quantity - First */}
              <Card>
                <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                  <CardTitle className={`${isMobileView ? 'text-lg' : ''}`}>Feed Details</CardTitle>
                  <CardDescription className={`${isMobileView ? 'text-sm' : ''}`}>
                    Select the feed type and enter the quantity used
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                    <div>
                      <Label htmlFor="batchFeedType">Feed Type *</Label>
                      <Select value={selectedFeedType} onValueChange={setSelectedFeedType}>
                        <SelectTrigger className={errors.feedType ? 'border-red-300' : ''}>
                          <SelectValue placeholder="Select feed type" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFeedTypes.map(feedType => (
                            <SelectItem key={feedType.id} value={feedType.id}>
                              <div className="flex items-center space-x-2">
                                <span>{feedType.name}</span>
                                {feedType.feed_category_id && (
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ 
                                      backgroundColor: feedTypeCategories.find(cat => cat.id === feedType.feed_category_id)?.color || '#gray' 
                                    }}
                                  />
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {feedType.totalStock.toFixed(1)}kg
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                          {availableFeedTypes.length === 0 && (
                            <SelectItem value="no-stock" disabled>
                              No feeds with stock available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {errors.feedType && <p className="text-sm text-red-600 mt-1">{errors.feedType}</p>}
                    </div>

                    <div>
                      <Label htmlFor="batchQuantity">Amount per Cow (kg) *</Label>
                      <Input
                        id="batchQuantity"
                        type="number"
                        step="0.1"
                        min="0"
                        value={perCowQuantity}
                        onChange={(e) => setPerCowQuantity(e.target.value)}
                        placeholder="Enter amount per cow this session"
                        className={errors.perCowQuantity ? 'border-red-300' : ''}
                      />
                      {errors.perCowQuantity && <p className="text-sm text-red-600 mt-1">{errors.perCowQuantity}</p>}
                      {perCowQuantity && animalCount && (
                        <p className="text-xs text-gray-500 mt-1">
                          Total this session: {(parseFloat(perCowQuantity) * animalCount).toFixed(1)}kg
                        </p>
                      )}
                    </div>
                  </div>

                  <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                    <div>
                      <Label htmlFor="animalCount">Number of Animals *</Label>
                      <Input
                        id="animalCount"
                        type="number"
                        min="1"
                        value={animalCount}
                        onChange={(e) => setAnimalCount(parseInt(e.target.value) || 1)}
                        placeholder="Enter animal count"
                        className={errors.animalCount ? 'border-red-300' : ''}
                      />
                      {errors.animalCount && <p className="text-sm text-red-600 mt-1">{errors.animalCount}</p>}
                      {selectedConsumptionBatch?.targeted_animals_count && (
                        <p className="text-xs text-blue-600 mt-1">
                          <Info className="w-3 h-3 inline mr-1" />
                          Batch template targets {selectedConsumptionBatch.targeted_animals_count} animals
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="batchFeedingTime">Feeding Time</Label>
                      <Input
                        id="batchFeedingTime"
                        type="time"
                        value={feedingTime}
                        onChange={(e) => setFeedingTime(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Batch Selection - Second */}
              <Card>
                <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                  <CardTitle className={`${isMobileView ? 'text-lg' : ''}`}>Select Animal Batch</CardTitle>
                  <CardDescription className={`${isMobileView ? 'text-sm' : ''}`}>
                    Choose a consumption batch to compare against recommended feeding guidelines
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="batch">Consumption Batch *</Label>
                    <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                      <SelectTrigger className={errors.batch ? 'border-red-300' : ''}>
                        <SelectValue placeholder="Select a consumption batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {consumptionBatches.filter(batch => batch.is_active).map(batch => (
                          <SelectItem key={batch.id} value={batch.id}>
                            <div className="flex flex-col">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{batch.batch_name}</span>
                                {batch.targeted_animals_count && (
                                  <Badge variant="secondary" className="text-xs">
                                    {batch.targeted_animals_count} animals
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {(batch.feed_type_categories || []).length} feed categories • {batch.feeding_frequency_per_day}x daily
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.batch && <p className="text-sm text-red-600 mt-1">{errors.batch}</p>}
                  </div>

                  {/* Batch Details */}
                  {selectedConsumptionBatch && (
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <div className="flex items-start space-x-3">
                        <Utensils className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-blue-900">{selectedConsumptionBatch.batch_name}</h4>
                            {selectedConsumptionBatch.targeted_animals_count && (
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-blue-700 border-blue-300">
                                  <Users className="w-3 h-3 mr-1" />
                                  {selectedConsumptionBatch.targeted_animals_count} targeted
                                </Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowBatchAnimals(!showBatchAnimals)}
                                  className="text-blue-600 hover:text-blue-700 p-1 h-6"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  {showBatchAnimals ? 'Hide' : 'View'} Animals
                                  {showBatchAnimals ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                                </Button>
                              </div>
                            )}
                          </div>

                          {selectedConsumptionBatch.description && (
                            <p className="text-sm text-blue-700 mb-3">{selectedConsumptionBatch.description}</p>
                          )}
                          
                          <div className="space-y-2">
                            <div className="text-sm text-blue-700">
                              <strong>Feed Categories:</strong>
                            </div>
                            {(selectedConsumptionBatch.feed_type_categories || []).map(fc => {
                              const category = feedTypeCategories.find(cat => cat.id === fc.category_id)
                              return (
                                <div key={fc.category_id} className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: category?.color || '#gray' }}
                                  />
                                  <span className="text-sm text-blue-700">
                                    {category?.name}: {fc.quantity_kg} {fc.unit} per animal per feeding
                                  </span>
                                </div>
                              )
                            })}
                            
                            <div className="text-sm text-blue-700 mt-3">
                              <strong>Schedule:</strong> {selectedConsumptionBatch.feeding_frequency_per_day}x daily
                              {(selectedConsumptionBatch.feeding_times || []).length > 0 && (
                                <span> at {(selectedConsumptionBatch.feeding_times || []).join(', ')}</span>
                              )}
                            </div>

                            {/* Animal targeting breakdown */}
                            {selectedConsumptionBatch.target_mode && (
                              <div className="text-sm text-blue-700">
                                <strong>Targeting:</strong>{' '}
                                {selectedConsumptionBatch.target_mode === 'category' && 'Category-based'}
                                {selectedConsumptionBatch.target_mode === 'specific' && 'Specific animals'}
                                {selectedConsumptionBatch.target_mode === 'mixed' && (
                                  <span>
                                    Mixed ({selectedConsumptionBatch.category_animals_count || 0} from categories, {selectedConsumptionBatch.specific_animals_count || 0} specific)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Batch Animals List */}
                  {showBatchAnimals && selectedConsumptionBatch && (
                    <Card className="border-blue-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-blue-900 flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>Targeted Animals ({batchTargetedAnimals.length})</span>
                          {batchAnimalsLoading && <LoadingSpinner size="sm" />}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {batchAnimalsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <LoadingSpinner size="md" />
                            <span className="ml-2 text-sm text-gray-600">Loading animals...</span>
                          </div>
                        ) : batchTargetedAnimals.length > 0 ? (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {batchTargetedAnimals.map((animal) => (
                              <div key={animal.animal_id} className="flex items-center justify-between p-2 bg-white border rounded-lg text-sm">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-900">#{animal.tag_number}</span>
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
                                  </div>
                                  <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                                    <span>Age: {formatAge(animal.age_days)}</span>
                                    {animal.production_status && (
                                      <span>Status: {animal.production_status}</span>
                                    )}
                                    {animal.days_in_milk && (
                                      <span>DIM: {animal.days_in_milk}</span>
                                    )}
                                    {animal.current_daily_production && (
                                      <span>Prod: {animal.current_daily_production}L/day</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <Users className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                            <p className="text-sm">No animals targeted in this batch</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              {/* Quantity Analysis - Third */}
              {quantityAnalysis && !isEditMode && (
                <Card className={`border-2 ${getStatusColor(quantityAnalysis.sessionStatus)}`}>
                  <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                    <CardTitle className={`${isMobileView ? 'text-lg' : ''} flex items-center space-x-2`}>
                      {getStatusIcon(quantityAnalysis.sessionStatus)}
                      <span>Daily Feeding Analysis</span>
                      <Badge variant="outline" className="ml-auto">
                        {quantityAnalysis.sessionPerformance}% of session target
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Session {1} of {quantityAnalysis.feedingFrequency} daily feedings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* This Session Performance */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">This Session Performance</h4>
                      <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {quantityAnalysis.recommendedThisSession.toFixed(1)}kg
                          </div>
                          <div className="text-sm text-gray-600">Recommended This Session</div>
                          <div className="text-xs text-gray-500">
                            ({quantityAnalysis.recommendedPerCow.toFixed(1)}kg per cow)
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {quantityAnalysis.actualThisSession.toFixed(1)}kg
                          </div>
                          <div className="text-sm text-gray-600">Actual This Session</div>
                          <div className="text-xs text-gray-500">
                            ({quantityAnalysis.actualPerCow.toFixed(1)}kg per cow)
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${
                            quantityAnalysis.sessionStatus === 'under' ? 'text-red-600' :
                            quantityAnalysis.sessionStatus === 'over' ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {quantityAnalysis.sessionVariance >= 0 ? '+' : ''}{quantityAnalysis.sessionVariance.toFixed(1)}kg
                          </div>
                          <div className="text-sm text-gray-600">Variance</div>
                        </div>
                      </div>
                    </div>

                    {/* Daily Planning */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Daily Planning Overview</h4>
                      <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                        <div>
                          <div className="text-lg font-bold text-gray-900">
                            {quantityAnalysis.recommendedDailyTotal.toFixed(1)}kg
                          </div>
                          <div className="text-sm text-gray-600">Total Daily Target</div>
                          <div className="text-xs text-gray-500">
                            {quantityAnalysis.recommendedPerCowDaily.toFixed(1)}kg per cow across {quantityAnalysis.feedingFrequency} sessions
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-lg font-bold text-purple-600">
                            {quantityAnalysis.suggestedRemainingTotal.toFixed(1)}kg
                          </div>
                          <div className="text-sm text-gray-600">
                            Suggested for {quantityAnalysis.remainingSessionsToday} Remaining Sessions
                          </div>
                          <div className="text-xs text-gray-500">
                            {quantityAnalysis.remainingSessionsToday > 0 
                              ? `${(quantityAnalysis.suggestedRemainingTotal / quantityAnalysis.remainingSessionsToday / animalCount).toFixed(1)}kg per cow per session`
                              : 'No more sessions today'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-white rounded border">
                      <div className="flex items-center space-x-2 mb-2">
                        <Tags className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">Feed Category:</span>
                        <span className="text-sm text-gray-600">{quantityAnalysis.categoryName}</span>
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: feedTypeCategories.find(cat => cat.id === quantityAnalysis.categoryId)?.color || '#gray' }}
                        />
                      </div>
                    </div>

                    {/* Action Recommendations */}
                    <div className="mt-4">
                      {quantityAnalysis.sessionStatus === 'under' ? (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800">
                            <strong>Under-fed this session:</strong> Consider increasing next feeding by {Math.abs(quantityAnalysis.sessionVariance / quantityAnalysis.remainingSessionsToday || 0).toFixed(1)}kg total 
                            ({Math.abs(quantityAnalysis.sessionVariance / quantityAnalysis.remainingSessionsToday / animalCount || 0).toFixed(1)}kg per cow) to meet daily targets.
                          </AlertDescription>
                        </Alert>
                      ) : quantityAnalysis.sessionStatus === 'over' ? (
                        <Alert className="border-orange-200 bg-orange-50">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <AlertDescription className="text-orange-800">
                            <strong>Over-fed this session:</strong> You can reduce next feedings by {Math.abs(quantityAnalysis.sessionVariance / quantityAnalysis.remainingSessionsToday || 0).toFixed(1)}kg total 
                            ({Math.abs(quantityAnalysis.sessionVariance / quantityAnalysis.remainingSessionsToday / animalCount || 0).toFixed(1)}kg per cow) to maintain daily balance.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert className="border-green-200 bg-green-50">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            <strong>Perfect session feeding!</strong> Continue with {quantityAnalysis.recommendedPerCow.toFixed(1)}kg per cow for remaining sessions.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Notes */}
          <Card>
            <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
              <CardTitle className={`${isMobileView ? 'text-lg' : ''}`}>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about this feeding session..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          {((feedingMode === 'individual' && selectedFeedType && quantity) || 
            (feedingMode === 'batch' && selectedBatch && selectedFeedType && perCowQuantity)) && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                <CardTitle className={`${isMobileView ? 'text-lg' : ''} text-green-800 flex items-center space-x-2`}>
                  <Calculator className="w-5 h-5" />
                  <span>Feeding Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid ${isMobileView ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {getTotalQuantity().toFixed(1)}kg
                    </div>
                    <div className="text-sm text-green-700">Total Feed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {getTotalAnimals()}
                    </div>
                    <div className="text-sm text-green-700">Animals</div>
                  </div>
                  {!isMobileView && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {feedingTime}
                      </div>
                      <div className="text-sm text-green-700">Feeding Time</div>
                    </div>
                  )}
                </div>
                
                {feedingMode === 'batch' && selectedConsumptionBatch && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <div className="flex items-center justify-between text-sm text-green-700">
                      <div className="flex items-center space-x-2">
                        <Utensils className="w-4 h-4" />
                        <span>Using batch: <strong>{selectedConsumptionBatch.batch_name}</strong></span>
                      </div>
                      {batchTargetedAnimals.length > 0 && (
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          {batchTargetedAnimals.length} targeted animals
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error Alert */}
          {errors.submit && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                {errors.submit}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Buttons */}
          <div className={`flex ${isMobileView ? 'flex-col space-y-3' : 'flex-row space-x-4'} pt-4`}>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`${isMobileView ? 'w-full' : 'flex-1'} h-12`}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isEditMode ? 'Updating...' : 'Recording...'}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  {isEditMode ? <Edit3 className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                  <span>{isEditMode ? 'Update Feeding' : 'Record Feeding'}</span>
                </div>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className={`${isMobileView ? 'w-full' : ''} h-12`}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}