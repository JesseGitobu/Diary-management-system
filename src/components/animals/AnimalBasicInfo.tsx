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
  Shield,
  Syringe,
  DollarSign
} from 'lucide-react'

interface AnimalBasicInfoProps {
  animal: any
  canEdit: boolean
  onEditClick: () => void
  onViewFullHistory?: () => void
}

export function AnimalBasicInfo({ animal, canEdit, onEditClick, onViewFullHistory }: AnimalBasicInfoProps) {
  const [showAllSections, setShowAllSections] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['identification'])
  const [animalData, setAnimalData] = useState(animal)
  const { isMobile, isTouch } = useDeviceInfo()

  useEffect(() => {
    setAnimalData(animal)
  }, [animal])

  // ========== DEBUG LOGGING ==========
  useEffect(() => {
    console.log('[AnimalBasicInfo] === COMPONENT DEBUG ===')
    console.log('[AnimalBasicInfo] Animal received:', {
      id: animal.id,
      tag: animal.tag_number,
      name: animal.name,
      source: animal.animal_source,
      productionStatus: animal.production_status,
    })
    
    console.log('[AnimalBasicInfo] Purchase info:', {
      purchase_date: animal.purchase_date,
      purchase_price: animal.purchase_price,
      seller_info: animal.seller_info,
      seller_contact: animal.seller_contact,
      previous_farm_tag: animal.previous_farm_tag,
      origin_dam_tag: animal.origin_dam_tag,
      origin_dam_name: animal.origin_dam_name,
      origin_sire_tag: animal.origin_sire_tag,
      origin_sire_name: animal.origin_sire_name,
    })
    
    console.log('[AnimalBasicInfo] Lactation info:', {
      lactation_number: animal.lactation_number,
      lactation_start_date: animal.lactation_start_date,
      lactation_expected_end: animal.lactation_expected_end,
      days_in_milk: animal.days_in_milk,
      current_daily_production: animal.current_daily_production,
    })
    
    console.log('[AnimalBasicInfo] === END DEBUG ===')
  }, [animal])
  // ========== END DEBUG LOGGING ==========

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
      steaming_dry_cows: 'bg-orange-100 text-orange-800',
      open_culling_dry_cows: 'bg-gray-100 text-gray-800',
      bull: 'bg-blue-100 text-blue-800',
    }

    const statusLabels: Record<string, string> = {
      calf: 'Calf',
      heifer: 'Heifer',
      served: isMobile ? 'In Calf' : 'In Calf (Served)',
      lactating: 'Lactating',
      steaming_dry_cows: 'Steaming Dry',
      open_culling_dry_cows: 'Open Culling',
      bull: 'Bull'
    }

    if (!animal.production_status) return null

    return (
      <Badge className={cn(
        statusColors[animal.production_status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800',
        isMobile ? "text-xs px-2 py-0.5" : ""
      )}>
        {statusLabels[animal.production_status] || animal.production_status.replace('_', ' ').toUpperCase()}
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
                )}>{animal.tag_number || 'N/A'}</span>
              </div>

              <div>
                <p className={cn(
                  "text-gray-600 mb-1",
                  isMobile ? "text-xs" : "text-sm"
                )}>Name</p>
                <span className={cn(
                  "font-medium",
                  isMobile ? "text-sm" : ""
                )}>{animal.name || 'N/A'}</span>
              </div>

              <div>
                <p className={cn(
                  "text-gray-600 mb-1",
                  isMobile ? "text-xs" : "text-sm"
                )}>Breed</p>
                <span className={cn(
                  "font-medium capitalize",
                  isMobile ? "text-sm" : ""
                )}>{animal.breed && animal.breed !== 'unknown' ? animal.breed : 'N/A'}</span>
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
                  {animal.gender || 'N/A'}
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

              <div className={cn(
                "flex items-center",
                isMobile ? "justify-between" : "justify-between"
              )}>
                <span className={cn(
                  "text-gray-600",
                  isMobile ? "text-sm" : "text-sm"
                )}>Production:</span>
                {animal.production_status ? getProductionStatusBadge() : <span className="text-gray-500 text-sm">N/A</span>}
              </div>

              <div className={cn(
                "flex items-center",
                isMobile ? "justify-between" : "justify-between"
              )}>
                <span className={cn(
                  "text-gray-600",
                  isMobile ? "text-sm" : "text-sm"
                )}>Health:</span>
                {animal.health_status ? getHealthStatusBadge() : <span className="text-gray-500 text-sm">N/A</span>}
              </div>
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
                  {animal.weight ? `${animal.weight} kg` : 'N/A'}
                </span>
              </div>

              {/* Parentage Information for purchased animals */}
              {animal.animal_source === 'purchased_animal' && (
                <>
                  {/* Purchase Information */}
                  <CollapsibleSection id="purchase" title="Purchase Information" icon={ShoppingCart}>
                    <div className="space-y-3">
                      {animal.purchase_date ? (
                        <div>
                          <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Purchase Date</p>
                          <div className="flex items-center space-x-2">
                            <Calendar className={cn("text-gray-500", isMobile ? "w-3 h-3" : "w-4 h-4")} />
                            <span className={cn("font-medium", isMobile ? "text-sm" : "")}>{formatDate(animal.purchase_date)}</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Purchase Date</p>
                          <span className="text-gray-500 text-sm">N/A</span>
                        </div>
                      )}
                      {animal.purchase_price ? (
                        <div>
                          <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Purchase Price</p>
                          <span className={cn("font-medium", isMobile ? "text-sm" : "")}>
                            KSh {animal.purchase_price.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Purchase Price</p>
                          <span className="text-gray-500 text-sm">N/A</span>
                        </div>
                      )}
                      {animal.seller_info ? (
                        <div>
                          <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Seller</p>
                          <span className={cn("font-medium", isMobile ? "text-sm" : "")}>
                            {animal.seller_info}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Seller</p>
                          <span className="text-gray-500 text-sm">N/A</span>
                        </div>
                      )}
                      {animal.seller_contact ? (
                        <div>
                          <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Seller Contact</p>
                          <span className={cn("font-medium", isMobile ? "text-sm" : "")}>
                            {animal.seller_contact}
                          </span>
                        </div>
                      ) : null}
                      {animal.previous_farm_tag ? (
                        <div>
                          <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Previous Farm Tag</p>
                          <span className={cn("font-medium", isMobile ? "text-sm" : "")}>
                            {animal.previous_farm_tag}
                          </span>
                        </div>
                      ) : null}

                      {/* Origin Parentage Info */}
                      {(animal.origin_dam_tag || animal.origin_dam_name || animal.origin_sire_tag || animal.origin_sire_name) && (
                        <div className="pt-3 border-t border-gray-100">
                          <p className={cn("text-gray-600 mb-2 font-medium", isMobile ? "text-xs" : "text-sm")}>Origin Parentage</p>
                          <div className="space-y-2">
                            {animal.origin_dam_tag ? (
                              <div>
                                <p className={cn("text-gray-600 text-xs", isMobile ? "text-xs" : "text-xs")}>Dam at Origin</p>
                                <span className={cn("text-sm", isMobile ? "text-sm" : "")}>
                                  {animal.origin_dam_name ? `${animal.origin_dam_name} (${animal.origin_dam_tag})` : animal.origin_dam_tag}
                                </span>
                              </div>
                            ) : null}
                            {animal.origin_sire_tag ? (
                              <div>
                                <p className={cn("text-gray-600 text-xs", isMobile ? "text-xs" : "text-xs")}>Sire at Origin</p>
                                <span className={cn("text-sm", isMobile ? "text-sm" : "")}>
                                  {animal.origin_sire_name ? `${animal.origin_sire_name} (${animal.origin_sire_tag})` : animal.origin_sire_tag}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                </>
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
                    {/* For newborn calves, use dam info from calf_records */}
                    {animal.calf_info?.dam_name ? animal.calf_info.dam_name : 
                     animal.calf_info?.dam_tag_number ? animal.calf_info.dam_tag_number :
                     /* Fallback to mother FK from animals table */
                     animal.mother?.name ? animal.mother.name :
                     animal.mother?.tag_number ? animal.mother.tag_number : 'Unknown'}
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
                    {/* For newborn calves, use sire info from calf_records */}
                    {animal.calf_info?.sire_name ? animal.calf_info.sire_name :
                     animal.calf_info?.sire_tag ? animal.calf_info.sire_tag :
                     /* Fallback to father FK from animals table */
                     animal.father?.name ? animal.father.name :
                     animal.father?.tag_number ? animal.father.tag_number : 'Not recorded'}
                  </span>
                </div>
                
                {/* Birth Details from Calf Record */}
                {animal.calf_info && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className={cn("text-gray-600 mb-2 font-medium", isMobile ? "text-xs" : "text-sm")}>Birth Details</p>
                    <div className="text-sm text-gray-700 space-y-1">
                      {animal.calf_info.birth_weight ? (
                        <p>Birth Weight: {animal.calf_info.birth_weight} kg</p>
                      ) : (
                        <p>Birth Weight: N/A</p>
                      )}
                      {animal.calf_info.breed ? (
                        <p>Breed: {animal.calf_info.breed}</p>
                      ) : (
                        <p>Breed: N/A</p>
                      )}
                      {animal.calf_info.health_status ? (
                        <p>Health at Birth: {animal.calf_info.health_status}</p>
                      ) : (
                        <p>Health at Birth: N/A</p>
                      )}
                      {animal.calf_info.weaning_date ? (
                        <p>Weaned: {formatDate(animal.calf_info.weaning_date)} ({animal.calf_info.weaning_weight || 'N/A'}kg)</p>
                      ) : (
                        <p>Weaning: Not yet weaned</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Production Information for Lactating Animals */}
          {(['served', 'lactating', 'steaming_dry_cows', 'open_culling_dry_cows', 'dry'].includes(animal.production_status)) && (
            <CollapsibleSection id="production" title="Production Information" icon={Droplets}>
              <div className="space-y-3">
                {/* Lactation Cycle Information */}
                <div>
                  <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Lactation Number</p>
                  <span className={cn("font-medium", isMobile ? "text-sm" : "")}>
                    {animal.lactation_number ? `Lactation ${animal.lactation_number}` : 'N/A'}
                  </span>
                </div>
                {animal.lactation_start_date && (
                  <div>
                    <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Lactation Start</p>
                    <span className={cn("font-medium", isMobile ? "text-sm" : "")}>
                      {formatDate(animal.lactation_start_date)}
                    </span>
                  </div>
                )}
                {animal.lactation_expected_end && (
                  <div>
                    <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Expected End</p>
                    <span className={cn("font-medium", isMobile ? "text-sm" : "")}>
                      {formatDate(animal.lactation_expected_end)}
                    </span>
                  </div>
                )}
                {animal.current_daily_production ? (
                  <div>
                    <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Current Daily Production</p>
                    <div className="flex items-center space-x-2">
                      <Droplets className={cn("text-gray-500", isMobile ? "w-3 h-3" : "w-4 h-4")} />
                      <span className={cn("font-medium", isMobile ? "text-sm" : "")}>
                        {animal.current_daily_production}L per day
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Current Daily Production</p>
                    <span className="text-gray-500 text-sm">N/A</span>
                  </div>
                )}
                {animal.days_in_milk ? (
                  <div>
                    <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Days in Milk</p>
                    <span className={cn("font-medium", isMobile ? "text-sm" : "")}>
                      {animal.days_in_milk} days
                    </span>
                  </div>
                ) : (
                  animal.production_status === 'lactating' && (
                    <div>
                      <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Days in Milk</p>
                      <span className="text-gray-500 text-sm">N/A</span>
                    </div>
                  )
                )}
                
                {/* Service Information - Hidden for lactating animals */}
                {animal.service_date && animal.production_status !== 'lactating' ? (
                  <div className="pt-3 border-t border-gray-100">
                    <p className={cn("text-gray-600 mb-2 font-medium", isMobile ? "text-xs" : "text-sm")}>Service History</p>
                    <div>
                      <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Service Date</p>
                      <div className="flex items-center space-x-2">
                        <Syringe className={cn("text-gray-500", isMobile ? "w-3 h-3" : "w-4 h-4")} />
                        <span className={cn("font-medium", isMobile ? "text-sm" : "")}>{formatDate(animal.service_date)}</span>
                      </div>
                    </div>
                    {animal.service_method && (
                      <div className="mt-2">
                        <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Service Method</p>
                        <Badge className="capitalize text-xs">{animal.service_method.replace('_', ' ')}</Badge>
                      </div>
                    )}
                  </div>
                ) : null}
                
                {/* Expected/Recent Calving - Hidden for lactating animals */}
                {animal.expected_calving_date && animal.production_status !== 'lactating' && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Expected Calving Date</p>
                    <div className="flex items-center space-x-2">
                      <Baby className={cn("text-gray-500", isMobile ? "w-3 h-3" : "w-4 h-4")} />
                      <span className={cn("font-medium", isMobile ? "text-sm" : "")}>{formatDate(animal.expected_calving_date)}</span>
                    </div>
                  </div>
                )}
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

            {/* Calving Events (Latest) */}
            {animal.latest_calving && (
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-rose-500 rounded-full mt-1.5" />
                <div className="flex-1">
                  <p className={cn(
                    "font-medium text-gray-900",
                    isMobile ? "text-sm" : ""
                  )}>Calved</p>
                  <p className={cn(
                    "text-gray-600",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {animal.latest_calving.calving_date ? formatDate(animal.latest_calving.calving_date) : 'Date pending'}
                  </p>
                  <div className={cn(
                    "text-gray-500 space-y-1",
                    isMobile ? "text-xs" : "text-xs"
                  )}>
                    {animal.latest_calving.calving_difficulty && (
                      <p>Difficulty: {animal.latest_calving.calving_difficulty}</p>
                    )}
                    {animal.latest_calving.assistance_required && (
                      <p>Assistance: Yes</p>
                    )}
                    <p>
                      {animal.latest_calving.calf_alive ? '✓ Calf alive' : animal.latest_calving.calf_alive === false ? '✗ Calf lost' : 'Calf status: N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* All Calving History (if more than 1) */}
            {animal.calving_history && animal.calving_history.length > 1 && (
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-rose-300 rounded-full mt-1.5" />
                <div className="flex-1">
                  <p className={cn(
                    "font-medium text-gray-900",
                    isMobile ? "text-sm" : ""
                  )}>Calving History</p>
                  <p className={cn(
                    "text-gray-600",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {animal.calving_history.length} total calving event{animal.calving_history.length !== 1 ? 's' : ''}
                  </p>
                  <p className={cn(
                    "text-gray-500",
                    isMobile ? "text-xs" : "text-xs"
                  )}>
                    Latest: {animal.latest_calving.calving_date ? formatDate(animal.latest_calving.calving_date) : 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {/* Steaming/Dry-off Event */}
            {['steaming_dry_cows', 'open_culling_dry_cows', 'dry'].includes(animal.production_status) && animal.latest_calving?.steaming_date && (
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full mt-1.5" />
                <div className="flex-1">
                  <p className={cn(
                    "font-medium text-gray-900",
                    isMobile ? "text-sm" : ""
                  )}>Steaming/Dry-off</p>
                  <p className={cn(
                    "text-gray-600",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {formatDate(animal.latest_calving.steaming_date)}
                  </p>
                  <div className={cn(
                    "text-gray-500 space-y-1",
                    isMobile ? "text-xs" : "text-xs"
                  )}>
                    {animal.latest_calving.colostrum_produced && (
                      <p>Colostrum: {animal.latest_calving.colostrum_produced}L</p>
                    )}
                    <p>Preparation period for next lactation</p>
                  </div>
                </div>
              </div>
            )}

            {/* Release/Sale Event */}
            {animal.release_info && (
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5" />
                <div className="flex-1">
                  <p className={cn(
                    "font-medium text-gray-900",
                    isMobile ? "text-sm" : ""
                  )}>
                    {animal.release_info.release_reason === 'sold' ? 'Sold' : 
                     animal.release_info.release_reason === 'died' || animal.release_info.release_reason === 'deceased' ? 'Deceased' :
                     animal.release_info.release_reason === 'transferred' ? 'Transferred' :
                     animal.release_info.release_reason === 'culled' ? 'Culled' : 
                     animal.release_info.release_reason === 'retired' ? 'Retired' : 'Released'}
                  </p>
                  <p className={cn(
                    "text-gray-600",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {formatDate(animal.release_info.release_date || animal.release_info.release_date)}
                  </p>
                  <div className={cn(
                    "text-gray-500 space-y-1",
                    isMobile ? "text-xs" : "text-xs"
                  )}>
                    {animal.release_info.buyer_name && (
                      <p>Buyer: {animal.release_info.buyer_name}</p>
                    )}
                    {animal.release_info.sale_price && (
                      <p>Price: KSh {animal.release_info.sale_price.toLocaleString()}</p>
                    )}
                    {animal.release_info.death_cause && (
                      <p>Cause: {animal.release_info.death_cause}</p>
                    )}
                    {animal.release_info.notes && (
                      <p>Notes: {animal.release_info.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Future Events Placeholder */}
            {!animal.release_info && (
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
            )}
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
                onClick={onViewFullHistory}
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