// =============================================================================
// OutbreakCard.tsx
// =============================================================================
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  AlertTriangle, 
  Calendar, 
  Users, 
  Shield,
  Edit, 
  Trash2,
  MapPin,
  Stethoscope
} from 'lucide-react'

interface OutbreakCardProps {
  outbreak: any
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}

export function OutbreakCard({ outbreak, onEdit, onDelete, canEdit }: OutbreakCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800'
      case 'contained': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>{outbreak.outbreak_name}</span>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">{outbreak.disease_type}</p>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className={getSeverityColor(outbreak.severity_level)}>
                {outbreak.severity_level?.toUpperCase()}
              </Badge>
              <Badge className={getStatusColor(outbreak.status)}>
                {outbreak.status?.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          {canEdit && (
            <div className="flex space-x-1">
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 line-clamp-2">
          {outbreak.description}
        </p>
        
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Detected: {new Date(outbreak.first_detected_date).toLocaleDateString()}</span>
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
        </div>
        
        {outbreak.symptoms && (
          <div className="text-sm">
            <span className="font-medium">Symptoms: </span>
            <span className="text-gray-600 line-clamp-2">{outbreak.symptoms}</span>
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          Reported: {new Date(outbreak.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )
}
