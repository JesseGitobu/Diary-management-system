'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { Milk, X, Info } from 'lucide-react'
import type { DryOffReason } from '@/lib/database/dry-off'

// ─── Schema ──────────────────────────────────────────────────────────────────

const dryOffSchema = z.object({
  dry_off_date: z.string().min(1, 'Dry-off date is required'),
  dry_off_reason: z.enum(
    ['end_of_lactation', 'low_production', 'health_issue', 'pregnancy', 'involuntary', 'other'],
    { errorMap: () => ({ message: 'Please select a reason for dry-off' }) }
  ),
  last_milk_yield: z.number().positive().optional(),
  expected_dry_period_days: z.number().int().min(1).max(365).optional(),
  expected_calving_date: z.string().optional(),
  dry_cow_therapy: z.boolean(),
  treatment_notes: z.string().optional(),
  notes: z.string().optional(),
})

type DryOffFormData = z.infer<typeof dryOffSchema>

// ─── Props ───────────────────────────────────────────────────────────────────

interface DryOffModalProps {
  animal: {
    id: string
    tag_number: string
    name?: string | null
    production_status?: string | null
    current_daily_production?: number | null
  }
  farmId: string
  isOpen: boolean
  onClose: () => void
  onRecordCreated: (productionStatus: string) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DRY_OFF_REASON_LABELS: Record<DryOffReason, string> = {
  end_of_lactation: 'End of Lactation',
  low_production:   'Low Production',
  health_issue:     'Health Issue',
  pregnancy:        'Pregnancy (planned dry-off)',
  involuntary:      'Involuntary',
  other:            'Other',
}

const DRY_OFF_REASON_DESCRIPTIONS: Record<DryOffReason, string> = {
  end_of_lactation: 'Normal dry-off at end of the current lactation cycle',
  low_production:   'Production dropped below economic threshold',
  health_issue:     'Mastitis, injury, or other health condition requiring rest',
  pregnancy:        'Planned dry-off to prepare for upcoming calving',
  involuntary:      'Drying off ahead of schedule due to external factors',
  other:            'Other reason — specify in notes',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DryOffModal({
  animal,
  farmId,
  isOpen,
  onClose,
  onRecordCreated,
}: DryOffModalProps) {
  const { isMobile } = useDeviceInfo()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<DryOffFormData>({
    resolver: zodResolver(dryOffSchema),
    defaultValues: {
      dry_off_date: new Date().toISOString().split('T')[0],
      dry_off_reason: undefined,
      last_milk_yield: animal.current_daily_production ?? undefined,
      expected_dry_period_days: 60,
      expected_calving_date: '',
      dry_cow_therapy: false,
      treatment_notes: '',
      notes: '',
    },
  })

  const watchedReason = form.watch('dry_off_reason')
  const watchedDCT = form.watch('dry_cow_therapy')
  const watchedDryOffDate = form.watch('dry_off_date')
  const watchedDryPeriod = form.watch('expected_dry_period_days')


  // Compute expected reopen date for display
  const computedReopenDate = (() => {
    if (!watchedDryOffDate || !watchedDryPeriod) return null
    try {
      const d = new Date(watchedDryOffDate)
      d.setDate(d.getDate() + Number(watchedDryPeriod))
      return d.toISOString().split('T')[0]
    } catch {
      return null
    }
  })()

  const handleSubmit = async (data: DryOffFormData) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/animals/dry-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          animal_id: animal.id,
          dry_off_date: data.dry_off_date,
          dry_off_reason: data.dry_off_reason,
          last_milk_yield: data.last_milk_yield ?? null,
          expected_dry_period_days: data.expected_dry_period_days,
          expected_calving_date: data.expected_calving_date || null,
          dry_cow_therapy: data.dry_cow_therapy,
          treatment_notes: data.treatment_notes || null,
          notes: data.notes || null,
          update_production_status: true,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        onRecordCreated(result.production_status ?? 'dry')
      } else {
        setError(result.error || 'Failed to create dry-off record')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className={isMobile ? 'p-4' : 'p-6'}>

        {/* Header */}
        <div className={cn('flex items-start justify-between mb-5', isMobile && 'gap-3')}>
          <div className="flex items-center space-x-3">
            <div className={cn(
              'bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0',
              isMobile ? 'w-10 h-10' : 'w-12 h-12'
            )}>
              <Milk className={cn('text-yellow-600', isMobile ? 'w-5 h-5' : 'w-6 h-6')} />
            </div>
            <div>
              <h2 className={cn('font-bold text-gray-900', isMobile ? 'text-xl' : 'text-2xl')}>
                Record Dry-Off
              </h2>
              <p className="text-sm text-gray-600">
                {animal.name || animal.tag_number} — transitioning to dry period
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Info banner */}
        <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-5 text-sm text-blue-800">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <span>
            Recording this dry-off will set the animal's production status to <strong>Dry</strong> and
            clear her daily milk yield. All historical production data is preserved.
          </span>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">

          {/* Animal summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Animal</h4>
            <div className={cn('grid gap-3 text-sm', isMobile ? 'grid-cols-2' : 'grid-cols-3')}>
              <div>
                <span className="text-gray-500">Tag:</span>
                <span className="ml-2 font-medium">{animal.tag_number}</span>
              </div>
              {animal.name && (
                <div>
                  <span className="text-gray-500">Name:</span>
                  <span className="ml-2 font-medium">{animal.name}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Current status:</span>
                <span className="ml-2 font-medium capitalize">
                  {animal.production_status?.replace(/_/g, ' ') || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Dry-off date */}
          <div>
            <Label htmlFor="dry_off_date">Dry-off Date *</Label>
            <Input
              id="dry_off_date"
              type="date"
              {...form.register('dry_off_date')}
              error={form.formState.errors.dry_off_date?.message}
            />
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="dry_off_reason">Reason for Dry-off *</Label>
            <select
              id="dry_off_reason"
              {...form.register('dry_off_reason')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
            >
              <option value="">Select a reason...</option>
              {(Object.keys(DRY_OFF_REASON_LABELS) as DryOffReason[]).map(r => (
                <option key={r} value={r}>{DRY_OFF_REASON_LABELS[r]}</option>
              ))}
            </select>
            {form.formState.errors.dry_off_reason && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.dry_off_reason.message}
              </p>
            )}
            {watchedReason && (
              <p className="text-xs text-gray-500 mt-1">
                {DRY_OFF_REASON_DESCRIPTIONS[watchedReason]}
              </p>
            )}
          </div>

