'use client'

import { useEffect, useState, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  ShoppingCart,
  TrendingUp,
  Calendar,
  Package,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Wheat,
  Box,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Purchase {
  id: string
  type: 'feed' | 'inventory'
  item_name: string
  item_id: string | null
  date: string
  quantity: number
  unit: string
  unit_cost: number | null
  total_cost: number | null
  batch_number: string | null
  expiry_date: string | null
  notes: string | null
  created_at: string
}

interface Summary {
  total_count: number
  total_spend: number
  last_purchase: string | null
}

interface SupplierPurchasesModalProps {
  supplier: { id: string; name: string } | null
  isOpen: boolean
  onClose: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtKsh(n: number | null) {
  if (n == null) return '—'
  return `KSh ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className={`p-2 rounded-lg ${color} shrink-0`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold text-gray-900 text-sm">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function SupplierPurchasesModal({ supplier, isOpen, onClose }: SupplierPurchasesModalProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [summary, setSummary]     = useState<Summary | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [page, setPage]           = useState(1)
  const [hasMore, setHasMore]     = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'feed' | 'inventory'>('all')

  const fetchPurchases = useCallback(async (targetPage: number) => {
    if (!supplier) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/suppliers/${supplier.id}/purchases?page=${targetPage}&limit=${PAGE_SIZE}`
      )
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to load purchase history')
      }
      const json = await res.json()
      setPurchases(json.purchases ?? [])
      setSummary(json.summary   ?? null)
      setHasMore(json.pagination?.has_more ?? false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [supplier])

  // Reload when modal opens or supplier changes
  useEffect(() => {
    if (isOpen && supplier) {
      setPage(1)
      setTypeFilter('all')
      fetchPurchases(1)
    }
  }, [isOpen, supplier, fetchPurchases])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchPurchases(newPage)
  }

  // Client-side type filter
  const filtered = typeFilter === 'all'
    ? purchases
    : purchases.filter(p => p.type === typeFilter)

  const feedCount      = purchases.filter(p => p.type === 'feed').length
  const inventoryCount = purchases.filter(p => p.type === 'inventory').length

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl">
      <div className="flex flex-col max-h-[85vh]">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Purchase History</h3>
              <p className="text-sm text-gray-500 mt-0.5">{supplier?.name}</p>
            </div>
            {summary && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                {summary.total_count} purchase{summary.total_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <SummaryCard
                icon={ShoppingCart}
                label="Total Purchases"
                value={summary.total_count.toString()}
                sub={`${feedCount} feed · ${inventoryCount} inventory`}
                color="bg-blue-500"
              />
              <SummaryCard
                icon={TrendingUp}
                label="Total Spend"
                value={fmtKsh(summary.total_spend)}
                color="bg-green-500"
              />
              <SummaryCard
                icon={Calendar}
                label="Last Purchase"
                value={fmtDate(summary.last_purchase)}
                color="bg-purple-500"
              />
            </div>
          )}

          {/* Type filter tabs */}
          {(feedCount > 0 || inventoryCount > 0) && (
            <div className="flex gap-1 mt-4">
              {(['all', 'feed', 'inventory'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    typeFilter === f
                      ? 'bg-farm-green text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all'       ? `All (${purchases.length})`
                  : f === 'feed'     ? `Feed (${feedCount})`
                  : `Inventory (${inventoryCount})`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Body ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="md" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-gray-500">No purchases found</p>
              <p className="text-xs mt-1">
                {typeFilter === 'all'
                  ? 'No purchase records linked to this supplier yet.'
                  : `No ${typeFilter} purchases found for this supplier.`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(purchase => (
                <PurchaseRow key={purchase.id} purchase={purchase} />
              ))}
            </div>
          )}
        </div>

        {/* ── Pagination ────────────────────────────────────────────── */}
        {(page > 1 || hasMore) && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between shrink-0">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1 || loading}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-xs text-gray-500">Page {page}</span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={!hasMore || loading}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Purchase row ──────────────────────────────────────────────────────────────
function PurchaseRow({ purchase }: { purchase: Purchase }) {
  const [showNotes, setShowNotes] = useState(false)

  const isExpired = purchase.expiry_date
    ? new Date(purchase.expiry_date) < new Date()
    : false
  const isExpiringSoon = purchase.expiry_date && !isExpired
    ? (new Date(purchase.expiry_date).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000
    : false

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
      <div className="flex items-start gap-3 p-3">
        {/* Icon */}
        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
          purchase.type === 'feed' ? 'bg-green-50' : 'bg-blue-50'
        }`}>
          {purchase.type === 'feed'
            ? <Wheat className="h-4 w-4 text-green-600" />
            : <Box   className="h-4 w-4 text-blue-600"  />
          }
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-medium text-gray-900 text-sm">{purchase.item_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{fmtDate(purchase.date)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-gray-900 text-sm">{fmtKsh(purchase.total_cost)}</p>
              {purchase.unit_cost && (
                <p className="text-xs text-gray-500">{fmtKsh(purchase.unit_cost)}/{purchase.unit}</p>
              )}
            </div>
          </div>

          {/* Detail row */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
              {purchase.quantity} {purchase.unit}
            </span>

            {purchase.batch_number && (
              <span className="text-xs text-gray-500">
                Batch: <span className="font-medium text-gray-700">{purchase.batch_number}</span>
              </span>
            )}

            {purchase.expiry_date && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isExpired      ? 'bg-red-100 text-red-700'
              : isExpiringSoon ? 'bg-orange-100 text-orange-700'
              :                  'bg-gray-100 text-gray-600'
              }`}>
                {isExpired ? 'Expired' : 'Exp'}: {fmtDate(purchase.expiry_date)}
              </span>
            )}

            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              purchase.type === 'feed'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {purchase.type === 'feed' ? 'Feed' : 'Inventory'}
            </span>
          </div>

          {/* Collapsible notes */}
          {purchase.notes && (
            <button
              onClick={() => setShowNotes(o => !o)}
              className="mt-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showNotes ? 'Hide notes ↑' : 'Show notes ↓'}
            </button>
          )}
          {showNotes && purchase.notes && (
            <p className="mt-1 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1.5 leading-relaxed">
              {purchase.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
