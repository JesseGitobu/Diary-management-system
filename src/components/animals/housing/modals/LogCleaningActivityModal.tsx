'use client'

import { useState } from 'react'
import { X, AlertCircle, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { CleaningLog, HousingPen } from '@/types/housing'

interface LogCleaningActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onLog: (log: CleaningLog) => void
  pens: HousingPen[]
}

export function LogCleaningActivityModal({
  isOpen,
  onClose,
  onLog,
  pens,
}: LogCleaningActivityModalProps) {
  const [selectedPen, setSelectedPen] = useState<string>('')
  const [cleaningType, setCleaningType] = useState<'spot_cleaning' | 'partial_clean' | 'deep_clean'>('spot_cleaning')
  const [duration, setDuration] = useState<string>('')
  const [wasteRemoved, setWasteRemoved] = useState<string>('')
  const [beddingReplaced, setBeddingReplaced] = useState(false)
  const [notes, setNotes] = useState<string>('')
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleLog = async () => {
    if (!selectedPen) {
      setError('Please select a pen')
      return
    }

    setLoading(true)
    setError('')

    try {
      const log: CleaningLog = {
        id: `cleaning-log-${Date.now()}`,
        pen_id: selectedPen,
        farm_id: '',
        cleaning_type: cleaningType,
        cleaned_at: new Date().toISOString(),
        cleaned_by: 'user1',
        duration_minutes: duration ? parseInt(duration) : undefined,
        waste_removed_kg: wasteRemoved ? parseFloat(wasteRemoved) : undefined,
        bedding_replaced: beddingReplaced,
        notes: notes || undefined,
        photos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      onLog(log)

      // Reset form
      setSelectedPen('')
      setCleaningType('spot_cleaning')
      setDuration('')
      setWasteRemoved('')
      setBeddingReplaced(false)
      setNotes('')
      setUploadedPhotos([])
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log cleaning activity')
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
          <h2 className="text-lg font-semibold text-gray-900">Log Cleaning Activity</h2>
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

          {/* Cleaning Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Cleaning Type *
            </label>
            <Select
              value={cleaningType}
              onValueChange={(value: any) => setCleaningType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spot_cleaning">Spot Cleaning (Quick)</SelectItem>
                <SelectItem value="partial_clean">Partial Clean (Moderate)</SelectItem>
                <SelectItem value="deep_clean">Deep Clean (Thorough)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration & Waste */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 45"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Waste Removed (kg)
              </label>
              <input
                type="number"
                value={wasteRemoved}
                onChange={(e) => setWasteRemoved(e.target.value)}
                placeholder="e.g., 25"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Bedding Replaced */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={beddingReplaced}
                onChange={(e) => setBeddingReplaced(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-blue-900">Fresh bedding added/replaced</span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Cleaning Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations, issues encountered, recommendations..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Add Photos (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Drag photos here or click to browse</p>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
                Choose files
              </label>
            </div>
            {uploadedPhotos.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                {uploadedPhotos.length} photo(s) selected
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
            <p className="text-sm font-medium text-gray-900">Cleaning Summary</p>
            <div className="text-sm text-gray-700 space-y-1">
              {selectedPen && (
                <p>Pen: <span className="font-medium">{pens.find(p => p.id === selectedPen)?.pen_number}</span></p>
              )}
              <p>Type: <span className="font-medium capitalize">{cleaningType.replace(/_/g, ' ')}</span></p>
              {duration && (
                <p>Duration: <span className="font-medium">{duration} minutes</span></p>
              )}
              <p>Bedding: <span className="font-medium">{beddingReplaced ? 'Replaced ✓' : 'Not changed'}</span></p>
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
              onClick={handleLog}
              disabled={!selectedPen || loading}
              className="flex-1"
            >
              {loading ? 'Logging...' : 'Log Activity'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
