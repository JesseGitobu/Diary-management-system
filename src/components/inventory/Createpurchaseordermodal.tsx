'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  X, ShoppingCart, Plus, Trash2, AlertTriangle, CheckCircle2,
  Loader2, Building2, Calendar, Package, ChevronDown, Search
} from 'lucide-react'

interface POLineItem {
  id:         string
  name:       string
  quantity:   string
  unit:       string
  unit_price: string
}

interface CreatePurchaseOrderModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onPOCreated: (po: any) => void
  suppliers?: { id: string; name: string; contact_person?: string; payment_terms?: string }[]
  inventoryItems?: { id: string; name: string; unit_of_measure: string; cost_per_unit?: number; supplier?: string }[]
}

const DELIVERY_TERMS = ['Ex Works', 'FOB Nairobi', 'CIF Farm Gate', 'Delivered Duty Paid']
const PAYMENT_TERMS  = ['Cash on Delivery', 'Net 7', 'Net 14', 'Net 30', 'Net 45', 'Prepaid', '50% Advance']

function generatePONumber() {
  const now  = new Date()
  const year = now.getFullYear()
  const seq  = Math.floor(Math.random() * 900) + 100
  return `PO-${year}-${seq}`
}

function uid() {
  return Math.random().toString(36).slice(2, 8)
}

