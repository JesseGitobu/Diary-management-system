// src/components/teams-roles/TaskForm.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { createTask } from '@/app/actions/teams-actions'

interface Worker {
  id: string
  name: string
}

interface Department {
  id: string
  name: string
}

interface TaskFormProps {
  workers: Worker[]
  departments: Department[]
  onSuccess?: () => void
}

export function TaskForm({ workers, departments, onSuccess }: TaskFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [taskType, setTaskType] = useState('one_time')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await createTask(formData)
      setSuccess(result.message)
      onSuccess?.()
      ;(event?.target as HTMLFormElement)?.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {success}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-2">
          Task Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          placeholder="e.g., Morning milking, Feed cattle"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
          Description (Optional)
        </label>
        <textarea
          id="description"
          name="description"
          placeholder="Task details and instructions..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-900 mb-2">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium" selected>
              Medium
            </option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label htmlFor="task_type" className="block text-sm font-medium text-gray-900 mb-2">
            Task Type
          </label>
          <select
            id="task_type"
            name="task_type"
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
          >
            <option value="one_time">One-time</option>
            <option value="daily">Daily Recurring</option>
            <option value="weekly">Weekly Recurring</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="department_id" className="block text-sm font-medium text-gray-900 mb-2">
            Department
          </label>
          <select
            id="department_id"
            name="department_id"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
          >
            <option value="">Select department...</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="assigned_worker_id" className="block text-sm font-medium text-gray-900 mb-2">
            Assign To
          </label>
          <select
            id="assigned_worker_id"
            name="assigned_worker_id"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
          >
            <option value="">Not assigned yet</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="due_date" className="block text-sm font-medium text-gray-900 mb-2">
            Due Date
          </label>
          <input
            type="date"
            id="due_date"
            name="due_date"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="due_time" className="block text-sm font-medium text-gray-900 mb-2">
            Due Time
          </label>
          <input
            type="time"
            id="due_time"
            name="due_time"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
          />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Task'}
      </Button>
    </form>
  )
}
