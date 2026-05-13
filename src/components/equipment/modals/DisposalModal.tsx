'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Trash2, Search, CheckCircle } from 'lucide-react'
import { Modal, Field, Input, Select, Textarea } from './shared'

interface Equipment {
  id: string
  name: string
  asset_id: string
  status: string
}

export function DisposalModal({ 
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
  const [form, setForm] = useState({ method: '', saleValue: '', disposalDate: '', buyer: '', reason: '', confirm: false, equipmentId: equipment?.id || '' })
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
      setForm({ method: '', saleValue: '', disposalDate: '', buyer: '', reason: '', confirm: false, equipmentId: equipment?.id || '' })
      setErrors({})
      setSearchQuery('')
      setIsDropdownOpen(false)
      setSuccessMessage('')
    }
  }, [open, equipment?.id])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: 'checked' in (e.target as HTMLInputElement) && (e.target as HTMLInputElement).type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

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

    if (!form.method.trim()) {
      newErrors.method = 'Disposal method is required'
    }

    if (!form.disposalDate) {
      newErrors.disposalDate = 'Disposal date is required'
    }

    if (!form.reason.trim()) {
      newErrors.reason = 'Reason for disposal is required'
    } else if (form.reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters'
    }

    if (!form.confirm) {
      newErrors.confirm = 'You must confirm the disposal'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSuccessMessage('')

    try {
      const response = await fetch('/api/equipment/disposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          equipmentId: form.equipmentId,
          farmId,
          method: form.method,
          saleValue: form.saleValue ? parseFloat(form.saleValue) : null,
          disposalDate: form.disposalDate,
          buyer: form.buyer || null,
          reason: form.reason,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ [Client] Error creating disposal record:', result.error)
        setErrors({ submit: result.error || 'Failed to record disposal' })
        return
      }

      console.log('✅ [Client] Disposal recorded:', result.data?.id)
      setSuccessMessage('Equipment disposal recorded successfully!')

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
    <Modal open={open} onClose={onClose} title="Dispose / Retire Asset" icon={Trash2} accentColor="rose"
      footer={
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button 
            size="sm" 
            className="bg-rose-600 hover:bg-rose-700 text-white" 
            onClick={handleSubmit}
            disabled={!form.confirm || isSubmitting}
          >
            {isSubmitting ? 'Recording Disposal...' : 'Confirm Disposal'}
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

      <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-800">
        <strong>Warning:</strong> This will permanently remove <em>{selectedEquipment?.name || equipment?.name}</em> from your active fleet.
      </div>
      
      <Field label="Equipment" required error={errors.equipmentId}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500 ${errors.equipmentId ? 'border-red-300' : 'border-slate-300'}`}
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
      
      <Field label="Disposal Method" required error={errors.method}>
        <Select value={form.method} onChange={set('method')} disabled={isSubmitting}>
          <option value="">Select method…</option>
          <option value="Sold">Sold</option>
          <option value="Scrapped">Scrapped</option>
          <option value="Donated">Donated</option>
          <option value="Traded-In">Traded-In</option>
          <option value="Lost / Stolen">Lost / Stolen</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sale / Scrap Value ($)"><Input type="number" placeholder="0" value={form.saleValue} onChange={set('saleValue')} disabled={isSubmitting} /></Field>
        <Field label="Disposal Date" required error={errors.disposalDate}><Input type="date" value={form.disposalDate} onChange={set('disposalDate')} disabled={isSubmitting} /></Field>
      </div>
      <Field label="Buyer / Recipient"><Input placeholder="Name or company (if sold/donated)" value={form.buyer} onChange={set('buyer')} disabled={isSubmitting} /></Field>
      <Field label="Reason for Disposal" required error={errors.reason}><Textarea placeholder="Explain why the asset is being retired…" value={form.reason} onChange={set('reason')} disabled={isSubmitting} /></Field>
      <label className={`flex items-center gap-2.5 cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <input 
          type="checkbox" 
          className="w-4 h-4 rounded accent-rose-600" 
          checked={form.confirm} 
          onChange={set('confirm')}
          disabled={isSubmitting}
        />
        <span className="text-sm text-slate-700 font-medium">I confirm this asset should be permanently retired</span>
      </label>
      {errors.confirm && <p className="text-xs text-red-600 mt-1">{errors.confirm}</p>}
    </Modal>
  )
}
