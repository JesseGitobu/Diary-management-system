'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Plus, 
  Wheat,
  Clock,
  ChevronRight,
  Users,
  User
} from 'lucide-react'

interface FeedConsumptionTabProps {
  consumptionRecords: any[]
  feedStats: any
  isMobile: boolean
  canRecordFeeding: boolean
  onRecordFeeding: () => void
}

export function FeedConsumptionTab({
  consumptionRecords,
  feedStats,
  isMobile,
  canRecordFeeding,
  onRecordFeeding
}: FeedConsumptionTabProps) {
  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Quick Action Card */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} text-green-800 flex items-center space-x-2`}>
            <Wheat className="h-5 w-5" />
            <span>Record New Feeding</span>
          </CardTitle>
          <CardDescription className={`${isMobile ? 'text-sm' : ''} text-green-700`}>
            Track individual animal feeding or batch feeding sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canRecordFeeding ? (
            <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'flex-row space-x-4'}`}>
              <Button 
                onClick={onRecordFeeding}
                className="bg-green-600 hover:bg-green-700"
                size={isMobile ? "default" : "lg"}
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Feeding
              </Button>
              <div className={`text-sm text-green-700 ${isMobile ? '' : 'flex items-center'}`}>
                <div>
                  <p className="font-medium">Track both individual and batch feeding</p>
                  <p>Monitor consumption patterns and feed efficiency</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-green-700">Contact farm manager to record feeding sessions.</p>
          )}
        </CardContent>
      </Card>

      {/* Consumption Records */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Recent Feeding Records</CardTitle>
              <CardDescription className={isMobile ? 'text-sm' : ''}>
                Latest feed consumption entries
              </CardDescription>
            </div>
            
            {canRecordFeeding && !isMobile && (
              <Button
                onClick={onRecordFeeding}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-1" />
                Record
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {consumptionRecords.length > 0 ? (
            <div className="space-y-3">
              {consumptionRecords.slice(0, 10).map((record: any) => (
                <div key={record.id} className={`flex items-start justify-between p-3 border rounded-lg ${isMobile ? 'flex-col space-y-2' : 'flex-row items-center'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={`font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>
                        {record.feed_types?.name}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {record.feeding_mode === 'individual' ? (
                          <><User className="w-3 h-3 mr-1" />Individual</>
                        ) : (
                          <><Users className="w-3 h-3 mr-1" />Batch</>
                        )}
                      </Badge>
                    </div>
                    <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {record.quantity_kg}kg • {record.animal_count} animal{record.animal_count !== 1 ? 's' : ''}
                      {record.notes && ` • ${record.notes}`}
                    </p>
                    <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'} flex items-center space-x-1`}>
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(record.feeding_time)}</span>
                      {record.recorded_by && (
                        <span>• by {record.recorded_by}</span>
                      )}
                    </p>
                  </div>
                  <div className={`text-right ${isMobile ? 'self-end' : 'ml-4'}`}>
                    <p className={`font-bold ${isMobile ? 'text-base' : 'text-lg'} text-green-600`}>
                      {record.quantity_kg}kg
                    </p>
                    <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {(record.quantity_kg / record.animal_count).toFixed(1)}kg per animal
                    </p>
                  </div>
                </div>
              ))}
              
              {consumptionRecords.length > 10 && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm">
                    View All Records
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Wheat className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <h3 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
                No feeding records
              </h3>
              <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} mt-1`}>
                Start tracking feed consumption by recording your first feeding session.
              </p>
              {canRecordFeeding && (
                <Button 
                  className="mt-4" 
                  onClick={onRecordFeeding}
                  size={isMobile ? "sm" : "default"}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Record First Feeding
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consumption Analytics */}
      {consumptionRecords.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Consumption Analytics</CardTitle>
            <CardDescription className={isMobile ? 'text-sm' : ''}>
              Feed consumption insights and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {feedStats.totalQuantity?.toFixed(1) || '0.0'}kg
                </div>
                <div className="text-sm text-blue-700 font-medium">Total This Month</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {feedStats.avgDailyQuantity?.toFixed(1) || '0.0'}kg
                </div>
                <div className="text-sm text-green-700 font-medium">Daily Average</div>
              </div>
              
              {!isMobile && (
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {consumptionRecords.length}
                  </div>
                  <div className="text-sm text-purple-700 font-medium">Feeding Sessions</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}