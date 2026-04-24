'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// ── Validation schema ─────────────────────────────────────────────────────────
const supplierSchema = z.object({
  // Basic info
  name:              z.string().min(1, 'Company name is required'),
  supplier_type:     z.string().min(1, 'Supplier type is required'),
  status:            z.string().min(1, 'Status is required'),
  kra_pin:           z.string().optional(),

  // Contact details
  contact_person:    z.string().optional(),
  phone:             z.string().optional(),
  alternative_phone: z.string().optional(),
  email:             z.string().email('Invalid email address').optional().or(z.literal('')),
  website:           z.string().url('Invalid URL').optional().or(z.literal('')),

  // Location
  physical_address:  z.string().optional(),
  town:              z.string().optional(),
  county:            z.string().optional(),

  // Business terms
  payment_terms:     z.string().optional(),
  custom_payment:    z.string().optional(),
  credit_limit:      z.number().min(0).optional(),
  minimum_order_kg:  z.number().min(0).optional(),
  lead_time_days:    z.number().min(0).int().optional(),

  // Notes
  notes:             z.string().optional(),
})

type SupplierFormData = z.infer<typeof supplierSchema>

// ── Constants ─────────────────────────────────────────────────────────────────
const SUPPLIER_TYPES = [
  { value: 'feed',        label: 'Feed & Forage' },
  { value: 'veterinary',  label: 'Veterinary & Medicine' },
  { value: 'equipment',   label: 'Equipment & Machinery' },
  { value: 'machines',    label: 'Machines & Mechanical Equipment' },
  { value: 'construction',label: 'Construction Materials & Supplies' },
  { value: 'dairy',       label: 'Dairy Processing' },
  { value: 'chemicals',   label: 'Agrochemicals & Fertilisers' },
  { value: 'fuel',        label: 'Fuel & Energy' },
  { value: 'seeds',       label: 'Seeds & Planting Material' },
  { value: 'supplies',    label: 'General Supplies' },
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'other',       label: 'Other' },
]

const PAYMENT_TERMS_OPTIONS = [
  { value: 'cod',    label: 'Cash on Delivery (COD)' },
  { value: 'net7',   label: 'Net 7 Days' },
  { value: 'net14',  label: 'Net 14 Days' },
  { value: 'net30',  label: 'Net 30 Days' },
  { value: 'net60',  label: 'Net 60 Days' },
  { value: 'prepay', label: 'Prepayment' },
  { value: 'credit', label: 'Running Credit Account' },
  { value: 'other',  label: 'Other (specify below)' },
]

const KENYAN_COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa',
  'Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi',
  'Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos',
  'Makueni','Mandera','Marsabit','Meru','Migori','Mombasa','Murang\'a',
  'Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri',
  'Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans-Nzoia',
  'Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot',
]

