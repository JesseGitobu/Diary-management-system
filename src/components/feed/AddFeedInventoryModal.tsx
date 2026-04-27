// src/components/feed/AddFeedInventoryModal.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
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
import { AlertTriangle, CheckCircle, Plus, Trash2, FlaskConical, ChevronDown, Search, X } from 'lucide-react'

// Standard unit symbol sets used to recognise non-custom units
const STANDARD_VOLUME_UNITS = new Set([
  'L', 'mL', 'cL', 'dL', 'gal', 'qt', 'pt', 'cup', 'fl oz', 'tbsp', 'tsp',
])
const STANDARD_WEIGHT_UNITS = new Set(['kg', 'g', 'mg', 't', 'lbs', 'oz', 'st'])

// Nutritional fields collected per batch
const NUTRITIONAL_FIELDS = [
  { key: 'protein_pct', label: 'Protein', unit: '%' },
  { key: 'fat_pct', label: 'Fat', unit: '%' },
  { key: 'fiber_pct', label: 'Crude Fibre', unit: '%' },
  { key: 'moisture_pct', label: 'Moisture', unit: '%' },
  { key: 'ash_pct', label: 'Ash / Mineral Content', unit: '%' },
  { key: 'dry_matter_pct', label: 'Dry Matter', unit: '%' },
  { key: 'ndf_pct', label: 'Neutral Detergent Fibre (NDF)', unit: '%' },
  { key: 'adf_pct', label: 'Acid Detergent Fibre (ADF)', unit: '%' },
  { key: 'energy_mj_kg', label: 'Metabolisable Energy', unit: 'MJ/kg' },
] as const

type NutritionalKey = typeof NUTRITIONAL_FIELDS[number]['key']

