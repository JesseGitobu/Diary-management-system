// src/components/weight/WeightManagementModal.tsx
'use client'

import { useState, useMemo } from 'react'
import {
  X, Scale, TrendingUp, TrendingDown, Minus, Plus,
  Search, ChevronDown, AlertCircle, ArrowUpRight,
  ArrowDownRight, Clock, RefreshCw, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AddWeightModal } from './AddWeightModal'
import { useWeightManagement } from '@/lib/hooks/useWeightManagement'
import { AnimalWeightSummary, WeightRecord } from '@/types/weight'

interface WeightManagementModalProps {
  isOpen: boolean
  onClose: () => void
  farmId: string
}

const METHOD_LABELS: Record<string, string> = {
  scale:           'Scale',
  tape_measure:    'Tape',
  visual_estimate: 'Estimate',
}

const STATUS_LABELS: Record<string, string> = {
  lactating:             'Lactating',
  served:                'Served',
  heifer:                'Heifer',
  calf:                  'Calf',
  bull:                  'Bull',
  steaming_dry_cows:     'Steaming Dry',
  open_culling_dry_cows: 'Open/Culling',
}

function TrendBadge({ trend, changePct }: { trend: AnimalWeightSummary['trend']; changePct?: number }) {
  if (trend === 'gaining') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
      <TrendingUp className="h-3 w-3" />
      {changePct !== undefined ? `+${changePct.toFixed(1)}%` : 'Gaining'}
    </span>
  )
  if (trend === 'losing') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
      <TrendingDown className="h-3 w-3" />
      {changePct !== undefined ? `${changePct.toFixed(1)}%` : 'Losing'}
    </span>
  )
  if (trend === 'stable') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
      <Minus className="h-3 w-3" />
      Stable
    </span>
  )
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-xs">No data</span>
}

function BcsBar({ score }: { score?: number }) {
  if (score == null) return <span className="text-gray-300 text-xs">–</span>
  const pct   = (score / 5) * 100
  const color = score <= 2 ? 'bg-red-500' : score <= 3 ? 'bg-amber-400' : score <= 4 ? 'bg-emerald-500' : 'bg-blue-500'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-600 font-medium">{score}</span>
    </div>
  )
}

