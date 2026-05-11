'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Trash2 } from 'lucide-react'
import { Modal, Field, Input, Select, Textarea } from './shared'

export function DisposalModal({ open, onClose, equipment }: { open: boolean; onClose: () => void; equipment: any }) {
  const [form, setForm] = useState({ method: '', saleValue: '', disposalDate: '', buyer: '', reason: '', confirm: false })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: 'checked' in (e.target as HTMLInputElement) && (e.target as HTMLInputElement).type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))
  return (
    <Modal open={open} onClose={onClose} title="Dispose / Retire Asset" icon={Trash2} accentColor="rose"
      footer={<Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white" disabled={!form.confirm} onClick={onClose}>Confirm Disposal</Button>}>
      <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-800">
        <strong>Warning:</strong> This will permanently remove <em>{equipment?.name}</em> from your active fleet.
      </div>
      <Field label="Disposal Method" required>
        <Select value={form.method} onChange={set('method')}>
          <option value="">Select method…</option>
          <option>Sold</option><option>Scrapped</option><option>Donated</option><option>Traded-In</option><option>Lost / Stolen</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sale / Scrap Value ($)"><Input type="number" placeholder="0" value={form.saleValue} onChange={set('saleValue')} /></Field>
        <Field label="Disposal Date"><Input type="date" value={form.disposalDate} onChange={set('disposalDate')} /></Field>
      </div>
      <Field label="Buyer / Recipient"><Input placeholder="Name or company (if sold/donated)" value={form.buyer} onChange={set('buyer')} /></Field>
      <Field label="Reason for Disposal"><Textarea placeholder="Explain why the asset is being retired…" value={form.reason} onChange={set('reason')} /></Field>
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" className="w-4 h-4 rounded accent-rose-600" checked={form.confirm} onChange={set('confirm')} />
        <span className="text-sm text-slate-700 font-medium">I confirm this asset should be permanently retired</span>
      </label>
    </Modal>
  )
}
