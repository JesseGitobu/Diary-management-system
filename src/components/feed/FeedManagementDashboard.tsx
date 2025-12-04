'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AddFeedTypeModal } from '@/components/feed/AddFeedTypeModal'
import { AddFeedInventoryModal } from '@/components/feed/AddFeedInventoryModal'
import { FeedConsumptionModal } from '@/components/feed/FeedConsumptionModal'
import { FeedOverviewTab } from '@/components/feed/FeedOverviewTab'
import { FeedInventoryTab } from '@/components/feed/FeedInventoryTab'
import { FeedConsumptionTab } from '@/components/feed/FeedConsumptionTab'
import { FeedTypesTab } from '@/components/feed/FeedTypesTab'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import {
  Plus,
  Package,
  DollarSign,
  AlertTriangle,
  Wheat,
  MoreVertical,
  Clock,
  Users
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
  consumptionRecords: any[]
  animals: any[]
  userRole: string
  feedTypeCategories: any[]
  animalCategories: any[]
  weightConversions: any[]
  consumptionBatches: any[]
}

export function FeedManagementDashboard({
  farmId,
  feedStats,
  feedTypes: initialFeedTypes,
  inventory: initialInventory,
  consumptionRecords: initialConsumptionRecords,
  animals,
  userRole,
  feedTypeCategories,
  animalCategories,
  weightConversions,
  consumptionBatches,
}: FeedManagementDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showAddTypeModal, setShowAddTypeModal] = useState(false)
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false)
  const [showConsumptionModal, setShowConsumptionModal] = useState(false)
  const [feedTypes, setFeedTypes] = useState(initialFeedTypes)
  const [inventory, setInventory] = useState(initialInventory)
  const [consumptionRecords, setConsumptionRecords] = useState(initialConsumptionRecords)
  const [editingRecord, setEditingRecord] = useState<any>(null)

  useEffect(() => {
  const handleMobileNavAction = (event: Event) => {
    const customEvent = event as CustomEvent
    const { action } = customEvent.detail

    if (action === 'showRecordFeedingModal') {
      handleOpenConsumptionModal()
    } else if (action === 'showAddFeedTypeModal') {
      setShowAddTypeModal(true)
    } else if (action === 'showAddInventoryModal') {
      setShowAddInventoryModal(true)
    }
  }

  window.addEventListener('mobileNavModalAction', handleMobileNavAction)
  return () => {
    window.removeEventListener('mobileNavModalAction', handleMobileNavAction)
  }
}, [])

  const { isMobile, isTablet } = useDeviceInfo()
  const canManageFeed = ['farm_owner', 'farm_manager'].includes(userRole)
  const canRecordFeeding = ['farm_owner', 'farm_manager', 'worker'].includes(userRole)
  const canEditRecords = ['farm_owner', 'farm_manager'].includes(userRole)
  const canDeleteRecords = ['farm_owner', 'farm_manager'].includes(userRole)

  // Calculate enhanced stats for Kenyan dairy farmers
  const enhancedStats = useMemo(() => {
    // Calculate current inventory value
    const currentInventoryValue = inventory.reduce((sum, item) => 
      sum + (item.quantity_kg * item.cost_per_kg), 0
    )

    // Calculate active animals being fed
    const activeAnimalsFed = consumptionRecords.length > 0 ? 
      Math.max(...consumptionRecords.map(record => record.animal_count || 1)) : 0

    // Calculate cost per animal per day
    const costPerAnimalPerDay = feedStats.avgDailyCost && activeAnimalsFed > 0 ? 
      feedStats.avgDailyCost / activeAnimalsFed : 0

    // Calculate average days remaining across all feed types
    let totalDaysRemaining = 0
    let feedTypesWithData = 0
    
    if (feedStats.stockLevels) {
      feedStats.stockLevels.forEach((stock: any) => {
        const feedConsumption = consumptionRecords.filter(record => 
          record.feed_type_id === stock.feedType?.id
        )
        
        if (feedConsumption.length > 0) {
          const dates = feedConsumption.map(record => new Date(record.feeding_time)).sort()
          const oldestDate = dates[0]
          const newestDate = dates[dates.length - 1]
          const daysDifference = Math.max(1, Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)))
          
          const totalFed = feedConsumption.reduce((sum, record) => sum + (record.quantity_kg || 0), 0)
          const avgDailyConsumption = totalFed / daysDifference
          
          if (avgDailyConsumption > 0) {
            const daysRemaining = Math.floor(stock.currentStock / avgDailyConsumption)
            totalDaysRemaining += daysRemaining
            feedTypesWithData++
          }
        }
      })
    }

    const averageDaysRemaining = feedTypesWithData > 0 ? Math.floor(totalDaysRemaining / feedTypesWithData) : 0

    // Calculate low stock and critical alerts
    const alertCounts = {
      critical: 0,
      low: 0,
      total: 0
    }
    
    if (feedStats.stockLevels) {
      feedStats.stockLevels.forEach((stock: any) => {
        const feedType = feedTypes.find(ft => ft.id === stock.feedType?.id || ft.id === stock.feed_type_id)
        if (feedType) {
          const threshold = feedType.low_stock_threshold || 50
          if (stock.currentStock < threshold * 0.5) {
            alertCounts.critical++
            alertCounts.total++
          } else if (stock.currentStock < threshold) {
            alertCounts.low++
            alertCounts.total++
          }
        }
      })
    }

    return {
      currentInventoryValue,
      activeAnimalsFed,
      costPerAnimalPerDay,
      averageDaysRemaining,
      alertCounts
    }
  }, [feedStats, inventory, consumptionRecords, feedTypes])

  // Calculate low stock alerts for backward compatibility
  const lowStockItems = enhancedStats.alertCounts.total

  const handleFeedTypeAdded = (newFeedType: any) => {
    setFeedTypes(prev => [...prev, newFeedType])
  }

  const handleFeedTypeUpdated = (updatedFeedType: any) => {
    setFeedTypes(prev => prev.map(ft =>
      ft.id === updatedFeedType.id ? updatedFeedType : ft
    ))
  }

  const handleFeedTypeDeleted = (feedTypeId: string) => {
    setFeedTypes(prev => prev.filter(ft => ft.id !== feedTypeId))
  }

  const handleInventoryAdded = (newInventory: any) => {
    setInventory(prev => [...prev, newInventory])
    window.location.reload()
  }

  const handleConsumptionAdded = (newConsumption: any) => {
    if (editingRecord) {
      // Update existing record
      setConsumptionRecords(prev => prev.map(record => 
        record.id === editingRecord.id ? newConsumption[0] : record
      ))
      setEditingRecord(null)
    } else {
      // Add new record
      setConsumptionRecords(prev => [...newConsumption, ...prev])
    }
    setShowConsumptionModal(false)
    window.location.reload() // Refresh to update stats
  }

  const handleEditRecord = (record: any) => {
    setEditingRecord(record)
    setShowConsumptionModal(true)
  }

  const handleDeleteRecord = async (recordId: string) => {
    try {
      const response = await fetch(`/api/feed/consumption/${recordId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete record')
      }

      // Remove from local state
      setConsumptionRecords(prev => prev.filter(record => record.id !== recordId))
      
      // Show success message (you might want to add a toast notification here)
      console.log('Record deleted successfully')
      
      // Optionally refresh to update stats
      window.location.reload()
      
    } catch (error) {
      console.error('Error deleting record:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete record')
    }
  }

  const handleOpenConsumptionModal = () => {
    setEditingRecord(null) // Clear any editing state
    setShowConsumptionModal(true)
  }

  const handleCloseConsumptionModal = () => {
    setEditingRecord(null) // Clear editing state when closing
    setShowConsumptionModal(false)
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
        {canRecordFeeding && (
          <DropdownMenuItem onClick={handleOpenConsumptionModal}>
            <Wheat className="mr-2 h-4 w-4" />
            Record Feeding
          </DropdownMenuItem>
        )}
        {canManageFeed && (
          <>
            <DropdownMenuItem onClick={() => setShowAddTypeModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Feed Type
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowAddInventoryModal(true)}>
              <Package className="mr-2 h-4 w-4" />
              Add Inventory
            </DropdownMenuItem>
          </>
        )}
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

          <div className="ml-4">
            {isMobile ? (
              <MobileActionMenu />
            ) : (
              <div className="flex space-x-3">
                {canRecordFeeding && (
                  <Button onClick={handleOpenConsumptionModal}>
                    <Wheat className="mr-2 h-4 w-4" />
                    Record Feeding
                  </Button>
                )}
                {canManageFeed && (
                  <>
                    <Button onClick={() => setShowAddTypeModal(true)} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Feed Type
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddInventoryModal(true)}>
                      <Package className="mr-2 h-4 w-4" />
                      Add Inventory
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Stats Cards */}
      <div className="px-4 lg:px-0">
        {isMobile || isTablet ? (
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex space-x-4 pb-4">
              <MobileStatsCard
                title="Daily Feed Cost"
                value={`KSh${feedStats.avgDailyCost?.toFixed(0) || '0'}`}
                subtitle={`KSh${enhancedStats.costPerAnimalPerDay.toFixed(0)}/animal/day`}
                icon={DollarSign}
              />
              <MobileStatsCard
                title="Current Stock Value"
                value={`KSh${(enhancedStats.currentInventoryValue / 1000).toFixed(0)}k`}
                subtitle={`${inventory.length} inventory items`}
                icon={Package}
              />
              <MobileStatsCard
                title="Feed Days Left"
                value={enhancedStats.averageDaysRemaining > 0 ? `${enhancedStats.averageDaysRemaining}d` : 'N/A'}
                subtitle={enhancedStats.averageDaysRemaining > 0 ? 'Average across feeds' : 'Start feeding to calculate'}
                icon={Clock}
                className={enhancedStats.averageDaysRemaining < 14 && enhancedStats.averageDaysRemaining > 0 ? "border-orange-200 bg-orange-50" : ""}
              />
              <MobileStatsCard
                title="Animals Fed"
                value={enhancedStats.activeAnimalsFed || animals.length}
                subtitle={`${feedStats.totalSessions || consumptionRecords.length} sessions this month`}
                icon={Users}
              />
              <MobileStatsCard
                title="Stock Alerts"
                value={enhancedStats.alertCounts.total}
                subtitle={`${enhancedStats.alertCounts.critical} critical, ${enhancedStats.alertCounts.low} low`}
                icon={AlertTriangle}
                className={enhancedStats.alertCounts.total > 0 ? "border-red-200 bg-red-50" : ""}
              />
            </div>
          </div>
        ) : (
          // Desktop Grid Layout
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily Feed Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KSh{feedStats.avgDailyCost?.toFixed(0) || '0'}</div>
                <p className="text-xs text-muted-foreground">
                  KSh{enhancedStats.costPerAnimalPerDay.toFixed(0)} per animal daily
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Stock Value</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KSh{(enhancedStats.currentInventoryValue / 1000).toFixed(0)}k</div>
                <p className="text-xs text-muted-foreground">
                  {inventory.length} inventory items
                </p>
              </CardContent>
            </Card>

            <Card className={enhancedStats.averageDaysRemaining < 14 && enhancedStats.averageDaysRemaining > 0 ? "border-orange-200 bg-orange-50" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Feed Days Left</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${enhancedStats.averageDaysRemaining < 7 && enhancedStats.averageDaysRemaining > 0 ? 'text-red-600' : enhancedStats.averageDaysRemaining < 14 && enhancedStats.averageDaysRemaining > 0 ? 'text-orange-600' : ''}`}>
                  {enhancedStats.averageDaysRemaining > 0 ? `${enhancedStats.averageDaysRemaining}d` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {enhancedStats.averageDaysRemaining > 0 ? 'Average across feeds' : 'Start feeding to calculate'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Animals Fed</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enhancedStats.activeAnimalsFed || animals.length}</div>
                <p className="text-xs text-muted-foreground">
                  {feedStats.totalSessions || consumptionRecords.length} sessions this month
                </p>
              </CardContent>
            </Card>

            <Card className={enhancedStats.alertCounts.total > 0 ? "border-red-200 bg-red-50" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${enhancedStats.alertCounts.total > 0 ? 'text-red-600' : ''}`}>
                  {enhancedStats.alertCounts.total}
                </div>
                <p className="text-xs text-muted-foreground">
                  {enhancedStats.alertCounts.critical} critical, {enhancedStats.alertCounts.low} low stock
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Enhanced Low Stock Alerts */}
      {enhancedStats.alertCounts.total > 0 && (
        <div className="px-4 lg:px-0">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2 text-yellow-800 text-base">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Stock Alerts ({enhancedStats.alertCounts.total})</span>
                </CardTitle>
                {canManageFeed && !isMobile && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAddInventoryModal(true)}
                    className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Stock
                  </Button>
                )}
              </div>
              <CardDescription className="text-yellow-700">
                {enhancedStats.alertCounts.critical} critical alerts, {enhancedStats.alertCounts.low} low stock warnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-3 gap-4'}`}>
                {feedStats.stockLevels?.filter((stock: any) => {
                  const feedType = feedTypes.find(ft => ft.id === stock.feedType?.id || ft.id === stock.feed_type_id)
                  if (!feedType) return false
                  const threshold = feedType.low_stock_threshold || 50
                  return stock.currentStock < threshold
                }).map((item: any, index: number) => {
                  const feedType = feedTypes.find(ft => ft.id === item.feedType?.id || ft.id === item.feed_type_id)
                  const threshold = feedType?.low_stock_threshold || 50
                  const percentageRemaining = ((item.currentStock / threshold) * 100).toFixed(0)
                  const isCritical = item.currentStock <= threshold * 0.2
                  
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
                      <div className="ml-2 text-right">
                        <Badge 
                          variant="destructive" 
                          className="text-xs mb-1"
                        >
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
          </Card>
        </div>
      )}

      {/* Horizontal Tabs - Optimized for both Mobile and Desktop */}
      <div className="px-4 lg:px-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Horizontal Tab Layout for both Mobile and Desktop */}
          <TabsList className={`
            ${isMobile
              ? 'w-full h-12 p-1 grid grid-cols-4 gap-1'
              : 'h-12 w-auto inline-flex gap-2 justify-start'
            }
          `}>
            <TabsTrigger
              value="overview"
              className={`
                ${isMobile
                  ? 'text-xs px-2 py-2 h-10'
                  : 'text-sm px-6 py-2 h-10 min-w-[120px]'
                }
              `}
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="inventory"
              className={`
                ${isMobile
                  ? 'text-xs px-2 py-2 h-10'
                  : 'text-sm px-6 py-2 h-10 min-w-[120px]'
                }
              `}
            >
              {isMobile ? 'Stock' : 'Inventory'}
            </TabsTrigger>
            <TabsTrigger
              value="consumption"
              className={`
                ${isMobile
                  ? 'text-xs px-2 py-2 h-10'
                  : 'text-sm px-6 py-2 h-10 min-w-[120px]'
                }
              `}
            >
              {isMobile ? 'Usage' : 'Consumption'}
            </TabsTrigger>
            <TabsTrigger
              value="types"
              className={`
                ${isMobile
                  ? 'text-xs px-2 py-2 h-10'
                  : 'text-sm px-6 py-2 h-10 min-w-[120px]'
                }
              `}
            >
              Types
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-6">
            <FeedOverviewTab
              feedStats={feedStats}
              feedTypes={feedTypes}
              inventory={inventory}
              consumptionRecords={consumptionRecords}
              isMobile={isMobile}
              canManageFeed={canManageFeed}
              onAddFeedType={() => setShowAddTypeModal(true)}
            />
          </TabsContent>

          <TabsContent value="inventory" className="mt-6">
            <FeedInventoryTab
              inventory={inventory}
              feedTypes={feedTypes}
              isMobile={isMobile}
              canManageFeed={canManageFeed}
              onAddInventory={() => setShowAddInventoryModal(true)}
              weightConversions={weightConversions}
              onInventoryUpdated={setInventory}
              consumptionRecords={consumptionRecords}
            />
          </TabsContent>

          <TabsContent value="consumption" className="mt-6">
            <FeedConsumptionTab
              consumptionRecords={consumptionRecords}
              feedStats={feedStats}
              isMobile={isMobile}
              canRecordFeeding={canRecordFeeding}
              canEditRecords={canEditRecords}
              canDeleteRecords={canDeleteRecords}
              onRecordFeeding={handleOpenConsumptionModal}
              onEditRecord={handleEditRecord}
              onDeleteRecord={handleDeleteRecord}
            />
          </TabsContent>

          <TabsContent value="types" className="mt-6">
            <FeedTypesTab
              feedTypes={feedTypes}
              isMobile={isMobile}
              canManageFeed={canManageFeed}
              farmId={farmId}
              onAddFeedType={() => setShowAddTypeModal(true)}
              onFeedTypeUpdated={handleFeedTypeUpdated}
              onFeedTypeDeleted={handleFeedTypeDeleted}
              feedTypeCategories={feedTypeCategories}
              animalCategories={animalCategories}
              weightConversions={weightConversions}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <AddFeedTypeModal
        farmId={farmId}
        isOpen={showAddTypeModal}
        onClose={() => setShowAddTypeModal(false)}
        onSuccess={handleFeedTypeAdded}
        feedTypeCategories={feedTypeCategories}
        animalCategories={animalCategories}
        weightConversions={weightConversions}
      />

      <AddFeedInventoryModal
        farmId={farmId}
        feedTypes={feedTypes}
        weightConversions={weightConversions}
        isOpen={showAddInventoryModal}
        onClose={() => setShowAddInventoryModal(false)}
        onSuccess={handleInventoryAdded}
      />

      <FeedConsumptionModal
        farmId={farmId}
        feedTypes={feedTypes}
        animals={animals}
        inventory={inventory}
        isOpen={showConsumptionModal}
        onClose={handleCloseConsumptionModal}
        onSuccess={handleConsumptionAdded}
        isMobile={isMobile}
        consumptionBatches={consumptionBatches}
        feedTypeCategories={feedTypeCategories}
        animalCategories={animalCategories}
        editingRecord={editingRecord}
      />
    </div>
  )
}