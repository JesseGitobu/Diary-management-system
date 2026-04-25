'use client'

import { useState } from 'react'
import { X, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { HousingPen, AnimalMovementLog } from '@/types/housing'

interface MoveAnimalModalProps {
  isOpen: boolean
  onClose: () => void
  onMove: (movement: AnimalMovementLog) => void
  pens: HousingPen[]
  assignedAnimals: any[]
}

export function MoveAnimalModal({
  isOpen,
  onClose,
  onMove,
  pens,
  assignedAnimals = [],
}: MoveAnimalModalProps) {
  const [selectedAnimal, setSelectedAnimal] = useState<string>('')
  const [fromPen, setFromPen] = useState<string>('')
  const [toPen, setToPen] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const selectedAnimalData = assignedAnimals.find(a => a.id === selectedAnimal)
  const selectedToPenData = pens.find(p => p.id === toPen)
  const canMove =
    selectedToPenData && selectedToPenData.current_occupancy < selectedToPenData.capacity

  const handleMove = async () => {
    if (!selectedAnimal || !fromPen || !toPen) {
      setError('Please select animal and both source and destination pens')
      return
    }

    if (fromPen === toPen) {
      setError('Source and destination pens must be different')
      return
    }

    if (!canMove) {
      setError('Destination pen is at full capacity')
      return
    }

    if (!reason) {
      setError('Please select a reason for the movement')
      return
    }

    setLoading(true)
    setError('')

    try {
      const movement: AnimalMovementLog = {
        id: `move-${Date.now()}`,
        animal_id: selectedAnimal,
        from_pen_id: fromPen,
        to_pen_id: toPen,
        farm_id: '',
        moved_at: new Date().toISOString(),
        moved_by: 'user',
        reason,
        notes: notes || undefined,
      }

      onMove(movement)

      // Reset form
      setSelectedAnimal('')
      setFromPen('')
      setToPen('')
      setReason('')
      setNotes('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move animal')
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
          <h2 className="text-lg font-semibold text-gray-900">Move Animal Between Pens</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
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

          {/* Select Animal */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Select Animal *
            </label>
            <Select value={selectedAnimal} onValueChange={setSelectedAnimal}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an animal..." />
              </SelectTrigger>
              <SelectContent>
                {assignedAnimals.map(animal => (
                  <SelectItem key={animal.id} value={animal.id}>
                    <span>
                      #{animal.tag_number} - {animal.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Movement Path */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">
              Movement Path *
            </label>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:items-end">
              {/* From Pen */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  From Pen
                </label>
                <Select value={fromPen} onValueChange={setFromPen}>
                  <SelectTrigger>
                    <SelectValue placeholder="Current pen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pens.map(pen => (
                      <SelectItem key={pen.id} value={pen.id}>
                        {pen.pen_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Arrow */}
              <div className="flex justify-center lg:pb-1">
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>

              {/* To Pen */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  To Pen
                </label>
                <Select value={toPen} onValueChange={setToPen}>
                  <SelectTrigger>
                    <SelectValue placeholder="Destination pen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pens
                      .filter(p => p.id !== fromPen)
                      .map(pen => (
                        <SelectItem
                          key={pen.id}
                          value={pen.id}
                          disabled={pen.current_occupancy >= pen.capacity}
                        >
                          <div className="flex items-center space-x-2">
                            <span>{pen.pen_number}</span>
                            <span className="text-xs text-gray-600">
                              ({pen.current_occupancy}/{pen.capacity})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Destination Pen Info */}
          {selectedToPenData && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Destination: {selectedToPenData.pen_number}
              </p>
              <div className="space-y-2 text-sm text-blue-800">
                <p>Type: {selectedToPenData.special_type.replace(/_/g, ' ')}</p>
                <div className="flex justify-between mb-1">
                  <span>Current occupancy:</span>
                  <span className="font-medium">
                    {selectedToPenData.current_occupancy}/{selectedToPenData.capacity}
                  </span>
                </div>
                <div className="bg-blue-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full"
                    style={{
                      width: `${(selectedToPenData.current_occupancy / selectedToPenData.capacity) * 100}%`,
                    }}
                  />
                </div>
              </div>
              {!canMove && (
                <p className="text-red-600 text-xs mt-2">⚠️ This pen is at full capacity</p>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Reason for Movement *
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production_status">Production Status Change</SelectItem>
                <SelectItem value="health_treatment">Health Treatment</SelectItem>
                <SelectItem value="isolation">Isolation (Sick)</SelectItem>
                <SelectItem value="breeding">Breeding Program</SelectItem>
                <SelectItem value="rotation">Housing Rotation</SelectItem>
                <SelectItem value="quarantine">Quarantine</SelectItem>
                <SelectItem value="cleaning">Pen Cleaning</SelectItem>
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
              placeholder="Add details about the movement..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              disabled={
                !selectedAnimal || !fromPen || !toPen || !reason || !canMove || loading
              }
              className="flex-1"
            >
              {loading ? 'Moving...' : 'Move Animal'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
