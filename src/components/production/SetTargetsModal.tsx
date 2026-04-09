'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AlertCircle, Check } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'

interface Animal {
  id: string
  name: string
  tag_number: string
  group?: string
}

interface SetTargetsModalProps {
  isOpen: boolean
  onClose: () => void
  animals: Animal[]
  farmId: string
  isMobile?: boolean  // kept for backward compat; hook used internally
  onSuccess?: () => void
}

interface TargetData {
  targetType: 'animal' | 'group'
  entityId: string
  dailyTarget: number
  weeklyTarget: number
  unit: 'L' | 'kg'
}

export function SetTargetsModal({
  isOpen,
  onClose,
  animals,
  farmId,
  onSuccess
}: SetTargetsModalProps) {
  const { isMobile } = useDeviceInfo()
  const [targetType, setTargetType] = useState<'animal' | 'group'>('animal')
  const [selectedEntity, setSelectedEntity] = useState<string>('')
  const [dailyTarget, setDailyTarget] = useState<string>('')
  const [weeklyTarget, setWeeklyTarget] = useState<string>('')
  const [unit, setUnit] = useState<'L' | 'kg'>('L')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Extract unique groups from animals
  const groups = useMemo(() => {
    const uniqueGroups = new Set(
      animals
        .filter(a => a.group)
        .map(a => a.group)
    )
    return Array.from(uniqueGroups).sort()
  }, [animals])

  // Get animals for selected group
  const groupAnimals = useMemo(() => {
    if (targetType === 'group' && selectedEntity) {
      return animals.filter(a => a.group === selectedEntity)
    }
    return []
  }, [targetType, selectedEntity, animals])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedEntity || !dailyTarget || !weeklyTarget) {
      setMessage({ type: 'error', text: 'Please fill in all fields' })
      return
    }

    const dailyNum = parseFloat(dailyTarget)
    const weeklyNum = parseFloat(weeklyTarget)

    if (dailyNum <= 0 || weeklyNum <= 0) {
      setMessage({ type: 'error', text: 'Targets must be greater than 0' })
      return
    }

    if (weeklyNum < dailyNum * 7) {
      setMessage({ type: 'warning', text: 'Warning: Weekly target is less than daily target × 7' })
      // Allow to proceed with warning
    }

    setLoading(true)
    try {
      const response = await fetch('/api/production/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          targetType,
          entityId: selectedEntity,
          entityName: targetType === 'animal' 
            ? animals.find(a => a.id === selectedEntity)?.name
            : selectedEntity,
          dailyTarget: dailyNum,
          weeklyTarget: weeklyNum,
          unit
        })
      })

      if (response.ok) {
        setSubmitted(true)
        setMessage({ type: 'success', text: 'Target saved successfully!' })
        
        // Reset form
        setTimeout(() => {
          setSelectedEntity('')
          setDailyTarget('')
          setWeeklyTarget('')
          setSubmitted(false)
          setMessage({ type: '', text: '' })
          onSuccess?.()
        }, 2000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.message || 'Failed to save target' })
      }
    } catch (error) {
      console.error('Error saving target:', error)
      setMessage({ type: 'error', text: 'An error occurred while saving the target' })
    } finally {
      setLoading(false)
    }
  }

  const getEntityLabel = () => {
    if (targetType === 'animal') {
      const animal = animals.find(a => a.id === selectedEntity)
      return animal ? `${animal.name} (${animal.tag_number})` : 'Select an animal'
    } else {
      return selectedEntity || 'Select a group'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className={isMobile ? 'p-4' : 'p-6'}>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Set Production Targets</h2>
            <p className="text-gray-600 mt-2">
              Define daily and weekly production targets for individual animals or groups
            </p>
          </div>

          {/* Tabs for Target Type */}
          <Tabs value={targetType} onValueChange={(v) => {
            setTargetType(v as 'animal' | 'group')
            setSelectedEntity('')
            setMessage({ type: '', text: '' })
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="animal">Individual Animal</TabsTrigger>
              <TabsTrigger value="group">Milking Group</TabsTrigger>
            </TabsList>

            <TabsContent value="animal" className="space-y-4 mt-6">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Select Animal</label>
                <select
                  value={selectedEntity}
                  onChange={(e) => setSelectedEntity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose an animal...</option>
                  {animals.map(animal => (
                    <option key={animal.id} value={animal.id}>
                      {animal.name} (Tag: {animal.tag_number})
                    </option>
                  ))}
                </select>
                {selectedEntity && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900">
                      Setting target for: <span className="font-semibold">{getEntityLabel()}</span>
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="group" className="space-y-4 mt-6">
              {groups.length === 0 ? (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    No milking groups found. Create milking groups first to set group targets.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Select Group</label>
                  <select
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a group...</option>
                    {groups.map(group => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                  {selectedEntity && (
                    <div className="mt-4 space-y-3">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-semibold text-blue-900 mb-2">
                          Group: {selectedEntity}
                        </p>
                        <p className="text-xs text-blue-800">
                          {groupAnimals.length} animal{groupAnimals.length !== 1 ? 's' : ''} in this group
                        </p>
                        {groupAnimals.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {groupAnimals.map(animal => (
                              <Badge key={animal.id} variant="secondary" className="text-xs">
                                {animal.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Form Fields */}
          {selectedEntity && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Unit Selection */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Production Unit</label>
                <div className="flex gap-2">
                  {(['L', 'kg'] as const).map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 font-semibold transition-colors ${
                        unit === u
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Target */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Daily Target ({unit})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={dailyTarget}
                    onChange={(e) => setDailyTarget(e.target.value)}
                    placeholder="e.g., 20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Expected daily production in {unit}</p>
              </div>

              {/* Weekly Target */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Weekly Target ({unit})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={weeklyTarget}
                    onChange={(e) => setWeeklyTarget(e.target.value)}
                    placeholder="e.g., 140"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Expected weekly production in {unit}</p>
              </div>

              {/* Info Box */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-700">
                  <span className="font-semibold">Tip:</span> Set realistic targets based on animal capacity. 
                  Weekly target should typically be 7× daily target.
                </p>
              </div>

              {/* Messages */}
              {message.text && (
                <div className={`p-3 rounded-lg border flex gap-2 ${
                  message.type === 'success' 
                    ? 'bg-green-50 border-green-200' 
                    : message.type === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  {message.type === 'success' ? (
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}
                  <p className={`text-sm ${
                    message.type === 'success' 
                      ? 'text-green-800' 
                      : message.type === 'error'
                      ? 'text-red-800'
                      : 'text-yellow-800'
                  }`}>
                    {message.text}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading || submitted}
                >
                  {loading ? 'Saving...' : 'Save Target'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  )
}
