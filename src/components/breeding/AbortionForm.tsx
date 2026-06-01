'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { AlertTriangle, Loader, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/Alert'

interface AbortionFormProps {
  farmId: string
  animalId: string
  animalName?: string
  animalTag?: string
  pregnancyRecord: any
  onAbortionRecorded: () => void
  onCancel: () => void
}

interface FormData {
  abortion_date: string
  cause: string | null
  stage_of_pregnancy: string | null
  complications: string | null
  veterinary_involved: boolean
  veterinarian_name: string | null
  treatment_given: string | null
  recovery_status: string | null
  production_status: string
  notes: string | null
}

interface ValidationErrors {
  abortion_date?: string
  veterinarian_name?: string
}

export function AbortionForm({
  farmId,
  animalId,
  animalName,
  animalTag,
  pregnancyRecord,
  onAbortionRecorded,
  onCancel
}: AbortionFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  const [formData, setFormData] = useState<FormData>({
    abortion_date: new Date().toISOString().split('T')[0],
    cause: 'unknown',
    stage_of_pregnancy: null,
    complications: null,
    veterinary_involved: false,
    veterinarian_name: null,
    treatment_given: null,
    recovery_status: 'recovering',
    production_status: 'lactating',
    notes: null
  })

  // Validate form before submission
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {}

    if (!formData.abortion_date) {
      errors.abortion_date = 'Abortion date is required'
    } else {
      // Ensure abortion date is not in the future
      // Compare date strings directly (YYYY-MM-DD format works correctly as string comparison)
      const todayString = new Date().toISOString().split('T')[0]
      if (formData.abortion_date > todayString) {
        errors.abortion_date = 'Abortion date cannot be in the future'
      }
    }

    if (formData.veterinary_involved && !formData.veterinarian_name?.trim()) {
      errors.veterinarian_name = 'Veterinarian name is required when veterinary was involved'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? checked 
        : value === '' 
        ? null 
        : value
    }))

    // Clear validation error for this field when user starts typing
    if (validationErrors[name as keyof ValidationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (!pregnancyRecord?.pregnancy_record_id) {
        throw new Error('Pregnancy record not found')
      }

      // Prepare abortion details - only include non-null values
      const abortionDetails: Record<string, any> = {
        abortion_date: formData.abortion_date,
      }

      // Add optional fields only if they have values
      if (formData.cause) abortionDetails.cause = formData.cause
      if (formData.stage_of_pregnancy) abortionDetails.stage_of_pregnancy = formData.stage_of_pregnancy
      if (formData.complications) abortionDetails.complications = formData.complications
      if (formData.veterinary_involved !== undefined) abortionDetails.veterinary_involved = formData.veterinary_involved
      if (formData.veterinarian_name) abortionDetails.veterinarian_name = formData.veterinarian_name
      if (formData.treatment_given) abortionDetails.treatment_given = formData.treatment_given
      if (formData.recovery_status) abortionDetails.recovery_status = formData.recovery_status
      if (formData.notes) abortionDetails.notes = formData.notes

      // Include the new production status
      const newProductionStatus = formData.production_status

      // Call the API endpoint to update pregnancy record and create abortion record
      const response = await fetch(
        `/api/animals/${animalId}/breeding-records/${pregnancyRecord.pregnancy_record_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pregnancy_status: 'aborted',
            abortion_details: abortionDetails,
            new_production_status: newProductionStatus
          })
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to record abortion')
      }

      const result = await response.json()
      console.log('✓ Abortion recorded successfully:', result)

      setSubmitted(true)
      setTimeout(() => {
        onAbortionRecorded()
      }, 1500)
    } catch (err) {
      console.error('Error recording abortion:', err)
      setError(err instanceof Error ? err.message : 'Failed to record abortion. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Abortion Recorded</h3>
        <p className="text-gray-600 mb-4">
          The pregnancy record has been successfully marked as aborted and the abortion record has been saved.
        </p>
        <p className="text-sm text-gray-500">
          {animalName && `Animal: ${animalName}`}
          {animalTag && ` (Tag: ${animalTag})`}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Warning Alert */}
      <Alert className="border-red-300 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
        <AlertDescription className="text-red-800 ml-3">
          <strong>Important:</strong> Marking a pregnancy as aborted will update the animal's breeding status. All information will be permanently recorded. Please ensure all details are accurate.
        </AlertDescription>
      </Alert>

      {/* Animal & Pregnancy Record Info */}
      {pregnancyRecord && (
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Animal & Pregnancy Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {animalName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Animal Name:</span>
                <span className="font-medium">{animalName}</span>
              </div>
            )}
            {animalTag && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tag Number:</span>
                <span className="font-medium">{animalTag}</span>
              </div>
            )}
            {pregnancyRecord.service_date && (
              <div className="flex justify-between">
                <span className="text-gray-600">Service Date:</span>
                <span className="font-medium">
                  {new Date(pregnancyRecord.service_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {pregnancyRecord.expected_calving_date && (
              <div className="flex justify-between">
                <span className="text-gray-600">Expected Calving:</span>
                <span className="font-medium">
                  {new Date(pregnancyRecord.expected_calving_date).toLocaleDateString()}
                </span>
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
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <AlertDescription className="text-red-800 ml-3">{error}</AlertDescription>
        </Alert>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Abortion Date - REQUIRED */}
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
            max={new Date().toISOString().split('T')[0]}
            aria-invalid={!!validationErrors.abortion_date}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              validationErrors.abortion_date
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-red-500'
            }`}
          />
          {validationErrors.abortion_date && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.abortion_date}</p>
          )}
        </div>

        {/* Cause */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Likely Cause
          </label>
          <select
            name="cause"
            value={formData.cause || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
          >
            <option value="">Select a cause (optional)</option>
            <option value="unknown">Unknown</option>
            <option value="infection">Infection</option>
            <option value="trauma">Trauma / Physical Injury</option>
            <option value="genetic">Genetic Abnormality</option>
            <option value="nutritional">Nutritional Deficiency</option>
            <option value="stress">Stress / Environmental</option>
            <option value="medication">Medication Related</option>
            <option value="other">Other</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">Optional field</p>
        </div>

        {/* Stage of Pregnancy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stage of Pregnancy <span className="text-gray-500">(weeks)</span>
          </label>
          <input
            type="number"
            name="stage_of_pregnancy"
            value={formData.stage_of_pregnancy || ''}
            onChange={handleChange}
            min="1"
            max="40"
            placeholder="e.g., 8"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <p className="mt-1 text-xs text-gray-500">Optional field</p>
        </div>

        {/* Complications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Complications Observed
          </label>
          <textarea
            name="complications"
            value={formData.complications || ''}
            onChange={handleChange}
            placeholder="e.g., bleeding, fever, retained placenta, vaginal discharge..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
          <p className="mt-1 text-xs text-gray-500">Optional field</p>
        </div>

        {/* Veterinary Involvement */}
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <input
              type="checkbox"
              name="veterinary_involved"
              checked={formData.veterinary_involved}
              onChange={handleChange}
              id="vet_involved"
              className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-2 focus:ring-red-500 cursor-pointer"
            />
          </div>
          <label htmlFor="vet_involved" className="text-sm text-gray-700 cursor-pointer">
            A veterinarian was involved in the case
          </label>
        </div>

        {/* Veterinarian Name - CONDITIONAL REQUIRED */}
        {formData.veterinary_involved && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Veterinarian Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="veterinarian_name"
              value={formData.veterinarian_name || ''}
              onChange={handleChange}
              placeholder="Name of attending veterinarian"
              aria-invalid={!!validationErrors.veterinarian_name}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                validationErrors.veterinarian_name
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-red-500'
              }`}
            />
            {validationErrors.veterinarian_name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.veterinarian_name}</p>
            )}
          </div>
        )}

        {/* Treatment Given */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Treatment Given
          </label>
          <textarea
            name="treatment_given"
            value={formData.treatment_given || ''}
            onChange={handleChange}
            placeholder="e.g., antibiotics, IV fluids, pain management, rest, medications..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
          <p className="mt-1 text-xs text-gray-500">Optional field</p>
        </div>

        {/* Recovery Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Recovery Status
          </label>
          <select
            name="recovery_status"
            value={formData.recovery_status || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
          >
            <option value="">Select recovery status (optional)</option>
            <option value="recovered">Fully Recovered</option>
            <option value="recovering">Currently Recovering</option>
            <option value="ongoing_treatment">Ongoing Treatment Required</option>
            <option value="deceased">Animal Died</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">Optional field</p>
        </div>

        {/* Production Status After Abortion */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Animal Production Status After Abortion <span className="text-red-500">*</span>
          </label>
          <select
            name="production_status"
            value={formData.production_status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
          >
            <option value="lactating">Return to Lactating (Heat Cycle)</option>
            <option value="served">Plan to Rebreed</option>
            <option value="steaming_dry_cows">Dry Off for Rest</option>
            <option value="open_culling_dry_cows">Consider for Culling</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">Choose the animal's status after recovery. This will be updated in the system.</p>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            placeholder="Any other relevant information about this abortion case..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
          <p className="mt-1 text-xs text-gray-500">Optional field</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Recording Abortion...
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
