'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Package,
  AlertTriangle,
  Calendar,
  Edit,
  MoreHorizontal,
  ChevronDown,
  MapPin,
  Building2,
  Truck,
  RefreshCw,
  Clock,
  TrendingDown,
  Hash,
  ShieldAlert,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { RestockInventoryModal } from './Restockinventorymodal'

interface InventoryItemCardProps {
  item: any
  canManage: boolean
  onStockUpdate: (itemId: string, newStock: number) => void
  viewMode?: 'grid' | 'list'
  isMobile?: boolean
}

export function InventoryItemCard({
  item,
  canManage,
  onStockUpdate,
  viewMode,
  isMobile,
}: InventoryItemCardProps) {
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // ── Status flags ──────────────────────────────────────────────────────────
  const isLowStock     = item.is_low_stock    ?? (item.current_stock < item.minimum_stock)
  const isOutOfStock   = item.is_out_of_stock ?? (item.current_stock === 0)
  const needsReorder   = item.needs_reorder   ?? false
  const isExpiringSoon =
    item.expiry_date &&
    new Date(item.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // ── Field resolution — v_inventory_items flat shape preferred ─────────────
  // category: v_inventory_items provides category_code / category_name / category_emoji
  const categoryCode =
    item.category_code ??
    (typeof item.category === 'string' ? item.category : item.category?.code ?? 'other')
  const categoryName =
    item.category_name ??
    (typeof item.category === 'string' ? item.category : item.category?.display_name ?? 'Other')
  const categoryEmoji = item.category_emoji ?? ''

  // subcategory
  const subcategoryName =
    item.subcategory_name ??
    (typeof item.subcategory === 'string' ? item.subcategory : item.subcategory?.name)

  // unit of measure — prefer human-readable label
  const unitDisplay =
    item.unit_label ?? item.unit_of_measure ?? item.unit_of_measure_code ?? ''

  // supplier, storage, department — v_inventory_items provides flat name strings
  const supplierName   = item.preferred_supplier ?? item.supplier?.name ?? null
  const storageLabel   = item.storage_location   ?? item.storage?.name  ?? null
  const storageType    = item.storage_type        ?? null
  const departmentName = item.department_name     ?? null

  // cost formatting (KES)
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(n)

  // ── Category badge color ──────────────────────────────────────────────────
  const getCategoryColor = (code: string) => {
    const map: Record<string, string> = {
      feed:         'bg-green-100 text-green-800',
      medical:      'bg-red-100 text-red-800',
      equipment:    'bg-blue-100 text-blue-800',
      supplies:     'bg-yellow-100 text-yellow-800',
      chemicals:    'bg-purple-100 text-purple-800',
      maintenance:  'bg-gray-100 text-gray-800',
      construction: 'bg-orange-100 text-orange-800',
      breeding:     'bg-violet-100 text-violet-800',
      dairyHygiene: 'bg-cyan-100 text-cyan-800',
      cropInputs:   'bg-lime-100 text-lime-800',
      fuel:         'bg-amber-100 text-amber-800',
      office:       'bg-pink-100 text-pink-800',
      packaging:    'bg-teal-100 text-teal-800',
      kitchen:      'bg-rose-100 text-rose-800',
    }
    return map[code] ?? 'bg-gray-100 text-gray-800'
  }

  // ── Stock progress bar ────────────────────────────────────────────────────
  const minStock   = item.minimum_stock ?? 0
  const stockPct   = minStock > 0 ? Math.min(100, (item.current_stock / minStock) * 100) : 100
  const stockColor = isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-orange-400' : 'bg-green-500'

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      {/* ── HEADER ── */}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-snug">
              {categoryEmoji && <span className="mr-1">{categoryEmoji}</span>}
              {item.name}
            </CardTitle>

            {item.sku && (
              <p className="text-xs text-gray-400 mt-0.5 font-mono flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {item.sku}
              </p>
            )}

            {item.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
            )}
          </div>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-shrink-0 p-1">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Item
                </DropdownMenuItem>
                <DropdownMenuItem>View History</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Category + subcategory badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <Badge className={`text-xs ${getCategoryColor(categoryCode)}`}>
            {categoryName}
          </Badge>
          {subcategoryName && (
            <Badge variant="outline" className="text-xs">
              {subcategoryName}
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* ── BODY ── */}
      <CardContent className="space-y-3 flex-1 flex flex-col">

        {/* Stock level + progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Current Stock</span>
            <div className="flex items-center gap-1.5">
              {isOutOfStock  && <ShieldAlert    className="w-3.5 h-3.5 text-red-500" />}
              {!isOutOfStock && isLowStock && (
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              )}
              <span
                className={`font-bold ${
                  isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-gray-900'
                }`}
              >
                {item.current_stock} {unitDisplay}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${stockColor}`}
              style={{ width: `${stockPct}%` }}
            />
          </div>

          {/* Min / reorder / reorder-qty */}
          <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-500 mt-1">
            {minStock > 0 && (
              <div className="flex justify-between">
                <span>Min</span>
                <span className="font-medium text-gray-700">{minStock} {unitDisplay}</span>
              </div>
            )}
            {(item.reorder_level ?? 0) > 0 && (
              <div className="flex justify-between">
                <span>Reorder at</span>
                <span className="font-medium text-gray-700">{item.reorder_level} {unitDisplay}</span>
              </div>
            )}
            {(item.reorder_quantity ?? 0) > 0 && (
              <div className="flex justify-between col-span-2">
                <span>Reorder qty</span>
                <span className="font-medium text-gray-700">
                  {item.reorder_quantity} {unitDisplay}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cost & total value tiles */}
        {((item.cost_per_unit ?? 0) > 0 || (item.total_value ?? 0) > 0) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(item.cost_per_unit ?? 0) > 0 && (
              <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                <p className="text-gray-500">Unit Cost</p>
                <p className="font-semibold text-gray-900">{fmt(item.cost_per_unit)}</p>
              </div>
            )}
            {(item.total_value ?? 0) > 0 && (
              <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                <p className="text-gray-500">Total Value</p>
                <p className="font-semibold text-gray-900">{fmt(item.total_value)}</p>
              </div>
            )}
          </div>
        )}

        {/* Alert pills */}
        {(isOutOfStock || isLowStock || needsReorder || isExpiringSoon) && (
          <div className="space-y-1">
            {isOutOfStock && (
              <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium bg-red-50 px-2 py-1 rounded">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                Out of stock
              </div>
            )}
            {!isOutOfStock && isLowStock && (
              <div className="flex items-center gap-1.5 text-orange-600 text-xs font-medium bg-orange-50 px-2 py-1 rounded">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Below minimum stock level
              </div>
            )}
            {needsReorder && !isLowStock && (
              <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium bg-amber-50 px-2 py-1 rounded">
                <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
                At or below reorder level
              </div>
            )}
            {isExpiringSoon && (
              <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium bg-red-50 px-2 py-1 rounded">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                Expires {new Date(item.expiry_date).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* Location / supplier / department pills */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {storageLabel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              <MapPin className="w-3 h-3" />
              {storageLabel}
              {storageType ? ` · ${storageType}` : ''}
            </span>
          )}
          {supplierName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
              <Truck className="w-3 h-3" />
              {supplierName}
            </span>
          )}
          {departmentName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
              <Building2 className="w-3 h-3" />
              {departmentName}
            </span>
          )}
        </div>

        {/* Adjust Stock */}
        {canManage && (
          <div className="pt-1 border-t mt-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRestockModal(true)}
              className="w-full"
            >
              <Package className="w-4 h-4 mr-2" />
              Adjust Stock
            </Button>
          </div>
        )}

        {/* ── Expandable additional details ── */}
        <div className="border-t pt-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium text-gray-600"
          >
            <span>More details</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-2 pt-2 border-t text-xs">

              {/* Perishable + batch tracking */}
              <div className="grid grid-cols-2 gap-2">
                {item.is_perishable !== undefined && (
                  <div>
                    <p className="text-gray-500 mb-0.5">Perishable</p>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded font-medium ${
                        item.is_perishable
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {item.is_perishable ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
                {item.requires_batch_tracking !== undefined && (
                  <div>
                    <p className="text-gray-500 mb-0.5">Batch Tracking</p>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded font-medium ${
                        item.requires_batch_tracking
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.requires_batch_tracking ? 'Required' : 'Not required'}
                    </span>
                  </div>
                )}
              </div>

              {/* Shelf life */}
              {item.shelf_life_days && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />Shelf life
                  </span>
                  <span className="font-medium text-gray-800">{item.shelf_life_days} days</span>
                </div>
              )}

              {/* Last restocked */}
              {item.last_restocked_at && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />Last restocked
                  </span>
                  <span className="font-medium text-gray-800">
                    {new Date(item.last_restocked_at).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Notes */}
              {item.notes && (
                <div>
                  <p className="text-gray-500 mb-0.5">Notes</p>
                  <p className="text-gray-700 bg-gray-50 rounded p-1.5 leading-snug whitespace-pre-wrap">
                    {item.notes}
                  </p>
                </div>
              )}

              {/* Created timestamp */}
              {item.created_at && (
                <div className="flex justify-between items-center text-gray-400">
                  <span>Added</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <RestockInventoryModal
        isOpen={showRestockModal}
        onClose={() => setShowRestockModal(false)}
        onStockUpdated={onStockUpdate}
        item={item}
      />
    </Card>
  )
}