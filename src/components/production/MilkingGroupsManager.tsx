'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import {
  Clock,
  Users,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface MilkingSchedule {
  id: string
  name: string
  frequency: number
  times: string[]
}

interface AnimalCategory {
  id: string
  name: string
  matching_animals_count?: number
  assigned_animals_count?: number
  characteristics?: {
    milking_schedules?: MilkingSchedule[]
    selected_milking_schedule_id?: string
  }
}

interface MilkingGroup {
  category_id: string
  category_name: string
  animal_count: number
  milking_schedules?: MilkingSchedule[]
  selected_schedule_id?: string
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

interface MilkingGroupsManagerProps {
  farmId: string
  animals: any[]
  onClose?: () => void
  isMobile?: boolean
}

export function MilkingGroupsManager({
  farmId,
  animals,
  onClose,
  isMobile: isMobileProp = false
}: MilkingGroupsManagerProps) {
  const { isMobile: isMobileDevice, isTablet } = useDeviceInfo()
  const isMobile = isMobileDevice || isMobileProp
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<AnimalCategory[]>([])
  const [milkingGroups, setMilkingGroups] = useState<MilkingGroup[]>([])
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
      
      // Fetch existing milking groups
      const groupsResponse = await fetch(`/api/farms/${farmId}/production/milking-groups`)
      let groupsData: MilkingGroup[] = []

      if (groupsResponse.ok) {
        const result = await groupsResponse.json()
        groupsData = result.data || []
      }

      // All categories are eligible as milking groups (no milking-schedule requirement)
      const allCategories: AnimalCategory[] = categoriesData.data || []

      // Get categories not yet added as milking groups
      const groupedCategoryIds = groupsData.map(g => g.category_id)
      const available = allCategories.filter(
        (cat: AnimalCategory) => !groupedCategoryIds.includes(cat.id)
      )

      setCategories(allCategories)
      setMilkingGroups(groupsData)
      setAvailableCategories(available)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      console.error('Error fetching milking groups data:', err)
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
          const animals = Array.isArray(result.data) ? result.data : []
          console.log(`✅ Fetched ${animals.length} animals for group ${groupId}`)
          
          setGroupAnimals(prev => ({
            ...prev,
            [groupId]: animals
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

      const newGroup: MilkingGroup = {
        category_id: categoryId,
        category_name: category.name,
        animal_count: category.assigned_animals_count || 0,
        milking_schedules: category.characteristics?.milking_schedules,
        selected_schedule_id: category.characteristics?.selected_milking_schedule_id
      }

      const response = await fetch(`/api/farms/${farmId}/production/milking-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup)
      })

      if (!response.ok) throw new Error('Failed to add group')

      // Update local state
      setMilkingGroups([...milkingGroups, newGroup])
      setAvailableCategories(availableCategories.filter(c => c.id !== categoryId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add group')
    }
  }

  const handleRemoveGroup = async (categoryId: string) => {
    try {
      const response = await fetch(
        `/api/farms/${farmId}/production/milking-groups/${categoryId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Failed to remove group')

      const removed = milkingGroups.find(g => g.category_id === categoryId)
      setMilkingGroups(milkingGroups.filter(g => g.category_id !== categoryId))
      
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
          Manage Milking Groups
        </h2>
        <p className="text-gray-600">
          Organize animals into milking groups based on their schedules for efficient farm management.
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

      {/* Active Milking Groups */}
      <div>
        <h3 className={cn('font-semibold text-gray-900 mb-3', isMobile ? 'text-lg' : 'text-xl')}>
          Active Milking Groups
        </h3>
        
        {milkingGroups.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center space-x-2 text-gray-500">
                <AlertCircle className="w-5 h-5" />
                <p>No milking groups configured yet. Add a group below to get started.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className={cn(
            'grid gap-4',
            isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
          )}>
            {milkingGroups.map((group) => {
              const schedule = group.milking_schedules?.find(
                s => s.id === group.selected_schedule_id
              )
              const isExpanded = expandedGroups.has(group.category_id)
              const animals = groupAnimals[group.category_id] || []

              return (
                <Card key={group.category_id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className={isMobile ? 'text-lg' : 'text-xl'}>
                          {group.category_name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Milking group & schedule
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
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Animals in Group</p>
                        <p className="text-2xl font-bold text-blue-600">{group.animal_count}</p>
                      </div>
                    </div>

                    {/* Milking Schedule */}
                    {schedule ? (
                      <div className="space-y-3 p-3 bg-amber-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-amber-600" />
                          <span className="font-semibold text-gray-900">{schedule.name}</span>
                        </div>

                        {/* Frequency Badge */}
                        <Badge className="bg-amber-100 text-amber-800 w-fit">
                          {schedule.frequency}x Daily
                        </Badge>

                        {/* Milking Times */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Milking Times:</p>
                          <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {schedule.times.map((time, idx) => (
                              <div
                                key={idx}
                                className="flex items-center space-x-2 p-2 bg-white rounded border border-amber-200"
                              >
                                <Clock className="w-4 h-4 text-amber-600" />
                                <span className="font-mono font-semibold text-gray-900">{time}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Milking Order Placeholder */}
                        <div className="pt-2 border-t border-amber-200">
                          <p className="text-xs text-gray-600 flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Milking order will be generated automatically during session</span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">No schedule assigned</p>
                      </div>
                    )}

                    {/* Expandable Animals List */}
                    <div className="border-t border-gray-200 pt-4">
                      <button
                        onClick={() => toggleGroupExpanded(group.category_id)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <span className="font-semibold text-gray-900 text-sm">
                          Animals in Group ({animals.length || group.animal_count})
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </button>

                      {/* Animals List - Collapsible */}
                      {isExpanded && (
                        <div className="mt-3 border border-gray-200 rounded-lg bg-gray-50">
                          {loadingGroupId === group.category_id ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                Loading animals...
                              </div>
                            </div>
                          ) : animals.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              No animals match this category
                            </div>
                          ) : (
                            <div className={`overflow-y-auto ${isMobile ? 'max-h-48' : 'max-h-60'}`}>
                              <div className="space-y-1">
                                {animals.map((animal) => (
                                  <div
                                    key={animal.id}
                                    className="flex items-center justify-between p-3 bg-white border-b border-gray-200 hover:bg-blue-50 transition-colors last:border-b-0"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-mono font-bold text-gray-900 text-sm">
                                          #{animal.tag_number}
                                        </span>
                                        {animal.name && (
                                          <span className="text-gray-600 text-sm truncate">
                                            {animal.name}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2 mt-1">
                                        {animal.breed && (
                                          <span className="text-xs text-gray-500">{animal.breed}</span>
                                        )}
                                        {animal.production_status && (
                                          <Badge variant="outline" className="text-xs h-fit">
                                            {animal.production_status.replace(/_/g, ' ')}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    {animal.gender && (
                                      <span className="text-xs text-gray-500 ml-2">
                                        {animal.gender === 'female' ? '♀' : '♂'}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
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
                        You haven't created any animal categories yet. Create some categories first in the Animal Categories Manager.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 mt-1">
                        All your categories are already active as milking groups.
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
                  <p><strong>How to set up:</strong></p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to Animal Categories Manager</li>
                    <li>Create or edit a category</li>
                    <li>Return here to add it as a milking group</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className={cn(
            'grid gap-3',
            isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
          )}>
            {availableCategories.map((category) => {
              const schedule = category.characteristics?.milking_schedules?.[0]

              return (
                <Card key={category.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold text-gray-900">{category.name}</h4>
                        {schedule && (
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{schedule.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {schedule.frequency}x
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 pt-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {category.assigned_animals_count || 0} animals
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleAddGroup(category.id)}
                        size="sm"
                        className="ml-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {isMobile ? '' : 'Add'}
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
