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
import { RecordProductionModal } from '@/components/production/RecordProductionModal'
import { ProductionSessionBanner } from '@/components/production/ProductionSessionBanner' // Import the new banner
import { ProductionStatsCards } from '@/components/production/ProductionStatsCards'
import { MilkingGroupsManager } from '@/components/production/MilkingGroupsManager'

// Distribution components
import { DistributionChart } from '@/components/distribution/DistributionChart'
import { DistributionRecordsList } from '@/components/distribution/DistributionRecordsList'
import { DistributionEntryForm } from '@/components/distribution/DistributionEntryForm'
import { ChannelManager } from '@/components/distribution/ChannelManager'
import { DistributionStatsCards } from '@/components/distribution/DistributionStatsCards'

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
  Activity,
  CheckCircle2
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

  // Helper function to calculate stats (moved before state initialization)
  const calculateProductionStats = (records: any[]) => {
    const today = new Date().toISOString().split('T')[0]
    const todayRecords = records.filter(r => r.record_date === today)
    
    // 1. RECORDS METRICS (Today only)
    const totalRecords = todayRecords.length
    const recordsPerSession: Record<string, number> = {}
    productionSettings?.milkingSessions?.forEach(session => {
      const sessionKey = session.name.toLowerCase().replace(/\s+/g, '')
      recordsPerSession[sessionKey] = todayRecords.filter(r => r.milking_session_id === sessionKey).length
    })
    const avgRecordsPerSession = productionSettings?.milkingSessions?.length 
      ? Math.round(totalRecords / productionSettings.milkingSessions.length)
      : 0

    // 2. YIELD METRICS (Today only)
    const totalVolume = todayRecords.reduce((sum, r) => sum + (r.milk_volume || 0), 0)
    const avgVolumePerAnimal = todayRecords.length > 0 
      ? totalVolume / new Set(todayRecords.map(r => r.animal_id)).size
      : 0
    
    // Get groups info (if available in records)
    const uniqueGroups = new Set(todayRecords.filter(r => r.milking_group_id).map(r => r.milking_group_id))
    const avgVolumePerGroup = uniqueGroups.size > 0 
      ? totalVolume / uniqueGroups.size
      : 0

    // 3. ANIMALS MILKED (Today only)
    const uniqueAnimalsMilked = new Set(todayRecords.map(r => r.animal_id)).size
    const uniqueGroupsMilked = new Set(todayRecords.filter(r => r.milking_group_id).map(r => r.milking_group_id)).size

    // 4. MILK SAFETY RATE (Today only)
    const safeRecords = todayRecords.filter(r => r.milk_safety_status === 'safe').length
    const milkSafetyRate = todayRecords.length > 0 ? Math.round((safeRecords / todayRecords.length) * 100) : 0

    // 5. QUALITY METRICS (Today only)
    const avgFatContent = todayRecords.length > 0
      ? todayRecords.reduce((sum, r) => sum + (r.fat_content || 0), 0) / todayRecords.length
      : 0
    const avgProteinContent = todayRecords.length > 0
      ? todayRecords.reduce((sum, r) => sum + (r.protein_content || 0), 0) / todayRecords.length
      : 0

    // 6. DAILY SUMMARIES for charts (Keep last 30 days for comparison)
    const dailySummaries = createDailySummaries(records)

    return {
      totalRecords,
      recordsPerSession,
      avgRecordsPerSession,
      totalVolume,
      avgVolumePerAnimal,
      avgVolumePerGroup,
      uniqueAnimalsMilked,
      uniqueGroupsMilked,
      milkSafetyRate,
      avgFatContent,
      avgProteinContent,
      avgDailyVolume: todayRecords.length > 0 ? totalVolume : 0,
      dailySummaries,
      periodDays: 1,
      safeRecords
    }
  }

  // Create daily summaries from records
  const createDailySummaries = (records: any[]) => {
    const byDate: Record<string, any[]> = {}
    records.forEach(r => {
      if (!byDate[r.record_date]) byDate[r.record_date] = []
      byDate[r.record_date].push(r)
    })

    return Object.entries(byDate)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .slice(0, 30)
      .map(([date, dayRecords]) => ({
        date,
        volume: dayRecords.reduce((sum, r) => sum + (r.milk_volume || 0), 0),
        animalsMilked: new Set(dayRecords.map(r => r.animal_id)).size,
        fat: dayRecords.length > 0 
          ? dayRecords.reduce((sum, r) => sum + (r.fat_content || 0), 0) / dayRecords.length 
          : 0,
        protein: dayRecords.length > 0 
          ? dayRecords.reduce((sum, r) => sum + (r.protein_content || 0), 0) / dayRecords.length 
          : 0
      }))
  }

  const [activeTab, setActiveTab] = useState('production')
  const [showProductionEntryModal, setShowProductionEntryModal] = useState(false)
  const [showDistributionEntryModal, setShowDistributionEntryModal] = useState(false)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [productionRecords, setProductionRecords] = useState(initialProductionRecords)
  const [distributionRecords, setDistributionRecords] = useState(initialDistributionRecords)
  
  // Lift production stats to component state for real-time updates
  // Initialize with calculated stats from initial records
  const [stats, setStats] = useState(() => calculateProductionStats(initialProductionRecords))
  
  // State for viewing/editing production records
  const [selectedProductionRecord, setSelectedProductionRecord] = useState<any>(null)
  const [showProductionDetailModal, setShowProductionDetailModal] = useState(false)
  const [showProductionEditModal, setShowProductionEditModal] = useState(false)
  const [showMilkingGroupsModal, setShowMilkingGroupsModal] = useState(false)

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
  
  // Helper function to get session name from ID
  const getSessionName = (sessionId?: string) => {
    if (!sessionId || !productionSettings?.milkingSessions) {
      return 'Unknown Session'
    }
    const session = productionSettings.milkingSessions.find(s => s.id === sessionId)
    return session?.name || sessionId
  }
  
  // Production Record Handlers
  const handleViewProductionRecord = (record: any) => {
    setSelectedProductionRecord(record)
    setShowProductionDetailModal(true)
  }

  const handleEditProductionRecord = (record: any) => {
    setSelectedProductionRecord(record)
    setShowProductionEditModal(true)
  }

  const handleDeleteProductionRecord = (recordId: string) => {
    // Remove the record from the list
    setProductionRecords(prev => prev.filter(r => r.id !== recordId))
  }
  
  const handleProductionRecordAdded = async () => {
    // Fetch fresh production records and recalculate stats without reloading the page
    try {
      const response = await fetch('/api/production')
      if (response.ok) {
        const result = await response.json()
        const records = result.data || []
        setProductionRecords(records)
        
        // Recalculate comprehensive stats from records
        const updatedStats = calculateProductionStats(records)
        setStats(updatedStats)
      }
    } catch (error) {
      console.error('Failed to refresh production data:', error)
    }
  }

  const handleProductionModalClosed = () => {
    // Modal will trigger onSuccess which handles the refresh
    setShowProductionEntryModal(false)
  }

  const handleProductionRecordEdited = () => {
    setShowProductionEditModal(false)
    setSelectedProductionRecord(null)
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

    let activeSession: { name: string; displayName: string; timeStr: string; minutes: number } | null = null;
    
    const milkingSessions = productionSettings.milkingSessions || [];

    // Map sessions from milkingSessions array and sort by time
    const sortedSessions = milkingSessions.map((session: any) => ({
      name: session.name.toLowerCase().replace(/\s+/g, ''),
      displayName: session.name,
      timeStr: session.time || "06:00",
      minutes: parseTime(session.time || "06:00")
    })).sort((a: any, b: any) => a.minutes - b.minutes);

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
        .filter(r => r.record_date === todayStr && r.milking_session_id === activeSession!.name)
        .map(r => r.animal_id)
    ).size;

    const remaining = Math.max(0, totalEligible - uniqueMilkedAnimals);

    // Auto-hide if all work is done
    if (remaining === 0) return null;

    return {
      name: activeSession.displayName,
      timeStr: activeSession.timeStr,
      isLate,
      remaining,
      total: totalEligible
    };
  }, [productionSettings, animals, productionRecords]);

  // Basic stats calculations...
  // Stats calculations are now done in calculateProductionStats()

  // Determine if quality tracking is enabled
  const isQualityTracked = useMemo(() => {
    if (!productionSettings) return true 
    return productionSettings.productionTrackingMode !== 'basic' && productionSettings.enableQualityTracking !== false
  }, [productionSettings])

  // Define stats config for new 4-card layout
  const productionStatsConfig = useMemo(() => {
    // Ensure stats has all required properties with fallbacks
    const safeStats = {
      totalRecords: stats?.totalRecords || 0,
      avgRecordsPerSession: stats?.avgRecordsPerSession || 0,
      totalVolume: stats?.totalVolume || 0,
      avgVolumePerAnimal: stats?.avgVolumePerAnimal || 0,
      avgVolumePerGroup: stats?.avgVolumePerGroup || 0,
      uniqueAnimalsMilked: stats?.uniqueAnimalsMilked || 0,
      uniqueGroupsMilked: stats?.uniqueGroupsMilked || 0,
      milkSafetyRate: stats?.milkSafetyRate || 0,
      safeRecords: stats?.safeRecords || 0
    }

    return [
      {
        title: 'Records',
        icon: Calendar,
        color: 'bg-blue-500',
        bgColor: 'bg-blue-100',
        items: [
          {
            label: 'Total Records',
            value: safeStats.totalRecords,
            description: 'Today'
          },
          {
            label: 'Per Session',
            value: safeStats.avgRecordsPerSession,
            description: 'Average'
          }
        ]
      },
      {
        title: 'Yield',
        icon: Droplets,
        color: 'bg-cyan-500',
        bgColor: 'bg-cyan-100',
        items: [
          {
            label: 'Total Yield',
            value: `${safeStats.totalVolume.toFixed(1)}${productionSettings?.productionUnit === 'kg' ? 'kg' : 'L'}`,
            description: 'Today'
          },
          {
            label: 'Per Animal',
            value: `${safeStats.avgVolumePerAnimal.toFixed(1)}${productionSettings?.productionUnit === 'kg' ? 'kg' : 'L'}`,
            description: 'Average'
          },
          {
            label: 'Per Group',
            value: `${safeStats.avgVolumePerGroup.toFixed(1)}${productionSettings?.productionUnit === 'kg' ? 'kg' : 'L'}`,
            description: 'Average'
          }
        ]
      },
      {
        title: 'Animals & Groups',
        icon: Activity,
        color: 'bg-purple-500',
        bgColor: 'bg-purple-100',
        items: [
          {
            label: 'Milked Today',
            value: safeStats.uniqueAnimalsMilked,
            description: 'Animals'
          },
          {
            label: 'Groups Milked',
            value: safeStats.uniqueGroupsMilked,
            description: 'Today'
          }
        ]
      },
      {
        title: 'Safety',
        icon: CheckCircle2,
        color: 'bg-green-500',
        bgColor: 'bg-green-100',
        items: [
          {
            label: 'Safe Rate',
            value: `${safeStats.milkSafetyRate}%`,
            description: 'Of Today\'s Records'
          },
          {
            label: 'Safe Records',
            value: `${safeStats.safeRecords}/${safeStats.totalRecords}`,
            description: 'Count'
          }
        ]
      }
    ]
  }, [stats, productionSettings])

  const distributionStatsConfig = [
    {
      title: 'Distributed',
      value: `${distributionStats.totalDistributed.toFixed(1)}L`,
      icon: Truck,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-100',
      description: `Last ${distributionStats.periodDays} days`
    },
    {
      title: 'Revenue',
      value: `KSh ${distributionStats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-green-500',
      bgColor: 'bg-green-100',
      description: `KSh ${distributionStats.avgPricePerLiter.toFixed(2)}/L avg`
    },
    {
      title: 'Channels',
      value: distributionStats.totalChannels,
      icon: Users,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-100',
      description: 'Active buyers'
    },
    {
      title: 'Available',
      value: `${availableVolume.toFixed(1)}L`,
      icon: Clock,
      color: availableVolume > 0 ? 'bg-orange-500' : 'bg-gray-500',
      bgColor: availableVolume > 0 ? 'bg-orange-100' : 'bg-gray-100',
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
        }
      ] : []
    } else {
      return canAddRecords ? [
        {
          id: 'record-distribution',
          label: 'Record Distribution',
          icon: Plus,
          color: 'text-blue-600',
          onClick: () => setShowDistributionEntryModal(true)
        },
        {
          id: 'manage-channels',
          label: 'Manage Channels',
          icon: Settings,
          color: 'text-purple-600',
          onClick: () => setShowChannelModal(true)
        }
      ] : []
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
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
            {!isMobile && activeTab === 'production' && (
               <Button onClick={() => setShowMilkingGroupsModal(true)} variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Milking Groups
               </Button>
            )}
             {!isMobile && activeTab === 'distribution' && canAddRecords && (
               <>
                  <Button onClick={() => setShowDistributionEntryModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Record Distribution
                  </Button>
                  <Button onClick={() => setShowChannelModal(true)} variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Channels
                  </Button>
               </>
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

            {/* Production Stats Cards */}
            <div className={`${isMobile ? 'px-0' : ''}`}>
              <ProductionStatsCards 
                stats={productionStatsConfig}
              />
            </div>

            <Card className={`${isMobile ? 'mx-4' : ''}`}>
              <CardHeader className={`${isMobile ? 'pb-2' : ''}`}>
                <CardTitle>Production Trends</CardTitle>
              </CardHeader>
              <CardContent className={`${isMobile ? 'px-2' : ''}`}>
                <div className={`${isMobile ? 'overflow-x-auto' : ''}`}>
                  <div className={`${isMobile ? 'min-w-[600px]' : ''}`}>
                    <ProductionChart 
                      data={stats.dailySummaries.map((summary: any) => ({
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
                  farmId={farmId}
                  canEdit={canAddRecords}
                  isMobile={isMobile}
                  onView={handleViewProductionRecord}
                  onEdit={handleEditProductionRecord}
                  onDelete={handleDeleteProductionRecord}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-6 mt-6">
            {/* Distribution Stats Cards */}
            <div className={`${isMobile ? 'px-0' : ''}`}>
              <DistributionStatsCards 
                stats={distributionStatsConfig} 
                availableVolume={availableVolume}
                totalChannels={distributionStats.totalChannels}
              />
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
        <RecordProductionModal
          isOpen={showProductionEntryModal}
          onClose={() => {
            handleProductionModalClosed()
          }}
          farmId={farmId}
          animals={animals}
          settings={productionSettings}
          onSuccess={handleProductionRecordAdded}
        />
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

      {/* Production Record Detail View Modal */}
      {showProductionDetailModal && selectedProductionRecord && (
        <Modal 
          isOpen={showProductionDetailModal} 
          onClose={() => {
            setShowProductionDetailModal(false)
            setSelectedProductionRecord(null)
          }}
          className={`${isMobile ? 'max-w-full mx-4 my-4 h-[90vh] overflow-y-auto' : 'max-w-2xl'}`}
        >
          <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedProductionRecord.animals?.name || `Animal ${selectedProductionRecord.animals?.tag_number}`}
                </h2>
                <p className="text-gray-600">Tag: {selectedProductionRecord.animals?.tag_number}</p>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-gray-200">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Date</label>
                  <p className="text-lg text-gray-900">{new Date(selectedProductionRecord.record_date).toLocaleDateString('en-GB')}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Milking Session</label>
                  <p className="text-lg text-gray-900">{getSessionName(selectedProductionRecord.milking_session_id)}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Milk Volume</label>
                  <p className="text-lg text-gray-900">{selectedProductionRecord.milk_volume} Liters</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Safety Status</label>
                  <Badge className={
                    selectedProductionRecord.milk_safety_status === 'safe' 
                      ? 'bg-green-100 text-green-800 mt-1' 
                      : selectedProductionRecord.milk_safety_status === 'unsafe_health'
                      ? 'bg-red-100 text-red-800 mt-1'
                      : 'bg-yellow-100 text-yellow-800 mt-1'
                  }>
                    {selectedProductionRecord.milk_safety_status === 'safe' && 'Safe'}
                    {selectedProductionRecord.milk_safety_status === 'unsafe_health' && 'Unsafe - Health'}
                    {selectedProductionRecord.milk_safety_status === 'unsafe_colostrum' && 'Colostrum'}
                  </Badge>
                </div>
              </div>

              {/* Quality Metrics */}
              {(selectedProductionRecord.fat_content || selectedProductionRecord.protein_content || 
                selectedProductionRecord.somatic_cell_count || selectedProductionRecord.temperature || 
                selectedProductionRecord.ph_level || selectedProductionRecord.lactose_content) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Parameters</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedProductionRecord.fat_content && (
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <p className="text-sm text-orange-600 font-medium">Fat Content</p>
                        <p className="text-2xl font-bold text-orange-600">{selectedProductionRecord.fat_content}%</p>
                      </div>
                    )}
                    {selectedProductionRecord.protein_content && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Protein Content</p>
                        <p className="text-2xl font-bold text-green-600">{selectedProductionRecord.protein_content}%</p>
                      </div>
                    )}
                    {selectedProductionRecord.somatic_cell_count && (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">SCC</p>
                        <p className="text-2xl font-bold text-purple-600">{(selectedProductionRecord.somatic_cell_count / 1000).toFixed(0)}k</p>
                      </div>
                    )}
                    {selectedProductionRecord.temperature && (
                      <div className="bg-red-50 p-4 rounded-lg">
                        <p className="text-sm text-red-600 font-medium">Temperature</p>
                        <p className="text-2xl font-bold text-red-600">{selectedProductionRecord.temperature}°C</p>
                      </div>
                    )}
                    {selectedProductionRecord.ph_level && (
                      <div className="bg-indigo-50 p-4 rounded-lg">
                        <p className="text-sm text-indigo-600 font-medium">pH Level</p>
                        <p className="text-2xl font-bold text-indigo-600">{selectedProductionRecord.ph_level}</p>
                      </div>
                    )}
                    {selectedProductionRecord.lactose_content && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Lactose</p>
                        <p className="text-2xl font-bold text-blue-600">{selectedProductionRecord.lactose_content}%</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedProductionRecord.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-700">{selectedProductionRecord.notes}</p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Recorded on {new Date(selectedProductionRecord.created_at).toLocaleString('en-GB')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => handleEditProductionRecord(selectedProductionRecord)}
                  className="flex-1"
                >
                  Edit Record
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowProductionDetailModal(false)
                    setSelectedProductionRecord(null)
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Production Record Edit Modal */}
      {/* Edit functionality will be added through a dedicated edit component */}

      {/* Milking Groups Manager Modal */}
      {showMilkingGroupsModal && (
        <Modal 
          isOpen={showMilkingGroupsModal} 
          onClose={() => setShowMilkingGroupsModal(false)}
          className={`${isMobile ? 'max-w-full mx-4 my-4 h-[90vh] overflow-y-auto' : 'max-w-4xl'}`}
        >
          <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <MilkingGroupsManager
              farmId={farmId}
              animals={animals}
              onClose={() => setShowMilkingGroupsModal(false)}
              isMobile={isMobile}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}