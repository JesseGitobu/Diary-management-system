// Health Timeline Component for Individual Animals
// src/components/health/HealthTimeline.tsx

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Calendar, DollarSign, User, Clock, AlertTriangle } from 'lucide-react'

interface HealthTimelineProps {
  records: Array<{
    id: string
    record_date: string
    record_type: string
    description: string
    veterinarian?: string
    cost?: number
    notes?: string
    next_due_date?: string
    medication?: string
    severity?: string
  }>
}

export function HealthTimeline({ records }: HealthTimelineProps) {
  const sortedRecords = records.sort((a, b) => 
    new Date(b.record_date).getTime() - new Date(a.record_date).getTime()
  )
  
  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'vaccination': return '💉'
      case 'treatment': return '💊'
      case 'checkup': return '🩺'
      case 'injury': return '🩹'
      case 'illness': return '🤒'
      default: return '📋'
    }
  }
  
  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case 'vaccination': return 'bg-green-100 text-green-800'
      case 'treatment': return 'bg-blue-100 text-blue-800'
      case 'checkup': return 'bg-purple-100 text-purple-800'
      case 'injury': return 'bg-red-100 text-red-800'
      case 'illness': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Health Timeline</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No health records yet</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            <div className="space-y-6">
              {sortedRecords.map((record, index) => (
                <div key={record.id} className="relative flex items-start space-x-4">
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 w-12 h-12 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-lg relative z-10">
                    {getRecordTypeIcon(record.record_type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getRecordTypeColor(record.record_type)}>
                            {record.record_type.charAt(0).toUpperCase() + record.record_type.slice(1)}
                          </Badge>
                          {record.severity && (
                            <Badge variant="outline" className={
                              record.severity === 'high' ? 'border-red-300 text-red-700' :
                              record.severity === 'medium' ? 'border-yellow-300 text-yellow-700' :
                              'border-green-300 text-green-700'
                            }>
                              {record.severity.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(record.record_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className="text-gray-900 mb-3">{record.description}</p>
                      
                      {record.medication && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700">Medication: </span>
                          <span className="text-sm text-gray-600">{record.medication}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          {record.veterinarian && (
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{record.veterinarian}</span>
                            </div>
                          )}
                          
                          {record.cost && record.cost > 0 && (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-4 h-4" />
                              <span>${record.cost.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                        
                        {record.next_due_date && (
                          <div className={`flex items-center space-x-1 ${
                            new Date(record.next_due_date) < new Date() 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            <Clock className="w-4 h-4" />
                            <span>
                              Next: {new Date(record.next_due_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {record.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-600 italic">{record.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}