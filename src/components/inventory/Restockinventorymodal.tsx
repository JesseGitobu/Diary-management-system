'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  X, Package, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  AlertTriangle, CheckCircle2, Loader2, Truck, ClipboardEdit
} from 'lucide-react'

interface RestockInventoryModalProps {
  isOpen: boolean
  onClose: () => void
  onStockUpdated: (itemId: string, newStock: number) => void
  item: {
    id: string
    name: string
    category: string
    current_stock: number
    minimum_stock: number
    unit_of_measure: string
    cost_per_unit?: number
    supplier?: string
  } | null
}

type MovementType = 'purchase' | 'usage' | 'adjustment' | 'transfer' | 'loss'

const MOVEMENT_TYPES: {
  value: MovementType
  label: string
  description: string
  icon: any
  color: string
  bgColor: string
  direction: 'in' | 'out' | 'neutral'
}[] = [
  {
    value: 'purchase',
    label: 'Purchase / Restock',
    description: 'Received new stock from supplier',
    icon: Truck,
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-300',
    direction: 'in',
  },
  {
    value: 'usage',
    label: 'Record Usage',
    description: 'Stock consumed — feeding, treatment, routine',
    icon: ArrowDownCircle,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-300',
    direction: 'out',
  },
  {
    value: 'adjustment',
    label: 'Stock Adjustment',
    description: 'Correct stock count after physical count',
    icon: RefreshCw,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-300',
    direction: 'neutral',
  },
  {
    value: 'transfer',
    label: 'Transfer',
    description: 'Move stock between storage locations',
    icon: ArrowUpCircle,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-300',
    direction: 'in',
  },
  {
    value: 'loss',
    label: 'Record Loss / Waste',
    description: 'Spillage, spoilage, theft or expiry',
    icon: X,
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-300',
    direction: 'out',
  },
]

const USAGE_TYPES = ['Feeding', 'Treatment', 'Breeding', 'Routine', 'Other']
const LOSS_REASONS = ['Spillage', 'Spoilage', 'Expired', 'Theft', 'Damaged', 'Other']

