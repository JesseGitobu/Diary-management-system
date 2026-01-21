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
  Grid3X3,
  List,
  Building2,
  Phone,
  Mail
} from 'lucide-react'
import { InventoryItemCard } from '@/components/inventory/InventoryItemCard'
import { AddInventoryModal } from '@/components/inventory/AddInventoryModal'
import { InventoryFilters } from '@/components/inventory/InventoryFilters'
import { AddSupplierModal } from '@/components/inventory/AddSupplierModal'
import { SupplierCard } from '@/components/inventory/SupplierCard'
import { InventoryStatsCards } from '@/components/inventory/InventoryStatsCards'
import { SupplierStatsCards } from '@/components/inventory/SupplierStatsCards'

interface UnifiedInventoryDashboardProps {
  farmId: string
  inventoryItems: any[]
  inventoryStats: any
  inventoryAlerts: any[]
  suppliers: any[]
  supplierStats: any
  canManage: boolean
}

export function UnifiedInventoryDashboard({ 
  farmId, 
  inventoryItems: initialItems, 
  inventoryStats,
  inventoryAlerts,
  suppliers: initialSuppliers,
  supplierStats,
  canManage 
}: UnifiedInventoryDashboardProps) {
  const [inventoryItems, setInventoryItems] = useState(initialItems)
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAlerts, setShowAlerts] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState('inventory')
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
    setShowAddItemModal(false)
  }
  
  const handleSupplierAdded = (newSupplier: any) => {
    setSuppliers(prev => [newSupplier, ...prev])
    setShowAddSupplierModal(false)
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

  // Combined stats for overview
  const overviewStats = [
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

  const supplierStatsCards = [
    {
      title: "Total Suppliers",
      value: supplierStats.totalSuppliers,
      description: "Active vendor relationships",
      icon: Building2,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Feed Suppliers",
      value: supplierStats.supplierTypes.feed || 0,
      description: "Feed vendors",
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Medical Suppliers",
      value: supplierStats.supplierTypes.medical || 0,
      description: "Medical vendors",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      title: "Equipment Suppliers",
      value: supplierStats.supplierTypes.equipment || 0,
      description: "Equipment vendors",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    }
  ]
  
  return (
    <div className="space-y-4 lg:space-y-8 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="px-4 lg:px-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Inventory Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">
            Track supplies and manage suppliers
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between px-4 lg:px-0 lg:space-x-2">
          <div className="flex items-center space-x-2 lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            </Button>
            {activeTab === 'inventory' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {canManage && (
            <div className="flex items-center space-x-2">
              {activeTab === 'inventory' ? (
                <Button 
                  onClick={() => setShowAddItemModal(true)}
                  size={isMobile ? "sm" : "default"}
                >
                  <Plus className="mr-1 lg:mr-2 h-4 w-4" />
                  {isMobile ? "Item" : "Add Item"}
                </Button>
              ) : (
                <Button 
                  onClick={() => setShowAddSupplierModal(true)}
                  size={isMobile ? "sm" : "default"}
                >
                  <Plus className="mr-1 lg:mr-2 h-4 w-4" />
                  {isMobile ? "Supplier" : "Add Supplier"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="px-4 lg:px-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inventory">
              <Package className="h-4 w-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="suppliers">
              <Building2 className="h-4 w-4 mr-2" />
              Suppliers
            </TabsTrigger>
          </TabsList>

          {/* INVENTORY TAB */}
          <TabsContent value="inventory" className="mt-4 lg:mt-6 space-y-4 lg:space-y-6">
            {/* Inventory Stats */}
            <div className={`${isMobile ? 'px-0' : ''}`}>
              <InventoryStatsCards
                stats={overviewStats}
                lowStockCount={lowStockItems.length}
                expiringCount={expiringItems.length}
              />
            </div>
            
            {/* Alerts Banner */}
            {(lowStockItems.length > 0 || expiringItems.length > 0) && (
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
                      onClick={() => setShowAlerts(!showAlerts)}
                      className="text-orange-700 hover:text-orange-800 p-1"
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform ${showAlerts ? 'rotate-90' : ''}`} />
                    </Button>
                  </div>
                  
                  {/* Alert Details */}
                  {showAlerts && (
                    <div className="mt-4 space-y-2">
                      {lowStockItems.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded">
                          <span className="font-medium text-sm">{item.name}</span>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                            Low Stock: {item.current_stock} {item.unit_of_measure}
                          </Badge>
                        </div>
                      ))}
                      {expiringItems.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded">
                          <span className="font-medium text-sm">{item.name}</span>
                          <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                            Expires: {new Date(item.expiry_date).toLocaleDateString()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Category Tabs */}
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
              
              {/* Inventory Items Content */}
              {categories.map(category => (
                <TabsContent key={category.value} value={category.value} className="mt-4 lg:mt-6">
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
                          <Button className="mt-4" onClick={() => setShowAddItemModal(true)}>
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
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          {/* SUPPLIERS TAB */}
          <TabsContent value="suppliers" className="mt-4 lg:mt-6 space-y-4 lg:space-y-6">
            {/* Supplier Stats */}
            <div className={`${isMobile ? 'px-0' : ''}`}>
              <SupplierStatsCards
                stats={supplierStatsCards}
                totalSuppliers={supplierStats.totalSuppliers}
                supplierTypes={supplierStats.supplierTypes}
              />
            </div>

            {/* Suppliers List */}
            <Card>
              <CardHeader>
                <CardTitle>All Suppliers</CardTitle>
                <CardDescription>
                  Your vendor and supplier directory
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suppliers.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No suppliers</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by adding your first supplier.
                    </p>
                    {canManage && (
                      <Button className="mt-4" onClick={() => setShowAddSupplierModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Supplier
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suppliers.map((supplier) => (
                      <SupplierCard
                        key={supplier.id}
                        supplier={supplier}
                        canManage={canManage}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Mobile Filters Panel */}
      {showFilters && activeTab === 'inventory' && (
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
      
      {/* Modals */}
      {showAddItemModal && (
        <AddInventoryModal
          farmId={farmId}
          isOpen={showAddItemModal}
          onClose={() => setShowAddItemModal(false)}
          onItemAdded={handleItemAdded}
        />
      )}

      {showAddSupplierModal && (
        <AddSupplierModal
          farmId={farmId}
          isOpen={showAddSupplierModal}
          onClose={() => setShowAddSupplierModal(false)}
          onSupplierAdded={handleSupplierAdded}
        />
      )}
    </div>
  )
}