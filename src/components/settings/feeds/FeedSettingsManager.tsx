// src/components/settings/feeds/FeedSettingsManager.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import {
  ALERT_TYPE_META,
  type FeedTimeSlot,
  type FeedAlertSetting,
  type FeedFrequencyDefault,
} from '@/lib/database/feedSettingsConstants'
import {
  Clock,
  Plus,
  Edit3,
  Trash2,
  Bell,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle,
  Save,
  X,
  Info,
} from 'lucide-react'

// ─── constants ────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun',
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]

// ─── props ────────────────────────────────────────────────────────────────────

interface FeedSettingsManagerProps {
  farmId: string
  timeSlots: FeedTimeSlot[]
  alertSettings: FeedAlertSetting[]
  frequencyDefaults: FeedFrequencyDefault[]
  animalCategories: { id: string; name: string }[]
  onTimeSlotsUpdate: (slots: FeedTimeSlot[]) => void
  onAlertSettingsUpdate: (settings: FeedAlertSetting[]) => void
  onFrequencyDefaultsUpdate: (defaults: FeedFrequencyDefault[]) => void
  canEdit: boolean
  isMobile: boolean
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function DayPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: number[]
  onChange: (days: number[]) => void
  disabled?: boolean
}) {
  const toggle = (d: number) => {
    if (disabled) return
    const next = selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d]
    if (next.length > 0) onChange(next.sort((a, b) => a - b))
  }
  const allSelected = ALL_DAYS.every(d => selected.includes(d))
  const toggleAll = () => {
    if (disabled) return
    onChange(allSelected ? [1] : [...ALL_DAYS])
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {ALL_DAYS.map(d => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            disabled={disabled}
            className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
              selected.includes(d)
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {DAY_LABELS[d]}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleAll}
          disabled={disabled}
          className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
            allSelected
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-blue-600 border-blue-300 hover:border-blue-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          All
        </button>
      </div>
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

export function FeedSettingsManager({
  farmId,
  timeSlots: initialSlots,
  alertSettings: initialAlerts,
  frequencyDefaults: initialDefaults,
  animalCategories,
  onTimeSlotsUpdate,
  onAlertSettingsUpdate,
  onFrequencyDefaultsUpdate,
  canEdit,
  isMobile,
}: FeedSettingsManagerProps) {
  // ── Time Slot state ──
  const [timeSlots, setTimeSlots] = useState<FeedTimeSlot[]>(initialSlots)
  const [slotModalOpen, setSlotModalOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<FeedTimeSlot | null>(null)
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null)
  const [slotForm, setSlotForm] = useState({
    slot_name: '',
    scheduled_time: '06:00',
    days_of_week: ALL_DAYS,
    is_active: true,
    notes: '',
  })

  // ── Alert Settings state ──
  const [alerts, setAlerts] = useState<FeedAlertSetting[]>(initialAlerts)
  const [alertDraft, setAlertDraft] = useState<Record<string, { threshold_value: string; is_enabled: boolean }>>(() => {
    const draft: Record<string, { threshold_value: string; is_enabled: boolean }> = {}
    initialAlerts.forEach(a => {
      draft[a.alert_type] = { threshold_value: String(a.threshold_value), is_enabled: a.is_enabled }
    })
    // Ensure all types present
    Object.keys(ALERT_TYPE_META).forEach(k => {
      if (!draft[k]) draft[k] = { threshold_value: '0', is_enabled: true }
    })
    return draft
  })
  const [alertSaving, setAlertSaving] = useState(false)
  const [alertError, setAlertError] = useState<string | null>(null)
  const [alertSuccess, setAlertSuccess] = useState(false)

  // ── Frequency Defaults state ──
  const [freqDefaults, setFreqDefaults] = useState<FeedFrequencyDefault[]>(initialDefaults)
  const [freqModalOpen, setFreqModalOpen] = useState(false)
  const [editingFreq, setEditingFreq] = useState<FeedFrequencyDefault | null>(null)
  const [deletingFreqId, setDeletingFreqId] = useState<string | null>(null)
  const [freqForm, setFreqForm] = useState({
    animal_category_id: '',
    feedings_per_day: 2,
    default_quantity_kg_per_feeding: '',
    waste_factor_percent: 5,
    notes: '',
  })

  // ── shared ──
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Time Slot handlers ──────────────────────────────────────

  function openAddSlot() {
    setEditingSlot(null)
    setSlotForm({ slot_name: '', scheduled_time: '06:00', days_of_week: ALL_DAYS, is_active: true, notes: '' })
    setError(null)
    setSlotModalOpen(true)
  }

  function openEditSlot(slot: FeedTimeSlot) {
    setEditingSlot(slot)
    setSlotForm({
      slot_name: slot.slot_name,
      scheduled_time: slot.scheduled_time.slice(0, 5),
      days_of_week: slot.days_of_week,
      is_active: slot.is_active,
      notes: slot.notes ?? '',
    })
    setError(null)
    setSlotModalOpen(true)
  }

  async function handleSlotSubmit() {
    if (!slotForm.slot_name.trim()) { setError('Slot name is required'); return }
    if (!slotForm.scheduled_time)   { setError('Scheduled time is required'); return }
    setSaving(true); setError(null)

    try {
      const url = editingSlot
        ? `/api/farms/${farmId}/feed-settings/time-slots/${editingSlot.id}`
        : `/api/farms/${farmId}/feed-settings/time-slots`
      const method = editingSlot ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slotForm),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to save'); return }

      let updated: FeedTimeSlot[]
      if (editingSlot) {
        updated = timeSlots.map(s => s.id === editingSlot.id ? json : s)
      } else {
        updated = [...timeSlots, json]
      }
      setTimeSlots(updated)
      onTimeSlotsUpdate(updated)
      setSlotModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSlot(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/farms/${farmId}/feed-settings/time-slots/${id}`, { method: 'DELETE' })
      if (!res.ok) { const j = await res.json(); setError(j.error || 'Failed to delete'); return }
      const updated = timeSlots.filter(s => s.id !== id)
      setTimeSlots(updated)
      onTimeSlotsUpdate(updated)
      setDeletingSlotId(null)
    } finally {
      setSaving(false)
    }
  }

  // ─── Alert handlers ──────────────────────────────────────────

  async function handleSaveAlerts() {
    setAlertSaving(true); setAlertError(null); setAlertSuccess(false)
    try {
      const payload = Object.entries(alertDraft).map(([alert_type, v]) => ({
        alert_type,
        threshold_value: parseFloat(v.threshold_value) || 0,
        is_enabled: v.is_enabled,
      }))
      const res = await fetch(`/api/farms/${farmId}/feed-settings/alerts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) { setAlertError(json.error || 'Failed to save alerts'); return }
      setAlerts(json)
      onAlertSettingsUpdate(json)
      setAlertSuccess(true)
      setTimeout(() => setAlertSuccess(false), 3000)
    } finally {
      setAlertSaving(false)
    }
  }

  // ─── Frequency Default handlers ──────────────────────────────

  const assignedCategoryIds = new Set(
    freqDefaults
      .filter(d => !editingFreq || d.id !== editingFreq.id)
      .map(d => d.animal_category_id)
  )

  function openAddFreq() {
    setEditingFreq(null)
    setFreqForm({ animal_category_id: '', feedings_per_day: 2, default_quantity_kg_per_feeding: '', waste_factor_percent: 5, notes: '' })
    setError(null)
    setFreqModalOpen(true)
  }

  function openEditFreq(def: FeedFrequencyDefault) {
    setEditingFreq(def)
    setFreqForm({
      animal_category_id: def.animal_category_id,
      feedings_per_day: def.feedings_per_day,
      default_quantity_kg_per_feeding: String(def.default_quantity_kg_per_feeding),
      waste_factor_percent: def.waste_factor_percent,
      notes: def.notes ?? '',
    })
    setError(null)
    setFreqModalOpen(true)
  }

  async function handleFreqSubmit() {
    if (!freqForm.animal_category_id)              { setError('Animal category is required'); return }
    if (!freqForm.default_quantity_kg_per_feeding) { setError('Default quantity is required'); return }
    setSaving(true); setError(null)

    try {
      const url = editingFreq
        ? `/api/farms/${farmId}/feed-settings/frequency-defaults/${editingFreq.id}`
        : `/api/farms/${farmId}/feed-settings/frequency-defaults`
      const method = editingFreq ? 'PUT' : 'POST'
      const body = {
        animal_category_id: freqForm.animal_category_id,
        feedings_per_day: freqForm.feedings_per_day,
        default_quantity_kg_per_feeding: parseFloat(freqForm.default_quantity_kg_per_feeding),
        waste_factor_percent: freqForm.waste_factor_percent,
        notes: freqForm.notes,
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to save'); return }

      let updated: FeedFrequencyDefault[]
      if (editingFreq) {
        updated = freqDefaults.map(d => d.id === editingFreq.id ? json : d)
      } else {
        updated = [...freqDefaults, json]
      }
      setFreqDefaults(updated)
      onFrequencyDefaultsUpdate(updated)
      setFreqModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteFreq(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/farms/${farmId}/feed-settings/frequency-defaults/${id}`, { method: 'DELETE' })
      if (!res.ok) { const j = await res.json(); setError(j.error || 'Failed to delete'); return }
      const updated = freqDefaults.filter(d => d.id !== id)
      setFreqDefaults(updated)
      onFrequencyDefaultsUpdate(updated)
      setDeletingFreqId(null)
    } finally {
      setSaving(false)
    }
  }

  // ─── render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* ══ SECTION 1: Feeding Time Slots ══════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Feeding Time Slots</h3>
              <p className="text-xs text-gray-500">Define named feeding windows and which days they apply</p>
            </div>
          </div>
          {canEdit && (
            <Button size="sm" onClick={openAddSlot} className="flex items-center gap-1">
              <Plus className="w-4 h-4" />
              {isMobile ? 'Add' : 'Add Time Slot'}
            </Button>
          )}
        </div>

        {timeSlots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-400 text-sm">
            No feeding time slots defined yet.{canEdit && ' Click "Add Time Slot" to create one.'}
          </div>
        ) : (
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 xl:grid-cols-3'}`}>
            {timeSlots
              .sort((a, b) => a.sort_order - b.sort_order || a.scheduled_time.localeCompare(b.scheduled_time))
              .map(slot => (
                <Card key={slot.id} className={`relative ${!slot.is_active ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 truncate">{slot.slot_name}</span>
                          {!slot.is_active && (
                            <Badge variant="outline" className="text-xs text-gray-400 border-gray-300">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-green-700 mb-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-sm font-medium">{formatTime(slot.scheduled_time)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ALL_DAYS.map(d => (
                            <span
                              key={d}
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                slot.days_of_week.includes(d)
                                  ? 'bg-green-100 text-green-700 font-medium'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {DAY_LABELS[d]}
                            </span>
                          ))}
                        </div>
                        {slot.notes && (
                          <p className="text-xs text-gray-500 mt-2 truncate">{slot.notes}</p>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => openEditSlot(slot)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingSlotId(slot.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline delete confirm */}
                    {deletingSlotId === slot.id && (
                      <div className="mt-3 pt-3 border-t border-red-100 bg-red-50 rounded p-2">
                        <p className="text-xs text-red-700 mb-2">Delete "{slot.slot_name}"?</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteSlot(slot.id)} disabled={saving}>
                            Delete
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeletingSlotId(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </section>

      {/* ══ SECTION 2: Alert Settings ══════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Alert Thresholds</h3>
              <p className="text-xs text-gray-500">Configure when the system should notify you about feed issues</p>
            </div>
          </div>
          {canEdit && (
            <Button
              size="sm"
              onClick={handleSaveAlerts}
              disabled={alertSaving || !canEdit}
              className="flex items-center gap-1"
            >
              {alertSaving ? (
                <>Saving…</>
              ) : alertSuccess ? (
                <><CheckCircle className="w-4 h-4" /> Saved</>
              ) : (
                <><Save className="w-4 h-4" /> Save Alerts</>
              )}
            </Button>
          )}
        </div>

        {alertError && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">{alertError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {Object.entries(ALERT_TYPE_META).map(([alertType, meta]) => {
            const draft = alertDraft[alertType] ?? { threshold_value: '0', is_enabled: true }
            return (
              <Card key={alertType}>
                <CardContent className="p-4">
                  <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center gap-4'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-gray-900 text-sm">{meta.label}</span>
                        <Badge variant="outline" className="text-xs">{meta.unit}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">{meta.description}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={meta.min}
                          max={meta.max}
                          step={meta.unit === 'percent' ? 0.5 : 1}
                          value={draft.threshold_value}
                          onChange={e =>
                            setAlertDraft(prev => ({
                              ...prev,
                              [alertType]: { ...prev[alertType], threshold_value: e.target.value },
                            }))
                          }
                          disabled={!canEdit || !draft.is_enabled}
                          className="w-24 h-8 text-sm"
                        />
                        <span className="text-xs text-gray-500 whitespace-nowrap">{meta.unit}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={draft.is_enabled}
                          onCheckedChange={v =>
                            setAlertDraft(prev => ({
                              ...prev,
                              [alertType]: { ...prev[alertType], is_enabled: v },
                            }))
                          }
                          disabled={!canEdit}
                        />
                        <span className="text-xs text-gray-500">
                          {draft.is_enabled ? 'On' : 'Off'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {!canEdit && (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Info className="w-3 h-3" /> Read-only — contact your farm manager to change alert thresholds.
          </p>
        )}
      </section>

      {/* ══ SECTION 3: Frequency Defaults ══════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Feeding Frequency Defaults</h3>
              <p className="text-xs text-gray-500">Default feeding frequency and quantity per animal category</p>
            </div>
          </div>
          {canEdit && (
            <Button size="sm" onClick={openAddFreq} className="flex items-center gap-1">
              <Plus className="w-4 h-4" />
              {isMobile ? 'Add' : 'Add Default'}
            </Button>
          )}
        </div>

        {freqDefaults.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-400 text-sm">
            No frequency defaults yet.{canEdit && ' Click "Add Default" to create one.'}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-700">Animal Category</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-700">Feedings/day</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-700">Qty/feeding</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-700">Total/day</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-700">Waste %</th>
                  {canEdit && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {freqDefaults.map(def => (
                  <>
                    <tr key={def.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {def.animal_categories?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{def.feedings_per_day}×</td>
                      <td className="px-4 py-3 text-right text-gray-700">{def.default_quantity_kg_per_feeding} kg</td>
                      <td className="px-4 py-3 text-right font-medium text-green-700">
                        {(def.feedings_per_day * def.default_quantity_kg_per_feeding).toFixed(1)} kg
                      </td>
                      <td className="px-4 py-3 text-right text-amber-700">{def.waste_factor_percent}%</td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditFreq(def)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingFreqId(def.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {deletingFreqId === def.id && (
                      <tr key={`del-${def.id}`} className="bg-red-50">
                        <td colSpan={canEdit ? 6 : 5} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <p className="text-sm text-red-700">
                              Delete default for "{def.animal_categories?.name}"?
                            </p>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteFreq(def.id)} disabled={saving}>
                              Delete
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeletingFreqId(null)}>Cancel</Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ══ Time Slot Modal ═══════════════════════════════════════════ */}
      <Modal
        isOpen={slotModalOpen}
        onClose={() => setSlotModalOpen(false)}
        title={editingSlot ? 'Edit Time Slot' : 'Add Feeding Time Slot'}
      >
        <div className="space-y-4 p-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label>Slot Name <span className="text-red-500">*</span></Label>
            <Input
              value={slotForm.slot_name}
              onChange={e => setSlotForm(f => ({ ...f, slot_name: e.target.value }))}
              placeholder="e.g. Morning Feed"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Scheduled Time <span className="text-red-500">*</span></Label>
            <Input
              type="time"
              value={slotForm.scheduled_time}
              onChange={e => setSlotForm(f => ({ ...f, scheduled_time: e.target.value }))}
            />
            <p className="text-xs text-gray-500">24-hour format — {formatTime(slotForm.scheduled_time)}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Active Days <span className="text-red-500">*</span></Label>
            <DayPicker
              selected={slotForm.days_of_week}
              onChange={days => setSlotForm(f => ({ ...f, days_of_week: days }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={slotForm.notes}
              onChange={e => setSlotForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={slotForm.is_active}
              onCheckedChange={v => setSlotForm(f => ({ ...f, is_active: v }))}
            />
            <Label>Active</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setSlotModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSlotSubmit} disabled={saving}>
              {saving ? 'Saving…' : editingSlot ? 'Update Slot' : 'Add Slot'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══ Frequency Default Modal ══════════════════════════════════ */}
      <Modal
        isOpen={freqModalOpen}
        onClose={() => setFreqModalOpen(false)}
        title={editingFreq ? 'Edit Frequency Default' : 'Add Frequency Default'}
      >
        <div className="space-y-4 p-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label>Animal Category <span className="text-red-500">*</span></Label>
            <Select
              value={freqForm.animal_category_id}
              onValueChange={v => setFreqForm(f => ({ ...f, animal_category_id: v }))}
              disabled={!!editingFreq}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {animalCategories
                  .filter(c => editingFreq ? true : !assignedCategoryIds.has(c.id))
                  .map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {animalCategories.filter(c => !assignedCategoryIds.has(c.id)).length === 0 && !editingFreq && (
              <p className="text-xs text-amber-600">All animal categories already have defaults configured.</p>
            )}
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div className="space-y-1.5">
              <Label>Feedings per Day <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={freqForm.feedings_per_day}
                onChange={e => setFreqForm(f => ({ ...f, feedings_per_day: parseInt(e.target.value) || 1 }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Qty per Feeding (kg) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={freqForm.default_quantity_kg_per_feeding}
                onChange={e => setFreqForm(f => ({ ...f, default_quantity_kg_per_feeding: e.target.value }))}
                placeholder="e.g. 5.0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Waste Factor (%)</Label>
            <Input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={freqForm.waste_factor_percent}
              onChange={e => setFreqForm(f => ({ ...f, waste_factor_percent: parseFloat(e.target.value) || 0 }))}
            />
            <p className="text-xs text-gray-500">
              Expected waste as a % of quantity fed. Total with waste:{' '}
              <strong>
                {freqForm.default_quantity_kg_per_feeding
                  ? (
                      parseFloat(freqForm.default_quantity_kg_per_feeding) *
                      freqForm.feedings_per_day *
                      (1 + freqForm.waste_factor_percent / 100)
                    ).toFixed(2)
                  : '—'}{' '}
                kg/day
              </strong>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={freqForm.notes}
              onChange={e => setFreqForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setFreqModalOpen(false)}>Cancel</Button>
            <Button onClick={handleFreqSubmit} disabled={saving}>
              {saving ? 'Saving…' : editingFreq ? 'Update Default' : 'Add Default'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
