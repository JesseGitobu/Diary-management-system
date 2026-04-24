// src/components/feed/FeedMixRecipeManager.tsx
'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/Tabs'
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  CheckSquare,
  Square,
  X,
  Users,
  Tag,
  CalendarRange,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

// Form-state ingredient — all numeric fields as strings for <input> elements
interface TMRIngredient {
  id: string
  feed_type_id: string
  feed_name: string
  weight_per_animal_kg: string  // weight per single animal (user-entered)
  quantity_kg: string            // total weight (calculated or user-entered)
  percentage_of_mix: string      // % of total yield (auto-calculated)
}

// Stored/DB ingredient — numeric fields as numbers
interface StoredIngredient {
  feed_type_id: string
  feed_name: string
  weight_per_animal_kg: number | null
  quantity_kg: number | null
  percentage_of_mix: number
}

interface TMRRecipe {
  id: string
  farm_id: string
  name: string
  description: string | null
  total_yield: number
  unit_of_measure: string | null
  target_animals: {
    animal_ids?: string[]
    animal_tags?: string[]
    category_ids?: string[]
    category_names?: string[]
  } | null
  ingredients: StoredIngredient[]
  target_nutrition: {
    dry_matter_percent?: number | null
    crude_protein_percent?: number | null
    crude_fiber_percent?: number | null
    energy_mcal_per_kg?: number | null
  } | null
  cost_per_unit: number | null
  notes: string | null
  start_date?: string | null
  end_date?: string | null
  is_seasonal: boolean | null
  applicable_seasons: string[] | null
  applicable_conditions: string[] | null
  estimated_cost_per_day: number | null
  estimated_milk_yield_liters: number | null
  active: boolean | null
  created_at: string
  updated_at: string
}

interface Animal {
  id: string
  tag_number: string
  name: string | null
}

interface AnimalCategory {
  id: string
  name: string
  description: string | null
  animal_count?: number
}

