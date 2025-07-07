'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { TrendingUp, TrendingDown, Minus, Target, Award, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface KPIDashboardProps {
  kpis: any
}

export function KPIDashboard({ kpis }: KPIDashboardProps) {
  const currentMonth = kpis?.currentMonth
  const previousMonth = kpis?.previousMonth
  const changes = kpis?.changes
  
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
  
  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              Production Trend
              {getTrendIcon(changes?.production || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonth?.production?.summary?.averageDailyProduction?.toFixed(1) || 0}L
            </div>
            <p className="text-xs text-muted-foreground">Daily average</p>
            <div className="mt-2">
              <Progress 
                value={Math.min((currentMonth?.production?.summary?.averageDailyProduction || 0) / benchmarks.milkPerCow * 100, 100)} 
                className="h-2" 
              />
            </div>
            <p className={`text-xs mt-1 ${getTrendColor(changes?.production || 0)}`}>
              {changes?.production >= 0 ? '+' : ''}{changes?.production?.toFixed(1) || 0}% vs last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              Feed Efficiency
              <Target className="h-4 w-4 ml-2 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionEfficiency?.toFixed(2) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Milk/Feed ratio</p>
            <div className="mt-2">
              <Progress 
                value={Math.min((productionEfficiency || 0) / benchmarks.feedEfficiency * 100, 100)} 
                className="h-2" 
              />
            </div>
            <p className="text-xs mt-1 text-muted-foreground">
              Target: {benchmarks.feedEfficiency}+
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              Profitability
              {getTrendIcon(changes?.profit || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonth?.financial?.summary?.profitMargin?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Profit margin</p>
            <div className="mt-2">
              <Progress 
                value={Math.min((currentMonth?.financial?.summary?.profitMargin || 0) / benchmarks.profitMargin * 100, 100)} 
                className="h-2" 
              />
            </div>
            <p className={`text-xs mt-1 ${getTrendColor(changes?.profit || 0)}`}>
              {changes?.profit >= 0 ? '+' : ''}{changes?.profit?.toFixed(1) || 0}% vs last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              Quality Score
              <Award className="h-4 w-4 ml-2 text-yellow-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {qualityScore?.toFixed(0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Fat + Protein index</p>
            <div className="mt-2">
              <Progress 
                value={Math.min((qualityScore || 0) / benchmarks.qualityScore * 100, 100)} 
                className="h-2" 
              />
            </div>
            <p className="text-xs mt-1 text-muted-foreground">
              Industry avg: {benchmarks.qualityScore}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Performance Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
            Performance Alerts
          </CardTitle>
          <CardDescription>
            Areas that need attention based on industry benchmarks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {productionEfficiency < benchmarks.feedEfficiency && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-yellow-800">Feed Efficiency Below Target</h4>
                  <p className="text-sm text-yellow-700">
                    Current ratio: {productionEfficiency?.toFixed(2)} | Target: {benchmarks.feedEfficiency}+
                  </p>
                </div>
                <Badge variant="outline" className="bg-yellow-100">Action Needed</Badge>
              </div>
            )}
            
            {(currentMonth?.financial?.summary?.profitMargin || 0) < benchmarks.profitMargin && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-red-800">Low Profit Margin</h4>
                  <p className="text-sm text-red-700">
                    Current: {currentMonth?.financial?.summary?.profitMargin?.toFixed(1)}% | Target: {benchmarks.profitMargin}%+
                  </p>
                </div>
                <Badge variant="outline" className="bg-red-100">Critical</Badge>
              </div>
            )}
            
            {qualityScore < benchmarks.qualityScore && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-blue-800">Quality Score Below Average</h4>
                  <p className="text-sm text-blue-700">
                    Current: {qualityScore?.toFixed(0)} | Industry avg: {benchmarks.qualityScore}
                  </p>
                </div>
                <Badge variant="outline" className="bg-blue-100">Monitor</Badge>
              </div>
            )}
            
            {!productionEfficiency || qualityScore >= benchmarks.qualityScore && 
             (currentMonth?.financial?.summary?.profitMargin || 0) >= benchmarks.profitMargin ? (
              <div className="flex items-center justify-center p-6 bg-green-50 rounded-lg">
                <div className="text-center">
                  <Award className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h4 className="font-medium text-green-800">All Systems Performing Well</h4>
                  <p className="text-sm text-green-700">
                    Your farm is meeting or exceeding industry benchmarks
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
      
      {/* Monthly Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Production Comparison</CardTitle>
            <CardDescription>Current vs previous month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                {
                  name: 'Previous Month',
                  production: previousMonth?.production?.summary?.totalMilkVolume || 0,
                  costs: previousMonth?.feed?.summary?.totalFeedCost || 0
                },
                {
                  name: 'Current Month',
                  production: currentMonth?.production?.summary?.totalMilkVolume || 0,
                  costs: currentMonth?.feed?.summary?.totalFeedCost || 0
                }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="production" fill="#16a34a" name="Milk Production (L)" />
                <Bar dataKey="costs" fill="#dc2626" name="Feed Costs ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quality Trends</CardTitle>
            <CardDescription>Fat and protein content over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={currentMonth?.production?.qualityTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="fat" stroke="#16a34a" name="Fat %" strokeWidth={2} />
                <Line type="monotone" dataKey="protein" stroke="#2563eb" name="Protein %" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}