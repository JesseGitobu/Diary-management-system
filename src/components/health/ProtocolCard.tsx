// Updated ProtocolCard with loading states and enhanced functionality
// src/components/health/ProtocolCard.tsx

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  BookOpen, 
  Calendar, 
  Users, 
  Edit, 
  Trash2, 
  Play,
  Clock,
  DollarSign,
  User,
  Repeat,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface ProtocolCardProps {
  protocol: {
    id: string
    protocol_name: string
    protocol_type: 'vaccination' | 'treatment' | 'checkup' | 'breeding' | 'nutrition'
    description: string
    frequency_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time'
    frequency_value: number
    start_date: string
    end_date?: string | null
    target_animals: 'all' | 'group' | 'individual'
    animal_groups?: string[] | null
    individual_animals?: string[] | null
    veterinarian?: string | null
    estimated_cost?: number | null
    notes?: string | null
    auto_create_records: boolean
    is_active: boolean
    created_at: string
    updated_at?: string
  }
  onEdit: (protocol: any) => void
  onDelete: (protocolId: string) => void
  canEdit: boolean
  isDeleting?: boolean
}

export function ProtocolCard({ 
  protocol, 
  onEdit, 
  onDelete, 
  canEdit,
  isDeleting = false
}: ProtocolCardProps) {
  
  const getProtocolTypeIcon = (type: string) => {
    switch (type) {
      case 'vaccination': return '💉'
      case 'treatment': return '💊'
      case 'checkup': return '🩺'
      case 'breeding': return '🐄'
      case 'nutrition': return '🌾'
      default: return '📋'
    }
  }
  
  const getProtocolTypeColor = (type: string) => {
    switch (type) {
      case 'vaccination': return 'bg-green-100 text-green-800 border-green-200'
      case 'treatment': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'checkup': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'breeding': return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'nutrition': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  const getFrequencyLabel = (type: string, value: number) => {
    switch (type) {
      case 'daily': return `Every ${value} day${value > 1 ? 's' : ''}`
      case 'weekly': return `Every ${value} week${value > 1 ? 's' : ''}`
      case 'monthly': return `Every ${value} month${value > 1 ? 's' : ''}`
      case 'quarterly': return `Every ${value} quarter${value > 1 ? 's' : ''}`
      case 'yearly': return `Every ${value} year${value > 1 ? 's' : ''}`
      case 'one_time': return 'One time only'
      default: return 'As needed'
    }
  }

  const getTargetAnimalsLabel = (target: string, individualCount?: number) => {
    switch (target) {
      case 'all': return 'All animals'
      case 'individual': return `${individualCount || 0} selected animals`
      case 'group': return 'Animal groups'
      default: return 'Target animals'
    }
  }

  const isExpired = protocol.end_date && new Date(protocol.end_date) < new Date()
  const isUpcoming = new Date(protocol.start_date) > new Date()
  
  return (
    <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center space-x-2 flex-wrap">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span>{protocol.protocol_name}</span>
            </CardTitle>
            <div className="flex items-center space-x-2 mt-2 flex-wrap gap-1">
              <Badge className={getProtocolTypeColor(protocol.protocol_type)}>
                {getProtocolTypeIcon(protocol.protocol_type)} {protocol.protocol_type}
              </Badge>
              
              {protocol.is_active ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500 border-gray-300">
                  Inactive
                </Badge>
              )}
              
              {isExpired && (
                <Badge variant="outline" className="text-red-600 border-red-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Expired
                </Badge>
              )}
              
              {isUpcoming && (
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  <Clock className="w-3 h-3 mr-1" />
                  Upcoming
                </Badge>
              )}
            </div>
          </div>
          
          {canEdit && (
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onEdit(protocol)}
                className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onDelete(protocol.id)}
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
      
      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded line-clamp-2">
          {protocol.description}
        </p>
        
        {/* Schedule Information */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            <Repeat className="w-4 h-4 text-gray-400" />
            <span>{getFrequencyLabel(protocol.frequency_type, protocol.frequency_value)}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>
              Starts: {new Date(protocol.start_date).toLocaleDateString()}
              {protocol.end_date && (
                <span> • Ends: {new Date(protocol.end_date).toLocaleDateString()}</span>
              )}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{getTargetAnimalsLabel(protocol.target_animals, protocol.individual_animals?.length)}</span>
          </div>
        </div>
        
        {/* Additional Details */}
        {protocol.veterinarian && (
          <div className="flex items-center space-x-2 text-sm">
            <User className="w-4 h-4 text-gray-400" />
            <span className="truncate">{protocol.veterinarian}</span>
          </div>
        )}
        
        {protocol.estimated_cost && protocol.estimated_cost > 0 && (
          <div className="flex items-center space-x-2 text-sm">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span>Est. cost: ${protocol.estimated_cost.toFixed(2)} per event</span>
          </div>
        )}
        
        {/* Settings */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            {protocol.auto_create_records && (
              <span className="text-green-600 flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" />
                <span>Auto-records</span>
              </span>
            )}
          </div>
        </div>
        
        {/* Notes */}
        {protocol.notes && (
          <div className="text-sm pt-2 border-t">
            <span className="font-medium text-gray-700">Notes: </span>
            <span className="text-gray-600 italic">{protocol.notes}</span>
          </div>
        )}
        
        {/* Execute Protocol Button */}
        {protocol.is_active && !isExpired && (
          <div className="pt-2">
            <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700" variant="outline">
              <Play className="w-4 h-4 mr-2" />
              Execute Protocol
            </Button>
          </div>
        )}

        {/* Metadata */}
        {(protocol.created_at || protocol.updated_at) && (
          <div className="text-xs text-gray-400 pt-2 border-t">
            <div className="flex items-center justify-between">
              {protocol.created_at && (
                <span>
                  Created: {new Date(protocol.created_at).toLocaleDateString()}
                </span>
              )}
              {protocol.updated_at && protocol.updated_at !== protocol.created_at && (
                <span>
                  Updated: {new Date(protocol.updated_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}