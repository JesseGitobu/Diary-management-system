// src/components/animals/AnimalCard.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Animal } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EditAnimalModal } from '@/components/animals/EditAnimalModal'
import { 
  Calendar, 
  Weight, 
  Heart, 
  Droplets, 
  ShoppingCart,
  Eye,
  Edit,
  Baby,
  AlertTriangle,
  Shield,
  Activity
} from 'lucide-react'

interface AnimalCardProps {
  animal: Animal
  farmId: string
  userRole: string
  onAnimalUpdated?: (updatedAnimal: Animal) => void
}

export function AnimalCard({ animal, farmId, userRole, onAnimalUpdated }: AnimalCardProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [animalData, setAnimalData] = useState(animal)
  
  const canEdit = ['farm_owner', 'farm_manager'].includes(userRole)
  
  const handleAnimalUpdated = (updatedAnimal: Animal) => {
    setAnimalData(updatedAnimal)
    setShowEditModal(false)
    onAnimalUpdated?.(updatedAnimal)
  }
  
  const getSourceBadge = () => {
    if (animalData.animal_source === 'newborn_calf') {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <Baby className="w-3 h-3 mr-1" />
          Born Here
        </Badge>
      )
    } else if (animalData.animal_source === 'purchased_animal') {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <ShoppingCart className="w-3 h-3 mr-1" />
          Purchased
        </Badge>
      )
    }
    return null
  }
  
  const getProductionStatusBadge = () => {
    if (!animalData.production_status) return null
    
    const statusColors = {
      calf: 'bg-yellow-100 text-yellow-800',
      heifer: 'bg-blue-100 text-blue-800',
      served: 'bg-purple-100 text-purple-800',
      lactating: 'bg-green-100 text-green-800',
      dry: 'bg-gray-100 text-gray-800',
    }
    
    return (
      <Badge className={statusColors[animalData.production_status] || 'bg-gray-100 text-gray-800'}>
        {animalData.production_status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }
  
  const getHealthStatusBadge = () => {
    if (!animalData.health_status) return null
    
    const statusConfig = {
      healthy: {
        color: 'bg-green-100 text-green-800',
        icon: Shield,
        label: 'Healthy'
      },
      sick: {
        color: 'bg-red-100 text-red-800',
        icon: AlertTriangle,
        label: 'Sick'
      },
      requires_attention: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: Activity,
        label: 'Needs Attention'
      },
      quarantined: {
        color: 'bg-orange-100 text-orange-800',
        icon: AlertTriangle,
        label: 'Quarantined'
      }
    }
    
    const config = statusConfig[animalData.health_status]
    if (!config) return null
    
    const IconComponent = config.icon
    
    return (
      <Badge className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }
  
  const calculateAge = () => {
    if (!animalData.birth_date) return null
    
    const birthDate = new Date(animalData.birth_date)
    const now = new Date()
    const ageInDays = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (ageInDays < 30) {
      return `${ageInDays} days old`
    } else if (ageInDays < 365) {
      const months = Math.floor(ageInDays / 30)
      return `${months} month${months > 1 ? 's' : ''} old`
    } else {
      const years = Math.floor(ageInDays / 365)
      const remainingMonths = Math.floor((ageInDays % 365) / 30)
      return `${years}y ${remainingMonths}m old`
    }
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  const animalAge = calculateAge()
  
  return (
    <>
      <Card className="hover:shadow-lg transition-shadow duration-200 group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold leading-tight">
                {animalData.name || `Animal ${animalData.tag_number}`}
              </CardTitle>
              <CardDescription className="mt-1">
                Tag: {animalData.tag_number} • {animalData.breed || 'Unknown breed'}
              </CardDescription>
            </div>
            
            <div className="flex flex-col space-y-1 items-end">
              {getSourceBadge()}
              <Badge variant={animalData.gender === 'female' ? 'default' : 'secondary'} className="text-xs">
                {animalData.gender === 'female' ? '♀ Female' : '♂ Male'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Production and Health Status */}
            <div className="flex flex-wrap gap-2">
              {getProductionStatusBadge()}
              {getHealthStatusBadge()}
            </div>
            
            {/* Key Information */}
            <div className="space-y-2 text-sm">
              {/* Age and Birth Date */}
              {animalData.birth_date && (
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>
                    Born: {formatDate(animalData.birth_date)}
                    {animalAge && <span className="text-gray-500 ml-1">({animalAge})</span>}
                  </span>
                </div>
              )}
              
              {/* Purchase Date for purchased animals */}
              {animalData.animal_source === 'purchased_animal' && animalData.purchase_date && (
                <div className="flex items-center text-gray-600">
                  <ShoppingCart className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>Purchased: {formatDate(animalData.purchase_date)}</span>
                </div>
              )}
              
              {/* Weight */}
              {animalData.weight && (
                <div className="flex items-center text-gray-600">
                  <Weight className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>Weight: {animalData.weight} kg</span>
                </div>
              )}
              
              {/* Mother information for newborn calves */}
              {animalData.animal_source === 'newborn_calf' && animalData.mother && (
                <div className="flex items-center text-gray-600">
                  <Heart className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>
                    Mother: {animalData.mother.name || animalData.mother.tag_number}
                  </span>
                </div>
              )}
              
              {/* Current production for lactating animals */}
              {animalData.production_status === 'lactating' && animalData.current_daily_production && (
                <div className="flex items-center text-gray-600">
                  <Droplets className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>
                    Daily: {animalData.current_daily_production}L
                    {animalData.days_in_milk && (
                      <span className="text-gray-500 ml-1">
                        ({animalData.days_in_milk} DIM)
                      </span>
                    )}
                  </span>
                </div>
              )}
              
              {/* Service information for served animals */}
              {animalData.production_status === 'served' && animalData.service_date && (
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>
                    Served: {formatDate(animalData.service_date)}
                    {animalData.service_method && (
                      <span className="text-gray-500 ml-1">
                        ({animalData.service_method === 'artificial_insemination' ? 'AI' : 'Natural'})
                      </span>
                    )}
                  </span>
                </div>
              )}
              
              {/* Expected calving date */}
              {animalData.expected_calving_date && (
                <div className="flex items-center text-gray-600">
                  <Baby className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>
                    Expected calving: {formatDate(animalData.expected_calving_date)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Additional Information */}
            {animalData.notes && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-md line-clamp-2">
                {animalData.notes}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link href={`/dashboard/animals/${animalData.id}`}>
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Link>
              </Button>
              
              {canEdit ? (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="flex-1" disabled>
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Animal Modal */}
      {showEditModal && (
        <EditAnimalModal
          animal={animalData}
          farmId={farmId}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onAnimalUpdated={handleAnimalUpdated}
        />
      )}
    </>
  )
}