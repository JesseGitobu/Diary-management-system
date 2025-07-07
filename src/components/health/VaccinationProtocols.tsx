'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, Edit, Trash2, Calendar, Syringe } from 'lucide-react'
import { AddProtocolModal } from '@/components/health/AddProtocolModal'

interface VaccinationProtocolsProps {
  farmId: string
  protocols: any[]
  onProtocolAdded: (protocol: any) => void
}

export function VaccinationProtocols({ farmId, protocols, onProtocolAdded }: VaccinationProtocolsProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  
  const getFrequencyText = (days: number) => {
    if (days === 365) return 'Yearly'
    if (days === 180) return 'Every 6 months'
    if (days === 90) return 'Quarterly'
    if (days === 30) return 'Monthly'
    return `Every ${days} days`
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vaccination Protocols</h2>
          <p className="text-gray-600">Manage vaccination schedules and protocols</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Protocol
        </Button>
      </div>
      
      {protocols.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Syringe className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No vaccination protocols yet
            </h3>
            <p className="text-gray-600 mb-6 text-center">
              Create vaccination protocols to automatically schedule and track vaccinations for your herd.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Protocol
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {protocols.map((protocol) => (
            <Card key={protocol.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{protocol.name}</CardTitle>
                    <CardDescription>{protocol.vaccine_name}</CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {getFrequencyText(protocol.frequency_days)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {protocol.description && (
                    <p className="text-sm text-gray-600">{protocol.description}</p>
                  )}
                  
                  {protocol.age_at_first_dose_days && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      First dose at {protocol.age_at_first_dose_days} days old
                    </div>
                  )}
                  
                  {protocol.booster_schedule?.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <strong>Boosters:</strong> {protocol.booster_schedule.join(', ')} days
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Calendar className="w-4 h-4 mr-1" />
                    Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {showAddModal && (
        <AddProtocolModal
          farmId={farmId}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onProtocolAdded={onProtocolAdded}
        />
      )}
    </div>
  )
}