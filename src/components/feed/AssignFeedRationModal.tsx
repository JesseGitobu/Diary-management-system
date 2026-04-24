// src/components/feed/AssignFeedRationModal.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { X, Users, User, ChevronDown, FlaskConical } from 'lucide-react'

interface AssignFeedRationModalProps {
  farmId: string
  ration: any
  animals: any[]
  animalCategories: any[]
  isOpen: boolean
  onClose: () => void
  onSuccess: (assignment: any) => void
}

export function AssignFeedRationModal({
  farmId,
  ration,
  animals,
  animalCategories,
  isOpen,
  onClose,
  onSuccess,
}: AssignFeedRationModalProps) {
  const [assignmentType, setAssignmentType] = useState<'animal' | 'group'>('group')
  const [animalId, setAnimalId] = useState('')
  const [animalCategoryId, setAnimalCategoryId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    setAssignmentType('group')
    setAnimalId('')
    setAnimalCategoryId('')
    setStartDate(new Date().toISOString().split('T')[0])
    setEndDate('')
    setAssignmentNotes('')
    setError(null)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (assignmentType === 'animal' && !animalId) {
      setError('Please select an animal')
      return
    }
    if (assignmentType === 'group' && !animalCategoryId) {
      setError('Please select a group')
      return
    }
    if (!startDate) {
      setError('Start date is required')
      return
    }

    const payload = {
      assignment_type: assignmentType,
      animal_id: assignmentType === 'animal' ? animalId : null,
      animal_category_id: assignmentType === 'group' ? animalCategoryId : null,
      start_date: startDate,
      end_date: endDate || null,
      notes: assignmentNotes.trim() || null,
    }

    setIsSaving(true)
    try {
      const res = await fetch(
        `/api/farms/${farmId}/feed-rations/${ration.id}/assignments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to assign ration')

      onSuccess(json.data)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  // Already-assigned animal/group IDs for this ration
  const assignedAnimalIds = new Set(
    (ration.feed_ration_assignments ?? [])
      .filter((a: any) => a.assignment_type === 'animal')
      .map((a: any) => a.animal_id)
  )
  const assignedCategoryIds = new Set(
    (ration.feed_ration_assignments ?? [])
      .filter((a: any) => a.assignment_type === 'group')
      .map((a: any) => a.animal_category_id)
  )

  const availableAnimals = animals.filter(a => !assignedAnimalIds.has(a.id))
  const availableCategories = animalCategories.filter(c => !assignedCategoryIds.has(c.id))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[90vh] bg-white rounded-t-2xl sm:rounded-xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-green-600" />
              <h2 className="text-base font-semibold text-gray-900">Assign Ration</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 ml-6">{ration.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            disabled={isSaving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            {/* Assignment type selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAssignmentType('group')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    assignmentType === 'group'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Group / Category
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentType('animal')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    assignmentType === 'animal'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <User className="h-4 w-4" />
                  Individual Animal
                </button>
              </div>
            </div>

            {/* Group selector */}
            {assignmentType === 'group' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Animal Group <span className="text-red-500">*</span>
                </label>
                {availableCategories.length === 0 ? (
                  <p className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    All animal groups are already assigned to this ration.
                  </p>
                ) : (
                  <div className="relative">
                    <select
                      value={animalCategoryId}
                      onChange={e => setAnimalCategoryId(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select a group…</option>
                      {availableCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                          {cat.production_status
                            ? ` (${cat.production_status.replace(/_/g, ' ')})`
                            : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  This ration will apply to all animals in the selected group.
                </p>
              </div>
            )}

            {/* Individual animal selector */}
            {assignmentType === 'animal' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Animal <span className="text-red-500">*</span>
                </label>
                {availableAnimals.length === 0 ? (
                  <p className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    All animals are already assigned to this ration.
                  </p>
                ) : (
                  <div className="relative">
                    <select
                      value={animalId}
                      onChange={e => setAnimalId(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select an animal…</option>
                      {availableAnimals.map(animal => (
                        <option key={animal.id} value={animal.id}>
                          {animal.tag_number}
                          {animal.name ? ` — ${animal.name}` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                )}
              </div>
            )}

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            {!endDate && (
              <p className="text-xs text-gray-400 -mt-3">
                Leave end date empty for an ongoing assignment.
              </p>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={assignmentNotes}
                onChange={e => setAssignmentNotes(e.target.value)}
                rows={2}
                placeholder="Any special instructions for this assignment…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 flex-shrink-0">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSaving ||
              (assignmentType === 'animal' && availableAnimals.length === 0) ||
              (assignmentType === 'group' && availableCategories.length === 0)
            }
          >
            {isSaving ? 'Assigning…' : 'Assign Ration'}
          </Button>
        </div>
      </div>
    </div>
  )
}
