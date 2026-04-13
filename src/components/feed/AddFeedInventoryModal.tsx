// src/components/feed/AddFeedInventoryModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/Tabs'
import { AlertTriangle, CheckCircle, Plus, Trash2, FlaskConical } from 'lucide-react'

// Standard unit symbol sets used to recognise non-custom units
const STANDARD_VOLUME_UNITS = new Set([
  'L', 'mL', 'cL', 'dL', 'gal', 'qt', 'pt', 'cup', 'fl oz', 'tbsp', 'tsp',
])
const STANDARD_WEIGHT_UNITS = new Set(['kg', 'g', 'mg', 't', 'lbs', 'oz', 'st'])

// Nutritional fields collected per batch
const NUTRITIONAL_FIELDS = [
  { key: 'protein_pct',    label: 'Protein',                       unit: '%' },
  { key: 'fat_pct',        label: 'Fat',                           unit: '%' },
  { key: 'fiber_pct',      label: 'Crude Fibre',                   unit: '%' },
  { key: 'moisture_pct',   label: 'Moisture',                      unit: '%' },
  { key: 'ash_pct',        label: 'Ash / Mineral Content',         unit: '%' },
  { key: 'dry_matter_pct', label: 'Dry Matter',                    unit: '%' },
  { key: 'ndf_pct',        label: 'Neutral Detergent Fibre (NDF)', unit: '%' },
  { key: 'adf_pct',        label: 'Acid Detergent Fibre (ADF)',    unit: '%' },
  { key: 'energy_mj_kg',   label: 'Metabolisable Energy',          unit: 'MJ/kg' },
] as const

type NutritionalKey = typeof NUTRITIONAL_FIELDS[number]['key']

// ── Zod schema for Add Stock ──────────────────────────────────────────────────
const feedInventorySchema = z.object({
  feed_type_id:               z.string().min(1, 'Please select a feed type'),
  source:                     z.enum(['purchased', 'produced']),
  quantity_kg:                z.number().min(0.001, 'Quantity must be greater than 0'),
  quantity_in_preferred_unit: z.number().min(0),
  cost_per_kg:                z.number().min(0).optional(),
  total_cost:                 z.number().min(0).optional(),
  supplier:                   z.string().optional(),
  batch_number:               z.string().optional(),
  purchase_date:              z.string().min(1, 'Date is required'),
  expiry_date:                z.string().optional(),
  notes:                      z.string().optional(),
  protein_pct:    z.number().min(0).max(100).nullable().optional(),
  fat_pct:        z.number().min(0).max(100).nullable().optional(),
  fiber_pct:      z.number().min(0).max(100).nullable().optional(),
  moisture_pct:   z.number().min(0).max(100).nullable().optional(),
  ash_pct:        z.number().min(0).max(100).nullable().optional(),
  dry_matter_pct: z.number().min(0).max(100).nullable().optional(),
  ndf_pct:        z.number().min(0).max(100).nullable().optional(),
  adf_pct:        z.number().min(0).max(100).nullable().optional(),
  energy_mj_kg:   z.number().min(0).nullable().optional(),
})
type FeedInventoryFormData = z.infer<typeof feedInventorySchema>

// ── Ingredient row for the Formulate tab ──────────────────────────────────────
interface FormulateIngredient {
  rowId: string          // local key only
  feed_type_id: string
  percentage: number
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface FeedTypeCategory {
  id: string
  category_name: string
  collect_nutritional_data: boolean
  color?: string | null
}

interface AddFeedInventoryModalProps {
  farmId: string
  feedTypes: Array<{
    id: string
    name: string
    category_id?: string | null
    description?: string | null
    unit_of_measure?: string | null
    typical_cost_per_kg?: number | null
    low_stock_threshold?: number | null
    low_stock_threshold_unit?: string | null
    notes?: string | null
  }>
  feedTypeCategories?: FeedTypeCategory[]
  weightConversions: Array<{
    id: string
    farm_id: string
    from_unit: string
    to_unit: string
    conversion_factor: number
    unit_name?: string | null
  }>
  /** Current inventory stock — used to check ingredient availability */
  inventoryStock?: Array<{
    feed_type_id: string
    quantity_in_stock: number
  }>
  isOpen: boolean
  onClose: () => void
  onSuccess: (inventory: any) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AddFeedInventoryModal({
  farmId,
  feedTypes,
  feedTypeCategories = [],
  weightConversions,
  inventoryStock = [],
  isOpen,
  onClose,
  onSuccess,
}: AddFeedInventoryModalProps) {

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'add_stock' | 'formulate'>('add_stock')

  // ── Add Stock tab ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFeedType, setSelectedFeedType] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)
  const [currentUnit, setCurrentUnit] = useState('')

  // ── Formulate tab ─────────────────────────────────────────────────────────
  const [outputFeedTypeId, setOutputFeedTypeId] = useState('')
  const [batchQuantityKg, setBatchQuantityKg] = useState<number | undefined>()
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0])
  const [formulateNotes, setFormulateNotes] = useState('')
  const [formulateIngredients, setFormulateIngredients] = useState<FormulateIngredient[]>([])
  const [formulateLoading, setFormulateLoading] = useState(false)
  const [formulateError, setFormulateError] = useState<string | null>(null)

