// src/components/teams-roles/InvitationForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertCircle, Loader2 } from 'lucide-react'

export type UserRole = 'farm_manager' | 'worker' | 'veterinarian'

interface Worker {
  id: string
  name: string
  worker_number: string
  employment_status: string
  position: string
  shift?: string | null
  department_id?: string | null
}

interface Department {
  id: string
  name: string
}

interface InvitationFormProps {
  farmId: string
  onSuccess?: (invitation: any) => void
  onCancel?: () => void
  workersList?: Worker[]
  departmentsList?: Department[]
  isLoading?: boolean
  initialInvitation?: any
}

export function InvitationForm({
  farmId,
  onSuccess,
  onCancel,
  workersList = [],
  departmentsList = [],
  isLoading: initialLoading = false,
  initialInvitation,
}: InvitationFormProps) {
  const isEditing = !!initialInvitation
  const [isLoading, setIsLoading] = useState(initialLoading)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    worker_id: '',
    email: '',
    full_name: '',
    role_type: 'worker' as UserRole,
    department_id: '',
  })

  // Load initial data when editing
  useEffect(() => {
    if (initialInvitation) {
      setFormData({
        worker_id: initialInvitation.worker_id || '',
        email: initialInvitation.email || '',
        full_name: initialInvitation.full_name || '',
        role_type: initialInvitation.role_type || 'worker',
        department_id: initialInvitation.department_id || '',
      })
    }
  }, [initialInvitation])

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

  const handleWorkerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setError(null)
    const selectedWorkerId = e.target.value
    setFormData((prev) => ({
      ...prev,
      worker_id: selectedWorkerId,
    }))

    // Auto-fill full name, department and role from selected worker
    if (selectedWorkerId) {
      const selectedWorker = workersList.find((w) => w.id === selectedWorkerId)
      if (selectedWorker) {
        const knownRoles: UserRole[] = ['farm_manager', 'worker', 'veterinarian']
        const mappedRole = knownRoles.includes(selectedWorker.position as UserRole)
          ? (selectedWorker.position as UserRole)
          : 'worker'
        setFormData((prev) => ({
          ...prev,
          full_name: selectedWorker.name,
          department_id: selectedWorker.department_id || '',
          role_type: mappedRole,
        }))
      }
    } else {
      // Clear name and department if worker is deselected
      setFormData((prev) => ({
        ...prev,
        full_name: '',
        department_id: '',
        role_type: 'worker',
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validate required fields
      if (!formData.email.trim()) {
        setError('Email address is required')
        setIsLoading(false)
        return
      }

      if (!formData.full_name.trim()) {
        setError('Full name is required')
        setIsLoading(false)
        return
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address')
        setIsLoading(false)
        return
      }

      const method = isEditing ? 'PUT' : 'POST'
      const endpoint = isEditing
        ? `/api/farms/${farmId}/teams_roles/invitations/${initialInvitation.id}`
        : `/api/farms/${farmId}/teams_roles/invitations`

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          full_name: formData.full_name.trim(),
          role_type: formData.role_type,
          department_id: formData.department_id || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || (isEditing ? 'Failed to update invitation' : 'Failed to send invitation'))
        setIsLoading(false)
        return
      }

      const invitation = await response.json()

      // Reset form only if creating new
      if (!isEditing) {
        setFormData({
          worker_id: '',
          email: '',
          full_name: '',
          role_type: 'worker',
          department_id: '',
        })
      }

      if (onSuccess) {
        onSuccess(invitation)
      }
    } catch (err) {
      console.error('Error with invitation:', err)
      setError(isEditing ? 'Failed to update invitation. Please try again.' : 'Failed to send invitation. Please try again.')
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

      {/* Worker Selection (Optional) */}
      {workersList && workersList.length > 0 && (
        <div>
          <label htmlFor="worker_id" className="block text-sm font-medium text-gray-900 mb-1">
            Select Worker (Optional)
          </label>
          <select
            id="worker_id"
            name="worker_id"
            value={formData.worker_id}
            onChange={handleWorkerSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
            disabled={isLoading}
          >
            <option value="">Choose a worker to auto-fill their name...</option>
            {workersList.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name} ({worker.worker_number}) - {worker.position}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Selecting a worker will auto-fill their full name, role, and department assignment
          </p>
        </div>
      )}

      {/* Full Name */}
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-900 mb-1">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="full_name"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          placeholder="e.g., John Doe"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
          disabled={isLoading}
        />
        {formData.worker_id && (
          <p className="text-xs text-gray-500 mt-1">Auto-filled from selected worker</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="e.g., john@example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
          disabled={isLoading}
        />
      </div>

      {/* Role Type */}
      <div>
        <label htmlFor="role_type" className="block text-sm font-medium text-gray-900 mb-1">
          Role <span className="text-red-500">*</span>
        </label>
        <select
          id="role_type"
          name="role_type"
          value={formData.role_type}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
          disabled={isLoading}
        >
          <option value="farm_manager">Farm Manager</option>
          <option value="worker">Worker</option>
          <option value="veterinarian">Veterinarian</option>
        </select>
      </div>

      {/* Department Assignment */}
      {departmentsList && departmentsList.length > 0 && (
        <div>
          <label htmlFor="department_id" className="block text-sm font-medium text-gray-900 mb-1">
            Department (Optional)
          </label>
          <select
            id="department_id"
            name="department_id"
            value={formData.department_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
            disabled={isLoading}
          >
            <option value="">Not assigned to a department</option>
            {departmentsList.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          {formData.worker_id && (
            <p className="text-xs text-gray-500 mt-1">
              Auto-filled from selected worker's department
            </p>
          )}
        </div>
      )}

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
              {isEditing ? 'Updating...' : 'Sending...'}
            </>
          ) : (
            isEditing ? 'Update Invitation' : 'Send Invitation'
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
