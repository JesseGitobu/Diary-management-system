// Updated VaccinationCard.tsx with edit and delete functionality
// src/components/health/VaccinationCard.tsx

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Syringe, 
  Calendar, 
  Users, 
  DollarSign,
  Edit, 
  Trash2,
  Stethoscope,
  Package,
  Clock,
  AlertTriangle
} from 'lucide-react'

interface VaccinationCardProps {
  vaccination: {
    id: string
    vaccine_name: string
    vaccine_type: string
    manufacturer?: string
    batch_number?: string
    vaccination_date: string
    next_due_date?: string
    route_of_administration: string
    dosage: string
    vaccination_site?: string
    veterinarian?: string
    cost_per_dose?: number
    total_cost?: number
    side_effects?: string
    notes?: string
    created_at?: string
    updated_at?: string
    selected_animals?: string[]
    vaccination_animals?: Array<{
      animal_id: string
      animals: {
        id: string
        name?: string
        tag_number: string
        breed?: string
      }
    }>
  }
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
  isDeleting?: boolean
}

export function VaccinationCard({ 
  vaccination, 
  onEdit, 
  onDelete, 
  canEdit,
  isDeleting = false
}: VaccinationCardProps) {
  const getRouteColor = (route: string) => {
    switch (route?.toLowerCase()) {
      case 'intramuscular': return 'bg-blue-100 text-blue-800'
      case 'subcutaneous': return 'bg-green-100 text-green-800'
      case 'intranasal': return 'bg-purple-100 text-purple-800'
      case 'oral': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getVaccineTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'core': return 'bg-green-100 text-green-800'
      case 'risk_based': return 'bg-yellow-100 text-yellow-800'
      case 'elective': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Check if vaccination is overdue
  const isOverdue = vaccination.next_due_date && new Date(vaccination.next_due_date) < new Date()
  const isDueSoon = vaccination.next_due_date && 
    new Date(vaccination.next_due_date) <= new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) && 
    new Date(vaccination.next_due_date) >= new Date()

  // Get animal count
  const animalCount = vaccination.vaccination_animals?.length || vaccination.selected_animals?.length || 0
  
  return (
    <Card className={`hover:shadow-lg transition-shadow border-l-4 border-l-green-500 ${
      isOverdue ? 'ring-2 ring-red-200' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Syringe className="w-5 h-5 text-green-600" />
              <span>{vaccination.vaccine_name}</span>
            </CardTitle>
            <div className="flex items-center space-x-2 mt-2 flex-wrap gap-1">
              <Badge className={getRouteColor(vaccination.route_of_administration)}>
                {vaccination.route_of_administration}
              </Badge>
              <Badge className={getVaccineTypeColor(vaccination.vaccine_type)}>
                {vaccination.vaccine_type?.replace('_', ' ')}
              </Badge>
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
                onClick={onEdit}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDelete} 
                disabled={isDeleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Date: {new Date(vaccination.vaccination_date).toLocaleDateString()}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{animalCount} animals vaccinated</span>
          </div>
          
          {vaccination.veterinarian && (
            <div className="flex items-center space-x-2">
              <Stethoscope className="w-4 h-4 text-gray-400" />
              <span className="truncate">{vaccination.veterinarian}</span>
            </div>
          )}
          
          {vaccination.batch_number && (
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span>Batch: {vaccination.batch_number}</span>
            </div>
          )}

          {vaccination.manufacturer && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Manufacturer: </span>
              <span className="text-gray-600">{vaccination.manufacturer}</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Dosage: </span>
            <span className="text-gray-600">{vaccination.dosage}</span>
          </div>
          
          {vaccination.cost_per_dose && (
            <div className="flex items-center space-x-1">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span>${vaccination.cost_per_dose} per dose</span>
            </div>
          )}
        </div>

        {vaccination.vaccination_site && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Site: </span>
            <span className="text-gray-600">{vaccination.vaccination_site}</span>
          </div>
        )}

        {vaccination.total_cost && vaccination.total_cost > 0 && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Total Cost: </span>
            <span className="text-gray-600">${vaccination.total_cost.toFixed(2)}</span>
          </div>
        )}
        
        {vaccination.next_due_date && (
          <div className={`p-2 rounded-md ${
            isOverdue 
              ? 'bg-red-50 text-red-800' 
              : isDueSoon 
                ? 'bg-orange-50 text-orange-800'
                : 'bg-blue-50 text-blue-800'
          }`}>
            <div className="flex items-center space-x-2 text-sm">
              {isOverdue ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              <span>
                {isOverdue ? 'Overdue: ' : 'Next due: '}
                {new Date(vaccination.next_due_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {vaccination.side_effects && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Side Effects: </span>
            <span className="text-gray-600">{vaccination.side_effects}</span>
          </div>
        )}
        
        {vaccination.notes && (
          <div className="text-sm">
            <span className="font-medium">Notes: </span>
            <span className="text-gray-600 line-clamp-2">{vaccination.notes}</span>
          </div>
        )}

        {/* Animal List */}
        {vaccination.vaccination_animals && vaccination.vaccination_animals.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">Vaccinated Animals:</p>
            <div className="flex flex-wrap gap-1">
              {vaccination.vaccination_animals.slice(0, 3).map((va) => (
                <Badge key={va.animal_id} variant="outline" className="text-xs">
                  {va.animals.name || `#${va.animals.tag_number}`}
                </Badge>
              ))}
              {vaccination.vaccination_animals.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{vaccination.vaccination_animals.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Metadata */}
        <div className="text-xs text-gray-400 pt-2 border-t">
          <div className="flex items-center justify-between">
            <span>
              Recorded: {vaccination.created_at ? new Date(vaccination.created_at).toLocaleDateString() : 'N/A'}
            </span>
            {vaccination.updated_at && vaccination.updated_at !== vaccination.created_at && (
              <span>
                Updated: {new Date(vaccination.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}