'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { HealthStatusBadge } from './HealthStatusBadge'
import { 
  AlertTriangle,
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
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Shield
} from 'lucide-react'

interface AnimalBasicInfoProps {
  animal: any
  canEdit: boolean
  onEditClick: () => void
}

export function AnimalBasicInfo({ animal, canEdit, onEditClick }: AnimalBasicInfoProps) {
  const [showAllSections, setShowAllSections] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['identification'])
  const [animalData, setAnimalData] = useState(animal)
  const { isMobile, isTouch } = useDeviceInfo()

  useEffect(() => {
    setAnimalData(animal)
  }, [animal])
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: isMobile ? '2-digit' : 'numeric',
      month: isMobile ? 'short' : 'long',
      day: 'numeric'
    })
  }
  
  const getSourceBadge = () => {
    if (animal.animal_source === 'newborn_calf') {
      return (
        <Badge className={cn(
          "bg-blue-100 text-blue-800",
          isMobile ? "text-xs px-2 py-0.5" : ""
        )}>
          <Baby className="w-3 h-3 mr-1" />
          {isMobile ? "Born" : "Born Here"}
        </Badge>
      )
    } else if (animal.animal_source === 'purchased_animal') {
      return (
        <Badge className={cn(
          "bg-green-100 text-green-800",
          isMobile ? "text-xs px-2 py-0.5" : ""
        )}>
          <ShoppingCart className="w-3 h-3 mr-1" />
          {isMobile ? "Bought" : "Purchased"}
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
      <Badge className={cn(
        statusColors[animal.production_status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800',
        isMobile ? "text-xs px-2 py-0.5" : ""
      )}>
        {animal.production_status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }
  
  const getHealthStatusBadge = () => {
    
    
    return (
      <HealthStatusBadge 
      healthStatus={animalData.health_status}
      size="md"
      showIcon={true}
      showPulse={true}
    />
    )
  }
  
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 'Unknown'
    
    const birth = new Date(birthDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - birth.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) {
      return isMobile ? `${diffDays}d` : `${diffDays} days old`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return isMobile ? `${months}mo` : `${months} month${months !== 1 ? 's' : ''} old`
    } else {
      const years = Math.floor(diffDays / 365)
      const remainingMonths = Math.floor((diffDays % 365) / 30)
      return isMobile 
        ? `${years}y ${remainingMonths}m`
        : `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''} old`
    }
  }

  // Mobile: Collapsible section component
  const CollapsibleSection = ({ 
    id, 
    title, 
    icon: Icon, 
    children, 
    defaultExpanded = false 
  }: {
    id: string
    title: string
    icon: any
    children: React.ReactNode
    defaultExpanded?: boolean
  }) => {
    const isExpanded = expandedSections.includes(id)
    
    if (!isMobile) {
      return (
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Icon className="w-4 h-4 mr-2" />
            {title}
          </h4>
          {children}
        </div>
      )
    }
    
    return (
      <div className="border-b border-gray-100 last:border-0">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between py-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm"
        >
          <h4 className="font-medium text-gray-900 flex items-center">
            <Icon className="w-4 h-4 mr-2" />
            {title}
          </h4>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>
        {isExpanded && (
          <div className="pb-4">
            {children}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className={cn(
      "grid gap-6",
      isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
    )}>
      {/* Basic Information Card */}
      <Card>
        <CardHeader className={cn(
          isMobile ? "px-4 py-3" : ""
        )}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={cn(
                "flex items-center space-x-2",
                isMobile ? "text-lg" : ""
              )}>
                <Tag className={cn(isMobile ? "w-4 h-4" : "w-5 h-5")} />
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription className={cn(
                isMobile ? "text-sm" : ""
              )}>
                Core animal details and identification
              </CardDescription>
            </div>
            {canEdit && (
              <Button 
                variant="outline" 
                size={isMobile ? "default" : "sm"} 
                onClick={onEditClick}
                className={cn(
                  isMobile && "h-9 px-3"
                )}
              >
                <Edit className={cn("mr-2", isMobile ? "w-3 h-3" : "w-4 h-4")} />
                {isMobile ? "Edit" : "Edit"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className={cn(
          isMobile ? "px-4 pb-4 space-y-0" : "space-y-6"
        )}>
          {/* Identification Section */}
          <CollapsibleSection id="identification" title="Identification" icon={Tag} defaultExpanded>
            <div className={cn(
              "grid gap-4",
              isMobile ? "grid-cols-1" : "grid-cols-2"
            )}>
              <div>
                <p className={cn(
                  "text-gray-600 mb-1",
                  isMobile ? "text-xs" : "text-sm"
                )}>Tag Number</p>
                <span className={cn(
                  "font-medium",
                  isMobile ? "text-sm" : ""
                )}>{animal.tag_number}</span>
              </div>
              
              <div>
                <p className={cn(
                  "text-gray-600 mb-1",
                  isMobile ? "text-xs" : "text-sm"
                )}>Name</p>
                <span className={cn(
                  "font-medium",
                  isMobile ? "text-sm" : ""
                )}>{animal.name || 'Not named'}</span>
              </div>
              
              <div>
                <p className={cn(
                  "text-gray-600 mb-1",
                  isMobile ? "text-xs" : "text-sm"
                )}>Breed</p>
                <span className={cn(
                  "font-medium capitalize",
                  isMobile ? "text-sm" : ""
                )}>{animal.breed || 'Not specified'}</span>
              </div>
              
              <div>
                <p className={cn(
                  "text-gray-600 mb-1",
                  isMobile ? "text-xs" : "text-sm"
                )}>Gender</p>
                <Badge variant="secondary" className={cn(
                  "capitalize",
                  isMobile ? "text-xs px-2 py-0.5" : ""
                )}>
                  {animal.gender}
                </Badge>
              </div>
            </div>
          </CollapsibleSection>
          
          {/* Source & Status Section */}
          <CollapsibleSection id="status" title="Source & Status" icon={Activity}>
            <div className="space-y-3">
              {animal.animal_source && (
                <div className={cn(
                  "flex items-center",
                  isMobile ? "justify-between" : "justify-between"
                )}>
                  <span className={cn(
                    "text-gray-600",
                    isMobile ? "text-sm" : "text-sm"
                  )}>Source:</span>
                  {getSourceBadge()}
                </div>
              )}
              
              <div className={cn(
                "flex items-center",
                isMobile ? "justify-between" : "justify-between"
              )}>
                <span className={cn(
                  "text-gray-600",
                  isMobile ? "text-sm" : "text-sm"
                )}>Status:</span>
                <Badge 
                  className={cn(
                    animal.status === 'active' ? 'bg-green-100 text-green-800' :
                    animal.status === 'pregnant' ? 'bg-blue-100 text-blue-800' :
                    animal.status === 'dry' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800',
                    isMobile ? "text-xs px-2 py-0.5" : ""
                  )}
                >
                  {animal.status}
                </Badge>
              </div>
              
              {animal.production_status && (
                <div className={cn(
                  "flex items-center",
                  isMobile ? "justify-between" : "justify-between"
                )}>
                  <span className={cn(
                    "text-gray-600",
                    isMobile ? "text-sm" : "text-sm"
                  )}>Production:</span>
                  {getProductionStatusBadge()}
                </div>
              )}
              
              {animal.health_status && (
                <div className={cn(
                  "flex items-center",
                  isMobile ? "justify-between" : "justify-between"
                )}>
                  <span className={cn(
                    "text-gray-600",
                    isMobile ? "text-sm" : "text-sm"
                  )}>Health:</span>
                  {getHealthStatusBadge()}
                </div>
              )}
            </div>
          </CollapsibleSection>
          
          {/* Physical Details Section */}
          <CollapsibleSection id="physical" title="Physical Details" icon={Weight}>
            <div className={cn(
              "grid gap-4",
              isMobile ? "grid-cols-1" : "grid-cols-2"
            )}>
              <div>
                <p className={cn(
                  "text-gray-600 mb-1",
                  isMobile ? "text-xs" : "text-sm"
                )}>Birth Date</p>
                <div className="flex items-center space-x-2">
                  <Calendar className={cn(
                    "text-gray-500",
                    isMobile ? "w-3 h-3" : "w-4 h-4"
                  )} />
                  <span className={cn(
                    "font-medium",
                    isMobile ? "text-sm" : ""
                  )}>{formatDate(animal.birth_date)}</span>
                </div>
                {animal.birth_date && (
                  <p className={cn(
                    "text-gray-500 mt-1",
                    isMobile ? "text-xs" : "text-xs"
                  )}>
                    {calculateAge(animal.birth_date)}
                  </p>
                )}
              </div>
              
              <div>
                <p className={cn(
                  "text-gray-600 mb-1",
                  isMobile ? "text-xs" : "text-sm"
                )}>Weight</p>
                <span className={cn(
                  "font-medium",
                  isMobile ? "text-sm" : ""
                )}>
                  {animal.weight ? `${animal.weight} kg` : 'Not recorded'}
                </span>
              </div>
              
              {animal.purchase_date && (
                <div className={cn(
                  isMobile ? "col-span-1" : "col-span-2"
                )}>
                  <p className={cn(
                    "text-gray-600 mb-1",
                    isMobile ? "text-xs" : "text-sm"
                  )}>Purchase Date</p>
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className={cn(
                      "text-gray-500",
                      isMobile ? "w-3 h-3" : "w-4 h-4"
                    )} />
                    <span className={cn(
                      "font-medium",
                      isMobile ? "text-sm" : ""
                    )}>{formatDate(animal.purchase_date)}</span>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
          
          {/* Parentage Information for Newborn Calves */}
          {animal.animal_source === 'newborn_calf' && (
            <CollapsibleSection id="parentage" title="Parentage" icon={Heart}>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={cn(
                    "text-gray-600",
                    isMobile ? "text-sm" : "text-sm"
                  )}>Mother (Dam):</span>
                  <span className={cn(
                    "font-medium",
                    isMobile ? "text-sm" : ""
                  )}>
                    {animal.mother?.name || animal.mother?.tag_number || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={cn(
                    "text-gray-600",
                    isMobile ? "text-sm" : "text-sm"
                  )}>Father (Sire):</span>
                  <span className={cn(
                    "font-medium",
                    isMobile ? "text-sm" : ""
                  )}>
                    {animal.father?.name || animal.father?.tag_number || 'Not recorded'}
                  </span>
                </div>
              </div>
            </CollapsibleSection>
          )}
          
          {/* Production Information for Lactating Animals */}
          {animal.production_status === 'lactating' && animal.current_daily_production && (
            <CollapsibleSection id="production" title="Current Production" icon={Droplets}>
              <div className="bg-green-50 p-3 rounded-md">
                <div className="flex justify-between items-center">
                  <span className={cn(
                    "text-green-700",
                    isMobile ? "text-sm" : "text-sm"
                  )}>Daily Production:</span>
                  <span className={cn(
                    "font-bold text-green-800",
                    isMobile ? "text-base" : "text-lg"
                  )}>
                    {animal.current_daily_production}L
                  </span>
                </div>
              </div>
            </CollapsibleSection>
          )}
          
          {/* Service Information for Served Animals */}
          {animal.production_status === 'served' && (animal.service_date || animal.service_method) && (
            <CollapsibleSection id="service" title="Service Information" icon={Activity}>
              <div className="space-y-2">
                {animal.service_date && (
                  <div className="flex justify-between">
                    <span className={cn(
                      "text-gray-600",
                      isMobile ? "text-sm" : "text-sm"
                    )}>Service Date:</span>
                    <span className={cn(
                      "font-medium",
                      isMobile ? "text-sm" : ""
                    )}>
                      {formatDate(animal.service_date)}
                    </span>
                  </div>
                )}
                {animal.service_method && (
                  <div className="flex justify-between">
                    <span className={cn(
                      "text-gray-600",
                      isMobile ? "text-sm" : "text-sm"
                    )}>Method:</span>
                    <Badge variant="outline" className={cn(
                      "capitalize",
                      isMobile ? "text-xs px-2 py-0.5" : ""
                    )}>
                      {animal.service_method.replace('_', ' ')}
                    </Badge>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}
        </CardContent>
      </Card>
      
      {/* Timeline & Additional Information */}
      <Card>
        <CardHeader className={cn(
          isMobile ? "px-4 py-3" : ""
        )}>
          <CardTitle className={cn(
            "flex items-center space-x-2",
            isMobile ? "text-lg" : ""
          )}>
            <Clock className={cn(isMobile ? "w-4 h-4" : "w-5 h-5")} />
            <span>{isMobile ? "Timeline" : "Timeline & History"}</span>
          </CardTitle>
          <CardDescription className={cn(
            isMobile ? "text-sm" : ""
          )}>
            Key events in this animal's life
          </CardDescription>
        </CardHeader>
        <CardContent className={cn(
          isMobile ? "px-4 pb-4" : ""
        )}>
          <div className="space-y-4">
            {/* Birth Event */}
            {animal.birth_date && (
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5" />
                <div className="flex-1">
                  <p className={cn(
                    "font-medium text-gray-900",
                    isMobile ? "text-sm" : ""
                  )}>Born</p>
                  <p className={cn(
                    "text-gray-600",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {formatDate(animal.birth_date)}
                  </p>
                  {animal.birth_date && (
                    <p className={cn(
                      "text-gray-500",
                      isMobile ? "text-xs" : "text-xs"
                    )}>
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
                  <p className={cn(
                    "font-medium text-gray-900",
                    isMobile ? "text-sm" : ""
                  )}>Purchased</p>
                  <p className={cn(
                    "text-gray-600",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {formatDate(animal.purchase_date)}
                  </p>
                  <p className={cn(
                    "text-gray-500",
                    isMobile ? "text-xs" : "text-xs"
                  )}>
                    Added to farm inventory
                  </p>
                </div>
              </div>
            )}
            
            {/* Farm Addition Event */}
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-farm-green rounded-full mt-1.5" />
              <div className="flex-1">
                <p className={cn(
                  "font-medium text-gray-900",
                  isMobile ? "text-sm" : ""
                )}>Added to Farm</p>
                <p className={cn(
                  "text-gray-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  {formatDate(animal.created_at)}
                </p>
                <p className={cn(
                  "text-gray-500",
                  isMobile ? "text-xs" : "text-xs"
                )}>
                  {isMobile ? "Registered in system" : "Registered in farm management system"}
                </p>
              </div>
            </div>
            
            {/* Service Event */}
            {animal.service_date && (
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full mt-1.5" />
                <div className="flex-1">
                  <p className={cn(
                    "font-medium text-gray-900",
                    isMobile ? "text-sm" : ""
                  )}>Served</p>
                  <p className={cn(
                    "text-gray-600",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {formatDate(animal.service_date)}
                  </p>
                  <p className={cn(
                    "text-gray-500",
                    isMobile ? "text-xs" : "text-xs"
                  )}>
                    {animal.service_method?.replace('_', ' ') || 'Breeding service'}
                  </p>
                </div>
              </div>
            )}
            
            {/* Future Events Placeholder */}
            <div className="flex items-start space-x-3 opacity-50">
              <div className="w-3 h-3 bg-gray-300 rounded-full mt-1.5" />
              <div className="flex-1">
                <p className={cn(
                  "text-gray-500 italic",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  {isMobile 
                    ? "More events will appear with records"
                    : "More events will appear as you add health and production records"
                  }
                </p>
              </div>
            </div>
          </div>
          
          {/* Additional Notes Section */}
          {animal.notes && (
            <div className={cn(
              "pt-6 border-t",
              isMobile ? "mt-4" : "mt-6"
            )}>
              <h4 className={cn(
                "font-medium text-gray-900 mb-2 flex items-center",
                isMobile ? "text-sm" : ""
              )}>
                <FileText className="w-4 h-4 mr-2" />
                Notes
              </h4>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className={cn(
                  "text-gray-700 whitespace-pre-wrap",
                  isMobile ? "text-sm" : "text-sm"
                )}>{animal.notes}</p>
              </div>
            </div>
          )}
          
          {/* Quick Actions */}
          <div className={cn(
            "pt-6 border-t",
            isMobile ? "mt-4" : "mt-6"
          )}>
            <h4 className={cn(
              "font-medium text-gray-900 mb-3",
              isMobile ? "text-sm" : ""
            )}>Quick Actions</h4>
            <div className={cn(
              "grid gap-2",
              isMobile ? "grid-cols-1" : "grid-cols-2"
            )}>
              <Button 
                variant="outline" 
                size={isMobile ? "default" : "sm"} 
                className={cn(
                  isMobile ? "text-sm h-10 justify-start" : "text-xs"
                )}
              >
                <Plus className={cn("mr-2", isMobile ? "w-4 h-4" : "w-3 h-3")} />
                Add Health Record
              </Button>
              <Button 
                variant="outline" 
                size={isMobile ? "default" : "sm"} 
                className={cn(
                  isMobile ? "text-sm h-10 justify-start" : "text-xs"
                )}
              >
                <Plus className={cn("mr-2", isMobile ? "w-4 h-4" : "w-3 h-3")} />
                Record Production
              </Button>
              {canEdit && (
                <Button 
                  variant="outline" 
                  size={isMobile ? "default" : "sm"} 
                  className={cn(
                    isMobile ? "text-sm h-10 justify-start" : "text-xs"
                  )} 
                  onClick={onEditClick}
                >
                  <Edit className={cn("mr-2", isMobile ? "w-4 h-4" : "w-3 h-3")} />
                  Edit Details
                </Button>
              )}
              <Button 
                variant="outline" 
                size={isMobile ? "default" : "sm"} 
                className={cn(
                  isMobile ? "text-sm h-10 justify-start" : "text-xs"
                )}
              >
                <FileText className={cn("mr-2", isMobile ? "w-4 h-4" : "w-3 h-3")} />
                View Full History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}