interface FeedMixRecipeManagerProps {
  farmId: string
  availableFeeds: Array<{ id: string; name: string; category?: string; cost_per_unit?: number }>
  // cost_per_kg comes from the feed_inventory row (actual purchase cost stored on stock record)
  inventory: Array<{ feed_type_id: string; quantity_in_stock?: number | null; cost_per_kg?: number | null }>
  onRecipeCreated?: (recipe: any) => void
  onRecipeDeleted?: (recipeId: string) => void
  initialOpenCreate?: boolean
  onCreateModalClosed?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UNIT_OPTIONS = ['kg', 'tonnes', 'bags', 'bales', 'litres']

function pct(n: number | null | undefined) {
  return n != null ? `${Number(n).toFixed(1)}%` : '—'
}

function kes(n: number | null | undefined) {
  if (n == null) return '—'
  return `KES ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Simple debounce utility
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// ─── Component ────────────────────────────────────────────────────────────────

// ─── Component: TMRRecipeManager ──────────────────────────────────────────────
// Renamed from FeedMixRecipeManager to better reflect the functionality (Total Mixed Ration)

export function FeedMixRecipeManager({
  farmId,
  availableFeeds,
  inventory,
  onRecipeCreated,
  onRecipeDeleted,
  initialOpenCreate = false,
  onCreateModalClosed,
}: FeedMixRecipeManagerProps) {
  const [recipes, setRecipes] = useState<TMRRecipe[]>([])
  const [animals, setAnimals] = useState<Animal[]>([])
  const [animalCategories, setAnimalCategories] = useState<AnimalCategory[]>([])
  const [animalCategoryMap, setAnimalCategoryMap] = useState<Record<string, string[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── form state ──
  const [recipeName, setRecipeName] = useState('')
  const [description, setDescription] = useState('')
  const [totalYield, setTotalYield] = useState('')
  const [isTotalYieldManual, setIsTotalYieldManual] = useState(false)
  const [unitOfMeasure, setUnitOfMeasure] = useState('kg')
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [targetsExpanded, setTargetsExpanded] = useState(true)
  const [animalSearch, setAnimalSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [ingredients, setIngredients] = useState<TMRIngredient[]>([
    { id: 'i0', feed_type_id: '', feed_name: '', weight_per_animal_kg: '', quantity_kg: '', percentage_of_mix: '' },
  ])
  const [ingCounter, setIngCounter] = useState(1)
  const ingredientsRef = useRef(ingredients)
  useEffect(() => { ingredientsRef.current = ingredients }, [ingredients])
  // Prevents the totalYield useEffect from re-running when syncAutoTotalAndPercentages
  // sets totalYield internally (it already computed correct percentages at that point).
  const isSyncingRef = useRef(false)
  // Prevents expensive calculations from firing during initial form load/edit
  const isLoadingFormRef = useRef(false)
  const [dmPct, setDmPct] = useState('')
  const [cpPct, setCpPct] = useState('')
  const [cfPct, setCfPct] = useState('')
  const [energyMj, setEnergyMj] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isSeasonal, setIsSeasonal] = useState(false)
  const [applicableSeasons, setApplicableSeasons] = useState<string[]>([])
  const [applicableConditions, setApplicableConditions] = useState<string[]>([])
  const [conditionInput, setConditionInput] = useState('')
  const [estimatedCostPerDay, setEstimatedCostPerDay] = useState('')
  const [estimatedMilkYield, setEstimatedMilkYield] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(initialOpenCreate)

  const inventoryFeedTypeIds = useMemo(() => new Set(
    inventory
      .filter(item => (item.quantity_in_stock ?? 0) > 0)
      .map(item => item.feed_type_id)
  ), [inventory])

  const filteredAvailableFeeds = useMemo(() => {
    const selectedFeedTypeIds = new Set(ingredients.map(i => i.feed_type_id).filter(Boolean))
    return availableFeeds.filter(feed =>
      inventoryFeedTypeIds.has(feed.id) || selectedFeedTypeIds.has(feed.id)
    )
  }, [availableFeeds, ingredients, inventoryFeedTypeIds])

  const feedById = useMemo(() => {
    return Object.fromEntries(availableFeeds.map(feed => [feed.id, feed]))
  }, [availableFeeds])

  // Actual purchase cost from inventory rows takes priority over the theoretical
  // cost_per_unit stored on the feed type.
  const inventoryCostById = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of inventory) {
      if (item.feed_type_id && item.cost_per_kg != null) {
        map[item.feed_type_id] = item.cost_per_kg
      }
    }
    return map
  }, [inventory])

  const pctTotal = useMemo(() =>
    ingredients.reduce((s, i) => s + (parseFloat(i.percentage_of_mix) || 0), 0)
  , [ingredients])

  useEffect(() => {
    loadRecipes()
    loadAnimalsAndCategories()
  }, [farmId])

  useEffect(() => {
    if (initialOpenCreate && !isDialogOpen) {
      openNew()
      setShowCreateModal(false) // Reset after opening
    }
  }, [initialOpenCreate])

  // Auto-update total yield when ingredients change (if not manually set)
  // Skip during form load to avoid cascading re-renders
  useEffect(() => {
    if (!isTotalYieldManual && !isLoadingFormRef.current) {
      syncAutoTotalAndPercentages(ingredients)
    }
  }, [isTotalYieldManual])

  async function loadRecipes() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/farms/${farmId}/feed-recipes`)
      if (!res.ok) throw new Error('Failed to load TMR recipes')
      const json = await res.json()
      setRecipes(json.recipes ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadAnimalsAndCategories() {
    try {
      const [animalsRes, catsRes] = await Promise.all([
        fetch(`/api/farms/${farmId}/animals`),
        fetch(`/api/animal-categories/${farmId}`),
      ])

      if (animalsRes.ok) {
        const json = await animalsRes.json()
        setAnimals(json.animals ?? [])
      } else {
        console.error('Failed to load animals:', animalsRes.status, animalsRes.statusText)
        setAnimals([])
      }

      if (catsRes.ok) {
        const json = await catsRes.json()
        const categories = json.categories ?? []
        const map = json.animalCategoryMap ?? {}
        setAnimalCategoryMap(map)
        
        // Add animal_count to each category
        const categoriesWithCount = categories.map((cat: any) => ({
          ...cat,
          animal_count: map[cat.id]?.length || 0
        }))
        
        setAnimalCategories(categoriesWithCount)
      } else {
        console.error('Failed to load animal categories:', catsRes.status, catsRes.statusText)
        setAnimalCategories([])
        setAnimalCategoryMap({})
      }
    } catch (err) {
      console.error('Failed to load animals/categories:', err)
      setAnimals([])
      setAnimalCategories([])
    }
  }

  // ── dialog open/close ──

  const openNew = useCallback(() => {
    setEditingId(null)
    resetForm()
    setError(null)
    setIsDialogOpen(true)
  }, [])

  const openEdit = useCallback((recipe: TMRRecipe) => {
    // Prevent expensive effects from firing during form load
    isLoadingFormRef.current = true
    
    setEditingId(recipe.id)
    setRecipeName(recipe.name)
    setDescription(recipe.description ?? '')
    setTotalYield(recipe.total_yield?.toString() ?? '')
    setIsTotalYieldManual(Boolean(recipe.total_yield))
    setUnitOfMeasure(recipe.unit_of_measure ?? 'kg')
    setSelectedAnimalIds(recipe.target_animals?.animal_ids ?? [])
    setSelectedCategoryIds(recipe.target_animals?.category_ids ?? [])
    setStartDate(recipe.start_date ?? '')
    setEndDate(recipe.end_date ?? '')
    setIngredients(
      recipe.ingredients?.length
        ? recipe.ingredients.map((ing, i) => ({
            id: `i${i}`,
            feed_type_id: ing.feed_type_id,
            feed_name: ing.feed_name,
            weight_per_animal_kg: ing.weight_per_animal_kg?.toString() ?? '',
            quantity_kg: ing.quantity_kg?.toString() ?? '',
            percentage_of_mix: ing.percentage_of_mix?.toString() ?? '',
          }))
        : [{ id: 'i0', feed_type_id: '', feed_name: '', weight_per_animal_kg: '', quantity_kg: '', percentage_of_mix: '' }]
    )
    setIngCounter(recipe.ingredients?.length ?? 1)
    setDmPct(recipe.target_nutrition?.dry_matter_percent?.toString() ?? '')
    setCpPct(recipe.target_nutrition?.crude_protein_percent?.toString() ?? '')
    setCfPct(recipe.target_nutrition?.crude_fiber_percent?.toString() ?? '')
    setEnergyMj(recipe.target_nutrition?.energy_mcal_per_kg?.toString() ?? '')
    setNotes(recipe.notes ?? '')
    setIsActive(recipe.active ?? true)
    setIsSeasonal(recipe.is_seasonal ?? false)
    setApplicableSeasons(recipe.applicable_seasons ?? [])
    setApplicableConditions(recipe.applicable_conditions ?? [])
    setEstimatedCostPerDay(recipe.estimated_cost_per_day?.toString() ?? '')
    setEstimatedMilkYield(recipe.estimated_milk_yield_liters?.toString() ?? '')
    setError(null)
    
    // Schedule effects to run after state settles
    requestAnimationFrame(() => {
      isLoadingFormRef.current = false
    })
    
    setIsDialogOpen(true)
  }, [])

  function resetForm() {
    setRecipeName('')
    setDescription('')
    setTotalYield('')
    setIsTotalYieldManual(false)
    setUnitOfMeasure('kg')
    setSelectedAnimalIds([])
    setSelectedCategoryIds([])
    setAnimalSearch('')
    setStartDate('')
    setEndDate('')
    setTargetsExpanded(true)
    setIngredients([{ id: 'i0', feed_type_id: '', feed_name: '', weight_per_animal_kg: '', quantity_kg: '', percentage_of_mix: '' }])
    setIngCounter(1)
    setDmPct('')
    setCpPct('')
    setCfPct('')
    setEnergyMj('')
    setNotes('')
    setIsActive(true)
    setIsSeasonal(false)
    setApplicableSeasons([])
    setApplicableConditions([])
    setConditionInput('')
    setEstimatedCostPerDay('')
    setEstimatedMilkYield('')
  }

  function closeDialog() {
    setIsDialogOpen(false)
    resetForm()
    setEditingId(null)
    setError(null)
    onCreateModalClosed?.()
  }

  // ── animal / category toggles ──

  function toggleAnimal(id: string) {
    setSelectedAnimalIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleCategory(id: string) {
    setSelectedCategoryIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const filteredAnimals = useMemo(() => {
    const q = animalSearch.toLowerCase()
    return !q ? animals : animals.filter(a =>
      a.tag_number.toLowerCase().includes(q) || (a.name ?? '').toLowerCase().includes(q)
    )
  }, [animals, animalSearch])

  // ── ingredient helpers ──

  function addIngredient() {
    const newId = `i${ingCounter}`
    const nextIngredients = [...ingredients, { id: newId, feed_type_id: '', feed_name: '', weight_per_animal_kg: '', quantity_kg: '', percentage_of_mix: '' }]
    if (!isTotalYieldManual && !isLoadingFormRef.current) {
      syncAutoTotalAndPercentages(nextIngredients)
    } else {
      setIngredients(nextIngredients)
    }
    setIngCounter(c => c + 1)
  }

  function removeIngredient(id: string) {
    const nextIngredients = ingredients.filter(i => i.id !== id)
    if (!isTotalYieldManual && !isLoadingFormRef.current) {
      syncAutoTotalAndPercentages(nextIngredients)
    } else {
      setIngredients(nextIngredients)
    }
  }

  function updateIngredient(id: string, patch: Partial<TMRIngredient>) {
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  function handleFeedSelect(id: string, feedTypeId: string) {
    const feed = availableFeeds.find(f => f.id === feedTypeId)
    updateIngredient(id, { feed_type_id: feedTypeId, feed_name: feed?.name ?? '' })
  }

  // Memoize total selected animals
  const totalSelectedAnimals = useMemo(() => {
    const individualAnimals = selectedAnimalIds.length
    const animalsInCategories = animalCategories
      .filter(cat => selectedCategoryIds.includes(cat.id))
      .reduce((sum, cat) => sum + (cat.animal_count || 0), 0)
    return Math.max(1, individualAnimals + animalsInCategories)
  }, [selectedAnimalIds, selectedCategoryIds, animalCategories])

  // Get derived total yield from ingredients
  function getDerivedTotalYield(): number {
    return ingredients.reduce((sum, ing) => sum + (parseFloat(ing.quantity_kg) || 0), 0)
  }

  // Get effective total yield (user-entered or derived from ingredients)
  function getEffectiveTotalYield(): number {
    const userYield = parseFloat(totalYield)
    if (!isNaN(userYield) && userYield > 0) return userYield
    return getDerivedTotalYield()
  }

  const recalcQuantitiesForAnimalCount = useCallback((updatedIngredients: TMRIngredient[]) => {
    return updatedIngredients.map(ing => {
      const weightPerAnimal = parseFloat(ing.weight_per_animal_kg)
      if (!isNaN(weightPerAnimal)) {
        return { ...ing, quantity_kg: (weightPerAnimal * totalSelectedAnimals).toFixed(3) }
      }
      return ing
    })
  }, [totalSelectedAnimals])

  function getIngredientTotalQuantity(ing: TMRIngredient): number {
    const explicitQuantity = parseFloat(ing.quantity_kg)
    if (!isNaN(explicitQuantity) && explicitQuantity > 0) {
      return explicitQuantity
    }

    const weightPerAnimal = parseFloat(ing.weight_per_animal_kg)
    if (!isNaN(weightPerAnimal) && totalSelectedAnimals > 0) {
      return weightPerAnimal * totalSelectedAnimals
    }

    return 0
  }

  // Unit cost for a feed type: inventory purchase cost takes priority over
  // the theoretical cost_per_unit on the feed type record.
  function getUnitCost(feedTypeId: string): number {
    if (!feedTypeId) return 0
    return inventoryCostById[feedTypeId] ?? feedById[feedTypeId]?.cost_per_unit ?? 0
  }

  // Total cost = Σ (unit_cost × weight_per_animal × num_animals) across all ingredients.
  const totalCost = useMemo(() => {
    return ingredients.reduce((sum, ing) => {
      if (!ing.feed_type_id) return sum
      const unitCost = inventoryCostById[ing.feed_type_id] ?? feedById[ing.feed_type_id]?.cost_per_unit ?? 0
      const quantity = getIngredientTotalQuantity(ing)
      return sum + (unitCost * quantity)
    }, 0)
  }, [ingredients, feedById, inventoryCostById, totalSelectedAnimals])

  // Recalculate ingredient percentages and total yield from the current ingredient list
  const syncAutoTotalAndPercentages = useCallback((updatedIngredients: TMRIngredient[]) => {
    const derivedTotal = updatedIngredients.reduce((sum, ing) => sum + (parseFloat(ing.quantity_kg) || 0), 0)
    const normalizedIngredients = updatedIngredients.map(ing => {
      const weight = parseFloat(ing.quantity_kg)
      const pct = !isNaN(weight) && derivedTotal > 0 ? ((weight / derivedTotal) * 100).toFixed(2) : ''
      return { ...ing, percentage_of_mix: pct }
    })

    // Mark so the totalYield useEffect skips the redundant re-map — percentages
    // are already correct here and the effect would cause a second render.
    isSyncingRef.current = true
    setIngredients(normalizedIngredients)
    setTotalYield(derivedTotal > 0 ? derivedTotal.toFixed(3) : '')
  }, [])

  // Auto-update total yield from ingredient totals (skip if form is loading)
  function updateTotalYieldFromIngredients(updatedIngredients: TMRIngredient[] = ingredients) {
    if (!isTotalYieldManual && !isLoadingFormRef.current) {
      syncAutoTotalAndPercentages(updatedIngredients)
    }
  }

  // totalYieldRef lets the handlers below read the latest totalYield without
  // adding it as a useCallback dep (which would recreate them on every sync).
  const totalYieldRef = useRef(totalYield)
  useEffect(() => { totalYieldRef.current = totalYield }, [totalYield])
  const isTotalYieldManualRef = useRef(isTotalYieldManual)
  useEffect(() => { isTotalYieldManualRef.current = isTotalYieldManual }, [isTotalYieldManual])

  // Handle weight per animal change — auto-calculate total weight and percentage.
  // Uses refs for ingredients/totalYield/isTotalYieldManual so the callback stays
  // stable across renders (not recreated on every ingredient change).
  const handleWeightPerAnimalChange = useCallback((id: string, raw: string) => {
    const weightPerAnimal = parseFloat(raw)
    const totalWeight = !isNaN(weightPerAnimal) ? (weightPerAnimal * totalSelectedAnimals).toFixed(3) : ''

    const updatedIngredients = ingredientsRef.current.map(ing =>
      ing.id === id
        ? { ...ing, weight_per_animal_kg: raw, quantity_kg: totalWeight }
        : ing
    )

    if (!isTotalYieldManualRef.current) {
      syncAutoTotalAndPercentages(updatedIngredients)
      return
    }

    let pctOfMix = ''
    if (totalWeight) {
      const currentTotalWeight = parseFloat(totalWeight)
      const userYield = parseFloat(totalYieldRef.current)
      if (!isNaN(userYield) && userYield > 0) {
        pctOfMix = ((currentTotalWeight / userYield) * 100).toFixed(2)
      }
    }

    updateIngredient(id, { weight_per_animal_kg: raw, quantity_kg: totalWeight, percentage_of_mix: pctOfMix })
  }, [totalSelectedAnimals, syncAutoTotalAndPercentages])

  // Handle total weight change — auto-calculate percentage.
  // Same ref pattern to keep the callback stable.
  const handleTotalWeightChange = useCallback((id: string, raw: string) => {
    const totalWeight = parseFloat(raw)
    const updatedIngredients = ingredientsRef.current.map(ing =>
      ing.id === id ? { ...ing, quantity_kg: raw } : ing
    )

    if (!isTotalYieldManualRef.current) {
      syncAutoTotalAndPercentages(updatedIngredients)
      return
    }

    let pctOfMix = ''
    if (!isNaN(totalWeight)) {
      const userYield = parseFloat(totalYieldRef.current)
      if (!isNaN(userYield) && userYield > 0) {
        pctOfMix = ((totalWeight / userYield) * 100).toFixed(2)
      }
    }

    updateIngredient(id, { quantity_kg: raw, percentage_of_mix: pctOfMix })
  }, [syncAutoTotalAndPercentages])

  // Recalculate all percentages when the user manually edits totalYield.
  // Skipped when syncAutoTotalAndPercentages set totalYield internally, because
  // percentages are already correct at that point (avoids a second render).
  // Skip during form load to prevent unnecessary calculations
  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false
      return
    }
    if (isLoadingFormRef.current) {
      return
    }
    const userYield = parseFloat(totalYield)
    if (!isNaN(userYield) && userYield > 0) {
      const current = ingredientsRef.current
      const updatedIngredients = current.map(ing => {
        const totalWeight = parseFloat(ing.quantity_kg)
        if (!isNaN(totalWeight)) {
          const pctOfMix = ((totalWeight / userYield) * 100).toFixed(2)
          return { ...ing, percentage_of_mix: pctOfMix }
        }
        return ing
      })
      setIngredients(updatedIngredients)
    }
  }, [totalYield])

  // Auto-update ingredients when animal/category selection changes.
  // intentionally omit `ingredients` from deps — reading via ref avoids an
  // infinite loop where setIngredients inside syncAutoTotalAndPercentages
  // would re-trigger this same effect.
  // Skip during form load to avoid cascading re-renders
  useEffect(() => {
    if (!isTotalYieldManual && !isLoadingFormRef.current) {
      const updatedIngredients = recalcQuantitiesForAnimalCount(ingredientsRef.current)
      syncAutoTotalAndPercentages(updatedIngredients)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnimalIds, selectedCategoryIds, isTotalYieldManual, totalSelectedAnimals, recalcQuantitiesForAnimalCount, syncAutoTotalAndPercentages])

  // ── submit ──

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!recipeName.trim()) { setError('TMR name is required'); return }
    const effective = getEffectiveTotalYield()
    if (!effective || effective <= 0) { setError('Total yield must be defined or calculated from ingredients'); return }

    const validIngredients = ingredients.filter(i => i.feed_type_id)
    if (validIngredients.length === 0) { setError('Add at least one ingredient'); return }

    // pctTotal is the memoised value from the outer scope
    if (Math.abs(pctTotal - 100) > 1) {
      setError(`Ingredient percentages must total 100% (currently ${pctTotal.toFixed(1)}%)`); return
    }

    const selectedAnimalTags = animals
      .filter(a => selectedAnimalIds.includes(a.id))
      .map(a => a.tag_number)
    const selectedCategoryNames = animalCategories
      .filter(c => selectedCategoryIds.includes(c.id))
      .map(c => c.name)

    const hasTargets = selectedAnimalIds.length > 0 || selectedCategoryIds.length > 0

    const payload = {
      name: recipeName.trim(),
      description: description.trim() || null,
      total_yield: effective,
      unit_of_measure: unitOfMeasure,
      target_animals: hasTargets
        ? {
            animal_ids: selectedAnimalIds,
            animal_tags: selectedAnimalTags,
            category_ids: selectedCategoryIds,
            category_names: selectedCategoryNames,
          }
        : null,
      start_date: startDate || null,
      end_date: endDate || null,
      ingredients: validIngredients.map(({ id: _id, weight_per_animal_kg, quantity_kg, percentage_of_mix, ...rest }) => ({
        ...rest,
        weight_per_animal_kg: weight_per_animal_kg ? parseFloat(weight_per_animal_kg) : null,
        quantity_kg: quantity_kg ? parseFloat(quantity_kg) : null,
        percentage_of_mix: parseFloat(percentage_of_mix) || 0,
      })),
      target_nutrition: (dmPct || cpPct || cfPct || energyMj)
        ? {
            dry_matter_percent: dmPct ? parseFloat(dmPct) : null,
            crude_protein_percent: cpPct ? parseFloat(cpPct) : null,
            crude_fiber_percent: cfPct ? parseFloat(cfPct) : null,
            energy_mcal_per_kg: energyMj ? parseFloat(energyMj) : null,
          }
        : null,
      cost_per_unit: effective > 0 ? totalCost / effective : null,
      notes: notes.trim() || null,
      active: isActive,
      is_seasonal: isSeasonal,
      applicable_seasons: isSeasonal && applicableSeasons.length > 0 ? applicableSeasons : null,
      applicable_conditions: applicableConditions.length > 0 ? applicableConditions : null,
      estimated_cost_per_day: estimatedCostPerDay ? parseFloat(estimatedCostPerDay) : null,
      estimated_milk_yield_liters: estimatedMilkYield ? parseFloat(estimatedMilkYield) : null,
    }

    setIsSaving(true)
    try {
      const url = editingId
        ? `/api/farms/${farmId}/feed-recipes/${editingId}`
        : `/api/farms/${farmId}/feed-recipes`

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')

      if (editingId) {
        setRecipes(prev => prev.map(r => r.id === editingId ? json.recipe : r))
      } else {
        setRecipes(prev => [json.recipe, ...prev])
        onRecipeCreated?.(json.recipe)
      }
      closeDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save TMR recipe')
    } finally {
      setIsSaving(false)
    }
  }