export function CreatePurchaseOrderModal({
  farmId,
  isOpen,
  onClose,
  onPOCreated,
  suppliers        = [],
  inventoryItems   = [],
}: CreatePurchaseOrderModalProps) {
  const [poNumber]         = useState(generatePONumber())
  const [supplierId, setSupplierId]             = useState('')
  const [supplierName, setSupplierName]         = useState('')
  const [supplierContact, setSupplierContact]   = useState('')
  const [orderDate, setOrderDate]               = useState(new Date().toISOString().split('T')[0])
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [paymentTerms, setPaymentTerms]         = useState('')
  const [deliveryTerms, setDeliveryTerms]       = useState('')
  const [deliveryAddress, setDeliveryAddress]   = useState('')
  const [notes, setNotes]                       = useState('')
  const [items, setItems] = useState<POLineItem[]>([{ id: uid(), name: '', quantity: '', unit: 'kg', unit_price: '' }])
  const [isSubmitting, setIsSubmitting]         = useState(false)
  const [errors, setErrors]                     = useState<Record<string, string>>({})
  const [success, setSuccess]                   = useState(false)
  const [itemSearch, setItemSearch]             = useState<Record<string, string>>({})
  const [showItemDropdown, setShowItemDropdown] = useState<Record<string, boolean>>({})

  if (!isOpen) return null

  const totalAmount = items.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  }, 0)

  const addLineItem = () => {
    setItems(prev => [...prev, { id: uid(), name: '', quantity: '', unit: 'kg', unit_price: '' }])
  }

  const removeLineItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const updateItem = (id: string, field: keyof POLineItem, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
    setErrors(e => ({ ...e, [`item_${id}_${field}`]: '' }))
  }

  const selectInventoryItem = (lineId: string, inv: { name: string; unit_of_measure: string; cost_per_unit?: number }) => {
    setItems(prev => prev.map(i => i.id === lineId ? {
      ...i,
      name:       inv.name,
      unit:       inv.unit_of_measure,
      unit_price: inv.cost_per_unit ? String(inv.cost_per_unit) : i.unit_price,
    } : i))
    setItemSearch(s => ({ ...s, [lineId]: '' }))
    setShowItemDropdown(d => ({ ...d, [lineId]: false }))
  }

  const selectSupplier = (sup: { id: string; name: string; contact_person?: string; payment_terms?: string }) => {
    setSupplierId(sup.id)
    setSupplierName(sup.name)
    setSupplierContact(sup.contact_person || '')
    if (sup.payment_terms) setPaymentTerms(sup.payment_terms)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!supplierName?.trim()) errs.supplier_name = 'Supplier name is required'
    if (!orderDate) errs.order_date = 'Order date is required'
    if (!expectedDelivery) errs.expected_delivery = 'Expected delivery date is required'
    if (items.length === 0) errs.items = 'At least one line item is required'

    items.forEach((item, idx) => {
      if (!item.name?.trim()) errs[`item_${idx}_name`] = 'Item name required'
      if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
        errs[`item_${idx}_quantity`] = 'Quantity must be > 0'
      }
      if (!item.unit?.trim()) errs[`item_${idx}_unit`] = 'Unit required'
      if (!item.unit_price || isNaN(Number(item.unit_price)) || Number(item.unit_price) < 0) {
        errs[`item_${idx}_unit_price`] = 'Price must be >= 0'
      }
    })

    // Verify total amount is positive
    if (totalAmount <= 0) errs.total_amount = 'Total must be > 0'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const payload = {
        po_number: poNumber,
        supplier_id: supplierId?.trim() || undefined,
        supplier_name: supplierName?.trim(),
        supplier_contact: supplierContact?.trim() || undefined,
        order_date: orderDate,
        expected_delivery: expectedDelivery,
        payment_terms: paymentTerms?.trim() || undefined,
        delivery_terms: deliveryTerms?.trim() || undefined,
        delivery_address: deliveryAddress?.trim() || undefined,
        notes: notes?.trim() || undefined,
        total_amount: totalAmount,
        items: items.map(i => ({
          name: i.name.trim(),
          quantity: Number(i.quantity),
          unit: i.unit.trim(),
          unit_price: Number(i.unit_price),
          total: Number(i.quantity) * Number(i.unit_price),
        })),
      }

      const res = await fetch('/api/inventory/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        onPOCreated(data.purchaseOrder)
        setSuccess(true)
        setTimeout(() => { setSuccess(false); handleClose() }, 1400)
      } else {
        setErrors(data.errors || { submit: data.error || 'Failed to create purchase order' })
      }
    } catch (err) {
      console.error('Error creating purchase order:', err)
      setErrors({ submit: 'Network error — please try again' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setErrors({})
    setSuccess(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Create Purchase Order</h2>
              <p className="text-xs font-mono text-gray-400">{poNumber}</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="h-5 w-5" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">

            {/* ── SUPPLIER ── */}
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                Supplier
              </h3>

              {suppliers.length > 0 && (
                <div className="mb-3">
                  <Label className="text-xs text-gray-500 mb-1 block">Select from existing suppliers</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {suppliers.map(sup => (
                      <button
                        key={sup.id}
                        type="button"
                        onClick={() => selectSupplier(sup)}
                        className={`px-3 py-2 rounded-lg border text-left text-xs font-medium transition-all ${
                          supplierId === sup.id
                            ? 'border-violet-400 bg-violet-50 text-violet-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {sup.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Or enter manually below</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Supplier Name <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g. Unga Feeds Ltd"
                    value={supplierName}
                    onChange={e => { setSupplierName(e.target.value); setSupplierId(''); setErrors(v => ({ ...v, supplier: '' })) }}
                    className="mt-1"
                  />
                  {errors.supplier && <p className="text-xs text-red-600 mt-1">{errors.supplier}</p>}
                </div>
                <div>
                  <Label className="text-sm font-medium">Contact Person</Label>
                  <Input placeholder="e.g. John Mwangi" value={supplierContact} onChange={e => setSupplierContact(e.target.value)} className="mt-1" />
                </div>
              </div>
            </section>

            {/* ── ORDER DETAILS ── */}
            <section className="border-t pt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                Order Details
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm font-medium">Order Date</Label>
                  <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Expected Delivery <span className="text-red-500">*</span></Label>
                  <Input type="date" value={expectedDelivery} onChange={e => { setExpectedDelivery(e.target.value); setErrors(v => ({ ...v, delivery: '' })) }} className="mt-1" />
                  {errors.delivery && <p className="text-xs text-red-600 mt-1">{errors.delivery}</p>}
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Terms</Label>
                  <div className="relative mt-1">
                    <select
                      value={paymentTerms}
                      onChange={e => setPaymentTerms(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none bg-white"
                    >
                      <option value="">Select…</option>
                      {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium">Delivery Address</Label>
                  <Input placeholder="Farm gate / delivery location" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Delivery Terms</Label>
                  <div className="relative mt-1">
                    <select
                      value={deliveryTerms}
                      onChange={e => setDeliveryTerms(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none bg-white"
                    >
                      <option value="">Select…</option>
                      {DELIVERY_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </section>

            {/* ── LINE ITEMS ── */}
            <section className="border-t pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  Line Items
                </h3>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-medium hover:bg-violet-100 transition-all border border-violet-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {/* Column headers */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-1">
                  <div className="col-span-5 text-xs font-medium text-gray-500">Item Name</div>
                  <div className="col-span-2 text-xs font-medium text-gray-500">Qty</div>
                  <div className="col-span-2 text-xs font-medium text-gray-500">Unit</div>
                  <div className="col-span-2 text-xs font-medium text-gray-500">Unit Price (KES)</div>
                  <div className="col-span-1" />
                </div>

                {items.map((item, idx) => {
                  const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
                  const filteredInv = inventoryItems.filter(inv =>
                    inv.name.toLowerCase().includes((itemSearch[item.id] || '').toLowerCase())
                  ).slice(0, 6)

                  return (
                    <div key={item.id} className="relative">
                      {/* Mobile label */}
                      <p className="text-xs text-gray-400 sm:hidden mb-1">Item {idx + 1}</p>

                      <div className="sm:grid sm:grid-cols-12 sm:gap-2 space-y-2 sm:space-y-0 p-3 sm:p-0 bg-gray-50 sm:bg-transparent rounded-xl sm:rounded-none border sm:border-0">
                        {/* Item name with inventory search */}
                        <div className="sm:col-span-5 relative">
                          <div className="relative">
                            {inventoryItems.length > 0 && (
                              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                            )}
                            <Input
                              placeholder="Item name"
                              value={itemSearch[item.id] !== undefined ? itemSearch[item.id] : item.name}
                              onChange={e => {
                                setItemSearch(s => ({ ...s, [item.id]: e.target.value }))
                                updateItem(item.id, 'name', e.target.value)
                                setShowItemDropdown(d => ({ ...d, [item.id]: e.target.value.length > 0 }))
                              }}
                              onFocus={() => inventoryItems.length > 0 && setShowItemDropdown(d => ({ ...d, [item.id]: true }))}
                              onBlur={() => setTimeout(() => setShowItemDropdown(d => ({ ...d, [item.id]: false })), 200)}
                              className={`${inventoryItems.length > 0 ? 'pl-8' : ''} text-sm ${errors[`item_${item.id}_name`] ? 'border-red-400' : ''}`}
                            />
                          </div>
                          {/* Inventory dropdown */}
                          {showItemDropdown[item.id] && filteredInv.length > 0 && (
                            <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                              {filteredInv.map(inv => (
                                <button
                                  key={inv.id}
                                  type="button"
                                  onMouseDown={() => selectInventoryItem(item.id, inv)}
                                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 text-left"
                                >
                                  <span className="font-medium text-gray-900 truncate">{inv.name}</span>
                                  <span className="text-xs text-gray-400 ml-2 shrink-0">{inv.unit_of_measure}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {errors[`item_${item.id}_name`] && <p className="text-xs text-red-600 mt-0.5">{errors[`item_${item.id}_name`]}</p>}
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                            className={`text-sm ${errors[`item_${item.id}_quantity`] ? 'border-red-400' : ''}`}
                          />
                          {errors[`item_${item.id}_quantity`] && <p className="text-xs text-red-600 mt-0.5">{errors[`item_${item.id}_quantity`]}</p>}
                        </div>

                        {/* Unit */}
                        <div className="sm:col-span-2">
                          <Input
                            placeholder="Unit"
                            value={item.unit}
                            onChange={e => updateItem(item.id, 'unit', e.target.value)}
                            className="text-sm"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="sm:col-span-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Price"
                            value={item.unit_price}
                            onChange={e => updateItem(item.id, 'unit_price', e.target.value)}
                            className={`text-sm ${errors[`item_${item.id}_unit_price`] ? 'border-red-400' : ''}`}
                          />
                          {errors[`item_${item.id}_unit_price`] && <p className="text-xs text-red-600 mt-0.5">{errors[`item_${item.id}_unit_price`]}</p>}
                        </div>

                        {/* Remove + row total */}
                        <div className="sm:col-span-1 flex items-center justify-between sm:justify-end gap-2">
                          {lineTotal > 0 && (
                            <span className="text-xs font-semibold text-gray-700 sm:hidden">
                              KES {lineTotal.toLocaleString()}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => items.length > 1 && removeLineItem(item.id)}
                            disabled={items.length === 1}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Desktop row total */}
                      {lineTotal > 0 && (
                        <div className="hidden sm:flex justify-end pr-8 -mt-1 mb-1">
                          <span className="text-xs text-gray-500">= KES {lineTotal.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Total */}
              <div className="mt-4 flex justify-end">
                <div className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-3 text-right">
                  <p className="text-xs text-violet-600 font-medium">Order Total</p>
                  <p className="text-2xl font-bold text-violet-800 mt-0.5">
                    KES {totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </section>

            {/* ── NOTES ── */}
            <section className="border-t pt-5">
              <Label className="text-sm font-medium">Notes / Instructions</Label>
              <textarea
                placeholder="Delivery instructions, special handling, payment notes..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                rows={3}
              />
            </section>

            {/* Errors */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {errors.submit}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-2xl shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (validate()) {
                  alert(`PO ${poNumber} saved as draft`)
                }
              }}
              disabled={isSubmitting}
              className="hidden sm:flex"
            >
              Save Draft
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || success}
              className={success ? 'bg-green-600 hover:bg-green-700' : 'bg-violet-600 hover:bg-violet-700'}
            >
              {success ? (
                <><CheckCircle2 className="h-4 w-4 mr-2" />Order Created!</>
              ) : isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</>
              ) : (
                <><ShoppingCart className="h-4 w-4 mr-2" />Submit Order</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}