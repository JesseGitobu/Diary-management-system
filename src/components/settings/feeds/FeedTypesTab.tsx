'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Wheat,
  Edit,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Package,
  Tag,
  AlertTriangle,
  Ruler,
  FlaskConical,
  Truck,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { AddFeedTypeModal } from '@/components/settings/feeds/AddFeedTypeModal'

const PAGE_SIZE = 10

interface FeedTypesTabProps {
  feedTypes: any[]
  isMobile: boolean
  canManageFeed: boolean
  farmId: string
  onAddFeedType: () => void
  onFeedTypeUpdated: (updatedFeedType: any) => void
  onFeedTypeDeleted: (feedTypeId: string) => void
  feedTypeCategories: any[]
  animalCategories: any[]
  weightConversions: any[]
}

export function FeedTypesTab({
  feedTypes,
  isMobile,
  canManageFeed,
  farmId,
  onAddFeedType,
  onFeedTypeUpdated,
  onFeedTypeDeleted,
  feedTypeCategories,
  animalCategories,
  weightConversions,
}: FeedTypesTabProps) {
  // ── modal / dialog state ──────────────────────────────────────
  const [editingFeedType, setEditingFeedType]   = useState<any | null>(null)
  const [showEditModal, setShowEditModal]         = useState(false)
  const [deletingFeedType, setDeletingFeedType]  = useState<any | null>(null)
  const [showDeleteDialog, setShowDeleteDialog]  = useState(false)
  const [deleteLoading, setDeleteLoading]         = useState(false)
  const [deleteError, setDeleteError]             = useState<string | null>(null)
  const [expandedCards, setExpandedCards]         = useState<Set<string>>(new Set())

  // ── search / filter / pagination ─────────────────────────────
  const [searchQuery, setSearchQuery]       = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [currentPage, setCurrentPage]       = useState(1)

  // ── helpers ───────────────────────────────────────────────────
  const getFeedCategory = (categoryId: string | null) =>
    feedTypeCategories.find(c => c.id === categoryId) ?? null

  const getUnitLabel = (unitRef: string | null | undefined) => {
    if (!unitRef) return null
    const conv = weightConversions.find(w => w.id === unitRef)
    if (conv) return conv.unit_name || conv.from_unit
    return unitRef
  }

  const getSupplier = (ft: any) => {
    if (ft.supplier) return ft.supplier
    const m = ft.notes?.match(/^Supplier:\s*(.+)$/i)
    return m ? m[1] : null
  }

  const getNutrition = (ft: any) => ft.nutritional_info || ft.nutritional_value || {}

  const hasAnyNutrition = (n: any) =>
    n && Object.values(n).some(v => v != null)

  // ── filtered + paginated list ─────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return feedTypes.filter(ft => {
      const cat = getFeedCategory(ft.category_id)
      const matchesSearch =
        !q ||
        ft.name.toLowerCase().includes(q) ||
        (ft.description ?? '').toLowerCase().includes(q) ||
        (cat?.category_name ?? '').toLowerCase().includes(q) ||
        (getSupplier(ft) ?? '').toLowerCase().includes(q)
      const matchesCategory =
        !categoryFilter || ft.category_id === categoryFilter
      return matchesSearch && matchesCategory
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedTypes, searchQuery, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(currentPage, totalPages)
  const pageStart  = (safePage - 1) * PAGE_SIZE
  const paginated  = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const changePage = (p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages)))

  const clearFilters = () => {
    setSearchQuery('')
    setCategoryFilter('')
    setCurrentPage(1)
  }

  const hasActiveFilters = searchQuery.trim() !== '' || categoryFilter !== ''

  // ── card expand ───────────────────────────────────────────────
  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── edit ──────────────────────────────────────────────────────
  const handleEditSuccess = (updated: any) => {
    onFeedTypeUpdated(updated)
    setShowEditModal(false)
    setEditingFeedType(null)
  }

  // ── delete ────────────────────────────────────────────────────
  const handleDelete = (ft: any) => {
    setDeletingFeedType(ft)
    setDeleteError(null)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!deletingFeedType) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/feed/types/${deletingFeedType.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete feed type')
      }
      onFeedTypeDeleted(deletingFeedType.id)
      setShowDeleteDialog(false)
      setDeletingFeedType(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── render ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className={`font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
            Feed Types
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {feedTypes.length} feed type{feedTypes.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        {canManageFeed && (
          <Button onClick={onAddFeedType} size={isMobile ? 'sm' : 'default'}>
            <Package className="h-4 w-4 mr-2" />
            {isMobile ? 'Add' : 'Add Feed Type'}
          </Button>
        )}
      </div>

      {/* ── Search + Filter bar ── */}
      <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row items-center'}`}>
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            placeholder="Search by name, category or supplier…"
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setCurrentPage(1) }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1) }}
            className={`pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white ${isMobile ? 'w-full' : 'w-48'}`}
          >
            <option value="">All categories</option>
            {feedTypeCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.category_name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 whitespace-nowrap">
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* ── Results summary ── */}
      {hasActiveFilters && (
        <p className="text-xs text-gray-500">
          Showing {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {searchQuery && <> for <span className="font-medium text-gray-700">&ldquo;{searchQuery}&rdquo;</span></>}
          {categoryFilter && <> in <span className="font-medium text-gray-700">{getFeedCategory(categoryFilter)?.category_name}</span></>}
        </p>
      )}

      {/* ── Cards ── */}
      {paginated.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <Wheat className="h-12 w-12 text-gray-300" />
            <div>
              <p className="font-medium text-gray-700">
                {hasActiveFilters ? 'No feed types match your search' : 'No feed types yet'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {hasActiveFilters
                  ? 'Try adjusting your search or filter'
                  : 'Create your first feed type to get started'}
              </p>
            </div>
            {!hasActiveFilters && canManageFeed && (
              <Button className="mt-2" onClick={onAddFeedType}>
                <Package className="h-4 w-4 mr-2" />
                Add Feed Type
              </Button>
            )}
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3 h-[600px] overflow-y-auto pr-2">
          <div className="space-y-3">
            {paginated.map((ft: any) => {
            const cat       = getFeedCategory(ft.category_id)
            const isExpanded = expandedCards.has(ft.id)
            const nutrition  = getNutrition(ft)
            const supplier   = getSupplier(ft)
            const unit       = getUnitLabel(ft.preferred_measurement_unit || ft.unit_of_measure)
            const hasNutrition = hasAnyNutrition(nutrition)
            const animalCats: string[] = ft.animal_categories ?? []

            return (
              <Card key={ft.id} className="overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors">

                {/* ── Category colour bar ── */}
                {cat?.color && (
                  <div className="h-1 w-full" style={{ backgroundColor: cat.color }} />
                )}

                <CardContent className="p-0">
                  {/* ── Main row ── */}
                  <div className="flex items-start gap-3 p-4">

                    {/* Icon */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mt-0.5"
                      style={{ backgroundColor: cat?.color ? `${cat.color}20` : '#f3f4f6' }}
                    >
                      <Wheat
                        className="h-5 w-5"
                        style={{ color: cat?.color ?? '#9ca3af' }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className={`font-semibold text-gray-900 truncate ${isMobile ? 'text-sm' : 'text-base'}`}>
                            {ft.name}
                          </h4>
                          {cat && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: cat.color || '#9ca3af' }}
                              />
                              <span className="text-xs text-gray-500">{cat.category_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {ft.typical_cost_per_kg && (
                            <div className="text-right">
                              <div className={`font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-100 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                KSh {Number(ft.typical_cost_per_kg).toLocaleString()}/kg
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5 text-right">Market value (Per Kg)</div>
                            </div>
                          )}
                          {canManageFeed && (
                            isMobile ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditingFeedType(ft); setShowEditModal(true) }}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(ft)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <div className="flex items-center gap-1 ml-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700"
                                  onClick={() => { setEditingFeedType(ft); setShowEditModal(true) }}
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                                  onClick={() => handleDelete(ft)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {ft.description && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{ft.description}</p>
                      )}

                      {/* Stats pills */}
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {supplier && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                            <Truck className="h-3 w-3 text-gray-400" />
                            {supplier}
                          </span>
                        )}
                        {unit && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            <Ruler className="h-3 w-3 text-blue-400" />
                            {unit}
                          </span>
                        )}
                        {ft.low_stock_threshold != null && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                            <AlertTriangle className="h-3 w-3" />
                            Alert at {ft.low_stock_threshold} {getUnitLabel(ft.low_stock_threshold_unit) || 'kg'}
                          </span>
                        )}
                        {animalCats.slice(0, isMobile ? 1 : 2).map((catId: string) => {
                          const ac = animalCategories.find(a => a.id === catId)
                          return ac ? (
                            <Badge key={catId} variant="secondary" className="text-xs font-normal">
                              {ac.name}
                            </Badge>
                          ) : null
                        })}
                        {animalCats.length > (isMobile ? 1 : 2) && (
                          <Badge variant="outline" className="text-xs font-normal">
                            +{animalCats.length - (isMobile ? 1 : 2)} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Expand toggle — only if nutrition or extra animal cats ── */}
                  {(hasNutrition || animalCats.length > 0) && (
                    <>
                      <button
                        className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-t border-gray-100 transition-colors"
                        onClick={() => toggleExpand(ft.id)}
                      >
                        {isExpanded ? (
                          <><ChevronUp className="h-3 w-3" /> Hide details</>
                        ) : (
                          <><ChevronDown className="h-3 w-3" /> Show details</>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">

                          {/* Animal categories */}
                          {animalCats.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                <Tag className="h-3 w-3" /> Target Animal Categories
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {animalCats.map((catId: string) => {
                                  const ac = animalCategories.find(a => a.id === catId)
                                  return (
                                    <Badge key={catId} variant="outline" className="text-xs">
                                      {ac ? ac.name : catId}
                                    </Badge>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Nutrition */}
                          {hasNutrition && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                <FlaskConical className="h-3 w-3" /> Nutritional Data
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { key: 'protein_content', label: 'Protein', unit: '%' },
                                  { key: 'energy_content',  label: 'Energy',  unit: 'MJ/kg' },
                                  { key: 'fat_content',     label: 'Fat',     unit: '%' },
                                  { key: 'fiber_content',   label: 'Fiber',   unit: '%' },
                                ].filter(f => nutrition[f.key] != null).map(f => (
                                  <div key={f.key} className="bg-white rounded-md border border-gray-200 px-2.5 py-1.5 text-center">
                                    <div className="text-xs text-gray-400">{f.label}</div>
                                    <div className="text-sm font-semibold text-gray-800">
                                      {nutrition[f.key]}{f.unit}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length} feed types
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(safePage - 1)}
              disabled={safePage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers — show up to 5 pages centered around current */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((item, idx) =>
                item === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">…</span>
                ) : (
                  <Button
                    key={item}
                    variant={item === safePage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => changePage(item as number)}
                    className="h-8 w-8 p-0 text-xs"
                  >
                    {item}
                  </Button>
                )
              )
            }

            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(safePage + 1)}
              disabled={safePage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      <AddFeedTypeModal
        farmId={farmId}
        feedType={editingFeedType}
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingFeedType(null) }}
        onSuccess={handleEditSuccess}
        feedTypeCategories={feedTypeCategories}
        animalCategories={animalCategories}
        weightConversions={weightConversions}
      />

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feed Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">&ldquo;{deletingFeedType?.name}&rdquo;</span>?
              All stock history, transactions, and waste records for this feed type will also be removed.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {deleteError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => { setShowDeleteDialog(false); setDeletingFeedType(null); setDeleteError(null) }}
              disabled={deleteLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
