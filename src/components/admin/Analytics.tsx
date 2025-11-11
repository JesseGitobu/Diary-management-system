//src/components/admin/Analytics.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign,
  Building2,
  Calendar,
  Download,
  Filter
} from 'lucide-react'
import { GiCow } from 'react-icons/gi'

interface AnalyticsProps {
  analyticsData: any
}

export function Analytics({ analyticsData }: AnalyticsProps) {
  const [timeRange, setTimeRange] = useState('30d')
  const [metric, setMetric] = useState('all')

  const stats = analyticsData || {
    userGrowth: { current: 0, previous: 0, change: 0 },
    farmGrowth: { current: 0, previous: 0, change: 0 },
    revenueGrowth: { current: 0, previous: 0, change: 0 },
    animalTracking: { current: 0, previous: 0, change: 0 },
    engagement: {
      dailyActiveUsers: 0,
      averageSessionTime: 0,
      featuresUsed: []
    },
    topFarms: [],
    recentActivity: []
  }

  const getChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center text-green-600 text-sm">
          <TrendingUp className="w-4 h-4 mr-1" />
          +{change}%
        </div>
      )
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-600 text-sm">
          <TrendingUp className="w-4 h-4 mr-1 transform rotate-180" />
          {change}%
        </div>
      )
    }
    return <span className="text-gray-500 text-sm">No change</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Track platform growth and user engagement metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Growth</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userGrowth.current}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">vs previous period</p>
              {getChangeIndicator(stats.userGrowth.change)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Farm Growth</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.farmGrowth.current}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">vs previous period</p>
              {getChangeIndicator(stats.farmGrowth.change)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Growth</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenueGrowth.current}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">vs previous period</p>
              {getChangeIndicator(stats.revenueGrowth.change)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Animals Tracked</CardTitle>
            <GiCow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.animalTracking.current}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">vs previous period</p>
              {getChangeIndicator(stats.animalTracking.change)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
            <CardDescription>
              Platform usage and activity metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Daily Active Users</p>
                <p className="text-2xl font-bold">{stats.engagement.dailyActiveUsers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Avg Session Time</p>
                <p className="text-2xl font-bold">{stats.engagement.averageSessionTime} min</p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
            
            <div className="pt-4">
              <p className="text-sm font-medium mb-3">Most Used Features</p>
              <div className="space-y-2">
                {(stats.engagement.featuresUsed || []).map((feature: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{feature.name}</span>
                    <span className="font-medium">{feature.usage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Farms</CardTitle>
            <CardDescription>
              Most active farms by engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats.topFarms || []).map((farm: any, index: number) => (
                <div key={farm.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{farm.name}</p>
                    <p className="text-sm text-gray-600">{farm.animals} animals • {farm.teamSize} team members</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {farm.engagement}% active
                  </Badge>
                </div>
              ))}
              
              {(!stats.topFarms || stats.topFarms.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No data available yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Platform Activity</CardTitle>
          <CardDescription>
            Latest events and actions across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(stats.recentActivity || []).map((activity: any, index: number) => (
              <div key={index} className="flex items-start space-x-3 pb-4 border-b last:border-0">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'success' ? 'bg-green-500' :
                  activity.type === 'warning' ? 'bg-yellow-500' :
                  activity.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.timestamp}</p>
                </div>
                <Badge variant="outline">{activity.category}</Badge>
              </div>
            ))}
            
            {(!stats.recentActivity || stats.recentActivity.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}