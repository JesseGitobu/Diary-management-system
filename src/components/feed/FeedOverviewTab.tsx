'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  Package, TrendingDown, AlertTriangle, Clock, Percent, Search, ChevronLeft, ChevronRight,
  ShoppingCart, BarChart3, Wheat, Zap, FlaskConical, BookOpen, Trash2, ArrowRight, Loader2, ChevronDown,
} from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'

const PAGE_SIZE = 10

interface WasteRecord {
  id: string
  waste_kg: number
  waste_date: string
}

interface FeedOverviewTabProps {
  feedStats: any
  feedTypes: any[]
  inventory: any[]
  consumptionRecords: any[]
  isMobile: boolean
  canManageFeed: boolean
  onAddFeedType: () => void
  onAddInventory: () => void
  farmId: string
  feedMixRecipes: any[]
  onTabChange: (tab: string) => void
}

export function FeedOverviewTab({
  feedStats,
  feedTypes,
  inventory,
  consumptionRecords,
  isMobile,
  canManageFeed,
  onAddFeedType,
  onAddInventory,
  farmId,
  feedMixRecipes,
  onTabChange,
}: FeedOverviewTabProps) {

  const { isSmallMobile, isTablet, isDesktop } = useDeviceInfo()

  // ── Fetched summaries (waste + rations) ─────────────────────────────────
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([])
  const [rationsData, setRationsData]   = useState<any[]>([])
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [alertsCollapsed, setAlertsCollapsed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchSummaries() {
      setSummaryLoading(true)
      try {
        const [wasteRes, rationsRes] = await Promise.all([
          fetch(`/api/farms/${farmId}/feed-waste?limit=100`),
          fetch(`/api/farms/${farmId}/feed-rations`),
        ])
        if (cancelled) return
        if (wasteRes.ok) {
          const json = await wasteRes.json()
          setWasteRecords(json.records ?? [])
        }
        if (rationsRes.ok) {
          const json = await rationsRes.json()
          setRationsData(json.data ?? [])
        }
      } finally {
        if (!cancelled) setSummaryLoading(false)
      }
    }
    fetchSummaries()
    return () => { cancelled = true }
  }, [farmId])

  // ── Derived summary values ───────────────────────────────────────────────
  const thirtyDaysAgo = useMemo(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), [])

  const recentConsumption = useMemo(() =>
    consumptionRecords.filter(r => new Date(r.feeding_time) >= thirtyDaysAgo)
  , [consumptionRecords, thirtyDaysAgo])

  const totalConsumedKgAllTime = useMemo(() =>
    consumptionRecords.reduce((s, r) => s + (r.quantity_kg || 0), 0)
  , [consumptionRecords])

  const totalStockValue = useMemo(() =>
    (feedStats.stockLevels ?? []).reduce((sum: number, s: any) =>
      sum + (s.currentStock * (s.avgCostPerKg || 0)), 0)
  , [feedStats.stockLevels])

  const uniqueCategories = useMemo(() =>
    new Set(feedTypes.map((f: any) => f.category_id).filter(Boolean)).size
  , [feedTypes])

  const withNutrition = useMemo(() =>
    feedTypes.filter((f: any) => {
      const ni = f.nutritional_info
      return ni && typeof ni === 'object' && Object.keys(ni).length > 0
    })
  , [feedTypes])

  const nutritionCoverage = feedTypes.length > 0
    ? Math.round((withNutrition.length / feedTypes.length) * 100)
    : 0

  const recentWaste = useMemo(() =>
    wasteRecords.filter(r => new Date(r.waste_date) >= thirtyDaysAgo)
  , [wasteRecords, thirtyDaysAgo])

  const totalWasteKg = useMemo(() =>
    recentWaste.reduce((s, r) => s + (r.waste_kg || 0), 0)
  , [recentWaste])

  const totalAssignments = useMemo(() =>
    rationsData.reduce((s: number, r: any) => s + (r.assignment_count || 0), 0)
  , [rationsData])

  const stockCount = (feedStats.stockLevels ?? []).length

  // ── Summary panel definitions ────────────────────────────────────────────
  const summaryPanels = useMemo(() => [
    {
      id: 'inventory',
      title: 'Inventory',
      Icon: ShoppingCart,
      borderColor: 'border-l-blue-400',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      metric: `${stockCount} feed${stockCount !== 1 ? 's' : ''} in stock`,
      sub: `KSh ${totalStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} est. value`,
      tab: 'inventory',
      loading: false,
    },
    {
      id: 'consumption',
      title: 'Consumption',
      Icon: BarChart3,
      borderColor: 'border-l-green-400',
      bg: 'bg-green-50',
      iconColor: 'text-green-600',
      metric: `${recentConsumption.length} session${recentConsumption.length !== 1 ? 's' : ''} (30d)`,
      sub: `${totalConsumedKgAllTime.toFixed(1)}kg consumed total`,
      tab: 'consumption',
      loading: false,
    },
    {
      id: 'types',
      title: 'Feed Types',
      Icon: Wheat,
      borderColor: 'border-l-amber-400',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      metric: `${feedTypes.length} type${feedTypes.length !== 1 ? 's' : ''} registered`,
      sub: `Across ${uniqueCategories} categor${uniqueCategories !== 1 ? 'ies' : 'y'}`,
      tab: 'types',
      loading: false,
    },
    {
      id: 'nutrition',
      title: 'Nutrition',
      Icon: Zap,
      borderColor: 'border-l-purple-400',
      bg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      metric: `${withNutrition.length} / ${feedTypes.length} types with data`,
      sub: `${nutritionCoverage}% nutritional coverage`,
      tab: 'nutrition',
      loading: false,
    },
    {
      id: 'recipes',
      title: 'TMR Recipes',
      Icon: FlaskConical,
      borderColor: 'border-l-indigo-400',
      bg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      metric: `${feedMixRecipes.length} recipe${feedMixRecipes.length !== 1 ? 's' : ''} defined`,
      sub: feedMixRecipes.length > 0 ? 'Ready for ration assignment' : 'No recipes created yet',
      tab: 'recipes',
      loading: false,
    },
    {
      id: 'rations',
      title: 'Feed Rations',
      Icon: BookOpen,
      borderColor: 'border-l-teal-400',
      bg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      metric: `${rationsData.length} ration${rationsData.length !== 1 ? 's' : ''} defined`,
      sub: `${totalAssignments} active assignment${totalAssignments !== 1 ? 's' : ''}`,
      tab: 'rations',
      loading: summaryLoading,
    },
    {
      id: 'waste',
      title: 'Feed Waste',
      Icon: Trash2,
      borderColor: 'border-l-red-400',
      bg: 'bg-red-50',
      iconColor: 'text-red-500',
      metric: `${totalWasteKg.toFixed(1)}kg wasted (30d)`,
      sub: `${recentWaste.length} event${recentWaste.length !== 1 ? 's' : ''} recorded`,
      tab: 'waste',
      loading: summaryLoading,
    },
  ], [
    stockCount, totalStockValue,
    recentConsumption, totalConsumedKgAllTime,
    feedTypes, uniqueCategories,
    withNutrition, nutritionCoverage,
    feedMixRecipes,
    rationsData, totalAssignments,
    recentWaste, totalWasteKg,
    summaryLoading,
  ])

  // ── Enhanced stock levels (unchanged logic) ──────────────────────────────
  const enhancedStockLevels = useMemo(() => {
    if (!feedStats.stockLevels) {
      return []
    }

    const result = feedStats.stockLevels.map((stock: any) => {
      const feedType = feedTypes.find(ft => ft.id === stock.feedType?.id)
      const thresholdAmountKg = feedType?.low_stock_threshold || 50

      const feedConsumption = consumptionRecords.filter(record =>
        record.feed_type_id === stock.feedType?.id
      )

      const totalFed = feedConsumption.reduce((sum, record) => sum + (record.quantity_consumed || 0), 0)
      const feedingCount = feedConsumption.length

      let avgDailyConsumption = 0
      let estimatedEndDate = null
      let daysRemaining = null

      if (feedConsumption.length > 0) {
        const dates = feedConsumption.map(record => new Date(record.feeding_time)).sort()
        const oldestDate = dates[0]
        const newestDate = dates[dates.length - 1]
        const daysDifference = Math.max(1, Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)))
        avgDailyConsumption = totalFed / daysDifference

        if (avgDailyConsumption > 0) {
          daysRemaining = Math.floor(stock.currentStock / avgDailyConsumption)
          const endDate = new Date()
          endDate.setDate(endDate.getDate() + daysRemaining)
          estimatedEndDate = endDate
        }
      }

      const originalStock = stock.currentStock + totalFed
      const thresholdPercentage = originalStock > 0 ? (thresholdAmountKg / originalStock) * 100 : 0
      const consumptionPercentage = originalStock > 0 ? (totalFed / originalStock) * 100 : 0
      const remainingPercentage = originalStock > 0 ? (stock.currentStock / originalStock) * 100 : 0

      let status = 'good'
      let statusColor = 'text-green-600'
      let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline'

      if (stock.currentStock < thresholdAmountKg * 0.5) {
        status = 'critical'; statusColor = 'text-red-600'; badgeVariant = 'destructive'
      } else if (stock.currentStock < thresholdAmountKg) {
        status = 'low'; statusColor = 'text-orange-600'; badgeVariant = 'destructive'
      }

      return {
        ...stock,
        feedType: stock.feedType,
        thresholdAmountKg, thresholdPercentage,
        totalFed, feedingCount,
        originalStock, consumptionPercentage, remainingPercentage,
        avgDailyConsumption, daysRemaining, estimatedEndDate,
        status, statusColor, badgeVariant,
      }
    })

    return result
  }, [feedStats.stockLevels, feedTypes, consumptionRecords])

  // ── Alert counts derived from already-computed stock levels ─────────────
  const alertCounts = useMemo(() => {
    const critical = enhancedStockLevels.filter((s: any) => s.status === 'critical').length
    const low      = enhancedStockLevels.filter((s: any) => s.status === 'low').length
    return { critical, low, total: critical + low }
  }, [enhancedStockLevels])

  // ── Search / filter / pagination ─────────────────────────────────────────
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'good' | 'low' | 'critical'>('all')
  const [page, setPage]                 = useState(1)

  const filteredStockLevels = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enhancedStockLevels.filter((s: any) => {
      const nameMatch   = !q || (s.feedType?.name ?? '').toLowerCase().includes(q)
      const statusMatch = statusFilter === 'all' || s.status === statusFilter
      return nameMatch && statusMatch
    })
  }, [enhancedStockLevels, search, statusFilter])

  const totalPages  = Math.max(1, Math.ceil(filteredStockLevels.length / PAGE_SIZE))
  const safePage    = Math.min(page, totalPages)
  const pagedStocks = filteredStockLevels.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleSearch = (v: string) => { setSearch(v); setPage(1) }
  const handleFilter = (v: typeof statusFilter) => { setStatusFilter(v); setPage(1) }

  const getStatusBadge = (stockItem: any) => {
    if (stockItem.status === 'critical') return <Badge variant="destructive" className="text-xs mt-1">Critical</Badge>
    if (stockItem.status === 'low')      return <Badge variant="destructive" className="text-xs mt-1">Low Stock</Badge>
    return <Badge variant="outline" className="text-xs mt-1 text-green-600">Good</Badge>
  }

  const getStockIndicator = (stockItem: any) => {
    if (stockItem.status === 'critical') return <AlertTriangle className="w-4 h-4 text-red-500" />
    if (stockItem.status === 'low')      return <TrendingDown className="w-4 h-4 text-orange-500" />
    return null
  }

  return (
    <div className="space-y-6">

      {/* ── At-a-glance summary grid ─────────────────────────────────────── */}
      <div>
        <h2 className={`font-semibold text-gray-800 mb-3 ${isMobile ? 'text-sm' : 'text-base'}`}>
          Feed Management at a Glance
        </h2>
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="flex gap-3 md:grid md:grid-cols-3 xl:grid-cols-4">
            {summaryPanels.map(({ id, title, Icon, borderColor, bg, iconColor, metric, sub, tab, loading }) => (
              <button
                key={id}
                onClick={() => onTabChange(tab)}
                className={`
                  flex-shrink-0 w-40 md:w-auto
                  text-left rounded-lg border border-l-4 ${borderColor} ${bg}
                  p-3 hover:shadow-md transition-shadow group
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className={`w-3.5 h-3.5 ${iconColor} flex-shrink-0`} />
                    <span className="text-xs font-medium text-gray-600 truncate">{title}</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors ml-1" />
                </div>
                {loading ? (
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-xs">Loading…</span>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold text-gray-900 leading-snug text-sm">
                      {metric}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{sub}</p>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stock Alerts banner ──────────────────────────────────────────── */}
      {alertCounts.total > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-yellow-800 text-base">
                <AlertTriangle className="h-4 w-4" />
                <span>Stock Alerts ({alertCounts.total})</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                {canManageFeed && !isMobile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddInventory}
                    className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
                  >
                    <Package className="w-4 h-4 mr-1" />
                    Add Stock
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setAlertsCollapsed(c => !c)}
                  className="p-1 rounded text-yellow-700 hover:bg-yellow-100 transition-colors"
                  aria-label={alertsCollapsed ? 'Expand alerts' : 'Collapse alerts'}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${alertsCollapsed ? '-rotate-90' : ''}`} />
                </button>
              </div>
            </div>
            <CardDescription className="text-yellow-700">
              {alertCounts.critical} critical alert{alertCounts.critical !== 1 ? 's' : ''},{' '}
              {alertCounts.low} low stock warning{alertCounts.low !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          {!alertsCollapsed && (
            <CardContent>
              <div className={isMobile ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-3 gap-4'}>
                {feedStats.stockLevels
                  ?.filter((stock: any) => {
                    const feedType = feedTypes.find(ft => ft.id === stock.feedType?.id || ft.id === stock.feed_type_id)
                    if (!feedType) return false
                    const threshold = feedType.low_stock_threshold || 50
                    return stock.currentStock < threshold
                  })
                  .map((item: any, index: number) => {
                    const feedType = feedTypes.find(ft => ft.id === item.feedType?.id || ft.id === item.feed_type_id)
                    const threshold = feedType?.low_stock_threshold || 50
                    const percentageRemaining = ((item.currentStock / threshold) * 100).toFixed(0)
                    const isCritical = item.currentStock <= threshold * 0.5
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border-l-4 border-red-400">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.feedType?.name || 'Unknown Feed'}</p>
                          <p className="text-xs text-gray-600">
                            {item.currentStock.toFixed(1)}kg remaining of {threshold}kg threshold
                          </p>
                          <p className="text-xs text-red-600 font-medium">
                            {percentageRemaining}% of minimum stock level
                          </p>
                        </div>
                        <div className="ml-2 text-right flex-shrink-0">
                          <Badge variant="destructive" className="text-xs mb-1">
                            {isCritical ? 'Critical' : 'Low Stock'}
                          </Badge>
                          <div className="text-xs text-gray-500">
                            Need: {Math.max(0, threshold - item.currentStock).toFixed(1)}kg
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Stock levels detail card ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Stock Levels & Consumption Tracking</CardTitle>
              <CardDescription className={isMobile ? 'text-sm' : ''}>
                Feed inventory with dynamic threshold calculation based on original stock quantity
              </CardDescription>
            </div>
            {enhancedStockLevels.some((stock: any) => stock.status !== 'good') && (
              <div className="flex items-center space-x-1 text-orange-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {enhancedStockLevels.filter((stock: any) => stock.status !== 'good').length} Alerts
                </span>
              </div>
            )}
          </div>

          <div className={`flex gap-2 mt-3 ${isMobile ? 'flex-col' : 'flex-row items-center'}`}>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <Input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by feed name…"
                className="pl-8 h-9 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => handleFilter(e.target.value as typeof statusFilter)}
              className="h-9 flex-shrink-0 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green"
            >
              <option value="all">All statuses</option>
              <option value="good">Good</option>
              <option value="low">Low stock</option>
              <option value="critical">Critical</option>
            </select>
            <span className="text-xs text-gray-500 whitespace-nowrap self-center">
              {filteredStockLevels.length} result{filteredStockLevels.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {pagedStocks.map((stock: any, index: number) => (
              <div
                key={index}
                className={`border rounded-lg ${
                  stock.status !== 'good' ? 'border-l-4 border-l-red-400 bg-red-50' : 'bg-white'
                } ${isMobile ? 'p-3' : 'p-4'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {getStockIndicator(stock)}
                      <h4 className={`font-medium ${isMobile ? 'text-sm' : 'text-base'} truncate`}>
                        {stock.feedType?.name}
                      </h4>
                    </div>
                    <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'} truncate`}>
                      {stock.feedType?.description || 'No description'}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`font-bold ${isMobile ? 'text-base' : 'text-lg'} ${stock.statusColor}`}>
                      {stock.currentStock.toFixed(1)}kg
                    </p>
                    <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      KSh{stock.avgCostPerKg.toFixed(2)}/kg
                    </p>
                    {getStatusBadge(stock)}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Stock Level Progress</span>
                    <span className="font-medium">
                      {stock.remainingPercentage.toFixed(1)}% of original remaining
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 relative">
                    <div
                      className={`h-3 rounded-full ${
                        stock.status === 'critical' ? 'bg-red-500' :
                        stock.status === 'low' ? 'bg-orange-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, stock.remainingPercentage))}%` }}
                    />
                    <div
                      className="absolute top-0 w-0.5 bg-red-600 opacity-70 h-3"
                      style={{
                        left: `${Math.min(95, Math.max(5, stock.thresholdPercentage))}%`,
                        transform: 'translateX(-50%)',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <span>Threshold: {stock.thresholdAmountKg}kg ({stock.thresholdPercentage.toFixed(1)}%)</span>
                    <span>Original: {stock.originalStock.toFixed(1)}kg</span>
                  </div>
                </div>

                {/* Stats grid — 4-tier responsive columns */}
                <div className={`grid gap-3 pt-3 border-t border-gray-100 ${
                  isSmallMobile ? 'grid-cols-2' :
                  isMobile     ? 'grid-cols-2' :
                  isTablet     ? 'grid-cols-3' :
                                 'grid-cols-5'
                }`}>
                  {/* Threshold — always visible */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1">
                      <Percent className="w-3 h-3 text-gray-400" />
                      <div className="text-xs text-gray-500">Threshold</div>
                    </div>
                    <div className="text-sm font-medium">{stock.thresholdAmountKg}kg</div>
                    <div className="text-xs text-gray-500">{stock.thresholdPercentage.toFixed(1)}% of original</div>
                  </div>

                  {/* Consumed — always visible */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1">
                      <Package className="w-3 h-3 text-gray-400" />
                      <div className="text-xs text-gray-500">Consumed</div>
                    </div>
                    <div className="text-sm font-medium">{stock.totalFed.toFixed(1)}kg</div>
                    <div className="text-xs text-gray-500">{stock.consumptionPercentage.toFixed(1)}% of original</div>
                  </div>

                  {/* Sessions — mobile and up */}
                  {!isSmallMobile && (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <div className="text-xs text-gray-500">Sessions</div>
                      </div>
                      <div className="text-sm font-medium">{stock.feedingCount}</div>
                      <div className="text-xs text-gray-500">
                        {stock.feedingCount > 0
                          ? `${(stock.totalFed / stock.feedingCount).toFixed(1)}kg avg`
                          : 'No feedings'}
                      </div>
                    </div>
                  )}

                  {/* Daily Rate — tablet and desktop */}
                  {(isTablet || isDesktop) && (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Daily Rate</div>
                      <div className="text-sm font-medium">
                        {stock.avgDailyConsumption > 0 ? `${stock.avgDailyConsumption.toFixed(1)}kg` : '0kg'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {stock.avgDailyConsumption > 0 ? 'Average daily' : 'No consumption'}
                      </div>
                    </div>
                  )}

                  {/* Estimated End — all except small mobile */}
                  {!isSmallMobile && (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">
                        {isMobile ? 'Est. End' : 'Estimated End'}
                      </div>
                      <div className={`text-sm font-medium ${
                        stock.daysRemaining !== null && stock.daysRemaining < 7  ? 'text-red-600' :
                        stock.daysRemaining !== null && stock.daysRemaining < 14 ? 'text-orange-600' :
                        'text-gray-900'
                      }`}>
                        {stock.estimatedEndDate
                          ? stock.estimatedEndDate.toLocaleDateString('en-GB', {
                              day: '2-digit', month: 'short',
                              ...(isMobile ? {} : { year: '2-digit' }),
                            })
                          : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {stock.daysRemaining !== null
                          ? `${stock.daysRemaining} day${stock.daysRemaining !== 1 ? 's' : ''} left`
                          : 'No data'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Threshold calculation — hidden on small mobile to save space */}
                {!isSmallMobile && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                    <div className="font-medium text-gray-700 mb-1">Threshold Calculation:</div>
                    <div className="text-gray-600">
                      {stock.thresholdAmountKg}kg ÷ {stock.originalStock.toFixed(1)}kg original = {stock.thresholdPercentage.toFixed(1)}% of original stock
                    </div>
                  </div>
                )}

                {stock.estimatedEndDate && stock.daysRemaining !== null && stock.daysRemaining < 30 && (
                  <div className={`mt-3 p-3 rounded-lg border ${
                    stock.daysRemaining < 7  ? 'border-red-200 bg-red-50' :
                    stock.daysRemaining < 14 ? 'border-orange-200 bg-orange-50' :
                    'border-yellow-200 bg-yellow-50'
                  }`}>
                    <div className="flex items-center space-x-2 text-xs">
                      <AlertTriangle className={`w-3 h-3 ${
                        stock.daysRemaining < 7  ? 'text-red-500' :
                        stock.daysRemaining < 14 ? 'text-orange-500' : 'text-yellow-500'
                      }`} />
                      <span className={`font-medium ${
                        stock.daysRemaining < 7  ? 'text-red-700' :
                        stock.daysRemaining < 14 ? 'text-orange-700' : 'text-yellow-700'
                      }`}>
                        {stock.daysRemaining < 7 ? 'Urgent:' : stock.daysRemaining < 14 ? 'Warning:' : 'Notice:'} Stock running low
                      </span>
                    </div>
                    <div className={`text-xs mt-1 ${
                      stock.daysRemaining < 7  ? 'text-red-600' :
                      stock.daysRemaining < 14 ? 'text-orange-600' : 'text-yellow-600'
                    }`}>
                      At current consumption rate ({stock.avgDailyConsumption.toFixed(1)}kg/day),
                      this feed will run out on {stock.estimatedEndDate.toLocaleDateString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'short',
                      })} ({stock.daysRemaining} days remaining)
                    </div>
                  </div>
                )}

                {(!stock.estimatedEndDate || stock.feedingCount === 0) && (
                  <div className="mt-3 p-2 bg-blue-50 rounded text-xs border border-blue-200">
                    <div className="text-blue-700">
                      <div className="font-medium">No consumption pattern available</div>
                      <div className="mt-1">
                        Start recording feeding sessions to get accurate stock depletion estimates and better inventory planning.
                      </div>
                    </div>
                  </div>
                )}

                {stock.status !== 'good' && (
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-2 text-xs">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="text-red-700">
                        {stock.status === 'critical'
                          ? `Critical: Only ${stock.currentStock.toFixed(1)}kg remaining, well below ${stock.thresholdAmountKg}kg threshold`
                          : `Low stock: ${stock.currentStock.toFixed(1)}kg remaining, below ${stock.thresholdAmountKg}kg threshold`}
                      </span>
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      Need {Math.abs(stock.thresholdAmountKg - stock.currentStock).toFixed(1)}kg to reach safe threshold level
                    </div>
                  </div>
                )}

                {stock.status === 'good' && (
                  <div className="mt-3 pt-2 border-t border-green-100">
                    <div className="flex items-center space-x-2 text-xs text-green-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span>
                        Stock level healthy: {stock.currentStock.toFixed(1)}kg remaining,{' '}
                        {(stock.currentStock - stock.thresholdAmountKg).toFixed(1)}kg above {stock.thresholdAmountKg}kg threshold
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {enhancedStockLevels.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                <h3 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
                  No inventory data
                </h3>
                <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} mt-1`}>
                  Start by adding feed types and inventory to track consumption patterns.
                </p>
                {canManageFeed && (
                  <div className="mt-4">
                    <Button onClick={onAddFeedType} size={isMobile ? 'sm' : 'default'}>
                      Add Feed Type
                    </Button>
                  </div>
                )}
              </div>
            )}

            {enhancedStockLevels.length > 0 && filteredStockLevels.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                No stock levels match your search or filter.
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Page {safePage} of {totalPages} · {filteredStockLevels.length} record{filteredStockLevels.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                  .reduce<(number | '…')[]>((acc, n, i, arr) => {
                    if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('…')
                    acc.push(n)
                    return acc
                  }, [])
                  .map((n, i) =>
                    n === '…' ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm">…</span>
                    ) : (
                      <Button
                        key={n}
                        variant={n === safePage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(n as number)}
                        className="h-8 w-8 p-0 text-xs"
                      >
                        {n}
                      </Button>
                    )
                  )}
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
