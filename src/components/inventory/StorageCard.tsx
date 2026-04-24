'use client'
// src/components/inventory/StorageCard.tsx

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  Archive,
  MapPin,
  Thermometer,
  Droplets,
  ShieldCheck,
  Package,
  Building2,
  Layers,
  Tag,
  FileText,
  ChevronDown,
  Edit2,
  Trash2,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  WrenchIcon,
  Wind,
  Lock,
} from 'lucide-react'

// ── Type / status configs ─────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  feedstore:         { label: 'Feedstore / Feed Room',         color: 'bg-amber-100  text-amber-800  border-amber-200',  icon: Archive   },
  siloBunker:        { label: 'Silage Bunker / Silage Pit',    color: 'bg-lime-100   text-lime-800   border-lime-200',   icon: Archive   },
  feedBunker:        { label: 'Feed Bunker',                   color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Archive   },
  forageStorage:     { label: 'Forage & Hay Storage',          color: 'bg-green-100  text-green-800  border-green-200',  icon: Package   },
  silo:              { label: 'Silo / Grain Storage',          color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Archive   },
  climateControlled: { label: 'Climate Controlled Room',       color: 'bg-cyan-100   text-cyan-800   border-cyan-200',   icon: Thermometer },
  coldStorage:       { label: 'Cold Storage / Refrigeration',  color: 'bg-blue-100   text-blue-800   border-blue-200',   icon: Thermometer },
  dryStorage:        { label: 'Dry Storage',                   color: 'bg-stone-100  text-stone-700  border-stone-200',  icon: Archive   },
  quarantine:        { label: 'Quarantine Area',               color: 'bg-red-100    text-red-700    border-red-200',    icon: ShieldCheck },
  medicineStore:     { label: 'Medicine / Veterinary Store',   color: 'bg-pink-100   text-pink-800   border-pink-200',   icon: Package   },
  equipmentStorage:  { label: 'Equipment Storage',             color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: WrenchIcon },
  warehouseGeneral:  { label: 'General Warehouse',             color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Building2 },
  other:             { label: 'Other',                         color: 'bg-gray-100   text-gray-700   border-gray-200',   icon: Archive   },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active:      { label: 'Active',            color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2  },
  inactive:    { label: 'Inactive',          color: 'bg-gray-100  text-gray-600  border-gray-200',  icon: Archive       },
  maintenance: { label: 'Under Maintenance', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertTriangle },
}

const FLOOR_LABELS: Record<string, string> = {
  ground:   'Ground Floor',
  basement: 'Basement',
  floor1:   'First Floor',
  floor2:   'Second Floor',
  floor3:   'Third Floor',
  outdoor:  'Outdoor',
}

const CATEGORY_LABELS: Record<string, string> = {
  feed:         'Feed & Forage',
  medical:      'Medical',
  equipment:    'Equipment',
  supplies:     'Supplies',
  chemicals:    'Chemicals',
  machines:     'Machines',
  construction: 'Construction',
  dairy:        'Dairy Products',
  seeds:        'Seeds',
  other:        'Other',
}

// ── Info row helper ───────────────────────────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | number
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="text-gray-500 text-xs">{label}: </span>
        <span className="text-gray-800 font-medium break-words">{value}</span>
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface StorageCardProps {
  storage: any
  canManage: boolean
  onEdit: (storage: any) => void
  onDelete: (storageId: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export function StorageCard({ storage, canManage, onEdit, onDelete }: StorageCardProps) {
  const [showNotes, setShowNotes]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]         = useState(false)

  // Resolve type (field is storage_type in DB)
  const typeKey      = storage.storage_type ?? storage.type ?? 'other'
  const typeConfig   = TYPE_CONFIG[typeKey]   ?? TYPE_CONFIG.other
  const statusConfig = STATUS_CONFIG[storage.status] ?? STATUS_CONFIG.active
  const TypeIcon     = typeConfig.icon

  // Location string
  const locationParts = [
    storage.building,
    storage.location,
    storage.floor_level ? FLOOR_LABELS[storage.floor_level] : null,
  ].filter(Boolean)
  const locationStr = locationParts.join(' · ')

  // Categories
  const categories: string[] = Array.isArray(storage.categories) ? storage.categories : []

  // Environmental summary
  const hasTempControl = storage.temperature_controlled
  const hasHumidity    = storage.humidity_controlled
  const hasAccess      = storage.restricted_access || storage.requires_authorization

  // ── Delete handler ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/storage/${storage.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove storage location')
      onDelete(storage.id)
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
                <TypeIcon className="h-5 w-5 text-gray-500" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                  {storage.name}
                </h3>
                {locationStr && (
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {locationStr}
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
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onEdit(storage)}>
                    <Edit2 className="h-4 w-4 mr-2 text-gray-500" />
                    Edit Storage
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setConfirmDelete(true)}
                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Storage
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
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${statusConfig.color}`}>
              <statusConfig.icon className="h-3 w-3" />
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* ── Capacity & Conditions ────────────────────────────────────── */}
        <div className="p-4 space-y-2 border-b border-gray-100">
          {(storage.capacity != null) && (
            <InfoRow
              icon={Layers}
              label="Capacity"
              value={`${Number(storage.capacity).toLocaleString()} ${storage.capacity_unit ?? ''}`}
            />
          )}
          {hasTempControl && (
            <InfoRow
              icon={Thermometer}
              label="Temperature"
              value={
                storage.min_temperature != null && storage.max_temperature != null
                  ? `${storage.min_temperature}°C – ${storage.max_temperature}°C`
                  : 'Controlled'
              }
            />
          )}
          {hasHumidity && (
            <InfoRow
              icon={Droplets}
              label="Humidity"
              value={
                storage.min_humidity != null && storage.max_humidity != null
                  ? `${storage.min_humidity}% – ${storage.max_humidity}%`
                  : 'Controlled'
              }
            />
          )}

          {/* Environmental indicator pills */}
          {(hasTempControl || hasHumidity || hasAccess) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {hasTempControl && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                  <Thermometer className="h-3 w-3" /> Temp. Controlled
                </span>
              )}
              {hasHumidity && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  <Wind className="h-3 w-3" /> Humidity Controlled
                </span>
              )}
              {hasAccess && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <Lock className="h-3 w-3" /> Restricted
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Categories ───────────────────────────────────────────────── */}
        {categories.length > 0 && (
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Stores
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <span
                  key={cat}
                  className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200"
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Description / Notes (collapsible) ───────────────────────── */}
        {(storage.description || storage.notes) && (
          <div className="border-b border-gray-100">
            <button
              type="button"
              onClick={() => setShowNotes(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <FileText className="h-3.5 w-3.5" />
                Notes & Description
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showNotes ? 'rotate-180' : ''}`} />
            </button>
            {showNotes && (
              <div className="px-4 pb-3 space-y-2">
                {storage.description && (
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                    <span className="font-medium text-gray-700">Description: </span>
                    {storage.description}
                  </p>
                )}
                {storage.notes && (
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                    <span className="font-medium text-gray-700">Notes: </span>
                    {storage.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 mt-auto flex items-center justify-between gap-2">
          <span className="text-xs text-gray-400">
            Added {new Date(storage.created_at).toLocaleDateString('en-KE', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Storage Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{storage.name}</strong>? The location
              will be marked as inactive. This action can be reversed by editing the location
              and setting the status back to Active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Removing…' : 'Remove Storage'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