function MiniSparkline({ history }: { history: WeightRecord[] }) {
  if (history.length < 2) return null
  const sorted  = [...history].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
  const weights = sorted.map(r => r.weight_kg)
  const min = Math.min(...weights), max = Math.max(...weights), range = max - min || 1
  const W = 60, H = 24
  const pts = weights.map((w, i) => `${(i / (weights.length - 1)) * W},${H - ((w - min) / range) * H}`).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={weights[weights.length-1] >= weights[0] ? '#10b981' : '#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AnimalWeightRow({ summary, onAddWeight, isExpanded, onToggle }: {
  summary: AnimalWeightSummary
  onAddWeight: (s: AnimalWeightSummary) => void
  isExpanded: boolean
  onToggle: () => void
}) {
  const sorted = [...summary.weight_history].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
  const needsAttention = (summary.days_since_last !== undefined && summary.days_since_last > 30) ||
    (summary.body_condition_score !== undefined && summary.body_condition_score < 2.5) ||
    summary.current_weight == null

  return (
    <div className={`border rounded-xl transition-all ${needsAttention ? 'border-orange-200 bg-orange-50/40' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm truncate">{summary.name || `Animal ${summary.tag_number}`}</span>
            <span className="text-xs text-gray-400">#{summary.tag_number}</span>
            {summary.production_status && (
              <Badge variant="outline" className="text-xs py-0">{STATUS_LABELS[summary.production_status] ?? summary.production_status}</Badge>
            )}
            {needsAttention && <AlertCircle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {summary.current_weight
              ? <span className="text-xs text-gray-500">{summary.current_weight} kg</span>
              : <span className="text-xs text-gray-400 italic">No weight recorded</span>}
            {summary.last_measured_at && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />{summary.days_since_last}d ago
              </span>
            )}
          </div>
        </div>

        <div className="hidden sm:block"><MiniSparkline history={summary.weight_history} /></div>

        <div className="flex flex-col items-end gap-1">
          <TrendBadge trend={summary.trend} changePct={summary.change_pct} />
          <BcsBar score={summary.body_condition_score} />
        </div>

        <Button size="sm" variant="outline"
          className="ml-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 flex-shrink-0"
          onClick={e => { e.stopPropagation(); onAddWeight(summary) }}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline ml-1">Add</span>
        </Button>

        <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          {sorted.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-4">No weight records yet — click Add to record the first weight.</p>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Weight history ({sorted.length} record{sorted.length !== 1 ? 's' : ''})
              </p>
              <div className="space-y-1.5">
                {sorted.map((r, i) => {
                  const prev = sorted[i + 1]
                  const diff = prev ? r.weight_kg - prev.weight_kg : null
                  return (
                    <div key={r.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-gray-400 text-xs w-24 flex-shrink-0">
                        {new Date(r.recorded_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </span>
                      <span className="font-semibold text-gray-900 w-16">{r.weight_kg} kg</span>
                      {diff !== null && (
                        <span className={`text-xs font-medium flex items-center gap-0.5 w-16 ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {diff > 0 ? <ArrowUpRight className="h-3 w-3" /> : diff < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{METHOD_LABELS[r.method ?? ''] ?? r.method ?? '–'}</span>
                      {r.body_condition_score != null && <span className="text-xs text-gray-400">BCS {r.body_condition_score}</span>}
                      {r.recorded_by && <span className="text-xs text-gray-400 truncate">by {r.recorded_by}</span>}
                      {r.notes && <span className="text-xs text-gray-400 italic truncate">{r.notes}</span>}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function WeightManagementModal({ isOpen, onClose, farmId }: WeightManagementModalProps) {
  const { summaries, loading, error, refetch, addWeightRecord } = useWeightManagement({ farmId, enabled: isOpen })

  const [search,           setSearch]           = useState('')
  const [filterTrend,      setFilterTrend]      = useState<'all' | 'gaining' | 'losing' | 'stable'>('all')
  const [expandedId,       setExpandedId]       = useState<string | null>(null)
  const [addWeightTarget,  setAddWeightTarget]  = useState<AnimalWeightSummary | null>(null)

  if (!isOpen) return null

  const animalsWithWeight = summaries.filter(a => a.current_weight != null)
  const avgWeight      = animalsWithWeight.length ? Math.round(animalsWithWeight.reduce((s, a) => s + a.current_weight!, 0) / animalsWithWeight.length) : 0
  const gaining        = summaries.filter(a => a.trend === 'gaining').length
  const losing         = summaries.filter(a => a.trend === 'losing').length
  const overdueCount   = summaries.filter(a => (a.days_since_last ?? 0) > 30 || a.current_weight == null).length

  const filtered = useMemo(() => summaries.filter(a => {
    const matchSearch = !search || a.tag_number.toLowerCase().includes(search.toLowerCase()) || (a.name?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchTrend  = filterTrend === 'all' || a.trend === filterTrend
    return matchSearch && matchTrend
  }), [summaries, search, filterTrend])

  const handleWeightAdded = (record: WeightRecord) => {
    addWeightRecord(record.animal_id, record)
    setAddWeightTarget(null)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
        <div className="w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Weight Management</h2>
                <p className="text-xs text-gray-500">{loading ? 'Loading…' : `${summaries.length} animal${summaries.length !== 1 ? 's' : ''} tracked`}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refetch} disabled={loading} title="Refresh"
                className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all disabled:opacity-40">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={onClose} className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-px bg-gray-100 flex-shrink-0">
            {[
              { label: 'Avg weight',        value: loading ? '–' : animalsWithWeight.length ? `${avgWeight} kg` : 'No data', color: 'text-gray-900',    icon: <Scale className="h-4 w-4 text-gray-400" /> },
              { label: 'Gaining',           value: loading ? '–' : gaining,       color: 'text-emerald-600', icon: <TrendingUp  className="h-4 w-4 text-emerald-400" /> },
              { label: 'Losing',            value: loading ? '–' : losing,        color: 'text-red-500',     icon: <TrendingDown className="h-4 w-4 text-red-400" /> },
              { label: 'Overdue / no data', value: loading ? '–' : overdueCount,  color: overdueCount > 0 ? 'text-orange-600' : 'text-gray-400', icon: <AlertCircle className="h-4 w-4 text-orange-400" /> },
            ].map(s => (
              <div key={s.label} className="bg-white px-4 py-3 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">{s.icon}{s.label}</div>
                <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by tag or name..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white" />
            </div>
            <div className="flex items-center gap-1">
              {(['all', 'gaining', 'losing', 'stable'] as const).map(t => (
                <button key={t} onClick={() => setFilterTrend(t)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${filterTrend === t ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="text-sm">Loading weight data…</p>
              </div>
            )}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <p className="text-sm text-red-600 font-medium">Failed to load weight data</p>
                <p className="text-xs text-gray-400">{error}</p>
                <Button size="sm" variant="outline" onClick={refetch}>Try again</Button>
              </div>
            )}
            {!loading && !error && summaries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <Scale className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No animals found</p>
                <p className="text-xs text-center max-w-xs">Animals will appear here once they are added to your farm.</p>
              </div>
            )}
            {!loading && !error && summaries.length > 0 && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                <Search className="h-8 w-8 opacity-30" />
                <p className="text-sm font-medium">No animals match your search</p>
              </div>
            )}
            {!loading && !error && filtered.length > 0 && (
              <div className="space-y-2">
                {filtered.map(s => (
                  <AnimalWeightRow key={s.animal_id} summary={s}
                    onAddWeight={a => setAddWeightTarget(a)}
                    isExpanded={expandedId === s.animal_id}
                    onToggle={() => setExpandedId(prev => prev === s.animal_id ? null : s.animal_id)} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
            <p className="text-xs text-gray-400">{loading ? 'Loading…' : `Showing ${filtered.length} of ${summaries.length} animals`}</p>
            <Button variant="outline" onClick={onClose} size="sm">Close</Button>
          </div>
        </div>
      </div>

      {addWeightTarget && (
        <AddWeightModal isOpen={!!addWeightTarget} onClose={() => setAddWeightTarget(null)}
          animal={addWeightTarget} farmId={farmId} onWeightAdded={handleWeightAdded} />
      )}
    </>
  )
}