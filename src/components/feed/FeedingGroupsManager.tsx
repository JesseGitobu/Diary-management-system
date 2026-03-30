'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import {
  Leaf,
  Users,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// Feeding characteristics that define a feeding group
const FEEDING_CHARACTERISTICS = [
  'high_concentrate',
  'dry_cow_ration',
  'heifer_ration',
  'high_forage',
  'steaming_feed_ration',
  'bull_feed_ration',
  'calf_feed_ration'
]

interface AnimalCategory {
  id: string
  name: string
  matching_animals_count?: number
  assigned_animals_count?: number
  characteristics?: Record<string, any>
}

interface FeedingGroup {
  category_id: string
  category_name: string
  animal_count: number
  characteristics?: Record<string, boolean>
}

interface AnimalInGroup {
  id: string
  tag_number: string
  name: string | null
  breed: string | null
  gender: string | null
  production_status: string | null
  status: string
}

interface FeedingGroupsManagerProps {
  farmId: string
  animals: any[]
  onClose?: () => void
  isMobile?: boolean
}

export function FeedingGroupsManager({
  farmId,
  animals,
  onClose,
  isMobile = false
}: FeedingGroupsManagerProps) {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<AnimalCategory[]>([])
  const [feedingGroups, setFeedingGroups] = useState<FeedingGroup[]>([])
  const [availableCategories, setAvailableCategories] = useState<AnimalCategory[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [groupAnimals, setGroupAnimals] = useState<Record<string, AnimalInGroup[]>>({})
  const [loadingGroupId, setLoadingGroupId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [farmId])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch animal categories
      const categoriesResponse = await fetch(`/api/farms/${farmId}/feed-management/animal-categories`)
      if (!categoriesResponse.ok) throw new Error('Failed to fetch categories')
      const categoriesData = await categoriesResponse.json()
      
      console.log('📊 All categories fetched:', categoriesData.data)
      
      // Fetch existing feeding groups
      const groupsResponse = await fetch(`/api/farms/${farmId}/production/feeding-groups`)
      let groupsData: FeedingGroup[] = []
      
      if (groupsResponse.ok) {
        const result = await groupsResponse.json()
        groupsData = result.data || []
      }

      console.log('🌾 Current feeding groups:', groupsData)

      // Filter categories that have ANY feeding characteristics (including mixed patterns)
      const categoriesWithFeeding = (categoriesData.data || []).filter(
        (cat: AnimalCategory) => {
          if (!cat.characteristics) return false
          // Check if any feeding characteristic is true
          return FEEDING_CHARACTERISTICS.some(
            (feedChar) => cat.characteristics?.[feedChar] === true
          )
        }
      )

      console.log('🍽️ Categories with feeding characteristics:', categoriesWithFeeding)

      // Get categories not yet in groups
      const groupedCategoryIds = groupsData.map(g => g.category_id)
      const available = categoriesWithFeeding.filter(
        (cat: AnimalCategory) => !groupedCategoryIds.includes(cat.id)
      )

      console.log('✅ Available categories to add:', available)

      setCategories(categoriesWithFeeding)
      setFeedingGroups(groupsData)
      setAvailableCategories(available)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      console.error('Error fetching feeding groups data:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleGroupExpanded = async (groupId: string) => {
    const isCurrentlyExpanded = expandedGroups.has(groupId)
    
    if (!isCurrentlyExpanded) {
      // Fetch animals for this group if not already loaded
      if (!groupAnimals[groupId]) {
        setLoadingGroupId(groupId)
        try {
          console.log(`📡 Fetching animals for group ${groupId}...`)
          const response = await fetch(
            `/api/farms/${farmId}/feed-management/animal-categories/${groupId}/matching-animals?limit=100`
          )
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error(`❌ Failed to fetch animals: ${response.status}`, errorData)
            setError(`Failed to load animals: ${errorData.error || response.statusText}`)
            setLoadingGroupId(null)
            return
          }
          
          const result = await response.json()
          console.log(`📦 API Response received:`, result)
          
          // Extract animals array from response
          const animalsData = Array.isArray(result.data) ? result.data : []
          console.log(`✅ Fetched ${animalsData.length} animals for group ${groupId}`)
          
          setGroupAnimals(prev => ({
            ...prev,
            [groupId]: animalsData
          }))
        } catch (error) {
          console.error('❌ Error fetching animals for group:', error)
          setError(`Error loading animals: ${error instanceof Error ? error.message : 'Unknown error'}`)
        } finally {
          setLoadingGroupId(null)
        }
      }
      
      // Expand the group
      setExpandedGroups(prev => new Set([...prev, groupId]))
    } else {
      // Collapse the group
      setExpandedGroups(prev => {
        const newSet = new Set(prev)
        newSet.delete(groupId)
        return newSet
      })
    }
  }

  const handleAddGroup = async (categoryId: string) => {
    try {
      const category = categories.find(c => c.id === categoryId)
      if (!category) return

      const newGroup: FeedingGroup = {
        category_id: categoryId,
        category_name: category.name,
        animal_count: category.assigned_animals_count || 0,
        characteristics: category.characteristics
      }

      const response = await fetch(`/api/farms/${farmId}/production/feeding-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup)
      })

      if (!response.ok) throw new Error('Failed to add group')

      // Update local state
      setFeedingGroups([...feedingGroups, newGroup])
      setAvailableCategories(availableCategories.filter(c => c.id !== categoryId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add group')
    }
  }

  const handleRemoveGroup = async (categoryId: string) => {
    try {
      const response = await fetch(
        `/api/farms/${farmId}/production/feeding-groups/${categoryId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Failed to remove group')

      const removed = feedingGroups.find(g => g.category_id === categoryId)
      setFeedingGroups(feedingGroups.filter(g => g.category_id !== categoryId))
      
      if (removed) {
        setAvailableCategories([
          ...availableCategories,
          categories.find(c => c.id === categoryId)!
        ].sort((a, b) => (a.name || '').localeCompare(b.name || '')))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove group')
    }
  }

  const getFeedingCharacteristics = (characteristics?: Record<string, boolean>): string[] => {
    if (!characteristics) return []
    return FEEDING_CHARACTERISTICS
      .filter(feedChar => characteristics[feedChar] === true)
      .map(feedChar => {
        // Format key to readable label
        return feedChar
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', isMobile ? 'px-4' : '')}>
      {/* Header */}
      <div>
        <h2 className={cn('font-bold text-gray-900 mb-2', isMobile ? 'text-xl' : 'text-2xl')}>
          Manage Feeding Groups
        </h2>
        <p className="text-gray-600">
          Organize animals into feeding groups based on their nutritional requirements for efficient farm management.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Active Feeding Groups */}
      <div>
        <h3 className={cn('font-semibold text-gray-900 mb-3', isMobile ? 'text-lg' : 'text-xl')}>
          Active Feeding Groups
        </h3>
        
        {feedingGroups.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center space-x-2 text-gray-500">
                <AlertCircle className="w-5 h-5" />
                <p>No feeding groups configured yet. Add a group below to get started.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className={cn(
            'grid gap-4',
            isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
          )}>
            {feedingGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.category_id)
              const groupAnimalsData = groupAnimals[group.category_id] || []
              const feedingChars = getFeedingCharacteristics(group.characteristics)

              return (
                <Card key={group.category_id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className={isMobile ? 'text-lg' : 'text-xl'}>
                          {group.category_name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {feedingChars.length > 0 ? feedingChars.join(', ') : 'No feeding characteristics'}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveGroup(group.category_id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Animal Count */}
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <Users className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{group.animal_count} Animals</p>
                        <p className="text-xs text-gray-600">In this feeding group</p>
                      </div>
                    </div>

                    {/* Feeding Characteristics */}
                    {feedingChars.length > 0 && (
                      <div className="space-y-2 p-3 bg-amber-50 rounded-lg">
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <Leaf className="w-4 h-4 text-amber-600" />
                          Diet Requirements
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {feedingChars.map((char) => (
                            <Badge key={char} variant="secondary" className="text-xs">
                              {char}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expandable Animals List */}
                    <div className="border-t border-gray-200 pt-4">
                      <button
                        onClick={() => toggleGroupExpanded(group.category_id)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <span className="text-sm font-semibold text-gray-700">
                          {isExpanded ? 'Hide' : 'Show'} Animals
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                          {loadingGroupId === group.category_id ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            </div>
                          ) : groupAnimalsData.length > 0 ? (
                            groupAnimalsData.map((animal, index) => (
                              <div key={animal.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-gray-900">
                                      {animal.name || `#${animal.tag_number}`}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      Tag: {animal.tag_number} • Breed: {animal.breed || 'N/A'}
                                    </p>
                                    {animal.production_status && (
                                      <Badge variant="outline" className="mt-2 text-xs">
                                        {animal.production_status.replace(/_/g, ' ')}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No animals in this group
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Add New Group */}
      <div>
        <h3 className={cn('font-semibold text-gray-900 mb-3', isMobile ? 'text-lg' : 'text-xl')}>
          Available Categories to Add
        </h3>

        {availableCategories.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">No categories available</p>
                    {categories.length === 0 ? (
                      <p className="text-sm text-gray-600 mt-1">
                        No animal categories with feeding characteristics have been configured yet.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">
                        All categories with feeding characteristics are already in active groups.
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
                  <p><strong>How to set up:</strong></p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to Animal Categories Manager</li>
                    <li>Create or edit a category</li>
                    <li>In the "Feeding Characteristics" section, select diet requirements</li>
                    <li>Save the category</li>
                    <li>Return here to add it to a feeding group</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className={cn(
            'grid gap-3',
            isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
          )}>
            {availableCategories.map((category) => {
              const feedingChars = getFeedingCharacteristics(category.characteristics)

              return (
                <Card key={category.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold text-gray-900">{category.name}</h4>
                        {feedingChars.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {feedingChars.map((char) => (
                              <Badge key={char} variant="secondary" className="text-xs">
                                {char}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-600 pt-2">
                          {category.matching_animals_count || 0} matching animals
                        </p>
                      </div>
                      <Button
                        onClick={() => handleAddGroup(category.id)}
                        size="sm"
                        className="ml-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
