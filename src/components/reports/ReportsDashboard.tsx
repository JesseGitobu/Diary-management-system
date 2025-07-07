'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { ReportGenerator } from '@/components/reports/ReportGenerator'
import { KPIDashboard } from '@/components/reports/KPIDashboard'
import { TrendAnalysis } from '@/components/reports/TrendAnalysis'
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  DollarSign, 
  Milk, 
  Wheat,
  Calendar,
  Target
} from 'lucide-react'

interface ReportsDashboardProps {
  farmId: string
  initialKPIs: any
  userRole: string
}

export function ReportsDashboard({ farmId, initialKPIs, userRole }: ReportsDashboardProps) {
  const [kpis, setKPIs] = useState(initialKPIs)
  const [loading, setLoading] = useState(false)
  
  const refreshKPIs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/reports/kpis')
      const result = await response.json()
      
      if (result.success) {
        setKPIs(result.data)
      }
    } catch (error) {
      console.error('Error refreshing KPIs:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const currentMonth = kpis?.currentMonth
  const changes = kpis?.changes
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive insights into your farm's performance
          </p>
        </div>
        <Button onClick={refreshKPIs} disabled={loading}>
          <TrendingUp className="mr-2 h-4 w-4" />
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>
      
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Milk Production</CardTitle>
            <Milk className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonth?.production?.summary?.totalMilkVolume?.toFixed(0) || 0}L
            </div>
            <p className={`text-xs ${changes?.production >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {changes?.production >= 0 ? '+' : ''}{changes?.production?.toFixed(1) || 0}% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feed Costs</CardTitle>
            <Wheat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${currentMonth?.feed?.summary?.totalFeedCost?.toFixed(0) || 0}
            </div>
            <p className={`text-xs ${changes?.costs <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {changes?.costs >= 0 ? '+' : ''}{changes?.costs?.toFixed(1) || 0}% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonth?.financial?.summary?.profitMargin?.toFixed(1) || 0}%
            </div>
            <p className={`text-xs ${changes?.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {changes?.profit >= 0 ? '+' : ''}{changes?.profit?.toFixed(1) || 0}% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per Liter</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${currentMonth?.financial?.summary?.costPerLiter?.toFixed(3) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Industry avg: $0.25-$0.35
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="exports">Export Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <KPIDashboard kpis={kpis} />
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-6">
          <TrendAnalysis farmId={farmId} />
        </TabsContent>
        
        <TabsContent value="generate" className="space-y-6">
          <ReportGenerator farmId={farmId} />
        </TabsContent>
        
        <TabsContent value="exports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>
                Download your farm data in various formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20 flex flex-col">
                  <Download className="h-6 w-6 mb-2" />
                  <span>Export Production Data</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Download className="h-6 w-6 mb-2" />
                  <span>Export Feed Data</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Download className="h-6 w-6 mb-2" />
                  <span>Export Financial Report</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}