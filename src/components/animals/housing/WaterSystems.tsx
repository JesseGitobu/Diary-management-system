'use client'

import { Plus, AlertTriangle, Droplet, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { WaterPoint, WaterQualityReading, WaterFlowLog } from '@/types/housing'

interface WaterSystemsProps {
  farmId: string
}

export function WaterSystems({ farmId }: WaterSystemsProps) {
  // Sample data
  const waterPoints: WaterPoint[] = [
    {
      id: 'wp1',
      pen_id: 'p1',
      farm_id: farmId,
      water_point_type: 'automatic_drinker',
      quantity: 4,
      capacity_per_point_liters: 50,
      status: 'operational',
      last_cleaned: new Date(Date.now() - 86400000).toISOString(),
      last_tested: new Date(Date.now() - 172800000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'wp2',
      pen_id: 'p2',
      farm_id: farmId,
      water_point_type: 'trough',
      quantity: 2,
      capacity_per_point_liters: 200,
      status: 'operational',
      last_cleaned: new Date(Date.now() - 43200000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const qualityReadings: WaterQualityReading[] = [
    {
      id: 'wqr1',
      water_point_id: 'wp1',
      farm_id: farmId,
      tested_at: new Date(Date.now() - 86400000).toISOString(),
      tested_by: 'user1',
      ph_level: 7.2,
      tds_ppm: 450,
      turbidity_ntu: 0.5,
      temperature_celsius: 15,
      bacterial_count: 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const flowLogs: WaterFlowLog[] = [
    {
      id: 'wfl1',
      water_point_id: 'wp1',
      farm_id: farmId,
      flow_rate_liters_per_min: 8.5,
      recorded_at: new Date().toISOString(),
      status: 'normal',
    },
    {
      id: 'wfl2',
      water_point_id: 'wp2',
      farm_id: farmId,
      flow_rate_liters_per_min: 12.0,
      recorded_at: new Date().toISOString(),
      status: 'normal',
    },
  ]

  const isQualityGood = (reading: WaterQualityReading) => {
    return (
      reading.ph_level &&
      reading.ph_level >= 6.5 &&
      reading.ph_level <= 8.5 &&
      (!reading.bacterial_count || reading.bacterial_count < 100)
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Water Systems</h3>
          <p className="text-sm text-gray-600 mt-1">
            Monitor water points, flow rates, and quality metrics
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Water Point
        </Button>
      </div>

      {/* Water Points Overview */}
      <div className="grid gap-4 lg:grid-cols-2">
        {waterPoints.map(point => (
          <Card key={point.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Droplet className="h-5 w-5 text-blue-600" />
                    <span>Pen {point.pen_id}</span>
                  </CardTitle>
                  <CardDescription className="capitalize">
                    {point.water_point_type.replace(/_/g, ' ')} • {point.quantity} points
                  </CardDescription>
                </div>
                <Badge
                  className={
                    point.status === 'operational'
                      ? 'bg-green-100 text-green-800'
                      : point.status === 'offline'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }
                >
                  {point.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Maintenance Info */}
              <div className="space-y-2 text-sm">
                {point.last_cleaned && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Last Cleaned</span>
                    <span className="font-medium">
                      {new Date(point.last_cleaned).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {point.last_tested && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Last Tested</span>
                    <span className="font-medium">
                      {new Date(point.last_tested).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Capacity Info */}
              {point.capacity_per_point_liters && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                  <p className="text-xs text-gray-600 mb-1">Capacity per Point</p>
                  <p className="font-semibold">{point.capacity_per_point_liters} liters</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Log Cleaning
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Test Quality
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Water Quality Readings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Water Quality Analysis</CardTitle>
          <CardDescription>Latest quality readings and metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {qualityReadings.map(reading => (
            <div key={reading.id} className="space-y-3 p-3 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">Water Point {reading.water_point_id}</p>
                  <p className="text-xs text-gray-600">
                    {new Date(reading.tested_at).toLocaleString()}
                  </p>
                </div>
                <Badge
                  className={
                    isQualityGood(reading)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }
                >
                  {isQualityGood(reading) ? 'Good' : 'Needs Review'}
                </Badge>
              </div>

              {/* Quality Metrics */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {reading.ph_level && (
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">pH Level</p>
                    <p className="font-semibold">
                      {reading.ph_level}
                      <span className="text-xs text-gray-600 ml-1">
                        {reading.ph_level >= 6.5 && reading.ph_level <= 8.5 ? '✓' : '⚠'}
                      </span>
                    </p>
                  </div>
                )}
                {reading.tds_ppm && (
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">TDS (ppm)</p>
                    <p className="font-semibold">{reading.tds_ppm}</p>
                  </div>
                )}
                {reading.temperature_celsius && (
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Temperature</p>
                    <p className="font-semibold">{reading.temperature_celsius}°C</p>
                  </div>
                )}
                {reading.turbidity_ntu && (
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">Turbidity</p>
                    <p className="font-semibold">{reading.turbidity_ntu} NTU</p>
                  </div>
                )}
              </div>

              {reading.bacterial_count && reading.bacterial_count > 100 && (
                <div className="flex gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Bacterial count elevated - consider treatment</span>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Flow Rate Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flow Rate Monitoring</CardTitle>
          <CardDescription>Real-time water flow status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {flowLogs.map(log => (
            <div
              key={log.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">Water Point {log.water_point_id}</p>
                <p className="text-xs text-gray-600">
                  {new Date(log.recorded_at).toLocaleTimeString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-base">{log.flow_rate_liters_per_min}</p>
                <p className="text-xs text-gray-600">L/min</p>
              </div>
              <Badge
                variant="outline"
                className={
                  log.status === 'normal'
                    ? 'bg-green-100 text-green-800 ml-2'
                    : log.status === 'low'
                    ? 'bg-yellow-100 text-yellow-800 ml-2'
                    : 'bg-red-100 text-red-800 ml-2'
                }
              >
                {log.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
