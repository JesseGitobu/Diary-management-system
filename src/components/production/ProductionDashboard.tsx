'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProductionChart } from '@/components/production/ProductionChart'
import { ProductionRecordsList } from '@/components/production/ProductionRecordsList'
import { ProductionEntryForm } from '@/components/production/ProductionEntryForm'
import { Modal } from '@/components/ui/Modal'
import { 
  Plus, 
  TrendingUp, 
  Droplets, 
  BarChart3, 
  Calendar,
  Target
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
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [recentRecords, setRecentRecords] = useState(initialRecords)
  
  const canAddRecords = ['farm_owner', 'farm_manager', 'worker'].includes(userRole)
  
  const handleRecordAdded = () => {
    setShowEntryModal(false)
    // Refresh the page to get updated data
    window.location.reload()
  }
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Milk Production</h1>
          <p className="text-gray-600 mt-2">
            Track and analyze milk production across your herd
          </p>
        </div>
        {canAddRecords && (
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
        )}
      </div>
      
      {/* Stats Cards */}
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
      
      {/* Production Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Production Trends</CardTitle>
          <CardDescription>
            Daily milk production over the last {productionStats.periodDays} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductionChart data={productionStats.dailySummaries} />
        </CardContent>
      </Card>
      
      {/* Recent Records */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Production Records</CardTitle>
          <CardDescription>
            Latest milk production entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductionRecordsList 
            records={recentRecords} 
            canEdit={canAddRecords}
          />
        </CardContent>
      </Card>
      
      {/* Production Entry Modal */}
      {showEntryModal && (
        <Modal 
          isOpen={showEntryModal} 
          onClose={() => setShowEntryModal(false)}
          className="max-w-4xl"
        >
          <div className="p-6">
            <ProductionEntryForm
              farmId={farmId}
              animals={animals}
              onSuccess={handleRecordAdded}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}