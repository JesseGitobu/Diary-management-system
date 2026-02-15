// src/components/feed/FeedMixRecipeManager.tsx

'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Plus, Edit2, Trash2, Copy, ChevronDown, ChevronUp, Leaf } from 'lucide-react'
import { FeedMixRecipe } from '@/types/feedMixRecipe'

// Form validation schema
const recipeFormSchema = z.object({
  name: z.string().min(1, 'Recipe name is required'),
  description: z.string().optional(),
  production_status: z.array(z.string()).min(1, 'Select at least one production status'),
  lactation_stage: z.enum(['early', 'peak', 'late']).optional(),
  min_days_in_milk: z.number().min(0).optional(),
  max_days_in_milk: z.number().min(0).optional(),
  min_age_days: z.number().min(0).optional(),
  max_age_days: z.number().min(0).optional(),
  pregnancy_stage: z.enum(['early', 'mid', 'late', 'close_up']).optional(),
  health_statuses: z.array(z.string()).optional(),
  dry_matter_percent: z.number().min(0).max(100),
  crude_protein_percent: z.number().min(0).max(100),
  crude_fiber_percent: z.number().min(0).max(100),
  energy_mcal_per_kg: z.number().min(0),
  estimated_cost_per_day: z.number().min(0),
})

type RecipeFormData = z.infer<typeof recipeFormSchema>

interface Ingredient {
  id: string
  feed_type_id: string
  feed_name: string
  percentage_of_mix: number
  priority: 'primary' | 'secondary' | 'supplement'
  min_quantity_kg?: number
  max_quantity_kg?: number
}

interface FeedMixRecipeManagerProps {
  farmId: string
  availableFeeds: Array<{ id: string; name: string; category?: string }>
  onRecipeCreated?: (recipe: FeedMixRecipe) => void
  onRecipeDeleted?: (recipeId: string) => void
}

