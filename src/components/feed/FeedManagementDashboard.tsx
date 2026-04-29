// src/components/feed/FeedManagementDashboard.tsx
'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AddFeedInventoryModal } from '@/components/feed/AddFeedInventoryModal'
import { FeedConsumptionModal } from '@/components/feed/FeedConsumptionModal'
import { FeedingGroupsManager } from '@/components/feed/FeedingGroupsManager'
import { FeedOverviewTab } from '@/components/feed/FeedOverviewTab'
import { FeedInventoryTab } from '@/components/feed/FeedInventoryTab'
import { FeedConsumptionTab } from '@/components/feed/FeedConsumptionTab'
import { FeedStatsCards } from '@/components/feed/FeedStatsCards'
import { FeedMixRecipeManager } from '@/components/feed/FeedMixRecipeManager'
import { NutritionalDataManager } from '@/components/feed/NutritionalDataManager'
import { FeedRationsTab } from '@/components/feed/FeedRationsTab'
import { FeedWasteTab } from '@/components/feed/FeedWasteTab'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import {
  Plus,
  Package,
  DollarSign,
  AlertTriangle,
  Wheat,
  MoreVertical,
  Clock,
  Users,
  Lightbulb,
  Zap,
  Leaf,
  FlaskConical
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
  storageLocations?: any[]
  suppliers?: any[]
  feedMixRecipes?: any[]
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
  storageLocations = [],
  suppliers = [],
  feedMixRecipes: initialFeedMixRecipes = [],
}: FeedManagementDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false)
  const [showConsumptionModal, setShowConsumptionModal] = useState(false)
  const [showFeedingGroupsModal, setShowFeedingGroupsModal] = useState(false)
  const [showCreateRationModal, setShowCreateRationModal] = useState(false)
  const [showCreateTMRModal, setShowCreateTMRModal] = useState(false)
  const [feedTypes, setFeedTypes] = useState(initialFeedTypes)
  const [inventory, setInventory] = useState(initialInventory)
  const [consumptionRecords, setConsumptionRecords] = useState(initialConsumptionRecords)
  const [feedMixRecipes, setFeedMixRecipes] = useState(initialFeedMixRecipes)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [scheduledFeedings, setScheduledFeedings] = useState<any[]>([])
  const [scheduledFeedingsLoaded, setScheduledFeedingsLoaded] = useState(false)
  // Animals and mix recipes are loaded lazily to avoid blocking initial render
  const [loadedAnimals, setLoadedAnimals] = useState<any[]>(animals)
  const [animalsLoaded, setAnimalsLoaded] = useState(animals.length > 0)
  const [recipesLoaded, setRecipesLoaded] = useState(initialFeedMixRecipes.length > 0)

  const loadScheduledFeedings = useCallback(async () => {
    try {
      const res = await fetch(`/api/farms/${farmId}/scheduled-feedings?status=pending,overdue`)
      if (!res.ok) return
      const json = await res.json()
      setScheduledFeedings(json.data ?? [])
      setScheduledFeedingsLoaded(true)
    } catch (err) {
      console.error('Failed to load scheduled feedings:', err)
    }
  }, [farmId])

  const loadConsumptionRecords = useCallback(async () => {
    try {
      const res = await fetch(`/api/feed/consumption?limit=50`)
      if (!res.ok) return
      const json = await res.json()
      setConsumptionRecords(json.data ?? json.records ?? [])
    } catch (err) {
      console.error('Failed to load consumption records:', err)
    }
  }, [])

  const handleScheduledFeedingConfirmed = useCallback(async () => {
    // Reload both scheduled feedings and consumption records
    await Promise.all([
      loadScheduledFeedings(),
      loadConsumptionRecords(),
    ])
  }, [loadScheduledFeedings, loadConsumptionRecords])

  const ensureAnimalsLoaded = useCallback(async () => {
    if (animalsLoaded) return
    try {
      const res = await fetch(`/api/farms/${farmId}/animals`)
      if (!res.ok) return
      const json = await res.json()
      setLoadedAnimals(json.animals ?? json.data ?? [])
      setAnimalsLoaded(true)
    } catch (err) {
      console.error('Failed to lazy-load animals:', err)
    }
  }, [animalsLoaded, farmId])

  const ensureRecipesLoaded = useCallback(async () => {
    if (recipesLoaded) return
    try {
      const res = await fetch(`/api/farms/${farmId}/feed-recipes`)
      if (!res.ok) return
      const json = await res.json()
      setFeedMixRecipes(json.recipes ?? [])
      setRecipesLoaded(true)
    } catch (err) {
      console.error('Failed to lazy-load recipes:', err)
    }
  }, [recipesLoaded, farmId])

  useEffect(() => {
  const handleMobileNavAction = (event: Event) => {
    const customEvent = event as CustomEvent
    const { action } = customEvent.detail

    if (action === 'showRecordFeedingModal') {
      handleOpenConsumptionModal()
    } else if (action === 'showAddInventoryModal') {
      setShowAddInventoryModal(true)
    }
  }

  window.addEventListener('mobileNavModalAction', handleMobileNavAction)
  return () => {
    window.removeEventListener('mobileNavModalAction', handleMobileNavAction)
  }
}, [])

  const { isMobile, isTablet, isSmallMobile, isDesktop } = useDeviceInfo()
  const canManageFeed = ['farm_owner', 'farm_manager'].includes(userRole)
  const canRecordFeeding = ['farm_owner', 'farm_manager', 'worker'].includes(userRole)
  const canEditRecords = ['farm_owner', 'farm_manager'].includes(userRole)
  const canDeleteRecords = ['farm_owner', 'farm_manager'].includes(userRole)

  // Calculate enhanced stats for Kenyan dairy farmers
  const enhancedStats = useMemo(() => {
    // Calculate current inventory value
    const currentInventoryValue = inventory.reduce((sum, item) => 
      sum + (item.total_cost || 0), 0
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
          
          const totalFed = feedConsumption.reduce((sum, record) => sum + (record.quantity_consumed || 0), 0)
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



  const handleInventoryAdded = async (newInventory: any) => {
    // Refetch the full inventory list so feed_types data (unit conversions,
    // thresholds, is_formulate_feed) is included for every item, including
    // newly formulated feeds that were just inserted via the ledger trigger.
    try {
      const res = await fetch('/api/feed/inventory')
      if (res.ok) {
        const json = await res.json()
        setInventory(json.data ?? [])
      } else {
        // Fallback: upsert the returned item into existing state
        setInventory(prev => {
          const existingIdx = prev.findIndex((i: any) =>
            i.feed_type_id === newInventory?.feed_type_id
          )
          if (existingIdx >= 0) {
            const updated = [...prev]
            updated[existingIdx] = { ...prev[existingIdx], ...newInventory }
            return updated
          }
          return newInventory ? [newInventory, ...prev] : prev
        })
      }
    } catch {
      setInventory(prev =>
        newInventory ? [newInventory, ...prev] : prev
      )
    }
  }

  const handleConsumptionAdded = useCallback((newConsumption: any) => {
    if (editingRecord) {
      setConsumptionRecords(prev => prev.map(record =>
        record.id === editingRecord.id ? newConsumption[0] : record
      ))
      setEditingRecord(null)
    } else {
      setConsumptionRecords(prev => [...newConsumption, ...prev])
    }
    setShowConsumptionModal(false)
    window.location.reload()
  }, [editingRecord])

  const handleEditRecord = (record: any) => {
    setEditingRecord(record)
    ensureAnimalsLoaded()
    ensureRecipesLoaded()
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

  const handleOpenConsumptionModal = useCallback(() => {
    setEditingRecord(null)
    ensureAnimalsLoaded()
    ensureRecipesLoaded()
    setShowConsumptionModal(true)
  }, [ensureAnimalsLoaded, ensureRecipesLoaded])

  const handleCloseConsumptionModal = useCallback(() => {
    setEditingRecord(null)
    setShowConsumptionModal(false)
  }, [])

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

  // Stats configuration
  const feedStatsConfig = useMemo(() => [
    {
      title: 'Daily Feed Cost',
      value: `KSh${feedStats.avgDailyCost?.toFixed(0) || '0'}`,
      icon: DollarSign,
      color: 'bg-green-500',
      bgColor: 'bg-green-100',
      description: `KSh${enhancedStats.costPerAnimalPerDay.toFixed(0)}/animal/day`,
      trend: feedStats.avgDailyCost > 0 ? 'Active' : '',
      isGood: feedStats.avgDailyCost > 0
    },
    {
      title: 'Current Stock Value',
      value: `KSh${(enhancedStats.currentInventoryValue / 1000).toFixed(0)}k`,
      icon: Package,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-100',
      description: `${inventory.length} inventory items`,
      trend: inventory.length > 0 ? 'Stocked' : '',
      isGood: inventory.length > 0
    },
    {
      title: 'Feed Days Left',
      value: enhancedStats.averageDaysRemaining > 0 ? `${enhancedStats.averageDaysRemaining}d` : 'N/A',
      icon: Clock,
      color: enhancedStats.averageDaysRemaining > 14 ? 'bg-green-500' : (enhancedStats.averageDaysRemaining > 7 ? 'bg-orange-500' : 'bg-red-500'),
      bgColor: enhancedStats.averageDaysRemaining > 14 ? 'bg-green-100' : (enhancedStats.averageDaysRemaining > 7 ? 'bg-orange-100' : 'bg-red-100'),
      description: enhancedStats.averageDaysRemaining > 0 ? 'Average across feeds' : 'Start feeding to calculate',
      trend: enhancedStats.averageDaysRemaining > 0 ? (enhancedStats.averageDaysRemaining > 14 ? 'Good' : 'Warning') : '',
      isGood: enhancedStats.averageDaysRemaining > 14
    },
    {
      title: 'Animals Fed',
      value: enhancedStats.activeAnimalsFed || loadedAnimals.length,
      icon: Users,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-100',
      description: `${feedStats.totalSessions || consumptionRecords.length} sessions this month`,
      trend: enhancedStats.activeAnimalsFed > 0 ? 'Active' : '',
      isGood: enhancedStats.activeAnimalsFed > 0
    },
    {
      title: 'Stock Alerts',
      value: enhancedStats.alertCounts.total,
      icon: AlertTriangle,
      color: enhancedStats.alertCounts.total > 0 ? 'bg-red-500' : 'bg-gray-500',
      bgColor: enhancedStats.alertCounts.total > 0 ? 'bg-red-100' : 'bg-gray-100',
      description: `${enhancedStats.alertCounts.critical} critical, ${enhancedStats.alertCounts.low} low`,
      trend: enhancedStats.alertCounts.total > 0 ? 'Alert' : 'Good',
      isGood: enhancedStats.alertCounts.total === 0
    }
  ], [feedStats, inventory, enhancedStats, loadedAnimals, consumptionRecords])

  // Quick Actions Menu
  const QuickActionsMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={isMobile ? "sm" : "default"}>
          {isMobile ? (
            <Plus className="h-4 w-4" />
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Quick Actions
            </>
          )}
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
            <DropdownMenuItem onClick={() => setShowFeedingGroupsModal(true)}>
              <Leaf className="mr-2 h-4 w-4" />
              Manage Feeding Groups
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setActiveTab('recipes'); ensureRecipesLoaded(); setShowCreateTMRModal(true) }}>
              <FlaskConical className="mr-2 h-4 w-4" />
              Create TMR Recipe
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowAddInventoryModal(true)}>
              <Package className="mr-2 h-4 w-4" />
              Add Inventory
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setActiveTab('rations'); setShowCreateRationModal(true) }}>
              <FlaskConical className="mr-2 h-4 w-4" />
              Create Feed Ration
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
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
            <QuickActionsMenu />
          </div>
        </div>
      </div>

      {/* Feed Stats Cards */}
      <div className={`${isMobile ? 'px-0' : ''}`}>
        <FeedStatsCards
          stats={feedStatsConfig}
          averageDaysRemaining={enhancedStats.averageDaysRemaining}
          alertCounts={enhancedStats.alertCounts}
        />
      </div>


      {/* Horizontal Tabs - Optimized for both Mobile and Desktop */}
      <div className="px-4 lg:px-0 mb-6">
        <Tabs
        value={activeTab}
        onValueChange={(tab) => {
          setActiveTab(tab)
          if (tab === 'recipes') ensureRecipesLoaded()
          if (tab === 'rations') ensureAnimalsLoaded()
          if (tab === 'consumption') loadScheduledFeedings()
        }}
        className="w-full"
      >
          {/* Horizontal Tab Layout — 4-tier responsive via useDeviceInfo */}
          {(() => {
            const listClass = isDesktop
              ? 'h-12 w-auto inline-flex gap-2 justify-start'
              : isSmallMobile
              ? 'w-full h-auto p-0.5 flex gap-0.5 justify-start overflow-x-auto'
              : 'w-full h-auto p-1 flex gap-1 justify-start overflow-x-auto'

            const triggerClass = isSmallMobile
              ? 'text-[10px] px-1.5 py-2 h-9 flex-shrink-0'
              : isMobile
              ? 'text-xs px-2 py-2 h-10 flex-shrink-0'
              : isTablet
              ? 'text-xs px-3 py-2 h-10 flex-shrink-0'
              : 'text-sm px-6 py-2 h-10 min-w-[120px]'

            return (
              <TabsList className={listClass}>
                <TabsTrigger value="overview" className={triggerClass}>
                  Overview
                </TabsTrigger>
                <TabsTrigger value="inventory" className={triggerClass}>
                  {isTablet || isDesktop ? 'Inventory' : 'Stock'}
                </TabsTrigger>
                <TabsTrigger value="consumption" className={triggerClass}>
                  {isTablet || isDesktop ? 'Consumption' : 'Usage'}
                </TabsTrigger>
                <TabsTrigger value="nutrition" className={triggerClass}>
                  {isSmallMobile ? 'Nutr.' : isDesktop ? 'Nutrition Data' : 'Nutrition'}
                </TabsTrigger>
                <TabsTrigger value="recipes" className={triggerClass}>
                  {isTablet || isDesktop ? 'TMR Recipes' : 'TMR'}
                </TabsTrigger>
                <TabsTrigger value="rations" className={triggerClass}>
                  {isDesktop ? 'Feed Rations' : 'Rations'}
                </TabsTrigger>
                <TabsTrigger value="waste" className={triggerClass}>
                  Waste
                </TabsTrigger>
              </TabsList>
            )
          })()}

          <TabsContent value="overview" className="space-y-4 mt-6">
            <FeedOverviewTab
              feedStats={feedStats}
              feedTypes={feedTypes}
              inventory={inventory}
              consumptionRecords={consumptionRecords}
              isMobile={isMobile}
              canManageFeed={canManageFeed}
              onAddFeedType={() => router.push(`/dashboard/settings/feeds?farmId=${farmId}&tab=feed-types`)}
              onAddInventory={() => setShowAddInventoryModal(true)}
              farmId={farmId}
              feedMixRecipes={feedMixRecipes}
              onTabChange={(tab) => {
                setActiveTab(tab)
                if (tab === 'recipes') ensureRecipesLoaded()
                if (tab === 'rations') ensureAnimalsLoaded()
                if (tab === 'consumption') loadScheduledFeedings()
              }}
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
              storageLocations={storageLocations}
            />
          </TabsContent>

          <TabsContent value="consumption" className="mt-6">
            <FeedConsumptionTab
              farmId={farmId}
              consumptionRecords={consumptionRecords}
              scheduledFeedings={scheduledFeedings}
              feedStats={feedStats}
              isMobile={isMobile}
              canRecordFeeding={canRecordFeeding}
              canEditRecords={canEditRecords}
              canDeleteRecords={canDeleteRecords}
              onRecordFeeding={handleOpenConsumptionModal}
              onEditRecord={handleEditRecord}
              onDeleteRecord={handleDeleteRecord}
              onScheduledFeedingConfirmed={handleScheduledFeedingConfirmed}
            />
          </TabsContent>

          <TabsContent value="nutrition" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Nutritional Data</span>
                </CardTitle>
                <CardDescription>
                  Add and manage nutritional information for your feed types. This data is used for 
                  smart feeding recommendations and nutritional calculations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NutritionalDataManager
                  farmId={farmId}
                  feedTypes={feedTypes}
                  canEdit={canManageFeed}
                  onUpdate={async (feedId, nutritionData) => {
                    // Update local state
                    setFeedTypes(feedTypes.map(f =>
                      f.id === feedId ? { ...f, nutritional_info: nutritionData } : f
                    ))
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rations" className="mt-6">
            <FeedRationsTab
              farmId={farmId}
              feedTypes={feedTypes}
              inventory={inventory}
              animals={loadedAnimals}
              animalCategories={animalCategories}
              canManageFeed={canManageFeed}
              isMobile={isMobile}
              initialOpenCreate={showCreateRationModal}
              onCreateModalClosed={() => setShowCreateRationModal(false)}
            />
          </TabsContent>

          <TabsContent value="waste" className="mt-6">
            <FeedWasteTab
              farmId={farmId}
              feedTypes={feedTypes}
              canManageFeed={canManageFeed}
              isMobile={isMobile}
            />
          </TabsContent>

          <TabsContent value="recipes" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5" />
                  <span>TMR (Total Mixed Ration)</span>
                </CardTitle>
                <CardDescription>
                  Define Total Mixed Ration blends linking feed ingredients with their proportions.
                  Link TMRs to feed rations for consistent, reusable nutrition planning.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FeedMixRecipeManager
                  farmId={farmId}
                  availableFeeds={feedTypes.map(f => ({ id: f.id, name: f.name, category: f.category_id, cost_per_unit: f.typical_cost_per_kg }))}
                  inventory={inventory}
                  onRecipeCreated={(recipe) => {
                    setFeedMixRecipes(prev => [...prev, recipe])
                  }}
                  onRecipeDeleted={(recipeId) => {
                    setFeedMixRecipes(prev => prev.filter(r => r.id !== recipeId))
                  }}
                  initialOpenCreate={showCreateTMRModal}
                  onCreateModalClosed={() => setShowCreateTMRModal(false)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <AddFeedInventoryModal
        farmId={farmId}
        feedTypes={feedTypes}
        feedTypeCategories={feedTypeCategories}
        weightConversions={weightConversions}
        storageLocations={storageLocations}
        suppliers={suppliers}
        inventoryStock={inventory.map((item: any) => ({
          feed_type_id: item.feed_type_id,
          quantity_in_stock: item.quantity_kg || 0,
        }))}
        isOpen={showAddInventoryModal}
        onClose={() => setShowAddInventoryModal(false)}
        onSuccess={handleInventoryAdded}
      />

      <FeedConsumptionModal
        farmId={farmId}
        feedTypes={feedTypes}
        animals={loadedAnimals}
        inventory={inventory}
        isOpen={showConsumptionModal}
        onClose={handleCloseConsumptionModal}
        onSuccess={handleConsumptionAdded}
        isMobile={isMobile}

        feedTypeCategories={feedTypeCategories}
        animalCategories={animalCategories}
        feedMixRecipes={feedMixRecipes}
        editingRecord={editingRecord}
      />

      {/* Feeding Groups Modal */}
      {showFeedingGroupsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end lg:items-center justify-center lg:p-4">
          <div className={`${isMobile ? 'w-full h-[90vh] rounded-t-2xl' : 'w-full max-w-2xl max-h-[90vh] rounded-lg'} bg-white shadow-lg overflow-auto`}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Manage Feeding Groups</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFeedingGroupsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            <div className="p-4 lg:p-6">
              <FeedingGroupsManager
                farmId={farmId}
                animals={loadedAnimals}
                isMobile={isMobile}
                onClose={() => setShowFeedingGroupsModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}