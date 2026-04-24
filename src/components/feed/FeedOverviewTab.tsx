'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Package, TrendingDown, AlertTriangle, Clock, Percent, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

const PAGE_SIZE = 10

interface FeedOverviewTabProps {
  feedStats: any
  feedTypes: any[]
  inventory: any[]
  consumptionRecords: any[]
  isMobile: boolean
  canManageFeed: boolean
  onAddFeedType: () => void
}

export function FeedOverviewTab({
  feedStats,
  feedTypes,
  inventory,
  consumptionRecords,
  isMobile,
  canManageFeed,
  onAddFeedType
}: FeedOverviewTabProps) {
  
  // Calculate enhanced stock information with dynamic percentage-based thresholds
  const enhancedStockLevels = useMemo(() => {
    if (!feedStats.stockLevels) return []
    
    return feedStats.stockLevels.map((stock: any) => {
      // Find the corresponding feed type to get threshold in kg
      const feedType = feedTypes.find(ft => ft.id === stock.feedType?.id)
      
      // Use feed type's threshold in kg, default to 50kg if not set
      const thresholdAmountKg = feedType?.low_stock_threshold || 50
      
      // Calculate consumption statistics for this feed type
      const feedConsumption = consumptionRecords.filter(record => 
        record.feed_type_id === stock.feedType?.id
      )
      
      // Calculate totals
      const totalFed = feedConsumption.reduce((sum, record) => sum + (record.quantity_kg || 0), 0)
      const feedingCount = feedConsumption.length
      
      // Calculate daily consumption rate and estimated end date
      let avgDailyConsumption = 0
      let estimatedEndDate = null
      let daysRemaining = null
      
      if (feedConsumption.length > 0) {
        // Get date range of consumption records
        const dates = feedConsumption.map(record => new Date(record.feeding_time)).sort()
        const oldestDate = dates[0]
        const newestDate = dates[dates.length - 1]
        const daysDifference = Math.max(1, Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)))
        
        // Calculate average daily consumption
        avgDailyConsumption = totalFed / daysDifference
        
        // Calculate days remaining and estimated end date
        if (avgDailyConsumption > 0) {
          daysRemaining = Math.floor(stock.currentStock / avgDailyConsumption)
          const endDate = new Date()
          endDate.setDate(endDate.getDate() + daysRemaining)
          estimatedEndDate = endDate
        }
      }
      
      // Calculate original stock (current + consumed)
      const originalStock = stock.currentStock + totalFed
      
      // Calculate threshold percentage based on original stock
      const thresholdPercentage = originalStock > 0 ? (thresholdAmountKg / originalStock) * 100 : 0
      
      // Calculate consumption percentage of original stock
      const consumptionPercentage = originalStock > 0 ? (totalFed / originalStock) * 100 : 0
      
      // Calculate remaining percentage of original stock
      const remainingPercentage = originalStock > 0 ? (stock.currentStock / originalStock) * 100 : 0
      
      // Determine status based on current stock vs threshold amount in kg
      let status = 'good'
      let statusColor = 'text-green-600'
      let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline'
      
      // Critical if remaining is less than 50% of threshold amount
      if (stock.currentStock < (thresholdAmountKg * 0.5)) {
        status = 'critical'
        statusColor = 'text-red-600'
        badgeVariant = 'destructive'
      } 
      // Low if remaining is less than the threshold amount
      else if (stock.currentStock < thresholdAmountKg) {
        status = 'low'
        statusColor = 'text-orange-600'
        badgeVariant = 'destructive'
      }
      
      return {
        ...stock,
        feedType: stock.feedType,
        thresholdAmountKg,
        thresholdPercentage,
        totalFed,
        feedingCount,
        originalStock,
        consumptionPercentage,
        remainingPercentage,
        avgDailyConsumption,
        daysRemaining,
        estimatedEndDate,
        status,
        statusColor,
        badgeVariant
      }
    })
  }, [feedStats.stockLevels, feedTypes, consumptionRecords])

  // ── Search / filter / pagination state ────────────────────────────────────
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'good' | 'low' | 'critical'>('all')
  const [page, setPage]           = useState(1)

  const filteredStockLevels = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enhancedStockLevels.filter((s: any) => {
      const nameMatch = !q || (s.feedType?.name ?? '').toLowerCase().includes(q)
      const statusMatch = statusFilter === 'all' || s.status === statusFilter
      return nameMatch && statusMatch
    })
  }, [enhancedStockLevels, search, statusFilter])

  const totalPages  = Math.max(1, Math.ceil(filteredStockLevels.length / PAGE_SIZE))
  const safePage    = Math.min(page, totalPages)
  const pagedStocks = filteredStockLevels.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Reset to page 1 whenever filters change
  const handleSearch = (v: string) => { setSearch(v); setPage(1) }
  const handleFilter = (v: typeof statusFilter) => { setStatusFilter(v); setPage(1) }

  const getStatusBadge = (stockItem: any) => {
    if (stockItem.status === 'critical') {
      return <Badge variant="destructive" className="text-xs mt-1">Critical</Badge>
    }
    if (stockItem.status === 'low') {
      return <Badge variant="destructive" className="text-xs mt-1">Low Stock</Badge>
    }
    return <Badge variant="outline" className="text-xs mt-1 text-green-600">Good</Badge>
  }

  const getStockIndicator = (stockItem: any) => {
    if (stockItem.status === 'critical') {
      return <AlertTriangle className="w-4 h-4 text-red-500" />
    }
    if (stockItem.status === 'low') {
      return <TrendingDown className="w-4 h-4 text-orange-500" />
    }
    return null
  }

  return (
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

        {/* Search + filter bar */}
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
            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green"
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
              {/* Header Row */}
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

              {/* Stock Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Stock Level Progress</span>
                  <span className="font-medium">
                    {stock.remainingPercentage.toFixed(1)}% of original remaining
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 relative">
                  {/* Remaining stock bar */}
                  <div
                    className={`h-3 rounded-full ${
                      stock.status === 'critical' ? 'bg-red-500' :
                      stock.status === 'low' ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min(100, Math.max(0, stock.remainingPercentage))}%` 
                    }}
                  />
                  {/* Threshold indicator line */}
                  <div 
                    className="absolute top-0 w-0.5 bg-red-600 opacity-70 h-3"
                    style={{ 
                      left: `${Math.min(95, Math.max(5, stock.thresholdPercentage))}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>
                    Threshold: {stock.thresholdAmountKg}kg ({stock.thresholdPercentage.toFixed(1)}%)
                  </span>
                  <span>Original: {stock.originalStock.toFixed(1)}kg</span>
                </div>
              </div>

              {/* Stats Row */}
              <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-5'} gap-3 pt-3 border-t border-gray-100`}>
                {/* Threshold Analysis */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <Percent className="w-3 h-3 text-gray-400" />
                    <div className="text-xs text-gray-500">Threshold</div>
                  </div>
                  <div className="text-sm font-medium">
                    {stock.thresholdAmountKg}kg
                  </div>
                  <div className="text-xs text-gray-500">
                    {stock.thresholdPercentage.toFixed(1)}% of original
                  </div>
                </div>

                {/* Total Consumption */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <Package className="w-3 h-3 text-gray-400" />
                    <div className="text-xs text-gray-500">Consumed</div>
                  </div>
                  <div className="text-sm font-medium">
                    {stock.totalFed.toFixed(1)}kg
                  </div>
                  <div className="text-xs text-gray-500">
                    {stock.consumptionPercentage.toFixed(1)}% of original
                  </div>
                </div>

                {/* Feeding Sessions - Show on mobile */}
                {isMobile && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <div className="text-xs text-gray-500">Sessions</div>
                    </div>
                    <div className="text-sm font-medium">
                      {stock.feedingCount}
                    </div>
                    <div className="text-xs text-gray-500">
                      {stock.feedingCount > 0 ? `${(stock.totalFed / stock.feedingCount).toFixed(1)}kg avg` : 'No feedings'}
                    </div>
                  </div>
                )}

                {/* Estimated End Date - Show on mobile */}
                {isMobile && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1">
                      <div className="text-xs text-gray-500">Est. End</div>
                    </div>
                    <div className="text-sm font-medium">
                      {stock.estimatedEndDate ? 
                        stock.estimatedEndDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) :
                        'N/A'
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      {stock.daysRemaining !== null ? 
                        `${stock.daysRemaining} days` : 
                        'No data'
                      }
                    </div>
                  </div>
                )}

                {/* Desktop columns */}
                {!isMobile && (
                  <>
                    {/* Feeding Sessions */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <div className="text-xs text-gray-500">Sessions</div>
                      </div>
                      <div className="text-sm font-medium">
                        {stock.feedingCount}
                      </div>
                      <div className="text-xs text-gray-500">
                        {stock.feedingCount > 0 ? `${(stock.totalFed / stock.feedingCount).toFixed(1)}kg avg` : 'No feedings'}
                      </div>
                    </div>

                    {/* Daily Consumption Rate */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        <div className="text-xs text-gray-500">Daily Rate</div>
                      </div>
                      <div className="text-sm font-medium">
                        {stock.avgDailyConsumption > 0 ? 
                          `${stock.avgDailyConsumption.toFixed(1)}kg` : 
                          '0kg'
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        {stock.avgDailyConsumption > 0 ? 'Average daily' : 'No consumption'}
                      </div>
                    </div>

                    {/* Estimated End Date */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        <div className="text-xs text-gray-500">Estimated End</div>
                      </div>
                      <div className={`text-sm font-medium ${
                        stock.daysRemaining !== null && stock.daysRemaining < 7 ? 'text-red-600' :
                        stock.daysRemaining !== null && stock.daysRemaining < 14 ? 'text-orange-600' :
                        'text-gray-900'
                      }`}>
                        {stock.estimatedEndDate ? 
                          stock.estimatedEndDate.toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: 'short',
                            year: '2-digit'
                          }) :
                          'N/A'
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        {stock.daysRemaining !== null ? 
                          `${stock.daysRemaining} days left` : 
                          'No consumption data'
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Calculation Breakdown */}
              <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                <div className="font-medium text-gray-700 mb-1">Threshold Calculation:</div>
                <div className="text-gray-600">
                  {stock.thresholdAmountKg}kg threshold ÷ {stock.originalStock.toFixed(1)}kg original = {stock.thresholdPercentage.toFixed(1)}% of original stock
                </div>
              </div>

              {/* End Date Warning */}
              {stock.estimatedEndDate && stock.daysRemaining !== null && stock.daysRemaining < 30 && (
                <div className={`mt-3 p-3 rounded-lg border ${
                  stock.daysRemaining < 7 ? 'border-red-200 bg-red-50' :
                  stock.daysRemaining < 14 ? 'border-orange-200 bg-orange-50' :
                  'border-yellow-200 bg-yellow-50'
                }`}>
                  <div className="flex items-center space-x-2 text-xs">
                    <AlertTriangle className={`w-3 h-3 ${
                      stock.daysRemaining < 7 ? 'text-red-500' :
                      stock.daysRemaining < 14 ? 'text-orange-500' :
                      'text-yellow-500'
                    }`} />
                    <span className={`font-medium ${
                      stock.daysRemaining < 7 ? 'text-red-700' :
                      stock.daysRemaining < 14 ? 'text-orange-700' :
                      'text-yellow-700'
                    }`}>
                      {stock.daysRemaining < 7 ? 'Urgent:' :
                       stock.daysRemaining < 14 ? 'Warning:' :
                       'Notice:'
                      } Stock running low
                    </span>
                  </div>
                  <div className={`text-xs mt-1 ${
                    stock.daysRemaining < 7 ? 'text-red-600' :
                    stock.daysRemaining < 14 ? 'text-orange-600' :
                    'text-yellow-600'
                  }`}>
                    At current consumption rate ({stock.avgDailyConsumption.toFixed(1)}kg/day), 
                    this feed will run out on {stock.estimatedEndDate.toLocaleDateString('en-GB', { 
                      weekday: 'short',
                      day: 'numeric', 
                      month: 'short'
                    })} ({stock.daysRemaining} days remaining)
                  </div>
                </div>
              )}

              {/* No consumption data notice */}
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

              {/* Status Message */}
              {stock.status !== 'good' && (
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-2 text-xs">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span className="text-red-700">
                      {stock.status === 'critical' ? 
                        `Critical: Only ${stock.currentStock.toFixed(1)}kg remaining, well below ${stock.thresholdAmountKg}kg threshold` :
                        `Low stock: ${stock.currentStock.toFixed(1)}kg remaining, below ${stock.thresholdAmountKg}kg threshold`
                      }
                    </span>
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    Need {Math.abs(stock.thresholdAmountKg - stock.currentStock).toFixed(1)}kg to reach safe threshold level
                  </div>
                </div>
              )}

              {/* Good status message */}
              {stock.status === 'good' && (
                <div className="mt-3 pt-2 border-t border-green-100">
                  <div className="flex items-center space-x-2 text-xs text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>
                      Stock level healthy: {stock.currentStock.toFixed(1)}kg remaining, {(stock.currentStock - stock.thresholdAmountKg).toFixed(1)}kg above {stock.thresholdAmountKg}kg threshold
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Empty states */}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Page {safePage} of {totalPages} · {filteredStockLevels.length} record{filteredStockLevels.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
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
                variant="outline"
                size="sm"
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
  )
}