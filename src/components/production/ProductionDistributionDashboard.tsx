// src/components/production/ProductionDistributionDashboard.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

// Production components
import { ProductionChart } from '@/components/production/ProductionChart'
import { ProductionRecordsList } from '@/components/production/ProductionRecordsList'
import { ProductionEntryForm } from '@/components/production/ProductionEntryForm'
import { ProductionSessionBanner } from '@/components/production/ProductionSessionBanner' // Import the new banner

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
  productionStats: any
  productionRecords: any[]
  animals: any[]
  productionSettings: ProductionSettings | null
  distributionStats: any
  distributionRecords: any[]
  channels: any[]
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
  const { isMobile } = useDeviceInfo()

  const [activeTab, setActiveTab] = useState('production')
  const [showProductionEntryModal, setShowProductionEntryModal] = useState(false)
  const [showDistributionEntryModal, setShowDistributionEntryModal] = useState(false)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [productionRecords, setProductionRecords] = useState(initialProductionRecords)
  const [distributionRecords, setDistributionRecords] = useState(initialDistributionRecords)

  useEffect(() => {
    const handleMobileNavAction = (event: Event) => {
      const customEvent = event as CustomEvent
      const { action } = customEvent.detail

      if (action === 'showRecordProductionModal') {
        setShowProductionEntryModal(true)
      } else if (action === 'showRecordDistributionModal') {
        setShowDistributionEntryModal(true)
      } else if (action === 'showManageChannelsModal') {
        setShowChannelModal(true)
      }
    }

    window.addEventListener('mobileNavModalAction', handleMobileNavAction)
    return () => {
      window.removeEventListener('mobileNavModalAction', handleMobileNavAction)
    }
  }, [])
  
  const canAddRecords = ['farm_owner', 'farm_manager', 'worker'].includes(userRole)
  const canManageDistribution = ['farm_owner', 'farm_manager'].includes(userRole)
  
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

  // --- NEW LOGIC: SMART SESSION BANNER ---
  const sessionContext = useMemo(() => {
    if (!productionSettings?.enableSmartSessionBanner) return null;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    let activeSession = null;
    
    const enabledSessions = productionSettings.enabledSessions || [];
    const sessionTimes = productionSettings.sessionTimes || {};

    // Map sessions to times and sort
    const sortedSessions = enabledSessions.map(session => ({
      name: session,
      timeStr: sessionTimes[session] || "06:00",
      minutes: parseTime(sessionTimes[session] || "06:00")
    })).sort((a, b) => a.minutes - b.minutes);

    // Find the session that has started most recently
    for (const session of sortedSessions) {
      if (currentTimeMinutes >= session.minutes) {
        activeSession = session;
      }
    }

    // If active session found (meaning current time > session start)
    if (!activeSession) return null;

    const lateThreshold = productionSettings.sessionLateThresholdMinutes || 60;
    const isLate = (currentTimeMinutes - activeSession.minutes) > lateThreshold;

    const todayStr = new Date().toISOString().split('T')[0];
    const totalEligible = animals.length;

    // Count unique animals milked today for this specific session
    const uniqueMilkedAnimals = new Set(
      productionRecords
        .filter(r => r.record_date === todayStr && r.milking_session === activeSession!.name)
        .map(r => r.animal_id)
    ).size;

    const remaining = Math.max(0, totalEligible - uniqueMilkedAnimals);

    // Auto-hide if all work is done
    if (remaining === 0) return null;

    return {
      name: activeSession.name,
      timeStr: activeSession.timeStr,
      isLate,
      remaining,
      total: totalEligible
    };
  }, [productionSettings, animals, productionRecords]);
  // ----------------------------------------

  // Basic stats calculations...
  const { animalsMilkedToday, avgYieldPerAnimal } = useMemo(() => {
    const sortedSummaries = [...productionStats.dailySummaries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    const latestSummary = sortedSummaries[0]
    const animalsMilkedToday = latestSummary?.animalsMilked || 0
    
    const totalAnimalsMilked = productionStats.dailySummaries.reduce((sum: number, day: any) => sum + (day.animalsMilked || 0), 0)
    const daysWithRecords = productionStats.dailySummaries.filter((day: any) => (day.animalsMilked || 0) > 0).length
    const avgAnimals = daysWithRecords > 0 ? totalAnimalsMilked / daysWithRecords : 0
    const avgYieldPerAnimal = avgAnimals > 0 ? productionStats.avgDailyVolume / avgAnimals : 0
    
    return { animalsMilkedToday, avgYieldPerAnimal }
  }, [productionStats])

  // Determine if quality tracking is enabled
  const isQualityTracked = useMemo(() => {
    if (!productionSettings) return true 
    return productionSettings.productionTrackingMode !== 'basic' && productionSettings.enableQualityTracking !== false
  }, [productionSettings])

  // Define stats config...
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
        // ... other items
      ] : []
    } else {
      return [
        // ... distribution items
      ]
    }
  }

  return (
    <div className="space-y-6 pb-safe">
      {/* Header code ... */}
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
          </div>
          {/* Action buttons code... */}
          <div className="flex items-center space-x-2">
            {!isMobile && activeTab === 'production' && canAddRecords && (
               <Button onClick={() => setShowProductionEntryModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Production
               </Button>
            )}
             {!isMobile && activeTab === 'distribution' && canAddRecords && (
               <Button onClick={() => setShowDistributionEntryModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Distribution
               </Button>
            )}
            {isMobile && canAddRecords && (
              <Button onClick={() => setShowActionSheet(true)} size="lg" className="h-12 w-12 rounded-full p-0">
                <Plus className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className={`${isMobile ? 'px-4' : ''}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="production" className="space-y-6 mt-6">
            
            {/* NEW BANNER COMPONENT */}
            {sessionContext && (
              <ProductionSessionBanner 
                sessionName={sessionContext.name}
                sessionTime={sessionContext.timeStr}
                isLate={sessionContext.isLate}
                remainingAnimals={sessionContext.remaining}
                totalEligibleAnimals={sessionContext.total}
                onRecordClick={() => setShowProductionEntryModal(true)}
              />
            )}

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
                          <p className="text-xs text-muted-foreground">{stat.description}</p>
                        </CardContent>
                      </Card>
                     )
                  })}
                </div>
              )}
            </div>

            <Card className={`${isMobile ? 'mx-4' : ''}`}>
              <CardHeader className={`${isMobile ? 'pb-2' : ''}`}>
                <CardTitle>Production Trends</CardTitle>
              </CardHeader>
              <CardContent className={`${isMobile ? 'px-2' : ''}`}>
                <div className={`${isMobile ? 'overflow-x-auto' : ''}`}>
                  <div className={`${isMobile ? 'min-w-[600px]' : ''}`}>
                    <ProductionChart 
                      data={productionStats.dailySummaries.map((summary: any) => ({
                        record_date: summary.date,
                        total_milk_volume: summary.volume,
                        average_fat_content: summary.fat,
                        average_protein_content: summary.protein,
                        animals_milked: summary.animalsMilked || 0
                      }))} 
                      isMobile={isMobile}
                      settings={productionSettings}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${isMobile ? 'mx-4 mb-20' : ''}`}>
              <CardHeader className={`${isMobile ? 'pb-2' : ''}`}>
                <CardTitle>Recent Records</CardTitle>
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

          <TabsContent value="distribution" className="space-y-6 mt-6">
            {/* Distribution content unchanged but needed for context... */}
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
                          <p className="text-xs text-muted-foreground">{stat.description}</p>
                        </CardContent>
                      </Card>
                     )
                  })}
                </div>
              )}
            </div>
             <Card className={`${isMobile ? 'mx-4' : ''}`}>
               {/* Distribution Chart Content */}
                <CardHeader>
                  <CardTitle>Distribution Trends</CardTitle>
                </CardHeader>
                <CardContent>
                   <DistributionChart data={distributionStats.dailySummaries} isMobile={isMobile} />
                </CardContent>
             </Card>
             <Card className={`${isMobile ? 'mx-4 mb-20' : ''}`}>
                <CardHeader>
                  <CardTitle>Recent Distributions</CardTitle>
                </CardHeader>
                <CardContent>
                   <DistributionRecordsList records={distributionRecords} canEdit={canAddRecords} isMobile={isMobile} />
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>

      {isMobile && (
        <MobileActionSheet
          isOpen={showActionSheet}
          onClose={() => setShowActionSheet(false)}
          title="Actions"
          items={getActionSheetItems()}
        />
      )}
      
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
