'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Plus,
  Trash2,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

type WasteReason = 'spillage' | 'refusal' | 'spoilage' | 'over_supply' | 'other'

interface WasteRecord {
  id: string
  feed_type_id: string
  waste_kg: number
  waste_reason: WasteReason | null
  waste_date: string
  animal_count: number | null
  notes: string | null
  alert_triggered: boolean
  feed_types?: { name: string } | null
}

interface WasteSummary {
  feed_type_id: string
  feed_name: string
  week_start: string
  total_waste_kg: number
  waste_events: number
  most_common_reason: WasteReason | null
}

interface FeedWasteTabProps {
  farmId: string
  feedTypes: any[]
  canManageFeed: boolean
  isMobile: boolean
}

const REASON_LABELS: Record<WasteReason, string> = {
  spillage: 'Spillage',
  refusal: 'Refusal',
  spoilage: 'Spoilage',
  over_supply: 'Over-supply',
  other: 'Other',
}

const REASON_COLORS: Record<WasteReason, string> = {
  spillage: 'bg-blue-100 text-blue-700',
  refusal: 'bg-orange-100 text-orange-700',
  spoilage: 'bg-red-100 text-red-700',
  over_supply: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-700',
}

const EMPTY_FORM = {
  feed_type_id: '',
  waste_kg: '',
  waste_reason: '' as WasteReason | '',
  waste_date: new Date().toISOString().split('T')[0],
  animal_count: '',
  notes: '',
}

export function FeedWasteTab({
  farmId,
  feedTypes,
  canManageFeed,
  isMobile,
}: FeedWasteTabProps) {
  const [records, setRecords] = useState<WasteRecord[]>([])
  const [summary, setSummary] = useState<WasteSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [view, setView] = useState<'records' | 'summary'>('records')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [recRes] = await Promise.all([
        fetch(`/api/farms/${farmId}/feed-waste?limit=100`),
      ])
      if (recRes.ok) {
        const json = await recRes.json()
        setRecords(json.records ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [farmId])

  useEffect(() => { fetchData() }, [fetchData])

  function openCreate() {
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.feed_type_id || !form.waste_kg) return
    setSaving(true)
    try {
      const payload = {
        feed_type_id: form.feed_type_id,
        waste_kg: parseFloat(form.waste_kg),
        waste_reason: form.waste_reason || null,
        waste_date: form.waste_date,
        animal_count: form.animal_count ? parseInt(form.animal_count) : null,
        notes: form.notes || null,
      }

      const res = await fetch(`/api/farms/${farmId}/feed-waste`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setShowModal(false)
        fetchData()
      } else {
        const json = await res.json()
        alert(json.error ?? 'Failed to record waste')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this waste record? The inventory adjustment will also be reversed.')) return
    const res = await fetch(`/api/farms/${farmId}/feed-waste/${id}`, { method: 'DELETE' })
    if (res.ok) fetchData()
  }

  const totalWasteKg = records.reduce((s, r) => s + r.waste_kg, 0)
  const alertCount = records.filter(r => r.alert_triggered).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Feed Waste</h2>
          <p className="text-sm text-gray-500">
            Track waste events. Each entry deducts from inventory via the ledger.
          </p>
        </div>
        {canManageFeed && (
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Log Waste
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Total waste (shown)</p>
            <p className="text-xl font-bold text-red-600">{totalWasteKg.toFixed(1)} kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Events</p>
            <p className="text-xl font-bold text-gray-800">{records.length}</p>
          </CardContent>
        </Card>
        {alertCount > 0 && (
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Alerts triggered</p>
                <p className="text-xl font-bold text-amber-600">{alertCount}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Records list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading waste records…</div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No waste records yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Log waste events to track feed losses and identify improvement areas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map(r => {
            const feedName = r.feed_types?.name ?? r.feed_type_id
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 truncate">{feedName}</span>
                    {r.waste_reason && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REASON_COLORS[r.waste_reason]}`}>
                        {REASON_LABELS[r.waste_reason]}
                      </span>
                    )}
                    {r.alert_triggered && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span>{r.waste_date}</span>
                    {r.animal_count && <span>{r.animal_count} animals</span>}
                    {r.notes && <span className="truncate">{r.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-red-600">{r.waste_kg} kg</span>
                  {canManageFeed && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Log Waste Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Log Feed Waste"
        size="md"
      >
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feed type *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.feed_type_id}
                onChange={e => setForm(f => ({ ...f, feed_type_id: e.target.value }))}
              >
                <option value="">Select feed…</option>
                {feedTypes.map(ft => (
                  <option key={ft.id} value={ft.id}>{ft.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Waste amount (kg) *</label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.waste_kg}
                onChange={e => setForm(f => ({ ...f, waste_kg: e.target.value }))}
                placeholder="0.000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.waste_reason}
                onChange={e => setForm(f => ({ ...f, waste_reason: e.target.value as WasteReason | '' }))}
              >
                <option value="">Select reason…</option>
                {Object.entries(REASON_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.waste_date}
                onChange={e => setForm(f => ({ ...f, waste_date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of animals affected</label>
            <input
              type="number"
              min="1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.animal_count}
              onChange={e => setForm(f => ({ ...f, animal_count: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.feed_type_id || !form.waste_kg}
            >
              {saving ? 'Saving…' : 'Log Waste'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
