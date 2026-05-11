'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import {
  Calendar, Clock, DollarSign, Wrench, User, AlertTriangle,
  CheckCircle, Timer, Package,
} from 'lucide-react'

// Helper to convert empty strings to undefined for optional fields
const emptyStringToUndefined = z.any()
  .transform((val): string | undefined => {
    if (val === '' || val === null || val === undefined) return undefined
    return String(val).trim() || undefined
  })
  .optional()

const emptyNumberToUndefined = z.any()
  .transform((val): number | undefined => {
    if (val === '' || val === null || val === undefined) return undefined
    const num = typeof val === 'string' ? parseFloat(val) : val
    return !isNaN(num) ? num : undefined
  })
  .optional()

const schema = z.object({
  maintenance_type: z.enum(['scheduled', 'repair', 'inspection', 'predictive']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().min(1, 'Description is required'),
  maintenance_date: z.string().min(1, 'Date is required'),
  next_maintenance_date: emptyStringToUndefined,
  service_interval_hours: emptyNumberToUndefined,
  cost: emptyNumberToUndefined,
  labor_hours: emptyNumberToUndefined,
  downtime_hours: emptyNumberToUndefined,
  performed_by: z.string().transform(val => val.trim() === '' ? undefined : val.trim()).optional(),
  notes: z.string().transform(val => val.trim() === '' ? undefined : val.trim()).optional(),
  parts: z.array(z.object({
    part_name: z.string().transform(val => val.trim() === '' ? undefined : val.trim()).optional(),
    part_number: z.string().transform(val => val.trim() === '' ? undefined : val.trim()).optional(),
    quantity: emptyNumberToUndefined,
    unit_cost: emptyNumberToUndefined,
    supplier: z.string().transform(val => val.trim() === '' ? undefined : val.trim()).optional(),
  })).optional(),
}).transform(data => {
  // Filter out empty parts array
  if (data.parts && data.parts.length > 0) {
    data.parts = data.parts.filter(p => p.part_name || p.part_number || p.quantity || p.unit_cost || p.supplier)
  }
  return data
})

type FormData = z.infer<typeof schema>

interface MaintenanceScheduleModalProps {
  farmId: string
  equipment: any[]
  isOpen: boolean
  onClose: () => void
  onMaintenanceScheduled: (m: any) => void
}

const PRIORITY_META = {
  low:      { label: 'Low',      color: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
  medium:   { label: 'Medium',   color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  high:     { label: 'High',     color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  critical: { label: 'Critical', color: 'bg-rose-100 text-rose-700',     dot: 'bg-rose-500' },
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  scheduled:  { label: 'Scheduled',  color: 'bg-blue-100 text-blue-700' },
  repair:     { label: 'Repair',     color: 'bg-rose-100 text-rose-700' },
  inspection: { label: 'Inspection', color: 'bg-emerald-100 text-emerald-700' },
  predictive: { label: 'Predictive', color: 'bg-violet-100 text-violet-700' },
}

// Sample history for demo purposes
const DEMO_HISTORY = [
  { id: 'h1', maintenance_type: 'scheduled', priority: 'medium', description: 'Full 250hr service — oil, filters, belts', maintenance_date: '2023-11-10', cost: 420, performed_by: 'Nairobi Equipment Services', labor_hours: 4, parts_used: 'Oil filter, air filter, v-belt' },
  { id: 'h2', maintenance_type: 'repair', priority: 'high', description: 'Hydraulic line replacement', maintenance_date: '2023-09-22', cost: 890, performed_by: 'John Deere Dealer', labor_hours: 6, parts_used: 'Hydraulic hose kit' },
  { id: 'h3', maintenance_type: 'inspection', priority: 'low', description: 'Pre-season safety inspection', maintenance_date: '2023-07-01', cost: 120, performed_by: 'James Kamau (farm staff)', labor_hours: 2, parts_used: '' },
]

export function MaintenanceScheduleModal({ equipment, isOpen, onClose, onMaintenanceScheduled }: MaintenanceScheduleModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      maintenance_type: 'scheduled',
      priority: 'medium',
      description: '',
      maintenance_date: new Date().toISOString().split('T')[0],
      next_maintenance_date: '',
      cost: undefined,
      labor_hours: undefined,
      downtime_hours: undefined,
      service_interval_hours: undefined,
      performed_by: '',
      notes: '',
      parts: [{ part_name: '', part_number: '', quantity: undefined, unit_cost: undefined, supplier: '' }],
    },
  })

  const { fields: partFields, append: addPart, remove: removePart } = useFieldArray({
    control: form.control,
    name: 'parts',
  })

  const handleSubmit = async (data: FormData) => {
    if (!selectedEquipment) return setError('Please select equipment')
    
    setLoading(true)
    setError(null)
    try {
      // Data is already validated and transformed by schema
      const payload = {
        ...data,
        equipment_id: selectedEquipment.id,
        // Schema transform already filters empty parts
        parts: data.parts || [],
      }
      
      console.log('📋 Submitting maintenance:', payload)
      
      const res = await fetch('/api/equipment/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      console.log('API Response status:', res.status)
      const result = await res.json()
      console.log('API Response:', result)
      
      if (!res.ok) throw new Error(result.error || 'Failed to schedule maintenance')
      
      console.log('✓ Maintenance scheduled successfully')
      onMaintenanceScheduled(result.data)
      form.reset()
      setSelectedEquipment(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Submission error:', errorMsg)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const priority = form.watch('priority')
  const maintType = form.watch('maintenance_type')

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl">
      <div className="flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Maintenance Management</h3>
              <p className="text-sm text-slate-500">Schedule work orders and view service history</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

          {/* Left — Equipment selector */}
          <div className="lg:w-64 xl:w-72 border-b lg:border-b-0 lg:border-r border-slate-100 flex-shrink-0">
            <div className="p-4 space-y-2 lg:overflow-y-auto" style={{ maxHeight: '70vh' }}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Select Equipment</p>
              {equipment.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No equipment added yet</p>
              ) : (
                equipment.map(eq => (
                  <button
                    key={eq.id}
                    onClick={() => setSelectedEquipment(eq)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                      selectedEquipment?.id === eq.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <p className="font-semibold text-sm leading-tight">{eq.name}</p>
                    <p className={`text-xs mt-0.5 ${selectedEquipment?.id === eq.id ? 'text-blue-200' : 'text-slate-400'}`}>
                      {eq.asset_id || eq.serial_number || eq.equipment_type}
                    </p>
                    {eq.status === 'maintenance_due' && (
                      <span className={`inline-flex items-center gap-1 text-xs mt-1 font-medium ${selectedEquipment?.id === eq.id ? 'text-amber-200' : 'text-amber-600'}`}>
                        <AlertTriangle className="w-3 h-3" />Overdue
                      </span>
                    )}
                    {eq.status === 'broken' && (
                      <span className={`inline-flex items-center gap-1 text-xs mt-1 font-medium ${selectedEquipment?.id === eq.id ? 'text-rose-200' : 'text-rose-600'}`}>
                        <AlertTriangle className="w-3 h-3" />Broken
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right — Detail panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedEquipment ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Wrench className="w-8 h-8 text-slate-300" />
                </div>
                <h4 className="font-semibold text-slate-600">No equipment selected</h4>
                <p className="text-sm text-slate-400 mt-1">Choose equipment from the left panel to manage maintenance</p>
              </div>
            ) : (
              <>
                {/* Equipment summary bar */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4 flex-wrap flex-shrink-0">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{selectedEquipment.name}</p>
                    <p className="text-xs text-slate-500">{selectedEquipment.brand} {selectedEquipment.model} · {selectedEquipment.location}</p>
                  </div>
                  {selectedEquipment.odometer_hours && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                      <Timer className="w-3.5 h-3.5" />
                      <span className="font-semibold text-slate-800">{selectedEquipment.odometer_hours.toLocaleString()}h</span>
                      run time
                    </div>
                  )}
                  {selectedEquipment.warranty_expiry && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      Warranty: {new Date(selectedEquipment.warranty_expiry).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-5 pt-3 flex-shrink-0">
                  {[
                    { id: 'new', label: 'New Work Order' },
                    { id: 'history', label: 'Service History' },
                  ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === t.id
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {/* ── New work order form ── */}
                  {activeTab === 'new' && (
                    <div className="p-5 space-y-5">
                      {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{error}</div>
                      )}

                      {/* Type + Priority */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Maintenance Type</Label>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            {(['scheduled', 'repair', 'inspection', 'predictive'] as const).map(t => (
                              <label key={t} className={`flex items-center justify-center py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                                maintType === t
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
                              }`}>
                                <input type="radio" {...form.register('maintenance_type')} value={t} className="sr-only" />
                                {TYPE_META[t].label}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label>Priority</Label>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            {(['low', 'medium', 'high', 'critical'] as const).map(p => (
                              <label key={p} className={`flex items-center justify-center py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                                priority === p
                                  ? `border-current ${PRIORITY_META[p].color}`
                                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
                              }`}>
                                <input type="radio" {...form.register('priority')} value={p} className="sr-only" />
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${priority === p ? PRIORITY_META[p].dot : 'bg-slate-300'}`} />
                                {PRIORITY_META[p].label}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Issue / Work Description *</Label>
                        <textarea
                          id="description"
                          {...form.register('description')}
                          rows={3}
                          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="Describe the maintenance work or issue in detail…"
                        />
                        {form.formState.errors.description && (
                          <p className="text-xs text-rose-500 mt-1">{form.formState.errors.description.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="maintenance_date">Service Date *</Label>
                          <Input id="maintenance_date" type="date" {...form.register('maintenance_date')}
                            error={form.formState.errors.maintenance_date?.message} />
                        </div>
                        <div>
                          <Label htmlFor="next_maintenance_date">Next Service Due</Label>
                          <Input id="next_maintenance_date" type="date" {...form.register('next_maintenance_date')} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <Label htmlFor="cost">Cost ($)</Label>
                          <Input id="cost" type="number" step="0.01"
                            {...form.register('cost')} placeholder="0.00" />
                        </div>
                        <div>
                          <Label htmlFor="labor_hours">Labour (hrs)</Label>
                          <Input id="labor_hours" type="number" step="0.5"
                            {...form.register('labor_hours')} placeholder="0" />
                        </div>
                        <div>
                          <Label htmlFor="downtime_hours">Downtime (hrs)</Label>
                          <Input id="downtime_hours" type="number" step="0.5"
                            {...form.register('downtime_hours')} placeholder="0" />
                        </div>
                        <div>
                          <Label htmlFor="service_interval_hours">Interval (hrs)</Label>
                          <Input id="service_interval_hours" type="number"
                            {...form.register('service_interval_hours')} placeholder="e.g. 250" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="performed_by">Technician / Company</Label>
                          <Input id="performed_by" {...form.register('performed_by')} placeholder="Who performed the work" />
                        </div>
                      </div>

                      {/* Parts Used Section */}
                      <div className="border-t border-slate-200 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-700 text-sm">Parts Used</h4>
                          <button
                            type="button"
                            onClick={() => addPart({ part_name: '', part_number: '', quantity: 1 })}
                            className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium"
                          >
                            + Add Part
                          </button>
                        </div>

                        <div className="space-y-3">
                          {partFields.map((field, index) => (
                            <div key={field.id} className="bg-slate-50 rounded-xl p-3 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <Label htmlFor={`part_name_${index}`} className="text-xs">Part Name *</Label>
                                  <Input
                                    id={`part_name_${index}`}
                                    {...form.register(`parts.${index}.part_name`)}
                                    placeholder="e.g., Engine Oil Filter"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`part_number_${index}`} className="text-xs">Part Number</Label>
                                  <Input
                                    id={`part_number_${index}`}
                                    {...form.register(`parts.${index}.part_number`)}
                                    placeholder="e.g., JD-12345"
                                    className="text-sm"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div>
                                  <Label htmlFor={`quantity_${index}`} className="text-xs">Qty</Label>
                                  <Input
                                    id={`quantity_${index}`}
                                    type="number"
                                    step="0.1"
                                    {...form.register(`parts.${index}.quantity`)}
                                    placeholder="1"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`unit_cost_${index}`} className="text-xs">Unit Cost ($)</Label>
                                  <Input
                                    id={`unit_cost_${index}`}
                                    type="number"
                                    step="0.01"
                                    {...form.register(`parts.${index}.unit_cost`)}
                                    placeholder="0.00"
                                    className="text-sm"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <Label htmlFor={`supplier_${index}`} className="text-xs">Supplier</Label>
                                  <Input
                                    id={`supplier_${index}`}
                                    {...form.register(`parts.${index}.supplier`)}
                                    placeholder="Supplier name"
                                    className="text-sm"
                                  />
                                </div>
                              </div>

                              {partFields.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removePart(index)}
                                  className="text-xs px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-medium"
                                >
                                  Remove Part
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="notes">Additional Notes</Label>
                        <textarea
                          id="notes"
                          {...form.register('notes')}
                          rows={2}
                          className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="Any additional observations or instructions…"
                        />
                      </div>
                    </div>
                  )}

                  {/* ── Service history ── */}
                  {activeTab === 'history' && (
                    <div className="p-5 space-y-3">
                      {DEMO_HISTORY.length === 0 ? (
                        <div className="text-center py-10">
                          <Wrench className="mx-auto w-10 h-10 text-slate-300 mb-2" />
                          <p className="text-sm text-slate-500">No maintenance history yet</p>
                        </div>
                      ) : (
                        DEMO_HISTORY.map(h => (
                          <div key={h.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`${TYPE_META[h.maintenance_type]?.color || 'bg-slate-100 text-slate-600'} border-none text-xs font-semibold`}>
                                  {TYPE_META[h.maintenance_type]?.label || h.maintenance_type}
                                </Badge>
                                <Badge className={`${PRIORITY_META[h.priority as keyof typeof PRIORITY_META]?.color || ''} border-none text-xs`}>
                                  {PRIORITY_META[h.priority as keyof typeof PRIORITY_META]?.label || h.priority}
                                </Badge>
                              </div>
                              <span className="text-xs text-slate-400">{new Date(h.maintenance_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800">{h.description}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                              {h.performed_by && (
                                <span className="flex items-center gap-1"><User className="w-3 h-3" />{h.performed_by}</span>
                              )}
                              {h.labor_hours && (
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{h.labor_hours}h labour</span>
                              )}
                              {h.cost && (
                                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                  <DollarSign className="w-3 h-3" />${h.cost.toLocaleString()}
                                </span>
                              )}
                              {h.parts_used && (
                                <span className="flex items-center gap-1"><Package className="w-3 h-3" />{h.parts_used}</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50 rounded-b-2xl">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          {activeTab === 'new' && selectedEquipment && (
            <Button onClick={form.handleSubmit(handleSubmit)} disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? <LoadingSpinner size="sm" /> : (
                <><CheckCircle className="w-4 h-4 mr-1.5" />Save Work Order</>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}