export function FeedMixRecipeManager({
  farmId,
  availableFeeds,
  onRecipeCreated,
  onRecipeDeleted,
}: FeedMixRecipeManagerProps) {
  const [recipes, setRecipes] = useState<FeedMixRecipe[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [ingredientIdCounter, setIngredientIdCounter] = useState(0)
  const [expandedIngredients, setExpandedIngredients] = useState<Set<string>>(new Set())

  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      production_status: [],
      health_statuses: [],
      estimated_cost_per_day: 0,
    },
  })

  // Watch production_status to conditionally show/hide fields
  const selectedProductionStatuses = form.watch('production_status')

  // Helper functions for conditional visibility
  const showLactationStageAndDIM = selectedProductionStatuses.includes('lactating') || selectedProductionStatuses.includes('served')
  const showPregnancyStage = selectedProductionStatuses.includes('heifer') || selectedProductionStatuses.includes('served') || selectedProductionStatuses.includes('dry')
  const showAgeRange = selectedProductionStatuses.includes('calf') || selectedProductionStatuses.includes('heifer')

  // Fetch recipes on mount
  useEffect(() => {
    fetchRecipes()
  }, [farmId])

  async function fetchRecipes() {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/farms/${farmId}/feed-recipes`)
      if (!response.ok) throw new Error('Failed to fetch recipes')
      const data = await response.json()
      setRecipes(data.recipes || [])
    } catch (error) {
      console.error('Error fetching recipes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function openNewDialog() {
    setEditingRecipeId(null)
    setIngredients([])
    setIngredientIdCounter(0)
    form.reset()
    setIsDialogOpen(true)
  }

  function openEditDialog(recipe: FeedMixRecipe) {
    setEditingRecipeId(recipe.id)
    form.reset({
      name: recipe.name,
      description: recipe.description,
      production_status: recipe.applicable_conditions.production_statuses || [],
      lactation_stage: recipe.applicable_conditions.lactation_stage as any,
      min_days_in_milk: recipe.applicable_conditions.days_in_milk_range?.[0],
      max_days_in_milk: recipe.applicable_conditions.days_in_milk_range?.[1],
      min_age_days: recipe.applicable_conditions.min_age_days,
      max_age_days: recipe.applicable_conditions.max_age_days,
      pregnancy_stage: recipe.applicable_conditions.pregnancy_stage as any,
      health_statuses: recipe.applicable_conditions.health_statuses || [],
      dry_matter_percent: recipe.target_nutrition.dry_matter_percent,
      crude_protein_percent: recipe.target_nutrition.crude_protein_percent,
      crude_fiber_percent: recipe.target_nutrition.crude_fiber_percent,
      energy_mcal_per_kg: recipe.target_nutrition.energy_mcal_per_kg,
      estimated_cost_per_day: recipe.estimated_cost_per_day || 0,
    })
    setIngredients(recipe.ingredients as any)
    setIsDialogOpen(true)
  }

  async function onSubmit(data: RecipeFormData) {
    try {
      setIsLoading(true)

      // Validate ingredients
      if (ingredients.length === 0) {
        alert('Please add at least one ingredient')
        return
      }

      // Validate ingredient percentages sum to ~100%
      const totalPercentage = ingredients.reduce((sum, ing) => sum + ing.percentage_of_mix, 0)
      if (Math.abs(totalPercentage - 100) > 1) {
        alert(`Ingredient percentages must sum to 100% (currently ${totalPercentage}%)`)
        return
      }

      const recipeData: any = {
        farm_id: farmId,
        name: data.name,
        description: data.description,
        applicable_conditions: {
          production_statuses: data.production_status,
          lactation_stage: data.lactation_stage,
          days_in_milk_range: 
            data.min_days_in_milk !== undefined && data.max_days_in_milk !== undefined
              ? [data.min_days_in_milk, data.max_days_in_milk]
              : undefined,
          min_age_days: data.min_age_days,
          max_age_days: data.max_age_days,
          pregnancy_stage: data.pregnancy_stage,
          health_statuses: data.health_statuses,
        },
        ingredients: ingredients.map(({ id, ...rest }) => rest),
        target_nutrition: {
          dry_matter_percent: data.dry_matter_percent,
          crude_protein_percent: data.crude_protein_percent,
          crude_fiber_percent: data.crude_fiber_percent,
          energy_mcal_per_kg: data.energy_mcal_per_kg,
        },
        estimated_cost_per_day: data.estimated_cost_per_day,
      }

      const url = editingRecipeId
        ? `/api/farms/${farmId}/feed-recipes/${editingRecipeId}`
        : `/api/farms/${farmId}/feed-recipes`

      const response = await fetch(url, {
        method: editingRecipeId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData),
      })

      if (!response.ok) throw new Error('Failed to save recipe')
      const result = await response.json()

      setIsDialogOpen(false)
      await fetchRecipes()
      onRecipeCreated?.(result.recipe)
    } catch (error) {
      console.error('Error saving recipe:', error)
      alert('Failed to save recipe')
    } finally {
      setIsLoading(false)
    }
  }

  async function deleteRecipe(recipeId: string) {
    if (!confirm('Are you sure you want to delete this recipe?')) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/farms/${farmId}/feed-recipes/${recipeId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete recipe')
      await fetchRecipes()
      onRecipeDeleted?.(recipeId)
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert('Failed to delete recipe')
    } finally {
      setIsLoading(false)
    }
  }

  async function duplicateRecipe(recipe: FeedMixRecipe) {
    try {
      setIsLoading(true)
      const newRecipe = {
        ...recipe,
        id: undefined,
        name: `${recipe.name} (Copy)`,
        created_at: new Date().toISOString(),
      }
      
      const response = await fetch(`/api/farms/${farmId}/feed-recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecipe),
      })

      if (!response.ok) throw new Error('Failed to duplicate recipe')
      await fetchRecipes()
    } catch (error) {
      console.error('Error duplicating recipe:', error)
      alert('Failed to duplicate recipe')
    } finally {
      setIsLoading(false)
    }
  }

  function addIngredient() {
    setIngredients([
      ...ingredients,
      {
        id: `ing-${ingredientIdCounter}`,
        feed_type_id: '',
        feed_name: '',
        percentage_of_mix: 10,
        priority: 'primary',
      },
    ])
    setIngredientIdCounter(ingredientIdCounter + 1)
  }

  function removeIngredient(id: string) {
    setIngredients(ingredients.filter((ing) => ing.id !== id))
  }

  function updateIngredient(id: string, updates: Partial<Ingredient>) {
    setIngredients(
      ingredients.map((ing) =>
        ing.id === id ? { ...ing, ...updates } : ing
      )
    )
  }

  // Calculate ingredient percentage sum
  const ingredientPercentageSum = ingredients.reduce((sum, ing) => sum + ing.percentage_of_mix, 0)

  const toggleIngredients = (recipeId: string) => {
    setExpandedIngredients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId)
      } else {
        newSet.add(recipeId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Feed Mix Recipes</h3>
        <Button onClick={openNewDialog} disabled={isLoading}>
          <Plus className="w-4 h-4 mr-2" />
          New Recipe
        </Button>
      </div>

      {/* Recipes List */}
      {isLoading && recipes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Loading recipes...</div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No recipes yet. Create one to get started.
        </div>
      ) : (
        <div className="grid gap-3">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{recipe.name}</h4>
                  {recipe.description && (
                    <p className="text-sm text-gray-600">{recipe.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(recipe)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateRecipe(recipe)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteRecipe(recipe.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Recipe conditions */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Target Animals:</span>{' '}
                  {recipe.applicable_conditions.production_statuses?.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') || 'Any'}
                </div>
                <div>
                  <span className="font-medium">Cost/day:</span> ${recipe.estimated_cost_per_day?.toFixed(2) || '0.00'}
                </div>
              </div>

              {/* Feed Ingredients */}
              <button
                type="button"
                onClick={() => toggleIngredients(recipe.id)}
                className="w-full flex items-center justify-between px-3 py-2 bg-amber-100 hover:bg-amber-150 rounded border border-amber-300 text-sm font-medium text-amber-900 transition-colors"
              >
                <span className="flex items-center space-x-2">
                  <Leaf className="w-4 h-4" />
                  <span>Feed Ingredients</span>
                </span>
                {expandedIngredients.has(recipe.id) ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {expandedIngredients.has(recipe.id) && (
                <div className="bg-amber-50 p-3 rounded text-sm space-y-2">
                  <div className="space-y-1">
                    {recipe.ingredients && recipe.ingredients.length > 0 ? (
                      <div className="space-y-1">
                        {recipe.ingredients.map((ingredient: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-amber-800">
                            <span>{ingredient.feed_name || 'Unknown Feed'}</span>
                            <span className="font-semibold bg-amber-100 px-2 py-1 rounded text-xs">
                              {ingredient.percentage_of_mix}%
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-amber-700 text-xs">No ingredients defined</p>
                    )}
                  </div>
                </div>
              )}

              {/* Nutritional targets */}
              <div className="bg-blue-50 p-3 rounded text-sm space-y-1">
                <div className="font-medium text-blue-900">Nutrition Targets</div>
                <div className="grid grid-cols-2 gap-2 text-blue-800">
                  <div>DM: {recipe.target_nutrition.dry_matter_percent}%</div>
                  <div>Protein: {recipe.target_nutrition.crude_protein_percent}%</div>
                  <div>Fiber: {recipe.target_nutrition.crude_fiber_percent}%</div>
                  <div>Energy: {recipe.target_nutrition.energy_mcal_per_kg} MJ/kg</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recipe Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecipeId ? 'Edit Recipe' : 'Create New Recipe'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-semibold">Basic Information</h4>
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipe Name *</label>
                <Input
                  {...form.register('name')}
                  placeholder="e.g., High-Production Mix"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  {...form.register('description')}
                  placeholder="Optional description"
                />
              </div>
            </div>

            {/* Applicability Conditions */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold">Applicable Conditions</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Production Status *</label>
                  <div className="space-y-2">
                    {['calf', 'heifer', 'lactating', 'served', 'dry'].map((status) => (
                      <label key={status} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          {...form.register('production_status')}
                          value={status}
                          className="w-4 h-4"
                        />
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {showLactationStageAndDIM && (
                    <div>
                      <label className="text-sm font-medium">Lactation Stage</label>
                      <select
                        {...form.register('lactation_stage')}
                        className="w-full text-sm border rounded px-2 py-1"
                      >
                        <option value="">Any</option>
                        <option value="early">Early</option>
                        <option value="peak">Peak</option>
                        <option value="late">Late</option>
                      </select>
                    </div>
                  )}

                  {showPregnancyStage && (
                    <div>
                      <label className="text-sm font-medium">Pregnancy Stage</label>
                      <select
                        {...form.register('pregnancy_stage')}
                        className="w-full text-sm border rounded px-2 py-1"
                      >
                        <option value="">Any</option>
                        <option value="early">Early</option>
                        <option value="mid">Mid</option>
                        <option value="late">Late</option>
                        <option value="close_up">Close-up</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Range inputs */}
              <div className="space-y-3">
                {showLactationStageAndDIM && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium block">Min DIM</label>
                      <Input
                        type="number"
                        {...form.register('min_days_in_milk', { valueAsNumber: true })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block">Max DIM</label>
                      <Input
                        type="number"
                        {...form.register('max_days_in_milk', { valueAsNumber: true })}
                        placeholder="999"
                      />
                    </div>
                  </div>
                )}

                {showAgeRange && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium block">Min Age (days)</label>
                      <Input
                        type="number"
                        {...form.register('min_age_days', { valueAsNumber: true })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block">Max Age (days)</label>
                      <Input
                        type="number"
                        {...form.register('max_age_days', { valueAsNumber: true })}
                        placeholder="999"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ingredients */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Ingredients</h4>
                <div className="text-sm text-gray-600">
                  Total: <span className={ingredientPercentageSum === 100 ? 'text-green-600' : 'text-orange-600'}>
                    {ingredientPercentageSum.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-2 bg-gray-50">
                {ingredients.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No ingredients added yet
                  </p>
                ) : (
                  ingredients.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="flex gap-2 items-end bg-white p-2 rounded border"
                    >
                      <div className="flex-1">
                        <label className="text-xs font-medium block mb-1">Feed</label>
                        <select
                          value={ingredient.feed_type_id}
                          onChange={(e) => {
                            const feed = availableFeeds.find((f) => f.id === e.target.value)
                            updateIngredient(ingredient.id, {
                              feed_type_id: e.target.value,
                              feed_name: feed?.name || '',
                            })
                          }}
                          className="w-full text-sm border rounded px-1 py-1"
                        >
                          <option value="">Select feed</option>
                          {availableFeeds.map((feed) => (
                            <option key={feed.id} value={feed.id}>
                              {feed.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-20">
                        <label className="text-xs font-medium block mb-1">% Mix</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={ingredient.percentage_of_mix}
                          onChange={(e) =>
                            updateIngredient(ingredient.id, {
                              percentage_of_mix: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="text-xs p-1"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium block mb-1">Priority</label>
                        <select
                          value={ingredient.priority}
                          onChange={(e) =>
                            updateIngredient(ingredient.id, {
                              priority: e.target.value as any,
                            })
                          }
                          className="text-xs border rounded px-1 py-1"
                        >
                          <option value="primary">Primary</option>
                          <option value="secondary">Secondary</option>
                          <option value="supplement">Supplement</option>
                        </select>
                      </div>

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeIngredient(ingredient.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addIngredient}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Ingredient
              </Button>
            </div>

            {/* Nutritional Targets */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold">Nutritional Targets</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Dry Matter % *</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    {...form.register('dry_matter_percent', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Crude Protein % *</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    {...form.register('crude_protein_percent', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Crude Fiber % *</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    {...form.register('crude_fiber_percent', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Energy (MJ/kg) *</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    {...form.register('energy_mcal_per_kg', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            {/* Cost */}
            <div className="space-y-2 border-t pt-4">
              <label className="text-sm font-medium">Estimated Cost Per Day ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...form.register('estimated_cost_per_day', { valueAsNumber: true })}
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 justify-end border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Recipe'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