// ── Zod schema for Add Stock ──────────────────────────────────────────────────
const feedInventorySchema = z.object({
  feed_type_id: z.string().min(1, 'Please select a feed type'),
  storage_location_id: z.string().optional(),
  source: z.enum(['purchased', 'produced']),
  source_type: z.string().nullable().optional(),  // crop_harvest, animal_production, fermentation, processing, other, or custom
  yield_source: z.string().nullable().optional(),  // location or details (Field A, Cow #5, etc.)
  quantity_kg: z.number().min(0.001, 'Quantity must be greater than 0'),
  quantity_in_preferred_unit: z.number().min(0),
  cost_per_kg: z.number().min(0).optional(),
  total_cost: z.number().min(0).optional(),
  supplier_id: z.string().uuid().nullable().optional(), // FK to suppliers
  supplier: z.string().nullable().optional(),                  // legacy text / new name
  batch_number: z.string().optional(),
  purchase_date: z.string().min(1, 'Date is required'),
  expiry_date: z.string().optional(),
  notes: z.string().nullable().optional(),
  protein_pct: z.number().min(0).max(100).nullable().optional(),
  fat_pct: z.number().min(0).max(100).nullable().optional(),
  fiber_pct: z.number().min(0).max(100).nullable().optional(),
  moisture_pct: z.number().min(0).max(100).nullable().optional(),
  ash_pct: z.number().min(0).max(100).nullable().optional(),
  dry_matter_pct: z.number().min(0).max(100).nullable().optional(),
  ndf_pct: z.number().min(0).max(100).nullable().optional(),
  adf_pct: z.number().min(0).max(100).nullable().optional(),
  energy_mj_kg: z.number().min(0).nullable().optional(),
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
    is_formulate_feed?: boolean | null
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
  /** Storage locations for feed inventory */
  storageLocations?: Array<{
    id: string
    name: string
    type?: string | null
    capacity?: number | null
    currentOccupancy?: number | null
  }>
  /** Suppliers for feed purchases */
  suppliers?: Array<{
    id: string
    name: string
    contact_person?: string | null
    email?: string | null
    phone?: string | null
    supplier_type?: string | null
    status: string
  }>
  isOpen: boolean
  onClose: () => void
  initialData?: any;
  onSuccess: (inventory: any) => void
}

// ── Searchable feed-type picker ───────────────────────────────────────────────
interface FeedSearchSelectProps {
  feedTypes: Array<{ id: string; name: string; category_id?: string | null; typical_cost_per_kg?: number | null }>
  feedTypeCategories: FeedTypeCategory[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  showCost?: boolean
  inventoryStock?: Array<{ feed_type_id: string; quantity_in_stock: number }>
  className?: string
}

function FeedSearchSelect({
  feedTypes,
  feedTypeCategories,
  value,
  onChange,
  placeholder = 'Select a feed type…',
  showCost = false,
  inventoryStock,
  className = '',
}: FeedSearchSelectProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = !query
    ? feedTypes
    : feedTypes.filter(ft => {
      const cat = feedTypeCategories.find(c => c.id === ft.category_id)
      const q = query.toLowerCase()
      return ft.name.toLowerCase().includes(q) || (cat?.category_name ?? '').toLowerCase().includes(q)
    })

  const selected = feedTypes.find(ft => ft.id === value)
  const selectedCat = feedTypeCategories.find(c => c.id === selected?.category_id)

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const open = () => {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm bg-white text-sm text-left focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
      >
        {selected ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedCat && (
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedCat.color || '#9ca3af' }} />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-sm leading-tight">{selected.name}</div>
              {selectedCat && (
                <div className="truncate text-xs text-gray-400 leading-tight">{selectedCat.category_name}</div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50">
              <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or category…"
                className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                No feeds match &ldquo;{query}&rdquo;
              </div>
            ) : (
              filtered.map(ft => {
                const cat = feedTypeCategories.find(c => c.id === ft.category_id)
                const stock = inventoryStock?.find(s => s.feed_type_id === ft.id)
                const isSelected = ft.id === value
                return (
                  <button
                    key={ft.id}
                    type="button"
                    onClick={() => { onChange(ft.id); setIsOpen(false); setQuery('') }}
                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-green-50 flex items-center gap-2 transition-colors ${isSelected ? 'bg-green-50 text-green-800' : 'text-gray-700'
                      }`}
                  >
                    {cat && (
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: cat.color || '#9ca3af' }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{ft.name}</div>
                      {cat && <div className="text-xs text-gray-400">{cat.category_name}</div>}
                    </div>
                    {inventoryStock ? (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {(stock?.quantity_in_stock ?? 0).toFixed(1)} kg
                      </span>
                    ) : showCost && ft.typical_cost_per_kg != null ? (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        Current Market Value: KSh{ft.typical_cost_per_kg}/kg
                      </span>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Supplier select with create new option ──────────────────────────────────
interface SupplierSelectProps {
  suppliers: Array<{
    id: string
    name: string
    contact_person?: string | null
    email?: string | null
    phone?: string | null
    supplier_type?: string | null
    status: string
  }>
  value: string
  /** Called with (name, id). id is null when the user types a new supplier name. */
  onChange: (supplierName: string, supplierId: string | null) => void
  placeholder?: string
  className?: string
}

function SupplierSelect({
  suppliers,
  value,
  onChange,
  placeholder = 'Select or enter supplier name…',
  className = '',
}: SupplierSelectProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter suppliers based on query
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.status === 'active' &&
    supplier.name.toLowerCase().includes(query.toLowerCase())
  )

  // Check if current value matches an existing supplier
  const selectedSupplier = suppliers.find(s => s.name === value)
  const isExistingSupplier = !!selectedSupplier

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setQuery('')
        setIsCreatingNew(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const open = () => {
    setIsOpen(true)
    setQuery('')
    setIsCreatingNew(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleInputChange = (newValue: string) => {
    setQuery(newValue)
    // If the typed value exactly matches an existing supplier, resolve its ID
    const exact = filteredSuppliers.find(s => s.name.toLowerCase() === newValue.toLowerCase())
    onChange(newValue, exact?.id ?? null)
    setIsCreatingNew(newValue.trim() !== '' && !exact)
  }

  const handleSupplierSelect = (supplier: typeof suppliers[0]) => {
    setQuery(supplier.name)
    onChange(supplier.name, supplier.id)
    setIsOpen(false)
    setIsCreatingNew(false)
  }

  const handleCreateNew = () => {
    const newName = query.trim()
    if (newName) {
      onChange(newName, null) // new supplier — no ID yet
      setIsOpen(false)
      setIsCreatingNew(false)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={open}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent pr-10"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50">
              <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search suppliers…"
                className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isCreatingNew) {
                    handleCreateNew()
                  }
                }}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {/* Create new option */}
            {isCreatingNew && (
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full px-3 py-2 text-left hover:bg-green-50 border-b border-gray-100 flex items-center gap-2"
              >
                <Plus className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Create "{query.trim()}"</span>
              </button>
            )}

            {/* Existing suppliers */}
            {filteredSuppliers.length === 0 && !isCreatingNew ? (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                No suppliers found
              </div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => handleSupplierSelect(supplier)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sm truncate">{supplier.name}</span>
                    {supplier.supplier_type && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {supplier.supplier_type}
                      </span>
                    )}
                  </div>
                  {supplier.contact_person && (
                    <span className="text-xs text-gray-400 truncate ml-2">
                      {supplier.contact_person}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-500 mt-1">
        {isExistingSupplier ? 'Existing supplier selected' : 'New supplier will be created'}
      </p>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AddFeedInventoryModal({
  farmId,
  feedTypes,
  feedTypeCategories = [],
  weightConversions,
  inventoryStock = [],
  storageLocations = [],
  suppliers = [],
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: AddFeedInventoryModalProps) {

  const isEditMode = !!initialData;

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'add_stock' | 'formulate'>('add_stock')

  // ── Add Stock tab ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFeedType, setSelectedFeedType] = useState('')
  const [selectedStorage, setSelectedStorage] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)
  const [currentUnit, setCurrentUnit] = useState('')

  // ── Formulate tab ─────────────────────────────────────────────────────────
  const [outputFeedTypeId, setOutputFeedTypeId] = useState('')
  const [formulateStorageId, setFormulateStorageId] = useState('')
  const [batchQuantityKg, setBatchQuantityKg] = useState<number | undefined>()
  const [batchQuantityPreferred, setBatchQuantityPreferred] = useState<number | undefined>()
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0])
  const [formulateBatchNumber, setFormulateBatchNumber] = useState('')
  const [formulateExpiryDate, setFormulateExpiryDate] = useState('')
  const [formulateNotes, setFormulateNotes] = useState('')
  const [formulateIngredients, setFormulateIngredients] = useState<FormulateIngredient[]>([])
  const [formulateLoading, setFormulateLoading] = useState(false)
  const [formulateError, setFormulateError] = useState<string | null>(null)

  // ── Add Stock form ────────────────────────────────────────────────────────
  const defaultValues: FeedInventoryFormData = {
    feed_type_id: '',
    source: 'purchased',
    source_type: null,
    yield_source: null,
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
    mode: 'onChange',
  })

  // ── Reset or Populate on Open/Close ──────────────────────────────────────────
  useEffect(() => {
    if (isOpen && initialData) {
      // 1. Determine unit first so we can use it for calculations
      const ft = feedTypes.find(f => f.id === initialData.feed_type_id)
      const unitId = ft?.unit_of_measure || ''

      // 2. Calculate the preferred unit value based on the kg quantity
      const kgValue = initialData.quantity_kg || 0;
      const preferredVal = unitId ? convertFromKg(kgValue, unitId) : kgValue;
      // 1. POPULATE FORM (EDIT MODE)
      form.reset({
        ...initialData,
        // Format dates specifically for HTML5 date inputs
        supplier: initialData.supplier ?? '',
        notes: initialData.notes ?? '',
        quantity_in_preferred_unit: preferredVal,
        source: initialData.source || 'purchased',
        purchase_date: initialData.purchase_date
          ? new Date(initialData.purchase_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        expiry_date: initialData.expiry_date
          ? new Date(initialData.expiry_date).toISOString().split('T')[0]
          : '',
      })

      // 2. SYNC UI STATES
      setSelectedFeedType(initialData.feed_type_id)
      setSelectedStorage(initialData.storage_location_id || '')
      setCurrentUnit(unitId)
      setActiveTab('add_stock') // Default to add_stock during edit

      setTimeout(() => {
        form.trigger()
      }, 0)

    } else if (!isOpen) {
      // 4. RESET EVERYTHING (ON CLOSE)
      form.reset(defaultValues)
      setError(null)
      setSelectedFeedType('')
      setSelectedStorage('')
      setCurrentUnit('')
      setActiveTab('add_stock')

      // Clear Formulation states
      setOutputFeedTypeId('')
      setFormulateStorageId('')
      setBatchQuantityKg(undefined)
      setBatchQuantityPreferred(undefined)
      setProductionDate(new Date().toISOString().split('T')[0])
      setFormulateBatchNumber('')
      setFormulateExpiryDate('')
      setFormulateNotes('')
      setFormulateIngredients([])
      setFormulateError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData, feedTypes, form, weightConversions])

  // ── Unit conversion helpers ───────────────────────────────────────────────
  const UNIT_TO_KG: Record<string, number> = {
    't': 1000, 'g': 0.001, 'mg': 0.000001,
    'lbs': 0.453592, 'oz': 0.0283495, 'st': 6.35029,
    'L': 1, 'mL': 0.001, 'cL': 0.01, 'dL': 0.1,
    'gal': 3.785, 'qt': 0.946, 'pt': 0.473, 'cup': 0.240,
    'fl oz': 0.02957, 'tbsp': 0.01479, 'tsp': 0.004929,
  }

  const findConversion = (unitRef: string) => {
    if (!unitRef) return null;
    return weightConversions.find(wc =>
      wc.id === unitRef ||           // Match UUID (110bddc6...)
      wc.from_unit === unitRef ||    // Match symbol (e.g., 'Bags')
      wc.unit_name === unitRef       // Match name (e.g., 'KCU Tipper')
    );
  }

  const getUnitLabel = (unitRef: string): string => {
    const conv = findConversion(unitRef)
    if (conv) return conv.unit_name || conv.from_unit || unitRef
    return unitRef // If this returns a UUID, it means findConversion returned null
  }

  const getIsVolumeUnit = (unitRef: string): boolean => {
    const conv = findConversion(unitRef)
    if (conv) return STANDARD_VOLUME_UNITS.has(conv.to_unit)
    return STANDARD_VOLUME_UNITS.has(unitRef)
  }

  const convertToKg = (value: number, unitRef: string): number => {
    if (!value || isNaN(value)) return 0
    const conv = findConversion(unitRef)
    if (conv) {
      const convFactor = Number(conv.conversion_factor)
      if (isNaN(convFactor) || convFactor <= 0) return value
      const inToUnit = value * convFactor
      if (isNaN(inToUnit)) return value
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
      if (isNaN(factor) || factor <= 0) return value
      if (conv.to_unit === 'kg') {
        const result = value / factor
        return isNaN(result) ? value : Number(result.toFixed(3))
      }
      const volFactor = UNIT_TO_KG[conv.to_unit]
      if (volFactor !== undefined && !isNaN(volFactor)) {
        const result = value / volFactor / factor
        return isNaN(result) ? value : Number(result.toFixed(3))
      }
      const result = value / factor
      return isNaN(result) ? value : Number(result.toFixed(3))
    }
    if (unitRef === 'kg' || unitRef === 'L') return Number(value.toFixed(3))
    const factor = UNIT_TO_KG[unitRef]
    if (factor !== undefined && factor > 0) return Number((value / factor).toFixed(3))
    return value
  }

  // const getUnitLabel = (unitRef: string): string => {
  //   const conv = findConversion(unitRef)
  //   if (conv) return conv.unit_name || conv.from_unit || unitRef
  //   return unitRef
  // }

  const kgPerUnit = (unitRef: string): number => convertToKg(1, unitRef)

  const formatConversionValue = (value: number): string => {
    if (isNaN(value) || !isFinite(value)) return '—'
    return value.toString()
  }





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

  const outputFeedTypeData = feedTypes.find(ft => ft.id === outputFeedTypeId)
  const outputCurrentUnit = outputFeedTypeData?.unit_of_measure || ''
  const isOutputUnitVolume = outputCurrentUnit ? getIsVolumeUnit(outputCurrentUnit) : false
  const outputBaseUnitLabel = isOutputUnitVolume ? 'L' : 'kg'
  const outputNeedsConversion = !!(outputCurrentUnit && outputCurrentUnit !== outputBaseUnitLabel)

  // When the output feed type (and therefore its unit) changes, re-sync the
  // two quantity fields.  We read the current state values via a ref so that
  // the effect only fires on an actual feed-type / unit change, not on every
  // quantity keystroke.
  const batchQtyRef = useRef<{ kg: number | undefined; preferred: number | undefined }>({ kg: undefined, preferred: undefined })
  batchQtyRef.current = { kg: batchQuantityKg, preferred: batchQuantityPreferred }

  useEffect(() => {
    if (!outputFeedTypeData) return
    const unit = outputFeedTypeData.unit_of_measure || 'kg'
    const { kg, preferred } = batchQtyRef.current
    if (kg != null) {
      setBatchQuantityPreferred(convertFromKg(kg, unit))
    } else if (preferred != null) {
      setBatchQuantityKg(convertToKg(preferred, unit))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputFeedTypeId])

  const handleBatchQuantityPreferredChange = (val: string) => {
    const n = val === '' ? undefined : Number(val)
    setBatchQuantityPreferred(n)

    if (n != null && n > 0) {
      if (outputCurrentUnit) {
        setBatchQuantityKg(convertToKg(n, outputCurrentUnit))
      } else {
        setBatchQuantityKg(n)
      }
    } else {
      setBatchQuantityKg(undefined)
    }
  }

  // ── Feed type selection ───────────────────────────────────────────────────
  const handleFeedTypeChange = (feedTypeId: string) => {
    setSelectedFeedType(feedTypeId)
    form.setValue('feed_type_id', feedTypeId)

    const ft = feedTypes.find(f => f.id === feedTypeId)
    if (!ft) return

    // Set cost
    if (ft.typical_cost_per_kg) {
      form.setValue('cost_per_kg', ft.typical_cost_per_kg)
      form.setValue('total_cost', undefined)
    }

    // Handle unit conversion on feed type change
    if (ft.unit_of_measure) {
      const found =
        weightConversions.find(wc => wc.id === ft.unit_of_measure) ||
        weightConversions.find(wc => wc.from_unit === ft.unit_of_measure)
      const isStdUnit =
        STANDARD_WEIGHT_UNITS.has(ft.unit_of_measure) ||
        STANDARD_VOLUME_UNITS.has(ft.unit_of_measure)

      if (found || isStdUnit) {
        setCurrentUnit(ft.unit_of_measure)

        // If there's an existing kg quantity, convert it to the new unit
        const currentKg = form.getValues('quantity_kg')
        if (currentKg && currentKg > 0) {
          const convertedPreferred = convertFromKg(currentKg, ft.unit_of_measure)
          form.setValue('quantity_in_preferred_unit', convertedPreferred)
        } else {
          form.setValue('quantity_kg', 0)
          form.setValue('quantity_in_preferred_unit', 0)
        }
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
      // CONVERT: preferred unit → kg
      const kg = convertToKg(n, currentUnit)
      form.setValue('quantity_kg', kg, { shouldValidate: true })

      // Recalculate costs
      if (!isCalculating) {
        setIsCalculating(true)
        const cpk = form.getValues('cost_per_kg')
        const tc = form.getValues('total_cost')
        if (cpk && cpk > 0) {
          form.setValue('total_cost', calcTotal(cpk, kg), { shouldValidate: true })
        } else if (tc && tc > 0) {
          form.setValue('cost_per_kg', calcCpk(tc, kg), { shouldValidate: true })
        }
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
    setLoading(true);
    setError(null);
    try {

      const {
        protein_pct, fat_pct, fiber_pct, moisture_pct, ash_pct,
        dry_matter_pct, ndf_pct, adf_pct, energy_mj_kg,
        total_cost, quantity_in_preferred_unit,
        ...rest
      } = data;

      const nutritionalData = collectNutrition ? {
        protein_pct, fat_pct, fiber_pct, moisture_pct, ash_pct,
        dry_matter_pct, ndf_pct, adf_pct, energy_mj_kg,
      } : undefined;

      let finalCostPerKg = data.cost_per_kg;
      let finalTotalCost = total_cost;

      if (data.quantity_kg && data.quantity_kg > 0) {
        if (!finalCostPerKg && finalTotalCost) {
          finalCostPerKg = Number((finalTotalCost / data.quantity_kg).toFixed(4));
        }
        if (finalCostPerKg && !finalTotalCost) {
          finalTotalCost = Number((finalCostPerKg * data.quantity_kg).toFixed(2));
        }
      }

      const payload = {
        ...rest,
        farm_id: farmId,
        source: data.source || 'purchased',
        source_type: data.source_type || null,
        yield_source: data.yield_source || null,
        supplier_id: data.supplier_id || null,
        storage_location_id: data.storage_location_id || null,
        cost_per_kg: finalCostPerKg ?? null,
        total_cost: finalTotalCost ?? null,
        expiry_date: data.expiry_date || null,
        nutritional_data: nutritionalData,
        // Include record ID for updates
        record_id: isEditMode ? initialData?.id : null,
      };



      // Use PUT for editing, POST for new
      const method = isEditMode ? 'PUT' : 'POST';
      // If editing, we use feed_type_id in the URL as per API route pattern
      const endpoint = isEditMode
        ? `/api/feed/inventory/${data.feed_type_id}`
        : '/api/feed/inventory';



      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });



      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save feed inventory');
      }

      const result = await response.json();
      onSuccess(result.data);
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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

  // Only feed types explicitly marked as formulate feeds appear as output options
  const formulateFeedOptions = feedTypes.filter(ft => ft.is_formulate_feed === true)

  // Feed types already chosen in other rows (to prevent duplicates)
  const usedFeedTypeIds = new Set(formulateIngredients.map(r => r.feed_type_id).filter(Boolean))

  // Derived ingredient requirements
  const totalPercentage = formulateIngredients.reduce((s, r) => s + (Number(r.percentage) || 0), 0)
  const percentageValid = totalPercentage >= 98 && totalPercentage <= 100.001;
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
          storage_location_id: formulateStorageId || undefined,
          batch_quantity_kg: batchQuantityKg,
          production_date: productionDate,
          batch_number: formulateBatchNumber || undefined,
          expiry_date: formulateExpiryDate || undefined,
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isEditMode ? 'Edit Feed Inventory' : 'Add Feed Inventory'}
        </h3>

        {/* Disable tabs during Edit Mode (Formulation is a complex creation process) */}
        <Tabs value={isEditMode ? 'add_stock' : activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          {!isEditMode && (
            <TabsList className="w-full mb-2">
              <TabsTrigger value="add_stock" className="flex-1">Add Stock</TabsTrigger>
              <TabsTrigger value="formulate" className="flex-1">
                <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
                Formulate Feed
              </TabsTrigger>
            </TabsList>
          )}

          {/* ══════════════════ ADD STOCK ══════════════════ */}
          <TabsContent value="add_stock">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >

              {/* Feed Type */}
              <div>
                <Label htmlFor="feed_type_id">Feed Type *</Label>
                <FeedSearchSelect
                  feedTypes={feedTypes}
                  feedTypeCategories={feedTypeCategories}
                  value={selectedFeedType}
                  onChange={handleFeedTypeChange}
                  placeholder="Select a feed type…"
                  showCost
                />
                {form.formState.errors.feed_type_id && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.feed_type_id.message}</p>
                )}
                {feedTypes.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">No feed types available. Please create one first.</p>
                )}
                {selectedFeedTypeData?.description && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md space-y-2">
                    <p className="text-xs text-gray-600 mb-1"><strong>Description:</strong></p>
                    <p className="text-xs text-gray-700">{selectedFeedTypeData.description}</p>
                    {selectedCategory && (
                      <p className="text-xs text-gray-600">
                        <strong>Category:</strong> {selectedCategory.category_name}
                      </p>
                    )}
                    {selectedFeedTypeData.typical_cost_per_kg != null && (
                      <p className="text-xs text-gray-600">
                        <strong>Market cost:</strong> KSh{selectedFeedTypeData.typical_cost_per_kg.toFixed(2)}/kg
                      </p>
                    )}
                    {selectedFeedTypeData.low_stock_threshold && (
                      <p className="text-xs text-amber-700">
                        ⚠️ Low stock threshold: {selectedFeedTypeData.low_stock_threshold} {selectedFeedTypeData.low_stock_threshold_unit || 'units'}
                      </p>
                    )}
                    {collectNutrition && (
                      <p className="text-xs text-blue-700">
                        📊 This category collects nutritional data — fill in the Nutritional Data section below.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Storage Location */}
              <div>
                <Label htmlFor="storage_location">Storage Location</Label>
                <select
                  id="storage_location"
                  value={selectedStorage}
                  onChange={(e) => {
                    setSelectedStorage(e.target.value)
                    form.setValue('storage_location_id', e.target.value || undefined)
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  <option value="">— Select a storage location (optional)</option>
                  {storageLocations.map((storage) => (
                    <option key={storage.id} value={storage.id}>
                      {storage.name}
                      {storage.type && ` (${storage.type})`}
                      {storage.currentOccupancy !== undefined && storage.capacity !== undefined
                        ? ` — ${storage.currentOccupancy}/${storage.capacity} occupied`
                        : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Optional: Select where this feed batch will be stored.</p>
              </div>

              {/* Source */}
              <div>
                <Label>Feed Source *</Label>
                {isEditMode ? (
                  <div className="mt-2 p-3 bg-gray-100 rounded-md">
                    <p className="text-sm font-medium text-gray-700">
                      {source === 'purchased' ? 'Purchased (bought)' : 'Produced (farm-grown / harvested)'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Cannot be changed after creation</p>
                  </div>
                ) : (
                  <div className="flex gap-3 mt-1">
                    {(['purchased', 'produced'] as const).map((s) => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value={s}
                          {...form.register('source')}
                          className="h-4 w-4 text-farm-green border-gray-300 focus:ring-farm-green"
                        />
                        <span className="text-sm">
                          {s === 'purchased' ? 'Purchased (bought)' : 'Produced (farm-grown / harvested)'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {form.formState.errors.source && (
                  <p className="text-xs text-red-600 mt-1">{form.formState.errors.source.message}</p>
                )}
              </div>

              {/* Harvest Source Type (only for produced feeds) */}
              {source === 'produced' && (
                <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div>
                    <Label htmlFor="source_type">Source Type *</Label>
                    {(() => {
                      const currentSourceType = form.watch('source_type')
                      const predefinedTypes = ['crop_harvest', 'animal_production', 'fermentation', 'processing']
                      const isPredefined = predefinedTypes.includes(currentSourceType || '')
                      const isCustom = currentSourceType && !isPredefined && currentSourceType !== 'other'
                      const dropdownValue = isPredefined ? currentSourceType : (isCustom ? 'other' : '')

                      return (
                        <>
                          <select
                            id="source_type"
                            value={dropdownValue || ''}
                            onChange={(e) => {
                              if (e.target.value === 'other') {
                                form.setValue('source_type', 'other')
                              } else {
                                form.setValue('source_type', e.target.value || null)
                              }
                            }}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                          >
                            <option value="">— Select source type</option>
                            <option value="crop_harvest">Crop Harvest (from fields)</option>
                            <option value="animal_production">Animal Production (milk byproducts, etc.)</option>
                            <option value="fermentation">Fermentation (silage, fermented feeds)</option>
                            <option value="processing">Processing (milling, grinding, etc.)</option>
                            <option value="other">Other (please specify)</option>
                          </select>
                          {isCustom && (
                            <p className="text-xs text-blue-600 mt-1">Current: <strong>{currentSourceType}</strong></p>
                          )}
                        </>
                      )
                    })()}
                  </div>

                  {(() => {
                    const currentSourceType = form.watch('source_type')
                    const predefinedTypes = ['crop_harvest', 'animal_production', 'fermentation', 'processing']
                    const isPredefined = predefinedTypes.includes(currentSourceType || '')
                    const isCustom = currentSourceType && !isPredefined && currentSourceType !== 'other'
                    return currentSourceType === 'other' || isCustom
                  })() && (
                      <div>
                        <Label htmlFor="source_type_other">Please specify source type</Label>
                        <Input
                          id="source_type_other"
                          type="text"
                          placeholder="e.g., Brewery waste, Restaurant scraps, etc."
                          value={(() => {
                            const currentSourceType = form.watch('source_type')
                            const predefinedTypes = ['crop_harvest', 'animal_production', 'fermentation', 'processing']
                            const isPredefined = predefinedTypes.includes(currentSourceType || '')
                            return (currentSourceType && !isPredefined) ? currentSourceType : ''
                          })()}
                          onChange={(e) => form.setValue('source_type', e.target.value || null)}
                          className="w-full"
                        />
                      </div>
                    )}

                  <div>
                    <Label htmlFor="yield_source">Source Location / Details</Label>
                    <Input
                      id="yield_source"
                      type="text"
                      placeholder="e.g., Field A, Dairy Unit #2, Fermentation Tank 1"
                      value={form.watch('yield_source') || ''}
                      onChange={(e) => form.setValue('yield_source', e.target.value || null)}
                    />
                    <p className="text-xs text-gray-600 mt-1">Optional: Specify where this feed was sourced or produced.</p>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Quantity</h4>
                <div className="grid grid-cols-1 gap-4">
                  {needsConversion ? (
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
                      <p className="text-xs text-gray-500 mt-1">
                        Enter quantity in {getUnitLabel(currentUnit)}. The equivalent {baseUnitLabel} value is calculated below.
                      </p>
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 text-sm text-green-800">
                        <div className="font-medium mb-1">Equivalent {baseUnitLabel.toUpperCase()} value</div>
                        <div>{formatConversionValue(preferredQuantity || 0)} {getUnitLabel(currentUnit)} = {formatConversionValue(quantity || 0)} {baseUnitLabel}</div>
                        <div className="text-xs text-green-600 mt-1">
                          {(() => {
                            const conv = findConversion(currentUnit)
                            const convFactor = Number(conv?.conversion_factor)
                            const kgVal = kgPerUnit(currentUnit)

                            if (!conv) {
                              return `⚠️ No conversion found for "${currentUnit}"`
                            }

                            if (conv.conversion_factor === null || conv.conversion_factor === undefined) {
                              return `⚠️ Invalid conversion factor: undefined (DB value is null). Found conversion: "${conv.from_unit}" → "${conv.to_unit}"`
                            }

                            if (isNaN(convFactor) || !isFinite(convFactor)) {
                              return `⚠️ Invalid conversion factor: ${conv.conversion_factor} (type: ${typeof conv.conversion_factor})`
                            }

                            if (convFactor <= 0) {
                              return `⚠️ Invalid conversion factor: ${convFactor} (must be > 0). Will use 1:1 fallback.`
                            }

                            if (conv.to_unit === 'kg') {
                              return `1 ${getUnitLabel(currentUnit)} = ${formatConversionValue(kgVal)} ${baseUnitLabel} (factor: ${convFactor})`
                            }

                            const factor = UNIT_TO_KG[conv.to_unit]
                            if (factor !== undefined && !isNaN(factor)) {
                              return `1 ${getUnitLabel(currentUnit)} = ${formatConversionValue(kgVal)} ${baseUnitLabel} (via ${formatConversionValue(convFactor)} ${conv.to_unit} × ${UNIT_TO_KG[conv.to_unit]} ${baseUnitLabel}/${conv.to_unit})`
                            }

                            return `1 ${getUnitLabel(currentUnit)} = ${formatConversionValue(kgVal)} ${baseUnitLabel}`
                          })()}\n                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="quantity_kg">Quantity ({baseUnitLabel}) *</Label>
                      <Input
                        id="quantity_kg"
                        type="number"
                        step="0.001"
                        min="0"
                        value={form.watch('quantity_kg') || ''}
                        onChange={(e) => handleQuantityKgChange(e.target.value)}
                        error={form.formState.errors.quantity_kg?.message}
                        placeholder={`Quantity in ${baseUnitLabel}`}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {currentUnit
                          ? `Enter quantity in ${baseUnitLabel}`
                          : `Enter quantity in ${baseUnitLabel} (no preferred unit set for this feed type)`}
                      </p>
                    </div>
                  )}
                </div>
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
                      <SupplierSelect
                        suppliers={suppliers}
                        value={form.watch('supplier') || ''}
                        onChange={(supplierName, supplierId) => {
                          form.setValue('supplier', supplierName)
                          form.setValue('supplier_id', supplierId)
                        }}
                        placeholder="Select or enter supplier name…"
                      />
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
                  disabled={loading}
                >
                  {loading ? <LoadingSpinner size="sm" /> : (isEditMode ? 'Update Inventory' : 'Add to Stock')}
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
                {formulateFeedOptions.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
                    No formulate feed types found. Open <strong>Add Feed Type</strong> and check
                    &ldquo;Is Formulate Feed&rdquo; on any feed type that represents a blended or
                    compound output (e.g. Dairy Meal, TMR).
                  </div>
                ) : (
                  <FeedSearchSelect
                    feedTypes={formulateFeedOptions}
                    feedTypeCategories={feedTypeCategories}
                    value={outputFeedTypeId}
                    onChange={setOutputFeedTypeId}
                    placeholder="Select the feed type this batch produces…"
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  The finished product added to inventory (e.g. "Dairy Meal"). Only feed types
                  marked as <em>Formulate Feed</em> appear here.
                </p>
              </div>

              {/* Batch quantity and production date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="batch_qty">
                    Batch Quantity ({outputCurrentUnit ? getUnitLabel(outputCurrentUnit) : 'kg'}) *
                  </Label>
                  <Input
                    id="batch_qty"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={batchQuantityPreferred ?? ''}
                    onChange={(e) => handleBatchQuantityPreferredChange(e.target.value)}
                    placeholder={`e.g., 100${outputCurrentUnit ? ` ${getUnitLabel(outputCurrentUnit)}` : ''}`}
                  />
                  {outputNeedsConversion && (
                    <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200 text-sm text-green-800">
                      <div className="font-medium mb-1">Equivalent {outputBaseUnitLabel.toUpperCase()} value</div>
                      <div>
                        {(batchQuantityPreferred ?? 0).toString()} {getUnitLabel(outputCurrentUnit)} = {(batchQuantityKg ?? 0).toString()} {outputBaseUnitLabel}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="production_date">Production Date *</Label>
                  <Input
                    id="production_date"
                    type="date"
                    value={productionDate}
                    onChange={(e) => setProductionDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Storage Location */}
              <div>
                <Label htmlFor="formulate_storage_location">Storage Location</Label>
                <select
                  id="formulate_storage_location"
                  value={formulateStorageId}
                  onChange={(e) => setFormulateStorageId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  <option value="">— Select a storage location (optional)</option>
                  {storageLocations.map((storage) => (
                    <option key={storage.id} value={storage.id}>
                      {storage.name}
                      {storage.type && ` (${storage.type})`}
                      {storage.currentOccupancy !== undefined && storage.capacity !== undefined
                        ? ` — ${storage.currentOccupancy}/${storage.capacity} occupied`
                        : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Optional: Select where the formulated feed will be stored.</p>
              </div>

              {/* Ingredient builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ingredients *</Label>
                  {/* Percentage meter */}
                  {formulateIngredients.length > 0 && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${percentageValid
                        ? 'bg-green-100 text-green-700' // Green if 98% - 100%
                        : totalPercentage > 100
                          ? 'bg-red-100 text-red-700'   // Red if over 100%
                          : 'bg-amber-100 text-amber-700' // Amber if under 98%
                      }`}>
                      {totalPercentage.toFixed(2)} / 100%
                    </span>
                  )}
                </div>

                {ingredientOptions.length === 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
                    No feeds found in inventory. Add individual ingredient feeds to your stock first using the Add Stock tab.
                  </div>
                )}

                {/* Ingredient rows */}
                <div className="space-y-2 min-h-[22rem] max-h-[32rem] overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {formulateIngredients.map((row, idx) => {
                    const req = ingredientRequirements.find(r => r.rowId === row.rowId)
                    const availableOptions = ingredientOptions.filter(
                      ft => !usedFeedTypeIds.has(ft.id) || ft.id === row.feed_type_id
                    )
                    const stockRow = row.feed_type_id
                      ? inventoryStock.find(s => s.feed_type_id === row.feed_type_id)
                      : undefined
                    const stockKg = stockRow?.quantity_in_stock ?? null
                    return (
                      <div
                        key={row.rowId}
                        className={`p-2 rounded-lg border ${req && !req.sufficient ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                      >
                        {/* Line 1: index · feed select · remove */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <FeedSearchSelect
                              feedTypes={availableOptions}
                              feedTypeCategories={feedTypeCategories}
                              value={row.feed_type_id}
                              onChange={(id) => updateIngredientRow(row.rowId, 'feed_type_id', id)}
                              placeholder="Select ingredient…"
                              inventoryStock={inventoryStock}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeIngredientRow(row.rowId)}
                            className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove ingredient"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Line 2: stock info · percentage · availability */}
                        <div className="flex items-center gap-2 mt-1.5 pl-7">
                          {/* Stock info — grows to fill available space */}
                          <div className="flex-1 min-w-0">
                            {row.feed_type_id && stockKg !== null && (
                              <p className={`text-xs font-medium ${stockKg === 0
                                ? 'text-red-600'
                                : stockKg < 10
                                  ? 'text-amber-600'
                                  : 'text-green-700'
                                }`}>
                                In stock: {stockKg.toFixed(2)} kg
                              </p>
                            )}
                            {row.feed_type_id && stockKg === null && (
                              <p className="text-xs text-gray-400">No stock record found</p>
                            )}
                          </div>

                          {/* Availability indicator */}
                          {req && batchQuantityKg && batchQuantityKg > 0 && (
                            <div className="flex-shrink-0 text-xs">
                              {req.sufficient ? (
                                <span className="text-green-600 flex items-center gap-0.5">
                                  <CheckCircle className="h-3 w-3" />
                                  {req.required_kg.toFixed(1)} kg
                                </span>
                              ) : (
                                <span className="text-red-600 flex items-center gap-0.5">
                                  <AlertTriangle className="h-3 w-3" />
                                  short {(req.required_kg - req.available_kg).toFixed(1)} kg
                                </span>
                              )}
                            </div>
                          )}

                          {/* Percentage input */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              onFocus={(e) => e.target.select()}
                              value={row.percentage === undefined ? '' : row.percentage}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateIngredientRow(
                                  row.rowId,
                                  'percentage',
                                  val === '' ? 0 : parseFloat(val)
                                );
                              }}
                              className="w-16 text-sm px-2 py-1"
                              placeholder="0.00"
                            />
                            <span className="text-sm text-gray-500 flex-shrink-0">%</span>
                          </div>
                        </div>
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
                          {totalPercentage.toFixed(2)}%
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
                      Percentages must sum to **at least 98%** before you can formulate.
                      Currently {totalPercentage.toFixed(2)}% — {totalPercentage < 98 ? `add ${(98 - totalPercentage).toFixed(2)}% more` : `reduce by ${(totalPercentage - 100).toFixed(2)}%`}.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="formulate_batch_number">Batch / Lot Number</Label>
                  <Input
                    id="formulate_batch_number"
                    value={formulateBatchNumber}
                    onChange={(e) => setFormulateBatchNumber(e.target.value)}
                    placeholder="e.g., LOT2024001"
                  />
                </div>
                <div>
                  <Label htmlFor="formulate_expiry_date">Expiry Date</Label>
                  <Input
                    id="formulate_expiry_date"
                    type="date"
                    value={formulateExpiryDate}
                    onChange={(e) => setFormulateExpiryDate(e.target.value)}
                  />
                </div>
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
