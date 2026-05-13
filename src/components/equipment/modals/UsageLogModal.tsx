'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Gauge, Search, AlertCircle, Loader2 } from 'lucide-react'
import { Modal, Field, Input, Textarea } from './shared'
import { cn } from '@/lib/utils/cn'

interface CheckSession {
  id: string
  equipment_id: string
  equipment?: { name: string }
  worker?: { name: string }
  purpose?: string
  checkout_at?: string
  checkin_at?: string
  fuel_level_before_pct?: number
  fuel_level_after_pct?: number
  condition_on_return?: string
}

export function UsageLogModal({ open, onClose, equipment }: { open: boolean; onClose: () => void; equipment: any }) {
  const [form, setForm] = useState({ date: '', hours: '', fuelUsed: '', task: '', notes: '', odometerReading: '' })
  const [sessions, setSessions] = useState<CheckSession[]>([])
  const [selectedSession, setSelectedSession] = useState<CheckSession | null>(null)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sessionSearch, setSessionSearch] = useState('')
  const [sessionSearchOpen, setSessionSearchOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors(prev => { const { [k]: _, ...rest } = prev; return rest })
  }

  // Fetch completed check-in/check-out sessions
  useEffect(() => {
    if (!open) return

    const fetchSessions = async () => {
      setLoadingSessions(true)
      console.log('📋 [Modal] Fetching completed check sessions...')
      try {
        const response = await fetch('/api/equipment/check-sessions?include_completed=true')
        console.log('🔄 [Modal] API Response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch sessions: ${response.statusText}`)
        }
        
        const result = await response.json()
        console.log('✅ [Modal] Sessions received:', result.data?.length || 0)
        console.log('📊 [Modal] Sample session:', result.data?.[0])
        
        setSessions(result.data || [])
      } catch (error) {
        console.error('❌ [Modal] Failed to fetch check sessions:', error)
        setSessions([])
      } finally {
        setLoadingSessions(false)
      }
    }

    fetchSessions()
  }, [open])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setForm({ date: '', hours: '', fuelUsed: '', task: '', notes: '', odometerReading: '' })
      setSelectedSession(null)
      setSessionSearch('')
      setSessionSearchOpen(false)
      setErrors({})
    }
  }, [open])

  const handleSessionSelect = (session: CheckSession) => {
    setSelectedSession(session)
    setForm(f => ({
      ...f,
      task: session.purpose || '',
      date: session.checkin_at ? new Date(session.checkin_at).toISOString().slice(0, 10) : '',
    }))
    setSessionSearchOpen(false)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    // Required field validations
    if (!selectedSession) {
      newErrors.session = 'Please select a check session'
    }
    if (!form.date) {
      newErrors.date = 'Log date is required'
    } else {
      // Validate date is not in the future
      const selectedDate = new Date(form.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate > today) {
        newErrors.date = 'Log date cannot be in the future'
      }
    }

    // Optional field validations (only if provided)
    if (form.hours) {
      const hours = parseFloat(form.hours)
      if (isNaN(hours) || hours < 0) {
        newErrors.hours = 'Hours must be a positive number'
      }
      if (hours > 999.9) {
        newErrors.hours = 'Hours cannot exceed 999.9'
      }
    }

    if (form.fuelUsed) {
      const fuel = parseFloat(form.fuelUsed)
      if (isNaN(fuel) || fuel < 0) {
        newErrors.fuelUsed = 'Fuel must be a positive number'
      }
      if (fuel > 99999.99) {
        newErrors.fuelUsed = 'Fuel amount too large'
      }
    }

    if (form.task && form.task.length > 255) {
      newErrors.task = 'Task reference cannot exceed 255 characters'
    }

    if (form.notes && form.notes.length > 5000) {
      newErrors.notes = 'Notes cannot exceed 5000 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    console.log('📝 [Modal] Submit clicked, validating form...')
    if (!validateForm()) {
      console.log('❌ [Modal] Form validation failed', errors)
      return
    }

    console.log('✅ [Modal] Form validation passed')

    try {
      const calculatedOdometerReading = equipment?.odometer_hours && form.hours 
        ? parseFloat(equipment.odometer_hours) + parseFloat(form.hours)
        : equipment?.odometer_hours || null

      const payload = {
        equipment_id: equipment?.id || selectedSession?.equipment_id,
        check_session_id: selectedSession?.id || null,
        log_date: form.date,
        hours_this_session: form.hours ? parseFloat(form.hours) : null,
        fuel_consumed_litres: form.fuelUsed ? parseFloat(form.fuelUsed) : null,
        odometer_reading_after: calculatedOdometerReading,
        task_reference: form.task?.trim() || null,
        notes: form.notes?.trim() || null,
      }

      console.log('📦 [Modal] Payload ready:', JSON.stringify(payload, null, 2))

      const response = await fetch('/api/equipment/usage-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      console.log('🔄 [Modal] API Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ [Modal] API Error:', errorData)
        throw new Error(errorData.error || 'Failed to save usage log')
      }

      console.log('✅ [Modal] Usage log saved successfully')

      // Success
      setForm({ date: '', hours: '', fuelUsed: '', task: '', notes: '', odometerReading: '' })
      setSelectedSession(null)
      onClose()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save usage log. Please try again.'
      setErrors({ submit: errorMsg })
      console.error('❌ [Modal] Submission error:', err)
    }
  }

  const filteredSessions = sessions.filter(s =>
    s.equipment?.name?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    s.worker?.name?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    s.purpose?.toLowerCase().includes(sessionSearch.toLowerCase())
  )
  return (
    <Modal open={open} onClose={onClose} title="Log Usage" icon={Gauge} accentColor="slate"
      footer={
        <div className="flex items-center gap-3">
          {errors.submit && <span className="text-xs text-rose-500 font-medium">{errors.submit}</span>}
          <Button size="sm" className="bg-slate-700 hover:bg-slate-800 text-white" onClick={handleSubmit}>Save Usage Log</Button>
        </div>
      }>
      
      {/* Check Session Selection */}
      <Field label="Select Check Session" required>
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              placeholder="Search completed sessions…"
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              onFocus={() => setSessionSearchOpen(true)}
              className={cn(
                "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all",
                errors.session ? "border-rose-300 bg-rose-50" : "border-slate-200"
              )}
            />
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
          </div>

          {sessionSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
              {loadingSessions ? (
                <div className="px-4 py-6 text-center text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Loading sessions…
                </div>
              ) : filteredSessions.length > 0 ? (
                filteredSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => handleSessionSelect(session)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0",
                      selectedSession?.id === session.id ? 'bg-slate-100 border-l-4 border-l-slate-500' : ''
                    )}
                  >
                    <div className="font-medium text-slate-900">{session.equipment?.name || 'Unknown Equipment'}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      Operator: {session.worker?.name || 'Unknown'} • {session.purpose || 'No purpose specified'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Checked in: {session.checkin_at ? new Date(session.checkin_at).toLocaleString() : 'N/A'}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-sm text-slate-500">
                  No completed sessions found
                </div>
              )}
            </div>
          )}
        </div>
        {errors.session && <p className="text-[10px] text-rose-500 mt-1 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.session}</p>}
      </Field>

      {/* Selected Session Details */}
      {selectedSession && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Equipment</p>
              <p className="font-bold text-slate-900">{selectedSession.equipment?.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Operator</p>
              <p className="font-bold text-slate-900">{selectedSession.worker?.name}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Task</p>
              <p className="text-slate-700">{selectedSession.purpose || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      <Field label="Log Date" required>
        <Input type="date" value={form.date} onChange={set('date')} />
        {errors.date && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.date}</p>}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Hours Run (this session)" required={false}>
          <Input type="number" placeholder="e.g. 4.5" value={form.hours} onChange={set('hours')} step="0.1" min="0" max="999.9" />
          <p className="text-xs text-slate-500 mt-1">Optional • Max 999.9 hours</p>
          {errors.hours && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.hours}</p>}
        </Field>
        <Field label="Fuel Consumed (L)" required={false}>
          <Input type="number" placeholder="e.g. 38.50" value={form.fuelUsed} onChange={set('fuelUsed')} step="0.01" min="0" />
          <p className="text-xs text-slate-500 mt-1">Optional • Litres</p>
          {errors.fuelUsed && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.fuelUsed}</p>}
        </Field>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Odometer Reading (Auto-Calculated)</p>
        <div className="grid grid-cols-3 gap-3 items-center">
          <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 font-medium mb-1">Previous</p>
            <p className="text-lg font-bold text-slate-900">{equipment?.odometer_hours || 0}</p>
            <p className="text-xs text-slate-400 mt-1">hours</p>
          </div>
          
          <div className="flex justify-center">
            <span className="text-slate-400 font-bold text-xl">+</span>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 font-medium mb-1">Hours Run</p>
            <p className="text-lg font-bold text-slate-900">{form.hours || 0}</p>
            <p className="text-xs text-slate-400 mt-1">hours</p>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
          <p className="text-xs text-slate-600">Total Reading</p>
          <p className="text-2xl font-bold text-emerald-600">
            {equipment?.odometer_hours && form.hours 
              ? (parseFloat(equipment.odometer_hours) + parseFloat(form.hours)).toFixed(1)
              : (equipment?.odometer_hours || 0)
            } <span className="text-sm text-slate-500">h</span>
          </p>
        </div>
      </div>

      <Field label="Task / Job Reference" required={false}>
        <Input placeholder="e.g. Ploughing — South Field" value={form.task} onChange={set('task')} maxLength={255} />
        <p className="text-xs text-slate-500 mt-1">Optional • {form.task.length}/255 characters</p>
        {errors.task && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.task}</p>}
      </Field>

      <Field label="Operational Notes" required={false}>
        <Textarea placeholder="Observations during operation…" value={form.notes} onChange={set('notes')} maxLength={5000} rows={3} />
        <p className="text-xs text-slate-500 mt-1">Optional • {form.notes.length}/5000 characters</p>
        {errors.notes && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.notes}</p>}
      </Field>
    </Modal>
  )
}
