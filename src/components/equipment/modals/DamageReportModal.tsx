'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, Search, X, CheckCircle } from 'lucide-react'
import { Modal, Field, Input, Select, Textarea } from './shared'

interface Equipment {
  id: string
  name: string
  asset_id: string
  status: string
}

export function DamageReportModal({ 
  open, 
  onClose, 
  equipment,
  farmId 
}: { 
  open: boolean
  onClose: () => void
  equipment: any
  farmId: string
}) {
  const [form, setForm] = useState({ 
    equipmentId: equipment?.id || '', 
    description: '', 
    urgency: '', 
    discoveredBy: '', 
    discoveredDate: '', 
    workOrder: false, 
    notes: '' 
  })
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  // Fetch equipment list
  useEffect(() => {
    if (!open || !farmId) return

    const fetchEquipment = async () => {
      setIsLoading(true)
      try {
        const query = searchQuery ? `?farm_id=${farmId}&search=${encodeURIComponent(searchQuery)}` : `?farm_id=${farmId}`
        const response = await fetch(`/api/equipment/list${query}`)
        const result = await response.json()
        if (result.success) {
          setEquipmentList(result.data)
        }
      } catch (error) {
        console.error('Error fetching equipment:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const debounceTimer = setTimeout(fetchEquipment, 300)
    return () => clearTimeout(debounceTimer)
  }, [open, farmId, searchQuery])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setForm({ 
        equipmentId: equipment?.id || '', 
        description: '', 
        urgency: '', 
        discoveredBy: '', 
        discoveredDate: '', 
        workOrder: false, 
        notes: '' 
      })
      setErrors({})
      setSuccessMessage('')
      setSearchQuery('')
      setIsDropdownOpen(false)
    }
  }, [open, equipment?.id])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: (e.target as HTMLInputElement).type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const selectedEquipment = equipmentList.find(eq => eq.id === form.equipmentId)

  const handleEquipmentSelect = (equipmentId: string) => {
    setForm(f => ({ ...f, equipmentId }))
    setIsDropdownOpen(false)
    setSearchQuery('')
    setErrors(e => ({ ...e, equipmentId: '' }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!form.equipmentId.trim()) {
      newErrors.equipmentId = 'Equipment is required'
    }

    if (!form.description.trim()) {
      newErrors.description = 'Damage description is required'
    } else if (form.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters'
    }

    if (!form.urgency) {
      newErrors.urgency = 'Urgency level is required'
    }

    if (!form.discoveredDate) {
      newErrors.discoveredDate = 'Date discovered is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      console.log('Validation failed')
      return
    }

    setIsSubmitting(true)
    setSuccessMessage('')

    try {
      const response = await fetch('/api/damage-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          equipmentId: form.equipmentId,
          farmId,
          description: form.description,
          urgency: form.urgency,
          discoveredDate: form.discoveredDate,
          discoveredBy: form.discoveredBy || null,
          createWorkOrder: form.workOrder,
          notes: form.notes || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ [Client] Error creating damage report:', result.error)
        setErrors({ submit: result.error || 'Failed to create damage report' })
        return
      }

      console.log('✅ [Client] Damage report created:', result.data?.id)
      setSuccessMessage('Damage report submitted successfully!')

      // Close modal after short delay
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('❌ [Client] Unexpected error:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Damage Report" icon={AlertTriangle} accentColor="rose"
      footer={
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button 
            size="sm" 
            className="bg-rose-600 hover:bg-rose-700 text-white" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      }>
      
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-700">{successMessage}</span>
        </div>
      )}

      {/* Submit Error */}
      {errors.submit && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{errors.submit}</p>
        </div>
      )}
      
      {/* Equipment Selection */}
      <Field label="Equipment" required error={errors.equipmentId}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500 ${errors.equipmentId ? 'border-red-300' : 'border-slate-300'}`}
            disabled={isSubmitting}
          >
            <span className={selectedEquipment ? 'text-slate-900' : 'text-slate-500'}>
              {selectedEquipment ? `${selectedEquipment.name} (${selectedEquipment.asset_id})` : 'Select equipment…'}
            </span>
            <Search className="w-4 h-4 text-slate-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-50">
              <div className="p-2 border-b border-slate-200">
                <input
                  type="text"
                  placeholder="Search equipment…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {isLoading ? (
                  <div className="px-4 py-3 text-sm text-slate-500">Loading…</div>
                ) : equipmentList.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500">No equipment found</div>
                ) : (
                  equipmentList.map((eq) => (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => handleEquipmentSelect(eq.id)}
                      className="w-full px-4 py-2 text-left hover:bg-rose-50 focus:bg-rose-50 focus:outline-none border-b border-slate-100 last:border-b-0"
                      disabled={isSubmitting}
                    >
                      <div className="font-medium text-slate-900">{eq.name}</div>
                      <div className="text-xs text-slate-500">{eq.asset_id}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </Field>

      <Field label="Damage Description" required error={errors.description}>
        <Textarea 
          placeholder="Describe the damage or issue in detail…" 
          value={form.description} 
          onChange={set('description')}
          disabled={isSubmitting}
        />
      </Field>
      
      <Field label="Urgency Level" required error={errors.urgency}>
        <Select 
          value={form.urgency} 
          onChange={set('urgency')}
          disabled={isSubmitting}
        >
          <option value="">Select urgency…</option>
          <option value="low">Low — Monitor only</option>
          <option value="medium">Medium — Schedule repair soon</option>
          <option value="high">High — Repair within 48h</option>
          <option value="critical">Critical — Take out of service immediately</option>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Discovered By">
          <Input 
            placeholder="Staff name" 
            value={form.discoveredBy} 
            onChange={set('discoveredBy')}
            disabled={isSubmitting}
          />
        </Field>
        <Field label="Date Discovered" required error={errors.discoveredDate}>
          <Input 
            type="date" 
            value={form.discoveredDate} 
            onChange={set('discoveredDate')}
            disabled={isSubmitting}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input 
          type="checkbox" 
          className="w-4 h-4 rounded accent-rose-600" 
          checked={form.workOrder} 
          onChange={set('workOrder')}
          disabled={isSubmitting}
        />
        <span className="text-sm text-slate-700 font-medium">Automatically create a work order for this damage</span>
      </label>

      <Field label="Additional Notes">
        <Textarea 
          placeholder="Any additional context…" 
          value={form.notes} 
          onChange={set('notes')}
          disabled={isSubmitting}
        />
      </Field>
    </Modal>
  )
}