'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CalendarClock, AlertTriangle } from 'lucide-react'
import { Modal, Field, Input, Textarea } from './shared'

export function BookingReservationModal({ open, onClose, equipment }: { open: boolean; onClose: () => void; equipment: any }) {
  const [form, setForm] = useState({ start: '', end: '', purpose: '', reservedBy: '', notes: '' })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const hasConflict = form.start && form.end // mock: always flag if both dates filled for demo
  return (
    <Modal open={open} onClose={onClose} title="Book / Reserve Equipment" icon={CalendarClock} accentColor="blue"
      footer={<Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onClose}>Confirm Booking</Button>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date & Time" required><Input type="datetime-local" value={form.start} onChange={set('start')} /></Field>
        <Field label="End Date & Time" required><Input type="datetime-local" value={form.end} onChange={set('end')} /></Field>
      </div>
      {hasConflict && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Check for existing bookings during this period before confirming.</span>
        </div>
      )}
      <Field label="Purpose / Job" required><Input placeholder="e.g. Ploughing — East Block" value={form.purpose} onChange={set('purpose')} /></Field>
      <Field label="Reserved By"><Input placeholder="Staff name" value={form.reservedBy} onChange={set('reservedBy')} /></Field>
      <Field label="Notes"><Textarea placeholder="Additional details…" value={form.notes} onChange={set('notes')} /></Field>
    </Modal>
  )
}
