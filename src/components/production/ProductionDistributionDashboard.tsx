// src/components/production/ProductionDistributionDashboard.tsx
'use client'

import { useState, useMemo } from 'react'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

// Production components
import { ProductionChart } from '@/components/production/ProductionChart'
import { ProductionRecordsList } from '@/components/production/ProductionRecordsList'
import { ProductionEntryForm } from '@/components/production/ProductionEntryForm'

// Distribution components
import { DistributionChart } from '@/components/distribution/DistributionChart'
import { DistributionRecordsList } from '@/components/distribution/DistributionRecordsList'
import { DistributionEntryForm } from '@/components/distribution/DistributionEntryForm'
import { ChannelManager } from '@/components/distribution/ChannelManager'

import { Modal } from '@/components/ui/Modal'

// Mobile-specific components
import { MobileStatsScroller } from '@/components/mobile/MobileStatsScroller'
import { MobileActionSheet } from '@/components/mobile/MobileActionSheet'

import { 
  Plus, 
  TrendingUp, 
  Droplets, 
  Truck,
  BarChart3, 
  Calendar,
  Target,
  DollarSign,
  Users,
  Clock,
  Settings,
  MoreHorizontal,
  Upload,
  Download,
  FileText,
  MapPin,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { ProductionSettings, DistributionSettings } from '@/types/production-distribution-settings'

interface ProductionDistributionDashboardProps {
  farmId: string
  // Production props
  productionStats: {
    totalRecords: number
    totalVolume: number
    avgDailyVolume: number
    avgFatContent: number
    avgProteinContent: number
    periodDays: number
    dailySummaries: Array<{
      date: string
      volume: number
      fat: number
      protein: number
      animalsMilked?: number
    }>
  }
  productionRecords: any[]
  animals: any[]
  productionSettings: ProductionSettings | null
  // Distribution props
  distributionStats: {
    totalDistributed: number
    totalRevenue: number
    totalChannels: number
    avgPricePerLiter: number
    periodDays: number
    dailySummaries: Array<{
      date: string
      volume: number
      revenue: number
      channels: number
    }>
    topChannels: Array<{
      id: string
      name: string
      type: 'cooperative' | 'processor' | 'direct' | 'retail'
      volume: number
      revenue: number
      lastDelivery: string
    }>
  }
  distributionRecords: Array<{
    id: string
    date: string
    channelName: string
    channelType: 'cooperative' | 'processor' | 'direct' | 'retail'
    volume: number
    pricePerLiter: number
    totalAmount: number
    status: 'pending' | 'delivered' | 'paid'
    paymentMethod?: string
    driverName?: string
  }>
  channels: Array<{
    id: string
    name: string
    type: 'cooperative' | 'processor' | 'direct' | 'retail'
    contact: string
    pricePerLiter: number
    isActive: boolean
  }>
  availableVolume: number
  distributionSettings: DistributionSettings | null
  userRole: string
}

export function ProductionDistributionDashboard({
  farmId,
  productionStats,
  productionRecords: initialProductionRecords,
  animals,
  productionSettings,
  distributionStats,
  distributionRecords: initialDistributionRecords,
  channels,
  availableVolume,
  distributionSettings,
  userRole
}: ProductionDistributionDashboardProps) {
  const { isMobile, isTablet } = useDeviceInfo()

  // State management
  const [activeTab, setActiveTab] = useState('production')
  const [showProductionEntryModal, setShowProductionEntryModal] = useState(false)
  const [showDistributionEntryModal, setShowDistributionEntryModal] = useState(false)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [productionRecords, setProductionRecords] = useState(initialProductionRecords)
  const [distributionRecords, setDistributionRecords] = useState(initialDistributionRecords)
  
  // Permissions
  const canAddRecords = ['farm_owner', 'farm_manager', 'worker'].includes(userRole)
  const canManageDistribution = ['farm_owner', 'farm_manager'].includes(userRole)
  
  // Handlers
  const handleProductionRecordAdded = () => {
    setShowProductionEntryModal(false)
    window.location.reload()
  }

  const handleDistributionRecordAdded = () => {
    setShowDistributionEntryModal(false)
    window.location.reload()
  }

  const handleChannelUpdated = () => {
    setShowChannelModal(false)
    window.location.reload()
  }

  // Determine if quality tracking is enabled (Advanced or Quality Focused modes)
  const isQualityTracked = useMemo(() => {
    if (!productionSettings) return true // Default to showing quality if settings not loaded
    return productionSettings.productionTrackingMode !== 'basic' && productionSettings.enableQualityTracking !== false
  }, [productionSettings])

  // Calculate statistics for Basic Mode (Animals Milked & Yield)
  const { animalsMilkedToday, avgYieldPerAnimal } = useMemo(() => {
    // Sort summaries by date descending to get latest
    const sortedSummaries = [...productionStats.dailySummaries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    
    // Get latest count (today or most recent entry)
    const latestSummary = sortedSummaries[0]
    const animalsMilkedToday = latestSummary?.animalsMilked || 0
    
    // Calculate average animals milked over the period
    const totalAnimalsMilked = productionStats.dailySummaries.reduce((sum, day) => sum + (day.animalsMilked || 0), 0)
    const daysWithRecords = productionStats.dailySummaries.filter(day => (day.animalsMilked || 0) > 0).length
    const avgAnimals = daysWithRecords > 0 ? totalAnimalsMilked / daysWithRecords : 0
    
    // Calculate yield: Avg Daily Volume / Avg Animals
    const avgYieldPerAnimal = avgAnimals > 0 ? productionStats.avgDailyVolume / avgAnimals : 0
    
    return { animalsMilkedToday, avgYieldPerAnimal }
  }, [productionStats])

  // Stats configurations
  const productionStatsConfig = useMemo(() => {
    const baseStats = [
      {
        title: 'Records',
        value: productionStats.totalRecords,
        icon: Calendar,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        description: `Last ${productionStats.periodDays} days`
      },
      {
        title: 'Total Volume',
        value: `${productionStats.totalVolume.toFixed(1)}${productionSettings?.productionUnit === 'kg' ? 'kg' : 'L'}`,
        icon: Droplets,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-50',
        description: `${productionStats.avgDailyVolume.toFixed(1)}${productionSettings?.productionUnit === 'kg' ? 'kg' : 'L'} daily avg`
      }
    ]

    if (isQualityTracked) {
      // Show Quality Stats
      return [
        ...baseStats,
        {
          title: 'Avg Fat',
          value: `${productionStats.avgFatContent.toFixed(2)}%`,
          icon: Target,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          description: 'Quality indicator'
        },
        {
          title: 'Avg Protein',
          value: `${productionStats.avgProteinContent.toFixed(2)}%`,
          icon: TrendingUp,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          description: 'Nutritional value'
        }
      ]
    } else {
      // Show Volume/Animal Stats
      return [
        ...baseStats,
        {
          title: 'Animals Milked',
          value: animalsMilkedToday,
          icon: Activity,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          description: 'Recorded in last session'
        },
        {
          title: 'Avg Yield',
          value: `${avgYieldPerAnimal.toFixed(1)} ${productionSettings?.productionUnit === 'kg' ? 'kg' : 'L'}`,
          icon: BarChart3,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          description: 'Per animal daily'
        }
      ]
    }
  }, [productionStats, isQualityTracked, animalsMilkedToday, avgYieldPerAnimal, productionSettings])

  const distributionStatsConfig = [
    {
      title: 'Distributed',
      value: `${distributionStats.totalDistributed.toFixed(1)}L`,
      icon: Truck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: `Last ${distributionStats.periodDays} days`
    },
    {
      title: 'Revenue',
      value: `KSh ${distributionStats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: `KSh ${distributionStats.avgPricePerLiter.toFixed(2)}/L avg`
    },
    {
      title: 'Channels',
      value: distributionStats.totalChannels,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Active buyers'
    },
    {
      title: 'Available',
      value: `${availableVolume.toFixed(1)}L`,
      icon: Clock,
      color: availableVolume > 0 ? 'text-orange-600' : 'text-gray-600',
      bgColor: availableVolume > 0 ? 'bg-orange-50' : 'bg-gray-50',
      description: 'Ready to distribute'
    }
  ]

  // Action sheet configurations based on active tab
  const getActionSheetItems = () => {
    if (activeTab === 'production') {
      return canAddRecords ? [
        {
          id: 'record-production',
          label: 'Record Production',
          icon: Plus,
          color: 'text-blue-600',
          onClick: () => setShowProductionEntryModal(true)
        },
        {
          id: 'bulk-entry',
          label: 'Bulk Entry',
          icon: Upload,
          color: 'text-purple-600',
          onClick: () => window.location.href = '/dashboard/production/bulk'
        },
        {
          id: 'export-data',
          label: 'Export Data',
          icon: Download,
          color: 'text-green-600',
          onClick: () => console.log('Export production data')
        },
        {
          id: 'view-reports',
          label: 'View Reports',
          icon: FileText,
          color: 'text-indigo-600',
          onClick: () => window.location.href = '/dashboard/production/reports'
        }
      ] : []
    } else {
      return [
        ...(canAddRecords ? [
          {
            id: 'record-distribution',
            label: 'Record Distribution',
            icon: Plus,
            color: 'text-blue-600',
            onClick: () => setShowDistributionEntryModal(true)
          }
        ] : []),
        ...(canManageDistribution ? [
          {
            id: 'manage-channels',
            label: 'Manage Channels',
            icon: Settings,
            color: 'text-purple-600',
            onClick: () => setShowChannelModal(true)
          }
        ] : []),
        {
          id: 'export-data',
          label: 'Export Data',
          icon: Download,
          color: 'text-green-600',
          onClick: () => console.log('Export distribution data')
        },
        {
          id: 'view-routes',
          label: 'View Routes',
          icon: MapPin,
          color: 'text-indigo-600',
          onClick: () => window.location.href = '/dashboard/distribution/routes'
        },
        {
          id: 'view-reports',
          label: 'View Reports',
          icon: FileText,
          color: 'text-gray-600',
          onClick: () => window.location.href = '/dashboard/distribution/reports'
        }
      ]
    }
  }

  const currentStatsConfig = activeTab === 'production' ? productionStatsConfig : distributionStatsConfig
  
  return (
    <div className="space-y-6 pb-safe">
      {/* Mobile-Optimized Header */}
      <div className={`${isMobile ? 'px-4' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 flex items-center space-x-2`}>
              {activeTab === 'production' ? (
                <>
                  <Droplets className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-cyan-600`} />
                  <span>{isMobile ? 'Production' : 'Milk Production'}</span>
                </>
              ) : (
                <>
                  <Truck className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-blue-600`} />
                  <span>{isMobile ? 'Distribution' : 'Milk Distribution'}</span>
                </>
              )}
            </h1>
            {!isMobile && (
              <p className="text-gray-600 mt-2">
                {activeTab === 'production' 
                  ? 'Track and analyze milk production across your herd'
                  : 'Manage milk distribution channels and track deliveries'
                }
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {isMobile ? (
              // Mobile: Single action button that opens action sheet
              canAddRecords && (
                <Button
                  onClick={() => setShowActionSheet(true)}
                  size="lg"
                  className="h-12 w-12 rounded-full p-0"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              )
            ) : (
              // Desktop: Multiple action buttons based on active tab
              <div className="flex space-x-3">
                {activeTab === 'production' ? (
                  canAddRecords && (
                    <>
                      <Button onClick={() => setShowProductionEntryModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Record Production
                      </Button>
                      <Button asChild variant="outline">
                        <Link href="/dashboard/production/bulk">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Bulk Entry
                        </Link>
                      </Button>
                    </>
                  )
                ) : (
                  <>
                    {canAddRecords && (
                      <Button onClick={() => setShowDistributionEntryModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Record Distribution
                      </Button>
                    )}
                    {canManageDistribution && (
                      <Button onClick={() => setShowChannelModal(true)} variant="outline">
                        <Users className="mr-2 h-4 w-4" />
                        Manage Channels
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Available Volume Alert - Only show in distribution tab */}
        {activeTab === 'distribution' && availableVolume > 0 && (
          <div className={`mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg ${isMobile ? 'text-sm' : ''}`}>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-800">
                {availableVolume.toFixed(1)}L available for distribution
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className={`${isMobile ? 'px-4' : ''}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="production" className="flex items-center space-x-2">
              <Droplets className="w-4 h-4" />
              <span>Production</span>
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center space-x-2">
              <Truck className="w-4 h-4" />
              <span>Distribution</span>
            </TabsTrigger>
          </TabsList>

          {/* Production Tab Content */}
          <TabsContent value="production" className="space-y-6 mt-6">
            {/* Production Stats */}
            <div>
              {isMobile ? (
                <MobileStatsScroller stats={productionStatsConfig} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {productionStatsConfig.map((stat, index) => {
                    const Icon = stat.icon
                    return (
                      <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{stat.value}</div>
                          <p className="text-xs text-muted-foreground">
                            {stat.description}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Production Chart */}
            <Card className={`${isMobile ? 'mx-4' : ''}`}>
              <CardHeader className={`${isMobile ? 'pb-2' : ''}`}>
                <CardTitle className={`${isMobile ? 'text-lg' : ''}`}>Production Trends</CardTitle>
                {!isMobile && (
                  <CardDescription>
                    Daily milk production over the last {productionStats.periodDays} days
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className={`${isMobile ? 'px-2' : ''}`}>
                <div className={`${isMobile ? 'overflow-x-auto' : ''}`}>
                  <div className={`${isMobile ? 'min-w-[600px]' : ''}`}>
                    <ProductionChart 
                      data={productionStats.dailySummaries.map(summary => ({
                        record_date: summary.date,
                        total_milk_volume: summary.volume,
                        average_fat_content: summary.fat,
                        average_protein_content: summary.protein,
                        animals_milked: summary.animalsMilked || 0 // Pass through new prop
                      }))} 
                      isMobile={isMobile}
                      settings={productionSettings}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Production Records */}
            <Card className={`${isMobile ? 'mx-4 mb-20' : ''}`}>
              <CardHeader className={`${isMobile ? 'pb-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className={`${isMobile ? 'text-lg' : ''}`}>Recent Records</CardTitle>
                    {!isMobile && (
                      <CardDescription>
                        Latest milk production entries
                      </CardDescription>
                    )}
                  </div>
                  
                  {/* Quick Action for Mobile */}
                  {isMobile && canAddRecords && (
                    <Button
                      onClick={() => setShowProductionEntryModal(true)}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className={`${isMobile ? 'px-2' : ''}`}>
                <ProductionRecordsList 
                  records={productionRecords} 
                  canEdit={canAddRecords}
                  isMobile={isMobile}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution Tab Content */}
          <TabsContent value="distribution" className="space-y-6 mt-6">
            {/* Distribution Stats */}
            <div>
              {isMobile ? (
                <MobileStatsScroller stats={distributionStatsConfig} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {distributionStatsConfig.map((stat, index) => {
                    const Icon = stat.icon
                    return (
                      <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{stat.value}</div>
                          <p className="text-xs text-muted-foreground">
                            {stat.description}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Distribution Chart */}
            <Card className={`${isMobile ? 'mx-4' : ''}`}>
              <CardHeader className={`${isMobile ? 'pb-2' : ''}`}>
                <CardTitle className={`${isMobile ? 'text-lg' : ''}`}>Distribution Trends</CardTitle>
                {!isMobile && (
                  <CardDescription>
                    Daily distribution volume and revenue over the last {distributionStats.periodDays} days
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className={`${isMobile ? 'px-2' : ''}`}>
                <div className={`${isMobile ? 'overflow-x-auto' : ''}`}>
                  <div className={`${isMobile ? 'min-w-[600px]' : ''}`}>
                    <DistributionChart 
                      data={distributionStats.dailySummaries} 
                      isMobile={isMobile}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Channels */}
            <Card className={`${isMobile ? 'mx-4' : ''}`}>
              <CardHeader className={`${isMobile ? 'pb-2' : ''}`}>
                <CardTitle className={`${isMobile ? 'text-lg' : ''}`}>Top Distribution Channels</CardTitle>
                {!isMobile && (
                  <CardDescription>
                    Best performing distribution partners
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className={`${isMobile ? 'px-2' : ''}`}>
                <div className="space-y-3">
                  {distributionStats.topChannels.map((channel, index) => (
                    <div key={channel.id} className={`flex items-center justify-between p-3 rounded-lg border ${isMobile ? 'text-sm' : ''}`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{channel.name}</div>
                          <div className="text-gray-500 text-xs capitalize">{channel.type}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{channel.volume.toFixed(1)}L</div>
                        <div className="text-gray-500 text-xs">KSh {channel.revenue.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Distribution Records */}
            <Card className={`${isMobile ? 'mx-4 mb-20' : ''}`}>
              <CardHeader className={`${isMobile ? 'pb-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className={`${isMobile ? 'text-lg' : ''}`}>Recent Distributions</CardTitle>
                    {!isMobile && (
                      <CardDescription>
                        Latest distribution records
                      </CardDescription>
                    )}
                  </div>
                  
                  {/* Quick Action for Mobile */}
                  {isMobile && canAddRecords && (
                    <Button
                      onClick={() => setShowDistributionEntryModal(true)}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className={`${isMobile ? 'px-2' : ''}`}>
                <DistributionRecordsList 
                  records={distributionRecords} 
                  canEdit={canAddRecords}
                  isMobile={isMobile}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Action Sheet */}
      {isMobile && (
        <MobileActionSheet
          isOpen={showActionSheet}
          onClose={() => setShowActionSheet(false)}
          title={`${activeTab === 'production' ? 'Production' : 'Distribution'} Actions`}
          items={getActionSheetItems()}
        />
      )}
      
      {/* Production Entry Modal */}
      {showProductionEntryModal && (
        <Modal 
          isOpen={showProductionEntryModal} 
          onClose={() => setShowProductionEntryModal(false)}
          className={`${isMobile ? 'max-w-full mx-4 my-4 h-[90vh] overflow-y-auto' : 'max-w-4xl'}`}
        >
          <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <ProductionEntryForm
              farmId={farmId}
              animals={animals}
              onSuccess={handleProductionRecordAdded}
              isMobile={isMobile}
              settings={productionSettings}
            />
          </div>
        </Modal>
      )}

      {/* Distribution Entry Modal */}
      {showDistributionEntryModal && (
        <Modal 
          isOpen={showDistributionEntryModal} 
          onClose={() => setShowDistributionEntryModal(false)}
          className={`${isMobile ? 'max-w-full mx-4 my-4 h-[90vh] overflow-y-auto' : 'max-w-4xl'}`}
        >
          <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <DistributionEntryForm
              farmId={farmId}
              channels={channels}
              availableVolume={availableVolume}
              onSuccess={handleDistributionRecordAdded}
              isMobile={isMobile}
              settings={distributionSettings}
            />
          </div>
        </Modal>
      )}

      {/* Channel Management Modal */}
      {showChannelModal && (
        <Modal 
          isOpen={showChannelModal} 
          onClose={() => setShowChannelModal(false)}
          className={`${isMobile ? 'max-w-full mx-4 my-4 h-[90vh] overflow-y-auto' : 'max-w-4xl'}`}
        >
          <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <ChannelManager
              farmId={farmId}
              channels={channels}
              onSuccess={handleChannelUpdated}
              isMobile={isMobile}
              settings={distributionSettings}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}