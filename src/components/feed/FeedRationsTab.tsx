// src/components/feed/FeedRationsTab.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Plus,
  FlaskConical,
  Pencil,
  Trash2,
  Users,
  User,
  ChevronDown,
  ChevronUp,
  BookOpen,
  CalendarRange,
  Clock,
} from 'lucide-react'
import { CreateFeedRationModal } from './CreateFeedRationModal'
import { AssignFeedRationModal } from './AssignFeedRationModal'
import { FileText, Zap } from 'lucide-react'

interface FeedRationsTabProps {
  farmId: string
  feedTypes: any[]
  inventory: any[]
  animals: any[]
  animalCategories: any[]
  canManageFeed: boolean
  isMobile: boolean
  initialOpenCreate?: boolean
  onCreateModalClosed?: () => void
  timeSlots?: any[]
}

const STAGE_LABELS: Record<string, string> = {
  high_production: 'High Production',
  mid_production:  'Mid Production',
  low_production:  'Low Production',
  dry:             'Dry Cow',
  steaming_dry:    'Steaming Dry',
  calf:            'Calf',
  bull:            'Bull',
}

const STAGE_COLORS: Record<string, string> = {
  high_production: 'bg-green-100 text-green-800 border-green-200',
  mid_production:  'bg-blue-100 text-blue-800 border-blue-200',
  low_production:  'bg-yellow-100 text-yellow-800 border-yellow-200',
  dry:             'bg-orange-100 text-orange-800 border-orange-200',
  steaming_dry:    'bg-purple-100 text-purple-800 border-purple-200',
  calf:            'bg-pink-100 text-pink-800 border-pink-200',
  bull:            'bg-gray-100 text-gray-800 border-gray-200',
}

interface DisplaySession {
  key: string
  slotName: string
  scheduledTime: string
  totalKg: number
  quantityPercent: number | null
  isIngredientLevel: boolean
}

function buildDisplaySessions(ration: any): DisplaySession[] {
  const rationSessions: any[] = ration.feed_ration_sessions ?? []

  if (rationSessions.length > 0) {
    return [...rationSessions]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s: any) => {
        const pct = s.quantity_percent ?? null
        const totalKg = ration.total_daily_kg && pct != null
          ? (ration.total_daily_kg * pct) / 100
          : 0
        return {
          key: s.id,
          slotName: s.feed_time_slots?.slot_name ?? s.custom_slot_name ?? '',
          scheduledTime: (s.feed_time_slots?.scheduled_time ?? s.custom_time ?? '').slice(0, 5),
          totalKg,
          quantityPercent: pct,
          isIngredientLevel: false,
        }
      })
  }

  // Aggregate ingredient-level sessions by time slot
  const ingredients: any[] = ration.feed_ration_ingredients ?? []
  const slotMap = new Map<string, { slotName: string; scheduledTime: string; totalKg: number; sortOrder: number }>()

  for (const ing of ingredients) {
    for (const s of (ing.feed_ingredient_sessions ?? [])) {
      const key = s.time_slot_id ?? `custom-${s.feed_time_slots?.slot_name ?? ''}`
      if (!slotMap.has(key)) {
        slotMap.set(key, {
          slotName: s.feed_time_slots?.slot_name ?? '',
          scheduledTime: (s.feed_time_slots?.scheduled_time ?? '').slice(0, 5),
          totalKg: 0,
          sortOrder: s.sort_order ?? 0,
        })
      }
      slotMap.get(key)!.totalKg += s.quantity_kg ?? 0
    }
  }

  return Array.from(slotMap.entries())
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    .map(([key, slot]) => ({
      key,
      slotName: slot.slotName,
      scheduledTime: slot.scheduledTime,
      totalKg: slot.totalKg,
      quantityPercent: ration.total_daily_kg
        ? Math.round((slot.totalKg / ration.total_daily_kg) * 100)
        : null,
      isIngredientLevel: true,
    }))
}

