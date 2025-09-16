// Updated src/components/health/HealthRecordCard.tsx

'use client'

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
  CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'

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
    animals: {
      id: string
      tag_number: string
      name?: string
      breed?: string
    }
    created_at?: string
    updated_at?: string
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

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'low': return '🟢'
      case 'medium': return '🟡'
      case 'high': return '🔴'
      default: return ''
    }
  }

  // Consistent date formatting everywhere
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return format(new Date(dateString), 'MM/dd/yyyy')
  }
  
  const isOverdue = record.next_due_date && new Date(record.next_due_date) < new Date()
  const isDueSoon = record.next_due_date && 
    new Date(record.next_due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
    new Date(record.next_due_date) >= new Date()

  // Determine if follow-up should be shown based on record type
  const shouldShowFollowUp = showFollowUp || ['illness', 'injury', 'treatment'].includes(record.record_type)
  
  return (
    <Card className={`hover:shadow-lg transition-shadow border-l-4 border-l-farm-green ${
      isOverdue ? 'ring-2 ring-red-200' : ''
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
                <Badge variant="outline" className={`${getSeverityColor(record.severity)}`}>
                  {getSeverityIcon(record.severity)} {record.severity.toUpperCase()}
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Overdue
                </Badge>
              )}
              {isDueSoon && !isOverdue && (
                <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                  <Clock className="w-3 h-3 mr-1" />
                  Due Soon
                </Badge>
              )}
            </div>
          </div>
          
          {canEdit && (
            <div className="flex space-x-1">
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
            </div>
          )}
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
        
        {/* Record Details */}
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1">Description:</p>
          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{record.description}</p>
        </div>
        
        {/* Medication (for treatments) */}
        {record.medication && (
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">Medication:</p>
            <p className="text-sm text-gray-700">{record.medication}</p>
          </div>
        )}
        
        {/* Date and Veterinarian */}
        <div className="flex items-center justify-between text-sm">
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
        </div>
        
        {/* Cost */}
        {record.cost && record.cost > 0 && (
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <DollarSign className="w-4 h-4" />
            <span>${record.cost.toFixed(2)}</span>
          </div>
        )}
        
        {/* Next Due Date */}
        {record.next_due_date && (
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
        
        {/* Notes */}
        {record.notes && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-gray-900 mb-1">Notes:</p>
            <p className="text-xs text-gray-600 italic">{record.notes}</p>
          </div>
        )}

        {/* Action Buttons for Follow-up */}
        {canEdit && shouldShowFollowUp && onFollowUp && (
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
              
              <div className="text-xs text-gray-500">
                Track recovery progress
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        {(record.created_at || record.updated_at) && (
          <div className="text-xs text-gray-400 pt-2 border-t">
            <div className="flex items-center justify-between">
              {record.created_at && (
                <span>
                  Created: {formatDate(record.created_at)}
                </span>
              )}
              {record.updated_at && record.updated_at !== record.created_at && (
                <span>
                  Updated: {formatDate(record.updated_at)}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}