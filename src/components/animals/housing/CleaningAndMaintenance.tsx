'use client'

import { useState } from 'react'
import { Plus, Calendar, User, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CleaningSchedule, CleaningLog, MaintenanceSchedule, MaintenanceLog } from '@/types/housing'

interface CleaningAndMaintenanceProps {
  farmId: string
}

export function CleaningAndMaintenance({ farmId }: CleaningAndMaintenanceProps) {
  const [activeTab, setActiveTab] = useState<'cleaning' | 'maintenance'>('cleaning')

  // Sample data - will be replaced with API
  const cleaningSchedules: CleaningSchedule[] = [
    {
      id: 'cs1',
      pen_id: 'p1',
      farm_id: farmId,
      frequency: 'daily',
      scheduled_time: '06:00',
      start_date: new Date().toISOString(),
      cleaning_type: 'spot_cleaning',
      status: 'pending',
      assigned_to: 'user1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'cs2',
      pen_id: 'p2',
      farm_id: farmId,
      frequency: 'weekly',
      start_date: new Date().toISOString(),
      cleaning_type: 'deep_clean',
      status: 'completed',
      assigned_to: 'user2',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const cleaningLogs: CleaningLog[] = [
    {
      id: 'cl1',
      pen_id: 'p1',
      farm_id: farmId,
      cleaning_type: 'spot_cleaning',
      cleaned_at: new Date(Date.now() - 3600000).toISOString(),
      cleaned_by: 'user1',
      duration_minutes: 45,
      bedding_replaced: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const maintenanceSchedules: MaintenanceSchedule[] = [
    {
      id: 'ms1',
      asset_id: 'building1',
      asset_type: 'building',
      farm_id: farmId,
      task_description: 'Check ventilation system',
      maintenance_type: 'preventive',
      frequency: 'monthly',
      scheduled_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      status: 'scheduled',
      priority: 'high',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('cleaning')}
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            activeTab === 'cleaning'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Cleaning Schedule
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            activeTab === 'maintenance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Maintenance
        </button>
      </div>

      {/* Cleaning Tab */}
      {activeTab === 'cleaning' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Cleaning Schedules</h3>
              <p className="text-sm text-gray-600">Manage and track cleaning routines</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Cleaning
            </Button>
          </div>

          {/* Upcoming Cleanings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Cleanings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cleaningSchedules.map(schedule => (
                <div
                  key={schedule.id}
                  className="flex items-start justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium">Pen {schedule.pen_id}</span>
                      <Badge variant="outline" className="text-xs">
                        {schedule.cleaning_type.replace(/_/g, ' ')}
                      </Badge>
                      <Badge
                        className={`text-xs ${
                          schedule.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : schedule.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {schedule.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{schedule.frequency}</span>
                      {schedule.assigned_to && (
                        <>
                          <User className="h-4 w-4" />
                          <span>Assigned to user</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Cleaning History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Cleaning Logs</CardTitle>
              <CardDescription>Last 20 cleaning activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cleaningLogs.map(log => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div>
                    <p className="font-medium text-sm">Pen {log.pen_id}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(log.cleaned_at).toLocaleString()} by {log.cleaned_by}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {log.cleaning_type.replace(/_/g, ' ')}
                      </Badge>
                      {log.duration_minutes && (
                        <Badge variant="secondary" className="text-xs">
                          {log.duration_minutes} min
                        </Badge>
                      )}
                      {log.bedding_replaced && (
                        <Badge variant="secondary" className="text-xs">
                          Bedding replaced
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Maintenance Schedule</h3>
              <p className="text-sm text-gray-600">Track equipment and facility maintenance</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Maintenance
            </Button>
          </div>

          {/* Maintenance Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {maintenanceSchedules.map(schedule => (
                <div
                  key={schedule.id}
                  className="flex items-start justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium mb-1">{schedule.task_description}</p>
                    <div className="flex items-center gap-2 flex-wrap text-sm text-gray-600">
                      <Badge variant="outline" className="text-xs">
                        {schedule.asset_type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {schedule.maintenance_type}
                      </Badge>
                      <Badge
                        className={`text-xs ${
                          schedule.priority === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : schedule.priority === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {schedule.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mt-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(schedule.scheduled_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <CheckCircle2 className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