export function RestockInventoryModal({
  isOpen,
  onClose,
  onStockUpdated,
  item,
}: RestockInventoryModalProps) {
  const [movementType, setMovementType] = useState<MovementType>('purchase')
  const [quantity, setQuantity]         = useState('')
  const [newTotal, setNewTotal]         = useState('')
  const [inputMode, setInputMode]       = useState<'delta' | 'absolute'>('delta')
  const [batchNumber, setBatchNumber]   = useState('')
  const [expiryDate, setExpiryDate]     = useState('')
  const [supplier, setSupplier]         = useState(item?.supplier || '')
  const [referenceId, setReferenceId]   = useState('')
  const [notes, setNotes]               = useState('')
  const [performedBy, setPerformedBy]   = useState('')
  const [usageType, setUsageType]       = useState('')
  const [lossReason, setLossReason]     = useState('')
  const [animalGroup, setAnimalGroup]   = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(false)

  if (!isOpen || !item) return null

  const selected = MOVEMENT_TYPES.find(m => m.value === movementType)!

  const computedNewStock = (() => {
    if (inputMode === 'absolute') return Number(newTotal) || item.current_stock
    const qty = Number(quantity) || 0
    if (movementType === 'adjustment') return item.current_stock + qty // sign from user
    return selected.direction === 'in'
      ? item.current_stock + qty
      : item.current_stock - qty
  })()

  const stockDelta   = computedNewStock - item.current_stock
  const isLowAfter   = computedNewStock < item.minimum_stock
  const isNegative   = computedNewStock < 0

  const handleSubmit = async () => {
    setError('')
    
    // Validate quantity
    const qty = Number(inputMode === 'delta' ? quantity : Math.abs(stockDelta))
    if (!quantity && !newTotal) { 
      setError('Enter a quantity or new total stock')
      return 
    }
    if (isNaN(qty) || qty <= 0) { 
      setError('Enter a valid quantity greater than 0')
      return 
    }
    if (isNegative) { 
      setError('Stock cannot go negative')
      return 
    }

    // Validate movement-specific fields
    if (movementType === 'purchase' && !supplier?.trim()) {
      setError('Supplier name is required for purchases')
      return
    }
    if (movementType === 'usage' && !usageType?.trim()) {
      setError('Usage type is required')
      return
    }
    if (movementType === 'loss' && !lossReason?.trim()) {
      setError('Loss reason is required')
      return
    }

    if (!performedBy?.trim()) {
      setError('Staff name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        inventory_item_id: item.id,
        movement_type: movementType,
        quantity_change: selected.direction === 'out' ? -qty : qty,
        stock_before: item.current_stock,
        stock_after: computedNewStock,
        batch_number: batchNumber?.trim() || undefined,
        expiry_date: expiryDate || undefined,
        supplier: supplier?.trim() || undefined,
        reference_id: referenceId?.trim() || undefined,
        notes: notes?.trim() || undefined,
        performed_by: performedBy?.trim() || undefined,
        usage_type: usageType?.trim() || undefined,
        loss_reason: lossReason?.trim() || undefined,
        animal_group_id: animalGroup?.trim() || undefined,
      }

      const res = await fetch('/api/inventory/adjust-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        onStockUpdated(item.id, data.newStock ?? computedNewStock)
        setSuccess(true)
        setTimeout(() => { setSuccess(false); handleClose() }, 1200)
      } else {
        setError(data.error || 'Failed to record stock movement')
      }
    } catch (err) {
      console.error('Error recording stock movement:', err)
      setError('Network error — please try again')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setMovementType('purchase'); setQuantity(''); setNewTotal(''); setInputMode('delta')
    setBatchNumber(''); setExpiryDate(''); setSupplier(item?.supplier || '')
    setReferenceId(''); setNotes(''); setPerformedBy(''); setUsageType('')
    setLossReason(''); setAnimalGroup(''); setError(''); setSuccess(false)
    onClose()
  }

  const isLow = item.current_stock < item.minimum_stock

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Stock Movement</h2>
              <p className="text-xs text-gray-500 truncate max-w-[220px]">{item.name}</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current stock status banner */}
        <div className={`px-6 py-3 border-b shrink-0 flex items-center justify-between ${isLow ? 'bg-orange-50' : 'bg-gray-50'}`}>
          <div>
            <p className="text-xs text-gray-500">Current Stock</p>
            <p className={`text-2xl font-bold ${isLow ? 'text-orange-600' : 'text-gray-900'}`}>
              {item.current_stock} <span className="text-sm font-normal text-gray-500">{item.unit_of_measure}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Minimum</p>
            <p className="text-sm font-medium text-gray-700">{item.minimum_stock} {item.unit_of_measure}</p>
          </div>
          {isLow && (
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full ml-2">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
              <span className="text-xs text-orange-700 font-medium">Low Stock</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Movement Type */}
          <div>
            <Label className="text-sm font-medium">Movement Type</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {MOVEMENT_TYPES.map(mt => (
                <button
                  key={mt.value}
                  type="button"
                  onClick={() => setMovementType(mt.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    movementType === mt.value ? mt.bgColor + ' border-2' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <mt.icon className={`h-5 w-5 shrink-0 ${movementType === mt.value ? mt.color : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-sm font-medium ${movementType === mt.value ? mt.color : 'text-gray-700'}`}>{mt.label}</p>
                    <p className="text-xs text-gray-500">{mt.description}</p>
                  </div>
                  <div className={`ml-auto w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${movementType === mt.value ? 'border-current bg-current' : 'border-gray-300'}`}>
                    {movementType === mt.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity / Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Quantity</Label>
              {movementType === 'adjustment' && (
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  <button onClick={() => setInputMode('delta')}    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${inputMode === 'delta'    ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>+/− Change</button>
                  <button onClick={() => setInputMode('absolute')} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${inputMode === 'absolute' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Set Total</button>
                </div>
              )}
            </div>

            {inputMode === 'delta' ? (
              <div className="relative">
                <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold ${selected.direction === 'out' ? 'text-red-500' : 'text-green-500'}`}>
                  {selected.direction === 'out' ? '−' : '+'}
                </div>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={`Quantity in ${item.unit_of_measure}`}
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="pl-8"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{item.unit_of_measure}</div>
              </div>
            ) : (
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="New total stock"
                  value={newTotal}
                  onChange={e => setNewTotal(e.target.value)}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{item.unit_of_measure}</div>
              </div>
            )}
          </div>

          {/* New stock preview */}
          {(quantity || newTotal) && (
            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              isNegative ? 'bg-red-50 border-red-200' :
              isLowAfter ? 'bg-orange-50 border-orange-200' :
              'bg-green-50 border-green-200'
            }`}>
              <div>
                <p className="text-xs text-gray-500">New Stock Level</p>
                <p className={`text-xl font-bold ${isNegative ? 'text-red-700' : isLowAfter ? 'text-orange-700' : 'text-green-700'}`}>
                  {computedNewStock.toFixed(2)} {item.unit_of_measure}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Change</p>
                <p className={`text-sm font-semibold ${stockDelta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {stockDelta >= 0 ? '+' : ''}{stockDelta.toFixed(2)} {item.unit_of_measure}
                </p>
              </div>
            </div>
          )}

          {/* Contextual fields */}
          {movementType === 'purchase' && (
            <div className="space-y-3 pt-1 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Purchase Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Supplier</Label>
                  <Input placeholder="Supplier name" value={supplier} onChange={e => setSupplier(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium">PO / Reference</Label>
                  <Input placeholder="e.g. PO-2026-042" value={referenceId} onChange={e => setReferenceId(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Batch / Lot #</Label>
                  <Input placeholder="Optional" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Expiry Date</Label>
                  <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>
          )}

          {movementType === 'usage' && (
            <div className="space-y-3 pt-1 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Usage Details</p>
              <div>
                <Label className="text-sm font-medium">Usage Type</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {USAGE_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setUsageType(t)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        usageType === t ? 'border-blue-400 bg-blue-100 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Animal / Group</Label>
                <Input placeholder="e.g. Lactating Herd (52 cows)" value={animalGroup} onChange={e => setAnimalGroup(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Record Reference</Label>
                <Input placeholder="e.g. FR-2026-0418" value={referenceId} onChange={e => setReferenceId(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}

          {movementType === 'loss' && (
            <div className="space-y-3 pt-1 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Loss Details</p>
              <div>
                <Label className="text-sm font-medium">Reason</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {LOSS_REASONS.map(r => (
                    <button key={r} type="button" onClick={() => setLossReason(r)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        lossReason === r ? 'border-red-400 bg-red-100 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >{r}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {movementType === 'adjustment' && (
            <div className="space-y-3 pt-1 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adjustment Details</p>
              <div>
                <Label className="text-sm font-medium">Reference / Count Sheet</Label>
                <Input placeholder="e.g. SC-2026-0420" value={referenceId} onChange={e => setReferenceId(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}

          {/* Common fields */}
          <div className="space-y-3 pt-1 border-t">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium flex items-center gap-1"><ClipboardEdit className="h-3.5 w-3.5 text-gray-400" />Performed By</Label>
                <Input placeholder="Staff name" value={performedBy} onChange={e => setPerformedBy(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Date</Label>
                <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <textarea
                placeholder="Any relevant observations..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                rows={2}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-2xl shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || success}
            className={success ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {success ? (
              <><CheckCircle2 className="h-4 w-4 mr-2" />Saved!</>
            ) : isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
            ) : (
              <>Record Movement</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}