// src/components/teams-roles/DepartmentForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertCircle, Loader2 } from 'lucide-react'

interface DepartmentFormProps {
  farmId: string
  onSuccess?: (department: any) => void
  onCancel?: () => void
  isLoading?: boolean
  initialDepartment?: any
}

export function DepartmentForm({
  farmId,
  onSuccess,
  onCancel,
  isLoading = false,
  initialDepartment,
}: DepartmentFormProps) {
  const isEditing = !!initialDepartment
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Load initial data when editing
  useEffect(() => {
    if (initialDepartment) {
      setName(initialDepartment.name || '')
      setDescription(initialDepartment.description || '')
    }
  }, [initialDepartment])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!name.trim()) {
        setError('Department name is required')
        setLoading(false)
        return
      }

      const method = isEditing ? 'PUT' : 'POST'
      const endpoint = isEditing ? `/api/teams/departments/${initialDepartment.id}` : '/api/teams/departments'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          name: name.trim(),
          description: description.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || (isEditing ? 'Failed to update department' : 'Failed to create department'))
        setLoading(false)
        return
      }

      if (!isEditing) {
        setName('')
        setDescription('')
      }
      onSuccess?.(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Department Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Milking, Maintenance, Breeding"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary"
          disabled={loading || isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description for this department (optional)"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary resize-none"
          disabled={loading || isLoading}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading || isLoading}
          className="flex items-center gap-2"
        >
          {loading || isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isEditing ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            isEditing ? 'Update Department' : 'Create Department'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading || isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
