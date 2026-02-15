'use client'

import { useState, useMemo } from 'react'
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
  AlertTriangle
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
  onSubmit: (sessionData: any) => Promise<void>
  isLoading?: boolean
}

export function FeedingSessionForm({
  animalId,
  farmId,
  availableFeeds,
  nutritionalTargets,
  onSubmit,
  isLoading = false
}: FeedingSessionFormProps) {
  const [feeds, setFeeds] = useState<FeedItem[]>([])
  const [feedingDate, setFeedingDate] = useState(new Date().toISOString().split('T')[0])
  const [feedingTime, setFeedingTime] = useState(new Date().toTimeString().slice(0, 5))
  const [feedingMode, setFeedingMode] = useState<'individual' | 'batch'>('individual')
  const [appetiteScore, setAppetiteScore] = useState<number | null>(null)
  const [wasteKg, setWasteKg] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

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

  const handleRemoveFeed = (feedId: string) => {
    setFeeds(feeds.filter(f => f.id !== feedId))
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

  const handleSubmit = async () => {
    if (feeds.length === 0) {
      setError('Please add at least one feed to this session')
      return
    }

    if (!feeds.every(f => f.feed_type_id && f.quantity_kg > 0)) {
      setError('All feeds must have a type and quantity greater than 0')
      return
    }

    try {
      const sessionData = {
        animalId,
        farmId,
        feedingDate,
        feedingTime,
        feedingMode,
        feeds: feeds.map(f => ({
          feedTypeId: f.feed_type_id,
          quantityKg: f.quantity_kg,
          costPerKg: f.cost_per_kg,
          notes: f.notes
        })),
        observations: {
          appetiteScore,
          wasteKg: wasteKg ? Number(wasteKg) : null,
          notes
        }
      }

      await onSubmit(sessionData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feeding session')
    }
  }

  return (
    <div className="space-y-6">
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
          {(['individual', 'batch'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setFeedingMode(mode)}
              className={cn(
                'flex-1 p-3 border rounded-lg transition-colors',
                feedingMode === mode
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <span className="font-medium capitalize">{mode}</span>
              <p className="text-xs text-gray-500 mt-1">
                {mode === 'individual' ? 'Track per animal' : 'Track as group'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Feed Section */}
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
                <div key={feed.id} className="p-4 border rounded-lg space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Feed {index + 1}</span>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Feed Type *</Label>
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
                      <Label className="text-xs">Quantity (kg) *</Label>
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
                      <Label className="text-xs">Cost per kg ($)</Label>
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
                      <Label className="text-xs">Total Cost</Label>
                      <Input
                        type="text"
                        value={`$${(feed.quantity_kg * feed.cost_per_kg).toFixed(2)}`}
                        disabled
                        className="mt-1 bg-gray-100"
                      />
                    </div>
                  </div>

                  {feed.notes && (
                    <div className="pt-2">
                      <Label className="text-xs">Note</Label>
                      <Input
                        type="text"
                        value={feed.notes}
                        onChange={(e) => handleFeedChange(feed.id, 'notes', e.target.value)}
                        placeholder="Feed specific observations"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
              <p className="text-sm font-medium text-blue-900">Session Cost: ${calculations.totalCost.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Animal Observations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Appetite Score (1-5)</Label>
            <div className="flex gap-2 mt-2">
              {[1, 2, 3, 4, 5].map(score => (
                <button
                  key={score}
                  onClick={() => setAppetiteScore(score)}
                  className={cn(
                    'flex-1 py-2 px-3 rounded border font-medium transition-colors',
                    appetiteScore === score
                      ? 'border-green-500 bg-green-100 text-green-800'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="waste_kg">Approximate Waste (kg)</Label>
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
          </div>

          <div>
            <Label htmlFor="notes">General Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations or issues during feeding..."
              rows={3}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

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
