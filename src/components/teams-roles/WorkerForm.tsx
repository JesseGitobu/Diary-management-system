// src/components/teams-roles/WorkerForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertCircle, Loader2 } from 'lucide-react'

interface WorkerFormProps {
  farmId: string
  onSuccess?: (worker: any) => void
  onCancel?: () => void
  isDepartmentsLoading?: boolean
  departments?: Array<{ id: string; name: string }>
  initialWorker?: any
}

export function WorkerForm({
  farmId,
  onSuccess,
  onCancel,
  isDepartmentsLoading = false,
  departments = [],
  initialWorker,
}: WorkerFormProps) {
  const isEditing = !!initialWorker
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    worker_number: '',
    employment_status: 'full_time',
    position: '',
    shift: '',
    department_id: '',
    casual_rate: '',
  })
  const [customPosition, setCustomPosition] = useState('')

  // Load initial data when editing
  useEffect(() => {
    if (initialWorker) {
      setFormData({
        name: initialWorker.name || '',
        worker_number: initialWorker.worker_number || '',
        employment_status: initialWorker.employment_status || 'full_time',
        position: initialWorker.position || '',
        shift: initialWorker.shift || '',
        department_id: initialWorker.department_id || '',
        casual_rate: initialWorker.casual_rate || '',
      })
      setCustomPosition(initialWorker.position || '')
    }
  }, [initialWorker])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setError(null)
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCustomPositionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setCustomPosition(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        setError('Worker name is required')
        setIsLoading(false)
        return
      }

      if (!formData.worker_number.trim()) {
        setError('Worker number is required')
        setIsLoading(false)
        return
      }

      if (!formData.position) {
        setError('Position is required')
        setIsLoading(false)
        return
      }

      // Use custom position if "other" was selected
      const finalPosition = formData.position === 'other' ? customPosition.trim() : formData.position

      if (!finalPosition) {
        setError('Please enter a custom position')
        setIsLoading(false)
        return
      }

      const method = isEditing ? 'PUT' : 'POST'
      const endpoint = isEditing ? `/api/teams/workers/${initialWorker.id}` : '/api/teams/workers'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farm_id: farmId,
          ...formData,
          position: finalPosition,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || (isEditing ? 'Failed to update worker' : 'Failed to create worker'))
        setIsLoading(false)
        return
      }

      const worker = await response.json()

      // Reset form only if creating new
      if (!isEditing) {
        setFormData({
          name: '',
          worker_number: '',
          employment_status: 'full_time',
          position: '',
          shift: '',
          department_id: '',
          casual_rate: '',
        })
        setCustomPosition('')
      }

      if (onSuccess) {
        onSuccess(worker)
      }
    } catch (err) {
      console.error('Error with worker:', err)
      setError(isEditing ? 'Failed to update worker. Please try again.' : 'Failed to create worker. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Worker Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
          Worker Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., John Doe"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
          disabled={isLoading}
        />
      </div>

      {/* Worker Number */}
      <div>
        <label htmlFor="worker_number" className="block text-sm font-medium text-gray-900 mb-1">
          Worker Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="worker_number"
          name="worker_number"
          value={formData.worker_number}
          onChange={handleChange}
          placeholder="e.g., WRK001"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
          disabled={isLoading}
        />
      </div>

      {/* Position */}
      <div>
        <label htmlFor="position" className="block text-sm font-medium text-gray-900 mb-1">
          Position <span className="text-red-500">*</span>
        </label>
        <select
          id="position"
          name="position"
          value={formData.position}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
          disabled={isLoading}
        >
          <option value="">Select a position</option>
          <option value="farm_manager">Farm Manager</option>
          <option value="worker">Worker</option>
          <option value="veterinarian">Veterinarian</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Custom Position (show only when "other" is selected) */}
      {formData.position === 'other' && (
        <div>
          <label htmlFor="customPosition" className="block text-sm font-medium text-gray-900 mb-1">
            Custom Position <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="customPosition"
            value={customPosition}
            onChange={handleCustomPositionChange}
            placeholder="e.g., Trainee, Assistant Manager"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
            disabled={isLoading}
          />
        </div>
      )}

      {/* Employment Status */}
      <div>
        <label htmlFor="employment_status" className="block text-sm font-medium text-gray-900 mb-1">
          Employment Status <span className="text-red-500">*</span>
        </label>
        <select
          id="employment_status"
          name="employment_status"
          value={formData.employment_status}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
          disabled={isLoading}
        >
          <option value="full_time">Full Time</option>
          <option value="part_time">Part Time</option>
          <option value="casual">Casual</option>
          <option value="contract">Contract</option>
        </select>
      </div>

      {/* Casual Rate (show only for casual workers) */}
      {formData.employment_status === 'casual' && (
        <div>
          <label htmlFor="casual_rate" className="block text-sm font-medium text-gray-900 mb-1">
            Hourly Rate (Kes)
          </label>
          <input
            type="number"
            id="casual_rate"
            name="casual_rate"
            value={formData.casual_rate}
            onChange={handleChange}
            placeholder="e.g., 500"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
            disabled={isLoading}
          />
        </div>
      )}

      {/* Department */}
      <div>
        <label htmlFor="department_id" className="block text-sm font-medium text-gray-900 mb-1">
          Department (Optional)
        </label>
        {isDepartmentsLoading ? (
          <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
            Loading departments...
          </div>
        ) : (
          <select
            id="department_id"
            name="department_id"
            value={formData.department_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
            disabled={isLoading}
          >
            <option value="">Not assigned to a department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Shift */}
      <div>
        <label htmlFor="shift" className="block text-sm font-medium text-gray-900 mb-1">
          Shift (Optional)
        </label>
        <input
          type="text"
          id="shift"
          name="shift"
          value={formData.shift}
          onChange={handleChange}
          placeholder="e.g., Morning, Evening, Night"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
          disabled={isLoading}
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-dairy-primary text-white rounded-lg hover:bg-dairy-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
              {isEditing ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            isEditing ? 'Update Worker' : 'Create Worker'
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
