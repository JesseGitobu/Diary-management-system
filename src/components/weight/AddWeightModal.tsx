// src/components/weight/AddWeightModal.tsx
'use client'

import { useState } from 'react'
import { X, Scale, Calendar, User, FileText, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AnimalWeightSummary, WeightRecord } from '@/types/weight'

interface AddWeightModalProps {
  isOpen: boolean
  onClose: () => void
  animal: AnimalWeightSummary
  farmId: string  // ✅ NEW: Farm ID needed for creating weight records
  onWeightAdded: (record: WeightRecord) => void
}

const MEASUREMENT_METHODS = [
  { value: 'scale', label: 'Weighing Scale', icon: '⚖️' },
  { value: 'tape_measure', label: 'Weight Tape', icon: '📏' },
  { value: 'visual_estimate', label: 'Visual Estimate', icon: '👁️' },
] as const

export function AddWeightModal({ isOpen, onClose, animal, farmId, onWeightAdded }: AddWeightModalProps) {
  const [weight, setWeight] = useState<string>('')
  const [method, setMethod] = useState<'scale' | 'tape_measure' | 'visual_estimate'>('scale')
  const [bcs, setBcs] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [recordedBy, setRecordedBy] = useState('')
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const validate = () => {
    const e: Record<string, string> = {}
    const w = parseFloat(weight)
    if (!weight || isNaN(w) || w <= 0) e.weight = 'Enter a valid weight (kg)'
    if (w > 2000) e.weight = 'Weight seems too high. Please verify.'
    if (w < 1) e.weight = 'Weight seems too low. Please verify.'
    if (bcs !== '' && (Number(bcs) < 1 || Number(bcs) > 5)) e.bcs = 'BCS must be between 1 and 5'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setSaving(true)
    try {
      // Extract date from recordedAt (ISO datetime to date)
      const weightDate = new Date(recordedAt).toISOString().split('T')[0]
      
      // Prepare payload for the API
      const payload = {
        farm_id: farmId,
        animal_id: animal.animal_id,
        weight_date: weightDate,
        weight_kg: parseFloat(weight),
        weight_unit: 'kg',
        measurement_purpose: null,  // Can be extended if needed
        measured_by: recordedBy || null,
        method: method,
        body_condition_score: bcs !== '' ? parseFloat(String(bcs)) : null,
        notes: notes || null,
      }

      console.log('[DEBUG AddWeightModal] Saving weight record:', payload)

      // Call API to save weight record
      const response = await fetch('/api/weight-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[DEBUG AddWeightModal] API Error:', errorData)
        throw new Error(errorData.error || 'Failed to save weight record')
      }

      const result = await response.json()
      console.log('[DEBUG AddWeightModal] Weight record saved:', result)

      // Create record object for local state update
      const record: WeightRecord = {
        id: result.id || `wr-${Date.now()}`,
        animal_id: animal.animal_id,
        weight_kg: parseFloat(weight),
        recorded_at: new Date(recordedAt).toISOString(),
        recorded_by: recordedBy || undefined,
        method,
        notes: notes || undefined,
        body_condition_score: bcs !== '' ? Number(bcs) : undefined,
      }

      onWeightAdded(record)
      onClose()
    } catch (error: any) {
      console.error('[DEBUG AddWeightModal] Error saving weight record:', error)
      setErrors({ save: error.message || 'Failed to save weight record' })
    } finally {
      setSaving(false)
    }
  }

  const weightNum = parseFloat(weight)
  const weightDiff = !isNaN(weightNum) && animal.current_weight
    ? weightNum - animal.current_weight
    : null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
              <Scale className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Record Weight</h2>
              <p className="text-xs text-gray-500">
                {animal.name || `Tag #${animal.tag_number}`} &bull; #{animal.tag_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-white/80 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white transition-all shadow-sm"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Current weight reference */}
        {animal.current_weight && (
          <div className="mx-5 mt-4 p-3 bg-blue-50 rounded-xl flex items-center justify-between">
            <span className="text-xs text-blue-700 font-medium">Last recorded weight</span>
            <span className="text-sm font-bold text-blue-900">{animal.current_weight} kg</span>
          </div>
        )}

        {/* Error message */}
        {errors.save && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs text-red-700">{errors.save}</p>
          </div>
        )}

        <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Weight Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Weight (kg) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="2000"
                step="0.1"
                value={weight}
                onChange={e => { setWeight(e.target.value); setErrors(prev => ({ ...prev, weight: '' })) }}
                placeholder="Enter weight in kg..."
                className={`w-full px-4 py-3 pr-16 rounded-xl border text-sm font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500
                  ${errors.weight ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">kg</span>
            </div>
            {errors.weight && <p className="text-xs text-red-500 mt-1">{errors.weight}</p>}
            {/* Live diff indicator */}
            {weightDiff !== null && weight && (
              <div className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium
                ${weightDiff > 0 ? 'text-emerald-600' : weightDiff < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                <span>{weightDiff > 0 ? '▲' : weightDiff < 0 ? '▼' : '–'}</span>
                <span>
                  {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} kg vs last measurement
                  {animal.current_weight && ` (${((weightDiff / animal.current_weight) * 100).toFixed(1)}%)`}
                </span>
              </div>
            )}
          </div>

          {/* Measurement Method */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Measurement Method</label>
            <div className="grid grid-cols-3 gap-2">
              {MEASUREMENT_METHODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs font-medium transition-all
                    ${method === m.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
                >
                  <span className="text-base">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body Condition Score */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Body Condition Score (1–5)
              <span className="ml-1 font-normal text-gray-400">optional</span>
            </label>
            <div className="flex gap-2">
              {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(score => (
                <button
                  key={score}
                  onClick={() => setBcs(bcs === score ? '' : score)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border
                    ${bcs === score
                      ? score <= 2 ? 'bg-red-500 border-red-500 text-white'
                        : score <= 3 ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  {score}
                </button>
              ))}
            </div>
            {bcs !== '' && (
              <p className="text-xs mt-1 text-gray-500">
                {Number(bcs) <= 1.5 ? '🔴 Severely thin' :
                  Number(bcs) <= 2.5 ? '🟠 Thin – needs attention' :
                  Number(bcs) <= 3.5 ? '🟢 Ideal condition' :
                  Number(bcs) <= 4.5 ? '🟡 Moderately over-conditioned' :
                  '🔴 Obese – review diet'}
              </p>
            )}
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              <Calendar className="inline h-3 w-3 mr-1" />
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={recordedAt}
              max={new Date().toISOString().slice(0, 16)}
              onChange={e => setRecordedAt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm
                focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white"
            />
          </div>

          {/* Recorded By */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              <User className="inline h-3 w-3 mr-1" />
              Recorded By
              <span className="ml-1 font-normal text-gray-400">optional</span>
            </label>
            <input
              type="text"
              value={recordedBy}
              onChange={e => setRecordedBy(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm
                focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              <FileText className="inline h-3 w-3 mr-1" />
              Notes
              <span className="ml-1 font-normal text-gray-400">optional</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any observations or context..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !weight}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Scale className="h-3.5 w-3.5" />
                Save Weight
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}