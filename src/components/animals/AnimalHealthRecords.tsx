// src/components/animals/AnimalHealthRecords.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AddHealthRecordModal } from '@/components/health/AddHealthRecordModal'
import { FollowUpHealthRecordModal } from '@/components/health/FollowUpHealthRecordModal'
import { EditHealthRecordModal } from '@/components/health/EditHealthRecordModal'
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
  Search,
  Edit,
  Trash2,
  Activity,
  CheckCircle,
  Clock,
  X
} from 'lucide-react'

interface AnimalHealthRecordsProps {
  animalId: string
  farmId: string
  animals: any[]
  canAddRecords: boolean
}

interface HealthRecord {
  id: string
  record_date: string
  record_type: "vaccination" | "treatment" | "checkup" | "injury" | "illness"
  description: string
  veterinarian?: string
  cost?: number
  notes?: string
  next_due_date?: string
  medication?: string
  severity?: "high" | "medium" | "low"
  created_at: string
  updated_at?: string
  animal_id: string
  animals?: {
    id: string
    tag_number: string
    name?: string
    breed?: string
  }
}

export function AnimalHealthRecords({ animalId, farmId, animals, canAddRecords }: AnimalHealthRecordsProps) {
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null)
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null)
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

  const handleFollowUpAdded = (followUpRecord: HealthRecord) => {
    setHealthRecords(prev => [followUpRecord, ...prev])
    setShowFollowUpModal(false)
    setSelectedRecord(null)
  }

  const handleRecordUpdated = (updatedRecord: HealthRecord) => {
    setHealthRecords(prev => 
      prev.map(record => 
        record.id === updatedRecord.id ? updatedRecord : record
      )
    )
    setShowEditModal(false)
    setSelectedRecord(null)
  }
  
  const handleEdit = (record: HealthRecord) => {
    setSelectedRecord(record)
    setShowEditModal(true)
  }

  const handleFollowUp = (record: HealthRecord) => {
    setSelectedRecord(record)
    setShowFollowUpModal(true)
  }
  
  const handleDelete = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to delete this health record? This action cannot be undone.')) {
      return
    }

    setDeletingRecordId(recordId)
    try {
      const response = await fetch(`/api/health/records/${recordId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setHealthRecords(prev => prev.filter(record => record.id !== recordId))
      } else {
        throw new Error('Failed to delete health record')
      }
    } catch (error) {
      console.error('Error deleting health record:', error)
      // You might want to show a toast notification here
    } finally {
      setDeletingRecordId(null)
    }
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
      vaccination: 'bg-blue-100 text-blue-800 border-blue-200',
      treatment: 'bg-green-100 text-green-800 border-green-200',
      checkup: 'bg-purple-100 text-purple-800 border-purple-200',
      injury: 'bg-orange-100 text-orange-800 border-orange-200',
      illness: 'bg-red-100 text-red-800 border-red-200',
    }
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200'
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

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'low': return '🟢'
      case 'medium': return '🟡'
      case 'high': return '🔴'
      default: return ''
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString()
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
                const isOverdue = record.next_due_date && new Date(record.next_due_date) < new Date()
                const isDueSoon = record.next_due_date && 
                  new Date(record.next_due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
                  new Date(record.next_due_date) >= new Date()
                const shouldShowFollowUp = ['illness', 'injury', 'treatment'].includes(record.record_type)
                
                return (
                  <div 
                    key={record.id} 
                    className={cn(
                      "border border-gray-200 rounded-lg transition-colors hover:shadow-lg border-l-4 border-l-farm-green",
                      isMobile ? "p-3" : "p-4",
                      isOverdue ? "ring-2 ring-red-200" : "",
                      isTouch ? "active:bg-gray-50" : "hover:bg-gray-50"
                    )}
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {getRecordTypeIcon(record.record_type)}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={getRecordTypeBadge(record.record_type)}>
                              {getRecordTypeLabel(record.record_type)}
                            </Badge>
                            {record.severity && (
                              <Badge variant="outline" className={getSeverityColor(record.severity)}>
                                {getSeverityIcon(record.severity)} {record.severity.toUpperCase()}
                              </Badge>
                            )}
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
                        
                        {canAddRecords && (
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(record)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record.id)}
                              disabled={deletingRecordId === record.id}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deletingRecordId === record.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Description */}
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">Description:</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{record.description}</p>
                      </div>
                      
                      {/* Medication */}
                      {record.medication && (
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">Medication:</p>
                          <p className="text-sm text-gray-700">{record.medication}</p>
                        </div>
                      )}
                      
                      {/* Date and Veterinarian */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(record.record_date)}</span>
                        </div>
                        
                        {record.veterinarian && (
                          <div className="flex items-center space-x-1 text-gray-600">
                            <User className="w-4 h-4" />
                            <span className="truncate max-w-[120px]">{record.veterinarian}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Cost */}
                      {record.cost && record.cost > 0 && (
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          <span>${record.cost.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {/* Next Due Date */}
                      {record.next_due_date && (
                        <div className={`flex items-center space-x-1 text-sm p-2 rounded ${
                          isOverdue 
                            ? 'bg-red-50 text-red-700' 
                            : isDueSoon 
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-green-50 text-green-700'
                        }`}>
                          {isOverdue ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          <span>
                            {isOverdue ? 'Overdue: ' : 'Next due: '}
                            {formatDate(record.next_due_date)}
                          </span>
                        </div>
                      )}
                      
                      {/* Notes */}
                      {record.notes && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium text-gray-900 mb-1">Notes:</p>
                          <p className="text-xs text-gray-600 italic">{record.notes}</p>
                        </div>
                      )}

                      {/* Action Buttons for Follow-up */}
                      {canAddRecords && shouldShowFollowUp && (
                        <div className="pt-3 border-t">
                          <div className="flex items-center justify-between">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleFollowUp(record)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 flex items-center space-x-1"
                            >
                              <Activity className="w-3 h-3" />
                              <span>Add Follow-up</span>
                            </Button>
                            
                            <div className="text-xs text-gray-500">
                              Track recovery progress
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      {(record.created_at || record.updated_at) && (
                        <div className="text-xs text-gray-400 pt-2 border-t">
                          <div className="flex items-center justify-between">
                            {record.created_at && (
                              <span>
                                Created: {formatDate(record.created_at)}
                              </span>
                            )}
                            {record.updated_at && record.updated_at !== record.created_at && (
                              <span>
                                Updated: {formatDate(record.updated_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modals */}
      {showAddModal && (
        <AddHealthRecordModal
          farmId={farmId}
          animals={animals}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onRecordAdded={handleRecordAdded}
          preSelectedAnimalId={animalId}
        />
      )}

      {showFollowUpModal && selectedRecord && (
        <FollowUpHealthRecordModal
          farmId={farmId}
          originalRecord={selectedRecord}
          isOpen={showFollowUpModal}
          onClose={() => {
            setShowFollowUpModal(false)
            setSelectedRecord(null)
          }}
          onFollowUpAdded={handleFollowUpAdded}
        />
      )}

      {showEditModal && selectedRecord && (
        <EditHealthRecordModal
          record={selectedRecord}
          farmId={farmId}
          animals={animals}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedRecord(null)
          }}
          onRecordUpdated={handleRecordUpdated}
        />
      )}
    </div>
  )
}