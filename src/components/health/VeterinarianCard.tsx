'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { 
  Phone, 
  Mail, 
  MapPin, 
  Star, 
  Clock, 
  Shield,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react'

interface VeterinarianCardProps {
  veterinarian: any
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}

export function VeterinarianCard({ veterinarian, onEdit, onDelete, canEdit }: VeterinarianCardProps) {
  const initials = veterinarian.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'VET'
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-indigo-100 text-indigo-600">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg flex items-center space-x-2">
                <span>{veterinarian.name}</span>
                {veterinarian.is_primary && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Shield className="w-3 h-3 mr-1" />
                    Primary
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-gray-600">{veterinarian.clinic_name}</p>
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
        <div className="flex items-center space-x-2 text-sm">
          <Phone className="w-4 h-4 text-gray-400" />
          <span>{veterinarian.phone_primary}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="truncate">{veterinarian.email}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="truncate">{veterinarian.address_city}, {veterinarian.address_state}</span>
        </div>
        
        {veterinarian.specialization && (
          <div className="text-sm">
            <span className="font-medium">Specialization: </span>
            <span className="text-gray-600">{veterinarian.specialization}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  veterinarian.rating >= star 
                    ? 'text-yellow-400 fill-current' 
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          
          {veterinarian.emergency_available && (
            <Badge className="bg-red-100 text-red-800">
              <Clock className="w-3 h-3 mr-1" />
              Emergency
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}