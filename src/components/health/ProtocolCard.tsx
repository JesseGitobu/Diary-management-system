// =============================================================================
// ProtocolCard.tsx
// =============================================================================
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  BookOpen, 
  Calendar, 
  Users, 
  Edit, 
  Trash2, 
  Play,
  Clock
} from 'lucide-react'

interface ProtocolCardProps {
  protocol: any
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}

export function ProtocolCard({ protocol, onEdit, onDelete, canEdit }: ProtocolCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'vaccination': return 'bg-green-100 text-green-800'
      case 'treatment': return 'bg-blue-100 text-blue-800'
      case 'preventive': return 'bg-purple-100 text-purple-800'
      case 'emergency': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span>{protocol.name}</span>
            </CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className={getCategoryColor(protocol.category)}>
                {protocol.category}
              </Badge>
              {protocol.is_active && (
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              )}
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
          {protocol.description}
        </p>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{protocol.frequency || 'As needed'}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{protocol.target_animals || 'All animals'}</span>
          </div>
        </div>
        
        {protocol.estimated_duration && (
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{protocol.estimated_duration} minutes</span>
          </div>
        )}
        
        <div className="pt-2">
          <Button size="sm" className="w-full" variant="outline">
            <Play className="w-4 h-4 mr-2" />
            Execute Protocol
          </Button>
        </div>
        
        <div className="text-xs text-gray-500">
          Created: {new Date(protocol.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )
}