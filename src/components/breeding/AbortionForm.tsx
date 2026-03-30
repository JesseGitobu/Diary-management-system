'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { AlertTriangle, Loader } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/Alert'

interface AbortionFormProps {
  farmId: string
  animalId: string
  pregnancyRecord: any
  onAbortionRecorded: () => void
  onCancel: () => void
}

export function AbortionForm({
  farmId,
  animalId,
  pregnancyRecord,
  onAbortionRecorded,
  onCancel
}: AbortionFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const [formData, setFormData] = useState({
    abortion_date: new Date().toISOString().split('T')[0],
    cause: 'unknown' as const,
    stage_of_pregnancy: '',
    complications: '',
    veterinary_involved: false,
    veterinarian_name: '',
    treatment_given: '',
    recovery_status: 'recovering' as const,
    notes: ''
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Update the pregnancy record to mark it as aborted
      const response = await fetch(`/api/animals/${animalId}/breeding-records/${pregnancyRecord?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pregnancy_status: 'aborted',
          abortion_details: formData
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to record abortion')
      }

      setSubmitted(true)
      setTimeout(() => {
        onAbortionRecorded()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record abortion')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-3xl mb-4">✓</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Abortion Recorded</h3>
        <p className="text-gray-600">The pregnancy has been marked as aborted.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Warning Alert */}
      <Alert className="border-red-300 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 ml-2">
          Marking a pregnancy as aborted will update the animal's breeding status. Please ensure all information is accurate.
        </AlertDescription>
      </Alert>

      {/* Pregnancy Record Info */}
      {pregnancyRecord && (
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Current Pregnancy Record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Service Date:</span>
              <span className="font-medium">{new Date(pregnancyRecord.service_date).toLocaleDateString()}</span>
            </div>
            {pregnancyRecord.expected_calving_date && (
              <div className="flex justify-between">
                <span className="text-gray-600">Expected Calving:</span>
                <span className="font-medium">{new Date(pregnancyRecord.expected_calving_date).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Current Status:</span>
              <span className="font-medium text-purple-600">Confirmed Pregnant</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Abortion Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Abortion <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="abortion_date"
            value={formData.abortion_date}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Cause */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Likely Cause
          </label>
          <select
            name="cause"
            value={formData.cause}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="unknown">Unknown</option>
            <option value="infection">Infection</option>
            <option value="trauma">Trauma / Physical Injury</option>
            <option value="genetic">Genetic Abnormality</option>
            <option value="nutritional">Nutritional Deficiency</option>
            <option value="stress">Stress / Environmental</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Stage of Pregnancy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stage of Pregnancy (weeks)
          </label>
          <input
            type="number"
            name="stage_of_pregnancy"
            value={formData.stage_of_pregnancy}
            onChange={handleChange}
            min="1"
            max="40"
            placeholder="e.g., 8"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Complications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Complications Observed
          </label>
          <textarea
            name="complications"
            value={formData.complications}
            onChange={handleChange}
            placeholder="e.g., bleeding, fever, retained placenta..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Veterinary Involvement */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="veterinary_involved"
            checked={formData.veterinary_involved}
            onChange={handleChange}
            id="vet_involved"
            className="w-4 h-4 text-red-600 rounded focus:ring-2 focus:ring-red-500"
          />
          <label htmlFor="vet_involved" className="ml-2 text-sm text-gray-700">
            Veterinarian was involved
          </label>
        </div>

        {/* Veterinarian Name */}
        {formData.veterinary_involved && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Veterinarian Name
            </label>
            <input
              type="text"
              name="veterinarian_name"
              value={formData.veterinarian_name}
              onChange={handleChange}
              placeholder="Name of veterinarian"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        )}

        {/* Treatment Given */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Treatment Given
          </label>
          <textarea
            name="treatment_given"
            value={formData.treatment_given}
            onChange={handleChange}
            placeholder="e.g., antibiotics, IV fluids, rest..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Recovery Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Recovery Status
          </label>
          <select
            name="recovery_status"
            value={formData.recovery_status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="recovered">Fully Recovered</option>
            <option value="recovering">Currently Recovering</option>
            <option value="ongoing_treatment">Ongoing Treatment Required</option>
            <option value="deceased">Animal Died</option>
          </select>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any other relevant information..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Recording...
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4" />
              Record Abortion
            </>
          )}
        </button>
      </div>
    </form>
  )
}
