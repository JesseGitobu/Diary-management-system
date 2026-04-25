'use client'

import { Plus, Activity, AlertCircle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { MilkingFacility, MilkingSession } from '@/types/housing'

interface MilkingFacilitiesProps {
  farmId: string
}

export function MilkingFacilities({ farmId }: MilkingFacilitiesProps) {
  // Sample data
  const facilities: MilkingFacility[] = [
    {
      id: 'mf1',
      building_id: 'b1',
      farm_id: farmId,
      name: 'Main Parlor',
      parlor_type: 'herringbone',
      milking_units: 12,
      capacity_per_hour: 60,
      current_occupancy: 12,
      status: 'active',
      equipment_ids: ['eq1', 'eq2'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const sessions: MilkingSession[] = [
    {
      id: 'ms1',
      facility_id: 'mf1',
      farm_id: farmId,
      started_at: new Date(Date.now() - 3600000).toISOString(),
      animals_milked: Array.from({ length: 12 }, (_, i) => `animal${i + 1}`),
      total_units_used: 12,
      status: 'completed',
      efficiency_percentage: 94,
    },
    {
      id: 'ms2',
      facility_id: 'mf1',
      farm_id: farmId,
      started_at: new Date().toISOString(),
      animals_milked: Array.from({ length: 8 }, (_, i) => `animal${i + 13}`),
      total_units_used: 8,
      status: 'in_progress',
      efficiency_percentage: 92,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Milking Facilities</h3>
          <p className="text-sm text-gray-600 mt-1">
            Monitor milking parlors, sessions, and equipment efficiency
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </Button>
      </div>

      {/* Facilities Overview */}
      <div className="grid gap-4">
        {facilities.map(facility => (
          <Card key={facility.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{facility.name}</CardTitle>
                  <CardDescription>
                    {facility.parlor_type} • {facility.milking_units} units
                  </CardDescription>
                </div>
                <Badge className={
                  facility.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : facility.status === 'maintenance'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }>
                  {facility.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Capacity Indicator */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Current Usage</span>
                  <span className="text-sm font-bold">
                    {facility.current_occupancy}/{facility.milking_units} units
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full"
                    style={{
                      width: `${(facility.current_occupancy / facility.milking_units) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-3 gap-3 py-3 border-t border-b">
                <div>
                  <p className="text-xs text-gray-600">Capacity/Hour</p>
                  <p className="text-lg font-bold">{facility.capacity_per_hour}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Milking Units</p>
                  <p className="text-lg font-bold">{facility.milking_units}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Type</p>
                  <p className="text-sm font-medium capitalize">{facility.parlor_type}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Start Session
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Equipment Status
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today's Sessions</CardTitle>
          <CardDescription>Active and completed milking sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.map(session => (
            <div
              key={session.id}
              className="flex items-start justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">Session {session.id}</span>
                  <Badge
                    className={
                      session.status === 'completed'
                        ? 'bg-green-100 text-green-800 text-xs'
                        : session.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800 text-xs'
                        : 'bg-gray-100 text-gray-800 text-xs'
                    }
                  >
                    {session.status}
                  </Badge>
                </div>
                <div className="flex gap-4 text-xs text-gray-600 mt-2">
                  <span>{session.animals_milked.length} animals</span>
                  <span>{session.total_units_used} units used</span>
                  {session.efficiency_percentage && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {session.efficiency_percentage}% efficiency
                    </span>
                  )}
                </div>
              </div>
              {session.efficiency_percentage && session.efficiency_percentage >= 90 && (
                <Badge variant="secondary" className="text-xs">
                  Optimal
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Equipment Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipment Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { name: 'Cluster Unit #1', status: 'operational' },
            { name: 'Cluster Unit #2', status: 'operational' },
            { name: 'Backup Compressor', status: 'operational' },
            { name: 'Milk Meter', status: 'maintenance' },
          ].map((eq, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 border border-gray-200 rounded">
              <span className="text-sm">{eq.name}</span>
              <Badge
                variant="outline"
                className={
                  eq.status === 'operational'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }
              >
                {eq.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
