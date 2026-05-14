'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import {
  X, Package, AlertTriangle, Calendar, FlaskConical,
  Thermometer, ChevronDown, CheckCircle2, Loader2, Users,
  Search, Wrench, ChevronRight,
} from 'lucide-react'

interface AddInventoryModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onItemAdded: (item: any) => void
}

const CATEGORIES = [
  { value: 'medical', label: '💊 Medical (Veterinary)', color: 'bg-red-100 text-red-800' },
  { value: 'cropInputs', label: '🌱 Crop Inputs (Feed Production)', color: 'bg-green-100 text-green-800' },
  { value: 'construction', label: '🏗️ Construction', color: 'bg-blue-100 text-blue-800' },
  { value: 'fuel', label: '⛽ Fuel & Energy', color: 'bg-orange-100 text-orange-800' },
  { value: 'maintenance', label: '🛠️ Maintenance & Consumables', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'dairyHygiene', label: '🧼 Dairy Hygiene', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'breeding', label: '🧬 Breeding', color: 'bg-violet-100 text-violet-800' },
  { value: 'office', label: '🏢 Office & General Supplies', color: 'bg-gray-100 text-gray-800' },
  { value: 'packaging', label: '📦 Packaging / Sales', color: 'bg-amber-100 text-amber-800' },
  { value: 'kitchen', label: '🍳 Kitchen', color: 'bg-rose-100 text-rose-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700' },
]

const UNITS = [
  'kg', 'g', 'liters', 'ml', 'pieces', 'boxes', 'bales', 'vials',
  'bottles', 'doses', 'kits', 'bags', 'drums', 'units',
]

const SUBCATEGORIES: Record<string, string[]> = {
  medical: ['Vaccines', 'Antibiotics', 'Dewormers', 'Hormones (e.g. oxytocin)', 'Vitamins & supplements', 'Other'],
  cropInputs: ['Seeds', 'Fertilizers', 'Pesticides / Herbicides / Fungicides', 'Other'],
  construction: ['Timber & lumber', 'Cement & concrete', 'Iron & steel', 'Roofing materials', 'Sand & aggregates', 'Paints & finishes', 'Fencing & gates', 'Other'],
  fuel: ['Diesel', 'Petrol', 'Lubricants', 'Other'],
  maintenance: ['Spare parts', 'Tools', 'Plumbing / Electrical', 'Building materials', 'Other'],
  dairyHygiene: ['Disinfectants', 'Detergents', 'Teat dips', 'Other'],
  breeding: ['Semen', 'AI consumables', 'Other'],
  office: ['Stationery', 'Staff consumables (uniforms, PPE)', 'Other'],
  packaging: ['Milk containers', 'Bottles / sachets', 'Labels', 'Other'],
  kitchen: ['Cooking ingredients & spices', 'Dry goods & grains', 'Cooking gas & fuel', 'Cookware & utensils', 'Cleaning & hygiene supplies', 'Beverages & drinks', 'Small appliances', 'Other'],
  other: ['General', 'Other'],
}