// ── Section header helper ─────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pt-2 pb-1">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface AddSupplierModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onSupplierAdded: (supplier: any) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AddSupplierModal({ farmId, isOpen, onClose, onSupplierAdded }: AddSupplierModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name:              '',
      supplier_type:     'feed',
      status:            'active',
      kra_pin:           '',
      contact_person:    '',
      phone:             '',
      alternative_phone: '',
      email:             '',
      website:           '',
      physical_address:  '',
      town:              '',
      county:            '',
      payment_terms:     'cod',
      custom_payment:    '',
      credit_limit:      undefined,
      minimum_order_kg:  undefined,
      lead_time_days:    undefined,
      notes:             '',
    },
  })

  const watchPaymentTerms = form.watch('payment_terms')

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (data: SupplierFormData) => {
    setLoading(true)
    setError(null)

    try {
      // Resolve payment terms label: for 'other' use the custom text
      const resolvedPaymentTerms =
        data.payment_terms === 'other'
          ? (data.custom_payment?.trim() || 'Other')
          : (PAYMENT_TERMS_OPTIONS.find(o => o.value === data.payment_terms)?.label ?? data.payment_terms)

      const response = await fetch('/api/suppliers', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Basic info
          name:              data.name,
          supplier_type:     data.supplier_type             || null,
          status:            data.status,
          kra_pin:           data.kra_pin?.trim()           || null,

          // Contact details
          contact_person:    data.contact_person?.trim()    || null,
          phone:             data.phone?.trim()             || null,
          alternative_phone: data.alternative_phone?.trim() || null,
          email:             data.email?.trim()             || null,
          website:           data.website?.trim()           || null,

          // Location — now stored as dedicated columns, not crammed into address
          address:           data.physical_address?.trim()  || null,
          town:              data.town?.trim()              || null,
          county:            data.county                    || null,

          // Business terms
          payment_terms:     resolvedPaymentTerms           || null,
          credit_limit_ksh:  data.credit_limit              ?? null,
          minimum_order_kg:  data.minimum_order_kg          ?? null,
          lead_time_days:    data.lead_time_days            ?? null,

          // Notes (user-written only — no more structured prefix hacks)
          notes:             data.notes?.trim()             || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add supplier')
      }

      onSupplierAdded(result.supplier)
      form.reset()
      onClose()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const selectClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent'
  const textareaClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent'

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-8">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-900">Add Supplier</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Fill in the supplier's details. Only Company Name is required.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">

          {/* ── 1. Basic Information ─────────────────────────────────────── */}
          <div>
            <SectionHeader title="Basic Information" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="md:col-span-2">
                <Label htmlFor="name">Company / Business Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  error={form.formState.errors.name?.message}
                  placeholder="e.g., Unga Feeds Ltd"
                />
              </div>

              <div>
                <Label htmlFor="supplier_type">Supplier Type *</Label>
                <select id="supplier_type" {...form.register('supplier_type')} className={selectClass}>
                  {SUPPLIER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <select id="status" {...form.register('status')} className={selectClass}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <Label htmlFor="kra_pin">KRA PIN / Tax ID</Label>
                <Input
                  id="kra_pin"
                  {...form.register('kra_pin')}
                  placeholder="e.g., P051234567A"
                  className="uppercase"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* ── 2. Contact Details ───────────────────────────────────────── */}
          <div>
            <SectionHeader title="Contact Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  {...form.register('contact_person')}
                  placeholder="Primary contact name"
                />
              </div>

              <div>
                <Label htmlFor="phone">Primary Phone</Label>
                <Input
                  id="phone"
                  {...form.register('phone')}
                  placeholder="+254 7XX XXX XXX"
                  type="tel"
                />
              </div>

              <div>
                <Label htmlFor="alternative_phone">Alternative Phone</Label>
                <Input
                  id="alternative_phone"
                  {...form.register('alternative_phone')}
                  placeholder="Office or secondary number"
                  type="tel"
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  error={form.formState.errors.email?.message}
                  placeholder="contact@supplier.com"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  {...form.register('website')}
                  error={form.formState.errors.website?.message}
                  placeholder="https://www.supplier.co.ke"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* ── 3. Location ───────────────────────────────────────────────── */}
          <div>
            <SectionHeader title="Location" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="md:col-span-2">
                <Label htmlFor="physical_address">Physical Address / Street</Label>
                <Input
                  id="physical_address"
                  {...form.register('physical_address')}
                  placeholder="Building, street, P.O. Box"
                />
              </div>

              <div>
                <Label htmlFor="town">Town / City</Label>
                <Input
                  id="town"
                  {...form.register('town')}
                  placeholder="e.g., Nakuru, Eldoret"
                />
              </div>

              <div>
                <Label htmlFor="county">County</Label>
                <select id="county" {...form.register('county')} className={selectClass}>
                  <option value="">— Select county —</option>
                  {KENYAN_COUNTIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* ── 4. Business Terms ─────────────────────────────────────────── */}
          <div>
            <SectionHeader
              title="Business Terms"
              subtitle="These details help with procurement planning and cash flow management."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <select id="payment_terms" {...form.register('payment_terms')} className={selectClass}>
                  {PAYMENT_TERMS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {watchPaymentTerms === 'other' && (
                <div>
                  <Label htmlFor="custom_payment">Custom Payment Terms</Label>
                  <Input
                    id="custom_payment"
                    {...form.register('custom_payment')}
                    placeholder="Describe your payment arrangement"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="credit_limit">Credit Limit (KSh)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g., 50000"
                  value={form.watch('credit_limit') ?? ''}
                  onChange={e =>
                    form.setValue('credit_limit', e.target.value === '' ? undefined : Number(e.target.value))
                  }
                />
              </div>

              <div>
                <Label htmlFor="minimum_order_kg">Minimum Order (kg)</Label>
                <Input
                  id="minimum_order_kg"
                  type="number"
                  min="0"
                  step="50"
                  placeholder="e.g., 100"
                  value={form.watch('minimum_order_kg') ?? ''}
                  onChange={e =>
                    form.setValue('minimum_order_kg', e.target.value === '' ? undefined : Number(e.target.value))
                  }
                />
              </div>

              <div>
                <Label htmlFor="lead_time_days">Typical Lead Time (days)</Label>
                <Input
                  id="lead_time_days"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g., 3"
                  value={form.watch('lead_time_days') ?? ''}
                  onChange={e =>
                    form.setValue('lead_time_days', e.target.value === '' ? undefined : Number(e.target.value))
                  }
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* ── 5. Additional Notes ──────────────────────────────────────── */}
          <div>
            <SectionHeader title="Additional Notes" />
            <div className="mt-3">
              <textarea
                id="notes"
                {...form.register('notes')}
                rows={3}
                className={textareaClass}
                placeholder="Quality remarks, special handling instructions, preferred delivery times, etc."
              />
            </div>
          </div>

          {/* ── Actions ──────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 sticky bottom-0 bg-white pb-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : 'Add Supplier'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
