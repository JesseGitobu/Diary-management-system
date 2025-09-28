// src/components/animals/AnimalCard.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Animal } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EditAnimalModal } from '@/components/animals/EditAnimalModal'
import { HealthStatusBadge } from './HealthStatusBadge'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
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
  MoreVertical,
  Phone
} from 'lucide-react'

interface AnimalCardProps {
  animal: Animal
  farmId: string
  userRole: string
  onAnimalUpdated?: (updatedAnimal: Animal) => void
  onHealthStatusChange?: (animalId: string, healthStatus: string) => void
  isMobile?: boolean
}

export function AnimalCard({ animal, farmId, userRole, onAnimalUpdated, onHealthStatusChange, isMobile }: AnimalCardProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [animalData, setAnimalData] = useState(animal)
   const [healthStatusHistory, setHealthStatusHistory] = useState([])
  const [showAllInfo, setShowAllInfo] = useState(false)

  const { isMobile: isMobileDevice, isTouch } = useDeviceInfo()
  const canEdit = ['farm_owner', 'farm_manager'].includes(userRole)

    useEffect(() => {
    setAnimalData(animal)
  }, [animal])

  useEffect(() => {
    if (animalData.health_status !== animal.health_status && animalData.health_status) {
      onHealthStatusChange?.(animalData.id, animalData.health_status)
    }
  }, [animalData.health_status])

   const fetchHealthStatusHistory = async () => {
    try {
      const response = await fetch(`/api/health/animals/${animalData.id}/status-history`)
      if (response.ok) {
        const data = await response.json()
        setHealthStatusHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error fetching health status history:', error)
    }
  }
  
  const handleAnimalUpdated = (updatedAnimal: Animal) => {
    setAnimalData(updatedAnimal)
    setShowEditModal(false)
    onAnimalUpdated?.(updatedAnimal)
  }
  
  const getSourceBadge = () => {
    if (animalData.animal_source === 'newborn_calf') {
      return (
        <Badge variant="secondary" className={cn(
          "bg-blue-100 text-blue-800",
          isMobile ? "text-xs px-2 py-1" : "text-xs"
        )}>
          <Baby className={cn("mr-1", isMobile ? "w-3 h-3" : "w-3 h-3")} />
          {isMobile ? "Born" : "Born Here"}
        </Badge>
      )
    } else if (animalData.animal_source === 'purchased_animal') {
      return (
        <Badge variant="secondary" className={cn(
          "bg-green-100 text-green-800",
          isMobile ? "text-xs px-2 py-1" : "text-xs"
        )}>
          <ShoppingCart className={cn("mr-1", isMobile ? "w-3 h-3" : "w-3 h-3")} />
          {isMobile ? "Bought" : "Purchased"}
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
    
    const statusLabels = {
      calf: 'Calf',
      heifer: 'Heifer',
      served: 'Served',
      lactating: isMobile ? 'Lactating' : 'Lactating',
      dry: 'Dry',
    }
    
    return (
      <Badge className={cn(
        statusColors[animalData.production_status] || 'bg-gray-100 text-gray-800',
        isMobile ? "text-xs px-2 py-1" : "text-xs"
      )}>
        {statusLabels[animalData.production_status] || animalData.production_status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }
  
  const getHealthStatusBadge = () => {
    if (!animalData.health_status) return null
    
    const statusConfig = {
      healthy: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: Shield,
        label: 'Healthy',
        pulse: false
      },
      sick: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: AlertTriangle,
        label: 'Sick',
        pulse: true // Add visual indication for urgent status
      },
      requires_attention: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Activity,
        label: isMobile ? 'Attention' : 'Needs Attention',
        pulse: false
      },
      quarantined: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: AlertTriangle,
        label: 'Quarantined',
        pulse: true
      }
    }
    
    const config = statusConfig[animalData.health_status as keyof typeof statusConfig]
    if (!config) return null
    
    const IconComponent = config.icon
    
    return (
      <Badge className={cn(
        config.color,
        isMobile ? "text-xs px-2 py-1" : "text-xs",
        config.pulse && "animate-pulse" // Add pulsing animation for urgent statuses
      )}>
        <IconComponent className={cn("mr-1", isMobile ? "w-3 h-3" : "w-3 h-3")} />
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
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: isMobile ? '2-digit' : 'numeric'
    })
  }
  
  const animalAge = calculateAge()
  
  // Mobile-specific info items (prioritized)
  const getPrimaryInfo = () => {
    const items = []
    
    // Always show age if available
    if (animalData.birth_date && animalAge) {
      items.push({
        icon: Calendar,
        text: animalAge,
        color: 'text-gray-600'
      })
    }
    
    // Show weight if available
    if (animalData.weight) {
      items.push({
        icon: Weight,
        text: `${animalData.weight}kg`,
        color: 'text-gray-600'
      })
    }
    
    // Show current production for lactating animals
    if (animalData.production_status === 'lactating' && animalData.current_daily_production) {
      items.push({
        icon: Droplets,
        text: `${animalData.current_daily_production}L/day`,
        color: 'text-blue-600'
      })
    }
    
    // Show mother for newborn calves
    if (animalData.animal_source === 'newborn_calf' && animalData.mother) {
      items.push({
        icon: Heart,
        text: `Mom: ${animalData.mother.name || animalData.mother.tag_number}`,
        color: 'text-pink-600'
      })
    }
    
    return items.slice(0, isMobile ? 2 : 4) // Limit items on mobile
  }
  
  const getSecondaryInfo = () => {
    const items = []
    
    // Purchase date for purchased animals
    if (animalData.animal_source === 'purchased_animal' && animalData.purchase_date) {
      items.push({
        icon: ShoppingCart,
        text: `Bought: ${formatDate(animalData.purchase_date)}`,
        color: 'text-gray-600'
      })
    }
    
    // Service information for served animals
    if (animalData.production_status === 'served' && animalData.service_date) {
      items.push({
        icon: Calendar,
        text: `Served: ${formatDate(animalData.service_date)}`,
        color: 'text-purple-600'
      })
    }
    
    // Expected calving date
    if (animalData.expected_calving_date) {
      items.push({
        icon: Baby,
        text: `Due: ${formatDate(animalData.expected_calving_date)}`,
        color: 'text-green-600'
      })
    }
    
    return items
  }
  
  const primaryInfo = getPrimaryInfo()
  const secondaryInfo = getSecondaryInfo()
  
  return (
    <>
      <Card className={cn(
        "transition-all duration-200 group",
        isMobile 
          ? "hover:shadow-md active:scale-[0.98] active:shadow-lg" 
          : "hover:shadow-lg",
        isTouch && "cursor-pointer"
      )}>
        <CardHeader className={cn(
          isMobile ? "pb-2 px-4 pt-4" : "pb-3"
        )}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className={cn(
                "font-semibold leading-tight",
                isMobile ? "text-base" : "text-lg"
              )}>
                {animalData.name || `Animal ${animalData.tag_number}`}
              </CardTitle>
              <CardDescription className={cn(
                "mt-1 truncate",
                isMobile ? "text-xs" : "text-sm"
              )}>
                #{animalData.tag_number} • {animalData.breed || 'Unknown breed'}
              </CardDescription>
            </div>
            
            <div className={cn(
              "flex items-center space-x-1 ml-2",
              isMobile ? "flex-row" : "flex-col space-y-1 items-end"
            )}>
              {getSourceBadge()}
              {!isMobile && (
                <Badge variant={animalData.gender === 'female' ? 'default' : 'secondary'} 
                       className="text-xs">
                  {animalData.gender === 'female' ? '♀ Female' : '♂ Male'}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Mobile: Show gender badge in header on separate line */}
          {isMobile && (
            <div className="flex items-center justify-between mt-2">
              <Badge variant={animalData.gender === 'female' ? 'default' : 'secondary'} 
                     className="text-xs">
                {animalData.gender === 'female' ? '♀ Female' : '♂ Male'}
              </Badge>
            </div>
          )}
        </CardHeader>
        
        <CardContent className={cn(
          isMobile ? "px-4 pb-4 pt-0" : "pt-0"
        )}>
          <div className={cn(
            isMobile ? "space-y-3" : "space-y-3"
          )}>
            {/* Production and Health Status */}
            <div className={cn(
              "flex flex-wrap gap-1.5",
              isMobile ? "gap-1" : "gap-2"
            )}>
              {getProductionStatusBadge()}
               <HealthStatusBadge 
              healthStatus={animalData.health_status || undefined}
              size={isMobile ? "sm" : "md"}
              showIcon={true}
              showPulse={true}
            />
            </div>
            
            {/* Primary Information - Always Visible */}
            <div className={cn(
              "grid gap-2",
              isMobile ? "grid-cols-1" : "space-y-2"
            )}>
              {primaryInfo.map((item, index) => {
                const IconComponent = item.icon
                return (
                  <div key={index} className={cn(
                    "flex items-center",
                    isMobile ? "text-sm" : "text-sm",
                    item.color
                  )}>
                    <IconComponent className={cn(
                      "flex-shrink-0 mr-2",
                      isMobile ? "w-4 h-4" : "w-4 h-4"
                    )} />
                    <span className="truncate">{item.text}</span>
                  </div>
                )
              })}
            </div>
            
            {/* Secondary Information - Collapsible on Mobile */}
            {secondaryInfo.length > 0 && (
              <>
                {(showAllInfo || !isMobile) && (
                  <div className={cn(
                    "grid gap-2",
                    isMobile ? "grid-cols-1" : "space-y-2"
                  )}>
                    {secondaryInfo.map((item, index) => {
                      const IconComponent = item.icon
                      return (
                        <div key={index} className={cn(
                          "flex items-center",
                          isMobile ? "text-sm" : "text-sm",
                          item.color
                        )}>
                          <IconComponent className={cn(
                            "flex-shrink-0 mr-2",
                            isMobile ? "w-4 h-4" : "w-4 h-4"
                          )} />
                          <span className="truncate">{item.text}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {/* Show More/Less Button for Mobile */}
                {isMobile && secondaryInfo.length > 0 && (
                  <button
                    onClick={() => setShowAllInfo(!showAllInfo)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {showAllInfo ? 'Show Less' : `Show More (${secondaryInfo.length})`}
                  </button>
                )}
              </>
            )}
            
            {/* Notes - Collapsible */}
            {animalData.notes && (
              <div className={cn(
                "text-xs text-gray-500 bg-gray-50 rounded-md",
                isMobile ? "p-2" : "p-2",
                showAllInfo || !isMobile ? "" : "line-clamp-1"
              )}>
                {animalData.notes}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className={cn(
              "flex pt-2 transition-opacity duration-200",
              isMobile 
                ? "space-x-2 opacity-100" // Always visible on mobile
                : "space-x-2 opacity-0 group-hover:opacity-100"
            )}>
              <Button 
                asChild 
                size={isMobile ? "default" : "sm"} 
                variant="outline" 
                className={cn(
                  "flex-1",
                  isMobile && "h-10 text-sm" // Larger touch target
                )}
              >
                <Link href={`/dashboard/animals/${animalData.id}`}>
                  <Eye className={cn("mr-2", isMobile ? "w-4 h-4" : "w-4 h-4")} />
                  View
                </Link>
              </Button>
              
              {isMobile ? (
                // Mobile: Dropdown menu for actions
                <div className="relative">
                  <Button 
                    size="default"
                    variant="outline"
                    className="h-10 px-3"
                    onClick={() => {
                      if (canEdit) {
                        setShowEditModal(true)
                      }
                    }}
                    disabled={!canEdit}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                // Desktop: Full edit button
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowEditModal(true)}
                  disabled={!canEdit}
                >
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