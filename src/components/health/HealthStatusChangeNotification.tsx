import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  X
} from 'lucide-react'

interface HealthStatusChange {
  id: string
  animalId: string
  animalName: string
  animalTagNumber: string
  oldStatus: string | null
  newStatus: string
  changedAt: string
  triggerSource: string
  recordId?: string
}

interface HealthStatusNotificationProps {
  farmId: string
  onNotificationAction?: (animalId: string, action: 'view' | 'dismiss') => void
}

export function HealthStatusNotification({ 
  farmId, 
  onNotificationAction 
}: HealthStatusNotificationProps) {
  const [notifications, setNotifications] = useState<HealthStatusChange[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    fetchRecentHealthStatusChanges()
    
    // Set up polling for new changes
    const interval = setInterval(fetchRecentHealthStatusChanges, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [farmId])

  const fetchRecentHealthStatusChanges = async () => {
    try {
      const response = await fetch(`/api/health/status-changes?farmId=${farmId}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        const newChanges = data.changes || []
        
        // Check for new notifications
        const existingIds = notifications.map(n => n.id)
        const reallyNewChanges = newChanges.filter((change: HealthStatusChange) => 
          !existingIds.includes(change.id)
        )
        
        if (reallyNewChanges.length > 0) {
          // Show toast for urgent status changes
          reallyNewChanges.forEach((change: HealthStatusChange) => {
            if (['sick', 'quarantined'].includes(change.newStatus)) {
              toast.error(
                `${change.animalName} (${change.animalTagNumber}) status changed to ${change.newStatus}`,
                {
                  duration: 6000,
                  icon: <AlertTriangle className="w-4 h-4 text-red-600" />
                }
              )
            } else if (change.newStatus === 'healthy' && change.oldStatus !== 'healthy') {
              toast.success(
                `${change.animalName} (${change.animalTagNumber}) recovered to healthy status`,
                {
                  duration: 4000,
                  icon: <CheckCircle className="w-4 h-4 text-green-600" />
                }
              )
            }
          })
        }
        
        setNotifications(newChanges)
      }
    } catch (error) {
      console.error('Error fetching health status changes:', error)
    }
  }

  const handleDismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  const handleViewAnimal = (animalId: string) => {
    onNotificationAction?.(animalId, 'view')
  }

  const getStatusChangeIcon = (oldStatus: string | null, newStatus: string) => {
    if (!oldStatus) return <Bell className="w-4 h-4" />
    
    const oldSeverity = getStatusSeverity(oldStatus)
    const newSeverity = getStatusSeverity(newStatus)
    
    if (newSeverity > oldSeverity) {
      return <TrendingDown className="w-4 h-4 text-red-600" />
    } else if (newSeverity < oldSeverity) {
      return <TrendingUp className="w-4 h-4 text-green-600" />
    } else {
      return <Bell className="w-4 h-4" />
    }
  }

  const getStatusSeverity = (status: string): number => {
    switch (status.toLowerCase()) {
      case 'healthy': return 0
      case 'requires_attention': return 1
      case 'under_treatment': return 2
      case 'recovering': return 2
      case 'sick': return 3
      case 'quarantined': return 4
      default: return 1
    }
  }

  if (notifications.length === 0) return null

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="w-4 h-4" />
        {notifications.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </Button>

      {/* Notifications Panel */}
      {showNotifications && (
        <Card className="absolute right-0 top-12 w-96 max-h-96 overflow-y-auto z-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Health Status Changes</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className="p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2">
                      {getStatusChangeIcon(notification.oldStatus, notification.newStatus)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {notification.animalName} (#{notification.animalTagNumber})
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          {notification.oldStatus && (
                            <>
                              <Badge variant="outline" className="text-xs">
                                {notification.oldStatus.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-gray-400">→</span>
                            </>
                          )}
                          <Badge className="text-xs">
                            {notification.newStatus.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.changedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewAnimal(notification.animalId)}
                        className="text-xs"
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismissNotification(notification.id)}
                        className="text-xs text-gray-400"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}