'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { AlertCircle, CheckCircle } from 'lucide-react'
import {
  Heart,
  Syringe,
  Stethoscope,
  Baby,
  CalendarPlus,
  AlertTriangle,
  Droplets,
  User,
  Clock,
  FileText,
  CheckCircle2,
} from 'lucide-react'

interface FollowUpBreedingModalProps {
  isOpen: boolean
  onClose: () => void
  event: any
  onSubmit?: (data: any) => void
  farmId?: string
}

const eventConfig = {
  heat_detection: { icon: Heart,       color: 'bg-pink-100 text-pink-800',   title: 'Heat Detection Follow-Up' },
  insemination:   { icon: Syringe,     color: 'bg-blue-100 text-blue-800',   title: 'Insemination Follow-Up' },
  pregnancy_check:{ icon: Stethoscope, color: 'bg-green-100 text-green-800', title: 'Pregnancy Check Follow-Up' },
  calving:        { icon: Baby,        color: 'bg-yellow-100 text-yellow-800',title: 'Calving Follow-Up' },
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1 pb-0.5 border-b border-gray-100">
      {children}
    </p>
  )
}

function Field({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        {label}
      </Label>
      {children}
    </div>
  )
}

function Textarea({ value, onChange, placeholder, rows = 2 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/40 focus:border-farm-green resize-none"
    />
  )
}

