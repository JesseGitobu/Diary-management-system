'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { LogOut, LogIn, Search, AlertCircle, Loader2 } from 'lucide-react'
import { Modal, Field, Input, Select, Textarea } from './shared'
import { cn } from '@/lib/utils/cn'

interface Assignment {
  id: string
  equipmentName: string
  equipmentId: string
  operator: string
  staffId: string
  role: string
  dateOut: string
  expectedIn: string
}

export function CheckInCheckOutModal({ open, onClose, equipment, initialMode = 'out' }: { open: boolean; onClose: () => void; equipment: any; initialMode?: 'out' | 'in' }) {
  const [mode, setMode] = useState<'out' | 'in'>(initialMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [form, setForm] = useState({ 
    purpose: '', 
    location: '', 
    fuelBefore: '', 
    fuelAfter: '', 
    conditionReturn: 'Good', 
    damageNotes: '' 
  })

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [assignmentSearchOpen, setAssignmentSearchOpen] = useState(false)
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  
  // Check-in specific state
  const [checkOutSessions, setCheckOutSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [sessionSearch, setSessionSearch] = useState('')
  const [sessionSearchOpen, setSessionSearchOpen] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    // Clear error when user types
    if (errors[k]) setErrors(prev => {
      const { [k]: _, ...rest } = prev
      return rest
    })
  }

  // Reset mode when modal opens
  useEffect(() => {
    if (open) {
      setMode(initialMode)
    }
  }, [open, initialMode])

  // Fetch active assignments when modal opens in check-out mode
  useEffect(() => {
    if (!open || mode !== 'out') return

    const fetchAssignments = async () => {
      setLoadingAssignments(true)
      try {
        const response = await fetch('/api/equipment-assignments?active_only=true')
        if (!response.ok) throw new Error('Failed to fetch')
        const result = await response.json()
        const transformed = (result.data || []).map((asgn: any) => ({
          id: asgn.id,
          equipmentName: asgn.equipment?.name || 'Unknown',
          equipmentId: asgn.equipment_id,
          operator: asgn.worker?.name || 'Unknown',
          staffId: asgn.staff_id,
          role: asgn.role,
          dateOut: asgn.date_out,
          expectedIn: asgn.expected_return,
        }))
        setAssignments(transformed)
      } catch (error) {
        setAssignments([])
      } finally {
        setLoadingAssignments(false)
      }
    }
    fetchAssignments()
  }, [open, mode])

  // Fetch check-out sessions when modal opens in check-in mode
  useEffect(() => {
    if (!open || mode !== 'in') return

    const fetchCheckOutSessions = async () => {
      setLoadingSessions(true)
      try {
        const response = await fetch('/api/equipment/check-sessions?include_checked_in=false')
        if (!response.ok) throw new Error('Failed to fetch sessions')
        const result = await response.json()
        setCheckOutSessions(result.data || [])
      } catch (error) {
        console.error('Failed to fetch check-out sessions:', error)
        setCheckOutSessions([])
      } finally {
        setLoadingSessions(false)
      }
    }
    fetchCheckOutSessions()
  }, [open, mode])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (mode === 'out' && !selectedAssignment) newErrors.assignment = 'Please select an assignment'
    if (mode === 'in' && !selectedSession) newErrors.session = 'Please select a checked-out equipment'
    if (!form.purpose.trim() && mode === 'out') newErrors.purpose = 'Purpose is required'
    if (!form.fuelBefore && mode === 'out') newErrors.fuelBefore = 'Fuel level is required'
    if (!form.fuelAfter && mode === 'in') newErrors.fuelAfter = 'Fuel level at return is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      // Build payload based on mode
      let payload: any = {
        equipment_id: selectedAssignment?.equipmentId || selectedSession?.equipment_id || equipment?.id,
        type: mode,
      }

      if (mode === 'out') {
        payload = {
          ...payload,
          assignment_id: selectedAssignment?.id,
          staff_id: selectedAssignment?.staffId, // Worker ID for checked_out_by FK
          purpose: form.purpose,
          location: form.location || null,
          fuel_level_before_pct: Number(form.fuelBefore),
        }
      } else {
        // Check-in mode
        payload = {
          ...payload,
          session_id: selectedSession?.id,
          fuel_level_after_pct: Number(form.fuelAfter),
          condition_on_return: form.conditionReturn.toLowerCase(),
          damage_notes: form.damageNotes || null,
        }
      }

      const res = await fetch('/api/equipment/check-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Submission failed')
      }

      // Success logic
      setForm({ purpose: '', location: '', fuelBefore: '', fuelAfter: '', conditionReturn: 'Good', damageNotes: '' })
      setSelectedAssignment(null)
      setSelectedSession(null)
      onClose()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save check session. Please try again.'
      console.error('❌ Submission error:', err)
      setErrors({ submit: errorMsg })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredAssignments = assignments.filter(a =>
    a.equipmentName.toLowerCase().includes(assignmentSearch.toLowerCase()) ||
    a.operator.toLowerCase().includes(assignmentSearch.toLowerCase())
  )

  const filteredSessions = checkOutSessions.filter(s =>
    s.equipment?.name?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    s.worker?.name?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    s.purpose?.toLowerCase().includes(sessionSearch.toLowerCase())
  )

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title={mode === 'out' ? "Equipment Check-Out" : "Equipment Check-In"} 
      icon={mode === 'out' ? LogOut : LogIn} 
      accentColor="emerald"
      footer={
        <div className="flex items-center gap-3">
          {errors.submit && <span className="text-xs text-rose-500 font-medium">{errors.submit}</span>}
          <Button 
            size="sm" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm {mode === 'out' ? 'Check-Out' : 'Check-In'}
          </Button>
        </div>
      }
    >
      {/* Mode Switcher */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-4">
        {['out','in'].map(m => (
          <button 
            key={m} 
            onClick={() => { setMode(m as 'out' | 'in'); setErrors({}); }}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
              mode === m ? 'bg-white shadow text-slate-900' : 'text-slate-500'
            )}
          >
            Check {m === 'out' ? 'Out' : 'In'}
          </button>
        ))}
      </div>

      {/* CHECK-OUT MODE: Assignment Selection */}
      {mode === 'out' && (
        <div className="space-y-4 mb-6">
          <Field label="Select Equipment Assignment" required>
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search active assignments…"
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  onFocus={() => setAssignmentSearchOpen(true)}
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all",
                    errors.assignment ? "border-rose-300 bg-rose-50" : "border-slate-200"
                  )}
                />
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>

              {assignmentSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  {loadingAssignments ? (
                    <div className="p-4 text-center text-xs text-slate-500">Loading assignments...</div>
                  ) : filteredAssignments.length > 0 ? (
                    filteredAssignments.map((asgn) => (
                      <button
                        key={asgn.id}
                        type="button"
                        onClick={() => {
                          setSelectedAssignment(asgn)
                          setAssignmentSearchOpen(false)
                          setErrors(prev => { const { assignment, ...rest } = prev; return rest; })
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-slate-50 last:border-0"
                      >
                        <p className="font-bold text-slate-900 text-sm">{asgn.equipmentName}</p>
                        <p className="text-xs text-slate-500">Operator: {asgn.operator} ({asgn.role})</p>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">No active assignments found</div>
                  )}
                </div>
              )}
            </div>
            {errors.assignment && <p className="text-[10px] text-rose-500 mt-1 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.assignment}</p>}
          </Field>

          {selectedAssignment && (
              <div className="mt-3 space-y-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Equipment</p>
                  <p className="font-bold text-slate-900">{selectedAssignment.equipmentName}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Operator</p>
                    <p className="font-bold text-slate-900">{selectedAssignment.operator}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</p>
                    <p className="font-bold text-slate-900 capitalize">{selectedAssignment.role.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned Out</p>
                    <p className="text-sm text-slate-700">{new Date(selectedAssignment.dateOut).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expected Return</p>
                    <p className="text-sm text-slate-700">{selectedAssignment.expectedIn ? new Date(selectedAssignment.expectedIn).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not specified'}</p>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      {/* CHECK-IN MODE: Session Selection */}
      {mode === 'in' && (
        <div className="space-y-4 mb-6">
          <Field label="Select Checked-Out Equipment" required>
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search checked-out equipment…"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  onFocus={() => setSessionSearchOpen(true)}
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                    errors.session ? "border-rose-300 bg-rose-50" : "border-slate-200"
                  )}
                />
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>

              {sessionSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  {loadingSessions ? (
                    <div className="p-4 text-center text-xs text-slate-500">Loading checked-out equipment...</div>
                  ) : filteredSessions.length > 0 ? (
                    filteredSessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => {
                          setSelectedSession(session)
                          setSessionSearchOpen(false)
                          setErrors(prev => { const { session: _, ...rest } = prev; return rest; })
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50 last:border-0"
                      >
                        <p className="font-bold text-slate-900 text-sm">{session.equipment?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">Checked out by: {session.worker?.name || 'Unknown'}</p>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">No checked-out equipment found</div>
                  )}
                </div>
              )}
            </div>
            {errors.session && <p className="text-[10px] text-rose-500 mt-1 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.session}</p>}
          </Field>

          {selectedSession && (
            <div className="mt-3 space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Equipment</p>
                <p className="font-bold text-slate-900">{selectedSession.equipment?.name || 'Unknown'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Checked Out By</p>
                  <p className="font-bold text-slate-900">{selectedSession.worker?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Purpose</p>
                  <p className="font-bold text-slate-900 text-sm">{selectedSession.purpose || 'Not specified'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Checkout Time</p>
                  <p className="text-sm text-slate-700">{new Date(selectedSession.checkout_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Location Used</p>
                  <p className="text-sm text-slate-700">{selectedSession.location_used || 'Not specified'}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Fuel Before</p>
                <p className="text-sm font-bold text-slate-900">{selectedSession.fuel_level_before_pct || 0}%</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHECK-OUT MODE: Checkout Form Fields */}
      {mode === 'out' && (
        <div className="space-y-4 mb-4">
          <Field label="Purpose / Task" required><Input placeholder="e.g. Silage harvesting — Field B" value={form.purpose} onChange={set('purpose')} /></Field>

          <Field label="Location Used (Optional)">
            <Input placeholder="e.g. Field A, North Paddock" value={form.location} onChange={set('location')} />
          </Field>

          <Field label="Fuel at checkout (%)" required>
            <Input type="number" min={0} max={100} placeholder="75" value={form.fuelBefore} onChange={set('fuelBefore')} />
          </Field>
        </div>
      )}

      {/* CHECK-IN MODE: Checkin Form Fields */}
      {mode === 'in' && (
        <div className="space-y-4">
          <Field label="Fuel at return (%)" required>
            <Input type="number" min={0} max={100} placeholder="40" value={form.fuelAfter} onChange={set('fuelAfter')} />
          </Field>

          <Field label="Condition on Return">
            <Select value={form.conditionReturn} onChange={set('conditionReturn')}>
              <option>Excellent</option>
              <option>Good</option>
              <option>Fair</option>
              <option>Damaged</option>
            </Select>
          </Field>

          <Field label="Notes / Issues">
            <Textarea placeholder="Describe any issues found…" value={form.damageNotes} onChange={set('damageNotes')} />
          </Field>
        </div>
      )}
    </Modal>
  )
}