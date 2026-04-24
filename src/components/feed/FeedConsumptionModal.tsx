// components/feed/FeedConsumptionModal.tsx
'use client'

import { useState, useEffect, useMemo, memo } from 'react'
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
import { FeedTimeSlot, DAYS_OF_WEEK } from '@/lib/database/feedSettingsConstants'
import { SessionQuantityInput } from './SessionQuantityInput'
import {
  Plus,
  Minus,
  Users,
  User,
  Wheat,
  Clock,
  CalendarDays,
  CalendarClock,
  ClipboardList,
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
  BarChart3,
  Search
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
  notes: string | null
  total_yield: number | null
  unit_of_measure: string | null
  cost_per_unit: number | null
  ingredients: any
  target_nutrition: any
  target_animals: {
    animal_ids?: string[]
    animal_tags?: string[]
    category_ids?: string[]
    category_names?: string[]
  } | null
  applicable_conditions: string[] | null
  is_seasonal: boolean
  applicable_seasons: string[] | null
  estimated_cost_per_day: number | null
  estimated_milk_yield_liters: number | null
  active: boolean
  start_date?: string | null
  end_date?: string | null
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
  is_default?: boolean
}

interface AnimalCategory {
  id: string
  name: string
  description: string
  animal_count?: number
  assigned_animals_count?: number
  matching_animals_count?: number
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
  consumptionBatches?: ConsumptionBatch[]  // kept for legacy compat
  feedTypeCategories?: FeedTypeCategory[]
  animalCategories?: AnimalCategory[]
  feedMixRecipes?: FeedMixRecipe[]
  feedRations?: any[]                       // feed rations for ration mode
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

// Stable empty array to prevent memo misses when parent omits optional array props
const EMPTY: any[] = []

function FeedConsumptionModalInner({
  isOpen,
  onClose,
  onSuccess,
  farmId,
  feedTypes,
  animals,
  inventory,
  consumptionBatches = EMPTY,
  feedTypeCategories = EMPTY,
  animalCategories = EMPTY,
  feedMixRecipes = EMPTY,
  feedRations = EMPTY,
  isMobile = false,
  editingRecord
}: FeedConsumptionModalProps) {
  const [feedingMode, setFeedingMode] = useState<'individual' | 'ration' | 'feed-mix-template'>('individual')
  const [feedingDate, setFeedingDate] = useState(new Date().toISOString().split('T')[0])
  const [feedingTime, setFeedingTime] = useState(new Date().toTimeString().slice(0, 5))
  const [selectedRation, setSelectedRation] = useState<any | null>(null)
  const [loadedRations, setLoadedRations] = useState<any[]>(feedRations)
  const [isLoadingRations, setIsLoadingRations] = useState(false)
  const [showRationAnimals, setShowRationAnimals] = useState(false)
  const [showRationIngredients, setShowRationIngredients] = useState(true)
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [feedingSessions, setFeedingSessions] = useState<FeedTimeSlot[]>([])
  const [selectedFeedingSession, setSelectedFeedingSession] = useState<FeedTimeSlot | null>(null)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [selectedFeedMixRecipe, setSelectedFeedMixRecipe] = useState<string>('')
  const [feeds, setFeeds] = useState<FeedItem[]>([])
  const [selectedFeedType, setSelectedFeedType] = useState('')
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [animalSearch, setAnimalSearch] = useState('')
  const [targetsExpanded, setTargetsExpanded] = useState(true)
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedRecipeDetails, setExpandedRecipeDetails] = useState(false)
  const [recipeAnimalWeights, setRecipeAnimalWeights] = useState<Record<string, number>>({})
  const [recipeSessionPercentage, setRecipeSessionPercentage] = useState(100)
  const [todayRecipeConsumption, setTodayRecipeConsumption] = useState<Record<string, number>>({})
  const [loadingTodayRecipeConsumption, setLoadingTodayRecipeConsumption] = useState(false)

