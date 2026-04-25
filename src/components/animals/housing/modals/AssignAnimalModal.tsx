'use client'

import { useState, useEffect } from 'react'
import { X, Search, AlertCircle, Folder, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { HousingPen, AnimalHousingAssignment } from '@/types/housing'

interface AssignAnimalModalProps {
  isOpen: boolean
  onClose: () => void
  onAssign: (assignments: AnimalHousingAssignment[]) => void
  pens: HousingPen[]
  unassignedAnimals: any[]
  farmId?: string
}

interface AnimalCategory {
  id: string
  name: string
  description?: string
}

export function AssignAnimalModal({
  isOpen,
  onClose,
  onAssign,
  pens,
  unassignedAnimals = [],
  farmId = '',
}: AssignAnimalModalProps) {
  const [selectedTab, setSelectedTab] = useState<'animals' | 'categories'>('animals')
  const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set())
  const [selectedPen, setSelectedPen] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categories, setCategories] = useState<AnimalCategory[]>([])
  const [categoryAnimalCounts, setCategoryAnimalCounts] = useState<Record<string, number>>({})
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [categoryAnimals, setCategoryAnimals] = useState<Record<string, any[]>>({})

  // Fetch categories when modal opens, then derive counts from unassignedAnimals
  useEffect(() => {
    if (isOpen && farmId) {
      setLoadingCategories(true)
      fetch(`/api/animal-categories/${farmId}`)
        .then(res => res.json())
        .then(data => {
          if (data.categories) {
            setCategories(data.categories)
            const counts: Record<string, number> = {}
            const byCategory: Record<string, any[]> = {}
            data.categories.forEach((cat: AnimalCategory) => {
              const animals = unassignedAnimals.filter(a => a.category_id === cat.id)
              counts[cat.id] = animals.length
              byCategory[cat.id] = animals
            })
            setCategoryAnimalCounts(counts)
            setCategoryAnimals(byCategory)
          }
        })
        .catch(err => console.error('Failed to fetch categories:', err))
        .finally(() => setLoadingCategories(false))
    }
  }, [isOpen, farmId, unassignedAnimals])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedAnimals(new Set())
      setSelectedPen('')
      setReason('')
      setNotes('')
      setSearchTerm('')
      setExpandedCategories(new Set())
      setError('')
    }
  }, [isOpen])

  const toggleAnimal = (id: string) => {
    setSelectedAnimals(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  // Clicking the category row (not chevron) selects/deselects all its animals
  const toggleCategorySelection = (categoryId: string) => {
    const animals = categoryAnimals[categoryId] ?? []
    if (animals.length === 0) return
    const allSelected = animals.every(a => selectedAnimals.has(a.id))
    setSelectedAnimals(prev => {
      const next = new Set(prev)
      if (allSelected) {
        animals.forEach(a => next.delete(a.id))
      } else {
        animals.forEach(a => next.add(a.id))
      }
      return next
    })
  }

  const getCategorySelectionState = (categoryId: string): 'all' | 'some' | 'none' => {
    const animals = categoryAnimals[categoryId] ?? []
    if (animals.length === 0) return 'none'
    const selectedCount = animals.filter(a => selectedAnimals.has(a.id)).length
    if (selectedCount === 0) return 'none'
    if (selectedCount === animals.length) return 'all'
    return 'some'
  }

  const filteredAnimals = unassignedAnimals.filter(
    animal =>
      animal.tag_number?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedPenData = pens.find(p => p.id === selectedPen)
  const availableSpace = selectedPenData
    ? selectedPenData.capacity - selectedPenData.current_occupancy
    : 0
  const selectedCount = selectedAnimals.size
  const exceedsCapacity = selectedPenData ? selectedCount > availableSpace : false

  const handleAssign = async () => {
  if (selectedAnimals.size === 0 || !selectedPen) {
    setError('Please select at least one animal and a pen')
    return
  }
  if (exceedsCapacity) {
    setError(`Pen only has space for ${availableSpace} more animals`)
    return
  }

  setLoading(true)
  setError('')

  try {
    const response = await fetch('/api/housing/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        animal_ids: Array.from(selectedAnimals),
        pen_id: selectedPen,
        reason: reason,
        notes: notes
      })
    })

    const result = await response.json()

    if (!response.ok) throw new Error(result.error || 'Failed to assign animals')

    // Callback to update parent UI state
    onAssign(result.data)
    onClose()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to assign animals')
  } finally {
    setLoading(false)
  }
}

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center lg:p-4 z-50">
      <div className="w-full lg:max-w-2xl bg-white rounded-t-2xl lg:rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assign Animals to Pen</h2>
            {selectedCount > 0 && (
              <p className="text-sm text-blue-600 mt-0.5">
                {selectedCount} animal{selectedCount !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-6 space-y-6">
          {error && (
            <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Animal - Tabbed Interface */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Select Animals *
            </label>

            {/* Tabs */}
            <div className="flex gap-2 mb-3 border-b border-gray-200">
              <button
                onClick={() => { setSelectedTab('animals'); setSearchTerm('') }}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  selectedTab === 'animals'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                Individual Animals
              </button>
              <button
                onClick={() => setSelectedTab('categories')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  selectedTab === 'categories'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                Categories
              </button>
            </div>

            {/* Individual Animals Tab */}
            {selectedTab === 'animals' && (
              <div className="space-y-2">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by tag or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {filteredAnimals.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto">
                    {filteredAnimals.map(animal => {
                      const checked = selectedAnimals.has(animal.id)
                      return (
                        <button
                          key={animal.id}
                          onClick={() => toggleAnimal(animal.id)}
                          className={`w-full flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 text-left transition-colors ${
                            checked ? 'bg-blue-50' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                          }`}>
                            {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">#{animal.tag_number}</p>
                            {animal.name && (
                              <p className="text-xs text-gray-500 truncate">{animal.name}</p>
                            )}
                          </div>
                          {animal.production_status && (
                            <span className="text-xs text-gray-500 capitalize flex-shrink-0">
                              {animal.production_status.replace(/_/g, ' ')}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {searchTerm ? 'No animals match your search' : 'No unassigned animals available'}
                  </div>
                )}
              </div>
            )}

            {/* Categories Tab */}
            {selectedTab === 'categories' && (
              <div className="space-y-2">
                {loadingCategories ? (
                  <div className="text-center py-8 text-gray-500 text-sm">Loading categories...</div>
                ) : categories.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto">
                    {categories.map(category => {
                      const selectionState = getCategorySelectionState(category.id)
                      const isExpanded = expandedCategories.has(category.id)
                      const total = categoryAnimalCounts[category.id] || 0
                      const selectedInCat = (categoryAnimals[category.id] ?? []).filter(
                        a => selectedAnimals.has(a.id)
                      ).length

                      return (
                        <div key={category.id} className="border-b last:border-b-0">
                          <div className="flex items-center">
                            {/* Expand/collapse chevron */}
                            <button
                              onClick={() => toggleCategoryExpand(category.id)}
                              className="flex-shrink-0 p-3 text-gray-400 hover:text-gray-600"
                              aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>

                            {/* Selectable category row */}
                            <button
                              onClick={() => toggleCategorySelection(category.id)}
                              disabled={total === 0}
                              className={`flex-1 flex items-center gap-3 py-3 pr-3 hover:bg-gray-50 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                selectionState !== 'none' ? 'bg-blue-50' : ''
                              }`}
                            >
                              {/* Category checkbox */}
                              <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                selectionState === 'all'
                                  ? 'bg-blue-600 border-blue-600'
                                  : selectionState === 'some'
                                  ? 'bg-blue-200 border-blue-400'
                                  : 'border-gray-300'
                              }`}>
                                {selectionState === 'all' && (
                                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                )}
                                {selectionState === 'some' && (
                                  <div className="w-2 h-0.5 bg-blue-600 rounded" />
                                )}
                              </div>

                              <Folder className="h-4 w-4 text-gray-400 flex-shrink-0" />

                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900">{category.name}</p>
                                {category.description && (
                                  <p className="text-xs text-gray-500 truncate">{category.description}</p>
                                )}
                              </div>

                              <Badge variant="secondary" className="ml-2 flex-shrink-0">
                                {selectedInCat > 0 ? `${selectedInCat}/` : ''}{total}
                              </Badge>
                            </button>
                          </div>

                          {/* Expanded — individual animals in this category */}
                          {isExpanded && (
                            <div className="bg-gray-50 border-t border-gray-200">
                              {(categoryAnimals[category.id] ?? []).length > 0 ? (
                                (categoryAnimals[category.id] ?? []).map(animal => {
                                  const checked = selectedAnimals.has(animal.id)
                                  return (
                                    <button
                                      key={animal.id}
                                      onClick={() => toggleAnimal(animal.id)}
                                      className={`w-full flex items-center gap-3 p-3 pl-14 border-b last:border-b-0 hover:bg-white text-left transition-colors ${
                                        checked ? 'bg-blue-50' : ''
                                      }`}
                                    >
                                      <div className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                        checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                      }`}>
                                        {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-gray-900">#{animal.tag_number}</p>
                                        {animal.name && (
                                          <p className="text-xs text-gray-500 truncate">{animal.name}</p>
                                        )}
                                      </div>
                                      {animal.production_status && (
                                        <span className="text-xs text-gray-400 capitalize flex-shrink-0">
                                          {animal.production_status.replace(/_/g, ' ')}
                                        </span>
                                      )}
                                    </button>
                                  )
                                })
                              ) : (
                                <p className="text-center py-4 text-gray-500 text-sm">
                                  No unassigned animals in this category
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No animal categories available
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Select Pen */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Select Pen *
            </label>
            <Select value={selectedPen} onValueChange={setSelectedPen}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a pen..." />
              </SelectTrigger>
              <SelectContent>
                {pens.map(pen => (
                  <SelectItem
                    key={pen.id}
                    value={pen.id}
                    disabled={pen.current_occupancy >= pen.capacity}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{pen.pen_number} - {pen.special_type.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-gray-500">
                        ({pen.current_occupancy}/{pen.capacity})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pen Capacity Info */}
          {selectedPenData && (
            <div className={`p-3 rounded-lg border ${exceedsCapacity ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
              <p className={`text-sm font-medium ${exceedsCapacity ? 'text-red-900' : 'text-blue-900'}`}>
                {selectedPenData.pen_number}
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <p className={exceedsCapacity ? 'text-red-700' : 'text-blue-700'}>
                  Occupancy: {selectedPenData.current_occupancy} / {selectedPenData.capacity}
                  {selectedCount > 0 && ` · Adding ${selectedCount}`}
                </p>
                <div className="bg-blue-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${exceedsCapacity ? 'bg-red-500' : 'bg-blue-600'}`}
                    style={{
                      width: `${Math.min(
                        ((selectedPenData.current_occupancy + selectedCount) / selectedPenData.capacity) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
              {exceedsCapacity && (
                <p className="text-red-600 text-xs mt-2">
                  Only {availableSpace} space{availableSpace !== 1 ? 's' : ''} available — deselect {selectedCount - availableSpace} animal{selectedCount - availableSpace !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Reason for Assignment
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_arrival">New Arrival</SelectItem>
                <SelectItem value="production_status">Production Status Change</SelectItem>
                <SelectItem value="health_management">Health Management</SelectItem>
                <SelectItem value="breeding">Breeding Program</SelectItem>
                <SelectItem value="rotation">Housing Rotation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedCount === 0 || !selectedPen || exceedsCapacity || loading}
              className="flex-1"
            >
              {loading
                ? 'Assigning...'
                : selectedCount > 0
                ? `Assign ${selectedCount} Animal${selectedCount !== 1 ? 's' : ''}`
                : 'Assign Animals'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
