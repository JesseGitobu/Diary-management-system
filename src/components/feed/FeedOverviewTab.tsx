'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Package, TrendingDown, AlertTriangle, Clock, Users } from 'lucide-react'
import { useMemo } from 'react'

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
  
  // Calculate enhanced stock information with consumption data
  const enhancedStockLevels = useMemo(() => {
    if (!feedStats.stockLevels) return []
    
    return feedStats.stockLevels.map((stock: any) => {
      // Find the corresponding feed type to get threshold
      const feedType = feedTypes.find(ft => ft.id === stock.feedType?.id)
      const threshold = feedType?.low_stock_threshold || 50
      
      // Calculate consumption statistics for this feed type
      const feedConsumption = consumptionRecords.filter(record => 
        record.feed_type_id === stock.feedType?.id
      )
      
      // Calculate totals
      const totalFed = feedConsumption.reduce((sum, record) => sum + (record.quantity_kg || 0), 0)
      const feedingCount = feedConsumption.length
      
      // Calculate original stock (current + consumed)
      const originalStock = stock.currentStock + totalFed
      
      // Calculate consumption percentage
      const consumptionPercentage = originalStock > 0 ? (totalFed / originalStock) * 100 : 0
      
      // Determine status based on threshold
      const percentageOfThreshold = (stock.currentStock / threshold) * 100
      let status = 'good'
      let statusColor = 'text-green-600'
      let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline'
      
      if (stock.currentStock <= threshold * 0.2) {
        status = 'critical'
        statusColor = 'text-red-600'
        badgeVariant = 'destructive'
      } else if (stock.currentStock < threshold) {
        status = 'low'
        statusColor = 'text-orange-600'
        badgeVariant = 'destructive'
      }
      
      return {
        ...stock,
        feedType: stock.feedType,
        threshold,
        totalFed,
        feedingCount,
        originalStock,
        consumptionPercentage,
        percentageOfThreshold,
        status,
        statusColor,
        badgeVariant
      }
    })
  }, [feedStats.stockLevels, feedTypes, consumptionRecords])

  const getStatusBadge = (stockItem: any) => {
    if (stockItem.status === 'critical') {
      return <Badge variant="destructive" className="text-xs mt-1">Critical</Badge>
    }
    if (stockItem.status === 'low') {
      return <Badge variant="destructive" className="text-xs mt-1">Low Stock</Badge>
    }
    return null
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
            <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Current Stock Levels & Usage</CardTitle>
            <CardDescription className={isMobile ? 'text-sm' : ''}>
              Feed inventory with consumption tracking and threshold alerts
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
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {enhancedStockLevels.map((stock: any, index: number) => (
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

              {/* Stats Row */}
              <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-3 pt-3 border-t border-gray-100`}>
                {/* Threshold Progress */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <div className="text-xs text-gray-500">Threshold</div>
                  </div>
                  <div className="text-sm font-medium">
                    {stock.threshold}kg ({stock.percentageOfThreshold.toFixed(0)}%)
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        stock.status === 'critical' ? 'bg-red-500' :
                        stock.status === 'low' ? 'bg-orange-500' : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, Math.max(0, stock.percentageOfThreshold))}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Consumption Stats */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <Package className="w-3 h-3 text-gray-400" />
                    <div className="text-xs text-gray-500">Total Fed</div>
                  </div>
                  <div className="text-sm font-medium">
                    {stock.totalFed.toFixed(1)}kg
                  </div>
                  <div className="text-xs text-gray-500">
                    {stock.consumptionPercentage.toFixed(0)}% used
                  </div>
                </div>

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

                {/* Original Stock (only show on desktop) */}
                {!isMobile && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1">
                      <div className="text-xs text-gray-500">Original</div>
                    </div>
                    <div className="text-sm font-medium">
                      {stock.originalStock.toFixed(1)}kg
                    </div>
                    <div className="text-xs text-gray-500">
                      {stock.currentStock.toFixed(0)}% remains
                    </div>
                  </div>
                )}
              </div>

              {/* Stock Status Message */}
              {stock.status !== 'good' && (
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-2 text-xs">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span className="text-red-700">
                      {stock.status === 'critical' ? 
                        `Critical: Only ${stock.percentageOfThreshold.toFixed(0)}% of minimum stock remaining` :
                        `Below threshold: Need ${(stock.threshold - stock.currentStock).toFixed(1)}kg to reach minimum level`
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {(!feedStats.stockLevels || feedStats.stockLevels.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Package className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <h3 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
                No inventory
              </h3>
              <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} mt-1`}>
                Start by adding feed types and inventory.
              </p>
              {canManageFeed && (
                <div className="mt-4">
                  <Button 
                    onClick={onAddFeedType}
                    size={isMobile ? "sm" : "default"}
                  >
                    Add Feed Type
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}