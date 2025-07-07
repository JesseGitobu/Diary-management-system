'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AddFeedTypeModal } from '@/components/feed/AddFeedTypeModal'
import { AddFeedInventoryModal } from '@/components/feed/AddFeedInventoryModal'
import { 
  Plus, 
  Package, 
  DollarSign, 
  TrendingDown, 
  AlertTriangle,
  Wheat
} from 'lucide-react'

interface FeedManagementDashboardProps {
  farmId: string
  feedStats: any
  feedTypes: any[]
  inventory: any[]
  userRole: string
}

export function FeedManagementDashboard({
  farmId,
  feedStats,
  feedTypes: initialFeedTypes,
  inventory: initialInventory,
  userRole
}: FeedManagementDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showAddTypeModal, setShowAddTypeModal] = useState(false)
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false)
  const [feedTypes, setFeedTypes] = useState(initialFeedTypes)
  const [inventory, setInventory] = useState(initialInventory)
  
  const canManageFeed = ['farm_owner', 'farm_manager'].includes(userRole)
  
  // Calculate low stock alerts
  const lowStockItems = feedStats.stockLevels.filter((stock: any) => stock.currentStock < 50) // Less than 50kg
  
  const handleFeedTypeAdded = (newFeedType: any) => {
    setFeedTypes(prev => [...prev, newFeedType])
  }
  
  const handleInventoryAdded = (newInventory: any) => {
    setInventory(prev => [...prev, newInventory])
    // Refresh the page to update stats
    window.location.reload()
  }
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feed Management</h1>
          <p className="text-gray-600 mt-2">
            Manage feed inventory, consumption, and costs
          </p>
        </div>
        {canManageFeed && (
          <div className="flex space-x-3">
            <Button onClick={() => setShowAddTypeModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Feed Type
            </Button>
            <Button variant="outline" onClick={() => setShowAddInventoryModal(true)}>
              <Package className="mr-2 h-4 w-4" />
              Add Inventory
            </Button>
          </div>
        )}
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${feedStats.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${feedStats.avgDailyCost.toFixed(2)} daily average
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consumption</CardTitle>
            <Wheat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedStats.totalQuantity.toFixed(1)}kg</div>
            <p className="text-xs text-muted-foreground">
              {feedStats.avgDailyQuantity.toFixed(1)}kg daily average
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feed Types</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedTypes.length}</div>
            <p className="text-xs text-muted-foreground">
              Active feed types
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Items need restocking
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Low Stock Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lowStockItems.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{item.feedType?.name}</p>
                    <p className="text-sm text-gray-600">{item.currentStock.toFixed(1)}kg remaining</p>
                  </div>
                  <Badge variant="destructive">Low Stock</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="consumption">Consumption</TabsTrigger>
          <TabsTrigger value="types">Feed Types</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Current Stock Levels */}
          <Card>
            <CardHeader>
              <CardTitle>Current Stock Levels</CardTitle>
              <CardDescription>
                Available feed inventory by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feedStats.stockLevels.map((stock: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{stock.feedType?.name}</h4>
                      <p className="text-sm text-gray-600">{stock.feedType?.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{stock.currentStock.toFixed(1)}kg</p>
                      <p className="text-sm text-gray-600">
                        ${stock.avgCostPerKg.toFixed(2)}/kg
                      </p>
                      {stock.currentStock < 50 && (
                        <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                      )}
                    </div>
                  </div>
                ))}
                
                {feedStats.stockLevels.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start by adding feed types and inventory.
                    </p>
                    {canManageFeed && (
                      <div className="mt-4 space-x-2">
                        <Button onClick={() => setShowAddTypeModal(true)}>
                          Add Feed Type
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Feed Inventory</CardTitle>
              <CardDescription>
                Manage your feed purchases and stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inventory.length > 0 ? (
                <div className="space-y-4">
                  {inventory.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{item.feed_types?.name}</h4>
                        <p className="text-sm text-gray-600">
                          {item.quantity_kg}kg • ${item.cost_per_kg}/kg • {item.supplier || 'No supplier'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Purchased: {new Date(item.purchase_date).toLocaleDateString()}
                          {item.expiry_date && ` • Expires: ${new Date(item.expiry_date).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          ${(item.quantity_kg * item.cost_per_kg).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">Total Value</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory records</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start by adding your first feed purchase.
                  </p>
                  {canManageFeed && (
                    <Button 
                      className="mt-4" 
                      onClick={() => setShowAddInventoryModal(true)}
                      disabled={feedTypes.length === 0}
                    >
                      Add Inventory
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="consumption">
          <Card>
            <CardHeader>
              <CardTitle>Feed Consumption</CardTitle>
              <CardDescription>
                Track daily feed usage and costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Wheat className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Consumption tracking</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Feed consumption tracking will be available soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="types">
          <Card>
            <CardHeader>
              <CardTitle>Feed Types</CardTitle>
              <CardDescription>
                Manage different types of feed for your animals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedTypes.length > 0 ? (
                <div className="space-y-4">
                  {feedTypes.map((feedType: any) => (
                    <div key={feedType.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{feedType.name}</h4>
                        <p className="text-sm text-gray-600">{feedType.description || 'No description'}</p>
                        {feedType.supplier && (
                          <p className="text-xs text-gray-500">Supplier: {feedType.supplier}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {feedType.typical_cost_per_kg && (
                          <p className="text-lg font-bold">${feedType.typical_cost_per_kg}/kg</p>
                        )}
                        <p className="text-sm text-gray-600">Typical Cost</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Wheat className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No feed types</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create your first feed type to get started.
                  </p>
                  {canManageFeed && (
                    <Button className="mt-4" onClick={() => setShowAddTypeModal(true)}>
                      Add Feed Type
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add Feed Type Modal */}
      <AddFeedTypeModal
        farmId={farmId}
        isOpen={showAddTypeModal}
        onClose={() => setShowAddTypeModal(false)}
        onSuccess={handleFeedTypeAdded}
      />
      
      {/* Add Feed Inventory Modal */}
      <AddFeedInventoryModal
        farmId={farmId}
        feedTypes={feedTypes}
        isOpen={showAddInventoryModal}
        onClose={() => setShowAddInventoryModal(false)}
        onSuccess={handleInventoryAdded}
      />
    </div>
  )
}