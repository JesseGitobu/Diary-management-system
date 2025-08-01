// src/components/animals/AnimalHealthRecords.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AddHealthRecordModal } from '@/components/animals/AddHealthRecordModal'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { 
  Plus, 
  Calendar, 
  User, 
  DollarSign,
  FileText,
  Heart,
  Shield,
  Stethoscope,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  Search
} from 'lucide-react'

interface AnimalHealthRecordsProps {
  animalId: string
  canAddRecords: boolean
}

interface HealthRecord {
  id: string
  record_date: string
  record_type: string
  description: string
  veterinarian?: string
  cost?: number
  notes?: string
  created_at: string
}

export function AnimalHealthRecords({ animalId, canAddRecords }: AnimalHealthRecordsProps) {
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  
  const { isMobile, isTouch } = useDeviceInfo()
  
  useEffect(() => {
    loadHealthRecords()
  }, [animalId])
  
  const loadHealthRecords = async () => {
    try {
      const response = await fetch(`/api/animals/${animalId}/health-records`)
      if (response.ok) {
        const data = await response.json()
        setHealthRecords(data.records || [])
      }
    } catch (error) {
      console.error('Error loading health records:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleRecordAdded = (newRecord: HealthRecord) => {
    setHealthRecords(prev => [newRecord, ...prev])
    setShowAddModal(false)
  }
  
  const toggleRecordExpansion = (recordId: string) => {
    setExpandedRecords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recordId)) {
        newSet.delete(recordId)
      } else {
        newSet.add(recordId)
      }
      return newSet
    })
  }
  
  const getRecordTypeIcon = (type: string, className?: string) => {
    const iconClass = cn("flex-shrink-0", className || (isMobile ? "w-4 h-4" : "w-4 h-4"))
    
    switch (type) {
      case 'vaccination': return <Shield className={cn(iconClass, "text-blue-600")} />
      case 'treatment': return <Stethoscope className={cn(iconClass, "text-green-600")} />
      case 'checkup': return <Heart className={cn(iconClass, "text-purple-600")} />
      case 'injury': return <AlertTriangle className={cn(iconClass, "text-orange-600")} />
      case 'illness': return <AlertTriangle className={cn(iconClass, "text-red-600")} />
      default: return <FileText className={cn(iconClass, "text-gray-600")} />
    }
  }
  
  const getRecordTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      vaccination: 'bg-blue-100 text-blue-800',
      treatment: 'bg-green-100 text-green-800',
      checkup: 'bg-purple-100 text-purple-800',
      injury: 'bg-orange-100 text-orange-800',
      illness: 'bg-red-100 text-red-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }
  
  const getRecordTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vaccination: 'Vaccination',
      treatment: 'Treatment',
      checkup: 'Checkup',
      injury: 'Injury',
      illness: 'Illness',
    }
    return labels[type] || type
  }
  
  const filteredRecords = healthRecords.filter(record => 
    filterType === 'all' || record.record_type === filterType
  )
  
  const recordTypes = ['all', 'vaccination', 'treatment', 'checkup', 'injury', 'illness']
  
  const summaryStats = {
    vaccinations: healthRecords.filter(r => r.record_type === 'vaccination').length,
    treatments: healthRecords.filter(r => r.record_type === 'treatment').length,
    checkups: healthRecords.filter(r => r.record_type === 'checkup').length,
    totalCost: healthRecords.reduce((sum, r) => sum + (r.cost || 0), 0)
  }
  
  if (loading) {
    return (
      <Card>
        <CardContent className={cn("text-center", isMobile ? "p-4" : "p-8")}>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className={cn("space-y-4", isMobile ? "space-y-4" : "space-y-6")}>
      {/* Header */}
      <div className={cn(
        "flex justify-between",
        isMobile ? "flex-col space-y-3" : "items-center"
      )}>
        <div>
          <h3 className={cn(
            "font-medium text-gray-900",
            isMobile ? "text-lg" : "text-lg"
          )}>
            Health Records
          </h3>
          <p className={cn(
            "text-gray-600",
            isMobile ? "text-sm" : "text-sm"
          )}>
            Track vaccinations, treatments, and health checkups
          </p>
        </div>
        
        <div className={cn(
          "flex gap-2",
          isMobile ? "flex-col" : "items-center"
        )}>
          {/* Mobile: Filter Toggle */}
          {isMobile && filteredRecords.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full justify-between"
            >
              <div className="flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filter ({filterType === 'all' ? 'All' : getRecordTypeLabel(filterType)})
              </div>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
          
          {canAddRecords && (
            <Button 
              onClick={() => setShowAddModal(true)}
              size={isMobile ? "default" : "default"}
              className={cn(isMobile && "w-full h-10")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Record
            </Button>
          )}
        </div>
      </div>
      
      {/* Mobile Filter Options */}
      {isMobile && showFilters && (
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-2">
              {recordTypes.map((type) => (
                <Button
                  key={type}
                  variant={filterType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFilterType(type)
                    setShowFilters(false)
                  }}
                  className="justify-start text-xs"
                >
                  {type !== 'all' && getRecordTypeIcon(type, "w-3 h-3 mr-1")}
                  {type === 'all' ? 'All Records' : getRecordTypeLabel(type)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Health Summary */}
      <div className={cn(
        "grid gap-3",
        isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-4 gap-4"
      )}>
        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className={cn(
              "flex items-center",
              isMobile ? "space-x-2" : "space-x-2"
            )}>
              <Shield className={cn(
                "text-blue-600",
                isMobile ? "w-4 h-4" : "w-5 h-5"
              )} />
              <div>
                <p className={cn(
                  "text-gray-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  Vaccinations
                </p>
                <p className={cn(
                  "font-medium",
                  isMobile ? "text-sm" : "text-base"
                )}>
                  {summaryStats.vaccinations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className={cn(
              "flex items-center",
              isMobile ? "space-x-2" : "space-x-2"
            )}>
              <Stethoscope className={cn(
                "text-green-600",
                isMobile ? "w-4 h-4" : "w-5 h-5"
              )} />
              <div>
                <p className={cn(
                  "text-gray-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  Treatments
                </p>
                <p className={cn(
                  "font-medium",
                  isMobile ? "text-sm" : "text-base"
                )}>
                  {summaryStats.treatments}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className={cn(
              "flex items-center",
              isMobile ? "space-x-2" : "space-x-2"
            )}>
              <Heart className={cn(
                "text-purple-600",
                isMobile ? "w-4 h-4" : "w-5 h-5"
              )} />
              <div>
                <p className={cn(
                  "text-gray-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  Checkups
                </p>
                <p className={cn(
                  "font-medium",
                  isMobile ? "text-sm" : "text-base"
                )}>
                  {summaryStats.checkups}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className={cn(
              "flex items-center",
              isMobile ? "space-x-2" : "space-x-2"
            )}>
              <DollarSign className={cn(
                "text-green-600",
                isMobile ? "w-4 h-4" : "w-5 h-5"
              )} />
              <div>
                <p className={cn(
                  "text-gray-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  Total Cost
                </p>
                <p className={cn(
                  "font-medium",
                  isMobile ? "text-sm" : "text-base"
                )}>
                  ${summaryStats.totalCost.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Desktop Filter Tabs */}
      {!isMobile && filteredRecords.length > 0 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {recordTypes.map((type) => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type)}
              className="whitespace-nowrap"
            >
              {type !== 'all' && getRecordTypeIcon(type, "w-3 h-3 mr-1")}
              {type === 'all' ? 'All Records' : getRecordTypeLabel(type)}
            </Button>
          ))}
        </div>
      )}
      
      {/* Health Records List */}
      <Card>
        <CardHeader className={cn(isMobile ? "p-4 pb-2" : "")}>
          <CardTitle className={cn(isMobile ? "text-base" : "")}>
            Health History
          </CardTitle>
          <CardDescription className={cn(isMobile ? "text-sm" : "")}>
            {filterType === 'all' 
              ? 'Chronological record of all health-related events'
              : `${getRecordTypeLabel(filterType)} records`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className={cn(isMobile ? "p-4 pt-2" : "")}>
          {filteredRecords.length === 0 ? (
            <div className={cn(
              "text-center",
              isMobile ? "py-6" : "py-8"
            )}>
              <Heart className={cn(
                "mx-auto text-gray-400",
                isMobile ? "h-8 w-8" : "h-12 w-12"
              )} />
              <h3 className={cn(
                "mt-2 font-medium text-gray-900",
                isMobile ? "text-sm" : "text-sm"
              )}>
                {filterType === 'all' ? 'No health records' : `No ${getRecordTypeLabel(filterType).toLowerCase()} records`}
              </h3>
              <p className={cn(
                "mt-1 text-gray-500",
                isMobile ? "text-xs" : "text-sm"
              )}>
                {filterType === 'all' 
                  ? "Start tracking this animal's health by adding the first record."
                  : `No ${getRecordTypeLabel(filterType).toLowerCase()} records found for this animal.`
                }
              </p>
              {canAddRecords && filterType === 'all' && (
                <Button 
                  onClick={() => setShowAddModal(true)}
                  className={cn(
                    "mt-4",
                    isMobile && "text-sm h-9"
                  )}
                  size={isMobile ? "sm" : "default"}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Record
                </Button>
              )}
            </div>
          ) : (
            <div className={cn(isMobile ? "space-y-3" : "space-y-4")}>
              {filteredRecords.map((record) => {
                const isExpanded = expandedRecords.has(record.id)
                const hasAdditionalInfo = record.notes || record.veterinarian
                
                return (
                  <div 
                    key={record.id} 
                    className={cn(
                      "border border-gray-200 rounded-lg transition-colors",
                      isMobile ? "p-3" : "p-4",
                      isTouch ? "active:bg-gray-50" : "hover:bg-gray-50"
                    )}
                  >
                    <div className={cn(
                      "flex items-start",
                      isMobile ? "space-x-3" : "space-x-4"
                    )}>
                      <div className="flex-shrink-0 mt-1">
                        {getRecordTypeIcon(record.record_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Header Row */}
                        <div className={cn(
                          "flex justify-between mb-2",
                          isMobile ? "flex-col space-y-1" : "items-center"
                        )}>
                          <div className={cn(
                            "flex items-center",
                            isMobile ? "flex-wrap gap-1" : "space-x-2"
                          )}>
                            <Badge className={cn(
                              getRecordTypeBadge(record.record_type),
                              isMobile ? "text-xs px-2 py-0.5" : ""
                            )}>
                              {getRecordTypeLabel(record.record_type)}
                            </Badge>
                            <span className={cn(
                              "text-gray-500",
                              isMobile ? "text-xs" : "text-sm"
                            )}>
                              {new Date(record.record_date).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className={cn(
                            "flex items-center",
                            isMobile ? "justify-between w-full" : "space-x-2"
                          )}>
                            {record.cost && (
                              <span className={cn(
                                "font-medium text-gray-900",
                                isMobile ? "text-sm" : "text-sm"
                              )}>
                                ${record.cost.toFixed(2)}
                              </span>
                            )}
                            
                            {/* Mobile: Expand button for additional info */}
                            {isMobile && hasAdditionalInfo && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRecordExpansion(record.id)}
                                className="h-6 w-6 p-0"
                              >
                                {isExpanded ? 
                                  <ChevronUp className="w-4 h-4" /> : 
                                  <ChevronDown className="w-4 h-4" />
                                }
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Description */}
                        <h4 className={cn(
                          "font-medium text-gray-900 mb-1",
                          isMobile ? "text-sm" : "text-base"
                        )}>
                          {record.description}
                        </h4>
                        
                        {/* Additional Info - Always visible on desktop, collapsible on mobile */}
                        {((!isMobile) || (isMobile && isExpanded)) && (
                          <div className={cn(isMobile ? "space-y-1 mt-2" : "space-y-1")}>
                            {record.veterinarian && (
                              <p className={cn(
                                "text-gray-600 flex items-center",
                                isMobile ? "text-xs" : "text-sm"
                              )}>
                                <User className="w-3 h-3 mr-1 flex-shrink-0" />
                                Dr. {record.veterinarian}
                              </p>
                            )}
                            
                            {record.notes && (
                              <p className={cn(
                                "text-gray-600",
                                isMobile ? "text-xs" : "text-sm"
                              )}>
                                {record.notes}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Mobile: Show hint for expandable content */}
                        {isMobile && hasAdditionalInfo && !isExpanded && (
                          <button
                            onClick={() => toggleRecordExpansion(record.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                          >
                            Show details
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add Record Modal */}
      {showAddModal && (
        <AddHealthRecordModal
          animalId={animalId}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onRecordAdded={handleRecordAdded}
        />
      )}
    </div>
  )
}