'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { 
  Package, 
  Plus, 
  AlertTriangle, 
  TrendingDown, 
  Calendar,
  DollarSign,
  Filter
} from 'lucide-react'
import { InventoryItemCard } from '@/components/inventory/InventoryItemCard'
import { AddInventoryModal } from '@/components/inventory/AddInventoryModal'
import { InventoryFilters } from '@/components/inventory/InventoryFilters'

interface InventoryDashboardProps {
  farmId: string
  inventoryItems: any[]
  inventoryStats: any
  inventoryAlerts: any[]
  canManage: boolean
}

export function InventoryDashboard({ 
  farmId, 
  inventoryItems: initialItems, 
  inventoryStats,
  inventoryAlerts,
  canManage 
}: InventoryDashboardProps) {
  const [inventoryItems, setInventoryItems] = useState(initialItems)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAlerts, setShowAlerts] = useState(false)
  
  const categories = [
    { value: 'all', label: 'All Items' },
    { value: 'feed', label: 'Feed' },
    { value: 'medical', label: 'Medical' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'supplies', label: 'Supplies' },
    { value: 'chemicals', label: 'Chemicals' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' },
  ]
  
  const filteredItems = selectedCategory === 'all' 
    ? inventoryItems 
    : inventoryItems.filter(item => item.category === selectedCategory)
  
  const lowStockItems = inventoryItems.filter(item => 
    item.current_stock < item.minimum_stock
  )
  
  const expiringItems = inventoryItems.filter(item => {
    if (!item.expiry_date) return false
    const expiryDate = new Date(item.expiry_date)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    return expiryDate <= thirtyDaysFromNow
  })
  
  const handleItemAdded = (newItem: any) => {
    setInventoryItems(prev => [newItem, ...prev])
    setShowAddModal(false)
  }
  
  const handleStockUpdate = (itemId: string, newStock: number) => {
    setInventoryItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, current_stock: newStock }
          : item
      )
    )
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">
            Track and manage your farm supplies and equipment
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryStats.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Active inventory items
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{inventoryStats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Items below minimum
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inventoryStats.expiringItems}</div>
            <p className="text-xs text-muted-foreground">
              Within 30 days
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${inventoryStats.totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Current inventory value
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Alerts Section */}
      {(lowStockItems.length > 0 || expiringItems.length > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded">
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    Low Stock: {item.current_stock} {item.unit_of_measure}
                  </Badge>
                </div>
              ))}
              {expiringItems.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded">
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    Expires: {new Date(item.expiry_date).toLocaleDateString()}
                  </Badge>
                </div>
              ))}
            </div>
            {(lowStockItems.length > 3 || expiringItems.length > 3) && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => setShowAlerts(true)}
              >
                View All Alerts ({lowStockItems.length + expiringItems.length})
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Main Content */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto">
            {categories.map(category => (
              <TabsTrigger key={category.value} value={category.value} className="text-xs">
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>
        
        {categories.map(category => (
          <TabsContent key={category.value} value={category.value} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{category.label}</CardTitle>
                <CardDescription>
                  {category.value === 'all' 
                    ? 'All inventory items across categories'
                    : `${category.label} inventory items`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      No {category.label.toLowerCase()} items
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by adding your first inventory item.
                    </p>
                    {canManage && (
                      <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map((item) => (
                      <InventoryItemCard
                        key={item.id}
                        item={item}
                        canManage={canManage}
                        onStockUpdate={handleStockUpdate}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Add Item Modal */}
      {showAddModal && (
        <AddInventoryModal
          farmId={farmId}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onItemAdded={handleItemAdded}
        />
      )}
    </div>
  )
}