// Updated HealthRecordCard with expandable follow-ups
// src/components/health/HealthRecordCard.tsx

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Calendar, 
  DollarSign, 
  Edit, 
  Trash2, 
  User, 
  Clock,
  AlertTriangle,
  Activity,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  FileText,
  TrendingUp,
  Award
} from 'lucide-react'
import { format } from 'date-fns'

interface FollowUpRecord {
  id: string
  record_date: string
  description: string
  veterinarian?: string
  cost?: number
  notes?: string
  medication?: string
  follow_up_status: 'improving' | 'stable' | 'worsening' | 'recovered' | 'requires_attention'
  treatment_effectiveness?: 'very_effective' | 'effective' | 'somewhat_effective' | 'not_effective'
  is_resolved: boolean
  created_at: string
}

interface HealthRecordCardProps {
  record: {
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
    is_resolved?: boolean
    resolved_date?: string
    animals: {
      id: string
      tag_number: string
      name?: string
      breed?: string
    }
    created_at?: string
    updated_at?: string
    // Follow-up records embedded within the main record
    follow_ups?: FollowUpRecord[]
  }
  onEdit: (recordId: string) => void
  onDelete: (recordId: string) => void
  onFollowUp?: (record: any) => void
  canEdit: boolean
  isMobile?: boolean
  isDeleting?: boolean
  showFollowUp?: boolean
}

