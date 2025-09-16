// Updated VeterinarianCard with loading states and enhanced functionality
// src/components/health/VeterinarianCard.tsx

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Phone, 
  Mail, 
  MapPin, 
  Star, 
  Clock, 
  Shield,
  Edit,
  Trash2,
  MoreHorizontal,
  DollarSign,
  User
} from 'lucide-react'

interface VeterinarianCardProps {
  veterinarian: {
    id: string
    name: string
    clinic_name: string
    license_number?: string
    specialization?: string
    phone_primary: string
    phone_emergency?: string
    email: string
    address_street?: string
    address_city?: string
    address_state?: string
    address_postal?: string
    address_country?: string
    availability_hours?: string
    emergency_available?: boolean
    travel_radius_km?: number
    service_types?: string[]
    rates_consultation?: number
    rates_emergency?: number
    preferred_payment?: string[]
    notes?: string
    rating?: number
    is_primary?: boolean
    is_active?: boolean
    created_at?: string
    updated_at?: string
  }
  onEdit: (veterinarian: any) => void
  onDelete: (veterinarianId: string) => void
  canEdit: boolean
  isDeleting?: boolean
}

export function VeterinarianCard({ 
  veterinarian, 
  onEdit, 
  onDelete, 
  canEdit,
  isDeleting = false
}: VeterinarianCardProps) {
  const initials = veterinarian.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'VET'
  
  return (
    <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-indigo-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-indigo-100 text-indigo-600">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg flex items-center space-x-2 flex-wrap">
                <span>{veterinarian.name}</span>
                {veterinarian.is_primary && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <Shield className="w-3 h-3 mr-1" />
                    Primary
                  </Badge>
                )}
                {!veterinarian.is_active && (
                  <Badge variant="outline" className="text-gray-500 border-gray-300">
                    Inactive
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-gray-600">{veterinarian.clinic_name}</p>
              {veterinarian.license_number && (
                <p className="text-xs text-gray-500">License: {veterinarian.license_number}</p>
              )}
            </div>
          </div>
          
          {canEdit && (
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onEdit(veterinarian)}
                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onDelete(veterinarian.id)}
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
        {/* Contact Information */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{veterinarian.phone_primary}</span>
          </div>
          
          {veterinarian.phone_emergency && (
            <div className="flex items-center space-x-2 text-sm">
              <Phone className="w-4 h-4 text-red-400" />
              <span className="text-red-600">{veterinarian.phone_emergency} (Emergency)</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="truncate">{veterinarian.email}</span>
          </div>
          
          {(veterinarian.address_city || veterinarian.address_state) && (
            <div className="flex items-center space-x-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="truncate">
                {veterinarian.address_city}{veterinarian.address_city && veterinarian.address_state && ', '}{veterinarian.address_state}
              </span>
            </div>
          )}
        </div>
        
        {/* Specialization */}
        {veterinarian.specialization && (
          <div className="text-sm bg-gray-50 p-2 rounded">
            <span className="font-medium text-gray-700">Specialization: </span>
            <span className="text-gray-600">{veterinarian.specialization}</span>
          </div>
        )}

        {/* Service Types */}
        {veterinarian.service_types && veterinarian.service_types.length > 0 && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Services: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {veterinarian.service_types.slice(0, 3).map((service, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {service}
                </Badge>
              ))}
              {veterinarian.service_types.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{veterinarian.service_types.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Rates */}
        {(veterinarian.rates_consultation || veterinarian.rates_emergency) && (
          <div className="text-sm space-y-1">
            {veterinarian.rates_consultation && (
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span>Consultation: ${veterinarian.rates_consultation}</span>
              </div>
            )}
            {veterinarian.rates_emergency && (
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-red-400" />
                <span className="text-red-600">Emergency: ${veterinarian.rates_emergency}</span>
              </div>
            )}
          </div>
        )}

        {/* Availability */}
        {veterinarian.availability_hours && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Hours: </span>
            <span className="text-gray-600">{veterinarian.availability_hours}</span>
          </div>
        )}

        {/* Travel Radius */}
        {veterinarian.travel_radius_km && veterinarian.travel_radius_km > 0 && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Travel Radius: </span>
            <span className="text-gray-600">{veterinarian.travel_radius_km} km</span>
          </div>
        )}
        
        {/* Rating and Emergency Status */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  (veterinarian.rating || 0) >= star 
                    ? 'text-yellow-400 fill-current' 
                    : 'text-gray-300'
                }`}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1">
              ({veterinarian.rating || 0}/5)
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {veterinarian.emergency_available && (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                <Clock className="w-3 h-3 mr-1" />
                Emergency
              </Badge>
            )}
          </div>
        </div>

        {/* Notes */}
        {veterinarian.notes && (
          <div className="text-sm pt-2 border-t">
            <span className="font-medium text-gray-700">Notes: </span>
            <span className="text-gray-600 italic">{veterinarian.notes}</span>
          </div>
        )}

        {/* Metadata */}
        {(veterinarian.created_at || veterinarian.updated_at) && (
          <div className="text-xs text-gray-400 pt-2 border-t">
            <div className="flex items-center justify-between">
              {veterinarian.created_at && (
                <span>
                  Added: {new Date(veterinarian.created_at).toLocaleDateString()}
                </span>
              )}
              {veterinarian.updated_at && veterinarian.updated_at !== veterinarian.created_at && (
                <span>
                  Updated: {new Date(veterinarian.updated_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}