function YesNoToggle({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {([true, false] as const).map(opt => (
        <button
          key={String(opt)}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 py-1.5 rounded-md border text-sm font-medium transition-colors ${
            value === opt
              ? opt
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-gray-50 border-gray-300 text-gray-700'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {opt ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  )
}

// ── Heat Detection Follow-Up ──────────────────────────────────────────────────
function HeatFollowUp({ action, formData, onChange }: { 
  action: string
  formData: any
  onChange: (field: string, value: any) => void
}) {
  const isInsemination  = action === 'Insemination scheduled'
  const isNaturalBreed  = action === 'Natural breeding arranged'
  const isMonitor       = action === 'Monitor further'
  const isVet           = action === 'Vet consultation needed'

  return (
    <div className="space-y-4">
      {isInsemination && (
        <>
          <SectionHeading>Insemination Scheduling</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Insemination Date" icon={CalendarPlus}>
              <Input type="date" value={formData.insemination_date || ''} onChange={e => onChange('insemination_date', e.target.value)} />
            </Field>
            <Field label="Insemination Time" icon={Clock}>
              <Input type="time" value={formData.insemination_time || ''} onChange={e => onChange('insemination_time', e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange('insemination_confirmed', !formData.insemination_confirmed)}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.insemination_confirmed ? 'bg-farm-green border-farm-green' : 'border-gray-300'}`}>
                {formData.insemination_confirmed && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              Insemination confirmed
            </button>
          </div>
        </>
      )}

      {isNaturalBreed && (
        <>
          <SectionHeading>Natural Breeding Window</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Breeding Start" icon={Clock}>
              <Input type="datetime-local" value={formData.breeding_start || ''} onChange={e => onChange('breeding_start', e.target.value)} />
            </Field>
            <Field label="Breeding End" icon={Clock}>
              <Input type="datetime-local" value={formData.breeding_end || ''} onChange={e => onChange('breeding_end', e.target.value)} />
            </Field>
          </div>
        </>
      )}

      {isMonitor && (
        <>
          <SectionHeading>Monitoring Plan</SectionHeading>
          <Field label="Next Step" icon={CalendarPlus}>
            <div className="flex gap-2">
              {(['next_heat', 'other'] as const).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange('monitoring_plan', opt)}
                  className={`flex-1 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                    formData.monitoring_plan === opt
                      ? 'bg-farm-green/10 border-farm-green text-farm-green'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {opt === 'next_heat' ? 'Wait for Next Heat Cycle' : 'Other Options'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Ovulation Date" icon={CalendarPlus}>
            <Input type="date" value={formData.ovulation_date || ''} onChange={e => onChange('ovulation_date', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ovulation Start Time" icon={Clock}>
              <Input type="time" value={formData.ovulation_start || ''} onChange={e => onChange('ovulation_start', e.target.value)} />
            </Field>
            <Field label="Ovulation End Time" icon={Clock}>
              <Input type="time" value={formData.ovulation_end || ''} onChange={e => onChange('ovulation_end', e.target.value)} />
            </Field>
          </div>
        </>
      )}

      {isVet && (
        <>
          <SectionHeading>Vet Consultation</SectionHeading>
          <Field label="Medical Issue" icon={AlertTriangle}>
            <Textarea value={formData.medical_issue || ''} onChange={v => onChange('medical_issue', v)} placeholder="Describe the medical issue..." />
          </Field>
          <Field label="Veterinarian" icon={User}>
            <Input
              value={formData.vet_name || ''}
              onChange={e => onChange('vet_name', e.target.value)}
              placeholder="Vet name or clinic"
            />
          </Field>
          <Field label="Vet Observation" icon={FileText}>
            <Textarea value={formData.vet_observation || ''} onChange={v => onChange('vet_observation', v)} placeholder="Vet observations and recommendations..." />
          </Field>
        </>
      )}

      <SectionHeading>Observation Notes</SectionHeading>
      <Field label="Notes" icon={FileText}>
        <Textarea value={formData.notes || ''} onChange={v => onChange('notes', v)} placeholder="General observations..." rows={3} />
      </Field>
    </div>
  )
}

// ── Insemination Follow-Up ────────────────────────────────────────────────────
function InseminationFollowUp({ formData, onChange }: {
  formData: any
  onChange: (field: string, value: any) => void
}) {
  return (
    <div className="space-y-4">
      <SectionHeading>Ovulation Details</SectionHeading>
      <Field label="Ovulation Date" icon={CalendarPlus}>
        <Input type="date" value={formData.ovulation_date || ''} onChange={e => onChange('ovulation_date', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ovulation Start Time" icon={Clock}>
          <Input type="time" value={formData.ovulation_start || ''} onChange={e => onChange('ovulation_start', e.target.value)} />
        </Field>
        <Field label="Ovulation End Time" icon={Clock}>
          <Input type="time" value={formData.ovulation_end || ''} onChange={e => onChange('ovulation_end', e.target.value)} />
        </Field>
      </div>
      <Field label="Ovulation Amount (ml)" icon={Droplets}>
        <Input
          type="number"
          min="0"
          step="0.1"
          value={formData.ovulation_amount || ''}
          onChange={e => onChange('ovulation_amount', e.target.value)}
          placeholder="e.g. 2.5"
        />
      </Field>

      <SectionHeading>Medical Issues</SectionHeading>
      <Field label="Any medical issues?" icon={AlertTriangle}>
        <YesNoToggle value={formData.has_medical_issue ?? null} onChange={v => onChange('has_medical_issue', v)} />
      </Field>
      {formData.has_medical_issue && (
        <Field label="Describe the issue" icon={FileText}>
          <Textarea value={formData.medical_issue || ''} onChange={v => onChange('medical_issue', v)} placeholder="Describe the medical issue..." />
        </Field>
      )}

      <SectionHeading>Observation Notes</SectionHeading>
      <Field label="Notes" icon={FileText}>
        <Textarea value={formData.notes || ''} onChange={v => onChange('notes', v)} placeholder="General observations..." rows={3} />
      </Field>
    </div>
  )
}

// ── Pregnancy Check Follow-Up ─────────────────────────────────────────────────
function PregnancyCheckFollowUp({ result, formData, onChange }: { 
  result: string
  formData: any
  onChange: (field: string, value: any) => void
}) {
  const passed = result === 'pregnant' || result === 'uncertain'

  return (
    <div className="space-y-4">
      {passed ? (
        <>
          <SectionHeading>Pregnancy Management</SectionHeading>
          <Field label="Steaming Date" icon={CalendarPlus}>
            <Input type="date" value={formData.steaming_date || ''} onChange={e => onChange('steaming_date', e.target.value)} />
          </Field>
          <Field label="Next Pregnancy Check Date (optional)" icon={CalendarPlus}>
            <Input type="date" value={formData.next_check_date || ''} onChange={e => onChange('next_check_date', e.target.value)} />
          </Field>
        </>
      ) : (
        <>
          <SectionHeading>Failed Check — Next Steps</SectionHeading>
          <Field label="Next Heat Cycle Expected Date" icon={CalendarPlus}>
            <Input type="date" value={formData.next_heat_date || ''} onChange={e => onChange('next_heat_date', e.target.value)} />
          </Field>
          <Field label="Next Pregnancy Check Date (required)" icon={CalendarPlus}>
            <Input type="date" value={formData.next_check_date || ''} onChange={e => onChange('next_check_date', e.target.value)} />
          </Field>
        </>
      )}

      <SectionHeading>Observation Notes</SectionHeading>
      <Field label="Notes" icon={FileText}>
        <Textarea value={formData.notes || ''} onChange={v => onChange('notes', v)} placeholder="Record your observations..." rows={3} />
      </Field>
    </div>
  )
}

// ── Calving Follow-Up ─────────────────────────────────────────────────────────
function CalvingFollowUp({ formData, onChange }: {
  formData: any
  onChange: (field: string, value: any) => void
}) {
  return (
    <div className="space-y-4">
      <SectionHeading>Placenta Status</SectionHeading>
      <Field label="Placenta expelled?" icon={Baby}>
        <YesNoToggle value={formData.placenta_expelled ?? null} onChange={v => onChange('placenta_expelled', v)} />
      </Field>
      {formData.placenta_expelled && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date expelled" icon={CalendarPlus}>
            <Input type="date" value={formData.placenta_date || ''} onChange={e => onChange('placenta_date', e.target.value)} />
          </Field>
          <Field label="Time expelled" icon={Clock}>
            <Input type="time" value={formData.placenta_time || ''} onChange={e => onChange('placenta_time', e.target.value)} />
          </Field>
        </div>
      )}

      <SectionHeading>Medical Issues</SectionHeading>
      <Field label="Any medical issues?" icon={AlertTriangle}>
        <YesNoToggle value={formData.has_medical_issue ?? null} onChange={v => onChange('has_medical_issue', v)} />
      </Field>
      {formData.has_medical_issue && (
        <Field label="Describe the issue" icon={FileText}>
          <Textarea value={formData.medical_issue || ''} onChange={v => onChange('medical_issue', v)} placeholder="Describe the medical issue..." />
        </Field>
      )}

      <SectionHeading>Observation Notes</SectionHeading>
      <Field label="Notes" icon={FileText}>
        <Textarea value={formData.notes || ''} onChange={v => onChange('notes', v)} placeholder="Post-calving observations..." rows={3} />
      </Field>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export function FollowUpBreedingModal({ isOpen, onClose, event, onSubmit, farmId }: FollowUpBreedingModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!event) return null

  const config  = eventConfig[event.event_type as keyof typeof eventConfig]
  if (!config) return null

  const Icon    = config.icon
  const eventDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async () => {
    if (!farmId) {
      setError('Farm ID is required')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/breeding-follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          farm_id: farmId,
          followUpData: formData
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save follow-up')
      }

      setSuccess(true)
      console.log('✅ Follow-up saved successfully:', result.followUp)

      // Call parent callback if provided
      onSubmit?.({
        event_id: event.id,
        event_type: event.event_type,
        followUp: result.followUp
      })

      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose()
        setFormData({})
        setSuccess(false)
      }, 1500)

    } catch (err: any) {
      console.error('Error saving follow-up:', err)
      setError(err.message || 'An error occurred while saving')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="">
      <div className="px-4 pb-4 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 pt-1">
          <div className={`rounded-full p-2 flex-shrink-0 ${config.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{config.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {event.animals?.tag_number && (
                <Badge className="text-xs bg-gray-100 text-gray-600 border-0">
                  #{event.animals.tag_number}
                </Badge>
              )}
              {event.animals?.name && (
                <span className="text-xs text-gray-500">{event.animals.name}</span>
              )}
              {eventDate && (
                <span className="text-xs text-gray-400">· {eventDate}</span>
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-green-700">Follow-up saved successfully!</p>
          </div>
        )}

        {/* Dynamic form body */}
        <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-0.5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>

          {event.event_type === 'heat_detection' && (
            <HeatFollowUp action={event.heat_action_taken ?? ''} formData={formData} onChange={handleFieldChange} />
          )}

          {event.event_type === 'insemination' && (
            <InseminationFollowUp formData={formData} onChange={handleFieldChange} />
          )}

          {event.event_type === 'pregnancy_check' && (
            <PregnancyCheckFollowUp result={event.pregnancy_result ?? ''} formData={formData} onChange={handleFieldChange} />
          )}

          {event.event_type === 'calving' && (
            <CalvingFollowUp formData={formData} onChange={handleFieldChange} />
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-1 border-t border-gray-100">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-farm-green hover:bg-farm-green/90 text-white disabled:opacity-50"
            onClick={handleSubmit}
            disabled={isSubmitting || success}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : success ? (
              'Saved!'
            ) : (
              'Save Follow-Up'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
