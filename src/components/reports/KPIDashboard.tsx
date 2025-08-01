'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { TrendingUp, TrendingDown, Minus, Target, Award, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils/cn'

interface KPIDashboardProps {
  kpis: any
}

export function KPIDashboard({ kpis }: KPIDashboardProps) {
  const { isMobile, isTablet } = useDeviceInfo()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  
  const currentMonth = kpis?.currentMonth
  const previousMonth = kpis?.previousMonth
  const changes = kpis?.changes
  
  // Check scroll position
  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }
  
  useEffect(() => {
    checkScrollPosition()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScrollPosition)
      return () => container.removeEventListener('scroll', checkScrollPosition)
    }
  }, [])
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = isMobile ? 280 : 320 // Width of one card plus gap
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }
  
  const getTrendIcon = (change: number) => {
    if (change > 5) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < -5) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }
  
  const getTrendColor = (change: number, inverse: boolean = false) => {
    if (inverse) {
      if (change > 5) return 'text-red-600'
      if (change < -5) return 'text-green-600'
    } else {
      if (change > 5) return 'text-green-600'
      if (change < -5) return 'text-red-600'
    }
    return 'text-gray-500'
  }
  
  // Production efficiency metrics
  const productionEfficiency = currentMonth?.production?.summary?.totalMilkVolume / 
    (currentMonth?.feed?.summary?.totalFeedQuantity || 1)
  
  const qualityScore = (
    (currentMonth?.production?.summary?.averageFatContent || 0) * 0.4 +
    (currentMonth?.production?.summary?.averageProteinContent || 0) * 0.6
  ) * 10 // Simplified quality score
  
  // Industry benchmarks
  const benchmarks = {
    milkPerCow: 25, // liters per day
    feedEfficiency: 1.5, // milk to feed ratio
    profitMargin: 15, // percentage
    qualityScore: 35 // points
  }
  
  // KPI Cards data for easier management
  const kpiCards = [
    {
      title: "Production Trend",
      icon: getTrendIcon(changes?.production || 0),
      value: `${currentMonth?.production?.summary?.averageDailyProduction?.toFixed(1) || 0}L`,
      subtitle: "Daily average",
      progress: Math.min((currentMonth?.production?.summary?.averageDailyProduction || 0) / benchmarks.milkPerCow * 100, 100),
      change: changes?.production || 0,
      changeText: `${changes?.production >= 0 ? '+' : ''}${changes?.production?.toFixed(1) || 0}% vs last month`
    },
    {
      title: "Feed Efficiency",
      icon: <Target className="h-4 w-4 text-blue-600" />,
      value: `${productionEfficiency?.toFixed(2) || 0}`,
      subtitle: "Milk/Feed ratio",
      progress: Math.min((productionEfficiency || 0) / benchmarks.feedEfficiency * 100, 100),
      change: 0,
      changeText: `Target: ${benchmarks.feedEfficiency}+`
    },
    {
      title: "Profitability",
      icon: getTrendIcon(changes?.profit || 0),
      value: `${currentMonth?.financial?.summary?.profitMargin?.toFixed(1) || 0}%`,
      subtitle: "Profit margin",
      progress: Math.min((currentMonth?.financial?.summary?.profitMargin || 0) / benchmarks.profitMargin * 100, 100),
      change: changes?.profit || 0,
      changeText: `${changes?.profit >= 0 ? '+' : ''}${changes?.profit?.toFixed(1) || 0}% vs last month`
    },
    {
      title: "Quality Score",
      icon: <Award className="h-4 w-4 text-yellow-600" />,
      value: `${qualityScore?.toFixed(0) || 0}`,
      subtitle: "Fat + Protein index",
      progress: Math.min((qualityScore || 0) / benchmarks.qualityScore * 100, 100),
      change: 0,
      changeText: `Industry avg: ${benchmarks.qualityScore}`
    }
  ]
  
  // Mobile KPI Card Component
  const MobileKPICard = ({ card, index }: { card: any, index: number }) => (
    <Card className={cn(
      "flex-shrink-0",
      isMobile ? "w-64" : "w-72", // Consistent width for horizontal scroll
      "snap-start" // Snap scrolling for better UX
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="truncate">{card.title}</span>
          {card.icon}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-bold">{card.value}</div>
        <p className="text-xs text-muted-foreground">{card.subtitle}</p>
        
        <div className="space-y-1">
          <Progress value={card.progress} className="h-2" />
          <p className={cn(
            "text-xs",
            card.change !== 0 ? getTrendColor(card.change) : "text-muted-foreground"
          )}>
            {card.changeText}
          </p>
        </div>
      </CardContent>
    </Card>
  )
  
  // Performance alerts with better mobile layout
  const getPerformanceAlerts = () => {
    const alerts = []
    
    if (productionEfficiency < benchmarks.feedEfficiency) {
      alerts.push({
        type: 'warning',
        title: 'Feed Efficiency Below Target',
        description: `Current: ${productionEfficiency?.toFixed(2)} | Target: ${benchmarks.feedEfficiency}+`,
        severity: 'Action Needed',
        color: 'yellow'
      })
    }
    
    if ((currentMonth?.financial?.summary?.profitMargin || 0) < benchmarks.profitMargin) {
      alerts.push({
        type: 'critical',
        title: 'Low Profit Margin',
        description: `Current: ${currentMonth?.financial?.summary?.profitMargin?.toFixed(1)}% | Target: ${benchmarks.profitMargin}%+`,
        severity: 'Critical',
        color: 'red'
      })
    }
    
    if (qualityScore < benchmarks.qualityScore) {
      alerts.push({
        type: 'info',
        title: 'Quality Score Below Average',
        description: `Current: ${qualityScore?.toFixed(0)} | Industry avg: ${benchmarks.qualityScore}`,
        severity: 'Monitor',
        color: 'blue'
      })
    }
    
    return alerts
  }
  
  const alerts = getPerformanceAlerts()
  
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile-Optimized Performance Metrics with Horizontal Scroll */}
      <div className="relative">
        {/* Section Title */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Key Performance Indicators</h2>
          
          {/* Desktop: Show card count, Mobile: Show scroll indicators */}
          {isMobile || isTablet ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className={cn(
                  "p-1 rounded-full border",
                  canScrollLeft 
                    ? "bg-white shadow-sm hover:bg-gray-50" 
                    : "bg-gray-50 text-gray-300 cursor-not-allowed"
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className={cn(
                  "p-1 rounded-full border",
                  canScrollRight 
                    ? "bg-white shadow-sm hover:bg-gray-50" 
                    : "bg-gray-50 text-gray-300 cursor-not-allowed"
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Badge variant="outline" className="text-xs">
              {kpiCards.length} metrics
            </Badge>
          )}
        </div>
        
        {/* Scrollable KPI Cards Container */}
        <div 
          ref={scrollContainerRef}
          className={cn(
            "flex gap-4 overflow-x-auto scrollbar-hide",
            isMobile || isTablet ? "pb-2 -mx-4 px-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          )}
          style={{
            scrollSnapType: isMobile || isTablet ? 'x mandatory' : 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {isMobile || isTablet ? (
            // Mobile: Horizontal scrolling cards
            kpiCards.map((card, index) => (
              <MobileKPICard key={index} card={card} index={index} />
            ))
          ) : (
            // Desktop: Grid layout
            kpiCards.map((card, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    {card.title}
                    {card.icon}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  <div className="mt-2">
                    <Progress value={card.progress} className="h-2" />
                  </div>
                  <p className={cn(
                    "text-xs mt-1",
                    card.change !== 0 ? getTrendColor(card.change) : "text-muted-foreground"
                  )}>
                    {card.changeText}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        
        {/* Mobile scroll indicator dots */}
        {(isMobile || isTablet) && (
          <div className="flex justify-center mt-3 space-x-1">
            {kpiCards.map((_, index) => (
              <div
                key={index}
                className="w-1.5 h-1.5 rounded-full bg-gray-300"
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Performance Alerts - Mobile Optimized */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base sm:text-lg">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
            Performance Alerts
          </CardTitle>
          <CardDescription className="text-sm">
            Areas that need attention based on industry benchmarks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((alert, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 rounded-lg",
                    alert.color === 'yellow' && "bg-yellow-50",
                    alert.color === 'red' && "bg-red-50",
                    alert.color === 'blue' && "bg-blue-50"
                  )}
                >
                  <div className={cn(
                    "flex flex-col sm:flex-row sm:items-center sm:justify-between",
                    "space-y-2 sm:space-y-0"
                  )}>
                    <div className="flex-1">
                      <h4 className={cn(
                        "font-medium text-sm",
                        alert.color === 'yellow' && "text-yellow-800",
                        alert.color === 'red' && "text-red-800",
                        alert.color === 'blue' && "text-blue-800"
                      )}>
                        {alert.title}
                      </h4>
                      <p className={cn(
                        "text-xs mt-1",
                        alert.color === 'yellow' && "text-yellow-700",
                        alert.color === 'red' && "text-red-700",
                        alert.color === 'blue' && "text-blue-700"
                      )}>
                        {alert.description}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "self-start sm:self-center text-xs",
                        alert.color === 'yellow' && "bg-yellow-100 border-yellow-200",
                        alert.color === 'red' && "bg-red-100 border-red-200",
                        alert.color === 'blue' && "bg-blue-100 border-blue-200"
                      )}
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-lg">
                <Award className="h-8 w-8 text-green-600 mb-2" />
                <h4 className="font-medium text-green-800 text-center">All Systems Performing Well</h4>
                <p className="text-sm text-green-700 text-center mt-1">
                  Your farm is meeting or exceeding industry benchmarks
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Charts - Mobile Optimized */}
      <div className={cn(
        "space-y-4",
        !isMobile && "lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0"
      )}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Production Comparison</CardTitle>
            <CardDescription className="text-sm">Current vs previous month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
              <BarChart data={[
                {
                  name: 'Previous',
                  production: previousMonth?.production?.summary?.totalMilkVolume || 0,
                  costs: previousMonth?.feed?.summary?.totalFeedCost || 0
                },
                {
                  name: 'Current',
                  production: currentMonth?.production?.summary?.totalMilkVolume || 0,
                  costs: currentMonth?.feed?.summary?.totalFeedCost || 0
                }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  fontSize={isMobile ? 10 : 12}
                />
                <YAxis fontSize={isMobile ? 10 : 12} />
                <Tooltip 
                  contentStyle={{
                    fontSize: isMobile ? '12px' : '14px'
                  }}
                />
                {!isMobile && <Legend />}
                <Bar dataKey="production" fill="#16a34a" name="Milk Production (L)" />
                <Bar dataKey="costs" fill="#dc2626" name="Feed Costs ($)" />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Mobile Legend */}
            {isMobile && (
              <div className="flex justify-center space-x-4 mt-2 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-600 rounded mr-1"></div>
                  <span>Production</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-600 rounded mr-1"></div>
                  <span>Costs</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Quality Trends</CardTitle>
            <CardDescription className="text-sm">Fat and protein content over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
              <LineChart data={currentMonth?.production?.qualityTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={isMobile ? 10 : 12}
                />
                <YAxis fontSize={isMobile ? 10 : 12} />
                <Tooltip 
                  contentStyle={{
                    fontSize: isMobile ? '12px' : '14px'
                  }}
                />
                {!isMobile && <Legend />}
                <Line type="monotone" dataKey="fat" stroke="#16a34a" name="Fat %" strokeWidth={2} />
                <Line type="monotone" dataKey="protein" stroke="#2563eb" name="Protein %" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            
            {/* Mobile Legend */}
            {isMobile && (
              <div className="flex justify-center space-x-4 mt-2 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-600 rounded mr-1"></div>
                  <span>Fat %</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded mr-1"></div>
                  <span>Protein %</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}