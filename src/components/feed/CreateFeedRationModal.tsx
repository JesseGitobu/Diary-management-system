// src/components/feed/CreateFeedRationModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import {
  X,
  Plus,
  Trash2,
  FlaskConical,
  ChevronDown,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedSession {
  time_slot_id: string
  quantity_kg: string
}

interface Ingredient {
  feed_type_id: string
  tmr_recipe_id?: string | null
  quantity_kg_per_day: string
  percentage: string
  notes: string
  sort_order: number
  sessions: FeedSession[]
}

interface FeedTimeSlot {
  id: string
  slot_name: string
  scheduled_time: string
  days_of_week: number[]
  is_active: boolean
}

interface TMRRecipe {
  id: string
  name: string
  total_yield: number
  unit_of_measure: string | null
  ingredients?: Array<{ weight_per_animal_kg?: number | null }>
  target_animals?: {
    animal_ids?: string[]
    category_ids?: string[]
  } | null
}

interface CreateFeedRationModalProps {
  farmId: string
  feedTypes: any[]
  inventory: any[]
  rationTypes: any[]
  timeSlots?: FeedTimeSlot[]
  tmrRecipes?: TMRRecipe[]
  isOpen: boolean
  editingRation?: any | null
  onClose: () => void
  onSuccess: (ration: any) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  high_production: 'High Production',
  mid_production:  'Mid Production',
  low_production:  'Low Production',
  dry:             'Dry Cow',
  steaming_dry:    'Steaming Dry',
  calf:            'Calf',
  bull:            'Bull',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the per-animal daily quantity (kg) for a TMR recipe.
 *
 * Priority:
 *   1. Sum of ingredient-level weight_per_animal_kg values (most accurate —
 *      stored when the recipe was saved via FeedMixRecipeManager).
 *   2. total_yield ÷ number of explicitly listed target animals.
 *   3. total_yield as a last resort (batch total, not ideal but prevents blank).
 */
function getTMRPerAnimalKg(recipe: TMRRecipe): number {
  if (recipe.ingredients?.length) {
    const sum = recipe.ingredients.reduce(
      (acc, ing) => acc + (ing.weight_per_animal_kg ?? 0),
      0,
    )
    if (sum > 0) return sum
  }
  const animalCount =
    (recipe.target_animals?.animal_ids?.length ?? 0) +
    (recipe.target_animals?.category_ids?.length ?? 0)
  if (animalCount > 0) return recipe.total_yield / animalCount
  return recipe.total_yield
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateFeedRationModal({
  farmId,
  feedTypes,
  inventory,
  rationTypes,
  timeSlots = [],
  tmrRecipes = [],
  isOpen,
  editingRation,
  onClose,
  onSuccess,
}: CreateFeedRationModalProps) {
  const isEditing = !!editingRation

  // Only feed types with stock are selectable as ingredients
  const inStockFeedTypeIds = new Set(inventory.map((inv: any) => inv.feed_type_id))
  const feedTypesInStock = feedTypes.filter(ft => inStockFeedTypeIds.has(ft.id))
  const activeTimeSlots = timeSlots.filter(s => s.is_active)

  // ── form state ──
  const [name, setName] = useState('')
  const [rationTypeId, setRationTypeId] = useState('')
  const [description, setDescription] = useState('')
  const [totalDailyKg, setTotalDailyKg] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { feed_type_id: '', tmr_recipe_id: null, quantity_kg_per_day: '', percentage: '', notes: '', sort_order: 0, sessions: [] },
  ])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── pre-fill when editing ──
  useEffect(() => {
    if (editingRation) {
      setName(editingRation.name ?? '')
      setRationTypeId(editingRation.ration_type_id ?? '')
      setDescription(editingRation.description ?? '')
      setTotalDailyKg(editingRation.total_daily_kg?.toString() ?? '')
      setStartDate(editingRation.start_date ?? '')
      setEndDate(editingRation.end_date ?? '')
      setNotes(editingRation.notes ?? '')
      setIsActive(editingRation.is_active ?? true)

      const existingIngredients: Ingredient[] =
        editingRation.feed_ration_ingredients?.map((ing: any, i: number) => ({
          feed_type_id: ing.feed_type_id ?? '',
          tmr_recipe_id: ing.tmr_recipe_id ?? null,
          quantity_kg_per_day: ing.quantity_kg_per_day?.toString() ?? '',
          percentage: ing.percentage?.toString() ?? '',
          notes: ing.notes ?? '',
          sort_order: ing.sort_order ?? i,
          sessions: ing.feed_ingredient_sessions?.map((s: any) => ({
            time_slot_id: s.time_slot_id,
            quantity_kg: s.quantity_kg?.toString() ?? '',
          })) ?? [],
        })) ?? []
      setIngredients(
        existingIngredients.length > 0
          ? existingIngredients
          : [{ feed_type_id: '', tmr_recipe_id: null, quantity_kg_per_day: '', percentage: '', notes: '', sort_order: 0, sessions: [] }]
      )
    } else {
      resetForm()
    }
  }, [editingRation])

