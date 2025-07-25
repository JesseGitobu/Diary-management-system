// =============================================================================
// VaccinationCard.tsx
// =============================================================================
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Syringe, 
  Calendar, 
  Users, 
  DollarSign,
  Edit, 
  Trash2,
  Stethoscope,
  Package
} from 'lucide-react'

interface VaccinationCardProps {
  vaccination: any
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}

export function VaccinationCard({ vaccination, onEdit, onDelete, canEdit }: VaccinationCardProps) {
  const getRouteColor = (route: string) => {
    switch (route?.toLowerCase()) {
      case 'intramuscular': return 'bg-blue-100 text-blue-800'
      case 'subcutaneous': return 'bg-green-100 text-green-800'
      case 'intranasal': return 'bg-purple-100 text-purple-800'
      case 'oral': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Syringe className="w-5 h-5 text-green-600" />
              <span>{vaccination.vaccine_name}</span>
            </CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className={getRouteColor(vaccination.route_of_administration)}>
                {vaccination.route_of_administration}
              </Badge>
              {vaccination.is_booster && (
                <Badge className="bg-orange-100 text-orange-800">Booster</Badge>
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
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>Date: {new Date(vaccination.vaccination_date).toLocaleDateString()}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{vaccination.selected_animals?.length || 0} animals vaccinated</span>
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
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Dosage: </span>
            <span className="text-gray-600">{vaccination.dosage}</span>
          </div>
          
          {vaccination.cost_per_dose && (
            <div className="flex items-center space-x-1">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span>{vaccination.cost_per_dose} per dose</span>
            </div>
          )}
        </div>
        
        {vaccination.next_due_date && (
          <div className="p-2 bg-blue-50 rounded-md">
            <div className="flex items-center space-x-2 text-sm text-blue-800">
              <Calendar className="w-4 h-4" />
              <span>Next due: {new Date(vaccination.next_due_date).toLocaleDateString()}</span>
            </div>
          </div>
        )}
        
        {vaccination.notes && (
          <div className="text-sm">
            <span className="font-medium">Notes: </span>
            <span className="text-gray-600 line-clamp-2">{vaccination.notes}</span>
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          Recorded: {new Date(vaccination.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )
}