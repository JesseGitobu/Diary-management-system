'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { User, Search, AlertCircle } from 'lucide-react'
import { Modal, Field, Input, Select, Textarea } from './shared'

// Zod schema for form validation
const assignmentSchema = z.object({
  equipment_id: z.string().min(1, 'Equipment selection is required'),
  staff_id: z.string().min(1, 'Staff member selection is required'),
  worker_name: z.string().optional(),
  role: z.string().refine(
    (val) => val === '' || ['driver', 'technician', 'farm_worker', 'supervisor'].includes(val),
    { message: 'Please select a valid role' }
  ),
  certification_required: z.string().optional(),
  date_out: z.string().min(1, 'Assignment date and time is required'),
  expected_return: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.staff_id,
  {
    message: 'Staff member selection is required',
    path: ['staff_id'],
  }
).refine(
  (data) => data.staff_id && data.role && ['driver', 'technician', 'farm_worker', 'supervisor'].includes(data.role),
  {
    message: 'Please select a valid role',
    path: ['role'],
  }
)

type AssignmentFormData = z.infer<typeof assignmentSchema>

interface Worker {
  id: string
  name: string
  position?: string
  role?: string
}

interface Equipment {
  id: string
  name: string
  asset_id: string
}

export function AssignEquipmentModal({ 
  open, 
  onClose, 
  equipment: initialEquipment,
  onAssign 
}: { 
  open: boolean
  onClose: () => void
  equipment?: Equipment
  onAssign?: (data: AssignmentFormData) => Promise<void>
}) {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [loading, setLoading] = useState(false)
  const [equipmentSearchOpen, setEquipmentSearchOpen] = useState(false)
  const [workerSearchOpen, setWorkerSearchOpen] = useState(false)
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [workerSearch, setWorkerSearch] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      equipment_id: initialEquipment?.id || '',
      staff_id: '',
      worker_name: '', // Internal tracking only
      role: '',
      certification_required: '',
      date_out: new Date().toISOString().slice(0, 16), // datetime-local format: YYYY-MM-DDTHH:mm
      expected_return: '',
      notes: '',
    },
  })

  const selectedEquipmentId = watch('equipment_id')
  const selectedStaffId = watch('staff_id')
  const selectedEquipment = equipmentList.find(e => e.id === selectedEquipmentId)

  // Fetch equipment list
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const res = await fetch('/api/equipment')
        if (res.ok) {
          const data = await res.json()
          setEquipmentList(Array.isArray(data) ? data : data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch equipment:', error)
      }
    }

    if (open) {
      fetchEquipment()
    }
  }, [open])

  // Fetch workers list
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const res = await fetch('/api/workers')
        if (res.ok) {
          const data = await res.json()
          setWorkers(Array.isArray(data) ? data : data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch workers:', error)
      }
    }

    if (open) {
      fetchWorkers()
    }
  }, [open])

  // Auto-fill role when worker is selected
  useEffect(() => {
    if (selectedStaffId && selectedWorker) {
      setValue('role', selectedWorker.position || selectedWorker.role || '')
    }
  }, [selectedStaffId, selectedWorker, setValue])

  const handleWorkerSelect = (worker: Worker) => {
    setSelectedWorker(worker)
    setValue('staff_id', worker.id)
    setValue('worker_name', worker.name)
    setValue('role', worker.position || worker.role || '')
    setWorkerSearchOpen(false)
  }

  const filteredEquipment = equipmentList.filter(e =>
    e.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
    e.asset_id.toLowerCase().includes(equipmentSearch.toLowerCase())
  )

  const filteredWorkers = workers.filter(w =>
    w.name.toLowerCase().includes(workerSearch.toLowerCase())
  )

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-dropdown="equipment"]') && !target.closest('[data-dropdown="worker"]')) {
        setEquipmentSearchOpen(false)
        setWorkerSearchOpen(false)
      }
    }

    if (equipmentSearchOpen || workerSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [equipmentSearchOpen, workerSearchOpen])

  const onSubmit = async (data: AssignmentFormData) => {
    setLoading(true)
    try {
      // Convert datetime-local format to ISO 8601 timestamp
      const dateOutISO = data.date_out ? new Date(data.date_out).toISOString() : null
      const expectedReturnISO = data.expected_return ? new Date(data.expected_return).toISOString() : null

      if (!dateOutISO) {
        throw new Error('Assignment date and time is required')
      }

      const response = await fetch('/api/equipment-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_id: data.equipment_id,
          staff_id: data.staff_id,
          role: data.role,
          certification_required: data.certification_required || null,
          date_out: dateOutISO,
          expected_return: expectedReturnISO,
          notes: data.notes || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create assignment')
      }

      const result = await response.json()
      console.log('✅ Assignment created:', result.assignment)
      
      // Call the onAssign callback if provided
      if (onAssign) {
        await onAssign(data)
      }
      
      onClose()
    } catch (error) {
      console.error('❌ Assignment failed:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="Assign Equipment" 
      icon={User} 
      accentColor="blue"
      footer={
        <div className="flex gap-2 justify-end">
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white" 
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Assignment'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Equipment Selection */}
        <div data-dropdown="equipment" className="relative">
          <Field label="Equipment *" required>
            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search equipment by name or asset ID…"
                    value={equipmentSearch}
                    onChange={(e) => setEquipmentSearch(e.target.value)}
                    onFocus={() => setEquipmentSearchOpen(true)}
                    onClick={() => setEquipmentSearchOpen(true)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Equipment Dropdown */}
              {equipmentSearchOpen && equipmentList.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {filteredEquipment.length > 0 ? (
                    filteredEquipment.map((eq) => (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => {
                          setValue('equipment_id', eq.id)
                          setEquipmentSearch('')
                          setEquipmentSearchOpen(false)
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                          selectedEquipmentId === eq.id ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="font-medium text-slate-900">{eq.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{eq.asset_id}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      No equipment found matching "{equipmentSearch}"
                    </div>
                  )}
                </div>
              )}

              {equipmentSearchOpen && equipmentList.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 px-4 py-8 text-center text-sm text-slate-500">
                  Loading equipment…
                </div>
              )}
            </div>

            {/* Selected Equipment Display */}
            {selectedEquipment && (
              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm">
                <div className="font-medium text-blue-900">{selectedEquipment.name}</div>
                <div className="text-xs text-blue-600 font-mono">{selectedEquipment.asset_id}</div>
              </div>
            )}

            {errors.equipment_id && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.equipment_id.message}
              </p>
            )}
          </Field>
        </div>

        {/* Worker Selection */}
        <div data-dropdown="worker" className="relative">
          <Field label="Operator / Staff *" required>
            <div className="relative">
              <input
                type="text"
                placeholder="Search workers…"
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                onFocus={() => setWorkerSearchOpen(true)}
                onClick={() => setWorkerSearchOpen(true)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Workers Dropdown */}
            {workerSearchOpen && workers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {filteredWorkers.length > 0 ? (
                  filteredWorkers.map((worker) => (
                    <button
                      key={worker.id}
                      type="button"
                      onClick={() => handleWorkerSelect(worker)}
                      className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                        selectedStaffId === worker.id ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="font-medium text-slate-900">{worker.name}</div>
                      <div className="text-xs text-slate-500">
                        {worker.position || worker.role || 'No role specified'}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">
                    No workers found matching "{workerSearch}"
                  </div>
                )}
              </div>
            )}

            {workerSearchOpen && workers.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 px-4 py-8 text-center text-sm text-slate-500">
                Loading workers…
              </div>
            )}

            {/* Selected Worker Display */}
            {selectedWorker && (
              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm">
                <div className="font-medium text-blue-900">{selectedWorker.name}</div>
                <div className="text-xs text-blue-600">
                  {selectedWorker.position || selectedWorker.role || 'Worker'}
                </div>
              </div>
            )}

            {errors.staff_id && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.staff_id.message}
              </p>
            )}
          </Field>
        </div>

        {/* Role Field */}
        <Field label="Role">
          <Select {...register('role')}>
            <option value="">Select role…</option>
            <option value="driver">Driver</option>
            <option value="technician">Technician</option>
            <option value="farm_worker">Farm Worker</option>
            <option value="supervisor">Supervisor</option>
          </Select>
          <p className="text-xs text-slate-500 mt-1">
            Auto-filled when selecting a worker from the list
          </p>
        </Field>

        {/* Certification Field */}
        <Field label="Certification / Qualification Required">
          <Input
            placeholder="e.g. Heavy Machinery License"
            {...register('certification_required')}
          />
          <p className="text-xs text-slate-500 mt-1">Optional</p>
        </Field>

        {/* Date & Time Fields */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assignment Date & Time *" required>
            <Input type="datetime-local" {...register('date_out')} />
            {errors.date_out && (
              <p className="text-xs text-rose-500 mt-1">{errors.date_out.message}</p>
            )}
          </Field>
          <Field label="Expected Return Date & Time">
            <Input type="datetime-local" {...register('expected_return')} />
            <p className="text-xs text-slate-500 mt-1">Optional</p>
          </Field>
        </div>

        {/* Notes Field */}
        <Field label="Notes">
          <Textarea
            placeholder="Additional assignment notes…"
            {...register('notes')}
            rows={3}
          />
          <p className="text-xs text-slate-500 mt-1">Optional</p>
        </Field>
      </div>
    </Modal>
  )
}
