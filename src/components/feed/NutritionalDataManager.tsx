// src/components/settings/feeds/NutritionalDataManager.tsx

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertCircle, Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/Alert'

interface FeedType {
  id: string
  name: string
  description?: string
  category_id?: string
  nutritional_info?: {
    dry_matter_percent?: number
    crude_protein_percent?: number
    crude_fiber_percent?: number
    crude_fat_percent?: number
    ash_percent?: number
    energy_mcal_per_kg?: number
    energy_mj_per_kg?: number
    calcium_percent?: number
    phosphorus_percent?: number
    notes?: string
  }
}

interface NutritionalDataManagerProps {
  farmId: string
  feedTypes: FeedType[]
  canEdit?: boolean
  onUpdate?: (feedId: string, nutritionData: any) => Promise<void>
}

export function NutritionalDataManager({
  farmId,
  feedTypes: initialFeedTypes,
  canEdit = true,
  onUpdate
}: NutritionalDataManagerProps) {
  const [feedTypes, setFeedTypes] = useState<FeedType[]>(initialFeedTypes)
  const [editingFeedId, setEditingFeedId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const feedsWithoutNutrition = feedTypes.filter(f => !f.nutritional_info || Object.keys(f.nutritional_info).length === 0)
  const feedsWithNutrition = feedTypes.filter(f => f.nutritional_info && Object.keys(f.nutritional_info).length > 0)

  function startEdit(feedType: FeedType) {
    setEditingFeedId(feedType.id)
    setEditData({
      feed_id: feedType.id,
      feed_name: feedType.name,
      dry_matter_percent: feedType.nutritional_info?.dry_matter_percent || '',
      crude_protein_percent: feedType.nutritional_info?.crude_protein_percent || '',
      crude_fiber_percent: feedType.nutritional_info?.crude_fiber_percent || '',
      crude_fat_percent: feedType.nutritional_info?.crude_fat_percent || '',
      ash_percent: feedType.nutritional_info?.ash_percent || '',
      energy_mj_per_kg: feedType.nutritional_info?.energy_mj_per_kg || '',
      calcium_percent: feedType.nutritional_info?.calcium_percent || '',
      phosphorus_percent: feedType.nutritional_info?.phosphorus_percent || '',
      notes: feedType.nutritional_info?.notes || ''
    })
  }

  function cancelEdit() {
    setEditingFeedId(null)
    setEditData(null)
  }

  async function saveNutritionData() {
    try {
      setIsLoading(true)
      setMessage(null)

      // Client-side validation
      if (!editData.dry_matter_percent && !editData.crude_protein_percent) {
        setMessage({ type: 'error', text: 'Please enter at least dry matter or protein content' })
        return
      }

      // Convert string inputs to numbers, handling empty values
      const nutritionData = {
        dry_matter_percent: editData.dry_matter_percent ? parseFloat(editData.dry_matter_percent) : undefined,
        crude_protein_percent: editData.crude_protein_percent ? parseFloat(editData.crude_protein_percent) : undefined,
        crude_fiber_percent: editData.crude_fiber_percent ? parseFloat(editData.crude_fiber_percent) : undefined,
        crude_fat_percent: editData.crude_fat_percent ? parseFloat(editData.crude_fat_percent) : undefined,
        ash_percent: editData.ash_percent ? parseFloat(editData.ash_percent) : undefined,
        energy_mj_per_kg: editData.energy_mj_per_kg ? parseFloat(editData.energy_mj_per_kg) : undefined,
        calcium_percent: editData.calcium_percent ? parseFloat(editData.calcium_percent) : undefined,
        phosphorus_percent: editData.phosphorus_percent ? parseFloat(editData.phosphorus_percent) : undefined,
        notes: editData.notes || undefined
      }

      if (onUpdate) {
        await onUpdate(editingFeedId!, nutritionData)
      } else {
        // Fallback: update via API
        const response = await fetch(`/api/farms/${farmId}/feed-types/${editingFeedId}/nutrition`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nutritionData)
        })

        if (!response.ok) throw new Error('Failed to update nutrition data')
      }

      // Update local state
      setFeedTypes(feedTypes.map(f =>
        f.id === editingFeedId
          ? { ...f, nutritional_info: nutritionData }
          : f
      ))

      setMessage({ type: 'success', text: 'Nutritional data saved successfully' })
      setEditingFeedId(null)
      setEditData(null)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save nutrition data'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertCircle className={`h-4 w-4 ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`} />
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-green-600">{feedsWithNutrition.length}</div>
            <p className="text-sm text-gray-600">Feeds with Data</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-amber-600">{feedsWithoutNutrition.length}</div>
            <p className="text-sm text-gray-600">Incomplete</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-blue-600">{feedTypes.length}</div>
            <p className="text-sm text-gray-600">Total Feeds</p>
          </CardContent>
        </Card>
      </div>

      {/* Feeds with Incomplete Data */}
      {feedsWithoutNutrition.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>{feedsWithoutNutrition.length} feed(s)</strong> are missing nutritional data. 
            Add basic information like dry matter or protein to enable smart recommendations.
          </AlertDescription>
        </Alert>
      )}

      {/* Feeds with Nutrition Data */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Feeds with Nutritional Data</h3>
        {feedsWithNutrition.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-gray-500">No nutritional data added yet</p>
            <p className="text-sm text-gray-400">Start by editing feeds below</p>
          </Card>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {feedsWithNutrition.map(feed => (
              <Card key={feed.id} className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{feed.name}</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {feed.nutritional_info?.crude_protein_percent && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                            {feed.nutritional_info.crude_protein_percent}% Protein
                          </Badge>
                        )}
                        {feed.nutritional_info?.dry_matter_percent && (
                          <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                            {feed.nutritional_info.dry_matter_percent}% DM
                          </Badge>
                        )}
                        {feed.nutritional_info?.energy_mj_per_kg && (
                          <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                            {feed.nutritional_info.energy_mj_per_kg} MJ/kg
                          </Badge>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(feed)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Form */}
      {editingFeedId && editData && (
        <Card className="border-blue-200 bg-blue-50 p-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-lg">Edit Nutritional Data: {editData.feed_name}</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelEdit}
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Primary Nutrients */}
            <div className="bg-white p-4 rounded-lg border border-blue-200 space-y-3">
              <h5 className="font-medium text-blue-900">Primary Nutrients</h5>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dry_matter">Dry Matter %</Label>
                  <Input
                    id="dry_matter"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editData.dry_matter_percent}
                    onChange={(e) => setEditData({ ...editData, dry_matter_percent: e.target.value })}
                    placeholder="e.g., 85"
                  />
                  <p className="text-xs text-gray-500 mt-1">For forage typically 20-50%, concentrates 85-90%</p>
                </div>

                <div>
                  <Label htmlFor="crude_protein">Crude Protein %</Label>
                  <Input
                    id="crude_protein"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editData.crude_protein_percent}
                    onChange={(e) => setEditData({ ...editData, crude_protein_percent: e.target.value })}
                    placeholder="e.g., 12"
                  />
                  <p className="text-xs text-gray-500 mt-1">Typical range 5-45% depending on feed</p>
                </div>

                <div>
                  <Label htmlFor="crude_fiber">Crude Fiber %</Label>
                  <Input
                    id="crude_fiber"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editData.crude_fiber_percent}
                    onChange={(e) => setEditData({ ...editData, crude_fiber_percent: e.target.value })}
                    placeholder="e.g., 18"
                  />
                  <p className="text-xs text-gray-500 mt-1">Important for ruminant digestion</p>
                </div>

                <div>
                  <Label htmlFor="energy">Energy (MJ/kg)</Label>
                  <Input
                    id="energy"
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={editData.energy_mj_per_kg}
                    onChange={(e) => setEditData({ ...editData, energy_mj_per_kg: e.target.value })}
                    placeholder="e.g., 8.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Forage ~7-9 MJ/kg, concentrates 10-14 MJ/kg</p>
                </div>
              </div>
            </div>

            {/* Minerals & Other Nutrients */}
            <div className="bg-white p-4 rounded-lg border border-blue-200 space-y-3">
              <h5 className="font-medium text-blue-900">Minerals & Other Nutrients</h5>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="crude_fat">Crude Fat %</Label>
                  <Input
                    id="crude_fat"
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={editData.crude_fat_percent}
                    onChange={(e) => setEditData({ ...editData, crude_fat_percent: e.target.value })}
                    placeholder="e.g., 4"
                  />
                </div>

                <div>
                  <Label htmlFor="ash">Ash %</Label>
                  <Input
                    id="ash"
                    type="number"
                    step="0.1"
                    min="0"
                    max="30"
                    value={editData.ash_percent}
                    onChange={(e) => setEditData({ ...editData, ash_percent: e.target.value })}
                    placeholder="e.g., 8"
                  />
                </div>

                <div>
                  <Label htmlFor="calcium">Calcium %</Label>
                  <Input
                    id="calcium"
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editData.calcium_percent}
                    onChange={(e) => setEditData({ ...editData, calcium_percent: e.target.value })}
                    placeholder="e.g., 0.8"
                  />
                </div>

                <div>
                  <Label htmlFor="phosphorus">Phosphorus %</Label>
                  <Input
                    id="phosphorus"
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editData.phosphorus_percent}
                    onChange={(e) => setEditData({ ...editData, phosphorus_percent: e.target.value })}
                    placeholder="e.g., 0.4"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                placeholder="e.g., Dry hay, good for late lactation"
                rows={2}
                className="w-full mt-2 p-2 border rounded text-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={cancelEdit}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={saveNutritionData}
                disabled={isLoading}
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Nutrition Data'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Feeds Missing Data */}
      {feedsWithoutNutrition.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Add Nutritional Data</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {feedsWithoutNutrition.map(feed => (
              <Card key={feed.id} className="bg-amber-50 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold">{feed.name}</h4>
                      {feed.description && (
                        <p className="text-sm text-gray-600">{feed.description}</p>
                      )}
                    </div>
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(feed)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Data
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
