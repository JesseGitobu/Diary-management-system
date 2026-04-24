'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  Plus,
  Wheat,
  Clock,
  ChevronRight,
  ChevronLeft,
  Users,
  User,
  Edit3,
  Trash2,
  MoreVertical,
  CheckCircle2,
  CalendarClock,
  AlertCircle,
  FlaskConical,
  Layers,
  Activity,
  Scale,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Loader2,
  Leaf,
  Tag,
  Calendar,
  Search,
  Filter,
  X,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

const PAGE_SIZE = 10

interface FeedConsumptionTabProps {
  farmId: string
  consumptionRecords: any[]
  scheduledFeedings: any[]
  feedStats: any
  isMobile: boolean
  canRecordFeeding: boolean
  canEditRecords?: boolean
  canDeleteRecords?: boolean
  onRecordFeeding: () => void
  onEditRecord?: (record: any) => void
  onDeleteRecord?: (recordId: string) => void
  onScheduledFeedingConfirmed?: () => void
}

// ── helpers ────────────────────────────────────────────────────

function fmtDateTime(ts: string | null | undefined) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtTime(t: string | null | undefined) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const d = new Date()
  d.setHours(Number(h), Number(m))
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function modeLabel(mode: string | null) {
  if (mode === 'ration') return { label: 'Ration', icon: Layers, color: 'bg-purple-100 text-purple-700 border-purple-200' }
  if (mode === 'feed-mix-recipe' || mode === 'feed-mix-template') return { label: 'TMR Recipe', icon: FlaskConical, color: 'bg-orange-100 text-orange-700 border-orange-200' }
  return { label: 'Individual', icon: User, color: 'bg-blue-100 text-blue-700 border-blue-200' }
}

function isOverdue(sf: any): boolean {
  const dateTo = sf.schedule_date_to ?? sf.schedule_date_from
  const time = sf.feeding_time ?? '00:00:00'
  return new Date(`${dateTo}T${time}`) < new Date()
}

function sfTotalKg(sf: any): number {
  const entries: any[] = sf.scheduled_feeding_entries ?? []
  const animalCount = sf.animal_count ?? 0
  return entries.reduce((s, e) => s + (e.quantity_kg_per_animal ?? 0) * animalCount, 0)
}

function sfSessionTitle(sf: any): string {
  if (sf.schedule_name) return sf.schedule_name
  const slotName = sf.feed_time_slots?.slot_name ?? sf.slot_name
  if (slotName) return slotName
  if (sf.feed_rations?.name) return sf.feed_rations.name
  if (sf.feed_mix_recipes?.name) return sf.feed_mix_recipes.name
  const entries: any[] = sf.scheduled_feeding_entries ?? []
  if (entries.length === 1) return entries[0].feed_types?.name ?? 'Feeding Session'
  if (entries.length > 1) return `${entries[0].feed_types?.name ?? 'Feed'} +${entries.length - 1} more`
  return 'Feeding Session'
}

function sfSearchText(sf: any): string {
  return [
    sf.schedule_name,
    sf.slot_name,
    sf.feed_time_slots?.slot_name,
    sf.feed_rations?.name,
    sf.feed_mix_recipes?.name,
    ...(sf.scheduled_feeding_entries ?? []).map((e: any) => e.feed_types?.name),
  ].filter(Boolean).join(' ').toLowerCase()
}

function recordTitle(record: any): string {
  const mode = record.feeding_mode
  if (mode === 'feed-mix-recipe') return record.observations?.recipe_name ?? record.slot_name ?? 'TMR Recipe Session'
  if (mode === 'ration') return record.observations?.ration_name ?? 'Ration Session'
  const feeds: any[] = record.feed_consumption_feeds ?? []
  if (feeds.length === 1) return feeds[0].feed_types?.name ?? record.feed_types?.name ?? 'Feed Session'
  if (feeds.length > 1) return `${feeds[0].feed_types?.name ?? 'Feed'} +${feeds.length - 1} more`
  return record.feed_types?.name ?? 'Feed Session'
}

