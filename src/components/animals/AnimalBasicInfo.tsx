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
  FileText
} from 'lucide-react'

interface AnimalBasicInfoProps {
  animal: any
  canEdit: boolean
}

export function AnimalBasicInfo({ animal, canEdit }: AnimalBasicInfoProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Basic Information</CardTitle>
            {canEdit && (
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tag Number</p>
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{animal.tag_number}</span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Name</p>
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{animal.name || 'Not named'}</span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Breed</p>
              <span className="font-medium">{animal.breed || 'Not specified'}</span>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Gender</p>
              <Badge variant="secondary" className="capitalize">
                {animal.gender}
              </Badge>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Birth Date</p>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{formatDate(animal.birth_date)}</span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
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
          </div>
          
          {animal.weight && (
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-1">Current Weight</p>
              <span className="text-lg font-semibold">{animal.weight} kg</span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>
            Key events in this animal's life
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-farm-green rounded-full mt-2" />
              <div>
                <p className="font-medium text-gray-900">Added to Farm</p>
                <p className="text-sm text-gray-600">
                  {formatDate(animal.created_at)}
                </p>
              </div>
            </div>
            
            {animal.birth_date && (
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                <div>
                  <p className="font-medium text-gray-900">Born</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(animal.birth_date)}
                  </p>
                </div>
              </div>
            )}
            
            {/* We'll add more timeline events as we build health and production records */}
            <div className="flex items-start space-x-3 opacity-50">
              <div className="w-2 h-2 bg-gray-300 rounded-full mt-2" />
              <div>
                <p className="text-sm text-gray-500 italic">
                  More events will appear as you add health and production records
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}