'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { 
  Package, 
  Plus, 
  AlertTriangle, 
  TrendingDown, 
  Calendar,
  DollarSign,
  Filter,
  ChevronRight,
  Search,
  Grid3X3,
  List
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const { isMobile, isTablet } = useDeviceInfo()
  
  const categories = [
    { value: 'all', label: 'All', shortLabel: 'All' },
    { value: 'feed', label: 'Feed', shortLabel: 'Feed' },
    { value: 'medical', label: 'Medical', shortLabel: 'Med' },
    { value: 'equipment', label: 'Equipment', shortLabel: 'Equip' },
    { value: 'supplies', label: 'Supplies', shortLabel: 'Supply' },
    { value: 'chemicals', label: 'Chemicals', shortLabel: 'Chem' },
    { value: 'maintenance', label: 'Maintenance', shortLabel: 'Maint' },
    { value: 'other', label: 'Other', shortLabel: 'Other' },
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

  // Stats data for easier mapping
  const statsData = [
    {
      title: "Total Items",
      value: inventoryStats.totalItems,
      description: "Active inventory items",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Low Stock",
      value: inventoryStats.lowStockItems,
      description: "Items below minimum",
      icon: TrendingDown,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Expiring Soon",
      value: inventoryStats.expiringItems,
      description: "Within 30 days",
      icon: Calendar,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      title: "Total Value",
      value: `$${inventoryStats.totalValue.toLocaleString()}`,
      description: "Current inventory value",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    }
  ]
  
  return (
    <div className="space-y-4 lg:space-y-8 pb-20 lg:pb-8">
      {/* Mobile Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="px-4 lg:px-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Inventory
          </h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">
            Track and manage your farm supplies
          </p>
        </div>
        
        {/* Mobile Action Bar */}
        <div className="flex items-center justify-between px-4 lg:px-0 lg:space-x-2">
          <div className="flex items-center space-x-2 lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          
          {canManage && (
            <Button 
              onClick={() => setShowAddModal(true)}
              size={isMobile ? "sm" : "default"}
              className="lg:ml-4"
            >
              <Plus className="mr-1 lg:mr-2 h-4 w-4" />
              {isMobile ? "Add" : "Add Item"}
            </Button>
          )}
        </div>
      </div>
      
      {/* Horizontal Scrollable Stats Cards */}
      <div className="px-4 lg:px-0">
        <div className="flex space-x-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:pb-0">
          {statsData.map((stat, index) => (
            <Card 
              key={index} 
              className={`min-w-[280px] lg:min-w-0 flex-shrink-0 ${stat.bgColor} border-0 lg:border lg:bg-white`}
            >
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <div className={`text-2xl lg:text-3xl font-bold ${stat.color} mb-1`}>
                      {stat.value}
                    </div>
                    <p className="text-xs text-gray-500">
                      {stat.description}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center lg:bg-gray-50`}>
                    <stat.icon className={`h-6 w-6 ${stat.color} lg:text-gray-600`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Mobile Alerts Banner */}
      {(lowStockItems.length > 0 || expiringItems.length > 0) && (
        <div className="px-4 lg:px-0">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-orange-800 text-sm">
                      Inventory Alerts
                    </h3>
                    <p className="text-orange-700 text-xs mt-1">
                      {lowStockItems.length} low stock, {expiringItems.length} expiring soon
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAlerts(true)}
                  className="text-orange-700 hover:text-orange-800 p-1"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Desktop Alert Details - Hidden on mobile */}
              <div className="hidden lg:block mt-4 space-y-2">
                {lowStockItems.slice(0, 2).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded">
                    <span className="font-medium text-sm">{item.name}</span>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                      Low Stock: {item.current_stock} {item.unit_of_measure}
                    </Badge>
                  </div>
                ))}
                {expiringItems.slice(0, 2).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded">
                    <span className="font-medium text-sm">{item.name}</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                      Expires: {new Date(item.expiry_date).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Mobile Category Tabs - Horizontal Scroll */}
      <div className="px-4 lg:px-0">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          {/* Mobile Horizontal Scrollable Tabs */}
          <div className="lg:hidden">
            <div className="flex space-x-2 overflow-x-auto pb-4">
              {categories.map(category => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`
                    flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors
                    ${selectedCategory === category.value 
                      ? 'bg-farm-green text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {category.shortLabel}
                </button>
              ))}
            </div>
          </div>
          
          {/* Desktop Tabs */}
          <div className="hidden lg:flex lg:items-center lg:justify-between">
            <TabsList className="grid grid-cols-8">
              {categories.map(category => (
                <TabsTrigger key={category.value} value={category.value} className="text-xs">
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="mr-2 h-4 w-4" /> : <Grid3X3 className="mr-2 h-4 w-4" />}
                {viewMode === 'grid' ? 'List' : 'Grid'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
          
          {/* Content */}
          {categories.map(category => (
            <TabsContent key={category.value} value={category.value} className="mt-4 lg:mt-6">
              <div className="px-4 lg:px-0">
                {filteredItems.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Package className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        No {category.label.toLowerCase()} items
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Get started by adding your first inventory item.
                      </p>
                      {canManage && (
                        <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Item
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className={`
                    ${viewMode === 'grid' 
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6' 
                      : 'space-y-3'
                    }
                  `}>
                    {filteredItems.map((item) => (
                      <InventoryItemCard
                        key={item.id}
                        item={item}
                        canManage={canManage}
                        onStockUpdate={handleStockUpdate}
                        viewMode={viewMode}
                        isMobile={isMobile}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      
      {/* Mobile Filters Panel */}
      {showFilters && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowFilters(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Filters</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                ×
              </Button>
            </div>
            <InventoryFilters 
            onFiltersChange={() => {}} 
            totalItems={filteredItems.length}
            filteredItems={filteredItems.length}
            />
          </div>
        </div>
      )}
      
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