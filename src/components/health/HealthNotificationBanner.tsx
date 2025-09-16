import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, FileText, Clock, X, ExternalLink } from 'lucide-react'

interface IncompleteHealthRecord {
  id: string
  animal_id: string
  record_date: string
  record_type: string
  description: string
  severity: string
  created_at: string
  animal: {
    id: string
    tag_number: string
    name?: string
    breed?: string
  }
}

interface HealthNotificationBannerProps {
  farmId: string
  onRecordClick?: (recordId: string) => void
  className?: string
}

export default function HealthNotificationBanner({
  farmId,
  onRecordClick,
  className = ''
}: HealthNotificationBannerProps) {
  const [incompleteRecords, setIncompleteRecords] = useState<IncompleteHealthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(new Set<string>())

  useEffect(() => {
    fetchIncompleteRecords()
  }, [farmId])

  const fetchIncompleteRecords = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/health/records/incomplete?farmId=${farmId}`)
      
      if (response.ok) {
        const data = await response.json()
        setIncompleteRecords(data.records || [])
      }
    } catch (error) {
      console.error('Error fetching incomplete health records:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = (recordId: string) => {
    setDismissed(prev => new Set([...prev, recordId]))
  }

  const handleViewRecord = (recordId: string) => {
    if (onRecordClick) {
      onRecordClick(recordId)
    } else {
      // Default: navigate to health management page
      window.location.href = `/health?record=${recordId}`
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'illness': return '🤒'
      case 'checkup': return '🩺'
      case 'treatment': return '💊'
      default: return '📋'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }

  // Filter out dismissed records
  const visibleRecords = incompleteRecords.filter(record => !dismissed.has(record.id))

  if (loading || visibleRecords.length === 0) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {visibleRecords.map((record) => (
        <Card key={record.id} className="border-l-4 border-l-orange-500 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      Health Record Needs Completion
                    </h3>
                    <Badge className={getSeverityColor(record.severity)}>
                      {record.severity?.toUpperCase()} Priority
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center space-x-1">
                      <span className="text-base">{getRecordTypeIcon(record.record_type)}</span>
                      <span className="font-medium">
                        {record.animal.name || `Animal ${record.animal.tag_number}`}
                      </span>
                      <span className="text-gray-400">#{record.animal.tag_number}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(record.created_at)}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                    {record.description}
                  </p>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-orange-700">
                      Add symptoms, treatment details, and follow-up information to complete this record.
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismiss(record.id)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewRecord(record.id)}
                        className="text-orange-600 border-orange-300 hover:bg-orange-50 flex items-center space-x-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Complete Record</span>
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Summary when multiple records */}
      {visibleRecords.length > 1 && (
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {visibleRecords.length} incomplete health records requiring attention
          </p>
        </div>
      )}
    </div>
  )
}