'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  Calendar, 
  Tag, 
  MapPin, 
  User, 
  Edit,
  FileText,
  Heart,
  Weight,
  Baby,
  ShoppingCart,
  Droplets,
  Activity,
  Clock
} from 'lucide-react'

interface AnimalBasicInfoProps {
  animal: any
  canEdit: boolean
  onEditClick: () => void
}

export function AnimalBasicInfo({ animal, canEdit, onEditClick }: AnimalBasicInfoProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  const getSourceBadge = () => {
    if (animal.animal_source === 'newborn_calf') {
      return (
        <Badge className="bg-blue-100 text-blue-800">
          <Baby className="w-3 h-3 mr-1" />
          Born Here
        </Badge>
      )
    } else if (animal.animal_source === 'purchased_animal') {
      return (
        <Badge className="bg-green-100 text-green-800">
          <ShoppingCart className="w-3 h-3 mr-1" />
          Purchased
        </Badge>
      )
    }
    return null
  }
  
  const getProductionStatusBadge = () => {
    const statusColors = {
      calf: 'bg-yellow-100 text-yellow-800',
      heifer: 'bg-blue-100 text-blue-800',
      served: 'bg-purple-100 text-purple-800',
      lactating: 'bg-green-100 text-green-800',
      dry: 'bg-gray-100 text-gray-800',
    }
    
    if (!animal.production_status) return null
    
    return (
      <Badge className={statusColors[animal.production_status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {animal.production_status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }
  
  const getHealthStatusBadge = () => {
    const statusColors = {
      healthy: 'bg-green-100 text-green-800',
      sick: 'bg-red-100 text-red-800',
      requires_attention: 'bg-yellow-100 text-yellow-800',
      quarantined: 'bg-red-100 text-red-800',
    }
    
    if (!animal.health_status) return null
    
    return (
      <Badge className={statusColors[animal.health_status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        <Heart className="w-3 h-3 mr-1" />
        {animal.health_status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }
  
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 'Unknown'
    
    const birth = new Date(birthDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - birth.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) {
      return `${diffDays} days old`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} month${months !== 1 ? 's' : ''} old`
    } else {
      const years = Math.floor(diffDays / 365)
      const remainingMonths = Math.floor((diffDays % 365) / 30)
      return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''} old`
    }
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="w-5 h-5" />
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>
                Core animal details and identification
              </CardDescription>
            </div>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={onEditClick}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Identification Section */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Tag className="w-4 h-4 mr-2" />
              Identification
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tag Number</p>
                <span className="font-medium">{animal.tag_number}</span>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Name</p>
                <span className="font-medium">{animal.name || 'Not named'}</span>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Breed</p>
                <span className="font-medium capitalize">{animal.breed || 'Not specified'}</span>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Gender</p>
                <Badge variant="secondary" className="capitalize">
                  {animal.gender}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Source & Status Section */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Source & Status
            </h4>
            <div className="space-y-3">
              {animal.animal_source && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Source:</span>
                  {getSourceBadge()}
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">General Status:</span>
                <Badge 
                  className={
                    animal.status === 'active' ? 'bg-green-100 text-green-800' :
                    animal.status === 'pregnant' ? 'bg-blue-100 text-blue-800' :
                    animal.status === 'dry' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }
                >
                  {animal.status}
                </Badge>
              </div>
              
              {animal.production_status && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Production:</span>
                  {getProductionStatusBadge()}
                </div>
              )}
              
              {animal.health_status && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Health:</span>
                  {getHealthStatusBadge()}
                </div>
              )}
            </div>
          </div>
          
          {/* Physical Details Section */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Weight className="w-4 h-4 mr-2" />
              Physical Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Birth Date</p>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{formatDate(animal.birth_date)}</span>
                </div>
                {animal.birth_date && (
                  <p className="text-xs text-gray-500 mt-1">
                    {calculateAge(animal.birth_date)}
                  </p>
                )}
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Weight</p>
                <span className="font-medium">
                  {animal.weight ? `${animal.weight} kg` : 'Not recorded'}
                </span>
              </div>
              
              {animal.purchase_date && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Purchase Date</p>
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{formatDate(animal.purchase_date)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Parentage Information for Newborn Calves */}
          {animal.animal_source === 'newborn_calf' && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Heart className="w-4 h-4 mr-2" />
                Parentage
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mother (Dam):</span>
                  <span className="font-medium">
                    {animal.mother?.name || animal.mother?.tag_number || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Father (Sire):</span>
                  <span className="font-medium">
                    {animal.father?.name || animal.father?.tag_number || 'Not recorded'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Production Information for Lactating Animals */}
          {animal.production_status === 'lactating' && animal.current_daily_production && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Droplets className="w-4 h-4 mr-2" />
                Current Production
              </h4>
              <div className="bg-green-50 p-3 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700">Daily Production:</span>
                  <span className="font-bold text-green-800 text-lg">
                    {animal.current_daily_production}L
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Service Information for Served Animals */}
          {animal.production_status === 'served' && (animal.service_date || animal.service_method) && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                Service Information
              </h4>
              <div className="space-y-2">
                {animal.service_date && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Service Date:</span>
                    <span className="font-medium">
                      {formatDate(animal.service_date)}
                    </span>
                  </div>
                )}
                {animal.service_method && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Method:</span>
                    <Badge variant="outline" className="capitalize">
                      {animal.service_method.replace('_', ' ')}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Timeline & Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Timeline & History</span>
          </CardTitle>
          <CardDescription>
            Key events in this animal's life
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Birth Event */}
            {animal.birth_date && (
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Born</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(animal.birth_date)}
                  </p>
                  {animal.birth_date && (
                    <p className="text-xs text-gray-500">
                      {calculateAge(animal.birth_date)}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Purchase Event */}
            {animal.purchase_date && (
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Purchased</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(animal.purchase_date)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Added to farm inventory
                  </p>
                </div>
              </div>
            )}
            
            {/* Farm Addition Event */}
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-farm-green rounded-full mt-1.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Added to Farm</p>
                <p className="text-sm text-gray-600">
                  {formatDate(animal.created_at)}
                </p>
                <p className="text-xs text-gray-500">
                  Registered in farm management system
                </p>
              </div>
            </div>
            
            {/* Service Event */}
            {animal.service_date && (
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full mt-1.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Served</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(animal.service_date)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {animal.service_method?.replace('_', ' ') || 'Breeding service'}
                  </p>
                </div>
              </div>
            )}
            
            {/* Future Events Placeholder */}
            <div className="flex items-start space-x-3 opacity-50">
              <div className="w-3 h-3 bg-gray-300 rounded-full mt-1.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-500 italic">
                  More events will appear as you add health and production records
                </p>
              </div>
            </div>
          </div>
          
          {/* Additional Notes Section */}
          {animal.notes && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Notes
              </h4>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{animal.notes}</p>
              </div>
            </div>
          )}
          
          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                Add Health Record
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Record Production
              </Button>
              {canEdit && (
                <Button variant="outline" size="sm" className="text-xs" onClick={onEditClick}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit Details
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-xs">
                View Full History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}