'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, Plus, Eye, Users, Calendar } from 'lucide-react'
import { CreateOutbreakModal } from '@/components/health/CreateOutbreakModal'

interface DiseaseOutbreaksProps {
  farmId: string
  outbreaks: any[]
  diseases: any[]
  onOutbreakCreated: (outbreak: any) => void
}

export function DiseaseOutbreaks({ farmId, outbreaks, diseases, onOutbreakCreated }: DiseaseOutbreaksProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800'
      case 'contained': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getSeverityColor = (isContagious: boolean, status: string) => {
    if (status === 'resolved') return 'text-green-600'
    return isContagious ? 'text-red-600' : 'text-yellow-600'
  }
  
  const activeOutbreaks = outbreaks.filter(o => o.status === 'active')
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Disease Management</h2>
          <p className="text-gray-600">Track and manage disease outbreaks</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Report Outbreak
        </Button>
      </div>
      
      {/* Active Alerts */}
      {activeOutbreaks.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Active Disease Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeOutbreaks.map((outbreak) => (
                <div key={outbreak.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className={`h-5 w-5 ${getSeverityColor(outbreak.disease.is_contagious, outbreak.status)}`} />
                    <div>
                      <h4 className="font-medium text-gray-900">{outbreak.disease.name}</h4>
                      <p className="text-sm text-gray-600">
                        {outbreak.total_affected || 0} affected • Started {new Date(outbreak.outbreak_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Outbreak History */}
      <Card>
        <CardHeader>
          <CardTitle>Outbreak History</CardTitle>
          <CardDescription>
            All disease outbreaks and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {outbreaks.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No disease outbreaks recorded
              </h3>
              <p className="text-gray-600 mb-6">
                Track disease outbreaks to monitor herd health and prevent spread.
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Report First Outbreak
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {outbreaks.map((outbreak) => (
                <div key={outbreak.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{outbreak.disease.name}</h4>
                        <Badge className={getStatusColor(outbreak.status)}>
                          {outbreak.status}
                        </Badge>
                        {outbreak.disease.is_contagious && (
                          <Badge variant="destructive">Contagious</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          Started: {new Date(outbreak.outbreak_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          Affected: {outbreak.total_affected || 0} animals
                        </div>
                        {outbreak.quarantine_area && (
                          <div>
                            Quarantine: {outbreak.quarantine_area}
                          </div>
                        )}
                      </div>
                      
                      {outbreak.notes && (
                        <p className="mt-2 text-sm text-gray-600">{outbreak.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                      {outbreak.status === 'active' && (
                        <Button size="sm">
                          Manage
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {showCreateModal && (
        <CreateOutbreakModal
          farmId={farmId}
          diseases={diseases}
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onOutbreakCreated={onOutbreakCreated}
        />
      )}
    </div>
  )
}