'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Leaf,
  Droplet,
  Zap,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface FeedItem {
  id: string
  feed_type_id: string
  feed_name: string
  quantity_kg: number
  cost_per_kg: number
  notes?: string
}

interface FeedingSessionFormProps {
  animalId: string
  farmId: string
  availableFeeds: any[]
  nutritionalTargets?: {
    daily_dry_matter_kg: number
    daily_protein_kg: number
    daily_energy_mj: number
  } | null
  animalDetails?: {
    id: string
    tag_number: string
    name: string | null
    breed?: string | null
    gender?: string | null
    age_days?: number | null
    production_status?: string | null
  } | null
  onSubmit: (sessionData: any) => Promise<void>
  isLoading?: boolean
}

export function FeedingSessionForm({
  animalId,
  farmId,
  availableFeeds,
  nutritionalTargets,
  animalDetails,
  onSubmit,
  isLoading = false
}: FeedingSessionFormProps) {
  const [feeds, setFeeds] = useState<FeedItem[]>([])
  const [feedingDate, setFeedingDate] = useState(new Date().toISOString().split('T')[0])
  const [feedingTime, setFeedingTime] = useState(new Date().toTimeString().slice(0, 5))
  const [feedingMode, setFeedingMode] = useState<'individual' | 'feed-mix-template'>('individual')
  const [appetiteScore, setAppetiteScore] = useState<number | null>(null)
  const [wasteKg, setWasteKg] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [expandedFeeds, setExpandedFeeds] = useState<Set<string>>(new Set())
  
  // Feed mix template states
  const [feedMixRecipes, setFeedMixRecipes] = useState<any[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<string>('')
  const [feedingWeight, setFeedingWeight] = useState<string>('')
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [showRecipeDetails, setShowRecipeDetails] = useState(false)

  // Load feed mix recipes when component mounts or when feeding mode changes to feed-mix-template
  useEffect(() => {
    if (feedingMode === 'feed-mix-template') {
      loadFeedMixRecipes()
    }
  }, [feedingMode])

  const loadFeedMixRecipes = async () => {
    try {
      setLoadingRecipes(true)
      const response = await fetch(`/api/farms/${farmId}/feed-recipes`)
      if (!response.ok) throw new Error('Failed to load recipes')
      const data = await response.json()
      setFeedMixRecipes(data.recipes || [])
    } catch (err) {
      setError('Failed to load feed mix recipes')
      console.error('Error loading recipes:', err)
    } finally {
      setLoadingRecipes(false)
    }
  }

  // Generate feeds from selected recipe and feeding weight
  const handleRecipeSelect = (recipeId: string) => {
    setSelectedRecipe(recipeId)
    setFeeds([]) // Reset feeds when recipe changes
  }

  const generateFeedsFromRecipe = () => {
    if (!selectedRecipe || !feedingWeight) {
      setError('Please select a recipe and enter feeding weight')
      return
    }

    const recipe = feedMixRecipes.find(r => r.id === selectedRecipe)
    if (!recipe || !recipe.ingredients) {
      setError('Recipe ingredients not found')
      return
    }

    const weight = Number(feedingWeight)
    const newFeeds: FeedItem[] = recipe.ingredients.map((ingredient: any) => {
      const feedAmount = (weight * ingredient.percentage_of_mix) / 100
      
      // Look up the feed in availableFeeds to get the current inventory cost
      const feedInventory = availableFeeds.find(f => f.id === ingredient.feed_type_id)
      const costPerKg = feedInventory?.costPerKg || feedInventory?.averageCost || ingredient.cost_per_kg || 0
      
      return {
        id: `feed-${ingredient.feed_type_id}-${Date.now()}`,
        feed_type_id: ingredient.feed_type_id,
        feed_name: ingredient.feed_name,
        quantity_kg: feedAmount,
        cost_per_kg: costPerKg
      }
    })

    setFeeds(newFeeds)
    setError(null)
  }

  // Calculate totals and nutritional content
  const calculations = useMemo(() => {
    const totalQuantity = feeds.reduce((sum, f) => sum + f.quantity_kg, 0)
    const totalCost = feeds.reduce((sum, f) => sum + (f.quantity_kg * f.cost_per_kg), 0)
    
    // Basic nutritional estimates (would be enhanced with full nutritional data)
    const nutritionByFeed = feeds.map(f => {
      const feedInfo = availableFeeds.find(af => af.id === f.feed_type_id)
      return {
        feedName: f.feed_name,
        quantity: f.quantity_kg,
        // Placeholder - would pull from feed_types.nutritional_info
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
  }, [feeds, availableFeeds])

  const handleAddFeed = () => {
    if (feeds.length > 0 && (!feeds[feeds.length - 1].feed_type_id || !feeds[feeds.length - 1].quantity_kg)) {
      setError('Please complete the current feed entry before adding another')
      return
    }

    const newFeed: FeedItem = {
      id: `feed-${Date.now()}`,
      feed_type_id: '',
      feed_name: '',
      quantity_kg: 0,
      cost_per_kg: 0,
      notes: ''
    }

    setFeeds([...feeds, newFeed])
    setError(null)
  }

  const validateForm = (): boolean => {
    if (!feedingDate) {
      setError('Please select a feeding date')
      return false
    }

    if (feedingMode === 'feed-mix-template') {
      if (!selectedRecipe) {
        setError('Please select a feed mix recipe')
        return false
      }
      if (!feedingWeight || parseFloat(feedingWeight) <= 0) {
        setError('Please enter a valid feeding weight')
        return false
      }
    } else {
      if (feeds.length === 0) {
        setError('Please add at least one feed to this session')
        return false
      }
      if (!feeds.every(f => f.feed_type_id && f.quantity_kg > 0)) {
        setError('All feeds must have a type and quantity greater than 0')
        return false
      }
    }

    return true
  }

  const handleRemoveFeed = (feedId: string) => {
    setFeeds(feeds.filter(f => f.id !== feedId))
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
          const selectedFeed = availableFeeds.find(af => af.id === value)
          return {
            ...f,
            feed_type_id: value,
            feed_name: selectedFeed?.name || '',
            cost_per_kg: selectedFeed?.averageCost || 0
          }
        }
        return { ...f, [field]: value }
      }
      return f
    }))
  }

  // Check if an animal matches a recipe's applicable conditions
  const isAnimalEligibleForRecipe = (recipe: any): boolean => {
    if (!recipe.applicable_conditions) {
      return true // Recipe applies to all animals if no conditions specified
    }

    const conditions = recipe.applicable_conditions

    // Check production status if specified
    if (conditions.production_statuses && conditions.production_statuses.length > 0) {
      // Note: You may need to fetch the animal's production_status from the API
      // For now, we check if conditions exist but allow if we don't have the data
      if (animalDetails?.production_status) {
        if (!conditions.production_statuses.includes(animalDetails.production_status)) {
          return false
        }
      }
    }

    // Check breed if specified
    if (conditions.breeds && conditions.breeds.length > 0) {
      if (animalDetails?.breed) {
        if (!conditions.breeds.includes(animalDetails.breed)) {
          return false
        }
      }
    }

    // Check age range if specified
    if (conditions.age_range_days) {
      if (animalDetails?.age_days) {
        const minAge = conditions.age_range_days.min || 0
        const maxAge = conditions.age_range_days.max || Infinity
        if (animalDetails.age_days < minAge || animalDetails.age_days > maxAge) {
          return false
        }
      }
    }

    // Check gender if specified
    if (conditions.gender && conditions.gender.length > 0) {
      if (animalDetails?.gender) {
        if (!conditions.gender.includes(animalDetails.gender)) {
          return false
        }
      }
    }

    return true
  }

  // Filter recipes based on animal eligibility
  const eligibleRecipes = useMemo(() => {
    return feedMixRecipes.filter(recipe => isAnimalEligibleForRecipe(recipe))
  }, [feedMixRecipes, animalDetails])

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

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      const sessionData = {
        animalId,
        farmId,
        feedingDate,
        feedingTime,
        feedingMode: feedingMode === 'feed-mix-template' ? 'feed-mix-recipe' : feedingMode,
        feedMixRecipeId: feedingMode === 'feed-mix-template' ? selectedRecipe : undefined,
        feeds: feeds.map(f => ({
          feed_type_id: f.feed_type_id,
          feed_name: f.feed_name,
          quantity_kg: f.quantity_kg,
          cost_per_kg: f.cost_per_kg,
          notes: f.notes
        })),
        observations: {
          appetiteScore,
          wasteKg: wasteKg ? Number(wasteKg) : null,
          notes
        }
      }

      await onSubmit(sessionData)
      
      // Reset form on success
      setFeeds([])
      setSelectedRecipe('')
      setFeedingWeight('')
      setAppetiteScore(null)
      setWasteKg('')
      setNotes('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feeding session')
    }
  }

  return (
    <div className="space-y-6">
      {/* Animal Information */}
      {animalDetails && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-blue-600 font-medium">Recording for:</p>
                <p className="text-lg font-bold text-blue-900">
                  {animalDetails.name || `Tag: ${animalDetails.tag_number}`}
                </p>
                {animalDetails.name && (
                  <p className="text-sm text-blue-700">Tag: {animalDetails.tag_number}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Date/Time Section */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="feeding_date">Feeding Date *</Label>
          <Input
            id="feeding_date"
            type="date"
            value={feedingDate}
            onChange={(e) => setFeedingDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="feeding_time">Feeding Time *</Label>
          <Input
            id="feeding_time"
            type="time"
            value={feedingTime}
            onChange={(e) => setFeedingTime(e.target.value)}
          />
        </div>
      </div>

      {/* Feeding Mode */}
      <div>
        <Label>Feeding Mode *</Label>
        <div className="flex gap-4 mt-2">
          {(['individual', 'feed-mix-template'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => {
                setFeedingMode(mode)
                setFeeds([])
                setSelectedRecipe('')
                setFeedingWeight('')
              }}
              className={cn(
                'flex-1 p-3 border rounded-lg transition-colors',
                feedingMode === mode
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <span className="font-medium capitalize">{mode === 'feed-mix-template' ? 'Mix Template' : 'Individual'}</span>
              <p className="text-xs text-gray-500 mt-1">
                {mode === 'individual' ? 'Add individual feeds' : 'Use predefined recipe'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Feed Section OR Recipe Selection */}
      {feedingMode === 'individual' ? (
        // INDIVIDUAL FEEDING MODE
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="w-5 h-5" />
                  Feed Mixture
                </CardTitle>
                <CardDescription>
                  Add multiple feeds for this session. Mix will be optimized based on animal needs.
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={handleAddFeed}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Feed
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {feeds.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">No feeds added yet</p>
                <Button
                  type="button"
                  onClick={handleAddFeed}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Feed
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {feeds.map((feed, index) => (
                  <div key={feed.id} className={`border rounded-lg transition-colors ${expandedFeeds.has(feed.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">Feed {index + 1}:</span>
                            <span className="font-semibold text-gray-900">{feed.feed_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {feed.quantity_kg.toFixed(2)}kg
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Kes {(feed.quantity_kg * feed.cost_per_kg).toFixed(2)}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            Rate: Kes {feed.cost_per_kg.toFixed(2)}/kg
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => toggleFeedExpanded(feed.id)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 hover:text-gray-900"
                          >
                            {expandedFeeds.has(feed.id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
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
                      </div>

                      {/* Expanded Details */}
                      {expandedFeeds.has(feed.id) && (
                        <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-gray-700">Feed Type</Label>
                              <Select
                                value={feed.feed_type_id}
                                onValueChange={(value) => handleFeedChange(feed.id, 'feed_type_id', value)}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select feed" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableFeeds.map(f => (
                                    <SelectItem key={f.id} value={f.id}>
                                      <div className="flex items-center gap-2">
                                        <span>{f.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {f.totalStock?.toFixed(1) || 0}kg
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-xs font-medium text-gray-700">Quantity (kg)</Label>
                              <Input
                                type="number"
                                value={feed.quantity_kg}
                                onChange={(e) => handleFeedChange(feed.id, 'quantity_kg', Number(e.target.value))}
                                placeholder="0.0"
                                min="0"
                                step="0.1"
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label className="text-xs font-medium text-gray-700">Cost per kg</Label>
                              <Input
                                type="number"
                                value={feed.cost_per_kg}
                                onChange={(e) => handleFeedChange(feed.id, 'cost_per_kg', Number(e.target.value))}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="mt-1"
                                disabled
                              />
                            </div>

                            <div>
                              <Label className="text-xs font-medium text-gray-700">Total Cost</Label>
                              <Input
                                type="text"
                                value={`Kes ${(feed.quantity_kg * feed.cost_per_kg).toFixed(2)}`}
                                disabled
                                className="mt-1 bg-gray-100"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs font-medium text-gray-700">Notes (optional)</Label>
                            <Input
                              type="text"
                              value={feed.notes || ''}
                              onChange={(e) => handleFeedChange(feed.id, 'notes', e.target.value)}
                              placeholder="Feed specific observations..."
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // FEED MIX TEMPLATE MODE
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="w-5 h-5" />
              Select Feed Mix Recipe
            </CardTitle>
            <CardDescription>
              Choose a predefined recipe and set the feeding weight for this animal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingRecipes ? (
              <p className="text-center py-8 text-gray-500">Loading recipes...</p>
            ) : feedMixRecipes.length === 0 ? (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  No feed mix recipes available. Please create one first.
                </AlertDescription>
              </Alert>
            ) : eligibleRecipes.length === 0 ? (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  No recipes available for this animal. The available recipes target different animal categories than this animal's profile.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Recipe *</Label>
                  <Select value={selectedRecipe} onValueChange={(value) => {
                    setSelectedRecipe(value)
                    setFeeds([])
                    setFeedingWeight('')
                    setShowRecipeDetails(false)
                  }}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select a recipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleRecipes.map(recipe => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          <div className="flex items-center gap-2">
                            <span>{recipe.name}</span>
                            {recipe.estimated_cost_per_day && (
                              <Badge variant="secondary" className="text-xs">
                                Kes {recipe.estimated_cost_per_day.toFixed(2)}/day
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedRecipe && (
                  <>
                    {/* Recipe Details */}
                    {feedMixRecipes.find(r => r.id === selectedRecipe)?.description && (
                      <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                        <div className="flex items-start justify-between cursor-pointer"
                          onClick={() => setShowRecipeDetails(!showRecipeDetails)}>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-blue-900">Recipe Details</h4>
                            <p className="text-xs text-blue-700 mt-1">
                              {feedMixRecipes.find(r => r.id === selectedRecipe)?.description}
                            </p>
                          </div>
                          {showRecipeDetails ? <ChevronUp className="w-4 h-4 mt-1" /> : <ChevronDown className="w-4 h-4 mt-1" />}
                        </div>

                        {showRecipeDetails && feedMixRecipes.find(r => r.id === selectedRecipe)?.ingredients && (
                          <div className="mt-3 pt-3 border-t border-blue-200 space-y-2">
                            <h5 className="text-xs font-semibold text-blue-800">Ingredients:</h5>
                            <div className="space-y-1">
                              {feedMixRecipes.find(r => r.id === selectedRecipe)?.ingredients.map((ing: any, idx: number) => (
                                <div key={idx} className="text-xs text-blue-700 flex justify-between">
                                  <span>{ing.feed_name}</span>
                                  <span className="font-medium">{ing.percentage_of_mix}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <Label htmlFor="feeding_weight" className="text-sm font-medium">Feeding Weight per Animal (kg) *</Label>
                      <Input
                        id="feeding_weight"
                        type="number"
                        value={feedingWeight}
                        onChange={(e) => {
                          setFeedingWeight(e.target.value)
                          setFeeds([])
                        }}
                        placeholder="Enter weight for this animal"
                        min="0"
                        step="0.1"
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Based on animal's consumption needs. This will be used to calculate each ingredient's quantity.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={generateFeedsFromRecipe}
                      className="w-full"
                      variant="outline"
                      disabled={!feedingWeight || parseFloat(feedingWeight) <= 0}
                    >
                      <Leaf className="w-4 h-4 mr-2" />
                      Generate Feed Mix ({feedingWeight}kg)
                    </Button>
                  </>
                )}

                {/* Display generated feeds from recipe */}
                {feeds.length > 0 && (
                  <div className="mt-6 pt-6 border-t space-y-4">
                    <h4 className="font-semibold text-sm">Generated Feed Mix</h4>
                    <div className="space-y-3">
                      {feeds.map((feed, index) => (
                        <div key={feed.id} className="p-3 border border-green-200 rounded bg-green-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-900">{index + 1}. {feed.feed_name}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                <span className="font-semibold">{feed.quantity_kg.toFixed(2)}kg</span>
                                {' @ '}
                                <span>Kes {feed.cost_per_kg.toFixed(2)}/kg</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-green-700">
                                Kes {(feed.quantity_kg * feed.cost_per_kg).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-emerald-900">Session Total</span>
                        <span className="text-lg font-bold text-emerald-700">
                          Kes {feeds.reduce((sum, f) => sum + (f.quantity_kg * f.cost_per_kg), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Nutrition Summary */}
      {feeds.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Session Nutritional Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Feeds</p>
                <p className="text-2xl font-bold text-blue-900">{calculations.feedCount}</p>
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Quantity</p>
                <p className="text-2xl font-bold text-blue-900">{calculations.totalQuantity.toFixed(1)}kg</p>
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">Est. Protein</p>
                <p className="text-2xl font-bold text-blue-900">{calculations.totalProtein.toFixed(1)}kg</p>
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">Est. Energy</p>
                <p className="text-2xl font-bold text-blue-900">{calculations.totalEnergy.toFixed(0)}MJ</p>
              </div>
            </div>

            {nutritionalTargets && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">vs. Daily Target</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-blue-600">Dry Matter</p>
                    <p className="text-sm font-medium">
                      {calculations.totalQuantity.toFixed(1)} / {nutritionalTargets.daily_dry_matter_kg.toFixed(1)}kg
                    </p>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((calculations.totalQuantity / nutritionalTargets.daily_dry_matter_kg) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">Protein</p>
                    <p className="text-sm font-medium">
                      {calculations.totalProtein.toFixed(1)} / {nutritionalTargets.daily_protein_kg.toFixed(1)}kg
                    </p>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((calculations.totalProtein / nutritionalTargets.daily_protein_kg) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">Energy</p>
                    <p className="text-sm font-medium">
                      {calculations.totalEnergy.toFixed(0)} / {nutritionalTargets.daily_energy_mj.toFixed(0)}MJ
                    </p>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((calculations.totalEnergy / nutritionalTargets.daily_energy_mj) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm font-medium text-blue-900">Session Cost: Kes {calculations.totalCost.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observations Section */}
      {shouldShowObservations() ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Animal Observations & Notes
            </CardTitle>
            <CardDescription>Record post-feeding observations for this animal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Appetite Score (1-5)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(score => (
                <button
                  key={score}
                  onClick={() => setAppetiteScore(score)}
                  className={cn(
                    'flex-1 py-3 rounded-lg border font-semibold transition-colors text-sm',
                    appetiteScore === score
                      ? 'border-green-500 bg-green-100 text-green-800'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                  )}
                  title={`Score ${score}: ${score === 1 ? 'Poor' : score === 2 ? 'Fair' : score === 3 ? 'Good' : score === 4 ? 'Very Good' : 'Excellent'}`}
                >
                  {score}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">1 = Poor appetite · 5 = Excellent appetite</p>
          </div>

          <div>
            <Label htmlFor="waste_kg" className="text-sm font-medium">Approximate Waste (kg)</Label>
            <Input
              id="waste_kg"
              type="number"
              value={wasteKg}
              onChange={(e) => setWasteKg(e.target.value)}
              placeholder="0.0"
              min="0"
              step="0.1"
              className="mt-2"
            />
            <p className="text-xs text-gray-600 mt-1">Feed left uneaten or spilled</p>
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm font-medium">General Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations or issues during feeding (health, behavior, consumption rate, etc.)..."
              rows={3}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>
      ) : (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Post-Feeding Observations Available After 2 Hours</p>
                <p className="text-sm text-blue-700 mt-1">
                  Animal observations (appetite, waste, notes) can be recorded 2+ hours after the feeding time. This allows time to observe the animal's response to feeding.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isLoading || feeds.length === 0}
        className="w-full"
        size="lg"
      >
        {isLoading ? 'Saving...' : 'Record Feeding Session'}
      </Button>
    </div>
  )
}
