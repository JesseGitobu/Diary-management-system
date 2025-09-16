// =============================================================================
// VetVisitCard.tsx - Updated with loading states
// =============================================================================
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  CalendarCheck, 
  Clock, 
  Users, 
  DollarSign,
  Edit, 
  Trash2,
  Stethoscope,
  MapPin,
  Bell,
  CheckCircle
} from 'lucide-react'

interface VetVisitCardProps {
  visit: any
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
  isDeleting?: boolean
}

export function VetVisitCard({ visit, onEdit, onDelete, canEdit, isDeleting = false }: VetVisitCardProps) {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'urgent': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const isUpcoming = new Date(visit.scheduled_datetime) > new Date()
  const isPast = new Date(visit.scheduled_datetime) < new Date()
  
  return (
    <Card className={`hover:shadow-lg transition-shadow border-l-4 ${
      isUpcoming ? 'border-l-blue-500' : 
      isPast ? 'border-l-gray-400' : 'border-l-orange-500'
    } ${isDeleting ? 'opacity-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center space-x-2">
              <CalendarCheck className={`w-5 h-5 ${
                isUpcoming ? 'text-blue-600' : 
                isPast ? 'text-gray-600' : 'text-orange-600'
              }`} />
              <span>{visit.purpose || visit.visit_purpose || 'Veterinary Visit'}</span>
            </CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className={getStatusColor(visit.status)}>
                {visit.status?.toUpperCase() || 'SCHEDULED'}
              </Badge>
              {visit.priority && (
                <Badge className={getPriorityColor(visit.priority)}>
                  {visit.priority?.toUpperCase()}
                </Badge>
              )}
              {visit.priority_level && (
                <Badge className={getPriorityColor(visit.priority_level)}>
                  {visit.priority_level?.toUpperCase()}
                </Badge>
              )}
              {visit.is_emergency && (
                <Badge className="bg-red-100 text-red-800">Emergency</Badge>
              )}
            </div>
          </div>
          
          {canEdit && (
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onEdit}
                disabled={isDeleting}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDelete} 
                className="text-red-600"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>
              {new Date(visit.scheduled_datetime).toLocaleDateString()} at{' '}
              {new Date(visit.scheduled_datetime).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          
          {visit.veterinarian_name && (
            <div className="flex items-center space-x-2">
              <Stethoscope className="w-4 h-4 text-gray-400" />
              <span>{visit.veterinarian_name}</span>
            </div>
          )}
          
          {(visit.location || visit.location_details) && (
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="truncate">{visit.location || visit.location_details}</span>
            </div>
          )}
          
          {visit.animals_involved?.length > 0 && (
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{visit.animals_involved.length} animals involved</span>
            </div>
          )}
          
          {visit.visit_animals?.length > 0 && (
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{visit.visit_animals.length} animals involved</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Duration: </span>
            <span className="text-gray-600">
              {visit.duration_minutes ? `${visit.duration_minutes} mins` : 
               visit.duration_hours ? `${visit.duration_hours} hours` : '60 mins'}
            </span>
          </div>
          
          {(visit.estimated_cost || visit.actual_cost) && (
            <div className="flex items-center space-x-1">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span>
                {visit.status === 'completed' && visit.actual_cost 
                  ? `$${visit.actual_cost}` 
                  : visit.estimated_cost 
                    ? `~$${visit.estimated_cost}` 
                    : 'TBD'}
              </span>
            </div>
          )}
        </div>
        
        {visit.services_needed && visit.services_needed.length > 0 && (
          <div className="text-sm">
            <span className="font-medium">Services: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {visit.services_needed.slice(0, 3).map((service: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {service}
                </Badge>
              ))}
              {visit.services_needed.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{visit.services_needed.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {visit.send_reminder && visit.reminder_days_before && (
          <div className="flex items-center space-x-2 text-sm text-blue-600">
            <Bell className="w-4 h-4" />
            <span>Reminder: {visit.reminder_days_before} days before</span>
          </div>
        )}
        
        {(visit.notes || visit.special_instructions) && (
          <div className="text-sm">
            <span className="font-medium">Notes: </span>
            <span className="text-gray-600 line-clamp-2">
              {visit.notes || visit.special_instructions}
            </span>
          </div>
        )}
        
        {visit.status === 'completed' && visit.completion_notes && (
          <div className="p-2 bg-green-50 rounded-md">
            <div className="flex items-start space-x-2 text-sm text-green-800">
              <CheckCircle className="w-4 h-4 mt-0.5" />
              <div>
                <span className="font-medium">Completed: </span>
                <span>{visit.completion_notes}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          Scheduled: {new Date(visit.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )
}