'use client'

import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useBreedingEvents } from '@/lib/hooks/useBreedingEvents'
import { 
  Heart, 
  Syringe, 
  Stethoscope, 
  Baby, 
  Calendar,
  FileText,
  AlertCircle 
} from 'lucide-react'

interface BreedingEventTimelineProps {
  animalId?: string | null
  animalGender: string
  className?: string
}

const eventConfig = {
  heat_detection: {
    icon: Heart,
    color: 'bg-pink-100 text-pink-800',
    title: 'Heat Detection'
  },
  insemination: {
    icon: Syringe,
    color: 'bg-blue-100 text-blue-800',
    title: 'Insemination'
  },
  pregnancy_check: {
    icon: Stethoscope,
    color: 'bg-green-100 text-green-800',
    title: 'Pregnancy Check'
  },
  calving: {
    icon: Baby,
    color: 'bg-yellow-100 text-yellow-800',
    title: 'Calving Event'
  }
}

export function BreedingEventTimeline({ 
  animalId, 
  animalGender,
  className 
}: BreedingEventTimelineProps) {
  const { events, loading, error } = useBreedingEvents(animalId ?? null)

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <p>Failed to load breeding events: {error}</p>
      </div>
    )
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }
  
  if (animalGender !== 'female') {
    return (
      <div className="text-center py-8 text-gray-500">
        <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p>Breeding events are only tracked for female animals</p>
      </div>
    )
  }
  
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No breeding events recorded</h3>
        <p>Start by recording heat detection or insemination events</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const config = eventConfig[event.event_type as keyof typeof eventConfig]
        const Icon = config.icon
        
        return (
          <Card key={event.id} className="relative">
            {index !== events.length - 1 && (
              <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gray-200" />
            )}
            
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${config.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{config.title}</h4>
                    <Badge className={config.color}>
                      {new Date(event.event_date).toLocaleDateString()}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    {/* Event-specific details */}
                    {event.event_type === 'heat_detection' && (
                      <>
                        {event.heat_signs && event.heat_signs.length > 0 && (
                          <p><strong>Signs observed:</strong> {event.heat_signs.join(', ')}</p>
                        )}
                        {event.heat_action_taken && (
                          <p><strong>Action taken:</strong> {event.heat_action_taken}</p>
                        )}
                      </>
                    )}
                    
                    {event.event_type === 'insemination' && (
                      <>
                        <p><strong>Method:</strong> {event.insemination_method?.replace('_', ' ')}</p>
                        {event.semen_bull_code && (
                          <p><strong>Semen/Bull code:</strong> {event.semen_bull_code}</p>
                        )}
                        {event.technician_name && (
                          <p><strong>Technician:</strong> {event.technician_name}</p>
                        )}
                      </>
                    )}
                    
                    {event.event_type === 'pregnancy_check' && (
                      <>
                        <p><strong>Result:</strong> 
                          <Badge className={
                            event.pregnancy_result === 'pregnant' ? 'bg-green-100 text-green-800 ml-2' :
                            event.pregnancy_result === 'not_pregnant' ? 'bg-red-100 text-red-800 ml-2' :
                            'bg-yellow-100 text-yellow-800 ml-2'
                          }>
                            {event.pregnancy_result?.replace('_', ' ')}
                          </Badge>
                        </p>
                        {event.examination_method && (
                          <p><strong>Method:</strong> {event.examination_method}</p>
                        )}
                        {event.veterinarian_name && (
                          <p><strong>Veterinarian:</strong> {event.veterinarian_name}</p>
                        )}
                        {event.estimated_due_date && (
                          <p><strong>Due date:</strong> {new Date(event.estimated_due_date).toLocaleDateString()}</p>
                        )}
                      </>
                    )}
                    
                    {event.event_type === 'calving' && (
                      <>
                        <p><strong>Outcome:</strong> {event.calving_outcome?.replace('_', ' ')}</p>
                        {event.calf_gender && (
                          <p><strong>Calf:</strong> {event.calf_gender} 
                            {event.calf_tag_number && ` (Tag: ${event.calf_tag_number})`}
                            {event.calf_weight && ` - ${event.calf_weight}kg`}
                          </p>
                        )}
                        {event.calf_health_status && (
                          <p><strong>Calf health:</strong> {event.calf_health_status}</p>
                        )}
                      </>
                    )}
                    
                    {event.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <div className="flex items-start space-x-1">
                          <FileText className="w-3 h-3 mt-0.5" />
                          <span>{event.notes}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}