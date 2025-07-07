'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar, Phone, Mail, Plus, Clock, AlertCircle } from 'lucide-react'
import { ScheduleVisitModal } from '@/components/health/ScheduleVisitModal'

interface VeterinaryScheduleProps {
  farmId: string
  visits: any[]
  veterinarians: any[]
  upcomingVisits: any[]
  followUpVisits: any[]
  onVisitScheduled: (visit: any) => void
}

export function VeterinarySchedule({ 
  farmId, 
  visits, 
  veterinarians, 
  upcomingVisits, 
  followUpVisits, 
  onVisitScheduled 
}: VeterinaryScheduleProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  
  const getVisitTypeColor = (type: string) => {
    switch (type) {
      case 'emergency': return 'bg-red-100 text-red-800'
      case 'routine': return 'bg-blue-100 text-blue-800'
      case 'vaccination': return 'bg-green-100 text-green-800'
      case 'treatment': return 'bg-yellow-100 text-yellow-800'
      case 'consultation': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Veterinary Schedule</h2>
          <p className="text-gray-600">Manage veterinary visits and appointments</p>
        </div>
        <Button onClick={() => setShowScheduleModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Visit
        </Button>
      </div>
      
      {/* Alerts and Upcoming */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Follow-up Needed */}
        {followUpVisits.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-800">
                <AlertCircle className="mr-2 h-5 w-5" />
                Follow-ups Needed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {followUpVisits.slice(0, 3).map((visit) => (
                  <div key={visit.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {visit.veterinarian?.name || 'Unknown Vet'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Due: {new Date(visit.follow_up_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm">
                      Schedule
                    </Button>
                  </div>
                ))}
                {followUpVisits.length > 3 && (
                  <p className="text-sm text-gray-600">
                    +{followUpVisits.length - 3} more follow-ups needed
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Upcoming Visits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Upcoming Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingVisits.length === 0 ? (
              <p className="text-gray-600">No upcoming visits scheduled</p>
            ) : (
              <div className="space-y-3">
                {upcomingVisits.slice(0, 3).map((visit) => (
                  <div key={visit.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {visit.veterinarian?.name || 'TBD'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(visit.visit_date).toLocaleDateString()} • {visit.visit_type}
                      </p>
                    </div>
                    <Badge className={getVisitTypeColor(visit.visit_type)}>
                      {visit.visit_type}
                    </Badge>
                  </div>
                ))}
                {upcomingVisits.length > 3 && (
                  <p className="text-sm text-gray-600">
                    +{upcomingVisits.length - 3} more upcoming
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Visit History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Visits</CardTitle>
          <CardDescription>
            History of veterinary visits and treatments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No veterinary visits recorded
              </h3>
              <p className="text-gray-600 mb-6">
                Track veterinary visits to maintain comprehensive health records.
              </p>
              <Button onClick={() => setShowScheduleModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Record First Visit
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {visits.slice(0, 10).map((visit) => (
                <div key={visit.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {visit.veterinarian?.name || 'Unknown Veterinarian'}
                        </h4>
                        <Badge className={getVisitTypeColor(visit.visit_type)}>
                          {visit.visit_type}
                        </Badge>
                        {visit.follow_up_required && (
                          <Badge variant="outline">
                            <Clock className="w-3 h-3 mr-1" />
                            Follow-up needed
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(visit.visit_date).toLocaleDateString()}
                        </div>
                        {visit.animals_treated?.length > 0 && (
                          <div>
                            Animals treated: {visit.animals_treated.length}
                          </div>
                        )}
                        {visit.total_cost && (
                          <div>
                            Cost: ${visit.total_cost.toFixed(2)}
                          </div>
                        )}
                      </div>
                      
                      {visit.purpose && (
                        <p className="mt-2 text-sm text-gray-700">{visit.purpose}</p>
                      )}
                      
                      {visit.veterinarian && (
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          {visit.veterinarian.practice_name && (
                            <span>{visit.veterinarian.practice_name}</span>
                          )}
                          {visit.veterinarian.phone && (
                            <div className="flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {visit.veterinarian.phone}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {showScheduleModal && (
        <ScheduleVisitModal
          farmId={farmId}
          veterinarians={veterinarians}
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onVisitScheduled={onVisitScheduled}
        />
      )}
    </div>
  )
}