export function HealthRecordCard({ 
  record, 
  onEdit, 
  onDelete, 
  onFollowUp,
  canEdit,
  isMobile = false,
  isDeleting = false,
  showFollowUp = false
}: HealthRecordCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>(record.follow_ups || [])
  const [loadingFollowUps, setLoadingFollowUps] = useState(false)

  // Load follow-ups when expanded for the first time
  useEffect(() => {
    if (expanded && (!record.follow_ups || record.follow_ups.length === 0)) {
      loadFollowUps()
    }
  }, [expanded, record.id])

  const loadFollowUps = async () => {
    setLoadingFollowUps(true)
    try {
      const response = await fetch(`/api/health/records/${record.id}/follow-ups`)
      if (response.ok) {
        const data = await response.json()
        setFollowUps(data.followUps || [])
      }
    } catch (error) {
      console.error('Error loading follow-ups:', error)
    } finally {
      setLoadingFollowUps(false)
    }
  }

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
      case 'vaccination': return 'bg-green-100 text-green-800 border-green-200'
      case 'treatment': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'checkup': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'injury': return 'bg-red-100 text-red-800 border-red-200'
      case 'illness': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'improving': return '📈'
      case 'stable': return '➡️'
      case 'worsening': return '📉'
      case 'recovered': return '✅'
      case 'requires_attention': return '⚠️'
      default: return '📋'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'improving': return 'text-green-600 bg-green-50'
      case 'stable': return 'text-blue-600 bg-blue-50'
      case 'worsening': return 'text-red-600 bg-red-50'
      case 'recovered': return 'text-green-800 bg-green-100'
      case 'requires_attention': return 'text-orange-600 bg-orange-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getEffectivenessIcon = (effectiveness?: string) => {
    switch (effectiveness) {
      case 'very_effective': return '🌟'
      case 'effective': return '✅'
      case 'somewhat_effective': return '⚡'
      case 'not_effective': return '❌'
      default: return ''
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return format(new Date(dateString), 'MM/dd/yyyy')
  }
  
  const isOverdue = record.next_due_date && new Date(record.next_due_date) < new Date()
  const isDueSoon = record.next_due_date && 
    new Date(record.next_due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
    new Date(record.next_due_date) >= new Date()

  const shouldShowFollowUp = showFollowUp || ['illness', 'injury', 'treatment', 'checkup'].includes(record.record_type);
  const hasFollowUps = followUps.length > 0
  const isResolved = record.is_resolved || followUps.some(f => f.is_resolved)
  
  return (
    <Card className={`hover:shadow-lg transition-all border-l-4 ${
      isResolved 
        ? 'border-l-green-500' 
        : isOverdue 
          ? 'border-l-red-500 ring-2 ring-red-200' 
          : 'border-l-farm-green'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getRecordTypeIcon(record.record_type)}</span>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getRecordTypeColor(record.record_type)}>
                {record.record_type.charAt(0).toUpperCase() + record.record_type.slice(1)}
              </Badge>
              
              {record.severity && (
                <Badge variant="outline" className={getSeverityColor(record.severity)}>
                  {record.severity.toUpperCase()}
                </Badge>
              )}
              
              {isResolved && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Resolved
                </Badge>
              )}
              
              {hasFollowUps && (
                <Badge variant="outline" className="text-xs">
                  <Activity className="w-3 h-3 mr-1" />
                  {followUps.length} Follow-up{followUps.length !== 1 ? 's' : ''}
                </Badge>
              )}
              
              {isOverdue && !isResolved && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Overdue
                </Badge>
              )}
              
              {isDueSoon && !isOverdue && !isResolved && (
                <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                  <Clock className="w-3 h-3 mr-1" />
                  Due Soon
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Expand/Collapse Button */}
            {(shouldShowFollowUp || hasFollowUps) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            
            {canEdit && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(record.id)}
                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(record.id)}
                  disabled={isDeleting}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {isDeleting ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Animal Information */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium text-gray-900">
            {record.animals.name || `Animal ${record.animals.tag_number}`}
          </h4>
          <p className="text-sm text-gray-600">
            Tag: {record.animals.tag_number} • {record.animals.breed}
          </p>
        </div>
        
        {/* Original Record Details */}
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1">Description:</p>
          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{record.description}</p>
        </div>
        
        {/* Medication */}
        {record.medication && (
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">Medication:</p>
            <p className="text-sm text-gray-700">{record.medication}</p>
          </div>
        )}
        
        {/* Date, Veterinarian, and Cost Row */}
        <div className="flex items-center justify-between text-sm flex-wrap gap-2">
          <div className="flex items-center space-x-1 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(record.record_date)}</span>
          </div>
          
          {record.veterinarian && (
            <div className="flex items-center space-x-1 text-gray-600">
              <User className="w-4 h-4" />
              <span className="truncate max-w-[120px]">{record.veterinarian}</span>
            </div>
          )}

          {record.cost && record.cost > 0 && (
            <div className="flex items-center space-x-1 text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span>${record.cost.toFixed(2)}</span>
            </div>
          )}
        </div>
        
        {/* Next Due Date */}
        {record.next_due_date && !isResolved && (
          <div className={`flex items-center space-x-1 text-sm p-2 rounded ${
            isOverdue 
              ? 'bg-red-50 text-red-700' 
              : isDueSoon 
                ? 'bg-yellow-50 text-yellow-700'
                : 'bg-green-50 text-green-700'
          }`}>
            {isOverdue ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span>
              {isOverdue ? 'Overdue: ' : 'Next due: '}
              {formatDate(record.next_due_date)}
            </span>
          </div>
        )}

        {/* Resolution Status */}
        {isResolved && record.resolved_date && (
          <div className="flex items-center space-x-1 text-sm p-2 rounded bg-green-50 text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span>Resolved on {formatDate(record.resolved_date)}</span>
          </div>
        )}
        
        {/* Original Notes */}
        {record.notes && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-gray-900 mb-1">Notes:</p>
            <p className="text-xs text-gray-600 whitespace-pre-wrap">{record.notes}</p>
          </div>
        )}

        {/* Expanded Follow-ups Section */}
        {expanded && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-farm-green" />
                <span>Follow-up History</span>
                {loadingFollowUps && <LoadingSpinner size="sm" />}
              </h4>
              
              {canEdit && shouldShowFollowUp && !isResolved && onFollowUp && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onFollowUp(record)}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Activity className="w-3 h-3 mr-1" />
                  Add Follow-up
                </Button>
              )}
            </div>

            {followUps.length === 0 && !loadingFollowUps ? (
              <div className="text-center py-6 text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No follow-ups recorded yet</p>
                {canEdit && shouldShowFollowUp && onFollowUp && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onFollowUp(record)}
                    className="mt-2 text-green-600 hover:text-green-700"
                  >
                    Add First Follow-up
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {followUps.map((followUp, index) => (
                  <div 
                    key={followUp.id} 
                    className={`p-3 rounded-lg border-l-2 ${
                      followUp.is_resolved 
                        ? 'border-l-green-400 bg-green-50' 
                        : 'border-l-blue-400 bg-blue-50'
                    }`}
                  >
                    {/* Follow-up Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          Follow-up #{followUps.length - index}
                        </span>
                        <Badge className={`text-xs ${getStatusColor(followUp.follow_up_status)}`}>
                          {getStatusIcon(followUp.follow_up_status)} {followUp.follow_up_status.replace('_', ' ')}
                        </Badge>
                        {followUp.is_resolved && (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(followUp.record_date)}</span>
                    </div>

                    {/* Follow-up Content */}
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700">{followUp.description}</p>
                      
                      {/* Treatment Effectiveness */}
                      {followUp.treatment_effectiveness && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-600">Treatment:</span>
                          <Badge variant="outline" className="text-xs">
                            {getEffectivenessIcon(followUp.treatment_effectiveness)} 
                            {followUp.treatment_effectiveness.replace('_', ' ')}
                          </Badge>
                        </div>
                      )}

                      {/* Medication Changes */}
                      {followUp.medication && (
                        <div>
                          <span className="text-xs font-medium text-gray-600">Medication: </span>
                          <span className="text-xs text-gray-700">{followUp.medication}</span>
                        </div>
                      )}

                      {/* Veterinarian and Cost */}
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        {followUp.veterinarian && (
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{followUp.veterinarian}</span>
                          </div>
                        )}
                        {followUp.cost && followUp.cost > 0 && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3" />
                            <span>${followUp.cost.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {/* Follow-up Notes */}
                      {followUp.notes && (
                        <div className="pt-1 border-t border-gray-200">
                          <p className="text-xs text-gray-600 whitespace-pre-wrap">{followUp.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Follow-up Button (when collapsed) */}
        {!expanded && canEdit && shouldShowFollowUp && !isResolved && onFollowUp && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onFollowUp(record)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 flex items-center space-x-1"
              >
                <Activity className="w-3 h-3" />
                <span>Add Follow-up</span>
              </Button>
              
              {hasFollowUps && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setExpanded(true)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  View {followUps.length} follow-up{followUps.length !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        {(record.created_at || record.updated_at) && (
          <div className="text-xs text-gray-400 pt-2 border-t">
            <div className="flex items-center justify-between">
              {record.created_at && (
                <span>Created: {formatDate(record.created_at)}</span>
              )}
              {record.updated_at && record.updated_at !== record.created_at && (
                <span>Updated: {formatDate(record.updated_at)}</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}