  function resetForm() {
    setName('')
    setRationTypeId('')
    setDescription('')
    setTotalDailyKg('')
    setStartDate('')
    setEndDate('')
    setNotes('')
    setIsActive(true)
    setIngredients([{ feed_type_id: '', tmr_recipe_id: null, quantity_kg_per_day: '', percentage: '', notes: '', sort_order: 0, sessions: [] }])
    setError(null)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  // ── ingredient helpers ─────────────────────────────────────

  function addIngredient() {
    setIngredients(prev => [
      ...prev,
      { feed_type_id: '', tmr_recipe_id: null, quantity_kg_per_day: '', percentage: '', notes: '', sort_order: prev.length, sessions: [] },
    ])
  }

  function removeIngredient(index: number) {
    setIngredients(prev => recalcPercentages(prev.filter((_, i) => i !== index)))
  }

  function updateIngredient(index: number, field: keyof Ingredient, value: string | number | null) {
    setIngredients(prev => prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)))
  }

  function handleFeedSelection(index: number, feedTypeId: string, isTMR: boolean = false) {
    const feed = isTMR ? tmrRecipes.find(r => r.id === feedTypeId) : feedTypes.find(f => f.id === feedTypeId)
    
    setIngredients(prev => {
      const updated = prev.map((ing, i) => {
        if (i === index) {
          const newIng = {
            ...ing,
            feed_type_id: isTMR ? '' : feedTypeId,
            tmr_recipe_id: isTMR ? feedTypeId : null,
            quantity_kg_per_day: isTMR && feed ? getTMRPerAnimalKg(feed as TMRRecipe).toFixed(3) : ing.quantity_kg_per_day,
          }
          return newIng
        }
        return ing
      })
      return recalcPercentages(updated)
    })
  }

  function addSessionToIngredient(ingredientIndex: number, timeSlotId: string) {
    setIngredients(prev => prev.map((ing, i) => {
      if (i === ingredientIndex) {
        const existingSession = ing.sessions.find(s => s.time_slot_id === timeSlotId)
        if (!existingSession) {
          return {
            ...ing,
            sessions: [...ing.sessions, { time_slot_id: timeSlotId, quantity_kg: '' }]
          }
        }
      }
      return ing
    }))
  }

  function removeSessionFromIngredient(ingredientIndex: number, timeSlotId: string) {
    setIngredients(prev => prev.map((ing, i) => {
      if (i === ingredientIndex) {
        return {
          ...ing,
          sessions: ing.sessions.filter(s => s.time_slot_id !== timeSlotId)
        }
      }
      return ing
    }))
  }

  function updateSessionQuantity(ingredientIndex: number, timeSlotId: string, quantity: string) {
    setIngredients(prev => prev.map((ing, i) => {
      if (i === ingredientIndex) {
        return {
          ...ing,
          sessions: ing.sessions.map(s => 
            s.time_slot_id === timeSlotId ? { ...s, quantity_kg: quantity } : s
          )
        }
      }
      return ing
    }))
  }

  function recalcPercentages(rows: Ingredient[]): Ingredient[] {
    const total = rows.reduce((sum, ing) => {
      const qty = parseFloat(ing.quantity_kg_per_day)
      return sum + (isNaN(qty) ? 0 : qty)
    }, 0)
    if (total <= 0) return rows
    return rows.map(ing => {
      const qty = parseFloat(ing.quantity_kg_per_day)
      return { ...ing, percentage: isNaN(qty) ? '' : ((qty / total) * 100).toFixed(1) }
    })
  }

  function handleQuantityChange(index: number, value: string) {
    setIngredients(prev => recalcPercentages(prev.map((ing, i) => (i === index ? { ...ing, quantity_kg_per_day: value } : ing))))
  }

  function handlePercentageChange(index: number, value: string) {
    const pct = parseFloat(value)
    setIngredients(prev => {
      const next = prev.map((ing, i) => (i === index ? { ...ing, percentage: value } : ing))
      if (isNaN(pct) || pct <= 0 || pct >= 100) return next

      let derivedQty: number | null = null
      const manualTotal = totalDailyKg ? parseFloat(totalDailyKg) : NaN
      if (!isNaN(manualTotal) && manualTotal > 0) {
        derivedQty = (pct / 100) * manualTotal
      } else {
        const otherTotal = prev.reduce((sum, ing, i) => {
          if (i === index) return sum
          const qty = parseFloat(ing.quantity_kg_per_day)
          return sum + (isNaN(qty) ? 0 : qty)
        }, 0)
        if (otherTotal > 0) derivedQty = (pct * otherTotal) / (100 - pct)
      }
      if (derivedQty === null || derivedQty <= 0) return next

      const withQty = next.map((ing, i) =>
        i === index ? { ...ing, quantity_kg_per_day: derivedQty!.toFixed(3) } : ing
      )
      return recalcPercentages(withQty).map((ing, i) =>
        i === index ? { ...ing, percentage: value } : ing
      )
    })
  }

  function calcTotal(): number {
    return ingredients.reduce((sum, ing) => {
      const qty = parseFloat(ing.quantity_kg_per_day)
      return sum + (isNaN(qty) ? 0 : qty)
    }, 0)
  }

  function handleRationTypeChange(typeId: string) {
    setRationTypeId(typeId)
    if (!isEditing && typeId) {
      const rt = rationTypes.find(t => t.id === typeId)
      if (rt && !name) setName(rt.name)
    }
  }

  // ── submit ────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('Ration name is required'); return }

    const validIngredients = ingredients.filter(ing => (ing.feed_type_id || ing.tmr_recipe_id) && ing.quantity_kg_per_day)
    if (validIngredients.length === 0) { setError('Add at least one feed with quantity'); return }

    const feedIds = validIngredients.map(i => i.feed_type_id || i.tmr_recipe_id)
    if (new Set(feedIds).size !== feedIds.length) { setError('Each feed can only appear once in a ration'); return }

    if (startDate && endDate && endDate < startDate) { setError('End date cannot be before start date'); return }

    const payload: any = {
      name: name.trim(),
      ration_type_id: rationTypeId || null,
      description: description.trim() || null,
      total_daily_kg: totalDailyKg ? parseFloat(totalDailyKg) : calcTotal() || null,
      is_active: isActive,
      start_date: startDate || null,
      end_date: endDate || null,
      notes: notes.trim() || null,
      ingredients: validIngredients.map((ing, i) => ({
        feed_type_id: ing.feed_type_id || null,
        tmr_recipe_id: ing.tmr_recipe_id || null,
        quantity_kg_per_day: parseFloat(ing.quantity_kg_per_day),
        percentage: ing.percentage ? parseFloat(ing.percentage) : null,
        notes: ing.notes || null,
        sort_order: i,
        sessions: ing.sessions.map(s => ({
          time_slot_id: s.time_slot_id,
          quantity_kg: parseFloat(s.quantity_kg) || 0,
        })),
      })),
    }

    setIsSaving(true)
    try {
      const url = isEditing
        ? `/api/farms/${farmId}/feed-rations/${editingRation.id}`
        : `/api/farms/${farmId}/feed-rations`

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')

      onSuccess(json.data)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const autoTotal = calcTotal()

  // ─── render ──────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl max-h-[95vh] bg-white rounded-t-2xl sm:rounded-xl shadow-xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Feed Ration' : 'Create Feed Ration'}
            </h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1" disabled={isSaving}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-6">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            {/* ─── Basic Information ─────────────────────────── */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Basic Information</h3>

              {/* Ration template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ration Template
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <div className="relative">
                  <select
                    value={rationTypeId}
                    onChange={e => handleRationTypeChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Custom ration (no template)</option>
                    {rationTypes.map(rt => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name}{rt.target_stage ? ` — ${STAGE_LABELS[rt.target_stage] ?? rt.target_stage}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {rationTypeId && (
                  <p className="text-xs text-gray-500 mt-1">
                    {rationTypes.find(rt => rt.id === rationTypeId)?.description}
                  </p>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ration Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. High Production Ration — January"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional notes about this ration's purpose or target animals"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              <div className="flex gap-4">
                {/* Total daily kg */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Daily (kg/animal)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalDailyKg}
                    onChange={e => setTotalDailyKg(e.target.value)}
                    placeholder={autoTotal > 0 ? `${autoTotal.toFixed(2)} (auto)` : '0.00'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {autoTotal > 0 && !totalDailyKg && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Auto-calculated: {autoTotal.toFixed(2)} kg
                    </p>
                  )}
                </div>

                {/* Active toggle */}
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

            </section>

            {/* ─── Feeds ───────────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Feeds <span className="text-red-500">*</span>
                </h3>
                <Button type="button" size="sm" variant="outline" onClick={addIngredient}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Feed
                </Button>
              </div>

              {ingredients.map((ing, index) => {
                const selectedFeedId = ing.feed_type_id || ing.tmr_recipe_id
                const isTMR = !!ing.tmr_recipe_id
                const feedName = isTMR 
                  ? tmrRecipes.find(r => r.id === ing.tmr_recipe_id)?.name
                  : feedTypes.find(f => f.id === ing.feed_type_id)?.name

                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                    <div className="flex items-start gap-2">
                      {/* Feed/TMR selection */}
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Feed / TMR Recipe</label>
                        <div className="relative">
                          <select
                            value={selectedFeedId || ''}
                            onChange={e => {
                              const value = e.target.value
                              if (value.startsWith('tmr-')) {
                                handleFeedSelection(index, value.replace('tmr-', ''), true)
                              } else {
                                handleFeedSelection(index, value, false)
                              }
                            }}
                            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm appearance-none pr-7 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">Select feed or TMR recipe…</option>
                            {feedTypesInStock.length > 0 && (
                              <optgroup label="Feed Types">
                                {feedTypesInStock.map(ft => (
                                  <option key={`feed-${ft.id}`} value={ft.id}>{ft.name}</option>
                                ))}
                              </optgroup>
                            )}
                            {tmrRecipes.length > 0 && (
                              <optgroup label="TMR Recipes">
                                {tmrRecipes.map(recipe => (
                                  <option key={`tmr-${recipe.id}`} value={`tmr-${recipe.id}`}>
                                    {recipe.name} (TMR - {recipe.total_yield} {recipe.unit_of_measure ?? 'kg'})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        </div>
                        {feedTypesInStock.length === 0 && tmrRecipes.length === 0 && (
                          <p className="text-xs text-orange-600 mt-1">
                            No feeds in stock or TMR recipes available.
                          </p>
                        )}
                      </div>

                      {/* Remove */}
                      {ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          className="mt-5 text-red-400 hover:text-red-600 p-1"
                          title="Remove feed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Feed/TMR Details Display */}
                    {selectedFeedId && (
                      <div className="border-t border-gray-300 pt-3 mt-3">
                        {isTMR ? (
                          // TMR Recipe Details
                          (() => {
                            const recipe = tmrRecipes.find(r => r.id === ing.tmr_recipe_id)
                            return recipe ? (
                              <div className="space-y-2">
                                <div className="bg-blue-50 border border-blue-200 rounded-md p-2.5">
                                  <div className="text-xs font-semibold text-blue-900 mb-2">TMR Recipe Details</div>
                                  <div className="space-y-1 text-xs text-blue-800">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Recipe:</span>
                                      <span className="font-medium">{recipe.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Per Animal Ration:</span>
                                      <span className="font-medium">
                                        {getTMRPerAnimalKg(recipe).toFixed(3)} {recipe.unit_of_measure ?? 'kg'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : null
                          })()
                        ) : (
                          // Feed Type Details
                          (() => {
                            const feed = feedTypes.find(f => f.id === ing.feed_type_id)
                            const inventoryItem = inventory.find(inv => inv.feed_type_id === ing.feed_type_id)
                            return feed ? (
                              <div className="space-y-2">
                                <div className="bg-green-50 border border-green-200 rounded-md p-2.5">
                                  <div className="text-xs font-semibold text-green-900 mb-2">Feed Information</div>
                                  <div className="space-y-1 text-xs text-green-800">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Feed Type:</span>
                                      <span className="font-medium">{feed.name}</span>
                                    </div>
                                    {inventoryItem && (
                                      <>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Current Stock:</span>
                                          <span className="font-medium">
                                            {inventoryItem.quantity_kg} kg
                                            {inventoryItem.storage_location_id && (
                                              <span className="text-gray-500 ml-1">
                                                ({inventoryItem.storage_locations?.name})
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                        {inventoryItem.unit_price && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Unit Price:</span>
                                            <span className="font-medium">${inventoryItem.unit_price}/kg</span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : null
                          })()
                        )}
                      </div>
                    )}

                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Quantity (kg/day per animal)
                        {isTMR && <span className="text-blue-600 ml-1">(auto-filled from TMR)</span>}
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={ing.quantity_kg_per_day}
                        onChange={e => handleQuantityChange(index, e.target.value)}
                        placeholder="0.000"
                        className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    {/* Feeding Sessions */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-gray-600">
                          Feeding Sessions
                        </label>
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const unselectedSlot = activeTimeSlots.find(s => !ing.sessions.find(sess => sess.time_slot_id === s.id))
                            if (unselectedSlot) {
                              addSessionToIngredient(index, unselectedSlot.id)
                            }
                          }}
                          disabled={activeTimeSlots.length === 0 || ing.sessions.length >= activeTimeSlots.length}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add Session
                        </Button>
                      </div>
                      
                      {/* Selected sessions */}
                      <div className="space-y-2">
                        {ing.sessions.map(session => {
                          const slot = activeTimeSlots.find(s => s.id === session.time_slot_id)
                          const time = slot?.scheduled_time.slice(0, 5) || ''
                          const hour = time ? parseInt(time.split(':')[0]) : null
                          const min = time ? time.split(':')[1] : ''
                          const timeDisplay = hour !== null ? `${hour % 12 || 12}:${min} ${hour >= 12 ? 'PM' : 'AM'}` : '–'
                          
                          return (
                            <div key={session.time_slot_id} className="flex items-center gap-2">
                              {/* Session Dropdown */}
                              <div className="flex-1 relative">
                                <select
                                  value={session.time_slot_id}
                                  onChange={e => {
                                    removeSessionFromIngredient(index, session.time_slot_id)
                                    addSessionToIngredient(index, e.target.value)
                                  }}
                                  className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm appearance-none pr-7 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                  {activeTimeSlots.map(slot => (
                                    <option key={slot.id} value={slot.id}>
                                      {slot.slot_name}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                              </div>
                              
                              {/* Time Display */}
                              <div className="px-2.5 py-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-300 rounded-md min-w-fit font-mono text-xs">
                                {timeDisplay}
                              </div>
                              
                              {/* Quantity Input */}
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={session.quantity_kg}
                                onChange={e => updateSessionQuantity(index, session.time_slot_id, e.target.value)}
                                placeholder="0"
                                className="w-20 border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                              
                              {/* Remove Button */}
                              <button
                                type="button"
                                onClick={() => removeSessionFromIngredient(index, session.time_slot_id)}
                                className="text-red-400 hover:text-red-600 p-1 flex-shrink-0"
                                title="Remove session"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )
                        })}
                      </div>

                      {activeTimeSlots.length === 0 && (
                        <p className="text-xs text-amber-600 mt-2">
                          No feeding slots configured. Go to Settings → Feed Settings to add them.
                        </p>
                      )}
                    </div>

                    {/* Notes */}
                    <input
                      type="text"
                      value={ing.notes}
                      onChange={e => updateIngredient(index, 'notes', e.target.value)}
                      placeholder="Notes for this feed (optional)"
                      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )
              })}

              {autoTotal > 0 && (
                <div className="text-right text-sm text-gray-600">
                  Ingredient total:{' '}
                  <span className="font-semibold text-gray-800">{autoTotal.toFixed(3)} kg/day</span>
                </div>
              )}
            </section>

            {/* ─── Ration Notes ──────────────────────────────── */}
            <section>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ration Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Feeding instructions, storage requirements, or any other notes…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </section>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-200 flex-shrink-0">
          <p className="text-xs text-gray-400">
            {(() => {
              const totalSessions = new Set(
                ingredients.flatMap(ing => ing.sessions.map(s => s.time_slot_id))
              ).size
              return totalSessions > 0
                ? `${totalSessions} session${totalSessions !== 1 ? 's' : ''} selected`
                : 'No sessions selected'
            })()}
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving
                ? isEditing ? 'Saving…' : 'Creating…'
                : isEditing ? 'Save Changes' : 'Create Ration'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
