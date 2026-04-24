//src/components/inventory/SupplierCard.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { SupplierPurchasesModal } from '@/components/inventory/SupplierPurchasesModal'
import {
  Building2, Phone, PhoneCall, Mail, Globe, MapPin,
  User, CreditCard, Package, Clock, FileText, Edit2,
  Trash2, MoreVertical, ChevronDown, ShieldCheck, History,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog'

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  feed:        { label: 'Feed & Forage',             color: 'bg-green-100 text-green-800 border-green-200' },
  veterinary:  { label: 'Veterinary & Medicine',     color: 'bg-red-100 text-red-800 border-red-200' },
  equipment:   { label: 'Equipment & Machinery',     color: 'bg-blue-100 text-blue-800 border-blue-200' },
  dairy:       { label: 'Dairy Processing',          color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  chemicals:   { label: 'Agrochemicals',             color: 'bg-orange-100 text-orange-800 border-orange-200' },
  fuel:        { label: 'Fuel & Energy',             color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  seeds:       { label: 'Seeds & Planting',          color: 'bg-lime-100 text-lime-800 border-lime-200' },
  supplies:    { label: 'General Supplies',          color: 'bg-purple-100 text-purple-800 border-purple-200' },
  maintenance: { label: 'Maintenance & Repairs',     color: 'bg-gray-100 text-gray-700 border-gray-200' },
  other:       { label: 'Other',                     color: 'bg-gray-100 text-gray-700 border-gray-200' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:    { label: 'Active',    color: 'bg-green-100 text-green-700 border-green-200' },
  inactive:  { label: 'Inactive',  color: 'bg-gray-100 text-gray-600 border-gray-200' },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700 border-red-200' },
}

// ── Small row helper ──────────────────────────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  href?: string
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="text-gray-500 text-xs">{label}: </span>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-farm-green hover:underline font-medium break-all"
          >
            {value}
          </a>
        ) : (
          <span className="text-gray-800 font-medium break-words">{value}</span>
        )}
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface SupplierCardProps {
  supplier: any
  canManage: boolean
  onEdit: (supplier: any) => void
  onDelete: (supplierId: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SupplierCard({ supplier, canManage, onEdit, onDelete }: SupplierCardProps) {
  const [showNotes, setShowNotes]           = useState(false)
  const [showPurchases, setShowPurchases]   = useState(false)
  const [confirmDelete, setConfirmDelete]   = useState(false)
  const [deleting, setDeleting]             = useState(false)

  const typeConfig   = TYPE_CONFIG[supplier.supplier_type]   ?? TYPE_CONFIG.other
  const statusConfig = STATUS_CONFIG[supplier.status]        ?? STATUS_CONFIG.active

  // Build location string
  const locationParts = [supplier.address, supplier.town, supplier.county].filter(Boolean)
  const location      = locationParts.join(', ')

  // Handle soft-delete
  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete supplier')
      onDelete(supplier.id)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="p-4 pb-3 border-b border-gray-100">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-gray-500" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                  {supplier.name}
                </h3>
                {supplier.contact_person && (
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {supplier.contact_person}
                  </p>
                )}
              </div>
            </div>

            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowPurchases(true)}>
                    <History className="h-4 w-4 mr-2 text-gray-500" />
                    View Purchases
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(supplier)}>
                    <Edit2 className="h-4 w-4 mr-2 text-gray-500" />
                    Edit Supplier
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setConfirmDelete(true)}
                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Supplier
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* ── Contact ─────────────────────────────────────────────────── */}
        <div className="p-4 space-y-2 border-b border-gray-100">
          {supplier.phone && (
            <InfoRow icon={Phone} label="Phone" value={supplier.phone}
              href={`tel:${supplier.phone}`} />
          )}
          {supplier.alternative_phone && (
            <InfoRow icon={PhoneCall} label="Alt. Phone" value={supplier.alternative_phone}
              href={`tel:${supplier.alternative_phone}`} />
          )}
          {supplier.email && (
            <InfoRow icon={Mail} label="Email" value={supplier.email}
              href={`mailto:${supplier.email}`} />
          )}
          {supplier.website && (
            <InfoRow icon={Globe} label="Website" value={supplier.website}
              href={supplier.website} />
          )}
          {location && (
            <InfoRow icon={MapPin} label="Location" value={location} />
          )}
          {supplier.kra_pin && (
            <InfoRow icon={ShieldCheck} label="KRA PIN" value={supplier.kra_pin} />
          )}
        </div>

        {/* ── Business Terms ───────────────────────────────────────────── */}
        {(supplier.payment_terms || supplier.credit_limit_ksh || supplier.minimum_order_kg || supplier.lead_time_days) && (
          <div className="p-4 space-y-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Business Terms</p>
            {supplier.payment_terms && (
              <InfoRow icon={CreditCard} label="Payment" value={supplier.payment_terms} />
            )}
            {supplier.credit_limit_ksh != null && (
              <InfoRow icon={CreditCard} label="Credit Limit" value={`KSh ${Number(supplier.credit_limit_ksh).toLocaleString()}`} />
            )}
            {supplier.minimum_order_kg != null && (
              <InfoRow icon={Package} label="Min. Order" value={`${supplier.minimum_order_kg} kg`} />
            )}
            {supplier.lead_time_days != null && (
              <InfoRow icon={Clock} label="Lead Time" value={`${supplier.lead_time_days} day${supplier.lead_time_days !== 1 ? 's' : ''}`} />
            )}
          </div>
        )}

        {/* ── Notes (collapsible) ──────────────────────────────────────── */}
        {supplier.notes && (
          <div className="border-b border-gray-100">
            <button
              type="button"
              onClick={() => setShowNotes(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <FileText className="h-3.5 w-3.5" />
                Notes
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showNotes ? 'rotate-180' : ''}`} />
            </button>
            {showNotes && (
              <p className="px-4 pb-3 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                {supplier.notes}
              </p>
            )}
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 mt-auto flex items-center justify-between gap-2">
          <span className="text-xs text-gray-400">
            Added {new Date(supplier.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPurchases(true)}
              className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1"
            >
              <History className="h-3 w-3" />
              Purchases
            </button>
            {canManage && (
              <button
                onClick={() => onEdit(supplier)}
                className="text-xs text-farm-green hover:underline font-medium flex items-center gap-1"
              >
                <Edit2 className="h-3 w-3" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Purchase history modal ───────────────────────────────────── */}
      <SupplierPurchasesModal
        supplier={showPurchases ? { id: supplier.id, name: supplier.name } : null}
        isOpen={showPurchases}
        onClose={() => setShowPurchases(false)}
      />

      {/* ── Delete confirmation ──────────────────────────────────────── */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{supplier.name}</strong>? The supplier
              will be marked as inactive and hidden from your directory. This action can be
              reversed by editing the supplier and changing their status back to Active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Removing…' : 'Remove Supplier'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