// Machinery/Equipment catalog — shown when Maintenance > Spare parts is selected
const MACHINERY_CATALOG: { id: string; name: string; type: string }[] = [
  { id: 'mach-001', name: 'John Deere 5055E', type: 'Tractor' },
  { id: 'mach-002', name: 'Massey Ferguson 265', type: 'Tractor' },
  { id: 'mach-003', name: 'New Holland TD5', type: 'Tractor' },
  { id: 'mach-004', name: 'Kubota M7060', type: 'Tractor' },
  { id: 'mach-005', name: 'Farmtrac 60', type: 'Tractor' },
  { id: 'mach-006', name: 'Grundfos CM5', type: 'Water Pump' },
  { id: 'mach-007', name: 'Davis & Shirtliff Pedrollo', type: 'Water Pump' },
  { id: 'mach-008', name: 'Kirloskar Star-1', type: 'Water Pump' },
  { id: 'mach-009', name: 'Honda WB30XT', type: 'Water Pump' },
  { id: 'mach-010', name: 'Honda EU7000is', type: 'Generator' },
  { id: 'mach-011', name: 'Kipor KDE6700T', type: 'Generator' },
  { id: 'mach-012', name: 'Lister Petter LPW3', type: 'Generator' },
  { id: 'mach-013', name: 'Perkins 403D-15', type: 'Generator' },
  { id: 'mach-014', name: 'DeLaval Milking Machine', type: 'Milking Equipment' },
  { id: 'mach-015', name: 'BouMatic Robotics R650', type: 'Milking Equipment' },
  { id: 'mach-016', name: 'GEA DairyRobot R9500', type: 'Milking Equipment' },
  { id: 'mach-017', name: 'TMR Feed Mixer Wagon', type: 'Feed Equipment' },
  { id: 'mach-018', name: 'Hay Baler (Round)', type: 'Feed Equipment' },
  { id: 'mach-019', name: 'Silage Chopper', type: 'Feed Equipment' },
  { id: 'mach-020', name: 'Chaff Cutter', type: 'Other' },
  { id: 'mach-021', name: 'Slurry Spreader', type: 'Other' },
  { id: 'mach-022', name: 'Boom Sprayer', type: 'Other' },
]

