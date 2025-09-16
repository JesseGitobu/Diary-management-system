// Updated OutbreakCard with edit, delete functionality and loading states
// src/components/health/OutbreakCard.tsx

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  AlertTriangle, 
  Calendar, 
  Users, 
  Shield,
  Edit, 
  Trash2,
  MapPin,
  Stethoscope,
  Clock,
  CheckCircle
} from 'lucide-react'

interface OutbreakCardProps {
  outbreak: {
    id: string
    outbreak_name: string
    disease_type: string
    severity_level: 'low' | 'medium' | 'high' | 'critical'
    first_detected_date: string
    description: string
    symptoms: string
    affected_animals: string[]
    quarantine_required: boolean
    quarantine_area?: string
    treatment_protocol?: string
    veterinarian?: string
    estimated_duration?: number
    preventive_measures?: string
    notes?: string
    status: 'active' | 'contained' | 'resolved'
    resolved_date?: string
    created_at: string
    updated_at?: string
  }
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
  isDeleting?: boolean
}

export function OutbreakCard({ 
  outbreak, 
  onEdit, 
  onDelete, 
  canEdit,
  isDeleting = false
}: OutbreakCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800 border-red-200'
      case 'contained': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return '🟢'
      case 'medium': return '🟡'
      case 'high': return '🟠'
      case 'critical': return '🔴'
      default: return '⚪'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🔴'
      case 'contained': return '🟡'
      case 'resolved': return '✅'
      default: return '⚪'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const isResolved = outbreak.status === 'resolved'
  const isActive = outbreak.status === 'active'
  
  return (
    <Card className={`hover:shadow-lg transition-shadow border-l-4 ${
      isActive ? 'border-l-red-500' : 
      isResolved ? 'border-l-green-500' : 'border-l-yellow-500'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center space-x-2">
              <AlertTriangle className={`w-5 h-5 ${
                isActive ? 'text-red-600' : 
                isResolved ? 'text-green-600' : 'text-yellow-600'
              }`} />
              <span>{outbreak.outbreak_name}</span>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1 font-medium">{outbreak.disease_type}</p>
            <div className="flex items-center space-x-2 mt-2 flex-wrap gap-1">
              <Badge className={getSeverityColor(outbreak.severity_level)}>
                {getSeverityIcon(outbreak.severity_level)} {outbreak.severity_level?.toUpperCase()}
              </Badge>
              <Badge className={getStatusColor(outbreak.status)}>
                {getStatusIcon(outbreak.status)} {outbreak.status?.toUpperCase()}
              </Badge>
              {outbreak.quarantine_required && (
                <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                  <Shield className="w-3 h-3 mr-1" />
                  Quarantine
                </Badge>
              )}
            </div>
          </div>
          
          {canEdit && (
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onEdit}
                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDelete}
                disabled={isDeleting}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
        {/* Description */}
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1">Description:</p>
          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded line-clamp-2">
            {outbreak.description}
          </p>
        </div>

        {/* Key Information Grid */}
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Detected: {formatDate(outbreak.first_detected_date)}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{outbreak.affected_animals?.length || 0} animals affected</span>
          </div>
          
          {outbreak.veterinarian && (
            <div className="flex items-center space-x-2">
              <Stethoscope className="w-4 h-4 text-gray-400" />
              <span className="truncate">{outbreak.veterinarian}</span>
            </div>
          )}
          
          {outbreak.quarantine_required && outbreak.quarantine_area && (
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-gray-400" />
              <span>Quarantine: {outbreak.quarantine_area}</span>
            </div>
          )}

          {outbreak.estimated_duration && (
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>Duration: {outbreak.estimated_duration} days</span>
            </div>
          )}

          {isResolved && outbreak.resolved_date && (
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-700">Resolved: {formatDate(outbreak.resolved_date)}</span>
            </div>
          )}
        </div>
        
        {/* Symptoms */}
        {outbreak.symptoms && (
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">Symptoms:</p>
            <p className="text-sm text-gray-600 line-clamp-2">{outbreak.symptoms}</p>
          </div>
        )}

        {/* Treatment Protocol */}
        {outbreak.treatment_protocol && (
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">Treatment:</p>
            <p className="text-sm text-gray-600 line-clamp-2">{outbreak.treatment_protocol}</p>
          </div>
        )}

        {/* Preventive Measures */}
        {outbreak.preventive_measures && (
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">Prevention:</p>
            <p className="text-sm text-gray-600 line-clamp-2">{outbreak.preventive_measures}</p>
          </div>
        )}

        {/* Notes */}
        {outbreak.notes && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-gray-900 mb-1">Notes:</p>
            <p className="text-xs text-gray-600 italic">{outbreak.notes}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="text-xs text-gray-400 pt-2 border-t">
          <div className="flex items-center justify-between">
            <span>
              Reported: {formatDate(outbreak.created_at)}
            </span>
            {outbreak.updated_at && outbreak.updated_at !== outbreak.created_at && 
            (
              <span>
                {/* Updated: {formatDate(outbreak.updated_at)} */}
              </span>
            )
            }
          </div>
        </div>
      </CardContent>
    </Card>
  )
}