export function FeedRationsTab({
  farmId,
  feedTypes,
  inventory,
  animals,
  animalCategories,
  canManageFeed,
  isMobile,
  initialOpenCreate = false,
  onCreateModalClosed,
  timeSlots: initialTimeSlots = [],
}: FeedRationsTabProps) {
  const [rations, setRations] = useState<any[]>([])
  const [rationTypes, setRationTypes] = useState<any[]>([])
  const [tmrRecipes, setTmrRecipes] = useState<any[]>([])
  const [timeSlots, setTimeSlots] = useState<any[]>(initialTimeSlots)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Tracks which TMR ingredient rows are expanded to show sub-ingredients (key = `${rationId}-${ingId}`)
  const [expandedTmrIngredients, setExpandedTmrIngredients] = useState<Set<string>>(new Set())
  const toggleTmrIngredient = (key: string) =>
    setExpandedTmrIngredients(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  const [showCreateModal, setShowCreateModal] = useState(initialOpenCreate)
  const [editingRation, setEditingRation] = useState<any | null>(null)
  const [assigningRation, setAssigningRation] = useState<any | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setShowCreateModal(initialOpenCreate)
  }, [initialOpenCreate])

  // Daily plan state: keyed by ration id
  const [dailyPlans, setDailyPlans] = useState<Record<string, any>>({})
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0])

  async function loadOrGeneratePlan(ration: any) {
    const assignments: any[] = ration.feed_ration_assignments ?? []
    const active = assignments.find((a: any) => a.is_active)

    setLoadingPlan(ration.id)
    try {
      if (active) {
        // Assignment-row path: fetch plan keyed by assignment_id
        const url = `/api/farms/${farmId}/feed-rations/${ration.id}/daily-plan?assignment_id=${active.id}&date=${planDate}`
        const res = await fetch(url)
        if (res.ok) {
          const { plan } = await res.json()
          setDailyPlans(prev => ({ ...prev, [ration.id]: plan ?? null }))
        }
      } else {
        // Category-via-feed_ration_id path: fetch all farm plans for the date
        // and pick the first one matching this ration
        const url = `/api/farms/${farmId}/feed-rations/${ration.id}/daily-plan?date=${planDate}`
        const res = await fetch(url)
        if (res.ok) {
          const { plan, plans } = await res.json()
          const matched = plan ?? (Array.isArray(plans) ? plans.find((p: any) => p.ration_id === ration.id) : null)
          setDailyPlans(prev => ({ ...prev, [ration.id]: matched ?? null }))
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoadingPlan(null)
    }
  }

  useEffect(() => {
    loadRations()
    loadRationTypes()
    loadTimeSlots()
    loadTmrRecipes()
  }, [farmId])

  useEffect(() => {
    if (expandedId) {
      const expanded = rations.find(r => r.id === expandedId)
      console.log('\n👁️ Expanded ration:', expanded?.name)
      const rationSessions = expanded?.feed_ration_sessions ?? []
      console.log(`   Ration-level sessions: ${rationSessions.length}`)
      
      // Check ingredient sessions too
      const ingredientSessions = (expanded?.feed_ration_ingredients ?? []).flatMap((ing: any) => ing.feed_ingredient_sessions ?? [])
      console.log(`   Ingredient-level sessions: ${ingredientSessions.length}`)
      
      if (rationSessions.length === 0 && ingredientSessions.length > 0) {
        console.log(`   ⚠️  WARNING: Sessions exist at INGREDIENT level but not at RATION level`)
        console.log(`   Sessions need to be created via "feed_ration_sessions" table for display`)
      }
      
      rationSessions.forEach((s: any, idx: number) => {
        const totalDailyKg = expanded?.total_daily_kg
        const sessionPercentage = s.quantity_percent ?? 0
        const qtyPerAnimalKg = totalDailyKg && sessionPercentage
          ? ((totalDailyKg * sessionPercentage) / 100).toFixed(2)
          : null
        console.log(`   Session ${idx}: ${s.feed_time_slots?.slot_name || s.custom_slot_name} | ${s.quantity_percent}% | ${qtyPerAnimalKg} kg/animal`)
      })
    }
  }, [expandedId, rations])

  async function loadRations() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/farms/${farmId}/feed-rations`)
      if (!res.ok) throw new Error('Failed to load rations')
      const json = await res.json()
      console.log('🔄 Loaded feed rations:', json.data)
      json.data?.forEach((ration: any) => {
        console.log(`\n📋 Ration: "${ration.name}"`)
        console.log(`   Total daily kg: ${ration.total_daily_kg}`)
        console.log(`   Ration-level sessions (feed_ration_sessions): ${ration.feed_ration_sessions?.length ?? 0}`, ration.feed_ration_sessions)
        console.log(`   Assignments: ${ration.assignment_count}`)
        
        // Also check ingredient-level sessions
        const ingredientSessionCount = (ration.feed_ration_ingredients ?? []).reduce((sum: number, ing: any) => {
          return sum + (ing.feed_ingredient_sessions?.length ?? 0)
        }, 0)
        console.log(`   Ingredient-level sessions (feed_ingredient_sessions): ${ingredientSessionCount}`)
        
        if (ingredientSessionCount > 0) {
          console.log(`   ⚠️  Sessions found at INGREDIENT level, not ration level`)
          ration.feed_ration_ingredients?.forEach((ing: any, ingIdx: number) => {
            if (ing.feed_ingredient_sessions?.length > 0) {
              console.log(`     Ingredient ${ingIdx}: ${ing.feed_types?.name || ing.feed_mix_recipes?.name}`)
              ing.feed_ingredient_sessions.forEach((sess: any, sessIdx: number) => {
                console.log(`       Session ${sessIdx}: ${sess.feed_time_slots?.slot_name} - ${sess.quantity_kg} kg`)
              })
            }
          })
        }
      })
      setRations(json.data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadRationTypes() {
    try {
      const res = await fetch('/api/feed-ration-types')
      if (!res.ok) return
      const json = await res.json()
      setRationTypes(json.data ?? [])
    } catch (err) {
      console.error(err)
    }
  }

  async function loadTimeSlots() {
    try {
      const res = await fetch(`/api/farms/${farmId}/feed-settings/time-slots`)
      if (!res.ok) return
      const json = await res.json()
      setTimeSlots(json ?? [])
    } catch (err) {
      console.error('Failed to load time slots:', err)
    }
  }

  async function loadTmrRecipes() {
    try {
      const res = await fetch(`/api/farms/${farmId}/feed-recipes`)
      if (!res.ok) return
      const json = await res.json()
      setTmrRecipes(json.recipes ?? [])
    } catch (err) {
      console.error('Failed to load TMR recipes:', err)
    }
  }

  async function handleDelete(rationId: string) {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/farms/${farmId}/feed-rations/${rationId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Delete failed')
      }
      setRations(prev => prev.filter(r => r.id !== rationId))
      setDeleteConfirmId(null)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete ration')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleRemoveAssignment(rationId: string, assignmentId: string) {
    try {
      const res = await fetch(
        `/api/farms/${farmId}/feed-rations/${rationId}/assignments/${assignmentId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Failed to remove assignment')
      setRations(prev =>
        prev.map(r =>
          r.id === rationId
            ? {
                ...r,
                feed_ration_assignments: r.feed_ration_assignments.filter(
                  (a: any) => a.id !== assignmentId
                ),
                assignment_count: (r.assignment_count ?? 1) - 1,
              }
            : r
        )
      )
    } catch (err) {
      console.error(err)
      alert('Failed to remove assignment')
    }
  }

  function handleRationCreated(newRation: any) {
    setRations(prev => [newRation, ...prev])
    setShowCreateModal(false)
  }

  function handleRationUpdated(updated: any) {
    setRations(prev => prev.map(r => (r.id === updated.id ? updated : r)))
    setEditingRation(null)
  }

  function handleAssignmentCreated(rationId: string, assignment: any) {
    setRations(prev =>
      prev.map(r =>
        r.id === rationId
          ? {
              ...r,
              feed_ration_assignments: [assignment, ...(r.feed_ration_assignments ?? [])],
              assignment_count: (r.assignment_count ?? 0) + 1,
            }
          : r
      )
    )
    setAssigningRation(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Feed Rations</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Define balanced rations and assign them to individual animals or groups
          </p>
        </div>
        {canManageFeed && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {isMobile ? 'Create' : 'Create Feed Ration'}
          </Button>
        )}
      </div>

      {/* Predefined types reference card */}
      {/* <Card className="border-blue-100 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">
                7 predefined ration templates available
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rationTypes.map(rt => (
                  <span
                    key={rt.id}
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      STAGE_COLORS[rt.target_stage ?? ''] ?? 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    {rt.name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-1.5">
                Select a template when creating a ration to pre-fill the ration type, or create a fully custom ration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Empty state */}
      {rations.length === 0 && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <FlaskConical className="h-12 w-12 text-gray-300" />
            <div>
              <p className="font-medium text-gray-700">No feed rations yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Create your first ration to start assigning balanced diets to your animals
              </p>
            </div>
            {canManageFeed && (
              <Button className="mt-2" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Feed Ration
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ration cards */}
      {rations.map(ration => {
        const stage = ration.feed_ration_types?.target_stage
        const isExpanded = expandedId === ration.id
        const ingredients: any[] = ration.feed_ration_ingredients ?? []
        const assignments: any[] = ration.feed_ration_assignments ?? []
        const displaySessions = buildDisplaySessions(ration)
        const hasIngredientLevelSessions = (ration.feed_ration_sessions?.length ?? 0) === 0 && displaySessions.length > 0
        // Categories assigned via the direct feed_ration_id column
        const directCategories = animalCategories.filter(
          (c: any) => c.feed_ration_id === ration.id
        )

        return (
          <Card key={ration.id} className="overflow-hidden">
            {/* Card header */}
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base truncate">{ration.name}</CardTitle>
                    {!ration.is_active && (
                      <Badge variant="outline" className="text-xs text-gray-500">
                        Inactive
                      </Badge>
                    )}
                    {stage && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          STAGE_COLORS[stage] ?? 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {STAGE_LABELS[stage] ?? stage}
                      </span>
                    )}
                  </div>
                  {ration.description && (
                    <CardDescription className="mt-1 line-clamp-2">
                      {ration.description}
                    </CardDescription>
                  )}
                </div>

                {/* Action buttons */}
                {canManageFeed && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssigningRation(ration)}
                      title="Assign to animal / group"
                    >
                      <Users className="h-3.5 w-3.5" />
                      {!isMobile && <span className="ml-1 text-xs">Assign</span>}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingRation(ration)}
                      title="Edit ration"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteConfirmId(ration.id)}
                      title="Delete ration"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Summary pills */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                <span>{ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>
                  {ration.total_daily_kg
                    ? `${ration.total_daily_kg} kg/animal/day`
                    : 'No daily total set'}
                </span>
                <span>·</span>
                <span>
                  {assignments.length + directCategories.length} assignment{(assignments.length + directCategories.length) !== 1 ? 's' : ''}
                </span>
                {displaySessions.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-indigo-600">
                      <Clock className="h-3 w-3" />
                      {displaySessions.length} session{displaySessions.length !== 1 ? 's' : ''}
                      {hasIngredientLevelSessions && (
                        <span className="text-gray-400">(per ingredient)</span>
                      )}
                    </span>
                  </>
                )}
                {(ration.start_date || ration.end_date) && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-blue-600">
                      <CalendarRange className="h-3 w-3" />
                      {ration.start_date && ration.end_date
                        ? `${new Date(ration.start_date).toLocaleDateString()} – ${new Date(ration.end_date).toLocaleDateString()}`
                        : ration.start_date
                        ? `From ${new Date(ration.start_date).toLocaleDateString()}`
                        : `Until ${new Date(ration.end_date).toLocaleDateString()}`}
                    </span>
                  </>
                )}
              </div>
            </CardHeader>

            {/* Expand toggle */}
            <button
              className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-t border-gray-100 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : ration.id)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Show details
                </>
              )}
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <CardContent className="pt-0 pb-4 border-t border-gray-100">
                <div className={isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-6'}>
                  {/* Ingredients */}
                  <div>
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      Ingredients
                    </p>
                    {ingredients.length === 0 ? (
                      <p className="text-xs text-gray-400">No ingredients added</p>
                    ) : (
                      <div className="space-y-1.5">
                        {[...ingredients]
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map(ing => {
                            const isTMR = !!ing.tmr_recipe_id
                            const tmrRecipe = isTMR ? tmrRecipes.find(r => r.id === ing.tmr_recipe_id) : null
                            const ingredientName = isTMR
                              ? tmrRecipe?.name ?? 'Unknown recipe'
                              : ing.feed_types?.name ?? 'Unknown feed'
                            const tmrKey = `${ration.id}-${ing.id}`
                            const isTmrExpanded = expandedTmrIngredients.has(tmrKey)

                            return (
                              <div key={ing.id} className="space-y-1">
                                {/* Main ingredient row */}
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-800 flex items-center gap-1.5">
                                    {ingredientName}
                                    {isTMR && (
                                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">TMR</span>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500 tabular-nums text-xs">
                                      {ing.quantity_kg_per_day} kg/day
                                      {ing.percentage != null && (
                                        <span className="ml-1 text-gray-400">({ing.percentage}%)</span>
                                      )}
                                    </span>
                                    {isTMR && tmrRecipe?.ingredients?.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => toggleTmrIngredient(tmrKey)}
                                        className="text-blue-500 hover:text-blue-700 transition-colors"
                                        title={isTmrExpanded ? 'Hide sub-ingredients' : 'Show sub-ingredients'}
                                      >
                                        {isTmrExpanded
                                          ? <ChevronUp className="h-3.5 w-3.5" />
                                          : <ChevronDown className="h-3.5 w-3.5" />}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* TMR sub-ingredients (nested) */}
                                {isTMR && isTmrExpanded && tmrRecipe?.ingredients?.length > 0 && (
                                  <div className="ml-3 pl-3 border-l-2 border-blue-100 space-y-1">
                                    {tmrRecipe.ingredients.map((subIng: any, idx: number) => {
                                      const subKg = ing.quantity_kg_per_day && subIng.percentage_of_mix
                                        ? (ing.quantity_kg_per_day * subIng.percentage_of_mix) / 100
                                        : null
                                      return (
                                        <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
                                          <span>{subIng.feed_name ?? 'Unknown'}</span>
                                          <span className="tabular-nums text-gray-400">
                                            {subIng.percentage_of_mix}%
                                            {subKg != null && (
                                              <span className="ml-1 text-gray-500">· {subKg.toFixed(2)} kg/day</span>
                                            )}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>

                  {/* Sessions */}
                  {displaySessions.length > 0 && (
                    <div className={isMobile ? '' : 'col-span-2'}>
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          Feeding Sessions & Quantities
                        </p>
                        {hasIngredientLevelSessions && (
                          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            aggregated from ingredients
                          </span>
                        )}
                      </div>
                      <div className="border border-indigo-100 rounded-lg overflow-hidden bg-white">
                        <div className="divide-y divide-indigo-50">
                          {displaySessions.map((s, idx) => {
                            const hour = s.scheduledTime ? parseInt(s.scheduledTime.split(':')[0]) : null
                            const min  = s.scheduledTime ? s.scheduledTime.split(':')[1] : ''
                            const label12h = hour !== null
                              ? `${hour % 12 || 12}:${min} ${hour >= 12 ? 'PM' : 'AM'}`
                              : ''

                            return (
                              <div key={s.key || `session-${idx}`} className="px-3 py-2.5 flex items-center justify-between hover:bg-indigo-50/30 transition-colors">
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  <Clock className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-800">{s.slotName}</p>
                                    {label12h && <p className="text-xs text-gray-500">{label12h}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0 ml-2 text-right">
                                  {s.quantityPercent != null && (
                                    <p className="text-xs font-semibold text-indigo-700">{s.quantityPercent}%</p>
                                  )}
                                  <p className="text-xs text-gray-500">{s.totalKg.toFixed(2)} kg</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600 flex items-center justify-between">
                        <span>Total sessions: <span className="font-semibold text-gray-800">{displaySessions.length}</span></span>
                        {displaySessions.some(s => s.quantityPercent != null) && (
                          <span>Total %: <span className="font-semibold text-gray-800">{displaySessions.reduce((sum, s) => sum + (s.quantityPercent ?? 0), 0)}%</span></span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Daily Feeding Sheet */}
                  {/* {((ration.feed_ration_assignments ?? []).some((a: any) => a.is_active) || directCategories.length > 0) && (
                    <div className={isMobile ? '' : 'col-span-2'}>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          Daily Feeding Sheet
                        </p>
                        <input
                          type="date"
                          value={planDate}
                          onChange={e => setPlanDate(e.target.value)}
                          className="text-xs border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={() => loadOrGeneratePlan(ration)}
                          disabled={loadingPlan === ration.id}
                          className="flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded text-indigo-700 transition-colors"
                        >
                          <Zap className="h-3 w-3" />
                          {loadingPlan === ration.id ? 'Loading…' : 'Load Plan'}
                        </button>
                      </div>

                      {dailyPlans[ration.id] === undefined ? (
                        <p className="text-xs text-gray-400">Click "Load Plan" to view the feeding sheet for this date.</p>
                      ) : dailyPlans[ration.id] === null ? (
                        <p className="text-xs text-gray-400">No plan for {planDate}. Generate one using the daily plan API.</p>
                      ) : (
                        <div className="border border-indigo-100 rounded-lg overflow-hidden text-xs">
                          <div className="bg-indigo-50 px-3 py-1.5 flex items-center justify-between">
                            <span className="text-indigo-800 font-medium flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {dailyPlans[ration.id].animal_count} animals · {dailyPlans[ration.id].total_kg_all_animals ?? '?'} kg total
                            </span>
                            {dailyPlans[ration.id].is_completed && (
                              <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Completed</span>
                            )}
                          </div>
                          {(dailyPlans[ration.id].sessions ?? []).map((session: any, si: number) => (
                            <div key={si} className="border-t border-indigo-50">
                              <div className="bg-white px-3 py-1.5 flex items-center gap-2">
                                <Clock className="h-3 w-3 text-indigo-400" />
                                <span className="font-medium text-gray-700">{session.slot_name}</span>
                                {session.scheduled_time && (
                                  <span className="text-gray-400">{session.scheduled_time}</span>
                                )}
                                <span className="ml-auto text-gray-500">{session.quantity_pct_of_day}% of day</span>
                              </div>
                              <div className="divide-y divide-gray-50">
                                {(session.ingredients ?? []).map((ing: any, ii: number) => (
                                  <div key={ii} className="flex items-center justify-between px-4 py-1 bg-white">
                                    <span className="text-gray-700">{ing.feed_name}</span>
                                    <span className="text-gray-500">
                                      {ing.qty_per_animal_kg} kg/animal · <span className="font-medium text-gray-700">{ing.qty_group_total_kg} kg total</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )} */}

                  {/* Assignments */}
                  <div>
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      Assigned to
                    </p>

                    {assignments.length === 0 && directCategories.length === 0 ? (
                      <p className="text-xs text-gray-400">
                        Not yet assigned to any animal or group
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {/* Categories assigned via feed_ration_id column */}
                        {directCategories.map((cat: any) => (
                          <div
                            key={`category-${cat.id}`}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Users className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                              <span className="truncate text-gray-800">{cat.name}</span>
                              {cat.assigned_animals_count != null && (
                                <span className="text-xs text-gray-400">
                                  {cat.assigned_animals_count} animals
                                </span>
                              )}
                            </div>
                            {canManageFeed && (
                              <button
                                className="text-red-400 hover:text-red-600 p-0.5"
                                title="Remove category assignment"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(
                                      `/api/farms/${farmId}/feed-management/animal-categories/${cat.id}`,
                                      {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          ...cat,
                                          feed_ration_id: null
                                        })
                                      }
                                    )
                                    if (res.ok) {
                                      const updated = await res.json()
                                      // Update the animalCategories list to reflect the removal
                                      window.location.reload()
                                    }
                                  } catch (err) {
                                    console.error('Failed to remove category assignment:', err)
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Individual feed ration assignments */}
                        {assignments.map(asgn => (
                          <div
                            key={asgn.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {asgn.assignment_type === 'animal' ? (
                                <User className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                              ) : (
                                <Users className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                              )}
                              <span className="truncate text-gray-800">
                                {asgn.assignment_type === 'animal'
                                  ? asgn.animals?.name
                                    ? `${asgn.animals.tag_number} — ${asgn.animals.name}`
                                    : asgn.animals?.tag_number ?? 'Unknown animal'
                                  : asgn.animal_categories?.name ?? 'Unknown group'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              {!asgn.is_active && (
                                <span className="text-xs text-gray-400">Inactive</span>
                              )}
                              {asgn.end_date && (
                                <span className="text-xs text-gray-400">
                                  until {new Date(asgn.end_date).toLocaleDateString()}
                                </span>
                              )}
                              {canManageFeed && (
                                <button
                                  className="text-red-400 hover:text-red-600 p-0.5"
                                  title="Remove assignment"
                                  onClick={() => handleRemoveAssignment(ration.id, asgn.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {ration.notes && (
                  <p className="mt-3 text-xs text-gray-500 italic border-t border-gray-100 pt-3">
                    {ration.notes}
                  </p>
                )}
              </CardContent>
            )}

            {/* Delete confirmation */}
            {deleteConfirmId === ration.id && (
              <div className="border-t border-red-100 bg-red-50 p-4">
                <p className="text-sm text-red-800 font-medium">
                  Delete &quot;{ration.name}&quot;?
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  This will also remove all {assignments.length} assignment(s). This action cannot be undone.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(ration.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting…' : 'Yes, delete'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteConfirmId(null)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )
      })}

      {/* Create / Edit modal */}
      {(showCreateModal || editingRation) && (
        <CreateFeedRationModal
          farmId={farmId}
          feedTypes={feedTypes}
          inventory={inventory}
          rationTypes={rationTypes}
          timeSlots={timeSlots}
          tmrRecipes={tmrRecipes}
          isOpen={showCreateModal || !!editingRation}
          editingRation={editingRation}
          onClose={() => {
            setShowCreateModal(false)
            setEditingRation(null)
            onCreateModalClosed?.()
          }}
          onSuccess={(ration) => {
            if (editingRation) {
              handleRationUpdated(ration)
            } else {
              handleRationCreated(ration)
            }
          }}
        />
      )}

      {/* Assign modal */}
      {assigningRation && (
        <AssignFeedRationModal
          farmId={farmId}
          ration={assigningRation}
          animals={animals}
          animalCategories={animalCategories}
          isOpen={!!assigningRation}
          onClose={() => setAssigningRation(null)}
          onSuccess={(assignment) =>
            handleAssignmentCreated(assigningRation.id, assignment)
          }
        />
      )}
    </div>
  )
}