  // State for feed mix recipes
  const [loadedFeedMixRecipes, setLoadedFeedMixRecipes] = useState<FeedMixRecipe[]>(feedMixRecipes)
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false)

  // ── Top-level modal tab ───────────────────────────────────────────────────
  const [modalTab, setModalTab] = useState<'record' | 'schedule'>('record')

  // ── Schedule Feeding tab state ────────────────────────────────────────────
  const [scheduleName, setScheduleName] = useState('')
  const [scheduleFromDate, setScheduleFromDate] = useState(new Date().toISOString().split('T')[0])
  const [scheduleToDate, setScheduleToDate] = useState(new Date().toISOString().split('T')[0])
  const [scheduleTime, setScheduleTime] = useState(new Date().toTimeString().slice(0, 5))
  const [scheduleSession, setScheduleSession] = useState<FeedTimeSlot | null>(null)
  // Multiple session selection — keys are slot IDs (from feedingSessions) or custom-time tokens
  const [scheduleSelectedSlotIds, setScheduleSelectedSlotIds] = useState<Set<string>>(new Set())
  // Manual extra times (when no sessions are configured for the day)
  const [scheduleManualTimes, setScheduleManualTimes] = useState<string[]>([])
  // Feeding mode (mirrors record tab)
  const [scheduleFeedingMode, setScheduleFeedingMode] = useState<'individual' | 'ration' | 'feed-mix-template'>('individual')
  // Ration mode
  const [scheduleRation, setScheduleRation] = useState<any | null>(null)
  const [scheduleShowRationIngredients, setScheduleShowRationIngredients] = useState(true)
  const [scheduleShowRationAnimals, setScheduleShowRationAnimals] = useState(false)
  // Feed Mix Template mode
  const [scheduleSelectedRecipe, setScheduleSelectedRecipe] = useState('')
  const [scheduleExpandedRecipeDetails, setScheduleExpandedRecipeDetails] = useState(false)
  // Feed list (populated manually in individual mode, auto-filled in ration/recipe modes)
  const [scheduleFeeds, setScheduleFeeds] = useState<FeedItem[]>([])
  const [scheduleFeedType, setScheduleFeedType] = useState('')
  const [scheduleQtyPerAnimal, setScheduleQtyPerAnimal] = useState('')
  const [scheduleExpandedFeeds, setScheduleExpandedFeeds] = useState<Set<string>>(new Set())
  // Collapsible sections for schedule tab
  const [scheduleFeedingSessionsExpanded, setScheduleFeedingSessionsExpanded] = useState(true)
  const [scheduleRationSessionQtysExpanded, setScheduleRationSessionQtysExpanded] = useState(true)
  const [scheduleRecipeSessionQtysExpanded, setScheduleRecipeSessionQtysExpanded] = useState(true)
  const [scheduleIndividualSessionQtysExpanded, setScheduleIndividualSessionQtysExpanded] = useState(true)
  // Animal target
  const [scheduleTargetMode, setScheduleTargetMode] = useState<'all' | 'by_category' | 'specific'>('all')
  const [scheduleTargetCategories, setScheduleTargetCategories] = useState<string[]>([])
  const [scheduleTargetAnimals, setScheduleTargetAnimals] = useState<string[]>([])
  const [scheduleNotes, setScheduleNotes] = useState('')
  const [scheduleErrors, setScheduleErrors] = useState<Record<string, string>>({})
  const [isScheduling, setIsScheduling] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null)
  // Per-session quantity inputs for schedule tab (all three feeding modes)
  const [scheduleRationSessionQtys, setScheduleRationSessionQtys] = useState<Array<{
    session_id: string; session_name: string; quantity_per_animal_kg: number | null; percentage: number | null
  }>>([])
  const [scheduleRecipeSessionQtys, setScheduleRecipeSessionQtys] = useState<Array<{
    session_id: string; session_name: string; quantity_per_animal_kg: number | null; percentage: number | null
  }>>([])
  const [scheduleIndividualSessionQtys, setScheduleIndividualSessionQtys] = useState<Array<{
    session_id: string; session_name: string; quantity_per_animal_kg: number | null; percentage: number | null
  }>>([])

  const { isMobile: deviceIsMobile } = useDeviceInfo()
  const isMobileView = isMobile || deviceIsMobile
  const isEditMode = !!editingRecord

  // Get available feed types with inventory
  const availableFeedTypes = useMemo(() => {
    const feedTypesWithStock = feedTypes.map(feedType => {
      // Get all inventory items for this feed type
      const inventoryItems = inventory.filter(item => item.feed_type_id === feedType.id)

      // Calculate total available stock
      const totalStock = inventoryItems.reduce((sum, item) => sum + ((item.quantity_kg ?? item.quantity_in_stock ?? 0) as number), 0)

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

  const defaultFeedTypeCategoryIds = useMemo(() => {
    const defaults = feedTypeCategories
      .filter(cat => cat.is_default)
      .map(cat => cat.id)

    return new Set(defaults)
  }, [feedTypeCategories])

  const recordAvailableFeedTypes = useMemo(() => {
    return availableFeedTypes.filter(feedType => {
      if (feedType.id === selectedFeedType) return true
      return feedType.hasStock
    })
  }, [availableFeedTypes, selectedFeedType])

  // Get selected batch and feed type data
  const selectedConsumptionBatch = useMemo(() =>
    consumptionBatches.find(batch => batch.id === selectedBatch),
    [consumptionBatches, selectedBatch]
  )

  const selectedFeedTypeData = useMemo(() =>
    recordAvailableFeedTypes.find(ft => ft.id === selectedFeedType),
    [recordAvailableFeedTypes, selectedFeedType]
  )

  const selectedDayOfWeek = useMemo(() => {
    const date = new Date(feedingDate)
    const day = date.getDay()
    return day === 0 ? 7 : day
  }, [feedingDate])

  const currentDayLabel = useMemo(() => {
    return DAYS_OF_WEEK.find(day => day.value === selectedDayOfWeek)?.full ?? ''
  }, [selectedDayOfWeek])

  const sessionsForDay = useMemo(
    () => feedingSessions.filter(session => session.is_active && session.days_of_week.includes(selectedDayOfWeek)),
    [feedingSessions, selectedDayOfWeek]
  )

  const scheduleDayOfWeek = useMemo(() => {
    if (!scheduleFromDate) return null
    const d = new Date(scheduleFromDate)
    const day = d.getDay()
    return day === 0 ? 7 : day
  }, [scheduleFromDate])

  const scheduleSessionsForDay = useMemo(
    () => feedingSessions.filter(s => s.is_active && scheduleDayOfWeek !== null && s.days_of_week.includes(scheduleDayOfWeek)),
    [feedingSessions, scheduleDayOfWeek]
  )

  // Get all selected animal IDs (from both individual selection and categories)
  const allSelectedAnimalIds = useMemo(() => {
    const ids = new Set(selectedAnimals)
    animalCategories
      .filter(cat => selectedCategoryIds.includes(cat.id))
      .forEach(cat => {
        animals.forEach(animal => {
          if (animal.category_ids?.includes(cat.id)) {
            ids.add(animal.id)
          }
        })
      })
    return Array.from(ids)
  }, [selectedAnimals, selectedCategoryIds, animalCategories, animals])

  // Calculate total selected animals.
  // Prefer allSelectedAnimalIds (actual expansion) when animals are loaded.
  // Fall back to assigned_animals_count (server-side count per category) when animals array is empty.
  const totalSelectedAnimals = useMemo(() => {
    if (allSelectedAnimalIds.length > 0 || selectedAnimals.length > 0) {
      return Math.max(1, allSelectedAnimalIds.length)
    }
    const categoryCounts = animalCategories
      .filter(cat => selectedCategoryIds.includes(cat.id))
      .reduce((sum, cat: any) => sum + (cat.assigned_animals_count ?? cat.animal_count ?? 0), 0)
    return Math.max(1, categoryCounts)
  }, [allSelectedAnimalIds, selectedAnimals, selectedCategoryIds, animalCategories])

  // Filter animals by search query
  const filteredAnimals = useMemo(() => {
    const q = animalSearch.toLowerCase()
    return !q ? animals : animals.filter(a =>
      a.tag_number.toLowerCase().includes(q) || (a.name ?? '').toLowerCase().includes(q)
    )
  }, [animals, animalSearch])

  useEffect(() => {
    if (!isOpen) return

    const abortController = new AbortController()
    setSessionLoading(true)
    setSessionError(null)

    fetch(`/api/farms/${farmId}/feed-settings/time-slots`, { signal: abortController.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load sessions')
        return res.json()
      })
      .then((data) => {
        setFeedingSessions(Array.isArray(data) ? data : [])
      })
      .catch((error) => {
        if (!abortController.signal.aborted) {
          console.error('Failed to load feeding sessions:', error)
          setSessionError('Failed to load feeding sessions')
          setFeedingSessions([])
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) setSessionLoading(false)
      })

    return () => abortController.abort()
  }, [farmId, isOpen])

  useEffect(() => {
    if (selectedFeedingSession && !selectedFeedingSession.days_of_week.includes(selectedDayOfWeek)) {
      setSelectedFeedingSession(null)
    }
  }, [selectedDayOfWeek, selectedFeedingSession])

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

  // Effect to fetch animals when batch changes (legacy batch mode)
  useEffect(() => {
    if (selectedBatch) {
      fetchBatchAnimals(selectedBatch)
      const batch = consumptionBatches.find(b => b.id === selectedBatch)
      if (batch?.targeted_animals_count) {
        setAnimalCount(batch.targeted_animals_count)
      }
    }
  }, [selectedBatch, consumptionBatches, farmId])

  // Load rations from API if not provided as prop
  useEffect(() => {
    if (isOpen && loadedRations.length === 0 && feedRations.length === 0) {
      setIsLoadingRations(true)
      fetch(`/api/farms/${farmId}/feed-rations`)
        .then(r => r.json())
        .then(json => {
          const rations = json.data ?? []
          setLoadedRations(rations)
        })
        .catch(err => console.error('Failed to load rations:', err))
        .finally(() => setIsLoadingRations(false))
    } else if (feedRations.length > 0) {
      setLoadedRations(feedRations)
    }
  }, [isOpen, farmId, feedRations])

  // ── Daily-plan pre-fill ───────────────────────────────────────────────────
  const [dailyPlanLoading, setDailyPlanLoading] = useState(false)
  const [dailyPlanBanner, setDailyPlanBanner] = useState<string | null>(null)

  async function prefillFromDailyPlan() {
    if (!selectedRation) return
    const assignments: any[] = selectedRation.feed_ration_assignments ?? []
    const activeAssignment = assignments.find((a: any) => a.is_active)
    if (!activeAssignment) {
      setDailyPlanBanner('No active assignment found for this ration.')
      return
    }
    setDailyPlanLoading(true)
    setDailyPlanBanner(null)
    try {
      const date = feedingDate ?? new Date().toISOString().split('T')[0]
      const res = await fetch(
        `/api/farms/${farmId}/feed-rations/${selectedRation.id}/daily-plan?assignment_id=${activeAssignment.id}&date=${date}`
      )
      if (!res.ok) { setDailyPlanBanner('No daily plan for this date.'); return }
      const { plan } = await res.json()
      if (!plan) { setDailyPlanBanner('No daily plan found for this date. Generate one from Feed Rations.'); return }

      // Flatten sessions → ingredient totals
      const totals: Record<string, number> = {}
      for (const session of plan.sessions ?? []) {
        for (const ing of session.ingredients ?? []) {
          totals[ing.feed_type_id] = (totals[ing.feed_type_id] ?? 0) + ing.qty_group_total_kg
        }
      }

      const newFeeds: FeedItem[] = Object.entries(totals).map(([ftId, qty]) => {
        const ft = feedTypes.find(f => f.id === ftId)
        return {
          id: ftId,
          feed_type_id: ftId,
          feed_name: ft?.name ?? ftId,
          quantity_kg: qty,
          cost_per_kg: ft?.typical_cost_per_kg ?? 0,
        }
      })

      if (newFeeds.length > 0) {
        setFeeds(newFeeds)
        setAnimalCount(plan.animal_count ?? (rationAnimals.length || 1))
        setDailyPlanBanner(`Pre-filled ${newFeeds.length} ingredients from daily plan (${plan.animal_count} animals).`)
      } else {
        setDailyPlanBanner('Daily plan has no ingredients to pre-fill.')
      }
    } catch {
      setDailyPlanBanner('Failed to load daily plan.')
    } finally {
      setDailyPlanLoading(false)
    }
  }

  // Derive animals covered by a ration's assignments.
  // Falls back to counting from category.animal_count when animals lack category_ids.
  const rationAnimals = useMemo(() => {
    if (!selectedRation) return []
    const assignments: any[] = selectedRation.feed_ration_assignments ?? []
    const ids = new Set<string>()

    assignments.forEach((asgn: any) => {
      if (!asgn.is_active) return
      if (asgn.assignment_type === 'animal' && asgn.animal_id) {
        ids.add(asgn.animal_id)
      } else if ((asgn.assignment_type === 'category' || asgn.assignment_type === 'group') && asgn.animal_category_id) {
        animals.forEach(a => {
          if (a.category_ids?.includes(asgn.animal_category_id)) ids.add(a.id)
        })
      }
    })

    return animals.filter(a => ids.has(a.id))
  }, [selectedRation, animals])

  // Derive expected animal count from ration assignments, with two fallbacks:
  // 1. category assigned_animals_count when animals lack category_ids
  // 2. TMR recipe target_animals.category_ids when the ration has no assignments at all
  const rationAnimalCount = useMemo(() => {
    if (rationAnimals.length > 0) return rationAnimals.length
    if (!selectedRation) return 0
    const assignments: any[] = selectedRation.feed_ration_assignments ?? []
    let count = 0
    assignments.forEach((asgn: any) => {
      if (!asgn.is_active) return
      if (asgn.assignment_type === 'animal' && asgn.animal_id) {
        count += 1
      } else if ((asgn.assignment_type === 'category' || asgn.assignment_type === 'group') && asgn.animal_category_id) {
        const cat = animalCategories.find(c => c.id === asgn.animal_category_id)
        count += cat?.assigned_animals_count ?? (cat as any)?.animal_count ?? 0
      }
    })
    // Fallback: derive count from TMR ingredient target_animals when no assignments
    if (count === 0 && loadedFeedMixRecipes.length > 0) {
      const ingredients: any[] = selectedRation.feed_ration_ingredients ?? []
      for (const ing of ingredients) {
        if (!ing.tmr_recipe_id) continue
        const tmr = loadedFeedMixRecipes.find((r: FeedMixRecipe) => r.id === ing.tmr_recipe_id)
        const catIds: string[] = tmr?.target_animals?.category_ids ?? []
        for (const catId of catIds) {
          const cat = animalCategories.find(c => c.id === catId)
          count += cat?.assigned_animals_count ?? (cat as any)?.animal_count ?? 0
        }
        if (count > 0) break
      }
    }
    return count
  }, [rationAnimals, selectedRation, animalCategories, loadedFeedMixRecipes])

  // When a ration is selected, auto-populate the feeds list and animal count.
  // TMR ingredients are expanded into their sub-ingredients.
  // Uses rationAnimalCount (assignment-based) so it works even when animals lack category_ids.
  useEffect(() => {
    if (!selectedRation || feedingMode !== 'ration') return
    const count = rationAnimalCount || 1
    setAnimalCount(count)
    const ingredients: any[] = selectedRation.feed_ration_ingredients ?? []
    const newFeeds: FeedItem[] = []

    const resolveFeedName = (feedTypeId: string | null | undefined, fallback: string) => {
      if (!feedTypeId) return fallback
      return availableFeedTypes.find(f => f.id === feedTypeId)?.name
        ?? feedTypes.find(f => f.id === feedTypeId)?.name
        ?? fallback
    }

    for (const ing of [...ingredients].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
      if (ing.tmr_recipe_id) {
        const tmr = loadedFeedMixRecipes.find(r => r.id === ing.tmr_recipe_id)
        const tmrLabel = ing.feed_mix_recipes?.name ?? tmr?.name ?? 'TMR Recipe'
        const tmrQtyPerAnimal = ing.quantity_kg_per_day ?? 0
        const subIngredients: any[] = tmr?.ingredients ?? []
        if (subIngredients.length > 0) {
          for (const sub of subIngredients) {
            const subQtyPerAnimal = (tmrQtyPerAnimal * (sub.percentage_of_mix ?? 0)) / 100
            const ft = availableFeedTypes.find(f => f.id === sub.feed_type_id)
            newFeeds.push({
              id: `ration-tmr-${ing.id}-${sub.feed_type_id}`,
              feed_type_id: sub.feed_type_id,
              feed_name: sub.feed_name ?? resolveFeedName(sub.feed_type_id, 'Unknown'),
              quantity_kg: subQtyPerAnimal * count,
              cost_per_kg: ft?.costPerKg ?? 0,
              notes: `${tmrLabel} · ${sub.percentage_of_mix}% · ${subQtyPerAnimal.toFixed(2)} kg/animal × ${count} animals`,
            })
          }
        } else {
          newFeeds.push({
            id: `ration-tmr-${ing.id}`,
            feed_type_id: ing.tmr_recipe_id,
            feed_name: tmrLabel,
            quantity_kg: tmrQtyPerAnimal * count,
            cost_per_kg: 0,
            notes: `TMR mix · ${tmrQtyPerAnimal} kg/animal × ${count} animals`,
          })
        }
      } else if (ing.feed_type_id) {
        const ft = availableFeedTypes.find(f => f.id === ing.feed_type_id)
        newFeeds.push({
          id: `ration-${ing.id ?? ing.feed_type_id}`,
          feed_type_id: ing.feed_type_id,
          feed_name: ing.feed_types?.name ?? resolveFeedName(ing.feed_type_id, 'Unknown'),
          quantity_kg: (ing.quantity_kg_per_day ?? 0) * count,
          cost_per_kg: ft?.costPerKg ?? 0,
          notes: `${ing.quantity_kg_per_day} kg/animal × ${count} animals`,
        })
      }
    }
    setFeeds(newFeeds)
  }, [selectedRation, rationAnimalCount, feedingMode, loadedFeedMixRecipes, availableFeedTypes, feedTypes])

  // Fetch feed mix recipes if not provided as prop
  useEffect(() => {
    if (isOpen && loadedFeedMixRecipes.length === 0 && feedMixRecipes.length === 0) {
      const fetchRecipes = async () => {
        setIsLoadingRecipes(true)
        try {
          const response = await fetch(`/api/farms/${farmId}/feed-recipes`)
          if (response.ok) {
            const result = await response.json()
            setLoadedFeedMixRecipes(result.recipes || [])
          }
        } catch (error) {
          console.error('Failed to fetch TMR recipes:', error)
        } finally {
          setIsLoadingRecipes(false)
        }
      }
      fetchRecipes()
    } else if (feedMixRecipes.length > 0) {
      setLoadedFeedMixRecipes(feedMixRecipes)
    }
  }, [isOpen, farmId, feedMixRecipes])

  // Fetch today's consumption records for the selected recipe to show "already fed / remaining"
  useEffect(() => {
    if (!isOpen || !selectedFeedMixRecipe || selectedFeedMixRecipe === 'no-recipes' || !feedingDate) {
      setTodayRecipeConsumption({})
      return
    }
    setLoadingTodayRecipeConsumption(true)
    fetch(`/api/feed/consumption?limit=200`)
      .then(r => r.json())
      .then(data => {
        const records: any[] = Array.isArray(data) ? data : (data.records ?? [])
        const totals: Record<string, number> = {}
        records.forEach(rec => {
          if (rec.consumption_date !== feedingDate) return
          const recRecipeId = rec.observations?.recipe_id ?? rec.recipe_id
          if (recRecipeId !== selectedFeedMixRecipe) return
          if (isEditMode && rec.id === editingRecord?.id) return
          totals[rec.feed_type_id] = (totals[rec.feed_type_id] ?? 0) + (rec.quantity_consumed ?? 0)
        })
        setTodayRecipeConsumption(totals)
      })
      .catch(() => setTodayRecipeConsumption({}))
      .finally(() => setLoadingTodayRecipeConsumption(false))
  }, [isOpen, selectedFeedMixRecipe, feedingDate])

  // ── Schedule tab: auto-populate feeds when ration is selected ───────────
  useEffect(() => {
    if (!scheduleRation || scheduleFeedingMode !== 'ration') {
      if (scheduleFeedingMode !== 'individual') setScheduleFeeds([])
      return
    }
    const ingredients: any[] = scheduleRation.feed_ration_ingredients ?? []
    const newFeeds: FeedItem[] = []

    for (const ing of [...ingredients].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
      if (ing.tmr_recipe_id) {
        const tmr = loadedFeedMixRecipes.find(r => r.id === ing.tmr_recipe_id)
        const tmrLabel = ing.feed_mix_recipes?.name ?? tmr?.name ?? 'TMR Recipe'
        const tmrQtyPerAnimal = ing.quantity_kg_per_day ?? 0
        const subIngredients: any[] = tmr?.ingredients ?? []
        if (subIngredients.length > 0) {
          for (const sub of subIngredients) {
            const subQtyPerAnimal = (tmrQtyPerAnimal * (sub.percentage_of_mix ?? 0)) / 100
            const ft = availableFeedTypes.find(f => f.id === sub.feed_type_id)
            newFeeds.push({
              id: `sr-tmr-${ing.id}-${sub.feed_type_id}`,
              feed_type_id: sub.feed_type_id,
              feed_name: sub.feed_name ?? ft?.name ?? 'Unknown',
              quantity_kg: subQtyPerAnimal,
              cost_per_kg: ft?.costPerKg ?? 0,
              notes: `${tmrLabel} · ${sub.percentage_of_mix}% · ${subQtyPerAnimal.toFixed(2)} kg/animal`,
            })
          }
        } else {
          newFeeds.push({
            id: `sr-tmr-${ing.id}`,
            feed_type_id: ing.tmr_recipe_id,
            feed_name: tmrLabel,
            quantity_kg: tmrQtyPerAnimal,
            cost_per_kg: 0,
            notes: `TMR mix · ${tmrQtyPerAnimal} kg/animal`,
          })
        }
      } else if (ing.feed_type_id) {
        const ft = availableFeedTypes.find(f => f.id === ing.feed_type_id)
        newFeeds.push({
          id: `sr-${ing.id ?? ing.feed_type_id}`,
          feed_type_id: ing.feed_type_id,
          feed_name: ing.feed_types?.name ?? ft?.name ?? 'Unknown',
          quantity_kg: ing.quantity_kg_per_day ?? 0,
          cost_per_kg: ft?.costPerKg ?? 0,
          notes: `From ration: ${ing.quantity_kg_per_day} kg/animal`,
        })
      }
    }
    setScheduleFeeds(newFeeds)
  }, [scheduleRation, scheduleFeedingMode, availableFeedTypes, loadedFeedMixRecipes])

  // ── Schedule tab: auto-populate feeds when recipe + avg weight change ───
  useEffect(() => {
    if (scheduleFeedingMode !== 'feed-mix-template') return
    if (!scheduleSelectedRecipe || scheduleSelectedRecipe === 'no-recipes') {
      setScheduleFeeds([])
      return
    }
    const recipe = loadedFeedMixRecipes.find(r => r.id === scheduleSelectedRecipe)
    if (!recipe?.ingredients || !recipe.total_yield) { setScheduleFeeds([]); return }
    const newFeeds: FeedItem[] = (recipe.ingredients as any[])
      .filter(ing => ing.feed_type_id)
      .map(ing => {
        const ft = availableFeedTypes.find(f => f.id === ing.feed_type_id)
        const qtyPerSession = (recipe.total_yield! * (ing.percentage_of_mix ?? 0)) / 100
        return {
          id: `srt-${ing.feed_type_id}`,
          feed_type_id: ing.feed_type_id,
          feed_name: ing.feed_name ?? ft?.name ?? 'Unknown',
          quantity_kg: qtyPerSession,
          cost_per_kg: ft?.costPerKg ?? 0,
          notes: `${ing.percentage_of_mix}% of ${recipe.total_yield} kg total yield`,
        }
      })
    setScheduleFeeds(newFeeds)
  }, [scheduleFeedingMode, scheduleSelectedRecipe, loadedFeedMixRecipes, availableFeedTypes])

  // Auto-fill schedule dates from the selected TMR recipe's start/end dates
  useEffect(() => {
    if (scheduleFeedingMode !== 'feed-mix-template' || !scheduleSelectedRecipe || scheduleSelectedRecipe === 'no-recipes') return
    const recipe = loadedFeedMixRecipes.find(r => r.id === scheduleSelectedRecipe)
    if (!recipe) return
    if (recipe.start_date) setScheduleFromDate(recipe.start_date)
    if (recipe.end_date) setScheduleToDate(recipe.end_date)
  }, [scheduleSelectedRecipe, scheduleFeedingMode, loadedFeedMixRecipes])

  // Auto-populate animal targets from the selected TMR recipe's target animals
  useEffect(() => {
    if (scheduleFeedingMode !== 'feed-mix-template' || !scheduleSelectedRecipe || scheduleSelectedRecipe === 'no-recipes') return
    const recipe = loadedFeedMixRecipes.find(r => r.id === scheduleSelectedRecipe)
    if (!recipe?.target_animals) return

    const categoryNames = recipe.target_animals.category_names ?? []
    const animalTags = recipe.target_animals.animal_tags ?? []

    if (categoryNames.length === 0 && animalTags.length === 0) return

    // Match category names to IDs
    const matchedCategoryIds = categoryNames
      .map(name => animalCategories.find(cat => cat.name === name)?.id)
      .filter((id): id is string => !!id)

    // Match animal tags to IDs
    const matchedAnimalIds = animalTags
      .map(tag => animals.find(a => a.tag_number === tag)?.id)
      .filter((id): id is string => !!id)

    // Auto-set target mode: prefer 'by_category' if categories exist, otherwise 'specific'
    if (matchedCategoryIds.length > 0) {
      setScheduleTargetMode('by_category')
      setScheduleTargetCategories(matchedCategoryIds)
      setScheduleTargetAnimals([])
    } else if (matchedAnimalIds.length > 0) {
      setScheduleTargetMode('specific')
      setScheduleTargetAnimals(matchedAnimalIds)
      setScheduleTargetCategories([])
    }
  }, [scheduleSelectedRecipe, scheduleFeedingMode, loadedFeedMixRecipes, animalCategories, animals])

  // Auto-expand session quantity cards when feeding sessions are selected
  useEffect(() => {
    if (scheduleSelectedSlotIds.size > 0) {
      setScheduleRationSessionQtysExpanded(true)
      setScheduleRecipeSessionQtysExpanded(true)
      setScheduleIndividualSessionQtysExpanded(true)
    }
  }, [scheduleSelectedSlotIds])

  // Sync per-session quantity entries when schedule tab's selected sessions change
  useEffect(() => {
    const selected = scheduleSessionsForDay.filter(s => scheduleSelectedSlotIds.has(s.id))
    const makeEntry = (s: FeedTimeSlot, prev: typeof scheduleRationSessionQtys) =>
      prev.find(q => q.session_id === s.id) ?? { session_id: s.id, session_name: s.slot_name, quantity_per_animal_kg: null, percentage: null }
    setScheduleRationSessionQtys(prev => selected.map(s => makeEntry(s, prev)))
    setScheduleRecipeSessionQtys(prev => selected.map(s => makeEntry(s, prev)))
    setScheduleIndividualSessionQtys(prev => selected.map(s => makeEntry(s, prev)))
  }, [scheduleSelectedSlotIds, scheduleSessionsForDay])

  // Auto-populate session quantities from ration's session definitions (Schedule Tab)
  useEffect(() => {
    if (!scheduleRation || scheduleFeedingMode !== 'ration') return

    const rationSessions: any[] = scheduleRation.feed_ration_sessions ?? []

    if (rationSessions.length > 0) {
      // Ration-level path: percentage-based
      setScheduleRationSessionQtys(prev =>
        prev.map(entry => {
          const rationSession = rationSessions.find((rs: any) => {
            const slotId = rs.feed_time_slots?.id ?? rs.time_slot_id
            return slotId === entry.session_id
          })
          if (rationSession?.quantity_percent != null) {
            const pct = rationSession.quantity_percent
            const totalDailyKg = scheduleRation.total_daily_kg ?? null
            const qtyPerAnimal = totalDailyKg ? parseFloat(((totalDailyKg * pct) / 100).toFixed(3)) : null
            return { ...entry, percentage: pct, quantity_per_animal_kg: qtyPerAnimal }
          }
          return entry
        })
      )
      return
    }

    // Ingredient-level fallback: aggregate quantity_kg per time slot
    const ingredients: any[] = scheduleRation.feed_ration_ingredients ?? []
    const slotTotals = new Map<string, number>()
    for (const ing of ingredients) {
      for (const s of (ing.feed_ingredient_sessions ?? []) as any[]) {
        const slotId = s.time_slot_id ?? s.feed_time_slots?.id
        if (!slotId) continue
        slotTotals.set(slotId, (slotTotals.get(slotId) ?? 0) + (s.quantity_kg ?? 0))
      }
    }

    if (slotTotals.size === 0) return

    const totalDailyKg = scheduleRation.total_daily_kg ?? null

    setScheduleRationSessionQtys(prev =>
      prev.map(entry => {
        const totalKg = slotTotals.get(entry.session_id)
        if (totalKg == null) return entry
        const pct = totalDailyKg ? Math.round((totalKg / totalDailyKg) * 100) : null
        return { ...entry, quantity_per_animal_kg: parseFloat(totalKg.toFixed(3)), percentage: pct }
      })
    )
  }, [scheduleRation, scheduleFeedingMode, scheduleSelectedSlotIds])

  // Auto-populate session quantities from recipe session percentages (Schedule Tab)
  useEffect(() => {
    if (!scheduleSelectedRecipe || scheduleFeedingMode !== 'feed-mix-template') return
    
    const recipe = loadedFeedMixRecipes.find(r => r.id === scheduleSelectedRecipe)
    if (!recipe?.total_yield) return

    // For recipes, set percentage to 100% since recipes define complete daily amounts
    setScheduleRecipeSessionQtys(prev =>
      prev.map(entry => ({
        ...entry,
        percentage: 100
      }))
    )
  }, [scheduleSelectedRecipe, scheduleFeedingMode, loadedFeedMixRecipes, scheduleSelectedSlotIds])

  // Auto-select animals from feed ration (Record Tab)
  // Reads assignments directly so it works even when animals lack category_ids.
  // Falls back to TMR ingredient target_animals.category_ids when ration has no assignments.
  useEffect(() => {
    if (!selectedRation || feedingMode !== 'ration') return
    const assignments: any[] = selectedRation.feed_ration_assignments ?? []
    const categoryIds = new Set<string>()
    const animalIds = new Set<string>()

    assignments.forEach((asgn: any) => {
      if (!asgn.is_active) return
      if (asgn.assignment_type === 'animal' && asgn.animal_id) {
        animalIds.add(asgn.animal_id)
      } else if ((asgn.assignment_type === 'category' || asgn.assignment_type === 'group') && asgn.animal_category_id) {
        categoryIds.add(asgn.animal_category_id)
      }
    })

    // Fallback: derive categories from TMR ingredient target_animals
    if (categoryIds.size === 0 && animalIds.size === 0 && loadedFeedMixRecipes.length > 0) {
      const ingredients: any[] = selectedRation.feed_ration_ingredients ?? []
      for (const ing of ingredients) {
        if (!ing.tmr_recipe_id) continue
        const tmr = loadedFeedMixRecipes.find((r: FeedMixRecipe) => r.id === ing.tmr_recipe_id)
        for (const catId of (tmr?.target_animals?.category_ids ?? [])) {
          categoryIds.add(catId)
        }
      }
    }

    setSelectedCategoryIds(Array.from(categoryIds))
    setSelectedAnimals(Array.from(animalIds))
  }, [selectedRation, feedingMode, loadedFeedMixRecipes])

  // Auto-select feeding session from ration (Record Tab)
  useEffect(() => {
    if (!selectedRation || feedingMode !== 'ration') return

    // Primary: ration-level sessions
    const rationSessions: any[] = selectedRation.feed_ration_sessions ?? []
    for (const rs of rationSessions) {
      if (!rs.is_active) continue
      const slotId = rs.feed_time_slots?.id ?? rs.time_slot_id
      const match = sessionsForDay.find(s => s.id === slotId)
      if (match) { setSelectedFeedingSession(match); return }
    }

    // Fallback: first slot found in ingredient-level sessions
    const ingredients: any[] = selectedRation.feed_ration_ingredients ?? []
    for (const ing of ingredients) {
      for (const is of (ing.feed_ingredient_sessions ?? []) as any[]) {
        const slotId = is.feed_time_slots?.id ?? is.time_slot_id
        const match = sessionsForDay.find(s => s.id === slotId)
        if (match) { setSelectedFeedingSession(match); return }
      }
    }
  }, [selectedRation, feedingMode, sessionsForDay])

  // Auto-populate feeding sessions from ration's feed_ration_sessions (Schedule Tab)
  useEffect(() => {
    if (!scheduleRation || scheduleFeedingMode !== 'ration') return
    const rationSessions: any[] = scheduleRation.feed_ration_sessions ?? []
    const sessionIds = new Set<string>()

    rationSessions.forEach((session: any) => {
      if (session.is_active && session.feed_time_slots?.id) {
        sessionIds.add(session.feed_time_slots.id)
      } else if (session.is_active && session.time_slot_id) {
        sessionIds.add(session.time_slot_id)
      }
    })

    // Fallback: collect all unique slot IDs from ingredient-level sessions
    if (sessionIds.size === 0) {
      const ingredients: any[] = scheduleRation.feed_ration_ingredients ?? []
      for (const ing of ingredients) {
        for (const is of (ing.feed_ingredient_sessions ?? []) as any[]) {
          const slotId = is.feed_time_slots?.id ?? is.time_slot_id
          if (slotId) sessionIds.add(slotId)
        }
      }
    }

    if (sessionIds.size > 0) {
      setScheduleSelectedSlotIds(sessionIds)
    }
  }, [scheduleRation, scheduleFeedingMode])

  // Auto-populate animals from ration (Schedule Tab)
  // Falls back to TMR ingredient target_animals.category_ids when ration has no assignments.
  useEffect(() => {
    if (!scheduleRation || scheduleFeedingMode !== 'ration') return
    const assignments: any[] = scheduleRation.feed_ration_assignments ?? []
    const categoryIds: string[] = []
    const specificAnimalIds: string[] = []

    assignments.forEach((asgn: any) => {
      if (!asgn.is_active) return
      if (asgn.assignment_type === 'animal' && asgn.animal_id) {
        specificAnimalIds.push(asgn.animal_id)
      } else if ((asgn.assignment_type === 'category' || asgn.assignment_type === 'group') && asgn.animal_category_id) {
        categoryIds.push(asgn.animal_category_id)
      }
    })

    // Fallback: derive categories from TMR ingredient target_animals
    if (categoryIds.length === 0 && specificAnimalIds.length === 0 && loadedFeedMixRecipes.length > 0) {
      const ingredients: any[] = scheduleRation.feed_ration_ingredients ?? []
      for (const ing of ingredients) {
        if (!ing.tmr_recipe_id) continue
        const tmr = loadedFeedMixRecipes.find((r: FeedMixRecipe) => r.id === ing.tmr_recipe_id)
        for (const catId of (tmr?.target_animals?.category_ids ?? [])) {
          if (!categoryIds.includes(catId)) categoryIds.push(catId)
        }
      }
    }

    if (categoryIds.length > 0) {
      setScheduleTargetMode('by_category')
      setScheduleTargetCategories(categoryIds)
      setScheduleTargetAnimals([])
    } else if (specificAnimalIds.length > 0) {
      setScheduleTargetMode('specific')
      setScheduleTargetAnimals(specificAnimalIds)
      setScheduleTargetCategories([])
    }
  }, [scheduleRation, scheduleFeedingMode, loadedFeedMixRecipes])

  // Extract TMR start/end dates to schedule (Schedule Tab)
  useEffect(() => {
    if (!scheduleRation || scheduleFeedingMode !== 'ration') return
    const ingredients: any[] = scheduleRation.feed_ration_ingredients ?? []
    
    for (const ing of ingredients) {
      if (ing.tmr_recipe_id) {
        const tmr = loadedFeedMixRecipes.find(r => r.id === ing.tmr_recipe_id)
        if (tmr) {
          if (tmr.start_date) setScheduleFromDate(tmr.start_date)
          if (tmr.end_date) setScheduleToDate(tmr.end_date)
          break
        }
      }
    }
  }, [scheduleRation, scheduleFeedingMode, loadedFeedMixRecipes])

  // Derive animals covered by a schedule ration's assignments (Schedule Tab).
  // Similar to rationAnimals but for scheduleRation instead of selectedRation.
  const scheduleRationAnimals = useMemo(() => {
    if (!scheduleRation) return []
    const assignments: any[] = scheduleRation.feed_ration_assignments ?? []
    const ids = new Set<string>()

    assignments.forEach((asgn: any) => {
      if (!asgn.is_active) return
      if (asgn.assignment_type === 'animal' && asgn.animal_id) {
        ids.add(asgn.animal_id)
      } else if ((asgn.assignment_type === 'category' || asgn.assignment_type === 'group') && asgn.animal_category_id) {
        animals.forEach(a => {
          if (a.category_ids?.includes(asgn.animal_category_id)) ids.add(a.id)
        })
      }
    })

    return animals.filter(a => ids.has(a.id))
  }, [scheduleRation, animals])

  // Group schedule ration animals by their categories for display.
  // Shows which categories are assigned and which animals belong to each category.
  const scheduleRationAnimalsGrouped = useMemo(() => {
    if (!scheduleRation) return []
    const assignments: any[] = scheduleRation.feed_ration_assignments ?? []
    const grouped: Array<{ category: any; animals: any[] }> = []
    const processedCategoryIds = new Set<string>()
    const individualAnimalsNotInCategory = new Set<string>()

    // First, process category assignments
    assignments.forEach((asgn: any) => {
      if (!asgn.is_active) return
      if ((asgn.assignment_type === 'category' || asgn.assignment_type === 'group') && asgn.animal_category_id) {
        if (processedCategoryIds.has(asgn.animal_category_id)) return
        processedCategoryIds.add(asgn.animal_category_id)

        const cat = animalCategories.find(c => c.id === asgn.animal_category_id)
        const categoryAnimals = animals.filter(a => a.category_ids?.includes(asgn.animal_category_id))
        if (cat) {
          grouped.push({ category: cat, animals: categoryAnimals })
        }
      }
    })

    // Then, collect individual animal assignments not covered by categories
    const assignedCategoryIds = new Set(
      assignments
        .filter((a: any) => a.is_active && (a.assignment_type === 'category' || a.assignment_type === 'group'))
        .map((a: any) => a.animal_category_id)
    )

    const individualAnimals: any[] = []
    assignments.forEach((asgn: any) => {
      if (!asgn.is_active || asgn.assignment_type !== 'animal' || !asgn.animal_id) return
      const animal = animals.find(a => a.id === asgn.animal_id)
      if (animal) {
        // Only add if not already covered by a category
        if (!animal.category_ids?.some((cid: string) => assignedCategoryIds.has(cid))) {
          individualAnimals.push(animal)
        }
      }
    })

    if (individualAnimals.length > 0) {
      grouped.push({ category: { id: 'individual', name: 'Individual Animals' }, animals: individualAnimals })
    }

    return grouped
  }, [scheduleRation, animals, animalCategories])

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
        animal.category_ids?.includes(categoryId)
      )
    )
  }, [animals, selectedConsumptionBatch])

  // Calculate feed category analysis (batch mode only — kept for legacy)
  const feedCategoryAnalysis = useMemo(() => {
    if (!selectedConsumptionBatch || !selectedConsumptionBatch.feed_type_categories) {
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

  // Get animals matching the selected feed mix recipe's target_animals (categories + individual)
  const recipeMatchingAnimals = useMemo(() => {
    if (!selectedFeedMixRecipe || selectedFeedMixRecipe === 'no-recipes') return []

    const selectedRecipe = loadedFeedMixRecipes.find(r => r.id === selectedFeedMixRecipe)
    if (!selectedRecipe) return []

    const ta = selectedRecipe.target_animals
    const categoryIds: string[] = ta?.category_ids ?? []
    const animalIds: string[] = ta?.animal_ids ?? []

    // No targets defined — recipe applies to all animals
    if (categoryIds.length === 0 && animalIds.length === 0) return animals

    const matched = new Set<string>()
    if (categoryIds.length > 0) {
      animals.forEach(animal => {
        if (categoryIds.some(cid => (animal.category_ids ?? []).includes(cid))) {
          matched.add(animal.id)
        }
      })
    }
    animalIds.forEach(id => matched.add(id))
    return animals.filter(a => matched.has(a.id))
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

  // Breakdown using the recipe's assigned target_animals (categories + individuals)
  const recipeCategoryBreakdown = useMemo(() => {
    if (!selectedFeedMixRecipe || selectedFeedMixRecipe === 'no-recipes') return []
    const recipe = loadedFeedMixRecipes.find(r => r.id === selectedFeedMixRecipe)
    if (!recipe) return []

    const ta = recipe.target_animals
    const categoryIds: string[] = ta?.category_ids ?? []
    const categoryNames: string[] = ta?.category_names ?? []
    const animalIds: string[] = ta?.animal_ids ?? []

    const items: { id: string; name: string; count: number; type: 'category' | 'individual' }[] = []

    // One entry per assigned category with a live animal count
    categoryIds.forEach((catId, idx) => {
      const name =
        categoryNames[idx] ??
        (animalCategories.find((c: any) => c.id === catId) as any)?.name ??
        'Unknown Category'
      const count = recipeMatchingAnimals.filter(a =>
        (a.category_ids ?? []).includes(catId)
      ).length
      items.push({ id: catId, name, count, type: 'category' })
    })

    // Individually assigned animals not already covered by a category
    if (animalIds.length > 0) {
      const coveredByCategory = new Set(
        recipeMatchingAnimals
          .filter(a => categoryIds.some(cid => (a.category_ids ?? []).includes(cid)))
          .map(a => a.id)
      )
      const individualCount = animalIds.filter(id => !coveredByCategory.has(id)).length
      if (individualCount > 0) {
        items.push({ id: '__individual__', name: 'Individual Animals', count: individualCount, type: 'individual' })
      }
    }

    return items
  }, [selectedFeedMixRecipe, loadedFeedMixRecipes, recipeMatchingAnimals, animalCategories])

  // Per-ingredient quantities for this session based on total_yield × session percentage
  const recipeSessionIngredients = useMemo(() => {
    if (!selectedFeedMixRecipe || selectedFeedMixRecipe === 'no-recipes') return []
    const recipe = loadedFeedMixRecipes.find(r => r.id === selectedFeedMixRecipe)
    if (!recipe?.ingredients || !recipe.total_yield) return []
    return (recipe.ingredients as any[]).map(ing => {
      const dailyQty = (recipe.total_yield! * (ing.percentage_of_mix ?? 0)) / 100
      const sessionQty = dailyQty * (recipeSessionPercentage / 100)
      const alreadyFed = todayRecipeConsumption[ing.feed_type_id] ?? 0
      const remaining = Math.max(0, dailyQty - alreadyFed - sessionQty)
      const ft = availableFeedTypes.find(f => f.id === ing.feed_type_id)
      return {
        feed_type_id: ing.feed_type_id,
        feed_name: ing.feed_name ?? ft?.name ?? 'Unknown',
        percentage_of_mix: ing.percentage_of_mix ?? 0,
        dailyQty,
        sessionQty,
        alreadyFed,
        remaining,
        costPerKg: ft?.costPerKg ?? 0,
      }
    })
  }, [selectedFeedMixRecipe, loadedFeedMixRecipes, recipeSessionPercentage, todayRecipeConsumption, availableFeedTypes])

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (editingRecord) {
        const mode: 'individual' | 'ration' | 'feed-mix-template' =
          editingRecord.feeding_mode === 'feed-mix-recipe'
            ? 'feed-mix-template'
            : (editingRecord.feeding_mode as any) || 'individual'
        setFeedingMode(mode)

        // Date
        const dateStr: string =
          editingRecord.consumption_date ||
          (editingRecord.feeding_time
            ? new Date(editingRecord.feeding_time).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0])
        setFeedingDate(dateStr)

        // Time
        if (editingRecord.feeding_time) {
          setFeedingTime(new Date(editingRecord.feeding_time).toTimeString().slice(0, 5))
        }

        // Animal count
        const count: number = editingRecord.animal_count || 1
        setAnimalCount(count)

        // Scalar observation fields
        setNotes(editingRecord.notes || '')
        setAppetiteScore(editingRecord.appetite_score ?? null)
        setWasteKg(editingRecord.approximate_waste_kg?.toString() || '')
        setObservationNotes(editingRecord.observational_notes || '')

        // Build feeds[] from the single record so the feed list renders correctly.
        // In individual/ration mode quantity_kg stored on FeedItem is per-animal.
        const totalQty: number = editingRecord.quantity_consumed ?? 0
        const perAnimalQty: number = count > 0 ? totalQty / count : totalQty
        const costPerKg: number =
          availableFeedTypes.find((ft: any) => ft.id === editingRecord.feed_type_id)
            ?.costPerKg ?? 0
        setFeeds([{
          id: `edit-${editingRecord.id}`,
          feed_type_id: editingRecord.feed_type_id || '',
          feed_name: editingRecord.feed_types?.name || 'Unknown Feed',
          quantity_kg: mode === 'individual' ? perAnimalQty : totalQty,
          cost_per_kg: costPerKg,
          notes: '',
        }])

        // Pre-select animals for individual mode
        if (mode === 'individual') {
          const consumedAnimals: any[] = editingRecord.feed_consumption_animals ?? []
          if (consumedAnimals.length > 0) {
            setSelectedAnimals(consumedAnimals.map((ca: any) => ca.animal_id))
          }
        }

        // Ration mode — restore selected ration
        if (mode === 'ration' && editingRecord.ration_id) {
          const ration = loadedRations.find((r: any) => r.id === editingRecord.ration_id)
          if (ration) setSelectedRation(ration)
        }

        // Recipe mode — restore selected recipe
        if (mode === 'feed-mix-template' && editingRecord.recipe_id) {
          setSelectedFeedMixRecipe(editingRecord.recipe_id)
        }

      } else {
        resetForm()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingRecord])

  // Restore feeding session selection once feedingSessions are loaded (async fetch)
  useEffect(() => {
    if (!editingRecord || feedingSessions.length === 0) return
    const slotId = (editingRecord.observations as any)?.time_slot_id
    if (!slotId) return
    const slot = feedingSessions.find(s => s.id === slotId)
    if (slot) setSelectedFeedingSession(slot)
  }, [editingRecord, feedingSessions])

  const resetForm = () => {
    setFeedingMode('individual')
    setFeedingDate(new Date().toISOString().split('T')[0])
    setFeedingTime(new Date().toTimeString().slice(0, 5))
    setSelectedRation(null)
    setShowRationAnimals(false)
    setShowRationIngredients(true)
    setSelectedBatch('')
    setSelectedFeedMixRecipe('')
    setFeeds([])
    setSelectedFeedType('')
    setSelectedAnimals([])
    setSelectedCategoryIds([])
    setAnimalSearch('')
    setTargetsExpanded(true)
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
    setRecipeSessionPercentage(100)
    setTodayRecipeConsumption({})
    setExpandedCategories(new Set())
    setExpandedCategories(new Set())
    setAppetiteScore(null)
    setWasteKg('')
    setObservationNotes('')
    // Schedule tab
    setModalTab('record')
    resetScheduleForm()
  }

  const resetScheduleForm = () => {
    setScheduleName('')
    setScheduleFromDate(new Date().toISOString().split('T')[0])
    setScheduleToDate(new Date().toISOString().split('T')[0])
    setScheduleTime(new Date().toTimeString().slice(0, 5))
    setScheduleSession(null)
    setScheduleSelectedSlotIds(new Set())
    setScheduleManualTimes([])
    setScheduleFeedingMode('individual')
    setScheduleRation(null)
    setScheduleShowRationIngredients(true)
    setScheduleShowRationAnimals(false)
    setScheduleSelectedRecipe('')
    setScheduleExpandedRecipeDetails(false)
    setScheduleFeeds([])
    setScheduleFeedType('')
    setScheduleQtyPerAnimal('')
    setScheduleExpandedFeeds(new Set())
    setScheduleFeedingSessionsExpanded(true)
    setScheduleRationSessionQtysExpanded(true)
    setScheduleRecipeSessionQtysExpanded(true)
    setScheduleIndividualSessionQtysExpanded(true)
    setScheduleTargetMode('all')
    setScheduleTargetCategories([])
    setScheduleTargetAnimals([])
    setScheduleNotes('')
    setScheduleErrors({})
    setScheduleSuccess(null)
  }

  const handleAddFeed = () => {
    const quantityValue = feedingMode === 'individual' ? parseFloat(quantity) : parseFloat(perCowQuantity)
    const feedLabel = feedingMode === 'individual' ? 'quantity' : 'quantity per animal'

    if (!selectedFeedType) {
      setErrors({ ...errors, feed: 'Select a feed type before adding' })
      return
    }

    if (isNaN(quantityValue) || quantityValue <= 0) {
      setErrors({ ...errors, feed: `Enter a valid ${feedLabel}` })
      return
    }

    const selectedFeedTypeInfo = availableFeedTypes.find(f => f.id === selectedFeedType)

    const newFeed: FeedItem = {
      id: `feed-${Date.now()}`,
      feed_type_id: selectedFeedType,
      feed_name: selectedFeedTypeInfo?.name || '',
      quantity_kg: feedingMode === 'individual' ? quantityValue : quantityValue * animalCount,
      cost_per_kg: selectedFeedTypeInfo?.costPerKg || 0,
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
      if (!selectedFeedMixRecipe || selectedFeedMixRecipe === 'no-recipes') {
        newErrors.feedMixRecipe = 'Please select a TMR recipe'
      } else {
        const recipe = loadedFeedMixRecipes.find(r => r.id === selectedFeedMixRecipe)
        if (!recipe?.total_yield) {
          newErrors.feedMixRecipe = 'The selected recipe has no total yield defined. Please edit the recipe to set a total yield.'
        }
        if (recipeMatchingAnimals.length === 0) {
          newErrors.feedMixRecipe = 'No animals match the recipe conditions'
        }
      }
      if (recipeSessionPercentage <= 0 || recipeSessionPercentage > 100) {
        newErrors.recipeSession = 'Session percentage must be between 1 and 100'
      }
    } else if (feedingMode === 'ration') {
      if (!selectedRation) {
        newErrors.ration = 'Please select a feed ration'
      }
      if (feeds.length === 0) {
        newErrors.feeds = 'No ingredients found for the selected ration'
      }
    } else {
      // Individual mode validation
      if (feeds.length === 0) {
        newErrors.feeds = 'Please add at least one feed to this session'
      }
      if (feedingMode === 'individual' && selectedAnimals.length === 0 && selectedCategoryIds.length === 0) {
        newErrors.animals = 'Please select at least one animal or animal category'
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

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
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

    console.log('=== FEED CONSUMPTION FORM SUBMISSION STARTED ===')
    console.log('Feeding Mode:', feedingMode)

    if (!validateForm()) {
      console.log('❌ Form validation failed')
      return
    }

    console.log('✅ Form validation passed')
    setIsSubmitting(true)
    try {
      // Create proper timestamp from feeding date and time
      const feedingDateTime = new Date(`${feedingDate}T${feedingTime}`)
      const feedingTimestamp = feedingDateTime.toISOString()

      console.log('--- BASIC SUBMISSION DETAILS ---')
      console.log('1. Feeding Date:', feedingDate)
      console.log('2. Feeding Time:', feedingTime)
      console.log('3. Feeding Timestamp (ISO):', feedingTimestamp)
      console.log('4. Feeding Session:', selectedFeedingSession?.slot_name || 'None selected')

      let consumptionData: any = {
        farmId,
        feedingDate,
        feedingTime: feedingTimestamp,
        mode: feedingMode === 'feed-mix-template' ? 'feed-mix-recipe' : feedingMode,
        type: feedingMode === 'feed-mix-template' ? 'recipe' : 'manual',
        // Time slot — stored as proper FK columns (migration 069)
        feedTimeSlotId: selectedFeedingSession?.id ?? null,
        slotName: selectedFeedingSession?.slot_name ?? null,
        // Session percentage for TMR recipe mode
        sessionPercentage: feedingMode === 'feed-mix-template' ? recipeSessionPercentage : null,
        // Observation fields for all modes
        appetiteScore: appetiteScore,
        approximateWasteKg: wasteKg ? parseFloat(wasteKg) : null,
        observationalNotes: observationNotes,
        notes: notes
      }

      console.log('--- BASIC CONSUMPTION DATA ---')
      console.log('farmId:', consumptionData.farmId)
      console.log('mode:', consumptionData.mode)
      console.log('notes:', consumptionData.notes)
      if (feedingMode === 'feed-mix-template') {
        const selectedRecipe = loadedFeedMixRecipes.find(r => r.id === selectedFeedMixRecipe)
        if (!selectedRecipe?.ingredients || !selectedRecipe.total_yield) {
          throw new Error('Selected recipe is missing ingredients or total yield')
        }

        consumptionData.feedMixRecipeId = selectedFeedMixRecipe
        consumptionData.animalCount = recipeMatchingAnimals.length

        // Get all individual animal IDs from the recipe's target animals
        const recipeAnimalIds = recipeMatchingAnimals.map(a => a.id)

        const entries: any[] = (selectedRecipe.ingredients as any[])
          .filter(ing => ing.feed_type_id)
          .map(ing => {
            const dailyQty = (selectedRecipe.total_yield! * (ing.percentage_of_mix ?? 0)) / 100
            const sessionQty = dailyQty * (recipeSessionPercentage / 100)
            const perAnimalQty = recipeMatchingAnimals.length > 0 ? sessionQty / recipeMatchingAnimals.length : 0
            return {
              feedTypeId: ing.feed_type_id,
              feedName: ing.feed_name,
              percentage: ing.percentage_of_mix,
              quantityKg: sessionQty,
              perCowQuantityKg: perAnimalQty,
              animalIds: recipeAnimalIds,
              costPerKg: availableFeedTypes.find(ft => ft.id === ing.feed_type_id)?.costPerKg ?? 0,
            }
          })
          .filter(e => e.quantityKg > 0)

        consumptionData.entries = entries

        console.log('--- FEED MIX RECIPE MODE DETAILS ---')
        console.log('Selected recipe:', selectedRecipe.name)
        console.log('Recipe animals from matching categories/individuals:', recipeAnimalIds.length, recipeAnimalIds)
        console.log('Session percentage:', recipeSessionPercentage)
        console.log('Recipe ingredients entries:', entries.length)
        entries.forEach((entry: any, idx: number) => {
          console.log(`Entry ${idx + 1}:`, {
            feedTypeId: entry.feedTypeId,
            feedName: entry.feedName,
            percentage: entry.percentage,
            quantityKg: entry.quantityKg,
            perCowQuantityKg: entry.perCowQuantityKg,
            animalCount: entry.animalIds.length,
            animalIds: entry.animalIds
          })
        })
        const ta = selectedRecipe.target_animals
        const catIds: string[] = ta?.category_ids ?? []
        const catNames: string[] = ta?.category_names ?? []
        const targetAnimalIds: string[] = ta?.animal_ids ?? []
        const categoryAnimals: any[] = catIds.map((catId, idx) => ({
          id: catId,
          name: catNames[idx] ?? animalCategories.find((c: any) => c.id === catId)?.name ?? 'Unknown',
          type: 'category',
          animals: recipeMatchingAnimals
            .filter(a => (a.category_ids ?? []).includes(catId))
            .map(a => ({ id: a.id, tag: a.tag_number, name: a.name })),
        }))
        const coveredByCategory = new Set(
          recipeMatchingAnimals
            .filter(a => catIds.some(cid => (a.category_ids ?? []).includes(cid)))
            .map(a => a.id)
        )
        const individualAnimals = recipeMatchingAnimals
          .filter(a => targetAnimalIds.includes(a.id) && !coveredByCategory.has(a.id))
          .map(a => ({ id: a.id, tag: a.tag_number, name: a.name }))
        if (individualAnimals.length > 0) {
          categoryAnimals.push({ id: '__individual__', name: 'Individual Animals', type: 'individual', animals: individualAnimals })
        }

        consumptionData.observations = {
          time_slot_id: selectedFeedingSession?.id ?? null,
          slot_name: selectedFeedingSession?.slot_name ?? null,
          recipe_id: selectedFeedMixRecipe,
          recipe_name: selectedRecipe.name,
          animal_count: recipeMatchingAnimals.length,
          session_percentage: recipeSessionPercentage,
          total_yield_kg: selectedRecipe.total_yield,
          category_animals: categoryAnimals,
          daily_ingredients: (selectedRecipe.ingredients as any[]).map(ing => ({
            feed_type_id: ing.feed_type_id,
            feed_name: ing.feed_name,
            percentage: ing.percentage_of_mix,
            daily_qty_kg: (selectedRecipe.total_yield! * (ing.percentage_of_mix ?? 0)) / 100,
          })),
        }
      } else {
        // Individual or Batch mode - convert feeds array to entries
        const entries = feeds.map(feed => ({
          feedTypeId: feed.feed_type_id,
          quantityKg: feed.quantity_kg,
          costPerKg: feed.cost_per_kg,
          notes: feed.notes
        }))

        console.log('--- FEED DETAILS ---')
        console.log(`Total feeds added: ${feeds.length}`)
        feeds.forEach((feed, idx) => {
          console.log(`Feed ${idx + 1}:`, {
            name: feed.feed_name,
            feedTypeId: feed.feed_type_id,
            quantityKgPerAnimal: feed.quantity_kg,
            quantityKgForAllAnimals: feed.quantity_kg * totalSelectedAnimals,
            costPerKg: feed.cost_per_kg,
            totalCostPerAnimal: feed.quantity_kg * feed.cost_per_kg,
            totalCostForAllAnimals: feed.quantity_kg * totalSelectedAnimals * feed.cost_per_kg,
            notes: feed.notes || 'None'
          })
        })

        if (feedingMode === 'individual') {
          console.log('--- INDIVIDUAL MODE DETAILS ---')
          console.log('Selected animals (individual):', selectedAnimals.length, selectedAnimals)
          console.log('Selected categories:', selectedCategoryIds.length, selectedCategoryIds)
          console.log('Total selected animals:', totalSelectedAnimals)
          console.log('All selected animal IDs:', allSelectedAnimalIds)

          consumptionData.entries = entries.map(e => ({
            ...e,
            animalIds: allSelectedAnimalIds,
            perCowQuantityKg: e.quantityKg,
            quantityKg: e.quantityKg * allSelectedAnimalIds.length,
          }))
          consumptionData.animalCount = allSelectedAnimalIds.length

          console.log(`Total animals for consumption: ${consumptionData.animalCount}`)
          console.log('Entries to be saved:', consumptionData.entries.length)
          consumptionData.entries.forEach((entry: any, idx: number) => {
            console.log(`Entry ${idx + 1}:`, {
              feedTypeId: entry.feedTypeId,
              quantityKg: entry.quantityKg,
              perCowQuantityKg: entry.perCowQuantityKg,
              costPerKg: entry.costPerKg,
              animalCount: entry.animalIds?.length,
              animalIds: entry.animalIds
            })
          })

          // Build observations for individual mode
          consumptionData.observations = {
            time_slot_id: selectedFeedingSession?.id ?? null,
            slot_name: selectedFeedingSession?.slot_name ?? null,
            animals: allSelectedAnimalIds.map(id => ({
              animal_id: id,
              appetite_observation: appetiteScore ? `Score: ${appetiteScore}` : null
            }))
          }
        } else if (feedingMode === 'ration') {
          console.log('--- RATION MODE DETAILS ---')
          console.log('Selected ration:', selectedRation?.name)
          console.log('Ration animals:', rationAnimals.length, rationAnimals.map(a => a.id))

          consumptionData.entries = entries.map(e => ({
            ...e,
            animalIds: rationAnimals.map(a => a.id),
            animalCount: rationAnimals.length || animalCount,
          }))
          consumptionData.rationId = selectedRation?.id
          consumptionData.animalCount = rationAnimals.length || animalCount

          console.log('Ration entries:', consumptionData.entries.length)

          consumptionData.observations = {
            time_slot_id: selectedFeedingSession?.id ?? null,
            slot_name: selectedFeedingSession?.slot_name ?? null,
            ration_id: selectedRation?.id,
            ration_name: selectedRation?.name,
            animal_count: rationAnimals.length,
            animals: rationAnimals.map(a => ({ animal_id: a.id, tag_number: a.tag_number, name: a.name })),
          }
        }
      }

      // Add record ID for updates
      if (isEditMode) {
        consumptionData.recordId = editingRecord.id
      }

      console.log('--- COMPLETE PAYLOAD TO BE SUBMITTED ---')
      console.log(JSON.stringify(consumptionData, null, 2))

      {
        const url = isEditMode ? `/api/feed/consumption/${editingRecord.id}` : '/api/feed/consumption'
        const method = isEditMode ? 'PUT' : 'POST'

        console.log(`--- API SUBMISSION ---`)
        console.log(`Endpoint: ${method} ${url}`)
        console.log('Sending to API...')

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(consumptionData)
        })

        console.log('API Response Status:', response.status, response.statusText)

        if (!response.ok) {
          const errorData = await response.json()
          console.error('❌ API Error Response:', errorData)
          throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'record'} consumption`)
        }

        const result = await response.json()
        console.log('✅ API Success Response:', result)
        console.log('Records saved:', result.records?.length || 0)
        if (result.records) {
          result.records.forEach((record: any, idx: number) => {
            console.log(`Record ${idx + 1}:`, {
              id: record.id,
              feedType: record.feed_type_id,
              quantity: record.quantity_consumed,
              date: record.consumption_date,
              animalCount: record.animal_count
            })
          })
        }
        console.log('=== SUBMISSION COMPLETED SUCCESSFULLY ===')
        onSuccess(result)
        onClose()
      }
    } catch (error) {
      console.error(`❌ Error ${isEditMode ? 'updating' : 'recording'} consumption:`, error)
      console.log('=== SUBMISSION FAILED ===')
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

  // ── Schedule tab helpers ───────────────────────────────────────────────────

  const handleAddScheduleFeed = () => {
    if (scheduleFeedingMode !== 'individual') return
    if (!scheduleFeedType || !scheduleQtyPerAnimal || parseFloat(scheduleQtyPerAnimal) <= 0) {
      setScheduleErrors(prev => ({ ...prev, feed: 'Select a feed type and enter a quantity per animal' }))
      return
    }
    const ft = availableFeedTypes.find(f => f.id === scheduleFeedType)
    const newFeed: FeedItem = {
      id: `sf-${Date.now()}`,
      feed_type_id: scheduleFeedType,
      feed_name: ft?.name ?? '',
      quantity_kg: parseFloat(scheduleQtyPerAnimal), // stored as per-animal
      cost_per_kg: ft?.costPerKg ?? 0,
    }
    setScheduleFeeds(prev => [...prev, newFeed])
    setScheduleFeedType('')
    setScheduleQtyPerAnimal('')
    setScheduleErrors(prev => { const e = { ...prev }; delete e.feed; return e })
  }

  const handleRemoveScheduleFeed = (id: string) => {
    setScheduleFeeds(prev => prev.filter(f => f.id !== id))
    setScheduleExpandedFeeds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  const toggleScheduleFeedExpanded = (id: string) => {
    setScheduleExpandedFeeds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const resolvedScheduleAnimalCount = (() => {
    if (scheduleTargetMode === 'specific') return scheduleTargetAnimals.length
    if (scheduleTargetMode === 'by_category') {
      return animals.filter(a =>
        scheduleTargetCategories.some(cid => a.category_ids?.includes(cid))
      ).length
    }
    return animals.length
  })()

  const validateScheduleForm = (): boolean => {
    const errs: Record<string, string> = {}
    if (!scheduleFromDate) errs.fromDate = 'From date is required'
    if (!scheduleToDate) errs.toDate = 'To date is required'
    if (scheduleFromDate && scheduleToDate && scheduleFromDate > scheduleToDate) {
      errs.dateRange = 'From date must be before or equal to To date'
    }
    const hasSessions = scheduleSessionsForDay.length > 0
    if (hasSessions && scheduleSelectedSlotIds.size === 0)
      errs.sessions = 'Select at least one feeding session'
    if (!hasSessions && scheduleManualTimes.length === 0)
      errs.sessions = 'Add at least one feeding time'
    // Mode-specific validation
    if (scheduleFeedingMode === 'ration' && !scheduleRation) errs.ration = 'Select a feed ration'
    if (scheduleFeedingMode === 'feed-mix-template') {
      if (!scheduleSelectedRecipe) errs.recipe = 'Select a TMR recipe'
    }
    if (scheduleFeeds.length === 0) errs.feeds = 'Feed list is empty — add at least one feed or adjust the ration / recipe selection'
    // Animal target validation
    if (scheduleTargetMode === 'by_category' && scheduleTargetCategories.length === 0)
      errs.target = 'Select at least one animal category'
    if (scheduleTargetMode === 'specific' && scheduleTargetAnimals.length === 0)
      errs.target = 'Select at least one animal'
    if (resolvedScheduleAnimalCount === 0) errs.target = 'No animals match the selected target'
    setScheduleErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateScheduleForm()) return

    setIsScheduling(true)
    setScheduleSuccess(null)

    // Build list of (slotId|null, time) pairs to schedule
    const hasSessions = scheduleSessionsForDay.length > 0
    const sessionSlots: Array<{ slotId: string | null; slotName: string | null; time: string }> = hasSessions
      ? scheduleSessionsForDay
        .filter(s => scheduleSelectedSlotIds.has(s.id))
        .map(s => ({ slotId: s.id, slotName: s.slot_name, time: s.scheduled_time.slice(0, 5) }))
      : scheduleManualTimes.map(t => ({ slotId: null, slotName: null, time: t }))

    try {
      const basePayload = {
        scheduleName: scheduleName.trim() || null,
        scheduledDateFrom: scheduleFromDate,
        scheduledDateTo: scheduleToDate,
        feedingMode: scheduleFeedingMode,
        rationId: scheduleFeedingMode === 'ration' ? scheduleRation?.id : null,
        recipeId: scheduleFeedingMode === 'feed-mix-template' ? scheduleSelectedRecipe : null,
        entries: scheduleFeeds.map(f => ({
          feedTypeId: f.feed_type_id,
          feedName: f.feed_name,
          quantityKgPerAnimal: f.quantity_kg,
          costPerKg: f.cost_per_kg,
        })),
        targetMode: scheduleTargetMode,
        targetCategoryIds: scheduleTargetCategories,
        targetAnimalIds: scheduleTargetAnimals,
        notes: scheduleNotes.trim() || null,
      }

      const results: any[] = []
      for (const slot of sessionSlots) {
        const payload = {
          ...basePayload,
          scheduledTime: slot.time,
          feedTimeSlotId: slot.slotId,
          slotName: slot.slotName,
        }
        const res = await fetch(`/api/farms/${farmId}/scheduled-feedings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || `Failed to schedule feeding for ${slot.slotName ?? slot.time}`)
        results.push(json)
      }

      const totalScheduled = results.length
      setScheduleSuccess(
        `Scheduled ${totalScheduled} session${totalScheduled !== 1 ? 's' : ''} from ${scheduleFromDate} to ${scheduleToDate}`
      )
      resetScheduleForm()
      onSuccess(results[results.length - 1])
    } catch (err) {
      setScheduleErrors(prev => ({
        ...prev,
        submit: err instanceof Error ? err.message : 'Failed to schedule feeding',
      }))
    } finally {
      setIsScheduling(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={`${isMobileView ? 'max-w-full mx-4 my-4 h-[95vh] flex flex-col' : 'max-w-4xl max-h-[90vh] flex flex-col'}`}
    >
      {/* Fixed Header - Not Scrollable */}
      <div className={`${isMobileView ? 'p-4' : 'p-5'} flex items-center justify-between border-b border-gray-200 flex-shrink-0 bg-white`}>
        <div className="flex items-center gap-3">
          <div className={`${isMobileView ? 'w-9 h-9' : 'w-10 h-10'} rounded-xl flex items-center justify-center flex-shrink-0 ${isEditMode ? 'bg-blue-100' : modalTab === 'schedule' ? 'bg-purple-100' : 'bg-green-100'
            }`}>
            {isEditMode ? (
              <Edit3 className="w-5 h-5 text-blue-600" />
            ) : modalTab === 'schedule' ? (
              <CalendarClock className="w-5 h-5 text-purple-600" />
            ) : (
              <Wheat className="w-5 h-5 text-green-600" />
            )}
          </div>
          <div>
            <h2 className={`${isMobileView ? 'text-lg' : 'text-xl'} font-bold text-gray-900 leading-tight`}>
              {isEditMode
                ? 'Edit Feed Consumption'
                : modalTab === 'schedule'
                  ? 'Schedule Feeding'
                  : 'Record Feed Consumption'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEditMode
                ? 'Update this feeding record'
                : modalTab === 'schedule'
                  ? 'Set up a future feeding session for your animals'
                  : 'Track individual or batch feeding for your animals'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tab Switcher — hidden when editing an existing record */}
      {!isEditMode && (
        <div className="flex border-b border-gray-200 flex-shrink-0 bg-white">
          {([
            { key: 'record', icon: <ClipboardList className="w-4 h-4" />, label: 'Record Feeding' },
            { key: 'schedule', icon: <CalendarClock className="w-4 h-4" />, label: 'Schedule Feeding' },
          ] as const).map(({ key, icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setModalTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${modalTab === key
                  ? key === 'schedule'
                    ? 'border-purple-500 text-purple-700 bg-purple-50/40'
                    : 'border-green-500 text-green-700 bg-green-50/40'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className={`${isMobileView ? 'p-4' : 'p-6'}`}>
          {modalTab === 'record' ? (
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

              <Card>
                <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                  <CardTitle className={`${isMobileView ? 'text-lg' : ''} flex items-center space-x-2`}>
                    <CalendarDays className="w-5 h-5 text-slate-700" />
                    <span>Feeding Session</span>
                  </CardTitle>
                  <CardDescription>
                    Pick a scheduled session for {currentDayLabel} and review the session details before recording feed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="feedingSession">Feeding Session</Label>
                    <Select
                      value={selectedFeedingSession?.id ?? ''}
                      onValueChange={(val) => {
                        const session = feedingSessions.find(slot => slot.id === val) ?? null
                        setSelectedFeedingSession(session)
                        if (session?.scheduled_time) {
                          setFeedingTime(session.scheduled_time.slice(0, 5))
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={`Select session for ${currentDayLabel}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {sessionLoading && (
                          <SelectItem value="loading" disabled>Loading sessions…</SelectItem>
                        )}
                        {!sessionLoading && sessionsForDay.length > 0 && sessionsForDay.map(slot => (
                          <SelectItem key={slot.id} value={slot.id}>
                            <div className="flex flex-col text-left">
                              <span>{slot.slot_name}</span>
                              <span className="text-xs text-gray-500">
                                {slot.scheduled_time.slice(0, 5)} · {slot.days_of_week.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).filter(Boolean).join(', ')}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                        {!sessionLoading && sessionsForDay.length === 0 && (
                          <SelectItem value="no-sessions" disabled>
                            No sessions scheduled for {currentDayLabel}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {sessionError && <p className="text-sm text-red-600 mt-1">{sessionError}</p>}
                  </div>

                  {selectedFeedingSession ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-500">Session</p>
                          <p className="font-semibold text-slate-900">{selectedFeedingSession.slot_name}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {selectedFeedingSession.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                        <div>
                          <p className="text-gray-500">Scheduled Time</p>
                          <p className="font-medium text-slate-900">{selectedFeedingSession.scheduled_time.slice(0, 5)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Applies On</p>
                          <p className="font-medium text-slate-900">
                            {selectedFeedingSession.days_of_week
                              .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.full)
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        </div>
                        {selectedFeedingSession.notes && (
                          <div className="col-span-2">
                            <p className="text-gray-500">Notes</p>
                            <p className="text-sm text-slate-700">{selectedFeedingSession.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                      {sessionLoading
                        ? 'Loading sessions for the selected day...'
                        : `Choose a feeding session to see details for ${currentDayLabel}.`}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Feeding Mode Selection */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Feeding Mode</p>
                <div className={`grid ${isMobileView ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-3'}`}>
                  {([
                    {
                      value: 'individual',
                      icon: <User className="w-5 h-5" />,
                      label: 'Individual',
                      description: 'Select specific animals and enter feed per session',
                      accent: 'blue',
                    },
                    {
                      value: 'feed-mix-template',
                      icon: <Leaf className="w-5 h-5" />,
                      label: 'TMR Recipe',
                      description: 'Apply a TMR recipe for TMR machines or mixed feed',
                      accent: 'amber',
                    },
                  ] as const).map(({ value, icon, label, description, accent }) => {
                    const active = feedingMode === value
                    const colors: Record<string, string> = {
                      blue: active
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40',
                      green: active
                        ? 'border-green-500 bg-green-50 ring-1 ring-green-400'
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50/40',
                      amber: active
                        ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-400'
                        : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/40',
                    }
                    const iconColors: Record<string, string> = {
                      blue: active ? 'text-blue-600' : 'text-gray-400',
                      green: active ? 'text-green-600' : 'text-gray-400',
                      amber: active ? 'text-amber-600' : 'text-gray-400',
                    }
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFeedingMode(value as any)}
                        className={`relative flex ${isMobileView ? 'flex-row items-center gap-3 p-3' : 'flex-col items-start gap-1.5 p-4'} rounded-xl border-2 text-left transition-all cursor-pointer ${colors[accent]}`}
                      >
                        <span className={`flex-shrink-0 ${iconColors[accent]}`}>{icon}</span>
                        <span className="flex-1 min-w-0">
                          <span className={`block text-sm font-semibold ${active ? 'text-gray-900' : 'text-gray-700'}`}>{label}</span>
                          {!isMobileView && (
                            <span className="block text-xs text-gray-500 mt-0.5 leading-snug">{description}</span>
                          )}
                        </span>
                        {active && (
                          <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${accent === 'blue' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                        )}
                      </button>
                    )
                  })}
                </div>
                {/* Hint: ration mode lives on the Schedule tab */}
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
                  Want to feed using a saved ration? Use the <button type="button" onClick={() => setModalTab('schedule')} className="text-purple-600 underline underline-offset-2 hover:text-purple-800">Schedule Feeding</button> tab — rations are designed as planned, recurring feeds.
                </p>
              </div>

              {/* Individual & Ration Feed Details */}
              {(feedingMode === 'individual' || feedingMode === 'ration') && (
                <div className="space-y-6">
                  {/* Ration Mode — Select a feed ration */}
                  {feedingMode === 'ration' && (
                    <Card>
                      <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                        <CardTitle className={`${isMobileView ? 'text-lg' : ''} flex items-center space-x-2`}>
                          <Target className="w-5 h-5 text-green-600" />
                          <span>Select Feed Ration</span>
                        </CardTitle>
                        <CardDescription>
                          Choose a ration to pre-fill ingredients and quantities for this session
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Select
                          value={selectedRation?.id ?? ''}
                          onValueChange={val => setSelectedRation(loadedRations.find(r => r.id === val) ?? null)}
                        >
                          <SelectTrigger className={errors.ration ? 'border-red-300' : ''}>
                            <SelectValue placeholder="Choose a feed ration…" />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingRations ? (
                              <div className="flex items-center gap-2 px-3 py-4 text-sm text-gray-500">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
                                Loading rations…
                              </div>
                            ) : loadedRations.filter(r => r.is_active).length > 0 ? (
                              loadedRations.filter(r => r.is_active).map(r => (
                                <SelectItem key={r.id} value={r.id} label={r.name}>
                                  {r.feed_ration_types?.name && (
                                    <Badge variant="outline" className="text-xs">{r.feed_ration_types.name}</Badge>
                                  )}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-rations" disabled>
                                No active rations — create one in the Feed Rations tab
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {errors.ration && <p className="text-sm text-red-600">{errors.ration}</p>}

                        {/* Ration info panel */}
                        {selectedRation && (
                          <div className="border border-green-200 rounded-lg bg-green-50 overflow-hidden">
                            <div className="p-4 space-y-3">
                              {/* Daily plan pre-fill banner */}
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={prefillFromDailyPlan}
                                  disabled={dailyPlanLoading}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                                >
                                  <Zap className="w-3.5 h-3.5" />
                                  {dailyPlanLoading ? 'Loading…' : 'Pre-fill from Daily Plan'}
                                </button>
                                {dailyPlanBanner && (
                                  <span className="text-xs text-gray-600 flex-1">{dailyPlanBanner}</span>
                                )}
                              </div>

                              {/* Summary row */}
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-green-700 font-medium text-xs">Ration Type</p>
                                  <p className="text-green-900 font-semibold">
                                    {selectedRation.feed_ration_types?.name ?? '—'}
                                  </p>
                                  {selectedRation.feed_ration_types?.target_stage && (
                                    <p className="text-green-700 text-xs">{selectedRation.feed_ration_types.target_stage}</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-green-700 font-medium text-xs">Animals</p>
                                  <p className="text-green-900 font-semibold">{rationAnimalCount}</p>
                                  <p className="text-green-700 text-xs">{rationAnimalCount === 0 ? 'No assignments' : 'assigned'}</p>
                                </div>
                                <div>
                                  <p className="text-green-700 font-medium text-xs">Ingredients</p>
                                  <p className="text-green-900 font-semibold">
                                    {selectedRation.feed_ration_ingredients?.length ?? 0}
                                  </p>
                                  <p className="text-green-700 text-xs">
                                    {(selectedRation.feed_ration_ingredients as any[] ?? []).some((i: any) => i.tmr_recipe_id) ? 'incl. TMR' : 'feed items'}
                                  </p>
                                </div>
                              </div>

                              {/* Feeds loaded + sessions quick stats */}
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-white rounded border border-green-100 px-3 py-2">
                                  <p className="text-green-700 font-medium text-xs">Feeds Loaded</p>
                                  <p className="text-green-900 font-semibold">{feeds.length}</p>
                                  <p className="text-green-600 text-xs">
                                    {feeds.length > 0 ? `${feeds.reduce((s, f) => s + f.quantity_kg, 0).toFixed(1)} kg total` : 'not yet loaded'}
                                  </p>
                                </div>
                                <div className="bg-white rounded border border-green-100 px-3 py-2">
                                  <p className="text-green-700 font-medium text-xs">Feeding Sessions</p>
                                  <p className="text-green-900 font-semibold">
                                    {(() => {
                                      const rationSlots = (selectedRation.feed_ration_sessions as any[] ?? []).filter((s: any) => s.is_active).length
                                      if (rationSlots > 0) return rationSlots
                                      // count unique slot IDs from ingredient-level sessions
                                      const ids = new Set<string>()
                                      for (const ing of (selectedRation.feed_ration_ingredients as any[] ?? [])) {
                                        for (const s of (ing.feed_ingredient_sessions ?? [])) {
                                          if (s.time_slot_id || s.feed_time_slots?.id) ids.add(s.feed_time_slots?.id ?? s.time_slot_id)
                                        }
                                      }
                                      return ids.size
                                    })()}
                                  </p>
                                  {selectedFeedingSession && (
                                    <p className="text-green-600 text-xs truncate">Auto: {selectedFeedingSession.slot_name}</p>
                                  )}
                                </div>
                              </div>

                              {/* Description & Notes */}
                              {(selectedRation.description || selectedRation.notes) && (
                                <div className="space-y-1">
                                  {selectedRation.description && (
                                    <p className="text-sm text-green-800 bg-green-100 rounded px-3 py-1.5">{selectedRation.description}</p>
                                  )}
                                  {selectedRation.notes && (
                                    <p className="text-xs text-green-700 italic px-1">{selectedRation.notes}</p>
                                  )}
                                </div>
                              )}

                              {/* Assigned categories */}
                              {(() => {
                                const cats = (selectedRation.feed_ration_assignments as any[] ?? [])
                                  .filter((a: any) => (a.assignment_type === 'category' || a.assignment_type === 'group') && a.is_active && a.animal_categories?.name)
                                if (cats.length === 0) return null
                                return (
                                  <div className="flex flex-wrap gap-1.5">
                                    {cats.map((a: any) => (
                                      <span key={a.id} className="text-xs bg-green-100 border border-green-300 text-green-800 rounded-full px-2 py-0.5">
                                        {a.animal_categories.name}
                                      </span>
                                    ))}
                                  </div>
                                )
                              })()}

                              {/* Feeding time slots — prefer ration-level sessions, fall back to ingredient-level */}
                              {(() => {
                                const rationSlots = (selectedRation.feed_ration_sessions as any[] ?? [])
                                const slotNames: string[] = rationSlots.length > 0
                                  ? rationSlots.sort((a: any, b: any) => a.sort_order - b.sort_order)
                                      .map((s: any) => s.custom_slot_name || s.feed_time_slots?.slot_name).filter(Boolean)
                                  : (() => {
                                      const seen = new Set<string>()
                                      const names: string[] = []
                                      for (const ing of (selectedRation.feed_ration_ingredients as any[] ?? [])) {
                                        for (const s of ([...(ing.feed_ingredient_sessions ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order))) {
                                          const id = s.feed_time_slots?.id ?? s.time_slot_id
                                          if (id && !seen.has(id)) { seen.add(id); names.push(s.feed_time_slots?.slot_name) }
                                        }
                                      }
                                      return names.filter(Boolean)
                                    })()
                                if (slotNames.length === 0) return null
                                return (
                                  <div className="text-xs text-green-700">
                                    <span className="font-medium">Feeding times: </span>
                                    {slotNames.join(' · ')}
                                  </div>
                                )
                              })()}
                              {/* Ingredients toggle */}
                              <button
                                type="button"
                                onClick={() => setShowRationIngredients(p => !p)}
                                className="w-full flex items-center justify-between px-3 py-2 bg-green-100 hover:bg-green-200 rounded border border-green-300 text-sm font-medium text-green-900 transition-colors"
                              >
                                <span className="flex items-center gap-2">
                                  <Leaf className="w-4 h-4" />
                                  Ingredients &amp; Quantities
                                </span>
                                {showRationIngredients ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>

                              {showRationIngredients && (
                                <div className="bg-white rounded border border-green-100 divide-y divide-green-50">
                                  {(selectedRation.feed_ration_ingredients ?? []).length === 0 ? (
                                    <p className="p-3 text-sm text-gray-400 text-center">No ingredients on this ration</p>
                                  ) : (
                                    (selectedRation.feed_ration_ingredients as any[])
                                      .sort((a, b) => a.sort_order - b.sort_order)
                                      .map((ing: any) => {
                                        const totalKg = (ing.quantity_kg_per_day ?? 0) * (rationAnimalCount || 1)
                                        const isTMR = !!ing.tmr_recipe_id
                                        const tmrRecipe = isTMR ? loadedFeedMixRecipes.find(r => r.id === ing.tmr_recipe_id) : null
                                        const feedLabel = isTMR
                                          ? (ing.feed_mix_recipes?.name ?? tmrRecipe?.name ?? 'TMR Recipe')
                                          : (ing.feed_types?.name ?? availableFeedTypes.find(f => f.id === ing.feed_type_id)?.name ?? feedTypes.find(f => f.id === ing.feed_type_id)?.name ?? 'Unknown feed')
                                        const tmrIngredients = tmrRecipe?.ingredients ?? []
                                        const isExpanded = expandedFeeds.has(ing.id)
                                        return (
                                          <div key={ing.id} className="space-y-0">
                                            <div className="px-3 py-2 flex items-start justify-between text-sm gap-2">
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                {isTMR && tmrIngredients.length > 0 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => setExpandedFeeds(p => {
                                                      const n = new Set(p)
                                                      if (n.has(ing.id)) n.delete(ing.id)
                                                      else n.add(ing.id)
                                                      return n
                                                    })}
                                                    className="flex-shrink-0 hover:bg-green-100 rounded p-0.5"
                                                  >
                                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />}
                                                  </button>
                                                )}
                                                <span className="text-gray-800 font-medium truncate">{feedLabel}</span>
                                                {isTMR && (
                                                  <Badge variant="outline" className="text-xs shrink-0 text-amber-700 border-amber-300 bg-amber-50">TMR</Badge>
                                                )}
                                              </div>
                                              <div className="text-right shrink-0">
                                                <span className="text-gray-700 font-semibold tabular-nums">
                                                  {totalKg.toFixed(2)} kg total
                                                </span>
                                                <span className="text-gray-400 text-xs block">
                                                  {ing.quantity_kg_per_day} kg/animal
                                                  {ing.percentage != null ? ` · ${ing.percentage}%` : ''}
                                                </span>
                                                {ing.notes && <span className="text-gray-400 text-xs block italic">{ing.notes}</span>}
                                              </div>
                                            </div>
                                            {isTMR && isExpanded && tmrIngredients.length > 0 && (
                                              <div className="bg-amber-50 px-3 py-2 border-t border-green-100 space-y-1">
                                                <p className="text-xs font-semibold text-amber-900 mb-2">TMR Ingredients ({tmrIngredients.length}):</p>
                                                {(tmrIngredients as any[]).map((tmrIng: any, idx: number) => {
                                                  const tmrIngQtyPerDay = ((ing.quantity_kg_per_day ?? 0) * (tmrIng.percentage_of_mix ?? 0)) / 100
                                                  const tmrIngTotal = tmrIngQtyPerDay * (rationAnimalCount || 1)
                                                  const feedName = tmrIng.feed_name ?? availableFeedTypes.find(f => f.id === tmrIng.feed_type_id)?.name ?? feedTypes.find(f => f.id === tmrIng.feed_type_id)?.name ?? 'Unknown'
                                                  return (
                                                    <div key={idx} className="flex justify-between items-center text-xs px-2 py-1 bg-white rounded border border-amber-100">
                                                      <div className="flex items-center gap-1 min-w-0">
                                                        <span className="text-amber-600 font-medium">→</span>
                                                        <span className="text-gray-700 truncate">{feedName}</span>
                                                        {tmrIng.priority && <Badge variant="outline" className="text-xs shrink-0">{tmrIng.priority}</Badge>}
                                                      </div>
                                                      <div className="text-right shrink-0 whitespace-nowrap">
                                                        <span className="text-gray-700 font-semibold">{tmrIngTotal.toFixed(2)} kg</span>
                                                        <span className="text-gray-500 text-xs ml-1">({tmrIng.percentage_of_mix}%)</span>
                                                      </div>
                                                    </div>
                                                  )
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })
                                  )}
                                </div>
                              )}

                              {/* Estimated total daily cost */}
                              {(() => {
                                const ings = selectedRation.feed_ration_ingredients as any[] ?? []
                                const totalKgPerDay = ings.reduce((s: number, i: any) => s + ((i.quantity_kg_per_day ?? 0) * (rationAnimalCount || 1)), 0)
                                if (totalKgPerDay === 0) return null
                                return (
                                  <div className="flex items-center justify-between text-xs text-green-800 bg-green-100 rounded px-3 py-1.5">
                                    <span>Est. total feed / day</span>
                                    <span className="font-bold">{totalKgPerDay.toFixed(2)} kg</span>
                                  </div>
                                )
                              })()}

                              {/* Animals toggle */}
                              <button
                                type="button"
                                onClick={() => setShowRationAnimals(p => !p)}
                                className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 text-sm font-medium text-blue-900 transition-colors"
                              >
                                <span className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  Animals in this Feeding ({rationAnimalCount})
                                </span>
                                {showRationAnimals ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>

                              {showRationAnimals && (
                                <div className="bg-white rounded border border-blue-100">
                                  {rationAnimalCount === 0 ? (
                                    <div className="p-4 text-center">
                                      <AlertCircle className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                                      <p className="text-sm text-gray-500">
                                        No animals are assigned to this ration yet.
                                        Go to Feed Rations → Assign to add animals.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-2 p-3`}>
                                      {rationAnimals.map(animal => (
                                        <div
                                          key={animal.id}
                                          className="flex items-center gap-2 p-2 border border-blue-100 rounded-lg bg-blue-50"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                              {animal.name ? `${animal.tag_number} — ${animal.name}` : animal.tag_number}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {animal.production_status?.replace(/_/g, ' ') ?? 'Active'}
                                            </p>
                                          </div>
                                          <Badge variant="outline" className="text-xs flex-shrink-0">
                                            {animal.gender ?? 'N/A'}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}


                  {/* REMOVED: old batch info card is replaced — keeping marker for diff clarity */}
                  {false && selectedConsumptionBatch && (
                    <div className="border border-blue-200 rounded-lg bg-blue-50 overflow-hidden">
                      <div className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-blue-700 font-medium">Batch</p>
                            <p className="text-blue-900 font-semibold">{selectedConsumptionBatch?.batch_name}</p>
                          </div>
                          <div>
                            <p className="text-blue-700 font-medium">Target Animals</p>
                            <p className="text-blue-900 font-semibold">{selectedConsumptionBatch?.targeted_animals_count || animalCount}</p>
                          </div>
                          <div>
                            <p className="text-blue-700 font-medium">Feeding Frequency</p>
                            <p className="text-blue-900 font-semibold">{selectedConsumptionBatch?.feeding_frequency_per_day}x daily</p>
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
                                      className={`text-xs whitespace-nowrap ${animal.source === 'specific'
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
                          {(selectedConsumptionBatch?.feed_type_categories?.length ?? 0) > 0 ? (
                            <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-3 p-4`}>
                              {selectedConsumptionBatch?.feed_type_categories.map((feedCat) => {
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
                                        Daily: {(quantityInKg * (selectedConsumptionBatch?.feeding_frequency_per_day ?? 1)).toFixed(2)}kg × {selectedConsumptionBatch?.feeding_frequency_per_day}x
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

                  {/* Feed Details Card with Add Feed Button — individual mode only */}
                  {feedingMode === 'individual' && <Card>
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
                      {errors.feed && (
                        <p className="text-sm text-red-600">{errors.feed}</p>
                      )}
                      {feedingMode === 'individual' ? (
                        <>
                          {/* Individual Mode - Feed Selection Inputs */}
                          <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-4 pb-4 border-b`}>
                            <div>
                              <Label htmlFor="feedType">Feed Type *</Label>
                              <Select value={selectedFeedType} onValueChange={val => {
                                setSelectedFeedType(val)
                              }}>
                                <SelectTrigger className={errors.feedType ? 'border-red-300 mt-1' : 'mt-1'}>
                                  <SelectValue placeholder="Select feed type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {recordAvailableFeedTypes.map(feedType => {
                                    const catName = feedTypeCategories.find(c => c.id === feedType.category_id)?.name
                                    const isLowStock = feedType.totalStock > 0 && feedType.totalStock < 10
                                    return (
                                      <SelectItem key={feedType.id} value={feedType.id} label={feedType.name}>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                                          {catName && <Badge variant="outline" className="text-xs">{catName}</Badge>}
                                          <span className={isLowStock ? 'text-orange-600 font-medium' : ''}>
                                            {feedType.totalStock.toFixed(1)} kg{isLowStock ? ' — low' : ''}
                                          </span>
                                          {feedType.costPerKg > 0 && (
                                            <span>· Kes {feedType.costPerKg.toFixed(2)}/kg</span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    )
                                  })}
                                  {recordAvailableFeedTypes.length === 0 && (
                                    <SelectItem value="no-stock" disabled>
                                      No feeds available
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-gray-500 mt-2">Showing all feed types with available stock.</p>
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
                              {errors.quantity ? (
                                <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>
                              ) : (
                                <>
                                  {quantity && !isNaN(parseFloat(quantity)) && parseFloat(quantity) > 0 && totalSelectedAnimals > 0 && (
                                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                                      <p className="font-medium">Total for {totalSelectedAnimals} animal{totalSelectedAnimals !== 1 ? 's' : ''}:</p>
                                      <p className="font-semibold">{parseFloat(quantity).toFixed(1)} kg × {totalSelectedAnimals} = {(parseFloat(quantity) * totalSelectedAnimals).toFixed(1)} kg</p>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Added Feeds Display */}
                          {feeds.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                              <Wheat className="w-8 h-8 mb-2 text-gray-300" />
                              <p className="text-sm font-medium text-gray-500">No feeds added yet</p>
                              <p className="text-xs text-gray-400 mt-1">Select a feed type and quantity above, then click Add Feed</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {feeds.map((feed) => (
                                <div key={feed.id} className="border rounded-xl bg-white shadow-sm overflow-hidden">
                                  <div className="flex items-center gap-2 px-3 py-2.5">
                                    <button
                                      type="button"
                                      onClick={() => toggleFeedExpanded(feed.id)}
                                      className="flex items-center gap-2 flex-1 text-left min-w-0"
                                    >
                                      {expandedFeeds.has(feed.id) ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      )}
                                      <span className="text-sm font-semibold text-gray-900 truncate">{feed.feed_name}</span>
                                    </button>
                                    {/* Inline summary badges (visible when collapsed) */}
                                    {!expandedFeeds.has(feed.id) && (
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                                          {feed.quantity_kg.toFixed(1)} kg/animal
                                        </span>
                                        <span className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">
                                          {(feed.quantity_kg * totalSelectedAnimals).toFixed(1)} kg total
                                        </span>
                                        <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                                          Kes {(feed.quantity_kg * totalSelectedAnimals * feed.cost_per_kg).toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    <Button
                                      type="button"
                                      onClick={() => handleRemoveFeed(feed.id)}
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 h-7 w-7 p-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                  {expandedFeeds.has(feed.id) && (
                                    <div className={`px-3 pb-3 border-t border-gray-100 pt-3 space-y-3 text-xs`}>
                                      {/* Per Animal Breakdown */}
                                      <div className={`grid ${isMobileView ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
                                        <div className="p-2 bg-white rounded border border-gray-200">
                                          <p className="text-gray-600 font-medium">Unit Cost</p>
                                          <p className="font-semibold text-gray-900">Kes{feed.cost_per_kg.toFixed(2)}/kg</p>
                                        </div>
                                        <div className="p-2 bg-blue-50 rounded border border-blue-200">
                                          <p className="text-blue-700 font-medium">Per Animal</p>
                                          <p className="font-semibold text-blue-900">{feed.quantity_kg.toFixed(1)} kg</p>
                                          <p className="text-xs text-blue-600 mt-1">Kes{(feed.quantity_kg * feed.cost_per_kg).toFixed(2)}/animal</p>
                                        </div>
                                        <div className="p-2 bg-purple-50 rounded border border-purple-200">
                                          <p className="text-purple-700 font-medium">Animals</p>
                                          <p className="font-semibold text-purple-900">{totalSelectedAnimals}</p>
                                        </div>
                                      </div>

                                      {/* Total Summary */}
                                      <div className="p-3 bg-green-50 rounded border border-green-200 space-y-2">
                                        <div className="flex justify-between items-start">
                                          <span className="text-green-700 font-medium">Total Quantity:</span>
                                          <span className="font-bold text-green-900">{(feed.quantity_kg * totalSelectedAnimals).toFixed(1)} kg</span>
                                        </div>
                                        <p className="text-xs text-green-600">{feed.quantity_kg.toFixed(1)} kg/animal × {totalSelectedAnimals} animals</p>
                                        <div className="border-t border-green-200 pt-2 mt-2">
                                          <div className="flex justify-between items-start">
                                            <span className="text-green-700 font-bold">Total Cost:</span>
                                            <span className="font-bold text-green-900 text-sm">Kes{(feed.quantity_kg * totalSelectedAnimals * feed.cost_per_kg).toFixed(2)}</span>
                                          </div>
                                          <p className="text-xs text-green-600 mt-1">Kes{feed.cost_per_kg.toFixed(2)}/kg × {(feed.quantity_kg * totalSelectedAnimals).toFixed(1)} kg</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Total session cost summary */}
                          {feeds.length > 0 && (() => {
                            const totalKgPerAnimal = feeds.reduce((s, f) => s + f.quantity_kg, 0)
                            const totalCostPerAnimal = feeds.reduce((s, f) => s + f.quantity_kg * f.cost_per_kg, 0)
                            const totalKgAllAnimals = totalKgPerAnimal * totalSelectedAnimals
                            const totalCostAllAnimals = totalCostPerAnimal * totalSelectedAnimals
                            return (
                              <div className="space-y-2 mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  {/* Per Animal Summary */}
                                  <div className="border border-green-200 rounded p-2 bg-white">
                                    <p className="text-green-700 font-medium text-xs">Per Animal</p>
                                    <p className="text-gray-900 font-semibold">{totalKgPerAnimal.toFixed(1)} kg</p>
                                    <p className="text-green-600 text-xs mt-1">Kes {totalCostPerAnimal.toFixed(2)}</p>
                                  </div>
                                  {/* All Animals Summary */}
                                  <div className="border border-green-300 rounded p-2 bg-green-100">
                                    <p className="text-green-800 font-bold text-xs">Total ({totalSelectedAnimals} animals)</p>
                                    <p className="text-green-900 font-bold">{totalKgAllAnimals.toFixed(1)} kg</p>
                                    <p className="text-green-800 font-bold text-sm mt-1">Kes {totalCostAllAnimals.toFixed(2)}</p>
                                  </div>
                                </div>
                                <div className="text-xs text-green-700 pt-2 border-t border-green-200">
                                  <p className="font-medium">{feeds.length} feed{feeds.length !== 1 ? 's' : ''} · {totalKgPerAnimal.toFixed(1)} kg/animal × {totalSelectedAnimals} animals = {totalKgAllAnimals.toFixed(1)} kg total</p>
                                </div>
                              </div>
                            )
                          })()}
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
                                  {recordAvailableFeedTypes.map(feedType => (
                                    <SelectItem key={feedType.id} value={feedType.id} label={feedType.name}>
                                      <span>{feedType.name}</span>
                                    </SelectItem>
                                  ))}
                                  {recordAvailableFeedTypes.length === 0 && (
                                    <SelectItem value="no-stock" disabled>
                                      No feeds available
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-gray-500 mt-2">Showing all feed types with available stock.</p>
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
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                              <Wheat className="w-8 h-8 mb-2 text-gray-300" />
                              <p className="text-sm font-medium text-gray-500">No feeds added yet</p>
                              <p className="text-xs text-gray-400 mt-1">Select a feed type and quantity per animal, then click Add Feed</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {feeds.map((feed) => {
                                const perAnimalQty = feed.quantity_kg / animalCount
                                const costPerAnimal = perAnimalQty * feed.cost_per_kg
                                const totalCost = feed.quantity_kg * feed.cost_per_kg

                                return (
                                  <div key={feed.id} className="border rounded-xl bg-white shadow-sm overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 py-2.5">
                                      <button
                                        type="button"
                                        onClick={() => toggleFeedExpanded(feed.id)}
                                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                                      >
                                        {expandedFeeds.has(feed.id) ? (
                                          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        )}
                                        <span className="text-sm font-semibold text-gray-900 truncate">{feed.feed_name}</span>
                                      </button>
                                      {!expandedFeeds.has(feed.id) && (
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          <span className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">
                                            {(feed.quantity_kg / animalCount).toFixed(1)} kg/animal
                                          </span>
                                          <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                                            Kes {totalCost.toFixed(2)}
                                          </span>
                                        </div>
                                      )}
                                      <Button
                                        type="button"
                                        onClick={() => handleRemoveFeed(feed.id)}
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 h-7 w-7 p-0"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                    {expandedFeeds.has(feed.id) && (
                                      <div className={`px-3 pb-3 border-t border-gray-100 pt-3 grid ${isMobileView ? 'grid-cols-2' : 'grid-cols-3'} gap-3 text-xs`}>
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
                  </Card>}

                  {/* Animal Selection Card for Individual Mode */}
                  {feedingMode === 'individual' && (
                    <Card>
                      <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                        <button
                          type="button"
                          onClick={() => setTargetsExpanded(!targetsExpanded)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <div>
                            <CardTitle className={`${isMobileView ? 'text-lg' : ''} flex items-center gap-2`}>
                              <Users className="w-5 h-5 text-blue-600" />
                              <span>Select Animals</span>
                              {/* {totalSelectedAnimals > 0 && (
                            <span className="inline-flex items-center justify-center text-xs font-semibold bg-blue-600 text-white rounded-full min-w-[1.25rem] h-5 px-1.5">
                              {totalSelectedAnimals}
                            </span>
                          )} */}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              Select specific animals or entire categories for this feeding session
                            </CardDescription>
                          </div>
                          {targetsExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                        </button>
                      </CardHeader>
                      {targetsExpanded && (
                        <CardContent className="space-y-3 pt-0">
                          <Tabs defaultValue="all-animals" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-3">
                              <TabsTrigger value="by-category" className="flex items-center gap-1.5 text-xs">
                                <Tags className="w-3.5 h-3.5" />
                                By Category
                                {selectedCategoryIds.length > 0 && (
                                  <span className="inline-flex items-center justify-center text-xs font-semibold bg-blue-600 text-white rounded-full min-w-[1.1rem] h-4 px-1">
                                    {selectedCategoryIds.length}
                                  </span>
                                )}
                              </TabsTrigger>
                              <TabsTrigger value="all-animals" className="flex items-center gap-1.5 text-xs">
                                <User className="w-3.5 h-3.5" />
                                All Animals
                                {selectedAnimals.length > 0 && (
                                  <span className="inline-flex items-center justify-center text-xs font-semibold bg-blue-600 text-white rounded-full min-w-[1.1rem] h-4 px-1">
                                    {selectedAnimals.length}
                                  </span>
                                )}
                              </TabsTrigger>
                            </TabsList>

                            {/* By Category Tab */}
                            <TabsContent value="by-category" className="mt-0 max-h-[42vh] overflow-y-auto space-y-1.5 pr-1">
                              {animalCategories.length === 0 ? (
                                <div className="text-center py-6 text-sm text-gray-400">No categories found</div>
                              ) : (
                                <div className="space-y-1.5">
                                  {animalCategories.map(category => {
                                    const count = animals.filter(a => a.category_ids?.includes(category.id)).length
                                    const isChecked = selectedCategoryIds.includes(category.id)
                                    const isExpanded = expandedCategories.has(category.id)
                                    const categoryAnimals = animals.filter(a => a.category_ids?.includes(category.id))
                                    return (
                                      <div key={category.id} className="space-y-1">
                                        <label
                                          className={`flex items-center gap-3 cursor-pointer rounded-lg border px-3 py-2.5 transition-colors ${isChecked
                                              ? 'bg-blue-50 border-blue-300'
                                              : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                            }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleCategoryToggle(category.id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className={`font-medium text-sm ${isChecked ? 'text-blue-900' : 'text-gray-800'}`}>
                                              {category.name}
                                            </div>
                                            <div className="text-xs text-gray-500">{count} animal{count !== 1 ? 's' : ''}</div>
                                          </div>
                                          {isChecked && (
                                            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                          )}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault()
                                              toggleCategoryExpanded(category.id)
                                            }}
                                            className="flex-shrink-0 ml-2 p-1 rounded hover:bg-gray-100 transition-colors"
                                          >
                                            {isExpanded ? (
                                              <ChevronUp className="w-4 h-4 text-gray-400" />
                                            ) : (
                                              <ChevronDown className="w-4 h-4 text-gray-400" />
                                            )}
                                          </button>
                                        </label>
                                        {isExpanded && categoryAnimals.length > 0 && (
                                          <div className="ml-6 space-y-1 border-l-2 border-gray-200 pl-4">
                                            {categoryAnimals.map(animal => {
                                              const animalIsChecked = selectedAnimals.includes(animal.id)
                                              return (
                                                <label
                                                  key={animal.id}
                                                  className={`flex items-center gap-3 cursor-pointer rounded-lg border px-3 py-2 transition-colors ${animalIsChecked
                                                      ? 'bg-blue-50 border-blue-300'
                                                      : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                                    }`}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={animalIsChecked}
                                                    onChange={() => handleAnimalToggle(animal.id)}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                  />
                                                  <div className="flex-1 min-w-0">
                                                    <div className={`font-medium text-sm ${animalIsChecked ? 'text-blue-900' : 'text-gray-800'}`}>
                                                      {animal.tag_number}
                                                    </div>
                                                    {animal.name && (
                                                      <div className="text-xs text-gray-500 truncate">{animal.name}</div>
                                                    )}
                                                  </div>
                                                  {animalIsChecked && (
                                                    <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                                  )}
                                                </label>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </TabsContent>

                            {/* All Animals Tab */}
                            <TabsContent value="all-animals" className="mt-0 space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                              {/* Search + Select All row */}
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                                  <Input
                                    type="text"
                                    placeholder="Search by tag or name…"
                                    value={animalSearch}
                                    onChange={(e) => setAnimalSearch(e.target.value)}
                                    className="pl-9 h-9 text-sm"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allIds = filteredAnimals.map(a => a.id)
                                    const allSelected = allIds.every(id => selectedAnimals.includes(id))
                                    if (allSelected) {
                                      setSelectedAnimals(prev => prev.filter(id => !allIds.includes(id)))
                                    } else {
                                      setSelectedAnimals(prev => Array.from(new Set([...prev, ...allIds])))
                                    }
                                  }}
                                  className="shrink-0 px-3 h-9 text-xs font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
                                >
                                  {filteredAnimals.length > 0 && filteredAnimals.every(a => selectedAnimals.includes(a.id))
                                    ? 'Deselect All'
                                    : 'Select All'}
                                </button>
                              </div>

                              {/* Animal count summary */}
                              <div className="text-xs text-gray-500 flex items-center justify-between px-0.5">
                                <span>{filteredAnimals.length} animal{filteredAnimals.length !== 1 ? 's' : ''}{animalSearch ? ' found' : ' total'}</span>
                                {selectedAnimals.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAnimals([])}
                                    className="text-red-500 hover:text-red-700 font-medium transition-colors"
                                  >
                                    Clear selection
                                  </button>
                                )}
                              </div>

                              {/* Animal list — no max-h cap, scrolls naturally */}
                              {filteredAnimals.length === 0 ? (
                                <div className="text-center py-6 text-sm text-gray-400">
                                  {animalSearch ? 'No animals match your search' : 'No animals found'}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {filteredAnimals.map(animal => {
                                    const isChecked = selectedAnimals.includes(animal.id)
                                    return (
                                      <label
                                        key={animal.id}
                                        className={`flex items-center gap-3 cursor-pointer rounded-lg border px-3 py-2 transition-colors ${isChecked
                                            ? 'bg-blue-50 border-blue-300'
                                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                          }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleAnimalToggle(animal.id)}
                                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className={`font-medium text-sm ${isChecked ? 'text-blue-900' : 'text-gray-800'}`}>
                                            {animal.tag_number}
                                          </div>
                                          {animal.name && (
                                            <div className="text-xs text-gray-500 truncate">{animal.name}</div>
                                          )}
                                        </div>
                                        {isChecked && (
                                          <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                        )}
                                      </label>
                                    )
                                  })}
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      )}
                      {errors.animals && <p className="text-sm text-red-600 mt-2 ml-6">{errors.animals}</p>}
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
                      <span>Select TMR Recipe</span>
                    </CardTitle>
                    <CardDescription>Choose a created TMR recipe for this feeding session</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <Label htmlFor="feedMixRecipe">TMR Recipe *</Label>
                      <Select value={selectedFeedMixRecipe} onValueChange={val => {
                        setSelectedFeedMixRecipe(val)
                      }}>
                        <SelectTrigger className={errors.feedMixRecipe ? 'border-red-300 mt-1' : 'mt-1'}>
                          <SelectValue placeholder="Select a TMR recipe" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingRecipes ? (
                            <div className="flex items-center gap-2 px-3 py-4 text-sm text-gray-500">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                              Loading recipes…
                            </div>
                          ) : loadedFeedMixRecipes.length > 0 ? (
                            loadedFeedMixRecipes.map(recipe => (
                              <SelectItem key={recipe.id} value={recipe.id} label={recipe.name}>
                                <div className="flex flex-col space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    {recipe.is_seasonal && (
                                      <Badge variant="outline" className="text-xs">Seasonal</Badge>
                                    )}
                                  </div>
                                  {recipe.description && (
                                    <p className="text-xs text-gray-500 truncate max-w-64">{recipe.description}</p>
                                  )}
                                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                                    <span>{recipe.ingredients?.length || 0} ingredients</span>
                                    {recipe.estimated_cost_per_day && (
                                      <span>Kes {recipe.estimated_cost_per_day.toFixed(2)}/day</span>
                                    )}
                                    {recipe.estimated_milk_yield_liters && (
                                      <span>{recipe.estimated_milk_yield_liters}L milk/day</span>
                                    )}
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-recipes" disabled>
                              No TMR recipes found — create one in the TMR Recipes tab
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {errors.feedMixRecipe && <p className="text-sm text-red-600 mt-1">{errors.feedMixRecipe}</p>}
                    </div>

                    {selectedFeedMixRecipe && selectedFeedMixRecipe !== 'no-recipes' && (() => {
                      const selectedRecipe = loadedFeedMixRecipes.find(r => r.id === selectedFeedMixRecipe)
                      if (!selectedRecipe) return null

                      const totalDailyKg = selectedRecipe.total_yield ?? 0
                      const totalSessionKg = totalDailyKg * (recipeSessionPercentage / 100)
                      const totalAlreadyFed = Object.values(todayRecipeConsumption).reduce((s, v) => s + v, 0)
                      const totalRemaining = Math.max(0, totalDailyKg - totalAlreadyFed - totalSessionKg)

                      return (
                        <div className="mt-4 space-y-4">
                          {/* Recipe quick stats */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div className="p-2 bg-white rounded border border-amber-200">
                              <p className="text-xs text-amber-600 font-medium">Ingredients</p>
                              <p className="text-lg font-bold text-amber-900">{selectedRecipe.ingredients?.length || 0}</p>
                            </div>
                            <div className="p-2 bg-white rounded border border-amber-200">
                              <p className="text-xs text-amber-600 font-medium">Daily Yield</p>
                              <p className="text-lg font-bold text-amber-900">{totalDailyKg > 0 ? `${totalDailyKg} kg` : '—'}</p>
                            </div>
                            <div className="p-2 bg-white rounded border border-amber-200">
                              <p className="text-xs text-amber-600 font-medium">Est. Cost/Day</p>
                              <p className="text-base font-bold text-amber-900">
                                {selectedRecipe.estimated_cost_per_day != null ? `Kes ${selectedRecipe.estimated_cost_per_day.toFixed(0)}` : '—'}
                              </p>
                            </div>
                            <div className="p-2 bg-white rounded border border-amber-200">
                              <p className="text-xs text-amber-600 font-medium">Target Animals</p>
                              <p className="text-lg font-bold text-amber-900">{recipeMatchingAnimals.length}</p>
                            </div>
                          </div>

                          {/* Targeted Animal Categories */}
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4" />
                              Targeted Animals
                            </h4>
                            {recipeMatchingAnimals.length === 0 && (selectedRecipe.target_animals?.category_ids?.length ?? 0) === 0 && (selectedRecipe.target_animals?.animal_ids?.length ?? 0) === 0 ? (
                              <p className="text-xs text-amber-700">No specific targets assigned — recipe applies to all animals ({animals.length})</p>
                            ) : recipeMatchingAnimals.length === 0 ? (
                              <p className="text-xs text-red-600">No animals found matching the recipe's assigned categories/animals</p>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  {recipeCategoryBreakdown.map(item => (
                                    <div
                                      key={item.id}
                                      className={`flex items-center gap-1.5 border rounded px-2 py-1 ${item.type === 'individual'
                                          ? 'bg-blue-50 border-blue-200'
                                          : 'bg-white border-amber-200'
                                        }`}
                                    >
                                      <span className={`text-xs font-medium ${item.type === 'individual' ? 'text-blue-800' : 'text-amber-800'}`}>
                                        {item.name}
                                      </span>
                                      <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${item.type === 'individual'
                                          ? 'bg-blue-200 text-blue-900'
                                          : 'bg-amber-200 text-amber-900'
                                        }`}>
                                        {item.count}
                                      </span>
                                    </div>
                                  ))}
                                  <div className="flex items-center gap-1.5 bg-amber-200 border border-amber-300 rounded px-2 py-1">
                                    <span className="text-xs font-bold text-amber-900">Total: {recipeMatchingAnimals.length}</span>
                                  </div>
                                </div>
                                {(selectedRecipe.applicable_conditions ?? []).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <span className="text-xs text-amber-600 self-center">Conditions:</span>
                                    {(selectedRecipe.applicable_conditions ?? []).map((c: string) => (
                                      <span key={c} className="text-xs bg-amber-100 border border-amber-300 text-amber-800 rounded-full px-2 py-0.5">{c}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Session Percentage */}
                          {totalDailyKg > 0 ? (
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <h4 className="font-semibold text-green-900 mb-1 flex items-center gap-2 text-sm">
                                <BarChart3 className="w-4 h-4" />
                                Session Portion
                              </h4>
                              <p className="text-xs text-green-700 mb-3">What percentage of today's full recipe are you feeding in this session?</p>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min={1}
                                  max={100}
                                  step={1}
                                  value={recipeSessionPercentage}
                                  onChange={e => setRecipeSessionPercentage(Number(e.target.value))}
                                  className="flex-1 accent-green-600"
                                />
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min={1}
                                    max={100}
                                    step={1}
                                    value={recipeSessionPercentage}
                                    onChange={e => {
                                      const v = Math.min(100, Math.max(1, Number(e.target.value)))
                                      setRecipeSessionPercentage(v)
                                    }}
                                    className="w-16 h-8 text-center text-sm font-bold"
                                  />
                                  <span className="text-sm font-bold text-green-700">%</span>
                                </div>
                              </div>
                              {errors.recipeSession && <p className="text-xs text-red-600 mt-1">{errors.recipeSession}</p>}
                              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                <div className="text-center p-1.5 bg-white rounded border border-green-200">
                                  <p className="text-green-600">This session</p>
                                  <p className="font-bold text-green-800">{totalSessionKg.toFixed(1)} kg</p>
                                </div>
                                <div className="text-center p-1.5 bg-white rounded border border-blue-200">
                                  <p className="text-blue-600">Fed today</p>
                                  <p className="font-bold text-blue-800">
                                    {loadingTodayRecipeConsumption ? '…' : `${totalAlreadyFed.toFixed(1)} kg`}
                                  </p>
                                </div>
                                <div className="text-center p-1.5 bg-white rounded border border-gray-200">
                                  <p className="text-gray-600">Remaining</p>
                                  <p className="font-bold text-gray-800">{totalRemaining.toFixed(1)} kg</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-xs text-red-700 font-medium">⚠ This recipe has no total yield set. Please edit the recipe to define a daily total yield (kg) before recording consumption.</p>
                            </div>
                          )}

                          {/* Ingredient Quantities */}
                          {recipeSessionIngredients.length > 0 && (
                            <div className="p-3 bg-white rounded-lg border border-gray-200">
                              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                                <Leaf className="w-4 h-4 text-green-600" />
                                Ingredient Quantities
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left py-1.5 pr-2 font-medium text-gray-600">Ingredient</th>
                                      <th className="text-right py-1.5 px-2 font-medium text-gray-600">Daily</th>
                                      <th className="text-right py-1.5 px-2 font-medium text-green-700">Session</th>
                                      <th className="text-right py-1.5 px-2 font-medium text-blue-700">Fed today</th>
                                      <th className="text-right py-1.5 pl-2 font-medium text-gray-500">Remaining</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {recipeSessionIngredients.map((ing, idx) => (
                                      <tr key={idx} className="border-b border-gray-100 last:border-0">
                                        <td className="py-1.5 pr-2">
                                          <span className="text-gray-800 font-medium">{ing.feed_name}</span>
                                          <span className="ml-1 text-gray-400">({ing.percentage_of_mix}%)</span>
                                        </td>
                                        <td className="text-right py-1.5 px-2 text-gray-600">{ing.dailyQty.toFixed(2)} kg</td>
                                        <td className="text-right py-1.5 px-2 text-green-700 font-semibold">{ing.sessionQty.toFixed(2)} kg</td>
                                        <td className="text-right py-1.5 px-2 text-blue-700">
                                          {loadingTodayRecipeConsumption ? '…' : `${ing.alreadyFed.toFixed(2)} kg`}
                                        </td>
                                        <td className="text-right py-1.5 pl-2 text-gray-500">{ing.remaining.toFixed(2)} kg</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Collapsible recipe details */}
                          <button
                            type="button"
                            onClick={() => setExpandedRecipeDetails(!expandedRecipeDetails)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 text-sm font-medium text-gray-700 transition-colors"
                          >
                            <span>Nutritional Targets & Notes</span>
                            {expandedRecipeDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {expandedRecipeDetails && (
                            <div className="space-y-3 p-3 border border-gray-200 rounded-lg bg-white text-sm">
                              {selectedRecipe.target_nutrition && Object.values(selectedRecipe.target_nutrition).some(v => v != null) && (
                                <div>
                                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-500" />Nutritional Targets</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    {selectedRecipe.target_nutrition.dry_matter_percent != null && (
                                      <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                        <p className="text-xs text-gray-500">Dry Matter</p>
                                        <p className="font-bold text-gray-800">{selectedRecipe.target_nutrition.dry_matter_percent}%</p>
                                      </div>
                                    )}
                                    {selectedRecipe.target_nutrition.crude_protein_percent != null && (
                                      <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                        <p className="text-xs text-gray-500">Crude Protein</p>
                                        <p className="font-bold text-gray-800">{selectedRecipe.target_nutrition.crude_protein_percent}%</p>
                                      </div>
                                    )}
                                    {selectedRecipe.target_nutrition.crude_fiber_percent != null && (
                                      <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                        <p className="text-xs text-gray-500">Crude Fiber</p>
                                        <p className="font-bold text-gray-800">{selectedRecipe.target_nutrition.crude_fiber_percent}%</p>
                                      </div>
                                    )}
                                    {selectedRecipe.target_nutrition.energy_mcal_per_kg != null && (
                                      <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                        <p className="text-xs text-gray-500">Energy (MJ/kg)</p>
                                        <p className="font-bold text-gray-800">{selectedRecipe.target_nutrition.energy_mcal_per_kg}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {(selectedRecipe.description || selectedRecipe.notes) && (
                                <div className="space-y-1 border-t border-gray-200 pt-2">
                                  {selectedRecipe.description && <p className="text-gray-700 bg-gray-50 p-2 rounded text-xs">{selectedRecipe.description}</p>}
                                  {selectedRecipe.notes && <p className="text-xs text-gray-500 italic">{selectedRecipe.notes}</p>}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })()}
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

              {/* Session Summary — only shown when feeds exist */}
              {feeds.length > 0 && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className={`${isMobileView ? 'pb-2' : 'pb-3'}`}>
                    <CardTitle className={`${isMobileView ? 'text-base' : 'text-sm'} text-green-800 flex items-center gap-2`}>
                      <Calculator className="w-4 h-4" />
                      <span>Session Summary</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`grid ${isMobileView ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
                      <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
                        <div className="text-xl font-bold text-green-700">
                          {calculateNutritionalSummary().feedCount}
                        </div>
                        <div className="text-xs text-green-600 mt-0.5">Feeds</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
                        <div className="text-lg font-bold text-blue-700">
                          {calculateNutritionalSummary().totalQuantity.toFixed(1)} kg
                        </div>
                        <div className="text-xs text-blue-600 mt-0.5">Per Animal</div>
                        {((feedingMode === 'individual' && totalSelectedAnimals > 0) ||
                          (feedingMode === 'ration' && (rationAnimals.length || animalCount) > 0) ||
                          (feedingMode === 'feed-mix-template' && recipeMatchingAnimals.length > 0)) && (
                            <div className="text-xs text-green-700 font-semibold mt-1">
                              {(calculateNutritionalSummary().totalQuantity * (feedingMode === 'individual' ? totalSelectedAnimals : feedingMode === 'ration' ? (rationAnimals.length || animalCount) : recipeMatchingAnimals.length)).toFixed(1)} kg total
                            </div>
                          )}
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
                        <div className="text-lg font-bold text-green-700">
                          Kes {calculateNutritionalSummary().totalCost.toFixed(2)}
                        </div>
                        <div className="text-xs text-green-600 mt-0.5">Per Animal</div>
                        {((feedingMode === 'individual' && totalSelectedAnimals > 0) ||
                          (feedingMode === 'ration' && (rationAnimals.length || animalCount) > 0) ||
                          (feedingMode === 'feed-mix-template' && recipeMatchingAnimals.length > 0)) && (
                            <div className="text-xs text-green-700 font-semibold mt-1">
                              Kes {(calculateNutritionalSummary().totalCost * (feedingMode === 'individual' ? totalSelectedAnimals : feedingMode === 'ration' ? (rationAnimals.length || animalCount) : recipeMatchingAnimals.length)).toFixed(2)} total
                            </div>
                          )}
                      </div>
                      {feedingMode !== 'feed-mix-template' && (
                        <>
                          <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
                            <div className="text-xl font-bold text-green-700">
                              {calculateNutritionalSummary().totalProtein.toFixed(1)} kg
                            </div>
                            <div className="text-xs text-green-600 mt-0.5">Est. Protein</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
                            <div className="text-xl font-bold text-green-700">
                              {calculateNutritionalSummary().totalEnergy.toFixed(0)} MJ
                            </div>
                            <div className="text-xs text-green-600 mt-0.5">Est. Energy</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
                            <div className="text-xl font-bold text-green-700">{feedingTime}</div>
                            <div className="text-xs text-green-600 mt-0.5">Time</div>
                          </div>
                        </>
                      )}
                    </div>

                    {feedingMode === 'individual' && totalSelectedAnimals > 0 && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-sm text-green-700">
                          <strong>Animals:</strong> {totalSelectedAnimals} selected
                          {selectedCategoryIds.length > 0 && (
                            <span className="text-xs text-green-600 block mt-1">
                              ({selectedCategoryIds.length} categor{selectedCategoryIds.length !== 1 ? 'ies' : 'y'}, {selectedAnimals.length} individual)
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {feedingMode === 'ration' && selectedRation && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-sm text-green-700">
                          <strong>Ration:</strong> {selectedRation.name} — {rationAnimals.length} animal{rationAnimals.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    {/* Feed Category Analysis Toggle — hidden in ration mode */}
                    {false && feedCategoryAnalysis.length > 0 && (
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
                                  className={`p-3 border rounded-lg space-y-2 ${isUnder
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
          ) : (

            /* ── Schedule Feeding Form ───────────────────────────────────── */
            <form onSubmit={handleScheduleSubmit} className="space-y-6">

              {/* 1 — Schedule identity */}
              <Card>
                <CardHeader className={isMobileView ? 'pb-3' : ''}>
                  <CardTitle className={`${isMobileView ? 'text-base' : ''} flex items-center gap-2`}>
                    <CalendarClock className="w-5 h-5 text-purple-600" />
                    <span>Schedule Details</span>
                  </CardTitle>
                  <CardDescription>Name this schedule and set when it should happen</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Optional name */}
                  <div>
                    <Label htmlFor="scheduleName">Schedule Name <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Input
                      id="scheduleName"
                      value={scheduleName}
                      onChange={e => setScheduleName(e.target.value)}
                      placeholder="e.g. Morning hay feeding"
                      className="mt-1"
                    />
                  </div>

                  {/* Date Range */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Date From */}
                      <div>
                        <Label htmlFor="scheduleFromDate">Date From *</Label>
                        <Input
                          id="scheduleFromDate"
                          type="date"
                          value={scheduleFromDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={e => setScheduleFromDate(e.target.value)}
                          className={`mt-1 ${scheduleErrors.fromDate ? 'border-red-300' : ''}`}
                        />
                        {scheduleErrors.fromDate && <p className="text-xs text-red-600 mt-1">{scheduleErrors.fromDate}</p>}
                      </div>

                      {/* Date To */}
                      <div>
                        <Label htmlFor="scheduleToDate">Date To *</Label>
                        <Input
                          id="scheduleToDate"
                          type="date"
                          value={scheduleToDate}
                          min={scheduleFromDate || new Date().toISOString().split('T')[0]}
                          onChange={e => setScheduleToDate(e.target.value)}
                          className={`mt-1 ${scheduleErrors.toDate ? 'border-red-300' : ''}`}
                        />
                        {scheduleErrors.toDate && <p className="text-xs text-red-600 mt-1">{scheduleErrors.toDate}</p>}
                      </div>
                    </div>
                    {scheduleErrors.dateRange && <p className="text-xs text-red-600 mt-1">{scheduleErrors.dateRange}</p>}
                  </div>

                  {/* Feeding Sessions — Collapsible */}
                  <Card className={`border-2 ${scheduleSelectedSlotIds.size > 0 || scheduleManualTimes.length > 0 ? 'border-purple-200 bg-purple-50/30' : ''}`}>
                    <button
                      type="button"
                      onClick={() => setScheduleFeedingSessionsExpanded(!scheduleFeedingSessionsExpanded)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-purple-600 flex-shrink-0" />
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">Feeding Sessions *</div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {scheduleSelectedSlotIds.size + scheduleManualTimes.length > 0 ? (
                              <span className="text-purple-700 font-medium">
                                {scheduleSelectedSlotIds.size + scheduleManualTimes.length} selected
                              </span>
                            ) : (
                              <span>Select which sessions to schedule</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {scheduleSelectedSlotIds.size + scheduleManualTimes.length > 0 && (
                          <span className="inline-flex items-center justify-center text-xs font-semibold bg-purple-600 text-white rounded-full min-w-[1.5rem] h-6 px-1.5">
                            {scheduleSelectedSlotIds.size + scheduleManualTimes.length}
                          </span>
                        )}
                        {scheduleFeedingSessionsExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </button>
                    {scheduleFeedingSessionsExpanded && (
                      <div className="border-t border-gray-200 px-4 py-3 space-y-2 bg-white">
                        {sessionLoading ? (
                          <p className="text-xs text-gray-400">Loading sessions…</p>
                        ) : scheduleSessionsForDay.length > 0 ? (
                          <>
                            <p className="text-xs text-gray-500">
                              Select which sessions to schedule for this day
                              {scheduleDayOfWeek !== null && ` (${DAYS_OF_WEEK.find(d => d.value === scheduleDayOfWeek)?.full ?? ''})`}:
                            </p>
                            {scheduleSessionsForDay.map(slot => {
                              const checked = scheduleSelectedSlotIds.has(slot.id)
                              return (
                                <label
                                  key={slot.id}
                                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${checked ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-200 hover:bg-purple-50/30'
                                    }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 accent-purple-600"
                                    checked={checked}
                                    onChange={() => {
                                      setScheduleSelectedSlotIds(prev => {
                                        const next = new Set(prev)
                                        if (next.has(slot.id)) next.delete(slot.id)
                                        else next.add(slot.id)
                                        return next
                                      })
                                    }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-gray-800">{slot.slot_name}</span>
                                  </div>
                                  <span className="text-xs font-mono text-gray-500 flex-shrink-0">{slot.scheduled_time.slice(0, 5)}</span>
                                </label>
                              )
                            })}
                            {scheduleErrors.sessions && <p className="text-xs text-red-600 mt-2">{scheduleErrors.sessions}</p>}
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500">
                              No sessions configured for this day — enter feeding times manually:
                            </p>
                            {scheduleManualTimes.map((t, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={t}
                                  onChange={e => {
                                    const updated = [...scheduleManualTimes]
                                    updated[idx] = e.target.value
                                    setScheduleManualTimes(updated)
                                  }}
                                  className="flex-1"
                                />
                                <button
                                  type="button"
                                  onClick={() => setScheduleManualTimes(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setScheduleManualTimes(prev => [...prev, new Date().toTimeString().slice(0, 5)])}
                              className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 font-medium"
                            >
                              <Plus className="w-4 h-4" />
                              Add Time
                            </button>
                            {scheduleErrors.sessions && <p className="text-xs text-red-600 mt-2">{scheduleErrors.sessions}</p>}
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                </CardContent>
              </Card>

              {/* 2 — Feeding Mode selector */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Feeding Mode</p>
                <div className={`grid ${isMobileView ? 'grid-cols-1 gap-2' : 'grid-cols-3 gap-3'}`}>
                  {([
                    { value: 'individual', icon: <User className="w-5 h-5" />, label: 'Individual', description: 'Manually add feed types and quantity per animal', accent: 'blue' },
                    { value: 'ration', icon: <Utensils className="w-5 h-5" />, label: 'Feed Ration', description: 'Select a saved ration — ingredients auto-filled', accent: 'green' },
                    {
                      value: 'feed-mix-template', icon: <Leaf className="w-5 h-5" />, label: 'TMR Recipe',
                      description: 'Apply a TMR recipe for TMR machines or mixed feed', accent: 'amber'
                    },
                  ] as const).map(({ value, icon, label, description, accent }) => {
                    const active = scheduleFeedingMode === value
                    const colors: Record<string, string> = {
                      blue: active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40',
                      green: active ? 'border-green-500 bg-green-50 ring-1 ring-green-400' : 'border-gray-200 hover:border-green-300 hover:bg-green-50/40',
                      amber: active ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-400' : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/40',
                    }
                    const iconColors: Record<string, string> = {
                      blue: active ? 'text-blue-600' : 'text-gray-400',
                      green: active ? 'text-green-600' : 'text-gray-400',
                      amber: active ? 'text-amber-600' : 'text-gray-400',
                    }
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setScheduleFeedingMode(value as any); setScheduleFeeds([]) }}
                        className={`relative flex ${isMobileView ? 'flex-row items-center gap-3 p-3' : 'flex-col items-start gap-1.5 p-4'} rounded-xl border-2 text-left transition-all cursor-pointer ${colors[accent]}`}
                      >
                        <span className={`flex-shrink-0 ${iconColors[accent]}`}>{icon}</span>
                        <span className="flex-1 min-w-0">
                          <span className={`block text-sm font-semibold ${active ? 'text-gray-900' : 'text-gray-700'}`}>{label}</span>
                          {!isMobileView && <span className="block text-xs text-gray-500 mt-0.5 leading-snug">{description}</span>}
                        </span>
                        {active && (
                          <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${accent === 'blue' ? 'bg-blue-500' : accent === 'green' ? 'bg-green-500' : 'bg-amber-500'}`} />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 2b — Ration picker (ration mode) */}
              {scheduleFeedingMode === 'ration' && (
                <Card>
                  <CardHeader className={isMobileView ? 'pb-3' : ''}>
                    <CardTitle className={`${isMobileView ? 'text-base' : ''} flex items-center gap-2`}>
                      <Target className="w-5 h-5 text-green-600" />
                      <span>Select Feed Ration</span>
                    </CardTitle>
                    <CardDescription>Ingredients and quantities will be auto-filled from the selected ration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select
                      value={scheduleRation?.id ?? ''}
                      onValueChange={val => setScheduleRation(loadedRations.find(r => r.id === val) ?? null)}
                    >
                      <SelectTrigger className={scheduleErrors.ration ? 'border-red-300' : ''}>
                        <SelectValue placeholder="Choose a feed ration…" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingRations ? (
                          <div className="flex items-center gap-2 px-3 py-4 text-sm text-gray-500">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
                            Loading rations…
                          </div>
                        ) : loadedRations.filter(r => r.is_active).length > 0 ? (
                          loadedRations.filter(r => r.is_active).map(r => (
                            <SelectItem key={r.id} value={r.id} label={r.name}>
                              {r.feed_ration_types?.name && (
                                <Badge variant="outline" className="text-xs">{r.feed_ration_types.name}</Badge>
                              )}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-rations" disabled>No active rations — create one in the Feed Rations tab</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {scheduleErrors.ration && <p className="text-sm text-red-600">{scheduleErrors.ration}</p>}

                    {scheduleRation && (
                      <div className="border border-green-200 rounded-lg bg-green-50 overflow-hidden">
                        <div className="p-4 space-y-3">
                          {/* Summary */}
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-green-700 font-medium">Ration</p>
                              <p className="text-green-900 font-semibold">{scheduleRation.name}</p>
                            </div>
                            <div>
                              <p className="text-green-700 font-medium">Ingredients</p>
                              <p className="text-green-900 font-semibold">{scheduleRation.feed_ration_ingredients?.length ?? 0}</p>
                            </div>
                            <div>
                              <p className="text-green-700 font-medium">Feeds Loaded</p>
                              <p className="text-green-900 font-semibold">{scheduleFeeds.length}</p>
                            </div>
                          </div>

                          {/* Ingredients toggle */}
                          <button
                            type="button"
                            onClick={() => setScheduleShowRationIngredients(p => !p)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-green-100 hover:bg-green-200 rounded border border-green-300 text-sm font-medium text-green-900 transition-colors"
                          >
                            <span className="flex items-center gap-2"><Leaf className="w-4 h-4" />Ingredients &amp; Quantities</span>
                            {scheduleShowRationIngredients ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {scheduleShowRationIngredients && (
                            <div className="bg-white rounded border border-green-100 divide-y divide-green-50">
                              {(scheduleRation.feed_ration_ingredients ?? []).length === 0 ? (
                                <p className="p-3 text-sm text-gray-400 text-center">No ingredients on this ration</p>
                              ) : (
                                (scheduleRation.feed_ration_ingredients as any[])
                                  .sort((a, b) => a.sort_order - b.sort_order)
                                  .map((ing: any) => {
                                    const isTMR = !!ing.tmr_recipe_id
                                    const tmrRecipe = isTMR ? loadedFeedMixRecipes.find(r => r.id === ing.tmr_recipe_id) : null
                                    const feedLabel = isTMR
                                      ? (ing.feed_mix_recipes?.name ?? tmrRecipe?.name ?? 'TMR Recipe')
                                      : (ing.feed_types?.name ?? availableFeedTypes.find(f => f.id === ing.feed_type_id)?.name ?? feedTypes.find(f => f.id === ing.feed_type_id)?.name ?? 'Unknown feed')
                                    const tmrIngredients = tmrRecipe?.ingredients ?? []
                                    const isExpanded = expandedFeeds.has(ing.id)
                                    return (
                                      <div key={ing.id} className="space-y-0">
                                        <div className="px-3 py-2 flex items-start justify-between text-sm gap-2">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            {isTMR && tmrIngredients.length > 0 && (
                                              <button
                                                type="button"
                                                onClick={() => setExpandedFeeds(p => {
                                                  const n = new Set(p)
                                                  if (n.has(ing.id)) n.delete(ing.id)
                                                  else n.add(ing.id)
                                                  return n
                                                })}
                                                className="flex-shrink-0 hover:bg-green-100 rounded p-0.5"
                                              >
                                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />}
                                              </button>
                                            )}
                                            <span className="text-gray-800 font-medium truncate">{feedLabel}</span>
                                            {isTMR && (
                                              <Badge variant="outline" className="text-xs shrink-0 text-amber-700 border-amber-300 bg-amber-50">TMR</Badge>
                                            )}
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className="text-gray-700 font-semibold tabular-nums">{ing.quantity_kg_per_day} kg/animal</span>
                                            <span className="text-gray-400 text-xs block">per feeding session</span>
                                          </div>
                                        </div>
                                        {isTMR && isExpanded && tmrIngredients.length > 0 && (
                                          <div className="bg-amber-50 px-3 py-2 border-t border-green-100 space-y-1">
                                            <p className="text-xs font-semibold text-amber-900 mb-2">TMR Ingredients ({tmrIngredients.length}):</p>
                                            {(tmrIngredients as any[]).map((tmrIng: any, idx: number) => {
                                              const tmrIngQtyPerDay = (ing.quantity_kg_per_day ?? 0) * ((tmrIng.percentage_of_mix ?? 0) / 100)
                                              const feedName = tmrIng.feed_name ?? availableFeedTypes.find(f => f.id === tmrIng.feed_type_id)?.name ?? feedTypes.find(f => f.id === tmrIng.feed_type_id)?.name ?? 'Unknown'
                                              return (
                                                <div key={idx} className="flex justify-between items-center text-xs px-2 py-1 bg-white rounded border border-amber-100">
                                                  <div className="flex items-center gap-1 min-w-0">
                                                    <span className="text-amber-600 font-medium">→</span>
                                                    <span className="text-gray-700 truncate">{feedName}</span>
                                                    {tmrIng.priority && <Badge variant="outline" className="text-xs shrink-0">{tmrIng.priority}</Badge>}
                                                  </div>
                                                  <div className="text-right shrink-0 whitespace-nowrap">
                                                    <span className="text-gray-700 font-semibold">{tmrIngQtyPerDay.toFixed(2)} kg</span>
                                                    <span className="text-gray-500 text-xs ml-1">({tmrIng.percentage_of_mix}%)</span>
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })
                              )}
                            </div>
                          )}

                          {/* Animals toggle */}
                          <button
                            type="button"
                            onClick={() => setScheduleShowRationAnimals(p => !p)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 text-sm font-medium text-blue-900 transition-colors"
                          >
                            <span className="flex items-center gap-2"><Users className="w-4 h-4" />Ration Animals ({scheduleRationAnimals.length})</span>
                            {scheduleShowRationAnimals ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {scheduleShowRationAnimals && (
                            <div className="bg-white rounded border border-blue-100">
                              {scheduleRationAnimals.length === 0 ? (
                                <div className="p-4 text-center">
                                  <AlertCircle className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                                  <p className="text-sm text-gray-500">No animals assigned to this ration. Use the Animal Target section below to specify animals.</p>
                                </div>
                              ) : (
                                <div className="space-y-3 p-3">
                                  {scheduleRationAnimalsGrouped.map((group, idx) => (
                                    <div key={group.category.id} className="space-y-1.5">
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">{group.category.name}</p>
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{group.animals.length}</span>
                                      </div>
                                      <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-2 ml-2`}>
                                        {group.animals.map(animal => (
                                          <div key={animal.id} className="flex items-center gap-2 p-2 border border-blue-100 rounded-lg bg-blue-50">
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-semibold text-gray-900 truncate">
                                                {animal.name ? `${animal.tag_number} — ${animal.name}` : animal.tag_number}
                                              </p>
                                              <p className="text-xs text-gray-500">{animal.production_status?.replace(/_/g, ' ') ?? 'Active'}</p>
                                            </div>
                                            <Badge variant="outline" className="text-xs flex-shrink-0">{animal.gender ?? 'N/A'}</Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 2b-sessions — Per-session quantities for ration mode */}
              {scheduleFeedingMode === 'ration' && scheduleRation && scheduleRationSessionQtys.length > 0 && (() => {
                const totalKg = (scheduleRation.feed_ration_ingredients as any[] ?? []).reduce((s: number, i: any) => s + (i.quantity_kg_per_day || 0), 0)
                const selectedSessions = scheduleSessionsForDay.filter(s => scheduleSelectedSlotIds.has(s.id))
                const selectedCount = scheduleRationSessionQtys.filter(q => q.quantity_per_animal_kg !== null || q.percentage !== null).length
                return (
                  <Card className={`border-2 ${selectedCount > 0 ? 'border-green-200 bg-green-50/30' : ''}`}>
                    <button
                      type="button"
                      onClick={() => setScheduleRationSessionQtysExpanded(!scheduleRationSessionQtysExpanded)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">Session Quantities — {scheduleRation.name}</div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {selectedCount > 0 ? (
                              <span className="text-green-700 font-medium">{selectedCount} session{selectedCount !== 1 ? 's' : ''} configured</span>
                            ) : (
                              <span>Enter per-animal quantities for each session</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedCount > 0 && (
                          <span className="inline-flex items-center justify-center text-xs font-semibold bg-green-600 text-white rounded-full min-w-[1.5rem] h-6 px-1.5">
                            {selectedCount}
                          </span>
                        )}
                        {scheduleRationSessionQtysExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </button>
                    {scheduleRationSessionQtysExpanded && (
                      <div className="border-t border-gray-200 px-4 py-3 bg-white">
                        <SessionQuantityInput
                          sessions={selectedSessions}
                          selectedSessions={scheduleRationSessionQtys}
                          onSessionsChange={setScheduleRationSessionQtys}
                          totalDailyRationKg={totalKg > 0 ? totalKg : undefined}
                          numAnimals={rationAnimals.length || 1}
                          isMobile={isMobileView}
                          hideSelector
                        />
                      </div>
                    )}
                  </Card>
                )
              })()}

              {/* 2c — Recipe picker  */}
              {scheduleFeedingMode === 'feed-mix-template' && (
                <Card>
                  <CardHeader className={isMobileView ? 'pb-3' : ''}>
                    <CardTitle className={`${isMobileView ? 'text-base' : ''} flex items-center gap-2`}>
                      <Leaf className="w-5 h-5 text-amber-600" />
                      <span>Select TMR Recipe</span>
                    </CardTitle>
                    <CardDescription>Quantities are calculated from the recipe proportions × the average animal weight you enter</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Recipe selector */}
                    <Select value={scheduleSelectedRecipe} onValueChange={val => {
                      setScheduleSelectedRecipe(val)
                    }}>
                      <SelectTrigger className={scheduleErrors.recipe ? 'border-red-300' : ''}>
                        <SelectValue placeholder="Choose a recipe…" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingRecipes ? (
                          <div className="flex items-center gap-2 px-3 py-4 text-sm text-gray-500">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                            Loading recipes…
                          </div>
                        ) : loadedFeedMixRecipes.length > 0 ? (
                          loadedFeedMixRecipes.map(r => (
                            <SelectItem key={r.id} value={r.id} label={r.name}>
                              <div className="flex flex-col space-y-0.5">
                                <div className="flex items-center gap-2">
                                  {r.is_seasonal && <Badge variant="outline" className="text-xs">Seasonal</Badge>}
                                </div>
                                {r.description && (
                                  <p className="text-xs text-gray-500 truncate max-w-64">{r.description}</p>
                                )}
                                <div className="flex items-center space-x-3 text-xs text-gray-500">
                                  <span>{r.ingredients?.length || 0} ingredients</span>
                                  {r.estimated_cost_per_day && (
                                    <span>Kes {r.estimated_cost_per_day.toFixed(2)}/day</span>
                                  )}
                                  {r.estimated_milk_yield_liters && (
                                    <span>{r.estimated_milk_yield_liters}L milk/day</span>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-recipes" disabled>No recipes found — create one in the TMR Recipes tab</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {scheduleErrors.recipe && <p className="text-sm text-red-600">{scheduleErrors.recipe}</p>}

                    {/* Recipe details toggle */}
                    {scheduleSelectedRecipe && scheduleSelectedRecipe !== 'no-recipes' && (() => {
                      const recipe = loadedFeedMixRecipes.find(r => r.id === scheduleSelectedRecipe)
                      return recipe ? (
                        <div className="space-y-2">

                          {/* Date range from recipe */}
                          {(recipe.start_date || recipe.end_date) && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                              <CalendarDays className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
                              <span className="font-medium">Recipe period:</span>
                              <span>
                                {recipe.start_date
                                  ? new Date(recipe.start_date).toLocaleDateString()
                                  : '…'}
                                {' → '}
                                {recipe.end_date
                                  ? new Date(recipe.end_date).toLocaleDateString()
                                  : '∞'}
                              </span>
                              <span className="text-blue-500 ml-1">(dates pre-filled below)</span>
                            </div>
                          )}

                          {/* Target animals/categories from recipe */}
                          {recipe.target_animals && (
                            (recipe.target_animals.category_names?.length ?? 0) > 0 ||
                            (recipe.target_animals.animal_tags?.length ?? 0) > 0
                          ) && (
                            <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg space-y-1.5">
                              <p className="text-xs font-semibold text-purple-800 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                Target Animals
                              </p>
                              {(recipe.target_animals!.category_names?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {recipe.target_animals!.category_names!.map((name: string) => (
                                    <span key={name} className="text-xs bg-purple-100 border border-purple-300 text-purple-800 rounded-full px-2 py-0.5 font-medium">
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {(recipe.target_animals!.animal_tags?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {recipe.target_animals!.animal_tags!.map((tag: string) => (
                                    <span key={tag} className="text-xs bg-white border border-purple-200 text-purple-700 rounded-full px-2 py-0.5">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setScheduleExpandedRecipeDetails(p => !p)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 text-sm font-medium text-amber-900 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <Zap className="w-4 h-4" />
                              Recipe Details
                              <span className="text-xs text-amber-700 font-normal">
                                ({recipe.ingredients?.length ?? 0} ingredients
                                {recipe.total_yield && (() => {
                                  // Count target animals from recipe
                                  const targetCategoryIds = recipe.target_animals?.category_ids ?? []
                                  const targetAnimalTags = recipe.target_animals?.animal_tags ?? []
                                  let targetCount = 0
                                  
                                  // Count animals in target categories
                                  if (targetCategoryIds.length > 0) {
                                    targetCount += animals.filter(a =>
                                      targetCategoryIds.some(cid => a.category_ids?.includes(cid))
                                    ).length
                                  }
                                  
                                  // Add individually targeted animals
                                  if (targetAnimalTags.length > 0) {
                                    const taggedAnimals = animals.filter(a =>
                                      targetAnimalTags.includes(a.tag_number)
                                    )
                                    targetCount += taggedAnimals.length
                                  }
                                  
                                  // total_yield is total daily feed for all animals
                                  const perAnimal = targetCount > 0 ? recipe.total_yield / targetCount : 0
                                  return targetCount > 0 ? ` · ${recipe.total_yield.toFixed(2)} kg total (${perAnimal.toFixed(2)} kg/animal)` : ''
                                })()}
                                )
                              </span>
                            </span>
                            {scheduleExpandedRecipeDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {scheduleExpandedRecipeDetails && (
                            <div className="border border-amber-200 rounded-lg bg-amber-50 p-3 space-y-2">
                              {/* Quantity Summary Banner */}
                              {recipe.total_yield && (() => {
                                const targetCategoryIds = recipe.target_animals?.category_ids ?? []
                                const targetAnimalTags = recipe.target_animals?.animal_tags ?? []
                                let targetCount = 0
                                const targetedAnimals: any[] = []
                                
                                // Count animals in target categories
                                if (targetCategoryIds.length > 0) {
                                  const categorizedAnimals = animals.filter(a =>
                                    targetCategoryIds.some(cid => a.category_ids?.includes(cid))
                                  )
                                  targetedAnimals.push(...categorizedAnimals)
                                  targetCount += categorizedAnimals.length
                                }
                                
                                // Add individually targeted animals
                                if (targetAnimalTags.length > 0) {
                                  const taggedAnimals = animals.filter(a =>
                                    targetAnimalTags.includes(a.tag_number)
                                  )
                                  targetedAnimals.push(...taggedAnimals)
                                  targetCount += taggedAnimals.length
                                }
                                
                                if (targetCount > 0) {
                                  const perAnimal = recipe.total_yield / targetCount
                                  return (
                                    <div className="grid grid-cols-3 gap-2 px-3 py-2 bg-white rounded border border-amber-100 text-xs">
                                      <div>
                                        <p className="text-amber-600 font-medium">Per Animal</p>
                                        <p className="font-bold text-amber-900">{perAnimal.toFixed(2)} kg</p>
                                      </div>
                                      <div>
                                        <p className="text-amber-600 font-medium">Target Count</p>
                                        <p className="font-bold text-amber-900">{targetCount} animal{targetCount !== 1 ? 's' : ''}</p>
                                      </div>
                                      <div>
                                        <p className="text-amber-600 font-medium">Total Daily</p>
                                        <p className="font-bold text-amber-900">{recipe.total_yield.toFixed(2)} kg</p>
                                      </div>
                                    </div>
                                  )
                                }
                                return null
                              })()}
                              
                              {/* Ingredients breakdown */}
                              {(recipe.ingredients ?? []).map((ing: any, idx: number) => {
                                const totalDailyQty = recipe.total_yield ? (recipe.total_yield * (ing.percentage_of_mix ?? 0)) / 100 : 0
                                // Calculate target count for per-animal quantity
                                const targetCategoryIds = recipe.target_animals?.category_ids ?? []
                                const targetAnimalTags = recipe.target_animals?.animal_tags ?? []
                                let targetCount = 0
                                if (targetCategoryIds.length > 0) {
                                  targetCount += animals.filter(a =>
                                    targetCategoryIds.some(cid => a.category_ids?.includes(cid))
                                  ).length
                                }
                                if (targetAnimalTags.length > 0) {
                                  targetCount += animals.filter(a =>
                                    targetAnimalTags.includes(a.tag_number)
                                  ).length
                                }
                                const perAnimalQty = targetCount > 0 ? totalDailyQty / targetCount : 0
                                return (
                                  <div key={idx} className="flex items-center justify-between text-sm bg-white rounded px-3 py-2 border border-amber-100">
                                    <span className="text-gray-800 font-medium">{ing.feed_name ?? 'Unknown'}</span>
                                    <div className="text-right">
                                      <span className="text-amber-800 font-semibold">{ing.percentage_of_mix}%</span>
                                      {totalDailyQty > 0 && (
                                        <>
                                          {perAnimalQty > 0 && (
                                            <span className="text-gray-500 text-xs block">{perAnimalQty.toFixed(2)} kg/animal</span>
                                          )}
                                          <span className="text-gray-500 text-xs block">{totalDailyQty.toFixed(2)} kg total/day</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                              {/* Performance estimates */}
                              {(recipe.estimated_milk_yield_liters != null || recipe.estimated_cost_per_day != null) && (
                                <div className="flex flex-wrap gap-3 pt-2 border-t border-amber-200 text-xs text-amber-800">
                                  {recipe.estimated_milk_yield_liters != null && (
                                    <span>Est. milk: <strong>{recipe.estimated_milk_yield_liters} L/day</strong></span>
                                  )}
                                  {recipe.estimated_cost_per_day != null && (
                                    <span>Est. cost: <strong>Kes {recipe.estimated_cost_per_day.toFixed(2)}/day</strong></span>
                                  )}
                                </div>
                              )}
                              {/* Seasons & conditions */}
                              {((recipe.applicable_seasons ?? []).length > 0 || (recipe.applicable_conditions ?? []).length > 0) && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {(recipe.applicable_seasons ?? []).map((s: string) => (
                                    <span key={s} className="text-xs bg-orange-50 border border-orange-300 text-orange-700 rounded-full px-2 py-0.5">{s}</span>
                                  ))}
                                  {(recipe.applicable_conditions ?? []).map((c: string) => (
                                    <span key={c} className="text-xs bg-teal-50 border border-teal-300 text-teal-700 rounded-full px-2 py-0.5">{c}</span>
                                  ))}
                                </div>
                              )}
                              {/* Nutritional targets */}
                              {recipe.target_nutrition && Object.values(recipe.target_nutrition).some(v => v != null) && (
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200">
                                  {recipe.target_nutrition.dry_matter_percent != null && (
                                    <div className="p-2 bg-white rounded border border-amber-100 text-xs">
                                      <p className="text-amber-700">Dry Matter</p>
                                      <p className="font-bold text-amber-900">{recipe.target_nutrition.dry_matter_percent}%</p>
                                    </div>
                                  )}
                                  {recipe.target_nutrition.crude_protein_percent != null && (
                                    <div className="p-2 bg-white rounded border border-amber-100 text-xs">
                                      <p className="text-amber-700">Crude Protein</p>
                                      <p className="font-bold text-amber-900">{recipe.target_nutrition.crude_protein_percent}%</p>
                                    </div>
                                  )}
                                  {recipe.target_nutrition.crude_fiber_percent != null && (
                                    <div className="p-2 bg-white rounded border border-amber-100 text-xs">
                                      <p className="text-amber-700">Crude Fiber</p>
                                      <p className="font-bold text-amber-900">{recipe.target_nutrition.crude_fiber_percent}%</p>
                                    </div>
                                  )}
                                  {recipe.target_nutrition.energy_mcal_per_kg != null && (
                                    <div className="p-2 bg-white rounded border border-amber-100 text-xs">
                                      <p className="text-amber-700">Energy (MJ/kg)</p>
                                      <p className="font-bold text-amber-900">{recipe.target_nutrition.energy_mcal_per_kg}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Notes */}
                              {recipe.notes && (
                                <p className="text-xs text-amber-700 italic pt-1 border-t border-amber-200">{recipe.notes}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : null
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* 2c-sessions — Per-session quantities for TMR recipe mode */}
              {scheduleFeedingMode === 'feed-mix-template' && scheduleSelectedRecipe && scheduleSelectedRecipe !== 'no-recipes' && scheduleRecipeSessionQtys.length > 0 && (() => {
                const selectedSessions = scheduleSessionsForDay.filter(s => scheduleSelectedSlotIds.has(s.id))
                const recipe = loadedFeedMixRecipes.find(r => r.id === scheduleSelectedRecipe)
                const selectedCount = scheduleRecipeSessionQtys.filter(q => q.quantity_per_animal_kg !== null || q.percentage !== null).length
                
                // Calculate target animal count from recipe
                const targetCategoryIds = recipe?.target_animals?.category_ids ?? []
                const targetAnimalTags = recipe?.target_animals?.animal_tags ?? []
                let recipeTargetCount = 0
                if (targetCategoryIds.length > 0) {
                  recipeTargetCount += animals.filter(a =>
                    targetCategoryIds.some(cid => a.category_ids?.includes(cid))
                  ).length
                }
                if (targetAnimalTags.length > 0) {
                  recipeTargetCount += animals.filter(a =>
                    targetAnimalTags.includes(a.tag_number)
                  ).length
                }
                const recipeNumAnimals = recipeTargetCount > 0 ? recipeTargetCount : 1
                
                return (
                  <Card className={`border-2 ${selectedCount > 0 ? 'border-amber-200 bg-amber-50/30' : ''}`}>
                    <button
                      type="button"
                      onClick={() => setScheduleRecipeSessionQtysExpanded(!scheduleRecipeSessionQtysExpanded)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">Session Quantities — TMR Recipe</div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {selectedCount > 0 ? (
                              <span className="text-amber-700 font-medium">{selectedCount} session{selectedCount !== 1 ? 's' : ''} configured</span>
                            ) : (
                              <span>Enter per-animal quantities for each session</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedCount > 0 && (
                          <span className="inline-flex items-center justify-center text-xs font-semibold bg-amber-600 text-white rounded-full min-w-[1.5rem] h-6 px-1.5">
                            {selectedCount}
                          </span>
                        )}
                        {scheduleRecipeSessionQtysExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </button>
                    {scheduleRecipeSessionQtysExpanded && (
                      <div className="border-t border-gray-200 px-4 py-3 bg-white">
                        <SessionQuantityInput
                          sessions={selectedSessions}
                          selectedSessions={scheduleRecipeSessionQtys}
                          onSessionsChange={setScheduleRecipeSessionQtys}
                          totalDailyRationKg={recipe?.total_yield || undefined}
                          numAnimals={recipeNumAnimals}
                          isMobile={isMobileView}
                          hideSelector
                        />
                      </div>
                    )}
                  </Card>
                )
              })()}

              {/* 2d — Feed list (individual mode only) */}
              {scheduleFeedingMode === 'individual' && (
                <Card>
                  <CardHeader className={isMobileView ? 'pb-3' : ''}>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className={`${isMobileView ? 'text-base' : ''} flex items-center gap-2`}>
                          <Leaf className="w-5 h-5 text-green-600" />
                          <span>Feed Details</span>
                          {scheduleFeeds.length > 0 && (
                            <span className="inline-flex items-center justify-center text-xs font-semibold bg-green-600 text-white rounded-full min-w-[1.25rem] h-5 px-1.5">
                              {scheduleFeeds.length}
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Add feeds and the quantity per animal per session
                        </CardDescription>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddScheduleFeed} className="flex items-center gap-1">
                        <Plus className="w-4 h-4" />
                        {isMobileView ? 'Add' : 'Add Feed'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Manual input row */}
                    <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-4 pb-4 border-b`}>
                      <div>
                        <Label>Feed Type *</Label>
                        <Select value={scheduleFeedType} onValueChange={setScheduleFeedType}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select feed type" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFeedTypes.map(ft => {
                              const catName = feedTypeCategories.find(c => c.id === ft.category_id)?.name
                              const isLowStock = ft.totalStock > 0 && ft.totalStock < 10
                              return (
                                <SelectItem key={ft.id} value={ft.id} label={ft.name}>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap mt-0.5">
                                    {catName && <Badge variant="outline" className="text-xs">{catName}</Badge>}
                                    <span className={isLowStock ? 'text-orange-600 font-medium' : ''}>
                                      {ft.totalStock.toFixed(1)} kg{isLowStock ? ' — low' : ''}
                                    </span>
                                    {ft.costPerKg > 0 && (
                                      <span>· Kes {ft.costPerKg.toFixed(2)}/kg</span>
                                    )}
                                  </div>
                                </SelectItem>
                              )
                            })}
                            {availableFeedTypes.length === 0 && (
                              <SelectItem value="none" disabled>No feeds in stock</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-2">Showing all feed types with available stock.</p>
                      </div>
                      <div>
                        <Label>Qty per Animal (kg) *</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={scheduleQtyPerAnimal}
                          onChange={e => setScheduleQtyPerAnimal(e.target.value)}
                          placeholder="0.0"
                          className="mt-1"
                        />
                        {scheduleQtyPerAnimal && !isNaN(parseFloat(scheduleQtyPerAnimal)) && parseFloat(scheduleQtyPerAnimal) > 0 && resolvedScheduleAnimalCount > 0 && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                            <p className="font-medium">Total for {resolvedScheduleAnimalCount} animal{resolvedScheduleAnimalCount !== 1 ? 's' : ''}:</p>
                            <p className="font-semibold">{parseFloat(scheduleQtyPerAnimal).toFixed(1)} kg × {resolvedScheduleAnimalCount} = {(parseFloat(scheduleQtyPerAnimal) * resolvedScheduleAnimalCount).toFixed(1)} kg</p>
                          </div>
                        )}
                      </div>
                      {scheduleErrors.feed && <p className="col-span-2 text-xs text-red-600">{scheduleErrors.feed}</p>}
                    </div>

                    {/* Feed list */}
                    {scheduleFeeds.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                        <Wheat className="w-8 h-8 mb-2 text-gray-300" />
                        <p className="text-sm font-medium text-gray-500">No feeds added yet</p>
                        <p className="text-xs text-gray-400 mt-1">Select a feed type and quantity above, then click Add Feed</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {scheduleFeeds.map(feed => (
                          <div key={feed.id} className="border rounded-xl bg-white shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2.5">
                              <button type="button" onClick={() => toggleScheduleFeedExpanded(feed.id)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                                {scheduleExpandedFeeds.has(feed.id)
                                  ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                                <span className="text-sm font-semibold text-gray-900 truncate">{feed.feed_name}</span>
                              </button>
                              {/* Inline summary badges (visible when collapsed) */}
                              {!scheduleExpandedFeeds.has(feed.id) && (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                                    {feed.quantity_kg.toFixed(1)} kg/animal
                                  </span>
                                  <span className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">
                                    {(feed.quantity_kg * resolvedScheduleAnimalCount).toFixed(1)} kg total
                                  </span>
                                  <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                                    Kes {(feed.quantity_kg * resolvedScheduleAnimalCount * feed.cost_per_kg).toFixed(2)}
                                  </span>
                                </div>
                              )}
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveScheduleFeed(feed.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 h-7 w-7 p-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            {scheduleExpandedFeeds.has(feed.id) && (
                              <div className={`px-3 pb-3 border-t border-gray-100 pt-3 space-y-3 text-xs`}>
                                {/* Per Animal Breakdown */}
                                <div className={`grid ${isMobileView ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
                                  <div className="p-2 bg-white rounded border border-gray-200">
                                    <p className="text-gray-600 font-medium">Unit Cost</p>
                                    <p className="font-semibold text-gray-900">Kes{feed.cost_per_kg.toFixed(2)}/kg</p>
                                  </div>
                                  <div className="p-2 bg-blue-50 rounded border border-blue-200">
                                    <p className="text-blue-700 font-medium">Per Animal</p>
                                    <p className="font-semibold text-blue-900">{feed.quantity_kg.toFixed(1)} kg</p>
                                    <p className="text-xs text-blue-600 mt-1">Kes{(feed.quantity_kg * feed.cost_per_kg).toFixed(2)}/animal</p>
                                  </div>
                                  <div className="p-2 bg-purple-50 rounded border border-purple-200">
                                    <p className="text-purple-700 font-medium">Animals</p>
                                    <p className="font-semibold text-purple-900">{resolvedScheduleAnimalCount}</p>
                                  </div>
                                </div>

                                {/* Total Summary */}
                                <div className="p-3 bg-green-50 rounded border border-green-200 space-y-2">
                                  <div className="flex justify-between items-start">
                                    <span className="text-green-700 font-medium">Total Quantity:</span>
                                    <span className="font-bold text-green-900">{(feed.quantity_kg * resolvedScheduleAnimalCount).toFixed(1)} kg</span>
                                  </div>
                                  <p className="text-xs text-green-600">{feed.quantity_kg.toFixed(1)} kg/animal × {resolvedScheduleAnimalCount} animals</p>
                                  <div className="border-t border-green-200 pt-2 mt-2">
                                    <div className="flex justify-between items-start">
                                      <span className="text-green-700 font-bold">Total Cost:</span>
                                      <span className="font-bold text-green-900 text-sm">Kes{(feed.quantity_kg * resolvedScheduleAnimalCount * feed.cost_per_kg).toFixed(2)}</span>
                                    </div>
                                    <p className="text-xs text-green-600 mt-1">Kes{feed.cost_per_kg.toFixed(2)}/kg × {(feed.quantity_kg * resolvedScheduleAnimalCount).toFixed(1)} kg</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {scheduleErrors.feeds && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">{scheduleErrors.feeds}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 2d-sessions — Per-session quantities for individual mode */}
              {scheduleFeedingMode === 'individual' && scheduleFeeds.length > 0 && scheduleIndividualSessionQtys.length > 0 && (() => {
                const totalKg = scheduleFeeds.reduce((s, f) => s + f.quantity_kg, 0)
                const selectedSessions = scheduleSessionsForDay.filter(s => scheduleSelectedSlotIds.has(s.id))
                const selectedCount = scheduleIndividualSessionQtys.filter(q => q.quantity_per_animal_kg !== null || q.percentage !== null).length
                return (
                  <Card className={`border-2 ${selectedCount > 0 ? 'border-blue-200 bg-blue-50/30' : ''}`}>
                    <button
                      type="button"
                      onClick={() => setScheduleIndividualSessionQtysExpanded(!scheduleIndividualSessionQtysExpanded)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">Session Quantities</div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {selectedCount > 0 ? (
                              <span className="text-blue-700 font-medium">{selectedCount} session{selectedCount !== 1 ? 's' : ''} configured</span>
                            ) : (
                              <span>Enter per-animal quantities for each session</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedCount > 0 && (
                          <span className="inline-flex items-center justify-center text-xs font-semibold bg-blue-600 text-white rounded-full min-w-[1.5rem] h-6 px-1.5">
                            {selectedCount}
                          </span>
                        )}
                        {scheduleIndividualSessionQtysExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </button>
                    {scheduleIndividualSessionQtysExpanded && (
                      <div className="border-t border-gray-200 px-4 py-3 bg-white">
                        <SessionQuantityInput
                          sessions={selectedSessions}
                          selectedSessions={scheduleIndividualSessionQtys}
                          onSessionsChange={setScheduleIndividualSessionQtys}
                          totalDailyRationKg={totalKg > 0 ? totalKg : undefined}
                          numAnimals={resolvedScheduleAnimalCount}
                          isMobile={isMobileView}
                          hideSelector
                        />
                      </div>
                    )}
                  </Card>
                )
              })()}

              {/* 3 — Animal Target */}
              <Card>
                <CardHeader className={isMobileView ? 'pb-3' : ''}>
                  <CardTitle className={`${isMobileView ? 'text-base' : ''} flex items-center gap-2`}>
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>Animal Target</span>
                    {resolvedScheduleAnimalCount > 0 && (
                      <span className="inline-flex items-center justify-center text-xs font-semibold bg-blue-600 text-white rounded-full min-w-[1.25rem] h-5 px-1.5">
                        {resolvedScheduleAnimalCount}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>Choose which animals this schedule applies to</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Auto-populated from recipe info banner */}
                  {scheduleFeedingMode === 'feed-mix-template' && scheduleSelectedRecipe && scheduleSelectedRecipe !== 'no-recipes' && (scheduleTargetCategories.length > 0 || scheduleTargetAnimals.length > 0) && (
                    <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Auto-populated from recipe</p>
                        <p className="text-xs text-blue-700 mt-0.5">
                          {scheduleTargetCategories.length > 0 
                            ? `${scheduleTargetCategories.length} categor${scheduleTargetCategories.length === 1 ? 'y' : 'ies'} selected`
                            : `${scheduleTargetAnimals.length} animal${scheduleTargetAnimals.length === 1 ? '' : 's'} selected`
                          }. You can modify this below.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mode selector */}
                  <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-3'} gap-3`}>
                    {([
                      { value: 'all', icon: <Users className="w-5 h-5" />, label: 'All Animals', desc: `${animals.length} animals` },
                      { value: 'by_category', icon: <Tags className="w-5 h-5" />, label: 'By Category', desc: 'Select groups' },
                      { value: 'specific', icon: <User className="w-5 h-5" />, label: 'Specific', desc: 'Pick individuals' },
                    ] as const).map(({ value, icon, label, desc }) => {
                      const active = scheduleTargetMode === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setScheduleTargetMode(value)}
                          className={`flex ${isMobileView ? 'flex-row items-center gap-3' : 'flex-col items-center gap-1'} p-3 rounded-xl border-2 text-center transition-all ${active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'
                            }`}
                        >
                          <span className={active ? 'text-blue-600' : 'text-gray-400'}>{icon}</span>
                          <span className="flex-1 text-left">
                            <span className={`block text-sm font-semibold ${active ? 'text-gray-900' : 'text-gray-600'}`}>{label}</span>
                            {!isMobileView && <span className="block text-xs text-gray-400">{desc}</span>}
                          </span>
                          {active && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>

                  {/* By Category sub-panel */}
                  {scheduleTargetMode === 'by_category' && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Select categories</p>
                      {animalCategories.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No animal categories configured</p>
                      ) : (
                        <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                          {animalCategories.map(cat => {
                            const checked = scheduleTargetCategories.includes(cat.id)
                            return (
                              <label
                                key={cat.id}
                                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${checked ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setScheduleTargetCategories(prev =>
                                      checked ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                                    )
                                  }
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                                    {(cat.animal_count !== undefined || cat.assigned_animals_count !== undefined) && (
                                      <Badge variant="secondary" className="text-xs">
                                        {(cat.animal_count ?? cat.assigned_animals_count ?? 0)} animal{(cat.animal_count ?? cat.assigned_animals_count ?? 0) !== 1 ? 's' : ''}
                                      </Badge>
                                    )}
                                  </div>
                                  {cat.description && (
                                    <span className="text-xs text-gray-400 truncate">{cat.description}</span>
                                  )}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Specific animals sub-panel */}
                  {scheduleTargetMode === 'specific' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">Select animals</p>
                        {scheduleTargetAnimals.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setScheduleTargetAnimals([])}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-2 max-h-56 overflow-y-auto`}>
                        {animals.map(animal => {
                          const selected = scheduleTargetAnimals.includes(animal.id)
                          return (
                            <div
                              key={animal.id}
                              onClick={() =>
                                setScheduleTargetAnimals(prev =>
                                  selected ? prev.filter(id => id !== animal.id) : [...prev, animal.id]
                                )
                              }
                              className={`p-3 border rounded-lg cursor-pointer transition-colors text-sm ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{animal.name || `#${animal.tag_number}`}</p>
                                  <p className="text-xs text-gray-500">{animal.category || animal.production_status || ''}</p>
                                </div>
                                {selected && <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {scheduleErrors.target && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">{scheduleErrors.target}</AlertDescription>
                    </Alert>
                  )}

                  {/* Animal count summary banner */}
                  {resolvedScheduleAnimalCount > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span>
                        <strong>{resolvedScheduleAnimalCount}</strong> animal{resolvedScheduleAnimalCount !== 1 ? 's' : ''} will receive this feeding
                        {scheduleFeeds.length > 0 && (
                          <> — <strong>{(scheduleFeeds.reduce((s, f) => s + f.quantity_kg, 0) * resolvedScheduleAnimalCount).toFixed(1)} kg</strong> total feed</>
                        )}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 4 — Notes */}
              <Card>
                <CardHeader className={isMobileView ? 'pb-3' : ''}>
                  <CardTitle className={isMobileView ? 'text-base' : ''}>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={scheduleNotes}
                    onChange={e => setScheduleNotes(e.target.value)}
                    placeholder="Any instructions or notes for this scheduled feeding…"
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* Success / error alerts */}
              {scheduleSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{scheduleSuccess}</AlertDescription>
                </Alert>
              )}
              {scheduleErrors.submit && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{scheduleErrors.submit}</AlertDescription>
                </Alert>
              )}

              {/* Submit */}
              <div className={`flex ${isMobileView ? 'flex-col space-y-3' : 'flex-row space-x-4'} pt-4`}>
                <Button
                  type="submit"
                  disabled={isScheduling}
                  className={`${isMobileView ? 'w-full' : 'flex-1'} h-12 bg-purple-600 hover:bg-purple-700`}
                >
                  {isScheduling ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Scheduling…</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CalendarClock className="w-5 h-5" />
                      <span>Create Schedule</span>
                    </div>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={onClose} disabled={isScheduling}
                  className={`${isMobileView ? 'w-full' : ''} h-12`}>
                  Cancel
                </Button>
              </div>
            </form>

          )}
        </div>
      </div>
    </Modal>
  )
}

export const FeedConsumptionModal = memo(FeedConsumptionModalInner)