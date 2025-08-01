// Mobile-Optimized ProductionDashboard.tsx
'use client'

import { useState } from 'react'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProductionChart } from '@/components/production/ProductionChart'
import { ProductionRecordsList } from '@/components/production/ProductionRecordsList'
import { ProductionEntryForm } from '@/components/production/ProductionEntryForm'
import { Modal } from '@/components/ui/Modal'

// Mobile-specific components
import { MobileStatsScroller } from '@/components/mobile/MobileStatsScroller'
import { MobileActionSheet } from '@/components/mobile/MobileActionSheet'

import { 
  Plus, 
  TrendingUp, 
  Droplets, 
  BarChart3, 
  Calendar,
  Target,
  MoreHorizontal,
  Upload,
  Download,
  FileText
} from 'lucide-react'
import Link from 'next/link'

interface ProductionDashboardProps {
  farmId: string
  productionStats: any
  recentRecords: any[]
  animals: any[]
  userRole: string
}

export function ProductionDashboard({
  farmId,
  productionStats,
  recentRecords: initialRecords,
  animals,
  userRole
}: ProductionDashboardProps) {
  // Get device info for responsive behavior
  const { isMobile, isTablet,  } = useDeviceInfo()

  const [showEntryModal, setShowEntryModal] = useState(false)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [recentRecords, setRecentRecords] = useState(initialRecords)
  
  const canAddRecords = ['farm_owner', 'farm_manager', 'worker'].includes(userRole)
  
  const handleRecordAdded = () => {
    setShowEntryModal(false)
    // Refresh the page to get updated data
    window.location.reload()
  }

  // Mobile-optimized stats configuration
  const statsConfig = [
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
      value: `${productionStats.totalVolume.toFixed(1)}L`,
      icon: Droplets,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      description: `${productionStats.avgDailyVolume.toFixed(1)}L daily avg`
    },
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

  // Mobile action sheet configuration
  const actionSheetItems = canAddRecords ? [
    {
      id: 'record-production',
      label: 'Record Production',
      icon: Plus,
      color: 'text-blue-600',
      onClick: () => setShowEntryModal(true)
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
      onClick: () => {
        // Add export functionality
        console.log('Export production data')
      }
    },
    {
      id: 'view-reports',
      label: 'View Reports',
      icon: FileText,
      color: 'text-indigo-600',
      onClick: () => window.location.href = '/dashboard/production/reports'
    }
  ] : []
  
  return (
    <div className="space-y-6 pb-safe">
      {/* Mobile-Optimized Header */}
      <div className={`${isMobile ? 'px-4' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 flex items-center space-x-2`}>
              <Droplets className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-cyan-600`} />
              <span>{isMobile ? 'Production' : 'Milk Production'}</span>
            </h1>
            {!isMobile && (
              <p className="text-gray-600 mt-2">
                Track and analyze milk production across your herd
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
              // Desktop: Multiple action buttons
              canAddRecords && (
                <div className="flex space-x-3">
                  <Button onClick={() => setShowEntryModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Record Production
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/production/bulk">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Bulk Entry
                    </Link>
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile-Optimized Stats */}
      <div className={`${isMobile ? 'px-4' : ''}`}>
        {isMobile ? (
          <MobileStatsScroller stats={statsConfig} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{productionStats.totalRecords}</div>
                <p className="text-xs text-muted-foreground">
                  Last {productionStats.periodDays} days
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                <Droplets className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{productionStats.totalVolume.toFixed(1)}L</div>
                <p className="text-xs text-muted-foreground">
                  {productionStats.avgDailyVolume.toFixed(1)}L daily average
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Fat Content</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{productionStats.avgFatContent.toFixed(2)}%</div>
                <p className="text-xs text-muted-foreground">
                  Quality indicator
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Protein</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{productionStats.avgProteinContent.toFixed(2)}%</div>
                <p className="text-xs text-muted-foreground">
                  Nutritional value
                </p>
              </CardContent>
            </Card>
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
                data={productionStats.dailySummaries} 
                isMobile={isMobile}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Records */}
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
                onClick={() => setShowEntryModal(true)}
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
            records={recentRecords} 
            canEdit={canAddRecords}
            isMobile={isMobile}
          />
        </CardContent>
      </Card>

      {/* Mobile Action Sheet */}
      {isMobile && (
        <MobileActionSheet
          isOpen={showActionSheet}
          onClose={() => setShowActionSheet(false)}
          title="Production Actions"
          items={actionSheetItems}
        />
      )}
      
      {/* Production Entry Modal */}
      {showEntryModal && (
        <Modal 
          isOpen={showEntryModal} 
          onClose={() => setShowEntryModal(false)}
          className={`${isMobile ? 'max-w-full mx-4 my-4 h-[90vh] overflow-y-auto' : 'max-w-4xl'}`}
        >
          <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <ProductionEntryForm
              farmId={farmId}
              animals={animals}
              onSuccess={handleRecordAdded}
              isMobile={isMobile}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}