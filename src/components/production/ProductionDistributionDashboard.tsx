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
import { ProductionStatsCards } from '@/components/production/ProductionStatsCards'

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
  
  // State for viewing/editing production records
  const [selectedProductionRecord, setSelectedProductionRecord] = useState<any>(null)
  const [showProductionDetailModal, setShowProductionDetailModal] = useState(false)
  const [showProductionEditModal, setShowProductionEditModal] = useState(false)

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
  
  const handleProductionRecordAdded = () => {
    setShowProductionEntryModal(false)
    window.location.reload()
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
        color: 'bg-blue-500',
        bgColor: 'bg-blue-100',
        description: `Last ${productionStats.periodDays} days`
      },
      {
        title: 'Total Volume',
        value: `${productionStats.totalVolume.toFixed(1)}${productionSettings?.productionUnit === 'kg' ? 'kg' : 'L'}`,
        icon: Droplets,
        color: 'bg-cyan-500',
        bgColor: 'bg-cyan-100',
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
          color: 'bg-orange-500',
          bgColor: 'bg-orange-100',
          description: 'Quality indicator'
        },
        {
          title: 'Avg Protein',
          value: `${productionStats.avgProteinContent.toFixed(2)}%`,
          icon: TrendingUp,
          color: 'bg-green-500',
          bgColor: 'bg-green-100',
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
          color: 'bg-purple-500',
          bgColor: 'bg-purple-100',
          description: 'Recorded in last session'
        },
        {
          title: 'Avg Yield',
          value: `${avgYieldPerAnimal.toFixed(1)} ${productionSettings?.productionUnit === 'kg' ? 'kg' : 'L'}`,
          icon: BarChart3,
          color: 'bg-emerald-500',
          bgColor: 'bg-emerald-100',
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
                avgDailyVolume={productionStats.avgDailyVolume}
                totalRecords={productionStats.totalRecords}
                isQualityTracked={isQualityTracked}
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
                  <p className="text-lg text-gray-900 capitalize">{selectedProductionRecord.milking_session}</p>
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
      {showProductionEditModal && selectedProductionRecord && (
        <Modal 
          isOpen={showProductionEditModal} 
          onClose={() => {
            setShowProductionEditModal(false)
            setSelectedProductionRecord(null)
          }}
          className={`${isMobile ? 'max-w-full mx-4 my-4 h-[90vh] overflow-y-auto' : 'max-w-4xl'}`}
        >
          <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <ProductionEntryForm
              farmId={farmId}
              animals={animals}
              initialData={selectedProductionRecord}
              onSuccess={handleProductionRecordEdited}
              isMobile={isMobile}
              settings={productionSettings}
            />
          </div>
        </Modal>
      )}    </div>
  )
}