          {/* Production context */}
          <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
            <div>
              <Label htmlFor="last_milk_yield">Last Daily Yield (litres)</Label>
              <Input
                id="last_milk_yield"
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 12.5"
                {...form.register('last_milk_yield', {
                  setValueAs: v => v === '' || v == null ? undefined : parseFloat(v),
                })}
              />
              <p className="text-xs text-gray-500 mt-1">Yield on the last milking day</p>
            </div>

            <div>
              <Label htmlFor="expected_dry_period_days">Dry Period (days)</Label>
              <Input
                id="expected_dry_period_days"
                type="number"
                min="1"
                max="365"
                {...form.register('expected_dry_period_days', {
                  setValueAs: v => v === '' || v == null ? undefined : parseInt(v, 10),
                })}
              />
              {computedReopenDate && (
                <p className="text-xs text-gray-500 mt-1">
                  Expected reopen: <strong>{new Date(computedReopenDate).toLocaleDateString()}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Expected calving date */}
          <div>
            <Label htmlFor="expected_calving_date">
              Expected Calving Date
              </Label>
            <Input
              id="expected_calving_date"
              type="date"
              {...form.register('expected_calving_date')}
            />
            <p className="text-xs text-gray-500 mt-1">
              Pre-filled from the latest pregnancy record if available
            </p>
          </div>

          {/* Dry cow therapy */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-3">
              <input
                id="dry_cow_therapy"
                type="checkbox"
                {...form.register('dry_cow_therapy')}
                className="w-4 h-4 accent-farm-green"
              />
              <label htmlFor="dry_cow_therapy" className="text-sm font-medium text-gray-700 cursor-pointer">
                Dry Cow Therapy (DCT) administered
              </label>
            </div>

            {watchedDCT && (
              <div>
                <Label htmlFor="treatment_notes">Treatment Details</Label>
                <textarea
                  id="treatment_notes"
                  {...form.register('treatment_notes')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-farm-green"
                  placeholder="e.g. Antibiotic dry cow tubes × 4, teat sealant applied..."
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green"
              placeholder="Any observations or special instructions..."
            />
          </div>

          {/* Actions */}
          <div className={cn('flex gap-3 pt-4 border-t', isMobile ? 'flex-col-reverse' : 'justify-end')}>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Milk className="mr-2 h-4 w-4" />
                  Record Dry-Off
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
