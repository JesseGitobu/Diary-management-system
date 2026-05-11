'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Gauge } from 'lucide-react'
import { Modal, Field, Input, Textarea } from './shared'

export function UsageLogModal({ open, onClose, equipment }: { open: boolean; onClose: () => void; equipment: any }) {
  const [form, setForm] = useState({ date: '', hours: '', fuelUsed: '', task: '', notes: '' })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title="Log Usage" icon={Gauge} accentColor="slate"
      footer={<Button size="sm" className="bg-slate-700 hover:bg-slate-800 text-white" onClick={onClose}>Save Usage Log</Button>}>
      <Field label="Log Date" required><Input type="date" value={form.date} onChange={set('date')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hours Run (this session)"><Input type="number" placeholder="e.g. 4.5" value={form.hours} onChange={set('hours')} /></Field>
        <Field label="Fuel Consumed (L)"><Input type="number" placeholder="e.g. 38" value={form.fuelUsed} onChange={set('fuelUsed')} /></Field>
      </div>
      {equipment?.odometer_hours !== undefined && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Current meter reading</span>
          <span className="font-bold text-slate-800">{equipment.odometer_hours.toLocaleString()} h</span>
        </div>
      )}
      <Field label="Task / Job Reference"><Input placeholder="e.g. Ploughing — South Field" value={form.task} onChange={set('task')} /></Field>
      <Field label="Operational Notes"><Textarea placeholder="Observations during operation…" value={form.notes} onChange={set('notes')} /></Field>
    </Modal>
  )
}
