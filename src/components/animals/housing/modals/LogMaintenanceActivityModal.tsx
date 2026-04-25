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

interface LogMaintenanceActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onLog: (data: any) => void
}

export function LogMaintenanceActivityModal({
  isOpen,
  onClose,
  onLog,
}: LogMaintenanceActivityModalProps) {
  const [taskDescription, setTaskDescription] = useState<string>('')
  const [maintenanceType, setMaintenanceType] = useState<'preventive' | 'corrective' | 'emergency'>('preventive')
  const [duration, setDuration] = useState<string>('')
  const [actualCost, setActualCost] = useState<string>('')
  const [estimatedCost, setEstimatedCost] = useState<string>('')
  const [partsReplaced, setPartsReplaced] = useState<string>('')
  const [nextServiceDate, setNextServiceDate] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const costDifference = actualCost && estimatedCost
    ? parseFloat(actualCost) - parseFloat(estimatedCost)
    : null

  const handleLog = async () => {
    if (!taskDescription || !duration) {
      setError('Please enter task description and duration')
      return
    }

    setLoading(true)
    setError('')

    try {
      const log = {
        id: `maint-log-${Date.now()}`,
        farm_id: '',
        completed_at: new Date().toISOString(),
        completed_by: 'user1',
        task_description: taskDescription,
        maintenance_type: maintenanceType,
        duration_hours: parseFloat(duration),
        actual_cost: actualCost ? parseFloat(actualCost) : undefined,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        parts_replaced: partsReplaced || undefined,
        next_service_date: nextServiceDate || undefined,
        notes: notes || undefined,
        photos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
        created_at: new Date().toISOString(),
      }

      onLog(log)

      // Reset form
      setTaskDescription('')
      setMaintenanceType('preventive')
      setDuration('')
      setActualCost('')
      setEstimatedCost('')
      setPartsReplaced('')
      setNextServiceDate('')
      setNotes('')
      setUploadedPhotos([])
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log maintenance activity')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center lg:p-4 z-50">
      <div className="w-full lg:max-w-3xl bg-white rounded-t-2xl lg:rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Log Maintenance Activity</h2>
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

          {/* Task Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Task Description *
            </label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="What maintenance was performed?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Maintenance Type & Duration */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Maintenance Type *
              </label>
              <Select
                value={maintenanceType}
                onValueChange={(value: any) => setMaintenanceType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Duration (hours) *
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 2.5"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Cost Information */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Estimated Cost
              </label>
              <div className="flex items-center">
                <span className="text-gray-600">$</span>
                <input
                  type="number"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Actual Cost
              </label>
              <div className="flex items-center">
                <span className="text-gray-600">$</span>
                <input
                  type="number"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Cost Variance */}
          {costDifference !== null && (
            <div className={`p-3 rounded-lg text-sm ${
              costDifference > 0
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-green-50 border border-green-200 text-green-800'
            }`}>
              {costDifference > 0
                ? `⚠️ Cost overrun: $${costDifference.toFixed(2)}`
                : `✓ Saved: $${Math.abs(costDifference).toFixed(2)}`}
            </div>
          )}

          {/* Parts Replaced */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Parts Replaced
            </label>
            <textarea
              value={partsReplaced}
              onChange={(e) => setPartsReplaced(e.target.value)}
              placeholder="List any parts that were replaced..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Next Service Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Next Service Date
            </label>
            <input
              type="date"
              value={nextServiceDate}
              onChange={(e) => setNextServiceDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              rows={2}
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
                id="maint-photo-upload"
              />
              <label htmlFor="maint-photo-upload" className="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
                Choose files
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
            <p className="text-sm font-medium text-gray-900">Maintenance Summary</p>
            <div className="text-sm text-gray-700 space-y-1">
              {duration && <p>Hours: <span className="font-medium">{duration}h</span></p>}
              {actualCost && <p>Cost: <span className="font-medium">${parseFloat(actualCost).toFixed(2)}</span></p>}
              {nextServiceDate && <p>Next Service: <span className="font-medium">{nextServiceDate}</span></p>}
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
              disabled={!taskDescription || !duration || loading}
              className="flex-1"
            >
              {loading ? 'Logging...' : 'Log Maintenance'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
