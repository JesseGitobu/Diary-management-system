'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { ReportGenerator } from '@/components/reports/ReportGenerator'
import { KPIDashboard } from '@/components/reports/KPIDashboard'
import { TrendAnalysis } from '@/components/reports/TrendAnalysis'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  DollarSign, 
  Milk, 
  Wheat,
  Calendar,
  Target,
  RefreshCw,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ReportsDashboardProps {
  farmId: string
  initialKPIs: any
  userRole: string
}

export function ReportsDashboard({ farmId, initialKPIs, userRole }: ReportsDashboardProps) {
  const [kpis, setKPIs] = useState(initialKPIs)
  const [loading, setLoading] = useState(false)
  const { isMobile, isTablet } = useDeviceInfo()
  
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
  
  // KPI data for the cards
  const kpiCards = [
    {
      title: "Milk Production",
      value: `${currentMonth?.production?.summary?.totalMilkVolume?.toFixed(0) || 0}L`,
      change: changes?.production || 0,
      icon: Milk,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Feed Costs",
      value: `$${currentMonth?.feed?.summary?.totalFeedCost?.toFixed(0) || 0}`,
      change: changes?.costs || 0,
      icon: Wheat,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      inverted: true, // Lower is better for costs
    },
    {
      title: "Profit Margin",
      value: `${currentMonth?.financial?.summary?.profitMargin?.toFixed(1) || 0}%`,
      change: changes?.profit || 0,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Cost per Liter",
      value: `$${currentMonth?.financial?.summary?.costPerLiter?.toFixed(3) || 0}`,
      change: 0, // No change data for this metric
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      subtitle: "Industry avg: $0.25-$0.35"
    }
  ]
  
  return (
    <div className="space-y-4 lg:space-y-8">
      {/* Mobile Header */}
      <div className={cn(
        "flex items-start justify-between",
        isMobile ? "flex-col space-y-4" : "flex-row"
      )}>
        <div className={cn(isMobile && "w-full")}>
          <h1 className={cn(
            "font-bold text-gray-900",
            isMobile ? "text-2xl" : "text-3xl"
          )}>
            Reports & Analytics
          </h1>
          <p className={cn(
            "text-gray-600 mt-1",
            isMobile ? "text-sm" : "text-base"
          )}>
            {isMobile ? "Farm performance insights" : "Comprehensive insights into your farm's performance"}
          </p>
        </div>
        
        {/* Mobile-friendly refresh button */}
        <Button 
          onClick={refreshKPIs} 
          disabled={loading}
          size={isMobile ? "sm" : "default"}
          className={cn(isMobile && "w-full")}
        >
          {loading ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <TrendingUp className="mr-2 h-4 w-4" />
          )}
          {loading ? 'Refreshing...' : (isMobile ? 'Refresh' : 'Refresh Data')}
        </Button>
      </div>
      
      {/* Horizontal Scrolling KPI Cards */}
      <div className="relative">
        <div className="flex overflow-x-auto pb-2 gap-4 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible">
          {kpiCards.map((kpi, index) => {
            const Icon = kpi.icon
            const isPositiveChange = kpi.inverted ? kpi.change <= 0 : kpi.change >= 0
            const changeColor = isPositiveChange ? 'text-green-600' : 'text-red-600'
            
            return (
              <Card 
                key={index} 
                className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  isMobile ? "min-w-[280px] flex-shrink-0" : "w-full"
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={cn(
                    "font-medium",
                    isMobile ? "text-sm" : "text-sm"
                  )}>
                    {kpi.title}
                  </CardTitle>
                  <div className={cn("rounded-full p-2", kpi.bgColor)}>
                    <Icon className={cn("h-4 w-4", kpi.color)} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "font-bold",
                    isMobile ? "text-xl" : "text-2xl"
                  )}>
                    {kpi.value}
                  </div>
                  {kpi.change !== 0 ? (
                    <p className={cn("text-xs mt-1", changeColor)}>
                      {kpi.change >= 0 ? '+' : ''}{kpi.change?.toFixed(1)}% from last month
                    </p>
                  ) : kpi.subtitle ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpi.subtitle}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      Current month
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        {/* Scroll indicator for mobile */}
        {isMobile && (
          <div className="flex justify-center mt-2">
            <div className="flex items-center text-xs text-gray-500">
              <span>Swipe for more</span>
              <ChevronRight className="h-3 w-3 ml-1" />
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile-optimized Tabs */}
      <Tabs defaultValue="overview" className="space-y-4 lg:space-y-6">
        <div className="relative">
          <TabsList className={cn(
            isMobile 
              ? "flex overflow-x-auto w-full h-auto p-1 bg-muted rounded-lg" 
              : "grid w-full grid-cols-4"
          )}>
            <TabsTrigger 
              value="overview"
              className={cn(
                isMobile 
                  ? "flex-shrink-0 px-4 py-2 text-sm whitespace-nowrap" 
                  : ""
              )}
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="trends"
              className={cn(
                isMobile 
                  ? "flex-shrink-0 px-4 py-2 text-sm whitespace-nowrap" 
                  : ""
              )}
            >
              Trends
            </TabsTrigger>
            <TabsTrigger 
              value="generate"
              className={cn(
                isMobile 
                  ? "flex-shrink-0 px-4 py-2 text-sm whitespace-nowrap" 
                  : ""
              )}
            >
              {isMobile ? "Reports" : "Generate Reports"}
            </TabsTrigger>
            <TabsTrigger 
              value="exports"
              className={cn(
                isMobile 
                  ? "flex-shrink-0 px-4 py-2 text-sm whitespace-nowrap" 
                  : ""
              )}
            >
              {isMobile ? "Export" : "Export Data"}
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview" className="space-y-4 lg:space-y-6">
          <KPIDashboard kpis={kpis} />
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4 lg:space-y-6">
          <TrendAnalysis farmId={farmId} />
        </TabsContent>
        
        <TabsContent value="generate" className="space-y-4 lg:space-y-6">
          <ReportGenerator farmId={farmId} />
        </TabsContent>
        
        <TabsContent value="exports" className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className={cn(isMobile ? "text-lg" : "text-xl")}>
                Export Data
              </CardTitle>
              <CardDescription className={cn(isMobile ? "text-sm" : "text-base")}>
                Download your farm data in various formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "gap-4",
                isMobile 
                  ? "flex flex-col space-y-3" 
                  : "grid grid-cols-1 md:grid-cols-3"
              )}>
                <Button 
                  variant="outline" 
                  className={cn(
                    "flex items-center justify-center transition-all duration-200 hover:shadow-md",
                    isMobile 
                      ? "h-14 w-full" 
                      : "h-20 flex-col"
                  )}
                >
                  <Download className={cn(
                    "text-blue-600",
                    isMobile ? "h-5 w-5 mr-3" : "h-6 w-6 mb-2"
                  )} />
                  <span className={cn(
                    "font-medium",
                    isMobile ? "text-sm" : "text-center"
                  )}>
                    {isMobile ? "Production Data" : "Export Production Data"}
                  </span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className={cn(
                    "flex items-center justify-center transition-all duration-200 hover:shadow-md",
                    isMobile 
                      ? "h-14 w-full" 
                      : "h-20 flex-col"
                  )}
                >
                  <Download className={cn(
                    "text-orange-600",
                    isMobile ? "h-5 w-5 mr-3" : "h-6 w-6 mb-2"
                  )} />
                  <span className={cn(
                    "font-medium",
                    isMobile ? "text-sm" : "text-center"
                  )}>
                    {isMobile ? "Feed Data" : "Export Feed Data"}
                  </span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className={cn(
                    "flex items-center justify-center transition-all duration-200 hover:shadow-md",
                    isMobile 
                      ? "h-14 w-full" 
                      : "h-20 flex-col"
                  )}
                >
                  <Download className={cn(
                    "text-green-600",
                    isMobile ? "h-5 w-5 mr-3" : "h-6 w-6 mb-2"
                  )} />
                  <span className={cn(
                    "font-medium",
                    isMobile ? "text-sm" : "text-center"
                  )}>
                    {isMobile ? "Financial Report" : "Export Financial Report"}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}