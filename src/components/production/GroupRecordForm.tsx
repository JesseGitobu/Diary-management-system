'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { IndividualRecordForm } from './IndividualRecordForm'
import { ProductionSettings } from '@/types/production-distribution-settings'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface AnimalRecord {
  id: string
  tag_number: string
  name?: string | null
  gender: string
  production_status: string
  breed?: string | null
}

interface MilkingGroup {
  id: string
  category_id: string
  category_name: string
  animal_count: number
  animals?: AnimalRecord[]
}

interface GroupRecordFormProps {
  farmId: string
  animals: Array<{ 
    id: string
    tag_number: string
    name?: string
    gender: string
    production_status: string 
  }>
  session: string
  sessionId?: string
  recordDate: string
  settings: ProductionSettings | null
  onSuccess?: () => void
  sessionName?: string
}

export function GroupRecordForm({
  farmId,
  animals,
  session,
  sessionId,
  recordDate,
  settings,
  onSuccess,
  sessionName,
}: GroupRecordFormProps) {
  const { isMobile } = useDeviceInfo()
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null)
  const [recordedAnimalIds, setRecordedAnimalIds] = useState<Set<string>>(new Set())
  const [sessionRecordedByGroup, setSessionRecordedByGroup] = useState<Record<string, Set<string>>>({})
  const [preRecordedAnimalIds, setPreRecordedAnimalIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [milkingGroups, setMilkingGroups] = useState<MilkingGroup[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Reset form state when date or session changes
  useEffect(() => {
    console.log(`[GroupRecordForm] Date/Session changed - recordDate: ${recordDate}, session: ${session}`)
    // Clear current session state - but sessionRecordedByGroup persists for group list
    setSelectedGroupId(null)
    setSelectedAnimalId(null)
    setRecordedAnimalIds(new Set())
    setSearchQuery('')
  }, [recordDate, session])

  // Fetch already-recorded animals for this date and session
  useEffect(() => {
    const fetchPreRecordedAnimals = async () => {
      try {
        console.log(`[GroupRecordForm] Fetching pre-recorded animals for date: ${recordDate}, session: ${session}`)
        // Note: API filters by date only (start_date=end_date). Session filtering will be done in-app
        const response = await fetch(
          `/api/production?start_date=${recordDate}&end_date=${recordDate}`
        )
        
        console.log(`[GroupRecordForm] Fetch response status: ${response.status}`)
        
        if (response.ok) {
          const result = await response.json()
          console.log(`[GroupRecordForm] Pre-recorded animals result:`, result)
          const records = Array.isArray(result.data) ? result.data : []
          
          // Filter by session since API doesn't support that parameter
          const sessionFilteredRecords = records.filter((r: any) => r.milking_session_id === session)
          console.log(`[GroupRecordForm] Filtered to session "${session}": ${sessionFilteredRecords.length} pre-recorded animals`)
          
          const preRecordedIds = new Set<string>(sessionFilteredRecords.map((r: any) => r.animal_id))
          console.log(`[GroupRecordForm] Pre-recorded animal IDs:`, Array.from(preRecordedIds))
          setPreRecordedAnimalIds(preRecordedIds)
        } else {
          console.error(`[GroupRecordForm] Fetch failed with status ${response.status}`)
          setPreRecordedAnimalIds(new Set())
        }
      } catch (err) {
        console.error('[GroupRecordForm] Error fetching pre-recorded animals:', err)
        // Don't fail silently - just continue
        setPreRecordedAnimalIds(new Set())
      }
    }

    fetchPreRecordedAnimals()
  }, [recordDate, session])

  // Fetch milking groups data
  useEffect(() => {
    const fetchMilkingGroups = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch configured milking groups
        const response = await fetch(`/api/farms/${farmId}/production/milking-groups`)
        if (!response.ok) throw new Error('Failed to fetch milking groups')
        
        const result = await response.json()
        const groups: MilkingGroup[] = result.data || []

        // For each group, fetch its animals
        const groupsWithAnimals = await Promise.all(
          groups.map(async (group) => {
            try {
              const animalsResponse = await fetch(
                `/api/farms/${farmId}/feed-management/animal-categories/${group.category_id}/matching-animals?limit=1000`
              )
              
              if (animalsResponse.ok) {
                const animalsData = await animalsResponse.json()
                const groupAnimals = Array.isArray(animalsData.data) ? animalsData.data : []
                
                // Filter animals based on production settings
                let filteredAnimals = groupAnimals
                if (settings) {
                  const eligibleStatuses = settings.eligibleProductionStatuses || ['lactating']
                  filteredAnimals = filteredAnimals.filter((a: AnimalRecord) => 
                    eligibleStatuses.includes(a.production_status)
                  )
                  
                  if (settings.eligibleGenders && settings.eligibleGenders.length > 0) {
                    filteredAnimals = filteredAnimals.filter((a: AnimalRecord) => 
                      settings.eligibleGenders?.includes(a.gender) ?? true
                    )
                  }
                }
                
                return {
                  ...group,
                  animals: filteredAnimals
                }
              }
              
              return group
            } catch (err) {
              console.error(`Error fetching animals for group ${group.category_id}:`, err)
              return group
            }
          })
        )

        setMilkingGroups(groupsWithAnimals)
      } catch (err) {
        console.error('Error fetching milking groups:', err)
        setError(err instanceof Error ? err.message : 'Failed to load milking groups')
      } finally {
        setLoading(false)
      }
    }

    fetchMilkingGroups()
  }, [farmId, settings])

  // Fallback: if no milking groups, create one from available animals
  const groups = useMemo(() => {
    if (milkingGroups.length > 0) {
      return milkingGroups.map(g => ({
        id: g.id,
        name: g.category_name,
        description: `${g.animals?.length || 0} animals in this group`,
        animals: g.animals || []
      }))
    }

    // Fallback to eligible animals if no groups configured
    const baseAnimals = animals.filter(a => a.gender === 'female')
    let eligibleAnimals = baseAnimals as AnimalRecord[]
    
    if (settings) {
      const eligibleStatuses = settings.eligibleProductionStatuses || ['lactating']
      eligibleAnimals = eligibleAnimals.filter(a => eligibleStatuses.includes(a.production_status))
      
      if (settings.eligibleGenders && settings.eligibleGenders.length > 0) {
        eligibleAnimals = eligibleAnimals.filter(a => settings.eligibleGenders?.includes(a.gender) ?? true)
      }
    } else {
      eligibleAnimals = eligibleAnimals.filter(a => a.production_status === 'lactating')
    }
    
    return [
      {
        id: 'all_eligible',
        name: eligibleAnimals.length > 0 ? 'All Eligible Animals' : 'No Eligible Animals',
        description: settings ? 
          `Animals with status: ${settings.eligibleProductionStatuses?.join(', ') || 'lactating'}` :
          'All animals currently in lactation',
        animals: eligibleAnimals
      }
    ]
  }, [milkingGroups, animals, settings])

  const selectedGroup = useMemo(() => 
    groups.find(g => g.id === selectedGroupId),
    [groups, selectedGroupId]
  )

  // Animals in the selected group that haven't been recorded yet (exclude both current and pre-recorded)
  const pendingAnimals = useMemo(() => {
    if (!selectedGroup) return []
    const pending = selectedGroup.animals.filter(a => 
      !recordedAnimalIds.has(a.id) && !preRecordedAnimalIds.has(a.id)
    )
    console.log(`[GroupRecordForm] pendingAnimals computed:`, {
      groupId: selectedGroup.id,
      groupSize: selectedGroup.animals.length,
      preRecordedCount: preRecordedAnimalIds.size,
      currentRecordedCount: recordedAnimalIds.size,
      pendingCount: pending.length
    })
    return pending
  }, [selectedGroup, recordedAnimalIds, preRecordedAnimalIds])

  // Animals recorded in this session (both current and pre-recorded)
  const recordedAnimals = useMemo(() => {
    if (!selectedGroup) return []
    return selectedGroup.animals.filter(a => 
      recordedAnimalIds.has(a.id) || preRecordedAnimalIds.has(a.id)
    )
  }, [selectedGroup, recordedAnimalIds, preRecordedAnimalIds])

  // Total animals recorded (pre-recorded + currently recorded in this session)
  const totalRecordedCount = useMemo(() => {
    if (!selectedGroup) return 0
    return recordedAnimals.length
  }, [recordedAnimals])

  const progressPercentage = useMemo(() => {
    if (!selectedGroup || selectedGroup.animals.length === 0) return 0
    return Math.round((totalRecordedCount / selectedGroup.animals.length) * 100)
  }, [selectedGroup, totalRecordedCount])

  // Filter animals based on search query
  const filteredPendingAnimals = useMemo(() => {
    if (!searchQuery.trim()) return pendingAnimals
    
    const query = searchQuery.toLowerCase()
    return pendingAnimals.filter(animal => 
      animal.tag_number.toLowerCase().includes(query) ||
      (animal.name && animal.name.toLowerCase().includes(query))
    )
  }, [pendingAnimals, searchQuery])

  const handleRecordSuccess = () => {
    // This will be called when IndividualRecordForm successfully saves
    // We need to mark the current animal as recorded
    // This will be handled by the parent knowing which animal was just recorded
    if (onSuccess) {
      onSuccess()
    }
  }

  if (!selectedGroupId) {
    // Step 1: Show group selector
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select Group to Record</h3>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-2">
          {groups.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <p className="text-sm">No animal groups available</p>
            </div>
          ) : (
            groups.map(group => {
              // Count both pre-recorded and current session recorded animals (across all visits to this group)
              const preRecordedInGroup = group.animals.filter(a => preRecordedAnimalIds.has(a.id)).length
              const sessionRecordedInGroup = (sessionRecordedByGroup[group.id]?.size || 0)
              const totalRecordedInGroup = preRecordedInGroup + sessionRecordedInGroup
              const totalCount = group.animals.length
              const isComplete = totalRecordedInGroup === totalCount && totalCount > 0

              return (
                <button
                  key={group.id}
                  onClick={() => {
                    setSelectedGroupId(group.id)
                    setSelectedAnimalId(null)
                    setSearchQuery('')
                  }}
                  className="w-full flex items-start space-x-4 p-4 border border-stone-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {isComplete ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-stone-300 flex items-center justify-center">
                        <span className="text-xs font-semibold text-stone-600">{totalCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-stone-900">{group.name}</h4>
                    <p className="text-sm text-stone-600 mt-1">{group.description}</p>
                    <p className="text-xs text-stone-500 mt-2">
                      {totalRecordedInGroup} of {totalCount} animals recorded{preRecordedInGroup > 0 && ` (${preRecordedInGroup} from earlier)`}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className={`flex-shrink-0 ${isMobile ? 'w-20' : 'w-32'}`}>
                    <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${isComplete ? 'bg-green-600' : 'bg-blue-500'}`}
                        style={{ width: totalCount > 0 ? `${(totalRecordedInGroup / totalCount) * 100}%` : '0%' }}
                      />
                    </div>
                    <p className="text-xs text-stone-600 mt-1 text-right">
                      {totalCount > 0 ? Math.round((totalRecordedInGroup / totalCount) * 100) : 0}%
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // Step 2: Show animal selector if group is selected but not recording
  if (selectedGroupId && !selectedAnimalId) {
    if (!selectedGroup) return null

    return (
      <div className="space-y-4">
        {/* Back Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Don't clear sessionRecordedByGroup - it persists for group list display
            setSelectedGroupId(null)
            setRecordedAnimalIds(new Set())
          }}
        >
          ← Back to Groups
        </Button>

        <div>
          <h3 className="text-lg font-semibold mb-2">
            Select Animal from {selectedGroup.name}
          </h3>
          <p className="text-stone-600 text-sm mb-4">
            {pendingAnimals.length} remaining • {totalRecordedCount} already recorded
          </p>
          {preRecordedAnimalIds.size > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 mb-3">
              <p>ℹ️ <strong>{preRecordedAnimalIds.size} animal{preRecordedAnimalIds.size > 1 ? 's' : ''}</strong> {preRecordedAnimalIds.size > 1 ? 'have' : 'has'} already been recorded in this session and {preRecordedAnimalIds.size > 1 ? 'are' : 'is'} hidden from the list below.</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pb-4 border-b border-stone-200">
          <div className="h-3 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-stone-500">
            <span>{progressPercentage}% complete ({totalRecordedCount}/{selectedGroup.animals.length})</span>
            <span>{pendingAnimals.length} remaining</span>
          </div>
        </div>

        {/* Search Box */}
        <div className="pt-4">
          <input
            type="text"
            placeholder="Search animals by tag or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Animals List */}
        <div className={`space-y-2 overflow-y-auto border border-stone-200 rounded-lg p-2 ${isMobile ? 'max-h-64' : 'max-h-96'}`}>
          {filteredPendingAnimals.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <p className="text-sm">
                {searchQuery ? 'No animals match your search' : 'No pending animals'}
              </p>
            </div>
          ) : (
            filteredPendingAnimals.map((animal) => (
              <button
                key={animal.id}
                onClick={() => setSelectedAnimalId(animal.id)}
                className="w-full flex items-start justify-between p-4 bg-white border border-stone-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-stone-900">
                      #{animal.tag_number}
                    </span>
                    {animal.name && (
                      <span className="text-stone-600">
                        {animal.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-2 text-xs">
                    {animal.breed && (
                      <span className="text-stone-500">{animal.breed}</span>
                    )}
                    {animal.production_status && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {animal.production_status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
                {animal.gender && (
                  <span className="ml-2 text-stone-500">
                    {animal.gender === 'female' ? '♀' : '♂'}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  // Step 3: Recording form for selected animal
  if (!selectedGroup) return null

  // Find the selected animal
  const selectedAnimal = selectedGroup.animals.find(a => a.id === selectedAnimalId)
  
  // All animals recorded - success state
  if (recordedAnimals.length === selectedGroup.animals.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-600" />
        <h3 className="text-2xl font-bold text-stone-900">All Animals Recorded!</h3>
        <p className="text-stone-600 text-center max-w-sm">
          You've successfully recorded production data for all {selectedGroup.animals.length} animals in {selectedGroup.name}
        </p>
        <div className="flex space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              // Don't clear sessionRecordedByGroup - it persists for group list display
              setSelectedGroupId(null)
              setSelectedAnimalId(null)
              setRecordedAnimalIds(new Set())
              setSearchQuery('')
            }}
          >
            Record Another Group
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-900">Recording Progress</h3>
          <span className="text-sm font-medium text-stone-600">
            {recordedAnimals.length} of {selectedGroup.animals.length} animals
          </span>
        </div>
        <div className="h-3 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-600 transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-stone-500">
          <span>{progressPercentage}% complete</span>
          <span>{pendingAnimals.length} remaining</span>
        </div>
        {preRecordedAnimalIds.size > 0 && (
          <p className="text-xs text-blue-600 mt-1">
            ℹ️ {preRecordedAnimalIds.size} animal{preRecordedAnimalIds.size > 1 ? 's' : ''} already recorded in this session earlier
          </p>
        )}
      </div>

      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setSelectedAnimalId(null)
          setSearchQuery('')
        }}
      >
        ← Back to Animal Selection
      </Button>

      {/* Recording Form */}
      {selectedAnimal && (
        <div className="border border-stone-200 rounded-lg p-6 bg-white">
          <div className="mb-6 pb-4 border-b border-stone-200">
            <h4 className="text-lg font-semibold text-stone-900">
              Recording: {selectedAnimal.name || `Animal #${selectedAnimal.tag_number}`}
            </h4>
            <p className="text-sm text-stone-600 mt-1">
              Animal {pendingAnimals.indexOf(selectedAnimal) + 1} of {pendingAnimals.length + recordedAnimals.length}
            </p>
          </div>
          <IndividualRecordForm
            farmId={farmId}
            animals={[{
              id: selectedAnimal.id,
              tag_number: selectedAnimal.tag_number,
              name: selectedAnimal.name || undefined,
              gender: selectedAnimal.gender,
              production_status: selectedAnimal.production_status
            }]}
            session={session}
            sessionId={sessionId}
            recordDate={recordDate}
            settings={settings}
            sessionName={sessionName}
            closeAfterSuccess={false}
            recordingType="group"
            milkingGroupId={selectedGroupId || undefined}
            onRecordSaved={(animalId) => {
              // Mark animal as recorded in current session for this group
              const updated = new Set([...recordedAnimalIds, animalId])
              setRecordedAnimalIds(updated)
              
              // Also track in sessionRecordedByGroup so it persists when going back to group list
              if (selectedGroupId) {
                setSessionRecordedByGroup(prev => ({
                  ...prev,
                  [selectedGroupId]: new Set([...(prev[selectedGroupId] || new Set()), animalId])
                }))
              }
              
              // Check if there are more animals to record (excluding pre-recorded)
              const stillPending = selectedGroup.animals.filter(a => 
                !updated.has(a.id) && !preRecordedAnimalIds.has(a.id)
              )
              
              if (stillPending.length === 0) {
                // All animals recorded - trigger success screen
                setSelectedAnimalId(null)
                setSearchQuery('')
              } else {
                // Auto-advance to next pending animal
                console.log('[GroupRecordForm] Auto-advancing to next animal:', stillPending[0])
                setSelectedAnimalId(stillPending[0].id)
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
