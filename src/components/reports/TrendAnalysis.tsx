'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { Calendar, TrendingUp, BarChart3 } from 'lucide-react'
import { subDays, subMonths, format } from 'date-fns'

interface TrendAnalysisProps {
  farmId: string
}

export function TrendAnalysis({ farmId }: TrendAnalysisProps) {
  const [timeRange, setTimeRange] = useState('30') // days
  const [trendData, setTrendData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  const fetchTrendData = async (days: string) => {
    setLoading(true)
    try {
      const endDate = new Date()
      const startDate = days === '30' ? subDays(endDate, 30) : 
                      days === '90' ? subDays(endDate, 90) : 
                      subMonths(endDate, 6)
      
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'comprehensive',
          dateRange: {
            start: format(startDate, 'yyyy-MM-dd'),
            end: format(endDate, 'yyyy-MM-dd')
          }
        })
      })
      
      const result = await response.json()
      if (result.success) {
        setTrendData(result.data)
      }
    } catch (error) {
      console.error('Error fetching trend data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchTrendData(timeRange)
  }, [timeRange])
  
  const productionTrends = trendData?.production?.qualityTrends || []
  const financialTrends = trendData?.financial?.dailyFinancials || []
  const feedTrends = trendData?.feed?.costTrends || []
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trend Analysis</h2>
          <p className="text-muted-foreground">
            Track performance patterns over time
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => fetchTrendData(timeRange)} 
            disabled={loading}
            size="sm"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>
      
      {/* Production Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Production Trends
          </CardTitle>
          <CardDescription>
            Daily milk production volume and quality metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={productionTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                formatter={(value: any, name: string) => [
                  `${value?.toFixed(2)} ${name.includes('volume') ? 'L' : '%'}`,
                  name
                ]}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="volume" 
                stackId="1"
                stroke="#16a34a" 
                fill="#16a34a"
                fillOpacity={0.6}
                name="Volume (L)"
              />
              <Line 
                type="monotone" 
                dataKey="fat" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Fat %"
              />
              <Line 
                type="monotone" 
                dataKey="protein" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Protein %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Financial Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Financial Performance
          </CardTitle>
          <CardDescription>
            Daily revenue, costs, and profit trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={financialTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date"
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                formatter={(value: any, name: string) => [
                  `$${value?.toFixed(2)}`,
                  name
                ]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#16a34a" 
                strokeWidth={2}
                name="Revenue"
              />
              <Line 
                type="monotone" 
                dataKey="costs" 
                stroke="#dc2626" 
                strokeWidth={2}
                name="Costs"
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="#2563eb" 
                strokeWidth={2}
                name="Profit"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Feed Cost Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Feed Cost Efficiency</CardTitle>
          <CardDescription>
            Feed costs and consumption patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={feedTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date"
                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              />
              <YAxis yAxisId="cost" orientation="left" />
              <YAxis yAxisId="quantity" orientation="right" />
              <Tooltip 
                labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                formatter={(value: any, name: string) => [
                  name.includes('Cost') ? `$${value?.toFixed(2)}` : `${value?.toFixed(1)} kg`,
                  name
                ]}
              />
              <Legend />
              <Line 
                yAxisId="cost"
                type="monotone" 
                dataKey="totalCost" 
                stroke="#dc2626" 
                strokeWidth={2}
                name="Total Cost ($)"
              />
              <Line 
                yAxisId="cost"
                type="monotone" 
                dataKey="costPerAnimal" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Cost per Animal ($)"
              />
              <Line 
                yAxisId="quantity"
                type="monotone" 
                dataKey="quantity" 
                stroke="#16a34a" 
                strokeWidth={2}
                name="Quantity (kg)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Insights & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
          <CardDescription>
            Automated analysis of your trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trendData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Production Insight</h4>
                  <p className="text-sm text-blue-800">
                    {trendData.production?.summary?.averageDailyProduction > 20 
                      ? "Your daily production is above average. Great work!"
                      : "Consider optimizing feeding schedules to increase production."
                    }
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Cost Optimization</h4>
                  <p className="text-sm text-green-800">
                    {trendData.financial?.summary?.profitMargin > 15
                      ? "Excellent profit margins! Your cost control is effective."
                      : "Review feed costs and production efficiency for better margins."
                    }
                  </p>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Quality Control</h4>
                  <p className="text-sm text-yellow-800">
                    {trendData.production?.summary?.averageFatContent > 3.5
                      ? "Fat content is excellent, indicating good nutrition."
                      : "Monitor feed quality to improve fat content."
                    }
                  </p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Feed Efficiency</h4>
                  <p className="text-sm text-purple-800">
                    Track feed-to-milk ratios to optimize nutrition costs and maximize output.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}