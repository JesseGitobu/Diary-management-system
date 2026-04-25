'use client'

import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { FeedStation, HousingPen } from '@/types/housing'

interface AddFeedStationModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (station: FeedStation) => void
  pens: HousingPen[]
}

export function AddFeedStationModal({
  isOpen,
  onClose,
  onAdd,
  pens,
}: AddFeedStationModalProps) {
  const [selectedPen, setSelectedPen] = useState<string>('')
  const [stationType, setStationType] = useState<'manual' | 'automated' | 'mixed'>('manual')
  const [capacity, setCapacity] = useState<string>('')
  const [feedType, setFeedType] = useState<string>('')
  const [automated, setAutomated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleAdd = async () => {
    if (!selectedPen || !capacity) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const station: FeedStation = {
        id: `fs-${Date.now()}`,
        pen_id: selectedPen,
        farm_id: '',
        station_number: 1,
        station_type: stationType,
        capacity_kg: parseFloat(capacity),
        current_feed_kg: 0,
        feed_type: feedType || undefined,
        automated,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      onAdd(station)

      // Reset form
      setSelectedPen('')
      setStationType('manual')
      setCapacity('')
      setFeedType('')
      setAutomated(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add feed station')
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
          <h2 className="text-lg font-semibold text-gray-900">Add Feed Station</h2>
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
                  <SelectItem key={pen.id} value={pen.id}>
                    {pen.pen_number} - {pen.special_type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Station Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Station Type *
            </label>
            <Select
              value={stationType}
              onValueChange={(value: any) => setStationType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Feed Station</SelectItem>
                <SelectItem value="automated">Automated Feeder</SelectItem>
                <SelectItem value="mixed">Mixed System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Capacity (kg) *
            </label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g., 500"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Feed Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Feed Type
            </label>
            <Select value={feedType} onValueChange={setFeedType}>
              <SelectTrigger>
                <SelectValue placeholder="Select feed type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Not specified</SelectItem>
                <SelectItem value="forage">Forage/Hay</SelectItem>
                <SelectItem value="grain">Grain/Concentrate</SelectItem>
                <SelectItem value="pellets">Pellets</SelectItem>
                <SelectItem value="mixed">Mixed Feed</SelectItem>
                <SelectItem value="supplement">Supplement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Automated Option */}
          {(stationType === 'automated' || stationType === 'mixed') && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={automated}
                  onChange={(e) => setAutomated(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-blue-900">
                  Configure as automated feeder
                </span>
              </label>
              <p className="text-xs text-blue-800 mt-2">
                Enable automated dispensing schedules for this station
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
            <p className="text-sm font-medium text-gray-900">Station Summary</p>
            <div className="text-sm text-gray-700 space-y-1">
              {selectedPen && (
                <p>Pen: <span className="font-medium">{pens.find(p => p.id === selectedPen)?.pen_number}</span></p>
              )}
              {stationType && (
                <p>Type: <span className="font-medium capitalize">{stationType}</span></p>
              )}
              {capacity && (
                <p>Capacity: <span className="font-medium">{capacity} kg</span></p>
              )}
              {feedType && (
                <p>Feed Type: <span className="font-medium capitalize">{feedType}</span></p>
              )}
            </div>
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
              onClick={handleAdd}
              disabled={!selectedPen || !capacity || loading}
              className="flex-1"
            >
              {loading ? 'Adding...' : 'Add Station'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