  // ── delete ──

  const handleDelete = useCallback(async (recipeId: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/farms/${farmId}/feed-recipes/${recipeId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setRecipes(prev => prev.filter(r => r.id !== recipeId))
      setDeleteConfirmId(null)
      onRecipeDeleted?.(recipeId)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [farmId, onRecipeDeleted])

  // ── duplicate ──

  const handleDuplicate = useCallback(async (recipe: TMRRecipe) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/farms/${farmId}/feed-recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${recipe.name} (Copy)`,
          description: recipe.description,
          total_yield: recipe.total_yield,
          unit_of_measure: recipe.unit_of_measure,
          target_animals: recipe.target_animals,
          ingredients: recipe.ingredients,
          target_nutrition: recipe.target_nutrition,
          cost_per_unit: recipe.cost_per_unit,
          notes: recipe.notes,
          is_seasonal: recipe.is_seasonal,
          applicable_seasons: recipe.applicable_seasons,
          applicable_conditions: recipe.applicable_conditions,
          estimated_cost_per_day: recipe.estimated_cost_per_day,
          estimated_milk_yield_liters: recipe.estimated_milk_yield_liters,
          active: recipe.active,
        }),
      })
      if (!res.ok) throw new Error('Duplicate failed')
      const json = await res.json()
      setRecipes(prev => [json.recipe, ...prev])
    } catch (err) {
      console.error('Failed to duplicate TMR:', err)
    } finally {
      setIsLoading(false)
    }
  }, [farmId])

  // ─── render ──────────────────────────────────────────────────────────────────

  // Memoized recipe list — only re-renders when recipes/UI state changes,
  // NOT when form state (recipeName, ingredients, etc.) changes.
  const recipeListUI = useMemo(() => (
    isLoading && recipes.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">Loading TMR recipes…</div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FlaskConical className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium">No TMR recipes yet</p>
          <p className="text-xs mt-1">Create your first Total Mixed Ration recipe to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map(recipe => {
            const categoryNames = recipe.target_animals?.category_names ?? []
            const animalTags = recipe.target_animals?.animal_tags ?? []
            const nt = recipe.target_nutrition
            const isExpanded = expandedId === recipe.id

            return (
              <div key={recipe.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Card top */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-gray-900">{recipe.name}</h4>
                        <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                          {recipe.total_yield} {recipe.unit_of_measure ?? 'kg'} batch
                        </span>
                        {recipe.cost_per_unit != null && (
                          <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                            {kes(recipe.cost_per_unit)} / {recipe.unit_of_measure ?? 'kg'}
                          </span>
                        )}
                        {recipe.active === false && (
                          <span className="text-xs text-gray-500 bg-gray-100 border border-gray-300 rounded px-2 py-0.5">
                            Inactive
                          </span>
                        )}
                        {recipe.is_seasonal && (
                          <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-0.5">
                            Seasonal
                          </span>
                        )}
                        {(recipe.start_date || recipe.end_date) && (
                          <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-0.5 flex items-center gap-1">
                            <CalendarRange className="w-3 h-3" />
                            {recipe.start_date ?? '…'} → {recipe.end_date ?? '∞'}
                          </span>
                        )}
                      </div>
                      {recipe.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{recipe.description}</p>
                      )}

                      {/* Target categories */}
                      {categoryNames.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {categoryNames.map((name: string) => (
                            <span key={name} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5" />{name}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Target individual animals */}
                      {animalTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {animalTags.slice(0, 5).map((tag: string) => (
                            <span key={tag} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                              {tag}
                            </span>
                          ))}
                          {animalTags.length > 5 && (
                            <span className="text-xs text-gray-500">+{animalTags.length - 5} more</span>
                          )}
                        </div>
                      )}
                      {/* Applicable conditions */}
                      {(recipe.applicable_conditions ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(recipe.applicable_conditions ?? []).map((cond: string) => (
                            <span key={cond} className="text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5">
                              {cond}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Performance estimates */}
                      {(recipe.estimated_milk_yield_liters != null || recipe.estimated_cost_per_day != null) && (
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                          {recipe.estimated_milk_yield_liters != null && (
                            <span>Est. milk yield: <strong className="text-gray-700">{recipe.estimated_milk_yield_liters} L/day</strong></span>
                          )}
                          {recipe.estimated_cost_per_day != null && (
                            <span>Est. cost/day: <strong className="text-gray-700">{kes(recipe.estimated_cost_per_day)}</strong></span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openEdit(recipe)} title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDuplicate(recipe)} title="Duplicate">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteConfirmId(recipe.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Nutritional targets row */}
                  {nt && (nt.dry_matter_percent || nt.crude_protein_percent || nt.crude_fiber_percent || nt.energy_mcal_per_kg) && (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
                      {nt.dry_matter_percent != null && <span>DM: <strong>{pct(nt.dry_matter_percent)}</strong></span>}
                      {nt.crude_protein_percent != null && <span>CP: <strong>{pct(nt.crude_protein_percent)}</strong></span>}
                      {nt.crude_fiber_percent != null && <span>CF: <strong>{pct(nt.crude_fiber_percent)}</strong></span>}
                      {nt.energy_mcal_per_kg != null && <span>Energy: <strong>{nt.energy_mcal_per_kg} MJ/kg</strong></span>}
                    </div>
                  )}
                </div>

                {/* Ingredients toggle */}
                {recipe.ingredients?.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                      className="w-full flex items-center justify-between px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                    >
                      <span>{recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="px-4 py-3 bg-amber-50 border-t border-amber-100 space-y-1">
                        {recipe.ingredients.map((ing, idx) => {
                          const kgAmt = recipe.total_yield
                            ? ((ing.percentage_of_mix / 100) * recipe.total_yield).toFixed(2)
                            : null
                          return (
                            <div key={idx} className="flex items-center justify-between text-sm text-amber-900">
                              <span>{ing.feed_name || 'Unknown feed'}</span>
                              <span className="flex items-center gap-2">
                                {kgAmt && (
                                  <span className="text-xs text-amber-600">{kgAmt} {recipe.unit_of_measure ?? 'kg'}</span>
                                )}
                                <span className="font-semibold bg-amber-100 border border-amber-200 rounded px-2 py-0.5 text-xs">
                                  {ing.percentage_of_mix}%
                                </span>
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Delete confirmation */}
                {deleteConfirmId === recipe.id && (
                  <div className="px-4 py-3 bg-red-50 border-t border-red-100">
                    <p className="text-sm text-red-800 font-medium">Delete &quot;{recipe.name}&quot;?</p>
                    <p className="text-xs text-red-600 mt-0.5">This action cannot be undone.</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(recipe.id)} disabled={isLoading}>
                        Yes, delete
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteConfirmId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
  ), [recipes, expandedId, deleteConfirmId, isLoading, openEdit, handleDuplicate, handleDelete])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">TMR Recipes</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Define Total Mixed Ration blends and link them to feed rations
          </p>
        </div>
        <Button onClick={openNew} disabled={isLoading}>
          <Plus className="w-4 h-4 mr-2" />
          New TMR
        </Button>
      </div>

      {recipeListUI}

      {/* ─── Create / Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={open => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-amber-600" />
              {editingId ? 'Edit TMR Recipe' : 'Create TMR Recipe'}
            </DialogTitle>
            <DialogDescription>
              Configure your Total Mixed Ration recipe with ingredients, nutritional targets, and target animals.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 px-1 pb-2">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            {/* ── Basic Info ── */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Basic Information</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TMR Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={recipeName}
                  onChange={e => setRecipeName(e.target.value)}
                  placeholder="e.g. High-Production TMR — January"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional description of this blend"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Recipe Status</p>
                  <p className="text-xs text-gray-500 mt-0.5">Inactive recipes won&apos;t appear in ration assignment</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(p => !p)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className={`text-xs font-medium ml-2 ${isActive ? 'text-green-700' : 'text-gray-500'}`}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Yield <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={totalYield}
                    onChange={e => {
                      const value = e.target.value
                      setTotalYield(value)
                      setIsTotalYieldManual(Boolean(value.trim()))
                    }}
                    placeholder="e.g. 500"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {!totalYield && (
                    <p className="text-xs text-amber-600 mt-1">
                      Auto-filled from ingredients. Edit to override.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={unitOfMeasure}
                    onChange={e => setUnitOfMeasure(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* ── Target Animals ── */}
            <section className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Collapsible header */}
              <button
                type="button"
                onClick={() => setTargetsExpanded(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-gray-700">Target Animals</span>
                  <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  {(selectedAnimalIds.length > 0 || selectedCategoryIds.length > 0) && (
                    <span className="ml-1 text-xs bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">
                      {totalSelectedAnimals} total animal{totalSelectedAnimals !== 1 ? 's' : ''}
                      {selectedCategoryIds.length > 0 && ` (${selectedCategoryIds.length} group${selectedCategoryIds.length !== 1 ? 's' : ''}`}
                      {selectedCategoryIds.length > 0 && selectedAnimalIds.length > 0 && ', '}
                      {selectedAnimalIds.length > 0 && `${selectedAnimalIds.length} individual${selectedAnimalIds.length !== 1 ? 's' : ''}`}
                      {selectedCategoryIds.length > 0 && ')'}                    </span>
                  )}
                </div>
                {targetsExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              </button>

              {targetsExpanded && (
                <div className="p-4">
                  <Tabs defaultValue="individuals" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="individuals">Individual Animals</TabsTrigger>
                      <TabsTrigger value="categories">Animal Categories</TabsTrigger>
                    </TabsList>

                    <TabsContent value="individuals" className="space-y-4 mt-4">
                      {/* Individual Animals */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Individual Animals</span>
                          </div>
                          {selectedAnimalIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedAnimalIds([])}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Clear all
                            </button>
                          )}
                        </div>

                        {/* Search */}
                        <input
                          type="text"
                          value={animalSearch}
                          onChange={e => setAnimalSearch(e.target.value)}
                          placeholder="Search by tag or name…"
                          className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />

                        {animals.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No animals found. Add animals in the Animal Clients page.</p>
                        ) : (
                          <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                            {filteredAnimals.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-3">No animals match your search</p>
                            ) : (
                              filteredAnimals.map(animal => {
                                const selected = selectedAnimalIds.includes(animal.id)
                                return (
                                  <button
                                    key={animal.id}
                                    type="button"
                                    onClick={() => toggleAnimal(animal.id)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                      selected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                                    }`}
                                  >
                                    {selected
                                      ? <CheckSquare className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                      : <Square className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                    }
                                    <span className="font-medium text-gray-800">{animal.tag_number}</span>
                                    {animal.name && <span className="text-gray-500 text-xs">— {animal.name}</span>}
                                  </button>
                                )
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="categories" className="space-y-4 mt-4">
                      {/* Animal Categories */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Tag className="h-3.5 w-3.5 text-indigo-500" />
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Animal Categories</span>
                        </div>
                        {animalCategories.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No categories found. Create them in the Animal Clients page.</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                            {animalCategories.map(cat => {
                              const selected = selectedCategoryIds.includes(cat.id)
                              const count = cat.animal_count || 0
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => toggleCategory(cat.id)}
                                  className={`flex flex-col items-start gap-1 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                                    selected
                                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                                      : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    {selected
                                      ? <CheckSquare className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                      : <Square className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                    }
                                    <span className="truncate text-xs font-medium">{cat.name}</span>
                                  </div>
                                  {count > 0 && (
                                    <span className="text-xs text-gray-500 ml-5.5">
                                      {count} animal{count !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </section>

            {/* ── Active Period ── */}
            <section className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-purple-500" />
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Active Period
                  <span className="text-gray-400 font-normal normal-case ml-1">(optional)</span>
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End date</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                {startDate || endDate
                  ? startDate && endDate
                    ? `Active ${new Date(startDate).toLocaleDateString()} → ${new Date(endDate).toLocaleDateString()}`
                    : startDate
                    ? `Active from ${new Date(startDate).toLocaleDateString()} onwards`
                    : `Active until ${new Date(endDate).toLocaleDateString()}`
                  : 'Leave empty to use this recipe indefinitely'}
              </p>
            </section>

            {/* ── Seasonal & Conditions ── */}
            <section className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Seasonal &amp; Conditions
                <span className="text-gray-400 font-normal normal-case ml-1">(optional)</span>
              </h4>

              {/* Seasonal toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Seasonal Recipe</p>
                  <p className="text-xs text-gray-500 mt-0.5">Restrict to specific seasons</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSeasonal(p => !p)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isSeasonal ? 'bg-orange-400' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSeasonal ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {isSeasonal && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Applicable Seasons</label>
                  <div className="flex flex-wrap gap-2">
                    {['Dry Season', 'Wet Season', 'Long Rains', 'Short Rains', 'Spring', 'Summer', 'Autumn', 'Winter'].map(season => {
                      const selected = applicableSeasons.includes(season)
                      return (
                        <button
                          key={season}
                          type="button"
                          onClick={() => setApplicableSeasons(prev =>
                            selected ? prev.filter(s => s !== season) : [...prev, season]
                          )}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            selected
                              ? 'bg-orange-100 border-orange-400 text-orange-800 font-medium'
                              : 'bg-white border-gray-300 text-gray-600 hover:border-orange-300'
                          }`}
                        >
                          {season}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Applicable conditions */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Applicable Conditions</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['High Production', 'Low Production', 'Transition Period', 'Post-Partum', 'Late Lactation', 'Dry Period', 'Growth Phase', 'Pregnancy'].map(cond => {
                    const selected = applicableConditions.includes(cond)
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setApplicableConditions(prev =>
                          selected ? prev.filter(c => c !== cond) : [...prev, cond]
                        )}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          selected
                            ? 'bg-teal-100 border-teal-400 text-teal-800 font-medium'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-teal-300'
                        }`}
                      >
                        {cond}
                      </button>
                    )
                  })}
                </div>
                {/* Custom conditions */}
                {applicableConditions.filter(c => !['High Production','Low Production','Transition Period','Post-Partum','Late Lactation','Dry Period','Growth Phase','Pregnancy'].includes(c)).map(custom => (
                  <span key={custom} className="inline-flex items-center gap-1 text-xs bg-teal-100 border border-teal-400 text-teal-800 rounded-full px-2 py-1 mr-1 mb-1">
                    {custom}
                    <button type="button" onClick={() => setApplicableConditions(prev => prev.filter(c => c !== custom))} className="text-teal-600 hover:text-teal-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={conditionInput}
                    onChange={e => setConditionInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const val = conditionInput.trim()
                        if (val && !applicableConditions.includes(val)) {
                          setApplicableConditions(prev => [...prev, val])
                        }
                        setConditionInput('')
                      }
                    }}
                    placeholder="Add custom condition…"
                    className="flex-1 border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = conditionInput.trim()
                      if (val && !applicableConditions.includes(val)) {
                        setApplicableConditions(prev => [...prev, val])
                      }
                      setConditionInput('')
                    }}
                    className="px-3 py-1.5 text-sm bg-teal-50 border border-teal-300 text-teal-700 rounded-md hover:bg-teal-100"
                  >
                    Add
                  </button>
                </div>
              </div>
            </section>

            {/* ── Ingredients ── */}
            <section className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Ingredients <span className="text-red-500">*</span>
                </h4>
                <span className={`text-sm font-medium ${Math.abs(pctTotal - 100) <= 1 ? 'text-green-600' : 'text-orange-600'}`}>
                  Total: {pctTotal.toFixed(1)}%
                </span>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_80px_80px_60px_84px_24px] gap-2 px-2 pb-0.5">
                <span className="text-xs font-medium text-gray-500">Feed</span>
                <span className="text-xs font-medium text-gray-500 text-center">Per Animal ({unitOfMeasure})</span>
                <span className="text-xs font-medium text-gray-500 text-center">Total ({unitOfMeasure})</span>
                <span className="text-xs font-medium text-gray-500 text-center">% mix</span>
                <span className="text-xs font-medium text-gray-500 text-center">Cost (KES)</span>
                <span />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {ingredients.map(ing => {
                  const unitCost = getUnitCost(ing.feed_type_id)
                  const quantity = getIngredientTotalQuantity(ing)
                  const ingCost = unitCost * quantity
                  const hasNoCost = ing.feed_type_id && unitCost === 0
                  return (
                    <div key={ing.id} className="grid grid-cols-[1fr_80px_80px_60px_84px_24px] items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-2">
                      {/* Feed select */}
                      <select
                        value={ing.feed_type_id}
                        onChange={e => handleFeedSelect(ing.id, e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Select feed…</option>
                        {filteredAvailableFeeds.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>

                      {/* Weight per animal */}
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={ing.weight_per_animal_kg}
                        onChange={e => handleWeightPerAnimalChange(ing.id, e.target.value)}
                        placeholder="0.000"
                        title={`Multiplied by ${totalSelectedAnimals} animal${totalSelectedAnimals !== 1 ? 's' : ''} = total`}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                      />

                      {/* Total weight (auto-calculated, read-only) */}
                      <div
                        title="Auto-calculated from weight per animal × total animals"
                        className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-gray-100 text-gray-700 text-center font-medium"
                      >
                        {ing.quantity_kg || '—'}
                      </div>

                      {/* % of mix (auto-calculated) */}
                      <div
                        title="Auto-calculated from total weight / total yield"
                        className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-gray-100 text-gray-700 text-center font-medium"
                      >
                        {ing.percentage_of_mix ? `${ing.percentage_of_mix}%` : '—'}
                      </div>

                      {/* Cost contribution (unit_cost × total_quantity) */}
                      <div
                        title={unitCost > 0 ? `KES ${unitCost}/kg × ${quantity} kg` : 'No cost set for this feed in inventory'}
                        className={`w-full border rounded-md px-2 py-1.5 text-xs text-center font-medium ${
                          hasNoCost
                            ? 'border-orange-200 bg-orange-50 text-orange-500'
                            : 'border-gray-200 bg-gray-100 text-gray-700'
                        }`}
                      >
                        {ing.feed_type_id
                          ? hasNoCost
                            ? 'No cost'
                            : quantity > 0
                              ? ingCost.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : '—'
                          : '—'}
                      </div>

                      {/* Remove */}
                      {ingredients.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeIngredient(ing.id)}
                          className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  )
                })}
              </div>

              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Ingredient
              </Button>
            </section>

            {/* ── Nutritional Targets ── */}
            <section className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Nutritional Targets
                <span className="text-gray-400 font-normal normal-case ml-1">(optional)</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Dry Matter %', value: dmPct, set: setDmPct },
                  { label: 'Crude Protein %', value: cpPct, set: setCpPct },
                  { label: 'Crude Fibre %', value: cfPct, set: setCfPct },
                  { label: 'Energy (MJ/kg)', value: energyMj, set: setEnergyMj },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={value}
                      onChange={e => set(e.target.value)}
                      placeholder="—"
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* ── Performance Estimates ── */}
            <section className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Performance Estimates
                <span className="text-gray-400 font-normal normal-case ml-1">(optional)</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Est. Milk Yield (L/day)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={estimatedMilkYield}
                    onChange={e => setEstimatedMilkYield(e.target.value)}
                    placeholder="e.g. 25.0"
                    className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Est. Cost per Day (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={estimatedCostPerDay}
                    onChange={e => setEstimatedCostPerDay(e.target.value)}
                    placeholder="e.g. 850.00"
                    className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </section>

            {/* ── Cost & Notes ── */}
            <section className="space-y-3 border-t pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Batch Cost (KES)
                </label>
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <div className="flex-1">
                    <p className="text-lg font-bold text-green-800">
                      KES {totalCost.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">
                      {totalSelectedAnimals > 1
                        ? `≈ KES ${(totalCost / totalSelectedAnimals).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per animal`
                        : 'for 1 animal (select more animals to scale)'}
                    </p>
                  </div>
                  {ingredients.some(i => i.feed_type_id && getUnitCost(i.feed_type_id) === 0) && (
                    <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                      Some feeds have no cost set in inventory
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Sum of (inventory cost/kg × total kg) per ingredient. Cost per kg comes from inventory purchase records, falling back to the feed type's unit cost.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Mixing instructions, storage requirements, etc."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>
            </section>

            {/* ── Actions ── */}
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Create TMR'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
