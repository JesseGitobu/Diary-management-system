'use client'

import { Plus, AlertTriangle, Droplet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { FeedStation, AutomatedFeeder, FeedingRecord } from '@/types/housing'

interface FeedingInfrastructureProps {
  farmId: string
}

export function FeedingInfrastructure({ farmId }: FeedingInfrastructureProps) {
  // Sample data
  const feedStations: FeedStation[] = [
    {
      id: 'fs1',
      pen_id: 'p1',
      farm_id: farmId,
      station_number: 1,
      station_type: 'automated',
      capacity_kg: 500,
      current_feed_kg: 320,
      feed_type: 'Concentrated feed',
      automated: true,
      last_filled: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'fs2',
      pen_id: 'p1',
      farm_id: farmId,
      station_number: 2,
      station_type: 'manual',
      capacity_kg: 300,
      current_feed_kg: 50,
      automated: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const automatedFeeders: AutomatedFeeder[] = [
    {
      id: 'af1',
      feed_station_id: 'fs1',
      farm_id: farmId,
      device_name: 'AutoFeeder Pro X1',
      capacity_kg: 500,
      current_fill_kg: 320,
      dispense_schedule: '0 6,12,18 * * *',
      status: 'operational',
      battery_level: 85,
      last_dispense: new Date(Date.now() - 7200000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const feedingRecords: FeedingRecord[] = [
    {
      id: 'fr1',
      pen_id: 'p1',
      farm_id: farmId,
      feed_type: 'Concentrated feed',
      quantity_kg: 45,
      fed_at: new Date(Date.now() - 3600000).toISOString(),
      fed_by: 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Feeding Infrastructure</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage feed stations, automated systems, and distribution
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Feed Station
        </Button>
      </div>

      {/* Feed Stations */}
      <div className="space-y-4">
        <h4 className="font-semibold text-base">Feed Stations</h4>
        {feedStations.map(station => (
          <Card key={station.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Pen {station.pen_id} - Station {station.station_number}
                  </CardTitle>
                  <CardDescription>{station.station_type}</CardDescription>
                </div>
                {station.current_feed_kg && station.capacity_kg && (
                  <Badge
                    className={
                      (station.current_feed_kg / station.capacity_kg) * 100 < 20
                        ? 'bg-red-100 text-red-800'
                        : (station.current_feed_kg / station.capacity_kg) * 100 < 50
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }
                  >
                    {((station.current_feed_kg / station.capacity_kg) * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Feed Level */}
              {station.capacity_kg && (
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="text-gray-600">Feed Level</span>
                    <span className="font-medium">
                      {station.current_feed_kg}/{station.capacity_kg} kg
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${
                        (station.current_feed_kg! / station.capacity_kg!) * 100 < 20
                          ? 'bg-red-500'
                          : (station.current_feed_kg! / station.capacity_kg!) * 100 < 50
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min((station.current_feed_kg! / station.capacity_kg!) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Low Feed Alert */}
              {station.current_feed_kg && station.capacity_kg && (station.current_feed_kg / station.capacity_kg) * 100 < 30 && (
                <div className="flex gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Feed level low - refill recommended</span>
                </div>
              )}

              {/* Station Info */}
              <div className="grid grid-cols-2 gap-3 py-2 border-t">
                {station.feed_type && (
                  <div>
                    <p className="text-xs text-gray-600">Feed Type</p>
                    <p className="text-sm font-medium">{station.feed_type}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-600">Type</p>
                  <p className="text-sm font-medium capitalize">{station.station_type}</p>
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full">
                Refill Station
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Automated Feeders */}
      {automatedFeeders.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-base">Automated Feeders</h4>
          {automatedFeeders.map(feeder => (
            <Card key={feeder.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{feeder.device_name}</CardTitle>
                  <Badge
                    className={
                      feeder.status === 'operational'
                        ? 'bg-green-100 text-green-800'
                        : feeder.status === 'offline'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {feeder.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Hopper Level */}
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="text-gray-600">Hopper Level</span>
                    <span className="font-medium">{feeder.current_fill_kg} kg</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full"
                      style={{
                        width: `${(feeder.current_fill_kg / feeder.capacity_kg) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Device Info */}
                <div className="grid grid-cols-3 gap-3 p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-xs text-gray-600">Battery</p>
                    <p className="text-sm font-medium">{feeder.battery_level}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Capacity</p>
                    <p className="text-sm font-medium">{feeder.capacity_kg} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Last Dispense</p>
                    <p className="text-xs font-medium">
                      {new Date(feeder.last_dispense!).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Schedule */}
                {feeder.dispense_schedule && (
                  <div className="p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                    <p className="text-xs text-gray-600 mb-1">Dispense Schedule</p>
                    <p className="text-sm font-medium">3x daily (6:00, 12:00, 18:00)</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Feeding Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Feeding Records</CardTitle>
          <CardDescription>Last 10 feeding activities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {feedingRecords.map(record => (
            <div
              key={record.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-sm">Pen {record.pen_id}</span>
                  <Badge variant="outline" className="text-xs">
                    {record.feed_type}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">
                  {new Date(record.fed_at).toLocaleString()} • {record.fed_by}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{record.quantity_kg} kg</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
