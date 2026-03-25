// ReportHealthIssueModal.tsx
// Modal for reporting health issues that need attention

'use client'

import React, { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, X } from 'lucide-react'

const reportIssueSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  issue_type: z.enum(['injury', 'illness', 'behavior_change', 'poor_appetite', 'lameness', 'respiratory', 'reproductive', 'other']),
  issue_type_other: z.string().optional(),
  description: z.string().min(10, 'Please provide at least 10 characters describing the issue'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  alert_veterinarian: z.boolean(),
  notes: z.string().optional(),
})

type ReportIssueFormData = z.infer<typeof reportIssueSchema>

interface Animal {
  id: string
  tag_number: string
  name?: string
  breed?: string
  status: string
}

interface ReportHealthIssueModalProps {
  farmId: string
  animals: Animal[]
  isOpen: boolean
  onClose: () => void
  onIssueReported: (issue: any) => void
}

export function ReportHealthIssueModal({
  farmId,
  animals,
  isOpen,
  onClose,
  onIssueReported
}: ReportHealthIssueModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [animalSearch, setAnimalSearch] = useState('')
  const [showAllAnimals, setShowAllAnimals] = useState(false)

  const form = useForm<ReportIssueFormData>({
    resolver: zodResolver(reportIssueSchema),
    defaultValues: {
      animal_id: '',
      issue_type: 'illness',
      severity: 'medium',
      alert_veterinarian: false,
      description: '',
      notes: '',
    },
  })

  const watchedIssueType = form.watch('issue_type')
  const watchedSeverity = form.watch('severity')
  const watchedAlertVet = form.watch('alert_veterinarian')

  // Auto-check veterinarian alert for high/critical severity
  React.useEffect(() => {
    if (watchedSeverity === 'high' || watchedSeverity === 'critical') {
      if (!watchedAlertVet) {
        form.setValue('alert_veterinarian', true)
      }
    }
  }, [watchedSeverity, form, watchedAlertVet])

  const filteredAnimals = React.useMemo(() => {
    let filtered = animals.filter(animal => animal.status === 'active')

    if (animalSearch) {
      const search = animalSearch.toLowerCase()
      filtered = filtered.filter(animal =>
        animal.tag_number.toLowerCase().includes(search) ||
        animal.name?.toLowerCase().includes(search) ||
        animal.breed?.toLowerCase().includes(search)
      )
    }

    if (!showAllAnimals && filtered.length > 20) {
      return filtered.slice(0, 20)
    }

    return filtered
  }, [animals, animalSearch, showAllAnimals])

  const handleSubmit = useCallback(async (data: ReportIssueFormData) => {
    setLoading(true)
    setError(null)

    try {
      const issueData = {
        farm_id: farmId,
        animal_id: data.animal_id,
        issue_type: data.issue_type === 'other' ? data.issue_type_other : data.issue_type,
        description: data.description,
        severity: data.severity,
        alert_veterinarian: data.alert_veterinarian,
        notes: data.notes,
        reported_at: new Date().toISOString(),
        status: 'open',
      }

      const response = await fetch('/api/health/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueData),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to report health issue')
      }

      const result = await response.json()
      
      toast.success('Health issue reported successfully!', {
        duration: 4000,
        position: 'top-right',
      })

      onIssueReported(result.issue)

      form.reset()
      setAnimalSearch('')
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to report health issue'
      setError(errorMessage)
      toast.error(errorMessage, {
        duration: 6000,
        position: 'top-right',
      })
    } finally {
      setLoading(false)
    }
  }, [farmId, onIssueReported, onClose, form])

  const selectedAnimal = animals.find(a => a.id === form.watch('animal_id'))

  const severityColors = {
    low: 'bg-blue-50 border-blue-200 text-blue-900',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    high: 'bg-orange-50 border-orange-200 text-orange-900',
    critical: 'bg-red-50 border-red-200 text-red-900',
  }

  const issuTypeLabels: Record<string, string> = {
    injury: '🩹 Injury',
    illness: '🤒 Illness',
    behavior_change: '🐄 Behavior Change',
    poor_appetite: '🍽️ Poor Appetite',
    lameness: '🦵 Lameness',
    respiratory: '💨 Respiratory Issue',
    reproductive: '🤱 Reproductive Issue',
    other: '❓ Other',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <span>Report Health Issue</span>
          </h3>
          
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          {/* Animal Selection */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <Label className="text-base font-medium">Select Animal</Label>

            <div className="relative">
              <input
                type="text"
                placeholder="Search by tag number, name, or breed..."
                value={animalSearch}
                onChange={(e) => setAnimalSearch(e.target.value)}
                className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              />
            </div>

            {selectedAnimal && (
              <div className="p-2 bg-farm-green/10 border border-farm-green/20 rounded text-sm">
                {selectedAnimal.tag_number} {selectedAnimal.name && `- ${selectedAnimal.name}`}
              </div>
            )}

            <select
              {...form.register('animal_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
            >
              <option value="">Choose an animal...</option>
              {filteredAnimals.map((animal) => (
                <option key={animal.id} value={animal.id}>
                  {animal.tag_number} {animal.name ? `- ${animal.name}` : ''} ({animal.breed || 'Unknown'})
                </option>
              ))}
            </select>

            {filteredAnimals.length === 20 && !showAllAnimals && (
              <button
                type="button"
                onClick={() => setShowAllAnimals(true)}
                className="text-farm-green text-sm hover:underline"
              >
                Load more animals...
              </button>
            )}

            {form.formState.errors.animal_id && (
              <p className="text-sm text-red-600">{form.formState.errors.animal_id.message}</p>
            )}
          </div>

          {/* Issue Type */}
          <div>
            <Label htmlFor="issue_type">Issue Type</Label>
            <select
              id="issue_type"
              {...form.register('issue_type')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
            >
              {Object.entries(issuTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Custom Issue Type */}
          {watchedIssueType === 'other' && (
            <div>
              <Label htmlFor="issue_type_other">Specify Issue Type</Label>
              <Input
                id="issue_type_other"
                {...form.register('issue_type_other')}
                placeholder="Describe the type of issue"
              />
            </div>
          )}

          {/* Severity */}
          <div>
            <Label htmlFor="severity">Severity Level</Label>
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                <label key={level} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value={level}
                    {...form.register('severity')}
                    className="sr-only"
                  />
                  <div
                    className={`w-full p-2 rounded border text-center text-sm font-medium transition-all ${
                      form.watch('severity') === level
                        ? `${severityColors[level]} border-current`
                        : 'bg-white border-gray-200 cursor-pointer'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Issue Description</Label>
            <textarea
              id="description"
              {...form.register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Describe the health issue in detail (e.g., 'Noticed swelling on left leg, animal limping')"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Alert Veterinarian */}
          <div className={`p-4 rounded-lg border-2 transition-all ${form.watch('alert_veterinarian') ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'}`}>
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                {...form.register('alert_veterinarian')}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900">Alert Veterinarian</span>
                <p className="text-sm text-gray-600 mt-1">
                  {form.watch('alert_veterinarian') ? '✓ Veterinarian will be notified immediately' : 'Check this box to notify the veterinarian about this issue'}
                </p>
                {(watchedSeverity === 'high' || watchedSeverity === 'critical') && (
                  <p className="text-xs text-orange-600 mt-2 font-medium">Auto-enabled for {watchedSeverity} severity</p>
                )}
              </div>
            </label>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Any other relevant information..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 font-medium rounded-md px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-400"
            >
              {loading ? 'Reporting...' : 'Report Issue'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
