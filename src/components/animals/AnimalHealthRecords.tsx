'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AddHealthRecordModal } from '@/components/animals/AddHealthRecordModal'
import { 
  Plus, 
  Calendar, 
  User, 
  DollarSign,
  FileText,
  Heart,
  Shield,
  Stethoscope,
  AlertTriangle
} from 'lucide-react'

interface AnimalHealthRecordsProps {
  animalId: string
  canAddRecords: boolean
}

interface HealthRecord {
  id: string
  record_date: string
  record_type: string
  description: string
  veterinarian?: string
  cost?: number
  notes?: string
  created_at: string
}

export function AnimalHealthRecords({ animalId, canAddRecords }: AnimalHealthRecordsProps) {
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  
  useEffect(() => {
    loadHealthRecords()
  }, [animalId])
  
  const loadHealthRecords = async () => {
    try {
      const response = await fetch(`/api/animals/${animalId}/health-records`)
      if (response.ok) {
        const data = await response.json()
        setHealthRecords(data.records || [])
      }
    } catch (error) {
      console.error('Error loading health records:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleRecordAdded = (newRecord: HealthRecord) => {
    setHealthRecords(prev => [newRecord, ...prev])
    setShowAddModal(false)
  }
  
  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'vaccination': return <Shield className="w-4 h-4 text-blue-600" />
      case 'treatment': return <Stethoscope className="w-4 h-4 text-green-600" />
      case 'checkup': return <Heart className="w-4 h-4 text-purple-600" />
      case 'injury': return <AlertTriangle className="w-4 h-4 text-orange-600" />
      case 'illness': return <AlertTriangle className="w-4 h-4 text-red-600" />
      default: return <FileText className="w-4 h-4 text-gray-600" />
    }
  }
  
  const getRecordTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      vaccination: 'bg-blue-100 text-blue-800',
      treatment: 'bg-green-100 text-green-800',
      checkup: 'bg-purple-100 text-purple-800',
      injury: 'bg-orange-100 text-orange-800',
      illness: 'bg-red-100 text-red-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }
  
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Health Records</h3>
          <p className="text-sm text-gray-600">
            Track vaccinations, treatments, and health checkups
          </p>
        </div>
        {canAddRecords && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        )}
      </div>
      
      {/* Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Vaccinations</p>
                <p className="font-medium">
                  {healthRecords.filter(r => r.record_type === 'vaccination').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Stethoscope className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Treatments</p>
                <p className="font-medium">
                  {healthRecords.filter(r => r.record_type === 'treatment').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Checkups</p>
                <p className="font-medium">
                  {healthRecords.filter(r => r.record_type === 'checkup').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="font-medium">
                  ${healthRecords.reduce((sum, r) => sum + (r.cost || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Health Records List */}
      <Card>
        <CardHeader>
          <CardTitle>Health History</CardTitle>
          <CardDescription>
            Chronological record of all health-related events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthRecords.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No health records</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start tracking this animal's health by adding the first record.
              </p>
              {canAddRecords && (
                <Button 
                  onClick={() => setShowAddModal(true)}
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Record
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {healthRecords.map((record) => (
                <div key={record.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0">
                    {getRecordTypeIcon(record.record_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getRecordTypeBadge(record.record_type)}>
                          {record.record_type}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(record.record_date).toLocaleDateString()}
                        </span>
                      </div>
                      {record.cost && (
                        <span className="text-sm font-medium text-gray-900">
                          ${record.cost.toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mb-1">
                      {record.description}
                    </h4>
                    
                    {record.veterinarian && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        Dr. {record.veterinarian}
                      </p>
                    )}
                    
                    {record.notes && (
                      <p className="text-sm text-gray-600 mt-2">
                        {record.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add Record Modal */}
      {showAddModal && (
        <AddHealthRecordModal
          animalId={animalId}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onRecordAdded={handleRecordAdded}
        />
      )}
    </div>
  )
}