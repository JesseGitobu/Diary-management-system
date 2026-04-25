'use client'

import { useState } from 'react'
import { X, AlertCircle, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { CleaningSchedule, HousingPen } from '@/types/housing'

interface ScheduleCleaningModalProps {
  isOpen: boolean
  onClose: () => void
  onSchedule: (schedule: CleaningSchedule) => void
  pens: HousingPen[]
}

export function ScheduleCleaningModal({
  isOpen,
  onClose,
  onSchedule,
  pens,
}: ScheduleCleaningModalProps) {
  const [selectedPen, setSelectedPen] = useState<string>('')
  const [cleaningType, setCleaningType] = useState<'spot_cleaning' | 'partial_clean' | 'deep_clean'>('spot_cleaning')
  const [frequency, setFrequency] = useState<'daily' | 'every_other_day' | 'weekly' | 'biweekly' | 'monthly'>('daily')
  const [scheduledTime, setScheduledTime] = useState('06:00')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleSchedule = async () => {
    if (!selectedPen) {
      setError('Please select a pen')
      return
    }

    setLoading(true)
    setError('')

    try {
      const schedule: CleaningSchedule = {
        id: `cleaning-${Date.now()}`,
        pen_id: selectedPen,
        farm_id: '',
        frequency,
        scheduled_time: scheduledTime,
        start_date: startDate,
        cleaning_type: cleaningType,
        status: 'pending',
        assigned_to: assignedTo || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      onSchedule(schedule)

      // Reset form
      setSelectedPen('')
      setCleaningType('spot_cleaning')
      setFrequency('daily')
      setScheduledTime('06:00')
      setStartDate(new Date().toISOString().split('T')[0])
      setAssignedTo('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule cleaning')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const frequencyLabels = {
    daily: 'Every Day',
    every_other_day: 'Every Other Day',
    weekly: 'Every Week',
    biweekly: 'Every 2 Weeks',
    monthly: 'Every Month',
  }

  const cleaningTypeLabels = {
    spot_cleaning: 'Spot Cleaning (Quick)',
    partial_clean: 'Partial Clean (Moderate)',
    deep_clean: 'Deep Clean (Thorough)',
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center lg:p-4 z-50">
      <div className="w-full lg:max-w-2xl bg-white rounded-t-2xl lg:rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Schedule Cleaning</h2>
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
                {Object.entries(cleaningTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-600 mt-1">
              {cleaningType === 'spot_cleaning'
                ? 'Remove manure and replace bedding as needed'
                : cleaningType === 'partial_clean'
                ? 'Scrape, wash, and partial bedding replacement'
                : 'Complete scrub, disinfection, and fresh bedding'}
            </p>
          </div>

          {/* Frequency & Timing */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Frequency *
              </label>
              <Select
                value={frequency}
                onValueChange={(value: any) => setFrequency(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(frequencyLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Scheduled Time *
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Assign To (Optional)
            </label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                <SelectItem value="user1">John Doe</SelectItem>
                <SelectItem value="user2">Jane Smith</SelectItem>
                <SelectItem value="user3">Mike Johnson</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <p className="text-sm font-medium text-blue-900">Schedule Summary</p>
            <div className="text-sm text-blue-800 space-y-1">
              {selectedPen && (
                <p>Pen: <span className="font-medium">{pens.find(p => p.id === selectedPen)?.pen_number}</span></p>
              )}
              <p>
                Type:{' '}
                <span className="font-medium">
                  {cleaningTypeLabels[cleaningType]}
                </span>
              </p>
              <p>
                Schedule:{' '}
                <span className="font-medium">
                  {frequencyLabels[frequency]} at {scheduledTime}
                </span>
              </p>
              <p>
                Starting:{' '}
                <span className="font-medium">
                  {new Date(startDate).toLocaleDateString()}
                </span>
              </p>
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
              onClick={handleSchedule}
              disabled={!selectedPen || loading}
              className="flex-1"
            >
              {loading ? 'Scheduling...' : 'Schedule Cleaning'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