  // ── Reset on close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      form.reset(defaultValues)
      setError(null)
      setSelectedFeedType('')
      setCurrentUnit('')
      setActiveTab('add_stock')
      setOutputFeedTypeId('')
      setBatchQuantityKg(undefined)
      setProductionDate(new Date().toISOString().split('T')[0])
      setFormulateNotes('')
      setFormulateIngredients([])
      setFormulateError(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // ── Unit conversion helpers ───────────────────────────────────────────────
  const UNIT_TO_KG: Record<string, number> = {
    't': 1000, 'g': 0.001, 'mg': 0.000001,
    'lbs': 0.453592, 'oz': 0.0283495, 'st': 6.35029,
    'L': 1, 'mL': 0.001, 'cL': 0.01, 'dL': 0.1,
    'gal': 3.785, 'qt': 0.946, 'pt': 0.473, 'cup': 0.240,
    'fl oz': 0.02957, 'tbsp': 0.01479, 'tsp': 0.004929,
  }

  const findConversion = (unitRef: string) =>
    weightConversions.find(wc => wc.id === unitRef) ||
    weightConversions.find(wc => wc.from_unit === unitRef)

  const getIsVolumeUnit = (unitRef: string): boolean => {
    const conv = findConversion(unitRef)
    if (conv) return STANDARD_VOLUME_UNITS.has(conv.to_unit)
    return STANDARD_VOLUME_UNITS.has(unitRef)
  }

  const convertToKg = (value: number, unitRef: string): number => {
    if (!value || isNaN(value)) return 0
    const conv = findConversion(unitRef)
    if (conv) {
      const inToUnit = value * Number(conv.conversion_factor)
      if (conv.to_unit === 'kg') return Number(inToUnit.toFixed(3))
      const factor = UNIT_TO_KG[conv.to_unit]
      return factor !== undefined ? Number((inToUnit * factor).toFixed(3)) : Number(inToUnit.toFixed(3))
    }
    if (unitRef === 'kg' || unitRef === 'L') return Number(value.toFixed(3))
    const factor = UNIT_TO_KG[unitRef]
    return factor !== undefined ? Number((value * factor).toFixed(3)) : value
  }

  const convertFromKg = (value: number, unitRef: string): number => {
    if (!value || isNaN(value)) return 0
    const conv = findConversion(unitRef)
    if (conv) {
      const factor = Number(conv.conversion_factor)
      if (factor === 0) return value
      if (conv.to_unit === 'kg') return Number((value / factor).toFixed(3))
      const volFactor = UNIT_TO_KG[conv.to_unit]
      if (volFactor !== undefined) return Number((value / volFactor / factor).toFixed(3))
      return Number((value / factor).toFixed(3))
    }
    if (unitRef === 'kg' || unitRef === 'L') return Number(value.toFixed(3))
    const factor = UNIT_TO_KG[unitRef]
    if (factor !== undefined && factor > 0) return Number((value / factor).toFixed(3))
    return value
  }

  const getUnitLabel = (unitRef: string): string => {
    const conv = findConversion(unitRef)
    if (conv) return conv.unit_name || conv.from_unit || unitRef
    return unitRef
  }

  const kgPerUnit = (unitRef: string): number => convertToKg(1, unitRef)

  // ── Add Stock form ────────────────────────────────────────────────────────
  const defaultValues: FeedInventoryFormData = {
    feed_type_id: '',
    source: 'purchased',
    quantity_kg: undefined as any,
    quantity_in_preferred_unit: undefined as any,
    cost_per_kg: undefined,
    total_cost: undefined,
    purchase_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    supplier: '',
    batch_number: '',
    notes: '',
  }

  const form = useForm<FeedInventoryFormData>({
    resolver: zodResolver(feedInventorySchema),
    defaultValues,
  })

  const source = form.watch('source')
  const quantity = form.watch('quantity_kg')
  const preferredQuantity = form.watch('quantity_in_preferred_unit')
  const costPerKg = form.watch('cost_per_kg')
  const totalCost = form.watch('total_cost')
  const isPurchased = source === 'purchased'

  const isCurrentUnitVolume = currentUnit ? getIsVolumeUnit(currentUnit) : false
  const baseUnitLabel = isCurrentUnitVolume ? 'L' : 'kg'
  const needsConversion = !!(currentUnit && currentUnit !== baseUnitLabel)

  const selectedFeedTypeData = feedTypes.find(ft => ft.id === selectedFeedType)
  const selectedCategory = feedTypeCategories.find(cat => cat.id === selectedFeedTypeData?.category_id)
  const collectNutrition = selectedCategory?.collect_nutritional_data === true

  // ── Feed type selection ───────────────────────────────────────────────────
  const handleFeedTypeChange = (feedTypeId: string) => {
    setSelectedFeedType(feedTypeId)
    form.setValue('feed_type_id', feedTypeId)

    const ft = feedTypes.find(f => f.id === feedTypeId)
    if (!ft) return

    if (ft.typical_cost_per_kg) {
      form.setValue('cost_per_kg', ft.typical_cost_per_kg)
      form.setValue('total_cost', undefined)
    }
    if (ft.notes?.startsWith('Supplier: ')) {
      form.setValue('supplier', ft.notes.replace('Supplier: ', ''))
    }

    if (ft.unit_of_measure) {
      const found =
        weightConversions.find(wc => wc.id === ft.unit_of_measure) ||
        weightConversions.find(wc => wc.from_unit === ft.unit_of_measure)
      const isStdUnit =
        STANDARD_WEIGHT_UNITS.has(ft.unit_of_measure) ||
        STANDARD_VOLUME_UNITS.has(ft.unit_of_measure)
      if (found || isStdUnit) {
        setCurrentUnit(ft.unit_of_measure)
        form.setValue('quantity_kg', 0)
        form.setValue('quantity_in_preferred_unit', 0)
      } else {
        setCurrentUnit('')
      }
    } else {
      setCurrentUnit('')
    }
  }

  // ── Cost calculations ─────────────────────────────────────────────────────
  const calcTotal = (cpk: number, qty: number) =>
    cpk > 0 && qty > 0 ? Number((cpk * qty).toFixed(2)) : undefined

  const calcCpk = (total: number, qty: number) =>
    total > 0 && qty > 0 ? Number((total / qty).toFixed(2)) : undefined

  const handleCostPerKgChange = (val: string) => {
    if (isCalculating) return
    const n = val === '' ? undefined : Number(val)
    form.setValue('cost_per_kg', n)
    if (n && quantity) {
      setIsCalculating(true)
      form.setValue('total_cost', calcTotal(n, quantity))
      setIsCalculating(false)
    } else if (!n) form.setValue('total_cost', undefined)
  }

  const handleTotalCostChange = (val: string) => {
    if (isCalculating) return
    const n = val === '' ? undefined : Number(val)
    form.setValue('total_cost', n)
    if (n && quantity) {
      setIsCalculating(true)
      form.setValue('cost_per_kg', calcCpk(n, quantity))
      setIsCalculating(false)
    } else if (!n) form.setValue('cost_per_kg', undefined)
  }

  // ── Quantity / unit changes ───────────────────────────────────────────────
  const handlePreferredUnitChange = (val: string) => {
    const n = val === '' ? undefined : Number(val)
    form.setValue('quantity_in_preferred_unit', n ?? 0)
    if (n && n > 0 && currentUnit) {
      const kg = convertToKg(n, currentUnit)
      form.setValue('quantity_kg', kg, { shouldValidate: true })
      if (!isCalculating) {
        setIsCalculating(true)
        const cpk = form.getValues('cost_per_kg')
        const tc  = form.getValues('total_cost')
        if (cpk && cpk > 0) form.setValue('total_cost', calcTotal(cpk, kg), { shouldValidate: true })
        else if (tc && tc > 0) form.setValue('cost_per_kg', calcCpk(tc, kg), { shouldValidate: true })
        setIsCalculating(false)
      }
    } else {
      form.setValue('quantity_kg', 0, { shouldValidate: true })
    }
  }

  const handleQuantityKgChange = (val: string) => {
    const n = val === '' ? 0 : Number(val)
    form.setValue('quantity_kg', n)
    if (n > 0) {
      if (currentUnit) form.setValue('quantity_in_preferred_unit', convertFromKg(n, currentUnit))
      if (!isCalculating) {
        setIsCalculating(true)
        if (costPerKg && costPerKg > 0) form.setValue('total_cost', calcTotal(costPerKg, n))
        else if (totalCost && totalCost > 0) form.setValue('cost_per_kg', calcCpk(totalCost, n))
        setIsCalculating(false)
      }
    }
  }

  // ── Add Stock submit ──────────────────────────────────────────────────────
  const handleSubmit = async (data: FeedInventoryFormData) => {
    setLoading(true)
    setError(null)
    try {
      const {
        protein_pct, fat_pct, fiber_pct, moisture_pct, ash_pct,
        dry_matter_pct, ndf_pct, adf_pct, energy_mj_kg,
        total_cost, quantity_in_preferred_unit,
        ...rest
      } = data

      const nutritionalData = collectNutrition ? {
        protein_pct, fat_pct, fiber_pct, moisture_pct, ash_pct,
        dry_matter_pct, ndf_pct, adf_pct, energy_mj_kg,
      } : undefined

      let finalCostPerKg = data.cost_per_kg
      if (!finalCostPerKg && total_cost && data.quantity_kg)
        finalCostPerKg = Number((total_cost / data.quantity_kg).toFixed(4))

      const response = await fetch('/api/feed/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rest,
          farm_id: farmId,
          cost_per_kg: finalCostPerKg ?? null,
          expiry_date: data.expiry_date || null,
          nutritional_data: nutritionalData,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to add feed inventory')
      }

      const result = await response.json()
      onSuccess(result.data)
      form.reset()
      setSelectedFeedType('')
      setCurrentUnit('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  // ── Formulate tab — ingredient management ────────────────────────────────

  const addIngredientRow = () => {
    setFormulateIngredients(prev => [
      ...prev,
      { rowId: Math.random().toString(36).slice(2), feed_type_id: '', percentage: 0 },
    ])
  }

  const removeIngredientRow = (rowId: string) => {
    setFormulateIngredients(prev => prev.filter(r => r.rowId !== rowId))
  }

  const updateIngredientRow = (
    rowId: string,
    field: 'feed_type_id' | 'percentage',
    value: string | number
  ) => {
    setFormulateIngredients(prev =>
      prev.map(r => r.rowId === rowId ? { ...r, [field]: value } : r)
    )
  }

  // Feed types that have an inventory stock record (have been added at some point)
  const inventoryFeedTypeIds = new Set(inventoryStock.map(s => s.feed_type_id))
  const ingredientOptions = feedTypes.filter(ft => inventoryFeedTypeIds.has(ft.id))

  // Feed types already chosen in other rows (to prevent duplicates)
  const usedFeedTypeIds = new Set(formulateIngredients.map(r => r.feed_type_id).filter(Boolean))

  // Derived ingredient requirements
  const totalPercentage = formulateIngredients.reduce((s, r) => s + (Number(r.percentage) || 0), 0)
  const percentageValid = Math.abs(totalPercentage - 100) < 0.01

  const ingredientRequirements = (batchQuantityKg && batchQuantityKg > 0)
    ? formulateIngredients
        .filter(r => r.feed_type_id && Number(r.percentage) > 0)
        .map(r => {
          const pct = Number(r.percentage)
          const requiredKg = Number(((pct / 100) * batchQuantityKg).toFixed(3))
          const stockRow = inventoryStock.find(s => s.feed_type_id === r.feed_type_id)
          const availableKg = Number(stockRow?.quantity_in_stock ?? 0)
          const feedType = feedTypes.find(ft => ft.id === r.feed_type_id)
          return {
            rowId: r.rowId,
            feed_type_id: r.feed_type_id,
            feed_name: feedType?.name ?? '—',
            percentage: pct,
            required_kg: requiredKg,
            available_kg: availableKg,
            sufficient: availableKg >= requiredKg,
          }
        })
    : []

  const allIngredientsAvailable =
    ingredientRequirements.length > 0 && ingredientRequirements.every(r => r.sufficient)

  const insufficientCount = ingredientRequirements.filter(r => !r.sufficient).length

  // ── Formulate submit ──────────────────────────────────────────────────────
  const handleFormulateSubmit = async () => {
    if (!outputFeedTypeId || !batchQuantityKg || !productionDate) return
    setFormulateLoading(true)
    setFormulateError(null)

    try {
      const response = await fetch(`/api/farms/${farmId}/feed-formulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          output_feed_type_id: outputFeedTypeId,
          batch_quantity_kg: batchQuantityKg,
          production_date: productionDate,
          notes: formulateNotes || undefined,
          ingredients: formulateIngredients
            .filter(r => r.feed_type_id && Number(r.percentage) > 0)
            .map(r => ({ feed_type_id: r.feed_type_id, percentage: Number(r.percentage) })),
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to formulate feed')
      }

      const result = await response.json()
      onSuccess(result.data)
      onClose()
    } catch (err) {
      setFormulateError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setFormulateLoading(false)
    }
  }

  const canSubmitFormulate =
    !formulateLoading &&
    !!outputFeedTypeId &&
    !!batchQuantityKg &&
    batchQuantityKg > 0 &&
    !!productionDate &&
    formulateIngredients.filter(r => r.feed_type_id).length > 0 &&
    percentageValid &&
    allIngredientsAvailable

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Feed Inventory</h3>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full mb-2">
            <TabsTrigger value="add_stock" className="flex-1">Add Stock</TabsTrigger>
            <TabsTrigger value="formulate" className="flex-1">
              <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
              Formulate Feed
            </TabsTrigger>
          </TabsList>

          {/* ══════════════════ ADD STOCK ══════════════════ */}
          <TabsContent value="add_stock">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

              {/* Feed Type */}
              <div>
                <Label htmlFor="feed_type_id">Feed Type *</Label>
                <select
                  id="feed_type_id"
                  value={selectedFeedType}
                  onChange={(e) => handleFeedTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  <option value="">Select a feed type</option>
                  {feedTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.name}{ft.typical_cost_per_kg ? ` (KSh${ft.typical_cost_per_kg}/${baseUnitLabel})` : ''}
                    </option>
                  ))}
                </select>
                {form.formState.errors.feed_type_id && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.feed_type_id.message}</p>
                )}
                {feedTypes.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">No feed types available. Please create one first.</p>
                )}
                {selectedFeedTypeData?.description && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs text-gray-600 mb-1"><strong>Description:</strong></p>
                    <p className="text-xs text-gray-700">{selectedFeedTypeData.description}</p>
                    {selectedFeedTypeData.low_stock_threshold && (
                      <p className="text-xs text-amber-700 mt-1">
                        ⚠️ Low stock threshold: {selectedFeedTypeData.low_stock_threshold} {selectedFeedTypeData.low_stock_threshold_unit || 'units'}
                      </p>
                    )}
                    {collectNutrition && (
                      <p className="text-xs text-blue-700 mt-1">
                        📊 This category collects nutritional data — fill in the Nutritional Data section below.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Source */}
              <div>
                <Label>Feed Source *</Label>
                <div className="flex gap-3 mt-1">
                  {(['purchased', 'produced'] as const).map((s) => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value={s}
                        checked={source === s}
                        onChange={() => form.setValue('source', s)}
                        className="h-4 w-4 text-farm-green border-gray-300 focus:ring-farm-green"
                      />
                      <span className="text-sm">
                        {s === 'purchased' ? 'Purchased (bought)' : 'Produced (farm-grown / harvested)'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Quantity</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {needsConversion && (
                    <div>
                      <Label htmlFor="quantity_preferred">Quantity ({getUnitLabel(currentUnit)}) *</Label>
                      <Input
                        id="quantity_preferred"
                        type="number"
                        step="0.001"
                        min="0"
                        value={form.watch('quantity_in_preferred_unit') || ''}
                        onChange={(e) => handlePreferredUnitChange(e.target.value)}
                        error={form.formState.errors.quantity_in_preferred_unit?.message}
                        placeholder={`Enter quantity in ${getUnitLabel(currentUnit)}`}
                      />
                      <p className="text-xs text-blue-600 mt-1">
                        Primary input — enter in {getUnitLabel(currentUnit)}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="quantity_kg">
                      Quantity ({baseUnitLabel}) *
                      {needsConversion && <span className="text-blue-600 ml-1">(Auto-calculated)</span>}
                    </Label>
                    <Input
                      id="quantity_kg"
                      type="number"
                      step="0.001"
                      min="0"
                      value={form.watch('quantity_kg') || ''}
                      onChange={(e) => handleQuantityKgChange(e.target.value)}
                      error={form.formState.errors.quantity_kg?.message}
                      placeholder={`Quantity in ${baseUnitLabel}`}
                      readOnly={needsConversion}
                      className={needsConversion ? 'bg-gray-50 text-gray-700' : ''}
                    />
                    {needsConversion ? (
                      <p className="text-xs text-gray-500 mt-1">
                        Auto-calculated from {getUnitLabel(currentUnit)} input above
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        {currentUnit
                          ? `Enter quantity in ${baseUnitLabel}`
                          : `Enter quantity in ${baseUnitLabel} (no preferred unit set for this feed type)`}
                      </p>
                    )}
                  </div>
                </div>

                {needsConversion && preferredQuantity! > 0 && quantity! > 0 && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-sm text-green-800">
                    <div className="font-medium mb-1">Unit Conversion:</div>
                    <div>{preferredQuantity} {getUnitLabel(currentUnit)} = {quantity} {baseUnitLabel}</div>
                    <div className="text-xs text-green-600 mt-1">
                      1 {getUnitLabel(currentUnit)} = {kgPerUnit(currentUnit)} {baseUnitLabel}
                      {(() => {
                        const conv = findConversion(currentUnit)
                        if (conv && conv.to_unit !== 'kg' && UNIT_TO_KG[conv.to_unit] !== undefined)
                          return ` (via ${conv.conversion_factor} ${conv.to_unit} × ${UNIT_TO_KG[conv.to_unit]} ${baseUnitLabel}/${conv.to_unit})`
                        return null
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Cost */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">
                  {isPurchased ? 'Purchase Information' : 'Production Cost Information'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cost_per_kg">
                      {isPurchased
                        ? `Cost per ${baseUnitLabel.toUpperCase()} (KSh)`
                        : `Cost of Production per ${baseUnitLabel.toUpperCase()} (KSh)`}
                    </Label>
                    <Input
                      id="cost_per_kg"
                      type="number"
                      step="0.01"
                      min="0"
                      value={costPerKg || ''}
                      onChange={(e) => handleCostPerKgChange(e.target.value)}
                      error={form.formState.errors.cost_per_kg?.message}
                      placeholder="e.g., 45.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_cost">
                      {isPurchased ? 'Total Cost (KSh)' : 'Total Cost of Production (KSh)'}
                    </Label>
                    <Input
                      id="total_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={totalCost || ''}
                      onChange={(e) => handleTotalCostChange(e.target.value)}
                      error={form.formState.errors.total_cost?.message}
                      placeholder="e.g., 45000.00"
                    />
                  </div>
                </div>

                {quantity! > 0 && (costPerKg || totalCost) && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
                    <div className="font-medium mb-1">
                      {isPurchased ? 'Cost Summary:' : 'Production Cost Summary:'}
                    </div>
                    {needsConversion && preferredQuantity! > 0 && (
                      <div>Original Quantity: {preferredQuantity} {getUnitLabel(currentUnit)}</div>
                    )}
                    <div>Quantity in {baseUnitLabel.toUpperCase()}: {quantity} {baseUnitLabel}</div>
                    {costPerKg && <div>Cost per {baseUnitLabel.toUpperCase()}: KSh {costPerKg.toFixed(2)}</div>}
                    {totalCost && <div>Total Cost: KSh {totalCost.toFixed(2)}</div>}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isPurchased && (
                    <div>
                      <Label htmlFor="supplier">Supplier</Label>
                      <Input id="supplier" {...form.register('supplier')} placeholder="e.g., ABC Feed Company" />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="batch_number">Batch / Lot Number</Label>
                    <Input id="batch_number" {...form.register('batch_number')} placeholder="e.g., LOT2024001" />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchase_date">
                    {isPurchased ? 'Purchase Date *' : 'Harvest / Production Date *'}
                  </Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    {...form.register('purchase_date')}
                    error={form.formState.errors.purchase_date?.message}
                  />
                </div>
                <div>
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input id="expiry_date" type="date" {...form.register('expiry_date')} />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  {...form.register('notes')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Nutritional data */}
              {collectNutrition && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-md font-medium text-gray-900">Nutritional Data</h4>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Actual measured values for this batch. Leave blank if not tested.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {NUTRITIONAL_FIELDS.map((field) => (
                      <div key={field.key}>
                        <Label htmlFor={field.key}>
                          {field.label} <span className="text-gray-400 font-normal">({field.unit})</span>
                        </Label>
                        <Input
                          id={field.key}
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register(field.key as NutritionalKey, {
                            setValueAs: (v: string) => v === '' ? null : Number(v),
                          })}
                          placeholder={field.unit === '%' ? '0 – 100' : 'e.g., 12.5'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={loading || feedTypes.length === 0 || (isPurchased && !costPerKg && !totalCost)}
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Add to Stock'}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* ══════════════════ FORMULATE FEED ══════════════════ */}
          <TabsContent value="formulate">
            <div className="space-y-5">

              {/* Output feed type */}
              <div>
                <Label htmlFor="output_feed_type">Output Feed Type *</Label>
                <select
                  id="output_feed_type"
                  value={outputFeedTypeId}
                  onChange={(e) => setOutputFeedTypeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  <option value="">Select the feed type this batch produces</option>
                  {feedTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>{ft.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  The finished product added to inventory (e.g. "Dairy Meal")
                </p>
              </div>

              {/* Batch quantity */}
              <div>
                <Label htmlFor="batch_qty">Batch Quantity (kg) *</Label>
                <Input
                  id="batch_qty"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={batchQuantityKg ?? ''}
                  onChange={(e) => setBatchQuantityKg(e.target.value === '' ? undefined : Number(e.target.value))}
                  placeholder="e.g., 100"
                />
              </div>

              {/* Ingredient builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ingredients *</Label>
                  {/* Percentage meter */}
                  {formulateIngredients.length > 0 && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      percentageValid
                        ? 'bg-green-100 text-green-700'
                        : totalPercentage > 100
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {totalPercentage.toFixed(1)} / 100%
                    </span>
                  )}
                </div>

                {ingredientOptions.length === 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
                    No feeds found in inventory. Add individual ingredient feeds to your stock first using the Add Stock tab.
                  </div>
                )}

                {/* Ingredient rows */}
                <div className="space-y-2">
                  {formulateIngredients.map((row, idx) => {
                    const req = ingredientRequirements.find(r => r.rowId === row.rowId)
                    const availableOptions = ingredientOptions.filter(
                      ft => !usedFeedTypeIds.has(ft.id) || ft.id === row.feed_type_id
                    )
                    return (
                      <div
                        key={row.rowId}
                        className={`flex items-center gap-2 p-2 rounded-lg border ${
                          req && !req.sufficient ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        {/* Row number */}
                        <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{idx + 1}.</span>

                        {/* Feed type select */}
                        <select
                          value={row.feed_type_id}
                          onChange={(e) => updateIngredientRow(row.rowId, 'feed_type_id', e.target.value)}
                          className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent bg-white"
                        >
                          <option value="">Select ingredient</option>
                          {availableOptions.map(ft => {
                            const stock = inventoryStock.find(s => s.feed_type_id === ft.id)
                            return (
                              <option key={ft.id} value={ft.id}>
                                {ft.name} — {(stock?.quantity_in_stock ?? 0).toFixed(1)} kg in stock
                              </option>
                            )
                          })}
                        </select>

                        {/* Percentage input */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={row.percentage || ''}
                            onChange={(e) =>
                              updateIngredientRow(
                                row.rowId,
                                'percentage',
                                e.target.value === '' ? 0 : Number(e.target.value)
                              )
                            }
                            className="w-20 text-sm px-2 py-1.5"
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-500 flex-shrink-0">%</span>
                        </div>

                        {/* Availability indicator */}
                        {req && batchQuantityKg && batchQuantityKg > 0 && (
                          <div className="flex-shrink-0 text-xs text-right w-28">
                            {req.sufficient ? (
                              <span className="text-green-600 flex items-center gap-0.5 justify-end">
                                <CheckCircle className="h-3 w-3" />
                                {req.required_kg.toFixed(1)} kg
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center gap-0.5 justify-end">
                                <AlertTriangle className="h-3 w-3" />
                                short {(req.required_kg - req.available_kg).toFixed(1)} kg
                              </span>
                            )}
                          </div>
                        )}

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeIngredientRow(row.rowId)}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove ingredient"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addIngredientRow}
                  className="w-full text-sm h-8 border-dashed"
                  disabled={ingredientOptions.length === 0}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Ingredient
                </Button>
              </div>

              {/* Requirements summary table — shown once there are rows with values */}
              {ingredientRequirements.length > 0 && batchQuantityKg && batchQuantityKg > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Requirements for {batchQuantityKg} kg batch
                    </span>
                    {allIngredientsAvailable ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                        <CheckCircle className="h-3.5 w-3.5" />
                        All available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {insufficientCount} insufficient
                      </span>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Ingredient</th>
                        <th className="px-3 py-2 text-right">%</th>
                        <th className="px-3 py-2 text-right">Need (kg)</th>
                        <th className="px-3 py-2 text-right">Stock (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ingredientRequirements.map((r) => (
                        <tr key={r.rowId} className={r.sufficient ? '' : 'bg-red-50'}>
                          <td className="px-3 py-2 font-medium text-gray-800">{r.feed_name}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{r.percentage}%</td>
                          <td className="px-3 py-2 text-right font-medium">{r.required_kg.toFixed(2)}</td>
                          <td className={`px-3 py-2 text-right font-medium ${r.sufficient ? 'text-gray-700' : 'text-red-600'}`}>
                            {r.available_kg.toFixed(2)}
                            {!r.sufficient && (
                              <span className="ml-1 text-xs">
                                (need {(r.required_kg - r.available_kg).toFixed(2)} more)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className={`border-t text-xs font-semibold ${percentageValid ? 'bg-green-50' : 'bg-amber-50'}`}>
                      <tr>
                        <td className="px-3 py-2 text-gray-600">Total</td>
                        <td className={`px-3 py-2 text-right ${percentageValid ? 'text-green-700' : 'text-amber-700'}`}>
                          {totalPercentage.toFixed(1)}%
                          {!percentageValid && ' ⚠'}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {ingredientRequirements.reduce((s, r) => s + r.required_kg, 0).toFixed(2)} kg
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                  {!percentageValid && (
                    <p className="px-3 py-2 text-xs text-amber-700 bg-amber-50 border-t border-amber-100">
                      Percentages must sum to exactly 100% before you can formulate.
                      Currently {totalPercentage.toFixed(1)}% — {totalPercentage < 100 ? `add ${(100 - totalPercentage).toFixed(1)}% more` : `reduce by ${(totalPercentage - 100).toFixed(1)}%`}.
                    </p>
                  )}
                </div>
              )}

              {/* Production date + notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="production_date">Production Date *</Label>
                  <Input
                    id="production_date"
                    type="date"
                    value={productionDate}
                    onChange={(e) => setProductionDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="formulate_notes">Notes</Label>
                  <Input
                    id="formulate_notes"
                    value={formulateNotes}
                    onChange={(e) => setFormulateNotes(e.target.value)}
                    placeholder="e.g., Batch #1, moisture adjusted"
                  />
                </div>
              </div>

              {formulateError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {formulateError}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={onClose} disabled={formulateLoading}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleFormulateSubmit}
                  disabled={!canSubmitFormulate}
                >
                  {formulateLoading
                    ? <LoadingSpinner size="sm" />
                    : `Formulate ${batchQuantityKg ? `${batchQuantityKg} kg` : 'Batch'}`}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Modal>
  )
}
