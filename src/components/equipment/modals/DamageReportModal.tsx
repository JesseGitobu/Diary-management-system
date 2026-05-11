'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'
import { Modal, Field, Input, Select, Textarea } from './shared'

export function DamageReportModal({ open, onClose, equipment }: { open: boolean; onClose: () => void; equipment: any }) {
  const [form, setForm] = useState({ description: '', urgency: '', discoveredBy: '', discoveredDate: '', workOrder: false, notes: '' })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: 'checked' in (e.target as HTMLInputElement) && typeof (e.target as HTMLInputElement).checked !== 'undefined' ? (e.target as HTMLInputElement).checked : e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title="Damage Report" icon={AlertTriangle} accentColor="rose"
      footer={<Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white" onClick={onClose}>Submit Report</Button>}>
      <Field label="Damage Description" required>
        <Textarea placeholder="Describe the damage or issue in detail…" value={form.description} onChange={set('description')} />
      </Field>
      <Field label="Urgency Level" required>
        <Select value={form.urgency} onChange={set('urgency')}>
          <option value="">Select urgency…</option>
          <option>Low — Monitor only</option>
          <option>Medium — Schedule repair soon</option>
          <option>High — Repair within 48h</option>
          <option>Critical — Take out of service immediately</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Discovered By"><Input placeholder="Staff name" value={form.discoveredBy} onChange={set('discoveredBy')} /></Field>
        <Field label="Date Discovered"><Input type="date" value={form.discoveredDate} onChange={set('discoveredDate')} /></Field>
      </div>
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" className="w-4 h-4 rounded accent-rose-600" checked={form.workOrder} onChange={set('workOrder')} />
        <span className="text-sm text-slate-700 font-medium">Automatically create a work order for this damage</span>
      </label>
      <Field label="Additional Notes"><Textarea placeholder="Any additional context…" value={form.notes} onChange={set('notes')} /></Field>
    </Modal>
  )
}
