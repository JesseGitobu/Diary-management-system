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
import { MaintenanceSchedule } from '@/types/housing'

interface ScheduleMaintenanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSchedule: (schedule: MaintenanceSchedule) => void
}

export function ScheduleMaintenanceModal({
  isOpen,
  onClose,
  onSchedule,
}: ScheduleMaintenanceModalProps) {
  const [assetType, setAssetType] = useState<'building' | 'unit' | 'pen' | 'equipment'>('equipment')
  const [taskDescription, setTaskDescription] = useState('')
  const [maintenanceType, setMaintenanceType] = useState<'preventive' | 'corrective' | 'emergency'>('preventive')
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual'>('monthly')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0])
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleSchedule = async () => {
    if (!taskDescription.trim()) {
      setError('Please enter a task description')
      return
    }

    if (!scheduledDate) {
      setError('Please select a scheduled date')
      return
    }

    setLoading(true)
    setError('')

    try {
      const schedule: MaintenanceSchedule = {
        id: `maint-${Date.now()}`,
        asset_id: 'asset-1',
        asset_type: assetType,
        farm_id: '',
        task_description: taskDescription,
        maintenance_type: maintenanceType,
        frequency,
        scheduled_date: scheduledDate,
        status: 'scheduled',
        priority,
        assigned_to: assignedTo || undefined,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      onSchedule(schedule)

      // Reset form
      setTaskDescription('')
      setEstimatedCost('')
      setAssignedTo('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule maintenance')
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
          <h2 className="text-lg font-semibold text-gray-900">Schedule Maintenance</h2>
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
              placeholder="Describe the maintenance task..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Asset & Maintenance Type */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Asset Type *
              </label>
              <Select
                value={assetType}
                onValueChange={(value: any) => setAssetType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="building">Building</SelectItem>
                  <SelectItem value="unit">Unit</SelectItem>
                  <SelectItem value="pen">Pen</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
          </div>

          {/* Priority & Frequency */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Priority *
              </label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Frequency
              </label>
              <Select
                value={frequency}
                onValueChange={(value: any) => setFrequency(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="biannual">Bi-annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scheduled Date & Cost */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Scheduled Date *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Estimated Cost (Optional)
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
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">Priority Level</p>
            <div className="inline-block px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: priority === 'critical' ? '#fee2e2' : priority === 'high' ? '#fef3c7' : priority === 'medium' ? '#dbeafe' : '#f3f4f6',
                color: priority === 'critical' ? '#991b1b' : priority === 'high' ? '#92400e' : priority === 'medium' ? '#1e40af' : '#374151',
              }}
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
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
              disabled={!taskDescription.trim() || !scheduledDate || loading}
              className="flex-1"
            >
              {loading ? 'Scheduling...' : 'Schedule Maintenance'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
