'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AddFeedTypeModal } from '@/components/feed/AddFeedTypeModal'
import { AddFeedInventoryModal } from '@/components/feed/AddFeedInventoryModal'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { 
  Plus, 
  Package, 
  DollarSign, 
  TrendingDown, 
  AlertTriangle,
  Wheat,
  MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

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
  
  const { isMobile, isTablet } = useDeviceInfo()
  const canManageFeed = ['farm_owner', 'farm_manager'].includes(userRole)
  
  // Calculate low stock alerts
  const lowStockItems = feedStats.stockLevels.filter((stock: any) => stock.currentStock < 50)
  
  const handleFeedTypeAdded = (newFeedType: any) => {
    setFeedTypes(prev => [...prev, newFeedType])
  }
  
  const handleInventoryAdded = (newInventory: any) => {
    setInventory(prev => [...prev, newInventory])
    window.location.reload()
  }

  // Mobile Stats Card Component
  const MobileStatsCard = ({ title, value, subtitle, icon: Icon, className = "" }: any) => (
    <Card className={`min-w-[280px] ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
          <div className="p-2 bg-gray-100 rounded-lg">
            <Icon className="h-5 w-5 text-gray-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Mobile Action Menu
  const MobileActionMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => setShowAddTypeModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Feed Type
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setShowAddInventoryModal(true)}>
          <Package className="mr-2 h-4 w-4" />
          Add Inventory
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="space-y-6">
      {/* Mobile Header */}
      <div className="px-4 lg:px-0">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Feed Management
            </h1>
            <p className={`text-gray-600 mt-1 ${isMobile ? 'text-sm' : 'text-base'}`}>
              Manage feed inventory, consumption, and costs
            </p>
          </div>
          
          {canManageFeed && (
            <div className="ml-4">
              {isMobile ? (
                <MobileActionMenu />
              ) : (
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
          )}
        </div>
      </div>
      
      {/* Horizontal Scrollable Stats Cards */}
      <div className="px-4 lg:px-0">
        {isMobile || isTablet ? (
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex space-x-4 pb-4">
              <MobileStatsCard
                title="Monthly Cost"
                value={`$${feedStats.totalCost.toFixed(2)}`}
                subtitle={`$${feedStats.avgDailyCost.toFixed(2)} daily average`}
                icon={DollarSign}
              />
              <MobileStatsCard
                title="Total Consumption"
                value={`${feedStats.totalQuantity.toFixed(1)}kg`}
                subtitle={`${feedStats.avgDailyQuantity.toFixed(1)}kg daily average`}
                icon={Wheat}
              />
              <MobileStatsCard
                title="Feed Types"
                value={feedTypes.length}
                subtitle="Active feed types"
                icon={Package}
              />
              <MobileStatsCard
                title="Low Stock Alerts"
                value={lowStockItems.length}
                subtitle="Items need restocking"
                icon={AlertTriangle}
                className={lowStockItems.length > 0 ? "border-red-200 bg-red-50" : ""}
              />
            </div>
          </div>
        ) : (
          // Desktop Grid Layout
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
        )}
      </div>
      
      {/* Mobile Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="px-4 lg:px-0">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-yellow-800 text-base">
                <AlertTriangle className="h-4 w-4" />
                <span>Low Stock Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-3 gap-4'}`}>
                {lowStockItems.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.feedType?.name}</p>
                      <p className="text-xs text-gray-600">{item.currentStock.toFixed(1)}kg remaining</p>
                    </div>
                    <Badge variant="destructive" className="ml-2 text-xs">Low Stock</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Mobile Optimized Tabs */}
      <div className="px-4 lg:px-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`${isMobile ? 'w-full grid-cols-4' : ''} grid`}>
            <TabsTrigger value="overview" className={isMobile ? 'text-xs' : ''}>
              {isMobile ? 'Overview' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="inventory" className={isMobile ? 'text-xs' : ''}>
              {isMobile ? 'Stock' : 'Inventory'}
            </TabsTrigger>
            <TabsTrigger value="consumption" className={isMobile ? 'text-xs' : ''}>
              {isMobile ? 'Usage' : 'Consumption'}
            </TabsTrigger>
            <TabsTrigger value="types" className={isMobile ? 'text-xs' : ''}>
              Types
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Current Stock Levels</CardTitle>
                <CardDescription className={isMobile ? 'text-sm' : ''}>
                  Available feed inventory by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {feedStats.stockLevels.map((stock: any, index: number) => (
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
                          ${stock.avgCostPerKg.toFixed(2)}/kg
                        </p>
                        {stock.currentStock < 50 && (
                          <Badge variant="destructive" className="text-xs mt-1">Low Stock</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {feedStats.stockLevels.length === 0 && (
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
                            onClick={() => setShowAddTypeModal(true)}
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
          </TabsContent>
          
          <TabsContent value="inventory" className="mt-6">
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
                            {item.quantity_kg}kg • ${item.cost_per_kg}/kg
                            {item.supplier && ` • ${item.supplier}`}
                          </p>
                          <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                            Purchased: {new Date(item.purchase_date).toLocaleDateString()}
                            {item.expiry_date && ` • Expires: ${new Date(item.expiry_date).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className={`text-right ${isMobile ? 'self-end' : 'ml-4'}`}>
                          <p className={`font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>
                            ${(item.quantity_kg * item.cost_per_kg).toFixed(2)}
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
                        onClick={() => setShowAddInventoryModal(true)}
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
          </TabsContent>
          
          <TabsContent value="consumption" className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Feed Consumption</CardTitle>
                <CardDescription className={isMobile ? 'text-sm' : ''}>
                  Track daily feed usage and costs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Wheat className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                  <h3 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
                    Consumption tracking
                  </h3>
                  <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} mt-1`}>
                    Feed consumption tracking will be available soon.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="types" className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Feed Types</CardTitle>
                <CardDescription className={isMobile ? 'text-sm' : ''}>
                  Manage different types of feed for your animals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {feedTypes.length > 0 ? (
                  <div className="space-y-3">
                    {feedTypes.map((feedType: any) => (
                      <div key={feedType.id} className={`flex items-center justify-between p-3 border rounded-lg ${isMobile ? 'flex-col items-start space-y-2' : 'flex-row'}`}>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium ${isMobile ? 'text-sm' : 'text-base'} truncate`}>
                            {feedType.name}
                          </h4>
                          <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'} truncate`}>
                            {feedType.description || 'No description'}
                          </p>
                          {feedType.supplier && (
                            <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                              Supplier: {feedType.supplier}
                            </p>
                          )}
                        </div>
                        <div className={`text-right ${isMobile ? 'self-end' : 'ml-4'}`}>
                          {feedType.typical_cost_per_kg && (
                            <p className={`font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>
                              ${feedType.typical_cost_per_kg}/kg
                            </p>
                          )}
                          <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            Typical Cost
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Wheat className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                    <h3 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
                      No feed types
                    </h3>
                    <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} mt-1`}>
                      Create your first feed type to get started.
                    </p>
                    {canManageFeed && (
                      <Button 
                        className="mt-4" 
                        onClick={() => setShowAddTypeModal(true)}
                        size={isMobile ? "sm" : "default"}
                      >
                        Add Feed Type
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Modals */}
      <AddFeedTypeModal
        farmId={farmId}
        isOpen={showAddTypeModal}
        onClose={() => setShowAddTypeModal(false)}
        onSuccess={handleFeedTypeAdded}
      />
      
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

