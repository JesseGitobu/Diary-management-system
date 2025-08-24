'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Package } from 'lucide-react'

interface FeedInventoryTabProps {
  inventory: any[]
  feedTypes: any[]
  isMobile: boolean
  canManageFeed: boolean
  onAddInventory: () => void
}

export function FeedInventoryTab({
  inventory,
  feedTypes,
  isMobile,
  canManageFeed,
  onAddInventory
}: FeedInventoryTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Feed Inventory</CardTitle>
        <CardDescription className={isMobile ? 'text-sm' : ''}>
          Manage your feed purchases and stock
        </CardDescription>
      </CardHeader>
      <CardContent>
        {inventory.length > 0 ? (
          <div className="space-y-3">
            {inventory.map((item: any) => (
              <div key={item.id} className={`flex items-start justify-between p-3 border rounded-lg ${isMobile ? 'flex-col space-y-2' : 'flex-row items-center'}`}>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium ${isMobile ? 'text-sm' : 'text-base'} truncate`}>
                    {item.feed_types?.name}
                  </h4>
                  <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {item.quantity_kg}kg • KSh{item.cost_per_kg}/kg
                    {item.supplier && ` • ${item.supplier}`}
                  </p>
                  <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                    Purchased: {new Date(item.purchase_date).toLocaleDateString()}
                    {item.expiry_date && ` • Expires: ${new Date(item.expiry_date).toLocaleDateString()}`}
                  </p>
                </div>
                <div className={`text-right ${isMobile ? 'self-end' : 'ml-4'}`}>
                  <p className={`font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>
                    KSh{(item.quantity_kg * item.cost_per_kg).toFixed(2)}
                  </p>
                  <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Total Value
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Package className="mx-auto h-8 w-8 text-gray-400 mb-3" />
            <h3 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
              No inventory records
            </h3>
            <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} mt-1`}>
              Start by adding your first feed purchase.
            </p>
            {canManageFeed && (
              <Button 
                className="mt-4" 
                onClick={onAddInventory}
                disabled={feedTypes.length === 0}
                size={isMobile ? "sm" : "default"}
              >
                Add Inventory
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}