function recordSearchText(record: any): string {
  return [
    recordTitle(record),
    record.notes,
    record.feed_types?.name,
    ...(record.feed_consumption_feeds ?? []).map((f: any) => f.feed_types?.name),
  ].filter(Boolean).join(' ').toLowerCase()
}

// ── Pagination ─────────────────────────────────────────────────

interface PaginationProps {
  page: number
  total: number
  pageSize: number
  onPage: (p: number) => void
}

function Pagination({ page, total, pageSize, onPage }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-3 border-t">
      <span className="text-xs text-gray-500">
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline" size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let p = i + 1
          if (totalPages > 5) {
            if (page <= 3) p = i + 1
            else if (page >= totalPages - 2) p = totalPages - 4 + i
            else p = page - 2 + i
          }
          return (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              className="h-7 w-7 p-0 text-xs"
              onClick={() => onPage(p)}
            >
              {p}
            </Button>
          )
        })}
        <Button
          variant="outline" size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Confirm Dialog ─────────────────────────────────────────────

interface ConfirmDialogProps {
  sf: any
  onConfirm: (actualTime: string, lateReason: string) => void
  onCancel: () => void
  isLoading: boolean
}

function ConfirmFeedingDialog({ sf, onConfirm, onCancel, isLoading }: ConfirmDialogProps) {
  const entries: any[] = sf.scheduled_feeding_entries ?? []
  const animalCount = sf.animal_count ?? 0
  const scheduledAt = sf.schedule_date_from && sf.feeding_time
    ? new Date(`${sf.schedule_date_from}T${sf.feeding_time}`)
    : null

  const [actualTime, setActualTime] = useState(() => new Date().toISOString().slice(0, 16))
  const [lateReason, setLateReason] = useState('')

  const isLate = scheduledAt && new Date(actualTime) > scheduledAt

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b">
          <h3 className="font-semibold text-lg">Confirm Feeding Session</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {scheduledAt
              ? `Scheduled for ${fmtDateTime(scheduledAt.toISOString())}`
              : `Scheduled ${fmtDate(sf.schedule_date_from)} at ${fmtTime(sf.feeding_time)}`}
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Feeds in this session</p>
            {entries.map(e => (
              <div key={e.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">{e.feed_types?.name ?? 'Unknown feed'}</span>
                <div className="text-right">
                  <span className="text-sm text-gray-600">{e.quantity_kg_per_animal} kg/animal</span>
                  {animalCount > 0 && (
                    <span className="text-xs text-gray-400 ml-2">
                      ({(e.quantity_kg_per_animal * animalCount).toFixed(1)} kg total)
                    </span>
                  )}
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500">
              {animalCount} animal{animalCount !== 1 ? 's' : ''} • Total: {sfTotalKg(sf).toFixed(1)} kg
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Actual feeding time</label>
            <input
              type="datetime-local"
              value={actualTime}
              max={new Date().toISOString().slice(0, 16)}
              onChange={e => setActualTime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isLate && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-orange-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Reason for late feeding (required)
              </label>
              <textarea
                value={lateReason}
                onChange={e => setLateReason(e.target.value)}
                placeholder="e.g. Delayed due to equipment issue..."
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          )}
        </div>

        <div className="p-5 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => {
              if (isLate && !lateReason.trim()) return
              onConfirm(new Date(actualTime).toISOString(), lateReason.trim())
            }}
            disabled={isLoading || (!!isLate && !lateReason.trim())}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
            Confirm Feeding
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Scheduled session card ─────────────────────────────────────

function ScheduledSessionCard({ sf, onConfirm, canConfirm }: { sf: any; onConfirm: (sf: any) => void; canConfirm: boolean }) {
  const entries: any[] = sf.scheduled_feeding_entries ?? []
  const animalCount = sf.animal_count ?? 0
  const totalKg = sfTotalKg(sf)
  const { label: modeText, icon: ModeIcon, color: modeColor } = modeLabel(sf.feeding_mode)
  const overdue = isOverdue(sf)
  const isMultiDay = sf.schedule_date_from !== sf.schedule_date_to
  const slotLabel = sf.feed_time_slots?.slot_name ?? sf.slot_name ?? null
  const rationName = sf.feed_rations?.name ?? null
  const recipeName = sf.feed_mix_recipes?.name ?? null

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${overdue ? 'border-orange-300 bg-orange-50' : 'border-blue-200 bg-blue-50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarClock className={`w-4 h-4 flex-shrink-0 ${overdue ? 'text-orange-600' : 'text-blue-600'}`} />
            <span className="font-semibold text-sm text-gray-900">{sfSessionTitle(sf)}</span>
            {overdue && <Badge className="bg-orange-100 text-orange-700 border-orange-300 border text-xs">Overdue</Badge>}
            <Badge className={`${modeColor} border text-xs`}><ModeIcon className="w-3 h-3 mr-1" />{modeText}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {isMultiDay ? `${fmtDate(sf.schedule_date_from)} – ${fmtDate(sf.schedule_date_to)}` : fmtDate(sf.schedule_date_from)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {fmtTime(sf.feeding_time)}
              {slotLabel && <span className="text-gray-400">({slotLabel})</span>}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 flex-wrap">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{animalCount} animals</span>
            <span className="flex items-center gap-1"><Scale className="w-3 h-3" />{totalKg.toFixed(1)} kg total</span>
            {rationName && <span className="text-purple-600 font-medium">{rationName}</span>}
            {recipeName && <span className="text-orange-600 font-medium">{recipeName}</span>}
          </div>
        </div>
        {canConfirm && (
          <Button size="sm" onClick={() => onConfirm(sf)} className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />Confirm
          </Button>
        )}
      </div>

      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map(e => (
            <div key={e.id} className="flex items-center justify-between text-xs bg-white/70 rounded-lg px-3 py-1.5">
              <span className="font-medium text-gray-800">{e.feed_types?.name ?? 'Unknown'}</span>
              <span className="text-gray-600">
                {e.quantity_kg_per_animal} kg/animal
                {animalCount > 0 && <span className="text-gray-400 ml-1.5">• {(e.quantity_kg_per_animal * animalCount).toFixed(1)} kg total</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {sf.notes && (
        <p className="text-xs text-gray-600 flex items-center gap-1.5 pt-1">
          <StickyNote className="w-3 h-3 flex-shrink-0" />{sf.notes}
        </p>
      )}
    </div>
  )
}

// ── Consumption record card ────────────────────────────────────

function ConsumptionRecordCard({ record, isMobile, canEdit, canDelete, onEdit, onDelete }: {
  record: any; isMobile: boolean; canEdit: boolean; canDelete: boolean
  onEdit: (r: any) => void; onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const { label: modeText, icon: ModeIcon, color: modeColor } = modeLabel(record.feeding_mode)

  const toggleGroup = (id: string) =>
    setExpandedGroups(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const isTMR = record.feeding_mode === 'feed-mix-recipe'
  const isRation = record.feeding_mode === 'ration'
  const qty = record.total_quantity_kg ?? record.quantity_consumed ?? 0
  const animalCount = record.animal_count ?? 0
  const perAnimal = animalCount > 0 ? (qty / animalCount).toFixed(2) : null
  const animals: any[] = record.feed_consumption_animals ?? []
  const feedLines: any[] = record.feed_consumption_feeds ?? []
  const categoryGroups: any[] = record.observations?.category_animals ?? []
  const hasDetails = record.appetite_score || record.approximate_waste_kg || record.notes ||
    isRation || isTMR || animals.length > 0 || feedLines.length > 0

  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      <div className="p-4 flex items-start gap-3">
        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${isRation ? 'bg-purple-400' : isTMR ? 'bg-orange-400' : 'bg-blue-400'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <span className="font-semibold text-gray-900 truncate">{recordTitle(record)}</span>
              <Badge className={`${modeColor} border text-xs flex-shrink-0`}><ModeIcon className="w-3 h-3 mr-1" />{modeText}</Badge>
            </div>
            {(canEdit || canDelete) && (
              isMobile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && <DropdownMenuItem onClick={() => onEdit(record)}><Edit3 className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>}
                    {canDelete && <DropdownMenuItem onClick={() => onDelete(record.id)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {canEdit && <Button variant="ghost" size="sm" onClick={() => onEdit(record)} className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"><Edit3 className="h-3.5 w-3.5" /></Button>}
                  {canDelete && <Button variant="ghost" size="sm" onClick={() => onDelete(record.id)} className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              )
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-lg font-bold text-green-700">{qty.toFixed(1)} kg</span>
            </div>
            {animalCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Users className="w-3 h-3" />
                <span>{animalCount} animal{animalCount !== 1 ? 's' : ''}</span>
                {perAnimal && <span className="text-gray-400">• {perAnimal} kg each</span>}
              </div>
            )}
            {isTMR && record.observations?.session_percentage != null && (
              <span className="text-xs text-orange-600 font-medium bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">
                {record.observations.session_percentage}% of daily batch
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500 flex-wrap">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>{fmtDateTime(record.feeding_time ?? record.consumption_date)}</span>
            {record.observations?.slot_name && (
              <span className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 font-medium">{record.observations.slot_name}</span>
            )}
            {record.recorded_by && <span className="text-gray-400">• {record.recorded_by}</span>}
          </div>
        </div>
      </div>

      {hasDetails && (
        <>
          <button
            onClick={() => setExpanded(p => !p)}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <span>Details</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div className="px-4 pb-4 pt-3 border-t space-y-4 bg-gray-50/50">
              {feedLines.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5" />{isTMR ? 'Ingredients this session' : 'Feed breakdown'}
                  </p>
                  <div className="space-y-1">
                    {feedLines.map((fl: any) => (
                      <div key={fl.id} className="flex items-center justify-between text-xs bg-white border border-gray-100 rounded-lg px-3 py-1.5">
                        <span className="font-medium text-gray-800">{fl.feed_types?.name ?? fl.feed_type_id}</span>
                        <div className="flex items-center gap-2 text-gray-500">
                          {fl.percentage_of_mix != null && <span className="text-gray-400">{fl.percentage_of_mix}%</span>}
                          {animalCount > 0 && <span className="text-gray-600">{(Number(fl.quantity_kg) / animalCount).toFixed(2)} kg/animal</span>}
                          <span className="font-semibold text-gray-700">{Number(fl.quantity_kg).toFixed(2)} kg total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isTMR && categoryGroups.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Animal groups fed</p>
                  <div className="space-y-2">
                    {categoryGroups.map((group: any) => {
                      const isExp = expandedGroups.has(group.id)
                      const display = isExp ? group.animals : (group.animals as any[]).slice(0, 10)
                      const hasMore = (group.animals?.length ?? 0) > 10
                      return (
                        <div key={group.id} className="bg-white border border-gray-100 rounded-lg overflow-hidden">
                          <div className={`flex items-center justify-between px-3 py-1.5 ${group.type === 'category' ? 'bg-amber-50 border-b border-amber-100' : 'bg-blue-50 border-b border-blue-100'}`}>
                            <span className={`text-xs font-semibold ${group.type === 'category' ? 'text-amber-800' : 'text-blue-800'}`}>{group.name}</span>
                            <span className={`text-xs ${group.type === 'category' ? 'text-amber-600' : 'text-blue-600'}`}>{group.animals?.length ?? 0} animal{(group.animals?.length ?? 0) !== 1 ? 's' : ''}</span>
                          </div>
                          {group.animals?.length > 0 && (
                            <div className="px-3 py-2 flex flex-wrap gap-1.5">
                              {display.map((a: any) => (
                                <span key={a.id} className="text-xs bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                                  {a.tag ?? a.id?.slice(0, 6)}{a.name ? ` · ${a.name}` : ''}
                                </span>
                              ))}
                              {hasMore && (
                                <button onClick={() => toggleGroup(group.id)} className="text-xs text-blue-500 hover:text-blue-700 hover:underline font-medium">
                                  {isExp ? 'Show less' : `+${(group.animals?.length ?? 0) - 10} more`}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {!isTMR && animals.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Animals fed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const isExp = expandedGroups.has('__ind__')
                      const display = isExp ? animals : animals.slice(0, 12)
                      return (
                        <>
                          {display.map((a: any) => (
                            <span key={a.animal_id} className="text-xs bg-white border border-gray-200 rounded-md px-2 py-0.5">
                              {a.animals?.tag_number ?? a.animal_id.slice(0, 8)}{a.animals?.name && ` · ${a.animals.name}`}
                            </span>
                          ))}
                          {animals.length > 12 && (
                            <button onClick={() => toggleGroup('__ind__')} className="text-xs text-blue-500 hover:text-blue-700 hover:underline font-medium">
                              {isExp ? 'Show less' : `+${animals.length - 12} more`}
                            </button>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {record.appetite_score != null && (
                  <div className="bg-white border rounded-lg p-2 text-center">
                    <Activity className="w-4 h-4 mx-auto text-blue-500 mb-0.5" />
                    <p className="text-xs text-gray-500">Appetite</p>
                    <p className="font-semibold text-gray-900">{record.appetite_score}/5</p>
                  </div>
                )}
                {record.approximate_waste_kg != null && (
                  <div className="bg-white border rounded-lg p-2 text-center">
                    <Wheat className="w-4 h-4 mx-auto text-yellow-500 mb-0.5" />
                    <p className="text-xs text-gray-500">Waste</p>
                    <p className="font-semibold text-gray-900">{record.approximate_waste_kg} kg</p>
                  </div>
                )}
              </div>

              {record.notes && (
                <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-white border rounded-lg p-2.5">
                  <StickyNote className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" /><span>{record.notes}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export function FeedConsumptionTab({
  farmId,
  consumptionRecords,
  scheduledFeedings,
  feedStats,
  isMobile,
  canRecordFeeding,
  canEditRecords = false,
  canDeleteRecords = false,
  onRecordFeeding,
  onEditRecord,
  onDeleteRecord,
  onScheduledFeedingConfirmed,
}: FeedConsumptionTabProps) {
  // Sub-tab
  const [activeTab, setActiveTab] = useState<'scheduled' | 'records'>('scheduled')

  // Confirm dialog
  const [confirmingSf, setConfirmingSf] = useState<any | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  // ── Scheduled tab filters + pagination ────────────────────────
  const [sfSearch, setSfSearch] = useState('')
  const [sfStatusFilter, setSfStatusFilter] = useState<'all' | 'pending' | 'overdue'>('all')
  const [sfModeFilter, setSfModeFilter] = useState<'all' | 'individual' | 'ration' | 'feed-mix-template'>('all')
  const [sfDateFilter, setSfDateFilter] = useState('')
  const [sfPage, setSfPage] = useState(1)

  // ── Records tab filters + pagination ──────────────────────────
  const [recSearch, setRecSearch] = useState('')
  const [recModeFilter, setRecModeFilter] = useState<'all' | 'individual' | 'ration' | 'feed-mix-recipe'>('all')
  const [recDateFilter, setRecDateFilter] = useState('')
  const [recPage, setRecPage] = useState(1)

  // ── Filtered scheduled feedings ───────────────────────────────
  const filteredScheduled = useMemo(() => {
    return scheduledFeedings
      .filter(sf => sf.status === 'pending' || sf.status === 'overdue')
      .filter(sf => sfStatusFilter === 'all' || sf.status === sfStatusFilter)
      .filter(sf => sfModeFilter === 'all' || sf.feeding_mode === sfModeFilter)
      .filter(sf => !sfDateFilter || sf.schedule_date_from === sfDateFilter || sf.schedule_date_to === sfDateFilter ||
        (sf.schedule_date_from <= sfDateFilter && sf.schedule_date_to >= sfDateFilter))
      .filter(sf => !sfSearch.trim() || sfSearchText(sf).includes(sfSearch.trim().toLowerCase()))
      .sort((a, b) => {
        const aKey = `${a.schedule_date_from}T${a.feeding_time ?? '00:00'}`
        const bKey = `${b.schedule_date_from}T${b.feeding_time ?? '00:00'}`
        return aKey.localeCompare(bKey)
      })
  }, [scheduledFeedings, sfSearch, sfStatusFilter, sfModeFilter, sfDateFilter])

  const sfPageItems = filteredScheduled.slice((sfPage - 1) * PAGE_SIZE, sfPage * PAGE_SIZE)

  // ── Filtered consumption records ──────────────────────────────
  const filteredRecords = useMemo(() => {
    return consumptionRecords
      .filter(r => recModeFilter === 'all' || r.feeding_mode === recModeFilter)
      .filter(r => !recDateFilter || r.consumption_date === recDateFilter)
      .filter(r => !recSearch.trim() || recordSearchText(r).includes(recSearch.trim().toLowerCase()))
  }, [consumptionRecords, recSearch, recModeFilter, recDateFilter])

  const recPageItems = filteredRecords.slice((recPage - 1) * PAGE_SIZE, recPage * PAGE_SIZE)

  const handleDelete = (recordId: string) => {
    if (onDeleteRecord && confirm('Delete this feeding record? This will also restore the inventory deducted.')) {
      onDeleteRecord(recordId)
    }
  }

  const handleConfirmSession = async (actualTime: string, lateReason: string) => {
    if (!confirmingSf) return
    setConfirmLoading(true)
    setConfirmError(null)
    try {
      const res = await fetch(`/api/farms/${farmId}/scheduled-feedings/${confirmingSf.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', actualFeedingTime: actualTime, lateReason: lateReason || undefined }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to confirm feeding')
      }
      setConfirmingSf(null)
      onScheduledFeedingConfirmed?.()
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Failed to confirm feeding')
    } finally {
      setConfirmLoading(false)
    }
  }

  const pendingCount = scheduledFeedings.filter(f => f.status === 'pending' || f.status === 'overdue').length
  const overdueCount = scheduledFeedings.filter(f => f.status === 'overdue').length

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Sub-tab bar ── */}
      <div className="flex items-center gap-1 mb-4 bg-gray-100 rounded-xl p-1 flex-shrink-0">
        <button
          onClick={() => setActiveTab('scheduled')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'scheduled'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          Scheduled
          {pendingCount > 0 && (
            <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
              overdueCount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'records'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Wheat className="w-4 h-4" />
          Records
          {consumptionRecords.length > 0 && (
            <span className="text-xs rounded-full px-1.5 py-0.5 font-semibold bg-gray-200 text-gray-600">
              {consumptionRecords.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Scheduled Feedings tab ── */}
      {activeTab === 'scheduled' && (
        <Card className="flex flex-col min-h-0 flex-1">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                <CalendarClock className="w-5 h-5 text-blue-600" />
                Scheduled Feedings
              </CardTitle>
              {canRecordFeeding && !isMobile && (
                <Button onClick={onRecordFeeding} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />Schedule
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="space-y-2 mt-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Search sessions, feeds, slots…"
                  value={sfSearch}
                  onChange={e => { setSfSearch(e.target.value); setSfPage(1) }}
                  className="pl-8 h-8 text-sm"
                />
                {sfSearch && (
                  <button onClick={() => { setSfSearch(''); setSfPage(1) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                {/* Status filter */}
                {(['all', 'pending', 'overdue'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { setSfStatusFilter(v); setSfPage(1) }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      sfStatusFilter === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {v === 'all' ? 'All status' : v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
                <div className="w-px h-4 bg-gray-200" />
                {/* Mode filter */}
                {(['all', 'individual', 'ration', 'feed-mix-template'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { setSfModeFilter(v); setSfPage(1) }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      sfModeFilter === v ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {v === 'all' ? 'All modes' : v === 'feed-mix-template' ? 'TMR' : v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
                <div className="w-px h-4 bg-gray-200" />
                {/* Date filter */}
                <input
                  type="date"
                  value={sfDateFilter}
                  onChange={e => { setSfDateFilter(e.target.value); setSfPage(1) }}
                  className="h-7 text-xs border border-gray-200 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  title="Filter by date"
                />
                {sfDateFilter && (
                  <button onClick={() => { setSfDateFilter(''); setSfPage(1) }} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col min-h-0 flex-1 pt-0">
            {/* Scrollable list */}
            <div className="overflow-y-auto flex-1 space-y-3 pr-0.5" style={{ maxHeight: isMobile ? '55vh' : '60vh' }}>
              {sfPageItems.length > 0 ? (
                sfPageItems.map(sf => (
                  <ScheduledSessionCard
                    key={sf.id}
                    sf={sf}
                    onConfirm={s => { setConfirmError(null); setConfirmingSf(s) }}
                    canConfirm={canRecordFeeding}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <CalendarClock className="mx-auto h-9 w-9 text-gray-200 mb-3" />
                  <p className="text-sm font-medium text-gray-900">
                    {filteredScheduled.length === 0 && scheduledFeedings.filter(f => f.status === 'pending' || f.status === 'overdue').length > 0
                      ? 'No sessions match your filters'
                      : 'No pending scheduled feedings'}
                  </p>
                  {canRecordFeeding && (
                    <Button className="mt-4" onClick={onRecordFeeding} size="sm">
                      <Plus className="w-4 h-4 mr-2" />Schedule Feeding
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredScheduled.length > PAGE_SIZE && (
              <Pagination
                page={sfPage}
                total={filteredScheduled.length}
                pageSize={PAGE_SIZE}
                onPage={p => setSfPage(p)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Feeding Records tab ── */}
      {activeTab === 'records' && (
        <Card className="flex flex-col min-h-0 flex-1">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Feeding Records</CardTitle>
              {canRecordFeeding && !isMobile && (
                <Button onClick={onRecordFeeding} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />Record Feeding
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="space-y-2 mt-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Search records, feeds…"
                  value={recSearch}
                  onChange={e => { setRecSearch(e.target.value); setRecPage(1) }}
                  className="pl-8 h-8 text-sm"
                />
                {recSearch && (
                  <button onClick={() => { setRecSearch(''); setRecPage(1) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                {(['all', 'individual', 'ration', 'feed-mix-recipe'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { setRecModeFilter(v); setRecPage(1) }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      recModeFilter === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {v === 'all' ? 'All modes' : v === 'feed-mix-recipe' ? 'TMR' : v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
                <div className="w-px h-4 bg-gray-200" />
                <input
                  type="date"
                  value={recDateFilter}
                  onChange={e => { setRecDateFilter(e.target.value); setRecPage(1) }}
                  className="h-7 text-xs border border-gray-200 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  title="Filter by date"
                />
                {recDateFilter && (
                  <button onClick={() => { setRecDateFilter(''); setRecPage(1) }} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col min-h-0 flex-1 pt-0">
            <div className="overflow-y-auto flex-1 space-y-3 pr-0.5" style={{ maxHeight: isMobile ? '55vh' : '60vh' }}>
              {recPageItems.length > 0 ? (
                recPageItems.map(record => (
                  <ConsumptionRecordCard
                    key={record.id}
                    record={record}
                    isMobile={isMobile}
                    canEdit={canEditRecords}
                    canDelete={canDeleteRecords}
                    onEdit={r => onEditRecord?.(r)}
                    onDelete={handleDelete}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Wheat className="mx-auto h-9 w-9 text-gray-200 mb-3" />
                  <p className="text-sm font-medium text-gray-900">
                    {filteredRecords.length === 0 && consumptionRecords.length > 0
                      ? 'No records match your filters'
                      : 'No feeding records yet'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Record your first feeding session to start tracking.</p>
                  {canRecordFeeding && (
                    <Button className="mt-4" onClick={onRecordFeeding} size="sm">
                      <Plus className="w-4 h-4 mr-2" />Record First Feeding
                    </Button>
                  )}
                </div>
              )}
            </div>

            {filteredRecords.length > PAGE_SIZE && (
              <Pagination
                page={recPage}
                total={filteredRecords.length}
                pageSize={PAGE_SIZE}
                onPage={p => setRecPage(p)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Confirm dialog ── */}
      {confirmingSf && (
        <ConfirmFeedingDialog
          sf={confirmingSf}
          onConfirm={handleConfirmSession}
          onCancel={() => { setConfirmingSf(null); setConfirmError(null) }}
          isLoading={confirmLoading}
        />
      )}

      {confirmError && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 text-red-800 text-sm rounded-lg px-4 py-2 shadow-lg z-50">
          {confirmError}
        </div>
      )}
    </div>
  )
}
