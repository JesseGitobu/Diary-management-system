// src/components/animals/AnimalListRow.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Animal } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EditAnimalModal } from '@/components/animals/EditAnimalModal'
import { cn } from '@/lib/utils/cn'
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
  Activity,
  MoreVertical
} from 'lucide-react'

interface AnimalListRowProps {
  animal: Animal
  farmId: string
  userRole: string
  onAnimalUpdated?: (updatedAnimal: Animal) => void
  isMobile?: boolean
}

export function AnimalListRow({ animal, farmId, userRole, onAnimalUpdated, isMobile }: AnimalListRowProps) {
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
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
          <Baby className="mr-1 w-3 h-3" />
          {isMobile ? "Born" : "Born Here"}
        </Badge>
      )
    } else if (animalData.animal_source === 'purchased_animal') {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
          <ShoppingCart className="mr-1 w-3 h-3" />
          {isMobile ? "Bought" : "Purchased"}
        </Badge>
      )
    }
    return null
  }
  
  const getProductionStatusBadge = () => {
    if (!animalData.production_status) return null
    
    const statusColors: Record<string, string> = {
      calf: 'bg-yellow-100 text-yellow-800',
      heifer: 'bg-blue-100 text-blue-800',
      served: 'bg-purple-100 text-purple-800',
      lactating: 'bg-green-100 text-green-800',
      dry: 'bg-gray-100 text-gray-800',
      bull: 'bg-gray-100 text-gray-800',
    }
    
    const statusLabels = {
      calf: 'Calf',
      heifer: 'Heifer',
      served: 'Served',
      lactating: 'Lactating',
      dry: 'Dry',
      bull: 'Bull'
    }
    
    return (
      <Badge className={cn(statusColors[animalData.production_status] || 'bg-gray-100 text-gray-800', "text-xs")}>
        {statusLabels[animalData.production_status] || animalData.production_status.replace('_', ' ').toUpperCase()}
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
        label: isMobile ? 'Attention' : 'Needs Attention'
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
      <Badge className={cn(config.color, "text-xs")}>
        <IconComponent className="mr-1 w-3 h-3" />
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
      return `${ageInDays}d`
    } else if (ageInDays < 365) {
      const months = Math.floor(ageInDays / 30)
      return `${months}mo`
    } else {
      const years = Math.floor(ageInDays / 365)
      const remainingMonths = Math.floor((ageInDays % 365) / 30)
      return isMobile ? `${years}y ${remainingMonths}m` : `${years}y ${remainingMonths}m old`
    }
  }
  
  const animalAge = calculateAge()
  
  return (
    <>
      <div className={cn(
        "bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200",
        isMobile ? "p-4" : "p-4"
      )}>
        <div className={cn(
          "flex items-center justify-between",
          isMobile ? "flex-col space-y-3" : "space-x-6"
        )}>
          {/* Left Section - Basic Info */}
          <div className={cn(
            "flex items-center space-x-4 min-w-0",
            isMobile ? "w-full" : "flex-1"
          )}>
            {/* Name and Tag */}
            <div className="min-w-0 flex-1">
              <h3 className={cn(
                "font-semibold text-gray-900 truncate",
                isMobile ? "text-base" : "text-lg"
              )}>
                {animalData.name || `Animal ${animalData.tag_number}`}
              </h3>
              <p className={cn(
                "text-gray-500 truncate",
                isMobile ? "text-sm" : "text-sm"
              )}>
                #{animalData.tag_number} • {animalData.breed || 'Unknown breed'}
              </p>
            </div>
            
            {/* Gender Badge */}
            <div className="flex-shrink-0">
              <Badge variant={animalData.gender === 'female' ? 'default' : 'secondary'} 
                     className="text-xs">
                {animalData.gender === 'female' ? '♀ Female' : '♂ Male'}
              </Badge>
            </div>
          </div>
          
          {/* Middle Section - Status Badges and Key Info */}
          <div className={cn(
            "flex items-center",
            isMobile ? "w-full justify-between flex-wrap gap-2" : "space-x-4 flex-shrink-0"
          )}>
            {/* Status Badges */}
            <div className="flex items-center space-x-2">
              {getSourceBadge()}
              {getProductionStatusBadge()}
              {getHealthStatusBadge()}
            </div>
            
            {/* Key Metrics */}
            {!isMobile && (
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                {animalAge && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{animalAge}</span>
                  </div>
                )}
                
                {animalData.weight && (
                  <div className="flex items-center">
                    <Weight className="w-4 h-4 mr-1" />
                    <span>{animalData.weight}kg</span>
                  </div>
                )}
                
                {animalData.production_status === 'lactating' && animalData.current_daily_production && (
                  <div className="flex items-center text-blue-600">
                    <Droplets className="w-4 h-4 mr-1" />
                    <span>{animalData.current_daily_production}L/day</span>
                  </div>
                )}
                
                {animalData.animal_source === 'newborn_calf' && animalData.mother && (
                  <div className="flex items-center text-pink-600">
                    <Heart className="w-4 h-4 mr-1" />
                    <span className="truncate max-w-24">
                      {animalData.mother.name || animalData.mother.tag_number}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Right Section - Actions */}
          <div className={cn(
            "flex items-center space-x-2 flex-shrink-0",
            isMobile ? "w-full justify-end" : ""
          )}>
            <Button 
              asChild 
              size="sm" 
              variant="outline"
            >
              <Link href={`/dashboard/animals/${animalData.id}`}>
                <Eye className="w-4 h-4 mr-1" />
                View
              </Link>
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowEditModal(true)}
              disabled={!canEdit}
            >
              <Edit className="w-4 h-4 mr-1" />
              {isMobile ? "" : "Edit"}
            </Button>
          </div>
        </div>
        
        {/* Mobile: Show key metrics below */}
        {isMobile && (
          <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600 overflow-x-auto">
            {animalAge && (
              <div className="flex items-center whitespace-nowrap">
                <Calendar className="w-4 h-4 mr-1" />
                <span>{animalAge}</span>
              </div>
            )}
            
            {animalData.weight && (
              <div className="flex items-center whitespace-nowrap">
                <Weight className="w-4 h-4 mr-1" />
                <span>{animalData.weight}kg</span>
              </div>
            )}
            
            {animalData.production_status === 'lactating' && animalData.current_daily_production && (
              <div className="flex items-center text-blue-600 whitespace-nowrap">
                <Droplets className="w-4 h-4 mr-1" />
                <span>{animalData.current_daily_production}L/day</span>
              </div>
            )}
            
            {animalData.animal_source === 'newborn_calf' && animalData.mother && (
              <div className="flex items-center text-pink-600 whitespace-nowrap">
                <Heart className="w-4 h-4 mr-1" />
                <span className="truncate max-w-32">
                  Mom: {animalData.mother.name || animalData.mother.tag_number}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Notes - if present */}
        {animalData.notes && (
          <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded p-2 line-clamp-2">
            {animalData.notes}
          </div>
        )}
      </div>
      
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