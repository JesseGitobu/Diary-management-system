'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Package } from 'lucide-react'

interface FeedOverviewTabProps {
  feedStats: any
  feedTypes: any[]
  isMobile: boolean
  canManageFeed: boolean
  onAddFeedType: () => void
}

export function FeedOverviewTab({
  feedStats,
  feedTypes,
  isMobile,
  canManageFeed,
  onAddFeedType
}: FeedOverviewTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Current Stock Levels</CardTitle>
        <CardDescription className={isMobile ? 'text-sm' : ''}>
          Available feed inventory by type
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {feedStats.stockLevels?.map((stock: any, index: number) => (
            <div key={index} className={`flex items-center justify-between p-4 border rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium ${isMobile ? 'text-sm' : 'text-base'} truncate`}>
                  {stock.feedType?.name}
                </h4>
                <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'} truncate`}>
                  {stock.feedType?.description}
                </p>
              </div>
              <div className="text-right ml-4">
                <p className={`font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>
                  {stock.currentStock.toFixed(1)}kg
                </p>
                <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  KSh{stock.avgCostPerKg.toFixed(2)}/kg
                </p>
                {stock.currentStock < 50 && (
                  <Badge variant="destructive" className="text-xs mt-1">Low Stock</Badge>
                )}
              </div>
            </div>
          )) || []}
          
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