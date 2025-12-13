'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AlertCircle, Clock, TrendingDown, Calendar } from 'lucide-react'
import type { BreedingAlert } from '@/lib/database/breeding-stats'

interface BreedingAlertsProps {
  alerts: BreedingAlert[]
  onActionClick: (alertType: string, animalId: string) => void
}

export function BreedingAlerts({ alerts, onActionClick }: BreedingAlertsProps) {
  if (alerts.length === 0) {
    return null
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'calving_due':
        return <Calendar className="h-5 w-5" />
      case 'pregnancy_check_due':
        return <Clock className="h-5 w-5" />
      case 'low_conception_rate':
        return <TrendingDown className="h-5 w-5" />
      case 'overdue_breeding':
        return <AlertCircle className="h-5 w-5" />
      default:
        return <AlertCircle className="h-5 w-5" />
    }
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'warning':
        return 'outline'
      case 'info':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <span>Breeding Alerts</span>
        </CardTitle>
        <CardDescription>
          Important notifications and upcoming tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">
                        {(() => {
                          switch (alert.type) {
                            case 'calving_due':
                              return 'Calving Due';
                            case 'pregnancy_check_due':
                              return 'Pregnancy Check Due';
                            case 'low_conception_rate':
                              return 'Low Conception Rate';
                            case 'overdue_breeding':
                              return 'Overdue Breeding';
                            default:
                              return 'Alert';
                          }
                        })()}
                      </h4>
                      <Badge variant={getBadgeVariant(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      {alert.count && (
                        <Badge variant="outline">
                          {alert.count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{alert.message}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onActionClick(alert.type, alert.animal_id)}
                  className="ml-4"
                >
                  {alert.type === 'calving_due' && 'View'}
                  {alert.type === 'pregnancy_check_due' && 'Record'}
                  {alert.type === 'low_conception_rate' && 'Review'}
                  {alert.type === 'overdue_breeding' && 'Update'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}