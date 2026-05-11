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
import { Settings, ChevronRight, ChevronLeft, Check } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  asset_id: z.string().optional(),
  equipment_type: z.string().min(1, 'Type is required'),
  category: z.string().min(1, 'Category is required'),
  custom_equipment_type: z.string().optional(),
  custom_category: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  year_manufactured: z.number().optional().catch(undefined),
  description: z.string().optional(),
  ownership_type: z.string().optional(),
  home_location: z.string().optional(),
  current_location: z.string().optional(),
  purchase_date: z.string().optional(),
  purchase_cost: z.number().optional().catch(undefined),
  current_value: z.number().optional().catch(undefined),
  expected_useful_life_years: z.number().optional().catch(undefined),
  warranty_expiry: z.string().optional(),
  condition: z.string().optional(),
  odometer_hours: z.number().optional().catch(undefined),
  fuel_level_pct: z.number().optional().catch(undefined),
  utilization_rate_pct: z.number().optional().catch(undefined),
  status: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface AddEquipmentModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onEquipmentAdded: (equipment: any) => void
}

const STEPS = ['Identity', 'Location & Ownership', 'Financial', 'Operations & Notes']

const EQUIPMENT_TYPES = [
  { value: 'milking_equipment', label: 'Milking Equipment' },
  { value: 'tractor', label: 'Tractor' },
  { value: 'harvester', label: 'Harvester' },
  { value: 'feed_mixer', label: 'Feed Mixer' },
  { value: 'feeding_equipment', label: 'Feeding Equipment' },
  { value: 'loader', label: 'Loader / Skid Steer' },
  { value: 'manure_spreader', label: 'Manure Spreader' },
  { value: 'hay_equipment', label: 'Hay Equipment' },
  { value: 'cooling_system', label: 'Cooling System' },
  { value: 'generator', label: 'Generator' },
  { value: 'pump', label: 'Pump' },
  { value: 'vehicle', label: 'Farm Vehicle' },
  { value: 'spray_equipment', label: 'Spray Equipment' },
  { value: 'barn_equipment', label: 'Barn Equipment' },
  { value: 'water_system', label: 'Water System' },
  { value: 'other', label: 'Other' },
]

const CATEGORIES = [
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'milking_equipment', label: 'Milking Equipment' },
  { value: 'feeding_equipment', label: 'Feeding Equipment' },
  { value: 'power_equipment', label: 'Power Equipment' },
  { value: 'tools', label: 'Tools' },
  { value: 'other', label: 'Other' },
]

const OWNERSHIP_TYPES = [
  { value: 'owned', label: 'Owned' },
  { value: 'leased', label: 'Leased' },
  { value: 'rented', label: 'Rented' },
]

const CONDITIONS = [
  { value: 'excellent', label: '🟢 Excellent' },
  { value: 'good', label: '🔵 Good' },
  { value: 'fair', label: '🟡 Fair' },
  { value: 'poor', label: '🔴 Poor' },
]

