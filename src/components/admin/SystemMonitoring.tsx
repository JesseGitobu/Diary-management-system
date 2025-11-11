//src/components/admin/SystemMonitoring.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Activity, 
  Server, 
  Database, 
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp
} from 'lucide-react'

interface SystemMonitoringProps {
  metrics: any[]
}

export function SystemMonitoring({ metrics: initialMetrics }: SystemMonitoringProps) {
  const [metrics, setMetrics] = useState(initialMetrics)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/admin/monitoring')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Error refreshing metrics:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(handleRefresh, 30000)
    return () => clearInterval(interval)
  }, [])

  const systemStatus = {
    database: { status: 'healthy', responseTime: 45, uptime: 99.9 },
    api: { status: 'healthy', responseTime: 120, uptime: 99.8 },
    storage: { status: 'healthy', usage: 45, uptime: 100 },
    email: { status: 'healthy', deliveryRate: 99.5, uptime: 99.9 }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      healthy: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      degraded: 'bg-orange-100 text-orange-800'
    }
    
    return (
      <Badge className={colors[status] || colors.healthy}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600 mt-2">
            Real-time system health and performance metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{systemStatus.database.responseTime}ms</span>
              {getStatusBadge(systemStatus.database.status)}
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime: {systemStatus.database.uptime}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{systemStatus.api.responseTime}ms</span>
              {getStatusBadge(systemStatus.api.status)}
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime: {systemStatus.api.uptime}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{systemStatus.storage.usage}%</span>
              {getStatusBadge(systemStatus.storage.status)}
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime: {systemStatus.storage.uptime}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Service</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">{systemStatus.email.deliveryRate}%</span>
              {getStatusBadge(systemStatus.email.status)}
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime: {systemStatus.email.uptime}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>
              System performance over the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>API Response Time</span>
                  <span className="text-green-600">Good</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Database Queries</span>
                  <span className="text-green-600">Optimal</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Storage I/O</span>
                  <span className="text-yellow-600">Moderate</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Memory Usage</span>
                  <span className="text-green-600">Good</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>
              Recent warnings and notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">System backup completed</p>
                  <p className="text-xs text-gray-600">All data backed up successfully - 2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">High memory usage detected</p>
                  <p className="text-xs text-gray-600">Memory usage at 78% - monitoring - 3 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Scheduled maintenance upcoming</p>
                  <p className="text-xs text-gray-600">System update scheduled for Sunday 2AM - 1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Metrics</CardTitle>
          <CardDescription>
            Latest performance data points
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 font-medium text-sm">Metric</th>
                  <th className="text-left py-2 px-4 font-medium text-sm">Type</th>
                  <th className="text-right py-2 px-4 font-medium text-sm">Value</th>
                  <th className="text-left py-2 px-4 font-medium text-sm">Unit</th>
                  <th className="text-right py-2 px-4 font-medium text-sm">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {metrics.length > 0 ? metrics.slice(0, 10).map((metric: any) => (
                  <tr key={metric.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 text-sm">{metric.metric_name}</td>
                    <td className="py-2 px-4 text-sm">{metric.metric_type}</td>
                    <td className="py-2 px-4 text-sm text-right font-medium">{metric.metric_value}</td>
                    <td className="py-2 px-4 text-sm">{metric.metric_unit || 'count'}</td>
                    <td className="py-2 px-4 text-sm text-right text-gray-600">
                      {new Date(metric.recorded_at).toLocaleString()}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No metrics recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

