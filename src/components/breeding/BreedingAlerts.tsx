'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AlertCircle, Baby, TrendingDown, Clock, Heart } from 'lucide-react'

interface BreedingAlert {
  id: string
  type: 'calving_due' | 'pregnancy_check_due' | 'low_conception_rate' | 'overdue_breeding'
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  count?: number
}

interface BreedingAlertsProps {
  alerts: BreedingAlert[]
  onActionClick?: (alertType: string) => void
}

export function BreedingAlerts({ alerts, onActionClick }: BreedingAlertsProps) {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'calving_due': return Baby
      case 'pregnancy_check_due': return Heart
      case 'low_conception_rate': return TrendingDown
      case 'overdue_breeding': return Clock
      default: return AlertCircle
    }
  }
  
  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800'
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }
  
  const getBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'info': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>Breeding Alerts</span>
          </CardTitle>
          <CardDescription>
            Animals requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Heart className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              No breeding alerts at this time
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Keep up the good work with your breeding program!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>Breeding Alerts</span>
          </div>
          <Badge variant="outline">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
        <CardDescription>
          Animals and situations requiring attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => {
            const Icon = getAlertIcon(alert.type)
            
            return (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${getAlertColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm mt-1 opacity-90">{alert.message}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {alert.count && (
                      <Badge className={getBadgeColor(alert.severity)}>
                        {alert.count}
                      </Badge>
                    )}
                    
                    {onActionClick && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onActionClick(alert.type)}
                        className="text-xs"
                      >
                        View
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}