export function AddEquipmentModal({ farmId, isOpen, onClose, onEquipmentAdded }: AddEquipmentModalProps) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      equipment_type: 'milking_equipment',
      category: 'milking_equipment',
      ownership_type: 'owned',
      condition: 'good',
      custom_equipment_type: '',
      custom_category: '',
    },
  })

  const selectedEquipmentType = form.watch('equipment_type')
  const selectedCategory = form.watch('category')
  const customEquipmentType = form.watch('custom_equipment_type')
  const customCategory = form.watch('custom_category')

  // Log modal state and form initialization
  useEffect(() => {
    if (isOpen) {
      console.log('📋 AddEquipmentModal opened')
      console.log('Farm ID available:', !!farmId, farmId)
      console.log('Form is ready:', form.formState.isReady)
    }
  }, [isOpen, farmId])

  const handleSubmit = async (data: FormData) => {
    console.log('=== EQUIPMENT SUBMIT STARTED ===')
    console.log('Form data received:', data)
    console.log('Farm ID:', farmId)
    
    setLoading(true)
    setError(null)
    
    try {
      // Validate required fields
      if (!data.name || !data.name.trim()) {
        throw new Error('Equipment name is required')
      }
      if (!data.equipment_type) {
        throw new Error('Equipment type is required')
      }
      if (!data.category) {
        throw new Error('Category is required')
      }
      if (!farmId) {
        throw new Error('Farm ID is missing - cannot save equipment without farm context')
      }

      console.log('✓ All validations passed')
      
      // Prepare payload with farmId
      const payload = {
        ...data,
        farm_id: farmId,
      }
      
      console.log('Sending payload to API:', payload)
      
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      console.log('API Response status:', res.status)
      console.log('API Response headers:', res.headers)
      
      const result = await res.json()
      console.log('API Response body:', result)
      
      if (!res.ok) {
        const errorMsg = result.error || result.message || 'Failed to add equipment'
        console.error('API Error:', errorMsg)
        throw new Error(errorMsg)
      }
      
      console.log('✓ Equipment created successfully')
      
      // Handle response - API returns equipment in result.equipment or result.data
      const equipment = result.equipment || result.data || result
      console.log('Equipment object to return:', equipment)
      
      if (!equipment) {
        throw new Error('No equipment data returned from server')
      }
      
      onEquipmentAdded(equipment)
      form.reset()
      setStep(0)
      onClose()
      console.log('✓ Form reset and modal closed')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Submission error:', errorMessage)
      console.error('Full error:', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
      console.log('=== EQUIPMENT SUBMIT COMPLETED ===')
    }
  }

  const nextStep = async () => {
    // Validate current step fields before advancing
    let fieldsToValidate: (keyof FormData)[] = ['name', 'equipment_type', 'category']
    
    // If 'other' is selected, require custom fields
    if (selectedEquipmentType === 'other') {
      fieldsToValidate.push('custom_equipment_type')
    }
    if (selectedCategory === 'other') {
      fieldsToValidate.push('custom_category')
    }
    
    const fieldsPerStep: Record<number, (keyof FormData)[]> = {
      0: fieldsToValidate,
      1: [],
      2: [],
      3: [],
    }
    
    console.log(`Validating step ${step} fields:`, fieldsPerStep[step])
    
    const valid = await form.trigger(fieldsPerStep[step])
    console.log(`Step ${step} validation result:`, valid)
    
    if (valid) {
      const newStep = Math.min(step + 1, STEPS.length - 1)
      console.log(`Moving from step ${step} to step ${newStep}`)
      setStep(newStep)
    } else {
      const errors = form.formState.errors
      console.error('Validation errors:', errors)
    }
  }

  const isLastStep = step === STEPS.length - 1

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Add New Asset</h3>
              <p className="text-sm text-slate-500">Register equipment in your fleet</p>
            </div>
          </div>

          {/* Step progress */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < step  ? 'bg-emerald-600 text-white' :
                    i === step ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1 font-medium whitespace-nowrap hidden sm:block ${
                    i === step ? 'text-emerald-700' : 'text-slate-400'
                  }`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-4 rounded-full transition-all ${i < step ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{error}</div>
          )}

          <form id="add-equipment-form" onSubmit={form.handleSubmit(handleSubmit)}>
            {/* Step 0 — Identity */}
            {step === 0 && (
              <div className="space-y-4">
                <SectionTitle>Basic Information</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="name">Equipment Name *</Label>
                    <Input id="name" {...form.register('name')} placeholder="e.g., Milking Machine #3"
                      error={form.formState.errors.name?.message} />
                  </div>
                  <div>
                    <Label htmlFor="asset_id">Asset ID / QR Code</Label>
                    <Input id="asset_id" {...form.register('asset_id')} placeholder="Auto-generated if blank" />
                  </div>
                  <div>
                    <Label htmlFor="serial_number">Serial Number</Label>
                    <Input id="serial_number" {...form.register('serial_number')} placeholder="Manufacturer serial" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <SelectField id="category" {...form.register('category')}
                      error={form.formState.errors.category?.message}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </SelectField>
                    {selectedCategory === 'other' && (
                      <div className="mt-2">
                        <Label htmlFor="custom_category">Specify Category *</Label>
                        <Input id="custom_category" {...form.register('custom_category')} 
                          placeholder="e.g., Climate Control, Safety Equipment"
                          error={form.formState.errors.custom_category?.message} />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="equipment_type">Equipment Type *</Label>
                    <SelectField id="equipment_type" {...form.register('equipment_type')}
                      error={form.formState.errors.equipment_type?.message}>
                      {EQUIPMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </SelectField>
                    {selectedEquipmentType === 'other' && (
                      <div className="mt-2">
                        <Label htmlFor="custom_equipment_type">Specify Equipment Type *</Label>
                        <Input id="custom_equipment_type" {...form.register('custom_equipment_type')} 
                          placeholder="e.g., Solar Panels, Ventilation System"
                          error={form.formState.errors.custom_equipment_type?.message} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="brand">Brand / Manufacturer</Label>
                    <Input id="brand" {...form.register('brand')} placeholder="e.g., John Deere" />
                  </div>
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" {...form.register('model')} placeholder="Model number" />
                  </div>
                  <div>
                    <Label htmlFor="year_manufactured">Year</Label>
                    <Input id="year_manufactured" type="number" min={1980} max={new Date().getFullYear()}
                      {...form.register('year_manufactured', { valueAsNumber: true })} placeholder="Year" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" {...form.register('description')} placeholder="Brief description of purpose" />
                </div>
              </div>
            )}

            {/* Step 1 — Location & Ownership */}
            {step === 1 && (
              <div className="space-y-4">
                <SectionTitle>Location & Ownership</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="home_location">Home Location</Label>
                    <Input id="home_location" {...form.register('home_location')} placeholder="e.g., Main Barn, Shed A" />
                  </div>
                  <div>
                    <Label htmlFor="current_location">Current Physical Location</Label>
                    <Input id="current_location" {...form.register('current_location')} placeholder="e.g., Field A, Workshop" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Ownership Type</Label>
                    <div className="flex gap-2 mt-1">
                      {OWNERSHIP_TYPES.map(o => (
                        <label key={o.value} className={`flex-1 flex items-center justify-center py-2 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                          form.watch('ownership_type') === o.value
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}>
                          <input type="radio" {...form.register('ownership_type')} value={o.value} className="sr-only" />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Condition</Label>
                    <SelectField id="condition" {...form.register('condition')}>
                      {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </SelectField>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Financial */}
            {step === 2 && (
              <div className="space-y-4">
                <SectionTitle>Financial & Lifecycle</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchase_date">Purchase Date</Label>
                    <Input id="purchase_date" type="date" {...form.register('purchase_date')} />
                  </div>
                  <div>
                    <Label htmlFor="purchase_cost">Purchase Cost ($)</Label>
                    <Input id="purchase_cost" type="number" step="0.01"
                      {...form.register('purchase_cost', { valueAsNumber: true })} placeholder="0.00" />
                  </div>
                  <div>
                    <Label htmlFor="current_value">Current Value ($)</Label>
                    <Input id="current_value" type="number" step="0.01"
                      {...form.register('current_value', { valueAsNumber: true })} placeholder="Auto-calculated if blank" />
                  </div>
                  <div>
                    <Label htmlFor="expected_useful_life_years">Expected Useful Life (years)</Label>
                    <Input id="expected_useful_life_years" type="number"
                      {...form.register('expected_useful_life_years', { valueAsNumber: true })} placeholder="e.g., 10" />
                  </div>
                  <div>
                    <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
                    <Input id="warranty_expiry" type="date" {...form.register('warranty_expiry')} />
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                  <strong>Tip:</strong> Providing purchase cost and useful life allows the system to automatically calculate current depreciated value.
                </div>
              </div>
            )}

            {/* Step 3 — Operational & Description */}
            {step === 3 && (
              <div className="space-y-4">
                <SectionTitle>Operational Metrics & Notes</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="odometer_hours">Odometer / Run Hours</Label>
                    <Input id="odometer_hours" type="number" step="0.1"
                      {...form.register('odometer_hours', { valueAsNumber: true })} placeholder="Initial hours (default: 0)" />
                  </div>
                  <div>
                    <Label htmlFor="fuel_level_pct">Fuel Level (%)</Label>
                    <Input id="fuel_level_pct" type="number" min="0" max="100"
                      {...form.register('fuel_level_pct', { valueAsNumber: true })} placeholder="0–100 (optional, for fuel equipment)" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Notes & Description</Label>
                  <textarea
                    id="description"
                    {...form.register('description')}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    placeholder="Additional notes about this equipment, certifications, special instructions, etc…"
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50 rounded-b-2xl">
          <Button variant="outline" onClick={step === 0 ? onClose : () => setStep(s => s - 1)} disabled={loading}>
            {step === 0 ? 'Cancel' : (
              <><ChevronLeft className="w-4 h-4 mr-1" />Back</>
            )}
          </Button>

          {isLastStep ? (
            <Button 
              type="submit"
              form="add-equipment-form"
              disabled={loading}
              onClick={() => {
                console.log('Submit button clicked - attempting form submission')
                console.log('Form valid:', form.formState.isValid)
                console.log('Form errors:', form.formState.errors)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? <LoadingSpinner size="sm" /> : (
                <><Check className="w-4 h-4 mr-1.5" />Add Equipment Asset</>
              )}
            </Button>
          ) : (
            <Button onClick={nextStep} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Next<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ── Helpers ─────────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-1">{children}</h4>
}

function SelectField({ children, error, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <div>
      <select
        {...props}
        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
      >
        {children}
      </select>
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  )
}