// ── Optional Machinery Picker (Maintenance > Spare parts) ────────────────────
function MachineryPicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [equipment, setEquipment] = useState<{ id: string; name: string; type: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Fetch equipment from API on mount
  useEffect(() => {
    const fetchEquipment = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/equipment')
        if (!res.ok) throw new Error('Failed to fetch equipment')
        const data = await res.json()
        setEquipment(data || [])
      } catch (err) {
        console.error('Error fetching equipment:', err)
        setError('Could not load equipment list')
        setEquipment([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchEquipment()
  }, [])

  const filtered = query.trim()
    ? equipment.filter(
        m =>
          m.name.toLowerCase().includes(query.toLowerCase()) ||
          m.type.toLowerCase().includes(query.toLowerCase())
      )
    : equipment

  const grouped = filtered.reduce<Record<string, typeof equipment>>((acc, m) => {
    if (!acc[m.type]) acc[m.type] = []
    acc[m.type].push(m)
    return acc
  }, {})

  const selectedMachine = equipment.find(m => m.id === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <Label className="text-sm font-medium flex items-center gap-1.5 mb-1">
        <Wrench className="h-3.5 w-3.5 text-gray-400" />
        Equipment / Machinery
        <span className="ml-1 text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Optional</span>
      </Label>
      <p className="text-xs text-gray-400 mb-1.5">Link this spare part to a specific machine on your farm.</p>

      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
          isOpen ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {selectedMachine ? (
          <span className="text-gray-900 font-medium">
            {selectedMachine.name}{' '}
            <span className="font-normal text-gray-500">({selectedMachine.type})</span>
          </span>
        ) : value === 'custom' ? (
          <span className="text-gray-500 italic">Enter manually below…</span>
        ) : (
          <span className="text-gray-400">Select a machine (optional)…</span>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search machinery…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-gray-500 text-center py-6">Loading equipment…</p>
            ) : error ? (
              <p className="text-sm text-red-500 text-center py-6">{error}</p>
            ) : (
              <>
                {value && (
                  <button
                    type="button"
                    onClick={() => { onChange(''); setIsOpen(false); setQuery('') }}
                    className="w-full px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 text-left border-b border-gray-100"
                  >
                    ✕ Clear selection
                  </button>
                )}
                {Object.keys(grouped).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No machines found</p>
                ) : (
                  Object.entries(grouped).map(([type, machines]) => (
                    <div key={type}>
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                        {type}
                      </div>
                      {machines.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => { onChange(m.id); setIsOpen(false); setQuery('') }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-indigo-50 transition-colors ${
                            value === m.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-800'
                          }`}
                        >
                          <span>{m.name}</span>
                          {value === m.id && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </>
            )}
          </div>
          <div className="border-t p-2">
            <button
              type="button"
              onClick={() => { onChange('custom'); setIsOpen(false); setQuery('') }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              Not in list — enter manually
            </button>
          </div>
        </div>
      )}

      {value === 'custom' && (
        <div className="mt-2">
          <Input
            placeholder="Enter machine or equipment name…"
            className="text-sm"
            onChange={e => onChange(`custom:${e.target.value}`)}
          />
        </div>
      )}
    </div>
  )
}

type Step = 'basic' | 'stock' | 'tracking' | 'review'

const STEPS: { key: Step; label: string }[] = [
  { key: 'basic', label: 'Basic Info' },
  { key: 'stock', label: 'Stock Levels' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'review', label: 'Review' },
]


export function AddInventoryModal({ farmId, isOpen, onClose, onItemAdded }: AddInventoryModalProps) {
  const [step, setStep] = useState<Step>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [isLoadingDepts, setIsLoadingDepts] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingCats, setIsLoadingCats] = useState(false)

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    subcategory_id: '',
    machineryId: '',
    description: '',
    unit_of_measure: 'kg',
    cost_per_unit: '',
    supplier: '',
    storage_location: '',
    department_id: '',
    current_stock: '',
    minimum_stock: '',
    reorder_level: '',
    reorder_quantity: '',
    is_perishable: false,
    requires_batch_tracking: false,
    expiry_date: '',
    batch_number: '',
    notes: '',
  })

  useEffect(() => {
    if (isOpen) {
      // Fetch departments
      const fetchDepts = async () => {
        setIsLoadingDepts(true)
        try {
          const res = await fetch('/api/teams/departments')
          const json = await res.json()
          if (json.success) setDepartments(json.data)
        } catch (err) {
          console.error('Failed to fetch departments', err)
        } finally {
          setIsLoadingDepts(false)
        }
      }

      // Fetch categories
      const fetchCategories = async () => {
        setIsLoadingCats(true)
        try {
          const res = await fetch('/api/inventory/categories?include_subcategories=true')
          const json = await res.json()
          if (json.success) setCategories(json.data)
        } catch (err) {
          console.error('Failed to fetch categories', err)
        } finally {
          setIsLoadingCats(false)
        }
      }

      fetchDepts()
      fetchCategories()
    }
  }, [isOpen])

  const set = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  // Get selected category and its subcategories
  const selectedCategory = categories.find(c => c.id === form.category_id)
  const subcategories = selectedCategory?.subcategories || []

  const validate = (s: Step): boolean => {
    const errs: Record<string, string> = {}
    if (s === 'basic') {
      if (!form.name.trim()) errs.name = 'Item name is required'
      if (!form.category_id) errs.category_id = 'Category is required'
      if (!form.subcategory_id && subcategories.length > 0) errs.subcategory_id = 'Subcategory is required'
      if (!form.unit_of_measure) errs.unit_of_measure = 'Unit is required'
    }
    if (s === 'stock') {
      if (!form.current_stock || isNaN(Number(form.current_stock)))
        errs.current_stock = 'Enter a valid quantity'
      if (form.minimum_stock && isNaN(Number(form.minimum_stock)))
        errs.minimum_stock = 'Must be a number'
      if (form.reorder_level && isNaN(Number(form.reorder_level)))
        errs.reorder_level = 'Must be a number'
    }
    if (s === 'tracking') {
      if (form.is_perishable && !form.requires_batch_tracking)
        errs.requires_batch_tracking = 'Perishable items must have batch tracking enabled'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => {
    const idx = STEPS.findIndex(s => s.key === step)
    if (!validate(step)) return
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key)
  }

  const back = () => {
    const idx = STEPS.findIndex(s => s.key === step)
    if (idx > 0) setStep(STEPS[idx - 1].key)
  }

  const handleSubmit = async () => {
    if (!validate('stock')) { setStep('stock'); return }
    setIsSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        category_id: form.category_id,
        subcategory_id: form.subcategory_id || null,
        department_id: form.department_id || null,
        equipment_id: form.machineryId || null,
        description: form.description?.trim() || null,
        unit_of_measure: form.unit_of_measure,
        current_stock: Number(form.current_stock),
        minimum_stock: Number(form.minimum_stock) || 0,
        reorder_level: Number(form.reorder_level) || 0,
        reorder_quantity: Number(form.reorder_quantity) || 0,
        cost_per_unit: Number(form.cost_per_unit) || 0,
        is_perishable: form.is_perishable,
        requires_batch_tracking: form.requires_batch_tracking,
        shelf_life_days: form.expiry_date ? Math.ceil((new Date(form.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
        supplier_preferred: form.supplier?.trim() || null,
        notes: form.notes?.trim() || null,
      }

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        onItemAdded(data.item)
        handleClose()
      } else {
        setErrors(data.errors || { submit: data.error || 'Failed to create item' })
      }
    } catch (err) {
      console.error('Error creating item:', err)
      setErrors({ submit: 'Network error — please try again' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setForm({
      name: '',
      category_id: '',
      subcategory_id: '',
      machineryId: '',
      description: '',
      unit_of_measure: 'kg',
      cost_per_unit: '',
      supplier: '',
      storage_location: '',
      department_id: '',
      current_stock: '',
      minimum_stock: '',
      reorder_level: '',
      reorder_quantity: '',
      is_perishable: false,
      requires_batch_tracking: false,
      expiry_date: '',
      batch_number: '',
      notes: '',
    })
    setStep('basic')
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  const stepIdx = STEPS.findIndex(s => s.key === step)
  const progress = ((stepIdx + 1) / STEPS.length) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Add Inventory Item</h2>
              <p className="text-xs text-gray-500">
                Step {stepIdx + 1} of {STEPS.length} — {STEPS[stepIdx].label}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-gray-100 shrink-0">
          <div
            className="h-1 bg-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step pills */}
        <div className="flex gap-1 px-6 py-3 border-b bg-gray-50 shrink-0 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => i < stepIdx && setStep(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                s.key === step
                  ? 'bg-indigo-600 text-white'
                  : i < stepIdx
                  ? 'bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {i < stepIdx && <CheckCircle2 className="h-3 w-3" />}
              {s.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP 1: BASIC INFO ── */}
          {step === 'basic' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  Item Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Dairy Meal (High Energy)"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="mt-1"
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>

              {/* Department */}
              <div>
                <Label htmlFor="department" className="text-sm font-medium flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-gray-400" />
                  Managing Department
                </Label>
                <div className="relative mt-1">
                  <select
                    id="department"
                    value={form.department_id}
                    onChange={e => set('department_id', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                    disabled={isLoadingDepts}
                  >
                    <option value="">Select Department (Optional)</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {isLoadingDepts && <p className="text-[10px] text-gray-400 mt-1">Loading departments…</p>}
              </div>

              {/* Category grid */}
              <div>
                <Label className="text-sm font-medium">
                  Category <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {isLoadingCats ? (
                    <p className="text-xs text-gray-400 col-span-2">Loading categories…</p>
                  ) : categories.length === 0 ? (
                    <p className="text-xs text-gray-400 col-span-2">No categories available</p>
                  ) : (
                    categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          set('category_id', cat.id)
                          set('subcategory_id', '')
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left ${
                          form.category_id === cat.id
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        {cat.display_name}
                      </button>
                    ))
                  )}
                </div>
                {errors.category_id && <p className="text-xs text-red-600 mt-1">{errors.category_id}</p>}
              </div>

              {/* Subcategory pills */}
              {form.category_id && subcategories.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">
                    Subcategory {subcategories.length > 0 && <span className="text-red-500">*</span>}
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {subcategories.map((sub: any) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => set('subcategory_id', sub.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          form.subcategory_id === sub.id
                            ? 'border-indigo-400 bg-indigo-100 text-indigo-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                  {errors.subcategory_id && <p className="text-xs text-red-600 mt-1">{errors.subcategory_id}</p>}
                </div>
              )}

              <div>
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <textarea
                  id="description"
                  placeholder="Optional notes about this item..."
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">
                    Unit of Measure <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <select
                      value={form.unit_of_measure}
                      onChange={e => set('unit_of_measure', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  {errors.unit_of_measure && (
                    <p className="text-xs text-red-600 mt-1">{errors.unit_of_measure}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="cost_per_unit" className="text-sm font-medium">Cost per Unit (KES)</Label>
                  <Input
                    id="cost_per_unit"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={form.cost_per_unit}
                    onChange={e => set('cost_per_unit', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="supplier" className="text-sm font-medium">Supplier</Label>
                  <Input
                    id="supplier"
                    placeholder="e.g. Unga Feeds Ltd"
                    value={form.supplier}
                    onChange={e => set('supplier', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="storage_location" className="text-sm font-medium">Storage Location</Label>
                  <Input
                    id="storage_location"
                    placeholder="e.g. Main Feed Store"
                    value={form.storage_location}
                    onChange={e => set('storage_location', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: STOCK LEVELS ── */}
          {step === 'stock' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                Set the current quantity and thresholds that trigger low-stock alerts and automatic
                reorder suggestions.
              </div>

              <div>
                <Label htmlFor="current_stock" className="text-sm font-medium">
                  Current Stock <span className="text-red-500">*</span>
                  <span className="ml-1 text-gray-400 font-normal">({form.unit_of_measure})</span>
                </Label>
                <Input
                  id="current_stock"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.current_stock}
                  onChange={e => set('current_stock', e.target.value)}
                  className="mt-1"
                />
                {errors.current_stock && (
                  <p className="text-xs text-red-600 mt-1">{errors.current_stock}</p>
                )}
              </div>

              <div>
                <Label htmlFor="minimum_stock" className="text-sm font-medium">
                  Minimum Stock Level
                  <span className="ml-1 text-gray-400 font-normal">({form.unit_of_measure})</span>
                </Label>
                <Input
                  id="minimum_stock"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Alert when below this"
                  value={form.minimum_stock}
                  onChange={e => set('minimum_stock', e.target.value)}
                  className="mt-1"
                />
                {errors.minimum_stock && (
                  <p className="text-xs text-red-600 mt-1">{errors.minimum_stock}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  A low-stock alert fires when current stock drops below this level.
                </p>
              </div>

              <div>
                <Label htmlFor="reorder_level" className="text-sm font-medium">
                  Reorder Level
                  <span className="ml-1 text-gray-400 font-normal">({form.unit_of_measure})</span>
                </Label>
                <Input
                  id="reorder_level"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Trigger reorder at this level"
                  value={form.reorder_level}
                  onChange={e => set('reorder_level', e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Stock level that prompts a purchase order suggestion (usually above minimum).
                </p>
              </div>

              <div>
                <Label htmlFor="reorder_quantity" className="text-sm font-medium">
                  Reorder Quantity
                  <span className="ml-1 text-gray-400 font-normal">({form.unit_of_measure})</span>
                </Label>
                <Input
                  id="reorder_quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Default quantity to order"
                  value={form.reorder_quantity}
                  onChange={e => set('reorder_quantity', e.target.value)}
                  className="mt-1"
                />
              </div>

              {form.current_stock && form.cost_per_unit && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Estimated Inventory Value</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">
                    KES{' '}
                    {(
                      Number(form.current_stock) * Number(form.cost_per_unit)
                    ).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: TRACKING ── */}
          {step === 'tracking' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                Enable batch tracking for medicines, vaccines, semen, and perishable feed to monitor
                expiry dates.
              </div>

              <div
                onClick={() => set('is_perishable', !form.is_perishable)}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  form.is_perishable
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      form.is_perishable ? 'bg-orange-100' : 'bg-gray-100'
                    }`}
                  >
                    <Thermometer
                      className={`h-5 w-5 ${form.is_perishable ? 'text-orange-600' : 'text-gray-400'}`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Perishable Item</p>
                    <p className="text-xs text-gray-500">
                      This item can spoil, degrade, or has a shelf life
                    </p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    form.is_perishable ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                  }`}
                >
                  {form.is_perishable && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>

              <div
                onClick={() => set('requires_batch_tracking', !form.requires_batch_tracking)}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  form.requires_batch_tracking
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      form.requires_batch_tracking ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}
                  >
                    <FlaskConical
                      className={`h-5 w-5 ${
                        form.requires_batch_tracking ? 'text-indigo-600' : 'text-gray-400'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Batch Tracking</p>
                    <p className="text-xs text-gray-500">
                      Track individual batches with lot numbers and expiry
                    </p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    form.requires_batch_tracking
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-gray-300'
                  }`}
                >
                  {form.requires_batch_tracking && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>

              {(form.is_perishable || form.requires_batch_tracking) && (
                <div className="space-y-3 pt-1">
                  <div>
                    <Label htmlFor="expiry_date" className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      Expiry Date
                    </Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={form.expiry_date}
                      onChange={e => set('expiry_date', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="batch_number" className="text-sm font-medium">
                      Batch / Lot Number
                    </Label>
                    <Input
                      id="batch_number"
                      placeholder="e.g. PEN-2026-C4"
                      value={form.batch_number}
                      onChange={e => set('batch_number', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="notes" className="text-sm font-medium">Additional Notes</Label>
                <textarea
                  id="notes"
                  placeholder="Storage requirements, handling instructions, etc."
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ── STEP 4: REVIEW ── */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 text-base">{form.name || '—'}</h3>
                  {selectedCategory && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                      {selectedCategory.emoji} {selectedCategory.display_name}
                    </span>
                  )}
                </div>
                {form.subcategory_id && selectedCategory?.subcategories && (
                  <p className="text-xs text-gray-500">
                    {selectedCategory.subcategories.find((s: any) => s.id === form.subcategory_id)?.name}
                  </p>
                )}
                {form.description && <p className="text-sm text-gray-600">{form.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'Current Stock',
                    value: form.current_stock ? `${form.current_stock} ${form.unit_of_measure}` : '—',
                  },
                  {
                    label: 'Minimum Stock',
                    value: form.minimum_stock ? `${form.minimum_stock} ${form.unit_of_measure}` : '—',
                  },
                  {
                    label: 'Reorder Level',
                    value: form.reorder_level ? `${form.reorder_level} ${form.unit_of_measure}` : '—',
                  },
                  {
                    label: 'Cost per Unit',
                    value: form.cost_per_unit
                      ? `KES ${Number(form.cost_per_unit).toLocaleString()}`
                      : '—',
                  },
                  { label: 'Supplier', value: form.supplier || '—' },
                  ...(form.machineryId && form.machineryId !== 'custom'
                    ? [{
                        label: 'Linked Equipment',
                        value: (() => {
                          if (form.machineryId.startsWith('custom:')) return form.machineryId.replace('custom:', '') || '—'
                          return MACHINERY_CATALOG.find(m => m.id === form.machineryId)?.name || '—'
                        })()
                      }]
                    : []),
                  { label: 'Storage', value: form.storage_location || '—' },
                  {
                    label: 'Department',
                    value:
                      departments.find(d => d.id === form.department_id)?.name || 'Not assigned',
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white border rounded-lg p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap">
                {form.is_perishable && (
                  <Badge className="bg-orange-100 text-orange-800">Perishable</Badge>
                )}
                {form.requires_batch_tracking && (
                  <Badge className="bg-indigo-100 text-indigo-800">Batch Tracked</Badge>
                )}
                {form.expiry_date && (
                  <Badge className="bg-red-100 text-red-800">Expires {form.expiry_date}</Badge>
                )}
                {form.batch_number && (
                  <Badge className="bg-gray-100 text-gray-700 font-mono">{form.batch_number}</Badge>
                )}
              </div>

              {form.current_stock && form.cost_per_unit && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-xs text-green-700">Total Inventory Value</p>
                  <p className="text-xl font-bold text-green-800 mt-1">
                    KES{' '}
                    {(
                      Number(form.current_stock) * Number(form.cost_per_unit)
                    ).toLocaleString()}
                  </p>
                </div>
              )}

              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {errors.submit}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-2xl shrink-0">
          <Button
            variant="outline"
            onClick={stepIdx === 0 ? handleClose : back}
            disabled={isSubmitting}
          >
            {stepIdx === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step !== 'review' ? (
            <Button onClick={next}>Next</Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />Add Item
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}