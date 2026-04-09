// src/components/breeding/BreedingAlerts.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AlertCircle, Clock, TrendingDown, Calendar } from 'lucide-react'
import type { BreedingAlert } from '@/lib/database/breeding-stats'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'

interface BreedingAlertsProps {
  alerts: BreedingAlert[]
  onActionClick: (alertType: string, animalId: string) => void
}

export function BreedingAlerts({ alerts, onActionClick }: BreedingAlertsProps) {
  const { isMobile } = useDeviceInfo()

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

  const getAlertLabel = (type: string) => {
    switch (type) {
      case 'calving_due': return 'Calving Due'
      case 'pregnancy_check_due': return 'Pregnancy Check Due'
      case 'low_conception_rate': return 'Low Conception Rate'
      case 'overdue_breeding': return 'Overdue Breeding'
      default: return 'Alert'
    }
  }

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'calving_due': return 'Record'
      case 'pregnancy_check_due': return 'Check'
      case 'low_conception_rate': return 'Review'
      case 'overdue_breeding': return 'Inseminate'
      default: return 'Action'
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
    <Card className="animate-in fade-in slide-in-from-top-4 duration-500">
      <CardHeader className={isMobile ? 'px-4 pt-4 pb-3' : undefined}>
        <CardTitle className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <span>Breeding Alerts</span>
        </CardTitle>
        <CardDescription>
          Important notifications and upcoming tasks
        </CardDescription>
      </CardHeader>
      <CardContent className={isMobile ? 'px-4 pb-4' : undefined}>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${getAlertColor(alert.severity)} transition-all hover:shadow-sm`}
            >
              {isMobile ? (
                /* Mobile: stacked layout */
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{getAlertLabel(alert.type)}</h4>
                        <Badge variant={getBadgeVariant(alert.severity)} className="text-xs">
                          {alert.severity}
                        </Badge>
                        {alert.count && (
                          <Badge variant="outline" className="text-xs">
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
                    className="w-full bg-white hover:bg-white/80"
                  >
                    {getActionLabel(alert.type)}
                  </Button>
                </div>
              ) : (
                /* Desktop: side-by-side layout */
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{getAlertLabel(alert.type)}</h4>
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
                    className="ml-4 bg-white hover:bg-white/80 flex-shrink-0"
                  >
                    {getActionLabel(alert.type)}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}