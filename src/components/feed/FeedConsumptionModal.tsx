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
  AlertCircle,
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
  Info,
  Trash2,
  Leaf,
  Zap,
  BarChart3
} from 'lucide-react'

interface FeedCategoryQuantity {
  category_id: string
  quantity_kg: number
  unit: 'kg' | 'grams'
}

interface FeedMixRecipe {
  id: string
  farm_id: string
  name: string
  description: string | null
  ingredients: any
  target_nutrition: any
  applicable_conditions: any
  is_seasonal: boolean
  applicable_seasons: string[] | null
  estimated_cost_per_day: number | null
  estimated_milk_yield_liters: number | null
  active: boolean
  created_by: string | null
  created_at: string | null
  updated_by: string | null
  updated_at: string | null
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
  feedMixRecipes?: FeedMixRecipe[]
  isMobile?: boolean
  editingRecord?: any
}

interface ConsumptionEntry {
  feedTypeId: string
  quantityKg: number
  animalIds: string[]
  notes?: string
}

interface FeedItem {
  id: string
  feed_type_id: string
  feed_name: string
  quantity_kg: number
  cost_per_kg: number
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
  feedMixRecipes = [],
  isMobile = false,
  editingRecord
}: FeedConsumptionModalProps) {
  const [feedingMode, setFeedingMode] = useState<'individual' | 'batch' | 'feed-mix-template'>('individual')
  const [feedingDate, setFeedingDate] = useState(new Date().toISOString().split('T')[0])
  const [feedingTime, setFeedingTime] = useState(new Date().toTimeString().slice(0, 5))
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [selectedFeedMixRecipe, setSelectedFeedMixRecipe] = useState<string>('')
  const [feeds, setFeeds] = useState<FeedItem[]>([])
  const [selectedFeedType, setSelectedFeedType] = useState('')
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([])
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [multipleEntries, setMultipleEntries] = useState<ConsumptionEntry[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [animalCount, setAnimalCount] = useState<number>(1)
  const [perCowQuantity, setPerCowQuantity] = useState('')
  const [appetiteScore, setAppetiteScore] = useState<number | null>(null)
  const [wasteKg, setWasteKg] = useState('')
  const [observationNotes, setObservationNotes] = useState('')

  // New states for batch animal targeting
  const [batchAnimalsLoading, setBatchAnimalsLoading] = useState(false)
  const [batchTargetedAnimals, setBatchTargetedAnimals] = useState<BatchTargetedAnimal[]>([])
  const [showBatchAnimals, setShowBatchAnimals] = useState(false)
  const [showBatchFeedCategories, setShowBatchFeedCategories] = useState(false)
  const [showFeedCategoryAnalysis, setShowFeedCategoryAnalysis] = useState(false)
  const [expandedFeeds, setExpandedFeeds] = useState<Set<string>>(new Set())
  const [expandedRecipeDetails, setExpandedRecipeDetails] = useState(false)
  const [recipeAnimalWeights, setRecipeAnimalWeights] = useState<Record<string, number>>({})

  // State for feed mix recipes
  const [loadedFeedMixRecipes, setLoadedFeedMixRecipes] = useState<FeedMixRecipe[]>(feedMixRecipes)

  const { isMobile: deviceIsMobile } = useDeviceInfo()
  const isMobileView = isMobile || deviceIsMobile
  const isEditMode = !!editingRecord

  // Get available feed types with inventory
  const availableFeedTypes = useMemo(() => {
    const feedTypesWithStock = feedTypes.map(feedType => {
      // Get all inventory items for this feed type
      const inventoryItems = inventory.filter(item => item.feed_type_id === feedType.id)
      
      // Calculate total available stock
      const totalStock = inventoryItems.reduce((sum, item) => sum + item.quantity_kg, 0)
      
      // Calculate average cost per kg from inventory records (excluding null values)
      const validCosts = inventoryItems
        .filter(item => item.cost_per_kg != null && item.cost_per_kg > 0)
        .map(item => item.cost_per_kg)
      
      const averageCostPerKg = validCosts.length > 0 
        ? validCosts.reduce((sum, cost) => sum + cost, 0) / validCosts.length
        : feedType.typical_cost_per_kg || 0
      
      return {
        ...feedType,
        totalStock,
        hasStock: totalStock > 0 || isEditMode,
        costPerKg: averageCostPerKg, // Use average cost from inventory
        inventoryItems // Include inventory items for reference
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

  // Fetch feed mix recipes if not provided as prop
  useEffect(() => {
    if (isOpen && loadedFeedMixRecipes.length === 0 && feedMixRecipes.length === 0) {
      const fetchRecipes = async () => {
        try {
          const response = await fetch(`/api/farms/${farmId}/feed-mix-recipes?active=true`)
          if (response.ok) {
            const result = await response.json()
            setLoadedFeedMixRecipes(result.data || [])
          }
        } catch (error) {
          console.error('Error fetching feed mix recipes:', error)
        }
      }
      fetchRecipes()
    } else if (feedMixRecipes.length > 0) {
      setLoadedFeedMixRecipes(feedMixRecipes)
    }
  }, [isOpen, farmId, feedMixRecipes])

  // Format age helper function
  const formatAge = (ageDays: number | null) => {
    if (!ageDays) return 'Unknown'
    if (ageDays < 30) return `${ageDays} days`
    if (ageDays < 365) return `${Math.floor(ageDays / 30)} months`
    const years = Math.floor(ageDays / 365)
    const months = Math.floor((ageDays % 365) / 30)
    return `${years}y ${months}m`
  }

  // Check if we should show animal observations (only if 2+ hours after feeding time)
  const shouldShowObservations = () => {
    try {
      const feedingDateTime = new Date(`${feedingDate}T${feedingTime}`)
      const now = new Date()
      const diffMs = now.getTime() - feedingDateTime.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      return diffHours >= 2
    } catch {
      return false
    }
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

  // Calculate feed category analysis for batch mode
  const feedCategoryAnalysis = useMemo(() => {
    if (feedingMode !== 'batch' || !selectedConsumptionBatch || !selectedConsumptionBatch.feed_type_categories) {
      return []
    }

    return selectedConsumptionBatch.feed_type_categories.map(batchCategory => {
      const categoryInfo = feedTypeCategories.find(cat => cat.id === batchCategory.category_id)
      
      // Expected quantity per session
      const expectedQtyInKg = batchCategory.unit === 'grams' 
        ? batchCategory.quantity_kg / 1000 
        : batchCategory.quantity_kg
      const totalExpectedQty = expectedQtyInKg * animalCount
      
      // Find all feeds from feed types that belong to this category and sum their quantities
      // Feed types are linked to categories via their category_id property
      const feedsInCategory = feeds.filter(feed => {
        const feedTypeInfo = availableFeedTypes.find(ft => ft.id === feed.feed_type_id)
        return feedTypeInfo?.category_id === batchCategory.category_id
      })
      
      const actualQty = feedsInCategory.reduce((sum, feed) => sum + feed.quantity_kg, 0)
      const variance = actualQty - totalExpectedQty
      
      // Determine status
      let status: 'under' | 'over' | 'perfect' = 'perfect'
      if (variance < -0.1) status = 'under'
      else if (variance > 0.1) status = 'over'
      
      return {
        categoryId: batchCategory.category_id,
        categoryName: categoryInfo?.name || 'Unknown',
        expectedQty: totalExpectedQty,
        actualQty: actualQty,
        variance: variance,
        status,
        percentage: totalExpectedQty > 0 ? (actualQty / totalExpectedQty) * 100 : 0
      }
    })
  }, [feedingMode, selectedConsumptionBatch, feeds, availableFeedTypes, feedTypeCategories, animalCount])

  // Get animals matching the selected feed mix recipe's applicable conditions
  const recipeMatchingAnimals = useMemo(() => {
    if (!selectedFeedMixRecipe || selectedFeedMixRecipe === 'no-recipes') {
      return []
    }

    const selectedRecipe = loadedFeedMixRecipes.find(r => r.id === selectedFeedMixRecipe)
    if (!selectedRecipe || !selectedRecipe.applicable_conditions?.production_statuses) {
      return animals
    }

    const applicableStatuses = selectedRecipe.applicable_conditions.production_statuses
    return animals.filter(animal => applicableStatuses.includes(animal.production_status))
  }, [selectedFeedMixRecipe, loadedFeedMixRecipes, animals])

  // Calculate total daily cost based on recipe animals' feeding weights
  const recipeTotalCostPerDay = useMemo(() => {
    if (!selectedFeedMixRecipe || selectedFeedMixRecipe === 'no-recipes') {
      return 0
    }

    const selectedRecipe = loadedFeedMixRecipes.find(r => r.id === selectedFeedMixRecipe)
    if (!selectedRecipe || !selectedRecipe.ingredients) {
      return 0
    }

    let totalCost = 0

    // Iterate through each animal that has a weight entered
    recipeMatchingAnimals.forEach(animal => {
      const animalWeight = recipeAnimalWeights[animal.id] || 0
      if (animalWeight <= 0) return // Skip animals with no weight

      // Calculate cost for each ingredient for this animal
      selectedRecipe.ingredients.forEach((ingredient: any) => {
        const feedAmount = (animalWeight * ingredient.percentage_of_mix) / 100
        const feedTypeInfo = availableFeedTypes.find(ft => ft.id === ingredient.feed_type_id)
        const costPerKg = feedTypeInfo?.costPerKg || 0
        const ingredientCost = feedAmount * costPerKg
        totalCost += ingredientCost
      })
    })

    return totalCost
  }, [selectedFeedMixRecipe, loadedFeedMixRecipes, recipeAnimalWeights, recipeMatchingAnimals, availableFeedTypes])

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
    setFeedingDate(new Date().toISOString().split('T')[0])
    setFeedingTime(new Date().toTimeString().slice(0, 5))
    setSelectedBatch('')
    setSelectedFeedMixRecipe('')
    setFeeds([])
    setSelectedFeedType('')
    setSelectedAnimals([])
    setQuantity('')
    setPerCowQuantity('')
    setNotes('')
    setErrors({})
    setMultipleEntries([])
    setShowAdvanced(false)
    setAnimalCount(1)
    setBatchTargetedAnimals([])
    setShowBatchAnimals(false)
    setShowBatchFeedCategories(false)
    setShowFeedCategoryAnalysis(false)
    setExpandedFeeds(new Set())
    setExpandedRecipeDetails(false)
    setRecipeAnimalWeights({})
    setAppetiteScore(null)
    setWasteKg('')
    setObservationNotes('')
  }

  const handleAddFeed = () => {
    if (feedingMode === 'individual') {
      if (!selectedFeedType || !quantity || selectedAnimals.length === 0) {
        setErrors({ ...errors, feed: 'Please complete feed details before adding' })
        return
      }
    } else if (feedingMode === 'batch') {
      if (!selectedFeedType || !perCowQuantity) {
        setErrors({ ...errors, feed: 'Please select feed type and quantity' })
        return
      }
    }

    const selectedFeedTypeInfo = availableFeedTypes.find(f => f.id === selectedFeedType)
    
    const newFeed: FeedItem = {
      id: `feed-${Date.now()}`,
      feed_type_id: selectedFeedType,
      feed_name: selectedFeedTypeInfo?.name || '',
      quantity_kg: feedingMode === 'individual' ? parseFloat(quantity) : parseFloat(perCowQuantity) * animalCount,
      cost_per_kg: selectedFeedTypeInfo?.costPerKg || 0, // Use costPerKg derived from inventory
      notes: feedingMode === 'individual' ? '' : `${animalCount} animals @ ${perCowQuantity}kg/animal`
    }

    setFeeds([...feeds, newFeed])
    setSelectedFeedType('')
    setQuantity('')
    setPerCowQuantity('')
    setErrors({})
  }

  const handleRemoveFeed = (feedId: string) => {
    setFeeds(feeds.filter(f => f.id !== feedId))
    // Also remove from expanded set if it was expanded
    setExpandedFeeds(prev => {
      const newSet = new Set(prev)
      newSet.delete(feedId)
      return newSet
    })
  }

  const toggleFeedExpanded = (feedId: string) => {
    setExpandedFeeds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(feedId)) {
        newSet.delete(feedId)
      } else {
        newSet.add(feedId)
      }
      return newSet
    })
  }

  const handleFeedChange = (feedId: string, field: string, value: any) => {
    setFeeds(feeds.map(f => {
      if (f.id === feedId) {
        if (field === 'feed_type_id') {
          const selectedFeed = availableFeedTypes.find(af => af.id === value)
          return {
            ...f,
            feed_type_id: value,
            feed_name: selectedFeed?.name || '',
            cost_per_kg: selectedFeed?.costPerKg || 0
          }
        }
        return { ...f, [field]: value }
      }
      return f
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!feedingDate) {
      newErrors.feedingDate = 'Please select a feeding date'
    }

    if (feedingMode === 'feed-mix-template') {
      // Feed mix template mode validation
      if (!selectedFeedMixRecipe) {
        newErrors.feedMixRecipe = 'Please select a feed mix recipe'
      }

      if (recipeMatchingAnimals.length === 0) {
        newErrors.feedMixRecipe = 'No animals match the recipe conditions'
      }

      // Check if at least one animal has a weight entered
      const hasWeightEntered = recipeMatchingAnimals.some(animal => recipeAnimalWeights[animal.id] && recipeAnimalWeights[animal.id] > 0)
      if (!hasWeightEntered) {
        newErrors.recipeWeights = 'Please enter feeding weight for at least one animal'
      }
    } else {
      // Individual and Batch mode validation
      if (feeds.length === 0) {
        newErrors.feeds = 'Please add at least one feed to this session'
      }

      if (feedingMode === 'individual' && selectedAnimals.length === 0) {
        newErrors.animals = 'Please select at least one animal'
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

  const calculateNutritionalSummary = () => {
    const totalQuantity = feeds.reduce((sum, f) => sum + f.quantity_kg, 0)
    const totalCost = feeds.reduce((sum, f) => sum + (f.quantity_kg * f.cost_per_kg), 0)
    
    // Basic nutritional estimates
    const nutritionByFeed = feeds.map(f => {
      const feedInfo = availableFeedTypes.find(af => af.id === f.feed_type_id)
      return {
        feedName: f.feed_name,
        quantity: f.quantity_kg,
        estProtein: f.quantity_kg * 0.12, // ~12% default
        estEnergy: f.quantity_kg * 8.5, // ~8.5 MJ/kg default
      }
    })

    const totalProtein = nutritionByFeed.reduce((sum, n) => sum + n.estProtein, 0)
    const totalEnergy = nutritionByFeed.reduce((sum, n) => sum + n.estEnergy, 0)

    return {
      totalQuantity,
      totalCost,
      totalProtein,
      totalEnergy,
      feedCount: feeds.length
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      // Create proper timestamp from feeding date and time
      const feedingDateTime = new Date(`${feedingDate}T${feedingTime}`)
      const feedingTimestamp = feedingDateTime.toISOString()

      let consumptionData: any = {
        farmId,
        feedingDate,
        feedingTime: feedingTimestamp,
        mode: feedingMode === 'feed-mix-template' ? 'feed-mix-recipe' : feedingMode,
        type: feedingMode === 'feed-mix-template' ? 'recipe' : 'manual',
        // Include observation fields for all modes
        appetiteScore: appetiteScore,
        approximateWasteKg: wasteKg ? parseFloat(wasteKg) : null,
        observationalNotes: observationNotes
      }

      if (feedingMode === 'feed-mix-template') {
        // Feed Mix Template mode - build entries from recipe ingredients
        const selectedRecipe = loadedFeedMixRecipes.find(r => r.id === selectedFeedMixRecipe)
        
        if (!selectedRecipe || !selectedRecipe.ingredients) {
          throw new Error('Selected recipe not found or has no ingredients')
        }

        consumptionData.feedMixRecipeId = selectedFeedMixRecipe
        consumptionData.animalCount = recipeMatchingAnimals.length

        // Build entries from recipe ingredients with animal weights
        const entries: any[] = []
        selectedRecipe.ingredients.forEach((ingredient: any) => {
          let totalQuantity = 0
          const animalWeightsList: any[] = []

          // Calculate total quantity across all animals
          recipeMatchingAnimals.forEach(animal => {
            const animalWeight = recipeAnimalWeights[animal.id] || 0
            if (animalWeight > 0) {
              const feedAmount = (animalWeight * ingredient.percentage_of_mix) / 100
              totalQuantity += feedAmount
              animalWeightsList.push({
                animal_id: animal.id,
                weight_kg: animalWeight,
                feed_amount_kg: feedAmount
              })
            }
          })

          if (totalQuantity > 0) {
            entries.push({
              feedTypeId: ingredient.feed_type_id,
              feedName: ingredient.feed_name,
              percentage: ingredient.percentage_of_mix,
              quantityKg: totalQuantity,
              costPerKg: availableFeedTypes.find(ft => ft.id === ingredient.feed_type_id)?.costPerKg || 0
            })
          }
        })

        consumptionData.entries = entries

        // Build detailed observations for recipe mode
        consumptionData.observations = {
          recipe_id: selectedFeedMixRecipe,
          recipe_name: selectedRecipe.name,
          animal_count: recipeMatchingAnimals.length,
          animal_weights: recipeAnimalWeights,
          matching_animals: recipeMatchingAnimals.map(a => ({
            animal_id: a.id,
            name: a.name,
            tag_number: a.tag_number,
            weight_kg: recipeAnimalWeights[a.id] || 0
          })),
          total_cost_per_day: recipeTotalCostPerDay,
          ingredients: selectedRecipe.ingredients.map((ing: any) => ({
            feed_type_id: ing.feed_type_id,
            feed_name: ing.feed_name,
            percentage: ing.percentage_of_mix
          }))
        }
      } else {
        // Individual or Batch mode - convert feeds array to entries
        const entries = feeds.map(feed => ({
          feedTypeId: feed.feed_type_id,
          quantityKg: feed.quantity_kg,
          costPerKg: feed.cost_per_kg,
          notes: feed.notes
        }))

        if (feedingMode === 'individual') {
          consumptionData.entries = entries.map(e => ({
            ...e,
            animalIds: selectedAnimals
          }))
          consumptionData.animalCount = selectedAnimals.length
          
          // Build observations for individual mode
          consumptionData.observations = {
            animals: selectedAnimals.map(id => ({
              animal_id: id,
              appetite_observation: appetiteScore ? `Score: ${appetiteScore}` : null
            }))
          }
        } else if (feedingMode === 'batch') {
          consumptionData.entries = entries.map(e => ({
            ...e,
            animalCount: animalCount
          }))
          consumptionData.batchId = selectedBatch
          consumptionData.animalCount = animalCount
          
          // Build observations for batch mode
          consumptionData.observations = {
            batch_id: selectedBatch,
            batch_performance: appetiteScore ? (appetiteScore >= 4 ? 'excellent' : appetiteScore >= 3 ? 'good' : 'poor') : 'neutral'
          }
        }
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
      className={`${isMobileView ? 'max-w-full mx-4 my-4 h-[95vh] flex flex-col' : 'max-w-4xl max-h-[90vh] flex flex-col'}`}
    >
      {/* Fixed Header - Not Scrollable */}
      <div className={`${isMobileView ? 'p-4' : 'p-6'} flex items-center justify-between border-b border-gray-200 flex-shrink-0`}>
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
        <Button variant="ghost" onClick={onClose} size="sm" className="flex-shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className={`${isMobileView ? 'p-4' : 'p-6'}`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feeding Date & Time */}
          <Card>
            <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
              <CardTitle className={`${isMobileView ? 'text-lg' : ''} flex items-center space-x-2`}>
                <Clock className="w-5 h-5" />
                <span>Feeding Date & Time</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <div>
                  <Label htmlFor="feedingDate">Feeding Date *</Label>
                  <Input
                    id="feedingDate"
                    type="date"
                    value={feedingDate}
                    onChange={(e) => setFeedingDate(e.target.value)}
                    className={errors.feedingDate ? 'border-red-300 mt-1' : 'mt-1'}
                  />
                  {errors.feedingDate && <p className="text-sm text-red-600 mt-1">{errors.feedingDate}</p>}
                </div>
                <div>
                  <Label htmlFor="feedingTime">Feeding Time *</Label>
                  <Input
                    id="feedingTime"
                    type="time"
                    value={feedingTime}
                    onChange={(e) => setFeedingTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

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
                <TabsList className={`grid w-full ${isMobileView ? 'grid-cols-3 text-xs' : 'grid-cols-3'}`}>
                  <TabsTrigger value="individual" className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{isMobileView ? 'Individual' : 'Individual'}</span>
                  </TabsTrigger>
                  <TabsTrigger value="batch" className="flex items-center space-x-1">
                    <Utensils className="w-4 h-4" />
                    <span>{isMobileView ? 'Batch' : 'Batch Template'}</span>
                  </TabsTrigger>
                  <TabsTrigger value="feed-mix-template" className="flex items-center space-x-1">
                    <Leaf className="w-4 h-4" />
                    <span>{isMobileView ? 'Mix Template' : 'Feed Mix Template'}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Individual & Batch Feed Details with Multi-Feed Support */}
          {(feedingMode === 'individual' || feedingMode === 'batch') && (
            <div className="space-y-6">
              {/* Batch Mode - Select Batch Card (comes before Feed Details) */}
              {feedingMode === 'batch' && (
                <Card>
                  <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                    <CardTitle className={`${isMobileView ? 'text-lg' : ''} flex items-center space-x-2`}>
                      <Target className="w-5 h-5 text-purple-600" />
                      <span>Select Consumption Batch</span>
                    </CardTitle>
                    <CardDescription>Choose a batch template to apply to this feeding session</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select value={selectedBatch} onValueChange={(value) => setSelectedBatch(value)}>
                      <SelectTrigger className={errors.animalCount ? 'border-red-300' : ''}>
                        <SelectValue placeholder="Choose a batch template" />
                      </SelectTrigger>
                      <SelectContent>
                        {consumptionBatches.map(batch => (
                          <SelectItem key={batch.id} value={batch.id}>
                            <div className="flex items-center space-x-2">
                              <span>{batch.batch_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {batch.targeted_animals_count || 0} animals
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                        {consumptionBatches.length === 0 && (
                          <SelectItem value="no-batches" disabled>
                            No consumption batches created
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {errors.animalCount && <p className="text-sm text-red-600 mt-2">{errors.animalCount}</p>}
                  </CardContent>
                </Card>
              )}

              {/* Batch Info Card (only show when batch is selected) */}
              {feedingMode === 'batch' && selectedConsumptionBatch && (
                <div className="border border-blue-200 rounded-lg bg-blue-50 overflow-hidden">
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-blue-700 font-medium">Batch</p>
                        <p className="text-blue-900 font-semibold">{selectedConsumptionBatch.batch_name}</p>
                      </div>
                      <div>
                        <p className="text-blue-700 font-medium">Target Animals</p>
                        <p className="text-blue-900 font-semibold">{selectedConsumptionBatch.targeted_animals_count || animalCount}</p>
                      </div>
                      <div>
                        <p className="text-blue-700 font-medium">Feeding Frequency</p>
                        <p className="text-blue-900 font-semibold">{selectedConsumptionBatch.feeding_frequency_per_day}x daily</p>
                      </div>
                    </div>

                    {/* Animals List Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowBatchAnimals(!showBatchAnimals)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-blue-100 hover:bg-blue-150 rounded border border-blue-300 text-sm font-medium text-blue-900 transition-colors"
                    >
                      <span className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>View Animals in Batch</span>
                      </span>
                      {showBatchAnimals ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {/* Feed Categories Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowBatchFeedCategories(!showBatchFeedCategories)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-amber-100 hover:bg-amber-150 rounded border border-amber-300 text-sm font-medium text-amber-900 transition-colors mt-2"
                    >
                      <span className="flex items-center space-x-2">
                        <Leaf className="w-4 h-4" />
                        <span>View Feed Categories & Quantities</span>
                      </span>
                      {showBatchFeedCategories ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Animals List */}
                  {showBatchAnimals && (
                    <div className="border-t border-blue-200 bg-white">
                      {batchAnimalsLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <LoadingSpinner size="sm" />
                          <span className="ml-2 text-sm text-gray-600">Loading animals...</span>
                        </div>
                      ) : batchTargetedAnimals.length > 0 ? (
                        <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-2 p-4`}>
                          {batchTargetedAnimals.map((animal) => (
                            <div
                              key={animal.animal_id}
                              className="p-3 border border-blue-100 rounded-lg bg-gradient-to-br from-blue-50 to-transparent hover:border-blue-300 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">
                                    {animal.name || `Animal #${animal.tag_number}`}
                                  </p>
                                  <p className="text-xs text-gray-500">Tag: {animal.tag_number}</p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-xs whitespace-nowrap ${
                                    animal.source === 'specific'
                                      ? 'border-purple-300 bg-purple-50 text-purple-700'
                                      : 'border-blue-300 bg-blue-50 text-blue-700'
                                  }`}
                                >
                                  {animal.source === 'specific' ? 'Specific' : 'Category'}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-gray-600">Gender</p>
                                  <p className="font-medium text-gray-900">
                                    {animal.gender ? animal.gender.charAt(0).toUpperCase() + animal.gender.slice(1) : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Status</p>
                                  <p className="font-medium text-gray-900">
                                    {animal.production_status || 'Active'}
                                  </p>
                                </div>
                                {animal.age_days && (
                                  <div>
                                    <p className="text-gray-600">Age</p>
                                    <p className="font-medium text-gray-900">{formatAge(animal.age_days)}</p>
                                  </div>
                                )}
                                {animal.days_in_milk && (
                                  <div>
                                    <p className="text-gray-600">DIM</p>
                                    <p className="font-medium text-gray-900">{animal.days_in_milk}d</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No animals match the batch criteria</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expanded Feed Categories List */}
                  {showBatchFeedCategories && (
                    <div className="border-t border-amber-200 bg-white">
                      {selectedConsumptionBatch.feed_type_categories && selectedConsumptionBatch.feed_type_categories.length > 0 ? (
                        <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-3 p-4`}>
                          {selectedConsumptionBatch.feed_type_categories.map((feedCat) => {
                            const categoryDetails = feedTypeCategories.find(cat => cat.id === feedCat.category_id)
                            const quantityInKg = feedCat.unit === 'grams' ? feedCat.quantity_kg / 1000 : feedCat.quantity_kg
                            
                            return (
                              <div
                                key={feedCat.category_id}
                                className="p-3 border border-amber-100 rounded-lg bg-gradient-to-br from-amber-50 to-transparent hover:border-amber-300 transition-colors"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900">
                                      {categoryDetails?.name || 'Unknown Category'}
                                    </p>
                                    <p className="text-xs text-gray-500 line-clamp-2">
                                      {categoryDetails?.description || 'No description'}
                                    </p>
                                  </div>
                                  {categoryDetails?.color && (
                                    <div
                                      className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0"
                                      style={{ backgroundColor: categoryDetails.color }}
                                      title={categoryDetails.color}
                                    />
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs bg-white rounded p-2 border border-amber-50">
                                  <div>
                                    <p className="text-gray-600 font-medium">Quantity</p>
                                    <p className="font-semibold text-gray-900 text-sm">
                                      {quantityInKg.toFixed(2)} kg
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 font-medium">Unit</p>
                                    <p className="font-semibold text-gray-900 text-sm">
                                      {feedCat.unit === 'grams' ? 'Grams' : 'Kilograms'}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-amber-100">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-600">Per feeding session</p>
                                    <Badge variant="outline" className="text-xs bg-amber-100 border-amber-300 text-amber-900">
                                      {quantityInKg.toFixed(2)}kg
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-2">
                                    Daily: {(quantityInKg * selectedConsumptionBatch.feeding_frequency_per_day).toFixed(2)}kg × {selectedConsumptionBatch.feeding_frequency_per_day}x
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No feed categories assigned to this batch</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Feed Details Card with Add Feed Button */}
              <Card>
                <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className={`${isMobileView ? 'text-lg' : ''} flex items-center space-x-2`}>
                        <Leaf className="w-5 h-5" />
                        <span>Feed Details</span>
                      </CardTitle>
                      <CardDescription className={`${isMobileView ? 'text-sm' : ''}`}>
                        {feedingMode === 'individual' 
                          ? 'Add multiple feeds for selected animals'
                          : 'Add multiple feeds for batch feeding'
                        }
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddFeed}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isMobileView ? 'Add' : 'Add Feed'}</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {feedingMode === 'individual' ? (
                    <>
                      {/* Individual Mode - Feed Selection Inputs */}
                      <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-4 pb-4 border-b`}>
                        <div>
                          <Label htmlFor="feedType">Feed Type *</Label>
                          <Select value={selectedFeedType} onValueChange={setSelectedFeedType}>
                            <SelectTrigger className={errors.feedType ? 'border-red-300 mt-1' : 'mt-1'}>
                              <SelectValue placeholder="Select feed type" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFeedTypes.map(feedType => (
                                <SelectItem key={feedType.id} value={feedType.id}>
                                  <div className="flex items-center space-x-2">
                                    <span>{feedType.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {feedType.totalStock.toFixed(1)}kg
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                              {availableFeedTypes.length === 0 && (
                                <SelectItem value="no-stock" disabled>
                                  No feeds available
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
                            placeholder="0.0"
                            className={errors.quantity ? 'border-red-300 mt-1' : 'mt-1'}
                          />
                          {errors.quantity && <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>}
                        </div>
                      </div>

                      {/* Added Feeds Display */}
                      {feeds.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <p className="text-sm mb-2">No feeds added yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {feeds.map((feed, index) => (
                            <div key={feed.id} className="p-3 border rounded-lg bg-gradient-to-r from-gray-50 to-blue-50 space-y-0">
                              <div className="flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => toggleFeedExpanded(feed.id)}
                                  className="flex items-center space-x-2 flex-1 text-left hover:opacity-80 transition-opacity"
                                >
                                  <div>
                                    {expandedFeeds.has(feed.id) ? (
                                      <ChevronUp className="w-4 h-4 text-gray-600" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-600" />
                                    )}
                                  </div>
                                  <span className="text-sm font-semibold">Feed {index + 1}: {feed.feed_name}</span>
                                </button>
                                <Button
                                  type="button"
                                  onClick={() => handleRemoveFeed(feed.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              {expandedFeeds.has(feed.id) && (
                                <div className={`mt-3 pt-3 border-t border-gray-200 grid ${isMobileView ? 'grid-cols-2' : 'grid-cols-4'} gap-3 text-xs`}>
                                  <div className="p-2 bg-white rounded border border-gray-200">
                                    <p className="text-gray-600 font-medium">Unit Cost</p>
                                    <p className="font-semibold text-gray-900">Kes{feed.cost_per_kg.toFixed(2)}/kg</p>
                                  </div>
                                  <div className="p-2 bg-white rounded border border-gray-200">
                                    <p className="text-gray-600 font-medium">Quantity</p>
                                    <p className="font-semibold text-gray-900">{feed.quantity_kg.toFixed(1)}kg</p>
                                  </div>
                                  <div className="col-span-2 p-2 bg-green-50 rounded border border-green-200">
                                    <p className="text-green-700 font-medium">Total Cost</p>
                                    <p className="font-bold text-green-900 text-sm">Kes{(feed.quantity_kg * feed.cost_per_kg).toFixed(2)}</p>
                                    <p className="text-xs text-green-600 mt-1">{feed.quantity_kg.toFixed(1)}kg × Kes{feed.cost_per_kg.toFixed(2)}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Batch Mode - Feed Selection (Batch is selected above) */}
                      <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-4 pb-4 border-b`}>
                        <div>
                          <Label htmlFor="batchFeedType">Feed Type *</Label>
                          <Select value={selectedFeedType} onValueChange={setSelectedFeedType}>
                            <SelectTrigger className={errors.feedType ? 'border-red-300 mt-1' : 'mt-1'}>
                              <SelectValue placeholder="Select feed type" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFeedTypes.map(feedType => (
                                <SelectItem key={feedType.id} value={feedType.id}>
                                  <span>{feedType.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.feedType && <p className="text-sm text-red-600 mt-1">{errors.feedType}</p>}
                        </div>

                        <div>
                          <Label htmlFor="batchQuantity">Quantity per Animal (kg) *</Label>
                          <Input
                            id="batchQuantity"
                            type="number"
                            step="0.1"
                            min="0"
                            value={perCowQuantity}
                            onChange={(e) => setPerCowQuantity(e.target.value)}
                            placeholder="0.0"
                            className={errors.perCowQuantity ? 'border-red-300 mt-1' : 'mt-1'}
                          />
                          {errors.perCowQuantity && <p className="text-sm text-red-600 mt-1">{errors.perCowQuantity}</p>}
                        </div>
                      </div>

                      {/* Batch - Added Feeds Display */}
                      {feeds.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <p className="text-sm mb-2">No feeds added yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {feeds.map((feed, index) => {
                            const perAnimalQty = feed.quantity_kg / animalCount
                            const costPerAnimal = perAnimalQty * feed.cost_per_kg
                            const totalCost = feed.quantity_kg * feed.cost_per_kg
                            
                            return (
                              <div key={feed.id} className="p-3 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 space-y-0">
                                <div className="flex items-center justify-between">
                                  <button
                                    type="button"
                                    onClick={() => toggleFeedExpanded(feed.id)}
                                    className="flex items-center space-x-2 flex-1 text-left hover:opacity-80 transition-opacity"
                                  >
                                    <div>
                                      {expandedFeeds.has(feed.id) ? (
                                        <ChevronUp className="w-4 h-4 text-gray-600" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-600" />
                                      )}
                                    </div>
                                    <span className="text-sm font-semibold">Feed {index + 1}: {feed.feed_name}</span>
                                  </button>
                                  <Button
                                    type="button"
                                    onClick={() => handleRemoveFeed(feed.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                {expandedFeeds.has(feed.id) && (
                                  <div className={`mt-3 pt-3 border-t border-purple-200 grid ${isMobileView ? 'grid-cols-2' : 'grid-cols-3'} gap-3 text-xs`}>
                                    <div className="p-2 bg-white rounded border border-gray-200">
                                      <p className="text-gray-600 font-medium">Unit Cost</p>
                                      <p className="font-semibold text-gray-900">Kes{feed.cost_per_kg.toFixed(2)}/kg</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-200">
                                      <p className="text-gray-600 font-medium">Per Animal</p>
                                      <p className="font-semibold text-gray-900">{perAnimalQty.toFixed(1)}kg</p>
                                      <p className="text-xs text-gray-500 mt-1">Kes{costPerAnimal.toFixed(2)}/animal</p>
                                    </div>
                                    <div className="col-span-1 p-2 bg-white rounded border border-gray-200">
                                      <p className="text-gray-600 font-medium">Animals</p>
                                      <p className="font-semibold text-gray-900">{animalCount}</p>
                                    </div>
                                    <div className="col-span-3 p-2 bg-green-50 rounded border border-green-200 space-y-1">
                                      <div className="flex justify-between text-xs">
                                        <p className="text-green-700 font-medium">Total Quantity:</p>
                                        <p className="font-semibold text-green-900">{feed.quantity_kg.toFixed(1)}kg</p>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <p className="text-green-700 font-bold">Total Cost:</p>
                                        <p className="font-bold text-green-900">Kes{totalCost.toFixed(2)}</p>
                                      </div>
                                      <p className="text-xs text-green-600 mt-2 pt-2 border-t border-green-200">
                                        Calculation: {perAnimalQty.toFixed(1)}kg/animal × Kes{feed.cost_per_kg.toFixed(2)}/kg × {animalCount} animals = Kes{totalCost.toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Animal Selection Card for Individual Mode */}
              {feedingMode === 'individual' && (
                <Card>
                  <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                    <CardTitle className={`${isMobileView ? 'text-lg' : ''} flex items-center space-x-2`}>
                      <Users className="w-5 h-5 text-blue-600" />
                      <span>Select Animals for Feeding</span>
                    </CardTitle>
                    <CardDescription>Choose which animals to feed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-2`}>
                      {animals.map(animal => (
                        <div
                          key={animal.id}
                          onClick={() => handleAnimalToggle(animal.id)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors text-sm ${
                            selectedAnimals.includes(animal.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {animal.name || `#${animal.tag_number}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {animal.category}
                              </p>
                            </div>
                            {selectedAnimals.includes(animal.id) && (
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedAnimals.length === 0 && (
                      <p className="text-sm text-gray-500 mt-4 text-center">Select animals to begin</p>
                    )}
                    {errors.animals && <p className="text-sm text-red-600 mt-2">{errors.animals}</p>}
                  </CardContent>
                </Card>
              )}

              {/* Error for no feeds */}
              {errors.feeds && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{errors.feeds}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Feed Mix Template Mode */}
          {feedingMode === 'feed-mix-template' && (
            <Card>
              <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                <CardTitle className={`${isMobileView ? 'text-lg' : ''} flex items-center space-x-2`}>
                  <Leaf className="w-5 h-5" />
                  <span>Select Feed Mix Recipe</span>
                </CardTitle>
                <CardDescription>Choose a created feed mix recipe for this feeding session</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="feedMixRecipe">Feed Mix Recipe *</Label>
                  <Select value={selectedFeedMixRecipe} onValueChange={setSelectedFeedMixRecipe}>
                    <SelectTrigger className={errors.feedMixRecipe ? 'border-red-300 mt-1' : 'mt-1'}>
                      <SelectValue placeholder="Select a feed mix recipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadedFeedMixRecipes && loadedFeedMixRecipes.length > 0 ? (
                        loadedFeedMixRecipes.map(recipe => (
                          <SelectItem key={recipe.id} value={recipe.id}>
                            <div className="flex items-center space-x-2">
                              <span>{recipe.name}</span>
                              {recipe.is_seasonal && (
                                <Badge variant="outline" className="text-xs">Seasonal</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-recipes" disabled>
                          No feed mix recipes available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.feedMixRecipe && <p className="text-sm text-red-600 mt-1">{errors.feedMixRecipe}</p>}
                </div>

                {selectedFeedMixRecipe && selectedFeedMixRecipe !== 'no-recipes' && (() => {
                  const selectedRecipe = loadedFeedMixRecipes.find(r => r.id === selectedFeedMixRecipe)
                  return selectedRecipe ? (
                    <div className="mt-4 space-y-3">
                      {/* Quick Info Summary */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-white rounded border border-blue-200">
                          <p className="text-xs text-blue-600 font-medium">Ingredients</p>
                          <p className="text-lg font-bold text-blue-900">{selectedRecipe.ingredients?.length || 0}</p>
                        </div>
                        <div className="p-2 bg-white rounded border border-blue-200">
                          <p className="text-xs text-blue-600 font-medium">Cost/Day</p>
                          <p className="text-lg font-bold text-blue-900">
                            Kes{recipeTotalCostPerDay > 0 ? recipeTotalCostPerDay.toFixed(2) : (selectedRecipe.estimated_cost_per_day?.toFixed(2) || '0.00')}
                          </p>
                          {recipeTotalCostPerDay > 0 && (
                            <p className="text-xs text-blue-500 mt-1">
                              (Est: Kes{selectedRecipe.estimated_cost_per_day?.toFixed(2) || '0.00'})
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Details Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setExpandedRecipeDetails(!expandedRecipeDetails)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-blue-100 hover:bg-blue-150 rounded border border-blue-300 text-sm font-medium text-blue-900 transition-colors"
                      >
                        <span className="flex items-center space-x-2">
                          <span>Recipe Details</span>
                        </span>
                        {expandedRecipeDetails ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {/* Expanded Details */}
                      {expandedRecipeDetails && (
                        <div className="space-y-3 p-4 border border-blue-200 rounded-lg bg-white">
                          {/* Ingredients Section */}
                          <div>
                            <h4 className="font-semibold text-blue-900 mb-2 flex items-center space-x-2">
                              <Leaf className="w-4 h-4" />
                              <span>Ingredients ({selectedRecipe.ingredients?.length || 0})</span>
                            </h4>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 ? (
                                selectedRecipe.ingredients.map((ingredient: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-sm p-2 bg-blue-50 rounded">
                                    <span className="text-blue-800">{ingredient.feed_name || 'Unknown Feed'}</span>
                                    <span className="font-semibold text-xs bg-blue-200 text-blue-900 px-2 py-1 rounded">
                                      {ingredient.percentage_of_mix}%
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-gray-500">No ingredients defined</p>
                              )}
                            </div>
                          </div>

                          {/* Target Animals Section */}
                          <div className="border-t border-blue-200 pt-3">
                            <h4 className="font-semibold text-blue-900 mb-2 flex items-center space-x-2">
                              <Users className="w-4 h-4" />
                              <span>Target Animals ({recipeMatchingAnimals.length})</span>
                            </h4>
                            {errors.recipeWeights && (
                              <p className="text-sm text-red-600 mb-3 p-2 bg-red-50 rounded border border-red-200">{errors.recipeWeights}</p>
                            )}
                            <div className="space-y-2 max-h-56 overflow-y-auto">
                              {recipeMatchingAnimals.length > 0 ? (
                                recipeMatchingAnimals.map((animal: any, idx: number) => {
                                  const animalWeight = recipeAnimalWeights[animal.id] || 0
                                  const selectedRecipe = loadedFeedMixRecipes.find(r => r.id === selectedFeedMixRecipe)
                                  
                                  return (
                                    <div key={idx} className="p-3 bg-blue-50 rounded border border-blue-200">
                                      <div className="flex justify-between items-center mb-2">
                                        <div className="flex-1">
                                          <span className="font-medium text-blue-800">{animal.name || `Animal #${animal.tag_number}`}</span>
                                          <span className="text-xs text-blue-600 ml-2">(#{animal.tag_number})</span>
                                        </div>
                                        <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300 whitespace-nowrap">
                                          {animal.production_status?.charAt(0).toUpperCase() + animal.production_status?.slice(1)}
                                        </Badge>
                                      </div>
                                      
                                      {/* Feeding Weight Input */}
                                      <div className="mb-2">
                                        <label className="text-xs font-medium text-blue-700 block mb-1">Feeding Weight (kg)</label>
                                        <Input
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          value={animalWeight || ''}
                                          onChange={(e) => setRecipeAnimalWeights(prev => ({
                                            ...prev,
                                            [animal.id]: parseFloat(e.target.value) || 0
                                          }))}
                                          placeholder="Enter weight"
                                          className="h-7 text-xs"
                                        />
                                      </div>
                                      
                                      {/* Calculated Feed Amounts */}
                                      {animalWeight > 0 && selectedRecipe?.ingredients && selectedRecipe.ingredients.length > 0 && (
                                        <div className="bg-blue-100 p-2 rounded text-xs space-y-1">
                                          <p className="font-semibold text-blue-900 mb-1">Suggested Feed Amounts:</p>
                                          {selectedRecipe.ingredients.map((ingredient: any, ingIdx: number) => {
                                            const feedAmount = (animalWeight * ingredient.percentage_of_mix) / 100
                                            return (
                                              <div key={ingIdx} className="flex justify-between text-blue-800">
                                                <span>{ingredient.feed_name}</span>
                                                <span className="font-semibold">{feedAmount.toFixed(2)}kg</span>
                                              </div>
                                            )
                                          })}
                                          <div className="border-t border-blue-300 pt-1 mt-1 flex justify-between font-bold text-blue-900">
                                            <span>Total:</span>
                                            <span>{animalWeight.toFixed(2)}kg</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })
                              ) : (
                                <p className="text-xs text-gray-500">No animals match these conditions</p>
                              )}
                            </div>
                          </div>

                          {/* Nutritional Targets Section */}
                          <div className="border-t border-blue-200 pt-3">
                            <h4 className="font-semibold text-blue-900 mb-2 flex items-center space-x-2">
                              <Zap className="w-4 h-4" />
                              <span>Nutritional Targets</span>
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="p-2 bg-blue-50 rounded border border-blue-200">
                                <p className="text-xs text-blue-600">Dry Matter</p>
                                <p className="font-bold text-blue-900">{selectedRecipe.target_nutrition?.dry_matter_percent}%</p>
                              </div>
                              <div className="p-2 bg-blue-50 rounded border border-blue-200">
                                <p className="text-xs text-blue-600">Crude Protein</p>
                                <p className="font-bold text-blue-900">{selectedRecipe.target_nutrition?.crude_protein_percent}%</p>
                              </div>
                              <div className="p-2 bg-blue-50 rounded border border-blue-200">
                                <p className="text-xs text-blue-600">Crude Fiber</p>
                                <p className="font-bold text-blue-900">{selectedRecipe.target_nutrition?.crude_fiber_percent}%</p>
                              </div>
                              <div className="p-2 bg-blue-50 rounded border border-blue-200">
                                <p className="text-xs text-blue-600">Energy (MJ/kg)</p>
                                <p className="font-bold text-blue-900">{selectedRecipe.target_nutrition?.energy_mcal_per_kg}</p>
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          {selectedRecipe.description && (
                            <div className="border-t border-blue-200 pt-3">
                              <h4 className="font-semibold text-blue-900 mb-2">Description</h4>
                              <p className="text-sm text-blue-800 bg-blue-50 p-2 rounded">{selectedRecipe.description}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null
                })()}
              </CardContent>
            </Card>
          )}

          {/* Session Nutritional Summary */}
          {feeds.length > 0 && feedingMode !== 'feed-mix-template' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                <CardTitle className={`${isMobileView ? 'text-lg' : ''} flex items-center space-x-2`}>
                  <Zap className="w-5 h-5 text-blue-600" />
                  <span>Session Nutritional Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid ${isMobileView ? 'grid-cols-2' : 'grid-cols-4'} gap-4`}>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Total Feeds</p>
                    <p className="text-2xl font-bold text-blue-900">{calculateNutritionalSummary().feedCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Total Quantity</p>
                    <p className="text-2xl font-bold text-blue-900">{calculateNutritionalSummary().totalQuantity.toFixed(1)}kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Est. Protein</p>
                    <p className="text-2xl font-bold text-blue-900">{calculateNutritionalSummary().totalProtein.toFixed(1)}kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Est. Energy</p>
                    <p className="text-2xl font-bold text-blue-900">{calculateNutritionalSummary().totalEnergy.toFixed(0)}MJ</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-sm font-medium text-blue-900">Session Cost: Kes{calculateNutritionalSummary().totalCost.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
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

          {/* Summary - Only show if feeds exist */}
          {feeds.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                <CardTitle className={`${isMobileView ? 'text-lg' : ''} text-green-800 flex items-center space-x-2`}>
                  <Calculator className="w-5 h-5" />
                  <span>Session Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid ${isMobileView ? 'grid-cols-2' : 'grid-cols-4'} gap-4`}>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {calculateNutritionalSummary().feedCount}
                    </div>
                    <div className="text-sm text-green-700">Feeds Added</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {calculateNutritionalSummary().totalQuantity.toFixed(1)}kg
                    </div>
                    <div className="text-sm text-green-700">Total Quantity</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      Kes{calculateNutritionalSummary().totalCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-green-700">Total Cost</div>
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
                
                {feedingMode === 'individual' && selectedAnimals.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-sm text-green-700">
                      <strong>Animals:</strong> {selectedAnimals.length} selected
                    </p>
                  </div>
                )}
                
                {feedingMode === 'batch' && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-sm text-green-700">
                      <strong>Batch Mode:</strong> {animalCount} animals
                    </p>
                  </div>
                )}

                {/* Feed Category Analysis Toggle - Batch Mode Only */}
                {feedingMode === 'batch' && feedCategoryAnalysis.length > 0 && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowFeedCategoryAnalysis(!showFeedCategoryAnalysis)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-green-100 hover:bg-green-150 rounded border border-green-300 text-sm font-medium text-green-900 transition-colors"
                    >
                      <span className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4" />
                        <span>Feed Category Analysis</span>
                      </span>
                      {showFeedCategoryAnalysis ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {/* Expanded Feed Category Analysis */}
                    {showFeedCategoryAnalysis && (
                      <div className="mt-3 space-y-2">
                        {feedCategoryAnalysis.map((analysis) => {
                          const isUnder = analysis.variance < -0.1
                          const isOver = analysis.variance > 0.1
                          
                          return (
                            <div
                              key={analysis.categoryId}
                              className={`p-3 border rounded-lg space-y-2 ${
                                isUnder
                                  ? 'border-red-200 bg-red-50'
                                  : isOver
                                  ? 'border-orange-200 bg-orange-50'
                                  : 'border-green-200 bg-green-100'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">{analysis.categoryName}</p>
                                  <p className="text-xs text-gray-600 mt-1">Coverage: {analysis.percentage.toFixed(0)}%</p>
                                </div>
                                <div className="text-right">
                                  {isUnder && (
                                    <Badge className="bg-red-100 text-red-700 border-red-200">
                                      <TrendingDown className="w-3 h-3 mr-1" />
                                      Short
                                    </Badge>
                                  )}
                                  {isOver && (
                                    <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                      <TrendingUp className="w-3 h-3 mr-1" />
                                      Excess
                                    </Badge>
                                  )}
                                  {!isUnder && !isOver && (
                                    <Badge className="bg-green-100 text-green-700 border-green-200">
                                      <Equal className="w-3 h-3 mr-1" />
                                      Met
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-xs bg-white rounded p-2 border border-gray-200">
                                <div>
                                  <p className="text-gray-600 font-medium">Expected</p>
                                  <p className="font-semibold text-gray-900">{analysis.expectedQty.toFixed(2)}kg</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-medium">Actual</p>
                                  <p className="font-semibold text-gray-900">{analysis.actualQty.toFixed(2)}kg</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-medium">Variance</p>
                                  <p className={`font-bold ${isUnder ? 'text-red-600' : isOver ? 'text-orange-600' : 'text-green-600'}`}>
                                    {analysis.variance > 0 ? '+' : ''}{analysis.variance.toFixed(2)}kg
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Animal Observations - Only show if 2+ hours after feeding */}
          {shouldShowObservations() && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                <CardTitle className={`${isMobileView ? 'text-lg' : ''} flex items-center space-x-2`}>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span>Post-Feeding Observations</span>
                </CardTitle>
                <CardDescription>Record observations from this feeding session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Appetite Score */}
                <div>
                  <Label className="block mb-2">Appetite Score (1-5)</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <Button
                        key={score}
                        type="button"
                        onClick={() => setAppetiteScore(score)}
                        variant={appetiteScore === score ? 'default' : 'outline'}
                        className={`flex-1 h-10 ${
                          appetiteScore === score 
                            ? 'bg-amber-600 text-white border-amber-600' 
                            : 'border-amber-200'
                        }`}
                      >
                        {score}
                      </Button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-2">
                    <span>Poor (1)</span>
                    <span>Excellent (5)</span>
                  </div>
                </div>

                {/* Approximate Waste */}
                <div>
                  <Label htmlFor="wasteKg">Approximate Waste (kg)</Label>
                  <Input
                    id="wasteKg"
                    type="number"
                    step="0.1"
                    min="0"
                    value={wasteKg}
                    onChange={(e) => setWasteKg(e.target.value)}
                    placeholder="0.0"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Estimate of feed wasted or not consumed</p>
                </div>

                {/* General Notes */}
                <div>
                  <Label htmlFor="observationNotes">Additional Observations</Label>
                  <Textarea
                    id="observationNotes"
                    value={observationNotes}
                    onChange={(e) => setObservationNotes(e.target.value)}
                    placeholder="Note any unusual behavior, health concerns, or feeding reactions..."
                    rows={2}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Any additional notes about animal behavior or feeding results</p>
                </div>
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
      </div>
    </Modal>
  )
}