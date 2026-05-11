'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TrendingDown } from 'lucide-react'
import { Modal, Field, Input, Select } from './shared'

export function DepreciationModal({ open, onClose, equipment }: { open: boolean; onClose: () => void; equipment: any }) {
  const [method, setMethod] = useState('straight_line')
  const eq = equipment || {}
  const deprecPct = eq.purchase_cost && eq.current_value
    ? Math.round(((eq.purchase_cost - eq.current_value) / eq.purchase_cost) * 100) : null

  return (
    <Modal open={open} onClose={onClose} title="Depreciation" icon={TrendingDown} accentColor="violet"
      footer={<Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={onClose}>Save Settings</Button>}>
      <Field label="Depreciation Method">
        <Select value={method} onChange={e => setMethod(e.target.value)}>
          <option value="straight_line">Straight-Line</option>
          <option value="declining_balance">Declining Balance</option>
          <option value="units_of_production">Units of Production</option>
          <option value="sum_of_years">Sum-of-Years-Digits</option>
        </Select>
      </Field>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Purchase Cost', value: eq.purchase_cost ? `$${eq.purchase_cost.toLocaleString()}` : '—' },
          { label: 'Current Value', value: eq.current_value ? `$${eq.current_value.toLocaleString()}` : '—' },
          { label: 'Depreciated', value: deprecPct !== null ? `${deprecPct}%` : '—' },
        ].map(c => (
          <div key={c.label} className="bg-violet-50 rounded-xl px-3 py-3 text-center">
            <p className="text-base font-bold text-violet-900">{c.value}</p>
            <p className="text-xs text-violet-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Residual Value ($)"><Input type="number" placeholder="e.g. 5000" defaultValue={eq.current_value ? Math.round(eq.current_value * 0.1) : ''} /></Field>
        <Field label="Useful Life (years)"><Input type="number" placeholder="e.g. 15" defaultValue={eq.expected_useful_life} /></Field>
      </div>
      {eq.purchase_date && eq.expected_useful_life && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">Projected end-of-life</span>
          <span className="font-bold text-slate-700 text-sm">
            {new Date(new Date(eq.purchase_date).setFullYear(new Date(eq.purchase_date).getFullYear() + eq.expected_useful_life)).getFullYear()}
          </span>
        </div>
      )}
    </Modal>
  )
}
