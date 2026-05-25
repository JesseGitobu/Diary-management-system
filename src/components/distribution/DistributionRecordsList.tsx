'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import {
  Search, Filter, Truck, CheckCircle, Clock, AlertCircle,
  MapPin, MoreVertical, StickyNote, Ban, Factory, Users,
  ShoppingBag, Package, UserCheck, Receipt, AlertTriangle,
  Trash2, Edit, 
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeliveryInfo {
  id?: string
  driver_name?: string | null
  vehicle_number?: string | null
  delivery_date?: string | null
  delivery_time?: string | null
}

interface PaymentInfo {
  id?: string
  method?: string | null
  expected_date?: string | null
  actual_date?: string | null
  status?: string | null
  amount_paid?: number | null
}

interface DistributionRecord {
  id: string
  distribution_date: string
  distribution_status: 'pending' | 'delivered' | 'paid' | 'cancelled'
  quantity_distributed: number
  unit_price?: number | null
  total_amount?: number | null
  notes?: string | null
  channelName: string
  channelType: 'cooperative' | 'processor' | 'direct' | 'retail' | 'other'
  isPaidFor: boolean
  delivery?: DeliveryInfo | null
  payment?: PaymentInfo | null
}

interface DistributionRecordsListProps {
  records: DistributionRecord[]
  canEdit: boolean
  isMobile: boolean
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:   { label: 'Pending',   Icon: Clock,       bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-800', accent: '#EF9F27' },
  delivered: { label: 'Delivered', Icon: Truck,       bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-800',  accent: '#378ADD' },
  paid:      { label: 'Paid',      Icon: CheckCircle, bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-800', accent: '#639922' },
  cancelled: { label: 'Cancelled', Icon: AlertCircle, bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-800',   accent: '#E24B4A' },
} as const

const CHANNEL_CFG = {
  cooperative: { label: 'Cooperative', Icon: Users,       bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  accent: '#639922' },
  processor:   { label: 'Processor',   Icon: Factory,     bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   accent: '#378ADD' },
  direct:      { label: 'Direct sale', Icon: UserCheck,   bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800',  accent: '#EF9F27' },
  retail:      { label: 'Retail',      Icon: ShoppingBag, bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', accent: '#7F77DD' },
  other:       { label: 'Other',       Icon: Package,     bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-700',   accent: '#888780' },
} as const

const PAY_LABELS: Record<string, string> = {
  cash: '💵 Cash', mpesa: '📱 M-Pesa', bank: '🏦 Bank', credit: '📋 Credit',
}

function sc(s: string) { return STATUS_CFG[s as keyof typeof STATUS_CFG]  ?? STATUS_CFG.pending   }
function cc(t: string) { return CHANNEL_CFG[t as keyof typeof CHANNEL_CFG] ?? CHANNEL_CFG.other    }
function fmt(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtT(t?: string | null) {
  if (!t) return ''
  return new Date(`2000-01-01T${t}`).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ bg, border, text, children }: { bg: string; border: string; text: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border ${bg} ${border} ${text}`}>
      {children}
    </span>
  )
}

function MetricCell({ value, label, valueClass = '' }: { value: React.ReactNode; label: string; valueClass?: string }) {
  return (
    <div className="flex-1 text-center px-3 py-2.5 border-r border-gray-100 last:border-r-0">
      <div className={`text-sm font-medium ${valueClass || 'text-gray-900'}`}>{value}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

// ─── Confirm Delivery Modal ───────────────────────────────────────────────────

function ConfirmDeliveryModal({
  record, onClose, onSuccess,
}: { record: DistributionRecord; onClose: () => void; onSuccess: (updated: any) => void }) {
  const [form, setForm] = useState({
    driverName:    record.delivery?.driver_name    ?? '',
    vehicleNumber: record.delivery?.vehicle_number ?? '',
    deliveryDate:  record.delivery?.delivery_date  ?? record.distribution_date,
    deliveryTime:  record.delivery?.delivery_time  ?? '',
    notes:         record.notes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const submit = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/distribution/records/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_delivery', ...form }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      onSuccess(await res.json())
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center border border-blue-100">
        <div><p className="text-xs text-gray-500">Channel</p><p className="text-sm font-medium">{record.channelName}</p></div>
        <div className="text-right"><p className="text-xs text-gray-500">Volume</p><p className="text-base font-medium text-blue-600">{record.quantity_distributed}L</p></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-gray-500 block mb-1">Driver name</label>
          <Input value={form.driverName} onChange={e => setForm(p => ({ ...p, driverName: e.target.value }))} placeholder="Driver name" /></div>
        <div><label className="text-xs font-medium text-gray-500 block mb-1">Vehicle number</label>
          <Input value={form.vehicleNumber} onChange={e => setForm(p => ({ ...p, vehicleNumber: e.target.value }))} placeholder="KCA 234B" /></div>
        <div><label className="text-xs font-medium text-gray-500 block mb-1">Delivery date</label>
          <Input type="date" value={form.deliveryDate} onChange={e => setForm(p => ({ ...p, deliveryDate: e.target.value }))} /></div>
        <div><label className="text-xs font-medium text-gray-500 block mb-1">Delivery time</label>
          <Input type="time" value={form.deliveryTime} onChange={e => setForm(p => ({ ...p, deliveryTime: e.target.value }))} /></div>
      </div>
      <div><label className="text-xs font-medium text-gray-500 block mb-1">Notes</label>
        <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200" rows={2}
          value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any delivery notes…" /></div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={submit} disabled={loading}>
          {loading ? 'Saving…' : <><Truck className="w-3.5 h-3.5 mr-1.5" />Confirm delivered</>}
        </Button>
      </div>
    </div>
  )
}

// ─── Confirm Payment Modal ────────────────────────────────────────────────────

function ConfirmPaymentModal({
  record, onClose, onSuccess,
}: { record: DistributionRecord; onClose: () => void; onSuccess: (updated: any) => void }) {
  const total = record.total_amount ?? 0
  const [form, setForm] = useState({
    paymentMethod:   record.payment?.method        ?? 'mpesa',
    actualPaymentDate: new Date().toISOString().split('T')[0],
    amountPaid:      total,
    reference:       '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const isPartial = form.amountPaid > 0 && form.amountPaid < total
  const remaining = total - form.amountPaid

  const submit = async () => {
    setError('')
    if (!form.actualPaymentDate) { setError('Payment date is required'); return }
    if (form.amountPaid <= 0)    { setError('Amount must be greater than 0'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/distribution/records/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_payment', ...form }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      onSuccess(await res.json())
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 rounded-lg p-3 flex justify-between items-center border border-green-100">
        <div><p className="text-xs text-gray-500">Channel</p><p className="text-sm font-medium">{record.channelName}</p></div>
        <div className="text-right"><p className="text-xs text-gray-500">Expected</p><p className="text-base font-medium text-green-700">KSh {total.toLocaleString()}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Payment method</label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
            value={form.paymentMethod} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}>
            <option value="cash">💵 Cash</option>
            <option value="mpesa">📱 M-Pesa</option>
            <option value="bank">🏦 Bank transfer</option>
            <option value="credit">📋 Credit</option>
          </select>
        </div>
        <div><label className="text-xs font-medium text-gray-500 block mb-1">Payment date *</label>
          <Input type="date" value={form.actualPaymentDate} onChange={e => setForm(p => ({ ...p, actualPaymentDate: e.target.value }))} /></div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Amount paid (KSh) *</label>
          <Input type="number" step="0.01" min="0" value={form.amountPaid}
            onChange={e => setForm(p => ({ ...p, amountPaid: parseFloat(e.target.value) || 0 }))} />
          {isPartial && <p className="text-xs text-amber-600 mt-1">Partial — KSh {remaining.toLocaleString()} remaining</p>}
        </div>
        <div><label className="text-xs font-medium text-gray-500 block mb-1">Reference / transaction ID</label>
          <Input placeholder="e.g. MJA1234567890" value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} /></div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={submit} disabled={loading}>
          {loading ? 'Saving…' : <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Confirm payment</>}
        </Button>
      </div>
    </div>
  )
}

// ─── Edit Record Modal ────────────────────────────────────────────────────────

function EditRecordModal({
  record, onClose, onSuccess,
}: { record: DistributionRecord; onClose: () => void; onSuccess: (updated: any) => void }) {
  const [form, setForm] = useState({
    quantity:          record.quantity_distributed,
    unit_price:        record.unit_price ?? 0,
    distribution_date: record.distribution_date,
    notes:             record.notes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const total = record.isPaidFor ? form.quantity * form.unit_price : 0

  const submit = async () => {
    setError('')
    if (form.quantity <= 0) { setError('Volume must be greater than 0'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/distribution/records/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity:          form.quantity,
          unit_price:        record.isPaidFor ? form.unit_price : null,
          distribution_date: form.distribution_date,
          notes:             form.notes,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      onSuccess(await res.json())
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-xs text-gray-500">Editing record for</p>
        <p className="text-sm font-medium">{record.channelName}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-gray-500 block mb-1">Volume (liters) *</label>
          <Input type="number" step="0.1" min="0" value={form.quantity}
            onChange={e => setForm(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))} /></div>
        {record.isPaidFor && (
          <div><label className="text-xs font-medium text-gray-500 block mb-1">Price per liter (KSh) *</label>
            <Input type="number" step="0.01" min="0" value={form.unit_price}
              onChange={e => setForm(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} /></div>
        )}
      </div>
      {record.isPaidFor && (
        <div className="flex justify-between items-center bg-green-50 rounded-lg px-3 py-2 border border-green-100">
          <span className="text-xs text-gray-500">Calculated total</span>
          <span className="text-sm font-medium text-green-700">KSh {total.toLocaleString()}</span>
        </div>
      )}
      <div><label className="text-xs font-medium text-gray-500 block mb-1">Distribution date</label>
        <Input type="date" value={form.distribution_date}
          onChange={e => setForm(p => ({ ...p, distribution_date: e.target.value }))} /></div>
      <div><label className="text-xs font-medium text-gray-500 block mb-1">Notes</label>
        <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200" rows={2}
          value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button className="flex-1" onClick={submit} disabled={loading}>
          {loading ? 'Saving…' : <><Edit className="w-3.5 h-3.5 mr-1.5" />Save changes</>}
        </Button>
      </div>
    </div>
  )
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteModal({
  record, onClose, onSuccess,
}: { record: DistributionRecord; onClose: () => void; onSuccess: (id: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const submit = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/distribution/records/${record.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      onSuccess(record.id)
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-50 rounded-lg p-4 border border-red-100 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-900">This cannot be undone</p>
          <p className="text-xs text-red-700 mt-1 leading-relaxed">
            Deleting <strong>{record.channelName}</strong> — {record.quantity_distributed}L on {fmt(record.distribution_date)} will also remove linked delivery logs and payment records.
          </p>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={submit} disabled={loading}>
          {loading ? 'Deleting…' : <><Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete permanently</>}
        </Button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type ModalState =
  | { type: 'delivery'; record: DistributionRecord }
  | { type: 'payment';  record: DistributionRecord }
  | { type: 'edit';     record: DistributionRecord }
  | { type: 'delete';   record: DistributionRecord }
  | null

export function DistributionRecordsList({ records: initial, canEdit, isMobile }: DistributionRecordsListProps) {
  const [records, setRecords]       = useState(initial)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('all')
  const [channelFilter, setChannel] = useState('all')
  const [paidFilter, setPaid]       = useState('all')
  const [showFilters, setShowF]     = useState(false)
  const [modal, setModal]           = useState<ModalState>(null)

  const filtered = records.filter(r => {
    const q  = search.toLowerCase()
    const dm = r.channelName.toLowerCase().includes(q) ||
               (r.delivery?.driver_name    ?? '').toLowerCase().includes(q) ||
               (r.delivery?.vehicle_number ?? '').toLowerCase().includes(q) ||
               String(r.quantity_distributed).includes(q)
    return dm &&
      (statusFilter  === 'all' || r.distribution_status === statusFilter) &&
      (channelFilter === 'all' || r.channelType          === channelFilter) &&
      (paidFilter === 'all' || (paidFilter === 'paid' && r.isPaidFor) || (paidFilter === 'unpaid' && !r.isPaidFor))
  })

  const activeFilters = [statusFilter, channelFilter, paidFilter].filter(v => v !== 'all').length
  const clearFilters  = () => { setSearch(''); setStatus('all'); setChannel('all'); setPaid('all') }

  const updateRecord = (updated: any) => {
    setRecords(prev => prev.map(r => r.id === updated.id ? {
      ...r,
      distribution_status: updated.distribution_status,
      quantity_distributed: updated.quantity_distributed,
      unit_price: updated.unit_price,
      total_amount: updated.total_amount,
      notes: updated.notes,
      distribution_date: updated.distribution_date,
      delivery: updated.distribution_delivery_logs?.[0] ? {
        driver_name:    updated.distribution_delivery_logs[0].driver_name,
        vehicle_number: updated.distribution_delivery_logs[0].vehicle_number,
        delivery_date:  updated.distribution_delivery_logs[0].delivery_date,
        delivery_time:  updated.distribution_delivery_logs[0].delivery_time,
      } : r.delivery,
      payment: updated.distribution_payment_records?.[0] ? {
        method:       updated.distribution_payment_records[0].payment_method,
        actual_date:  updated.distribution_payment_records[0].actual_payment_date,
        status:       updated.distribution_payment_records[0].payment_status,
        amount_paid:  updated.distribution_payment_records[0].amount_paid,
      } : r.payment,
    } : r))
  }

  const deleteRecord = (id: string) => setRecords(prev => prev.filter(r => r.id !== id))

  const modalTitle = modal?.type === 'delivery' ? 'Confirm delivery'
    : modal?.type === 'payment' ? 'Confirm payment'
    : modal?.type === 'edit'    ? 'Edit record'
    : 'Delete record'

  if (!records.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Truck className="w-7 h-7 text-gray-400" />
      </div>
      <p className="font-medium text-gray-900">No distribution records yet</p>
      <p className="text-sm text-gray-500 mt-1">Record your first milk distribution to see it here</p>
    </div>
  )

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by channel, driver, or vehicle…" className="pl-10" />
        </div>
        {isMobile && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setShowF(p => !p)}>
            <Filter className="w-4 h-4 mr-2" /> Filters
            {activeFilters > 0 && <span className="ml-1.5 w-5 h-5 text-xs bg-blue-500 text-white rounded-full inline-flex items-center justify-center">{activeFilters}</span>}
          </Button>
        )}
        {(!isMobile || showFilters) && (
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
            <Select value={statusFilter} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(STATUS_CFG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannel}>
              <SelectTrigger><SelectValue placeholder="All channel types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channel types</SelectItem>
                {Object.entries(CHANNEL_CFG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={paidFilter} onValueChange={setPaid}>
              <SelectTrigger><SelectValue placeholder="All payment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payment status</SelectItem>
                <SelectItem value="paid">Paid channels</SelectItem>
                <SelectItem value="unpaid">Unpaid channels</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{filtered.length} record{filtered.length !== 1 ? 's' : ''}{filtered.length !== records.length && ` (filtered from ${records.length})`}</span>
        {activeFilters > 0 && <Button variant="ghost" size="sm" className="text-xs" onClick={clearFilters}>Clear filters</Button>}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map(r => {
          const s  = sc(r.distribution_status)
          const c  = cc(r.channelType)
          const SI = s.Icon
          const CI = c.Icon
          const d  = r.delivery
          const hasDelivery = !!(d && (d.driver_name || d.vehicle_number || d.delivery_time))
          const hasPaidConf = r.payment?.status === 'paid' && r.payment?.actual_date
          const canConfirmDelivery = canEdit && r.isPaidFor && r.distribution_status === 'pending' &&
            (r.channelType === 'cooperative' || r.channelType === 'processor')
          const canConfirmPayment  = canEdit && r.isPaidFor && r.distribution_status === 'delivered'
          const canDelete          = canEdit && r.distribution_status !== 'paid'

          return (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">

              {/* Header */}
              <div className="flex">
                <div className="w-1 flex-shrink-0" style={{ background: c.accent }} />
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-gray-900">{r.channelName}</span>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge bg={c.bg} border={c.border} text={c.text}><CI className="w-3 h-3" />{c.label}</Badge>
                        <Badge bg={s.bg} border={s.border} text={s.text}><SI className="w-3 h-3" />{s.label}</Badge>
                        {!r.isPaidFor && <Badge bg="bg-red-50" border="border-red-200" text="text-red-700"><Ban className="w-3 h-3" />Unpaid</Badge>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {r.isPaidFor && r.total_amount != null
                        ? <div className={`text-base font-medium ${hasPaidConf ? 'text-green-700' : 'text-gray-900'}`}>
                            KSh {r.total_amount.toLocaleString()}
                          </div>
                        : <div className="text-sm text-gray-400">—</div>
                      }
                      <div className="text-xs text-gray-400 mt-1">{fmt(r.distribution_date)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics bar */}
              <div className="flex border-t border-b border-gray-100 bg-gray-50/50 divide-x divide-gray-100">
                <MetricCell value={<span className="text-blue-600">{r.quantity_distributed}L</span>} label="Volume" />
                {r.isPaidFor ? <>
                  <MetricCell value={<span className="text-green-700">KSh {r.unit_price ?? '—'}</span>} label="Per liter" />
                  {r.payment?.method && <MetricCell value={<span className="text-xs text-gray-600">{PAY_LABELS[r.payment.method] ?? r.payment.method}</span>} label="Payment" />}
                  {r.payment?.expected_date && <MetricCell value={<span className="text-xs text-gray-500">{fmt(r.payment.expected_date)}</span>} label="Due date" />}
                </> : (
                  <div className="flex-1 flex items-center justify-center px-3 py-2.5">
                    <span className="text-xs text-amber-700">Unpaid channel — no pricing data</span>
                  </div>
                )}
              </div>

              {/* Delivery strip */}
              {hasDelivery && (
                <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  {d?.driver_name    && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Truck className="w-3.5 h-3.5" />{d.driver_name}</div>}
                  {d?.vehicle_number && <div className="flex items-center gap-1.5 text-xs text-gray-500"><MapPin className="w-3.5 h-3.5" />{d.vehicle_number}</div>}
                  {d?.delivery_time  && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Clock className="w-3.5 h-3.5" />{fmtT(d.delivery_time)}</div>}
                </div>
              )}

              {/* Payment confirmed strip */}
              {hasPaidConf && (
                <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-green-50 border-b border-green-100">
                  <div className="flex items-center gap-1.5 text-xs text-green-700"><CheckCircle className="w-3.5 h-3.5" />Paid {fmt(r.payment!.actual_date)}</div>
                  {r.payment?.amount_paid && r.payment.amount_paid < (r.total_amount ?? 0) && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700"><AlertTriangle className="w-3.5 h-3.5" />
                      Partial — KSh {(r.total_amount! - r.payment.amount_paid).toLocaleString()} remaining
                    </div>
                  )}
                </div>
              )}

              {/* Notes strip */}
              {r.notes && (
                <div className="flex items-start gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <StickyNote className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-500 leading-relaxed">{r.notes}</p>
                </div>
              )}

              {/* Action footer */}
              {(canConfirmDelivery || canConfirmPayment || canEdit) && (
                <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
                  {canConfirmDelivery && (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                      onClick={() => setModal({ type: 'delivery', record: r })}>
                      <Truck className="w-3.5 h-3.5 mr-1.5" />Confirm delivery
                    </Button>
                  )}
                  {canConfirmPayment && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                      onClick={() => setModal({ type: 'payment', record: r })}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Confirm payment
                    </Button>
                  )}
                  {(canConfirmDelivery || canConfirmPayment) && <div className="w-px h-5 bg-gray-200 mx-1" />}
                  {canEdit && (
                    <Button size="sm" variant="outline" className="h-8 text-xs"
                      onClick={() => setModal({ type: 'edit', record: r })}>
                      <Edit className="w-3.5 h-3.5 mr-1.5" />Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setModal({ type: 'delete', record: r })}>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* No results */}
      {!filtered.length && records.length > 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <Search className="w-6 h-6 text-gray-400" />
          </div>
          <p className="font-medium text-gray-900">No matching records</p>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear all filters</Button>
        </div>
      )}

      {/* Modals */}
      {modal && (
        <Modal isOpen onClose={() => setModal(null)} className="max-w-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-medium">{modalTitle}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {modal.type === 'delivery' && <ConfirmDeliveryModal record={modal.record} onClose={() => setModal(null)} onSuccess={updateRecord} />}
            {modal.type === 'payment'  && <ConfirmPaymentModal  record={modal.record} onClose={() => setModal(null)} onSuccess={updateRecord} />}
            {modal.type === 'edit'     && <EditRecordModal      record={modal.record} onClose={() => setModal(null)} onSuccess={updateRecord} />}
            {modal.type === 'delete'   && <DeleteModal          record={modal.record} onClose={() => setModal(null)} onSuccess={deleteRecord} />}
          </div>
        </Modal>
      )}
    </div>
  )
}