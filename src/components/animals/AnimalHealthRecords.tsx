// src/components/animals/AnimalHealthRecords.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AddHealthRecordModal } from '@/components/health/AddHealthRecordModal'
import { FollowUpHealthRecordModal } from '@/components/health/FollowUpHealthRecordModal'
import { EditHealthRecordModal } from '@/components/health/EditHealthRecordModal'
import { HealthIssueCard } from '@/components/health/HealthIssueCard'
import { HealthRecordCard } from '@/components/health/HealthRecordCard'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { toast } from 'react-hot-toast'
import { 
  Plus, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Activity,
  DollarSign,
  Heart,
  Shield
} from 'lucide-react'

interface FollowUpRecord {
  id: string
  record_date: string
  description: string
  veterinarian?: string
  cost?: number
  notes?: string
  medication?: string
  follow_up_status: 'improving' | 'stable' | 'worsening' | 'recovered' | 'requires_attention'
  treatment_effectiveness?: 'very_effective' | 'effective' | 'somewhat_effective' | 'not_effective'
  is_resolved: boolean
  created_at: string
  next_followup_date?: string
}

interface HealthRecord {
  id: string
  record_date: string
  record_type: "vaccination" | "treatment" | "checkup" | "injury" | "illness" | "reproductive" | "deworming" | "dehorning" | "post_mortem"
  description: string
  veterinarian?: string
  cost?: number
  notes?: string
  next_due_date?: string
  medication?: string
  severity?: "severe" | "moderate" | "mild"
  is_resolved?: boolean
  resolved_date?: string
  created_at: string
  updated_at?: string
  animal_id: string
  follow_ups?: FollowUpRecord[]
  [key: string]: any
}

interface AnimalHealthRecordsProps {
  animalId: string
  farmId: string
  animals: any[]
  canAddRecords: boolean
}

export function AnimalHealthRecords({ animalId, farmId, animals, canAddRecords }: AnimalHealthRecordsProps) {
  // State management
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([])
  const [healthIssues, setHealthIssues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // Record states
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null)
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null)
  const [creatingRecordFromIssueId, setCreatingRecordFromIssueId] = useState<string | null>(null)
  
  // UI states
  const [expandedHealthIssuesSection, setExpandedHealthIssuesSection] = useState(true)
  const { isMobile } = useDeviceInfo()
  
  const RECORDS_PER_PAGE = 15

  // Load data on component mount
  useEffect(() => {
    loadData(0)
  }, [animalId])
  
  // Load health records and issues
  const loadData = async (newOffset: number = 0) => {
    try {
      if (newOffset === 0) setLoading(true)
      else setLoadingMore(true)
      
      const [recordsRes, issuesRes] = await Promise.all([
        fetch(`/api/animals/${animalId}/health-records?includeFollowUps=true&limit=${RECORDS_PER_PAGE}&offset=${newOffset}`),
        fetch(`/api/health/issues?animalId=${animalId}&status=open&status=in_progress&status=under_observation`)
      ])
      
      if (recordsRes.ok) {
        const data = await recordsRes.json()
        const records = data.records || []
        
        if (newOffset === 0) {
          setHealthRecords(records)
        } else {
          setHealthRecords(prev => [...prev, ...records])
        }
        
        setHasMore(records.length === RECORDS_PER_PAGE)
        setOffset(newOffset)
      }
      
      if (issuesRes.ok) {
        const data = await issuesRes.json()
        setHealthIssues(data.issues || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load health data')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    loadData(offset + RECORDS_PER_PAGE)
  }
  
  const handleCreateRecordFromIssue = (issueId: string) => {
    setCreatingRecordFromIssueId(issueId)
    setShowAddModal(true)
  }
  
  const handleRecordAdded = (newRecord: HealthRecord) => {
    setHealthRecords(prev => [newRecord, ...prev])
    setShowAddModal(false)
    setCreatingRecordFromIssueId(null)
  }

  const handleFollowUpAdded = async (followUpData: any) => {
    if (followUpData) {
      setHealthRecords(prev =>
        prev.map(record => {
          if (record.id === followUpData.original_record_id) {
            return {
              ...record,
              follow_ups: [followUpData, ...(record.follow_ups || [])],
              is_resolved: followUpData.is_resolved || record.is_resolved,
              resolved_date: followUpData.is_resolved ? followUpData.record_date : record.resolved_date
            }
          }
          return record
        })
      )
    }
    
    setShowFollowUpModal(false)
    setSelectedRecord(null)
    await loadData()
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
    if (!window.confirm('Are you sure you want to delete this health record?')) {
      return
    }

    setDeletingRecordId(recordId)
    try {
      const response = await fetch(`/api/health/records/${recordId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setHealthRecords(prev => prev.filter(record => record.id !== recordId))
        toast.success('Health record deleted')
      } else {
        throw new Error('Failed to delete health record')
      }
    } catch (error) {
      console.error('Error deleting health record:', error)
      toast.error('Failed to delete health record')
    } finally {
      setDeletingRecordId(null)
    }
  }

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  const animal = animals.find(a => a.id === animalId)
  const summaryStats = {
    openIssues: healthIssues.length,
    vaccinations: healthRecords.filter(r => r.record_type === 'vaccination').length,
    totalRecords: healthRecords.length,
    totalCost: healthRecords.reduce((sum, r) => {
      const recordCost = r.cost || 0
      const followUpsCost = (r.follow_ups || []).reduce((fSum, f) => fSum + (f.cost || 0), 0)
      return sum + recordCost + followUpsCost
    }, 0)
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
            "font-semibold text-gray-900",
            isMobile ? "text-lg" : "text-xl"
          )}>
            Medical Timeline
          </h3>
          <p className={cn(
            "text-gray-600",
            isMobile ? "text-sm" : "text-sm"
          )}>
            {animal?.name || `Animal #${animal?.tag_number}`} - Complete health history from issues to follow-ups
          </p>
        </div>
        
        {canAddRecords && (
          <Button 
            onClick={() => setShowAddModal(true)}
            size={isMobile ? "default" : "default"}
            className={cn(isMobile && "w-full")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Health Record
          </Button>
        )}
      </div>
      
      {/* Summary Stats */}
      <div className={cn(
        "grid gap-3",
        isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-4 gap-4"
      )}>
        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className="flex items-center space-x-2">
              <AlertTriangle className={cn("text-red-600", isMobile ? "w-4 h-4" : "w-5 h-5")} />
              <div>
                <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  Open Issues
                </p>
                <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                  {summaryStats.openIssues}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className="flex items-center space-x-2">
              <Shield className={cn("text-green-600", isMobile ? "w-4 h-4" : "w-5 h-5")} />
              <div>
                <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  Vaccinations
                </p>
                <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                  {summaryStats.vaccinations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className="flex items-center space-x-2">
              <Activity className={cn("text-blue-600", isMobile ? "w-4 h-4" : "w-5 h-5")} />
              <div>
                <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  Total Records
                </p>
                <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                  {summaryStats.totalRecords}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className="flex items-center space-x-2">
              <DollarSign className={cn("text-green-600", isMobile ? "w-4 h-4" : "w-5 h-5")} />
              <div>
                <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  Total Cost
                </p>
                <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                  Ksh {summaryStats.totalCost.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No Data State */}
      {healthIssues.length === 0 && healthRecords.length === 0 ? (
        <Card>
          <CardContent className={cn("text-center", isMobile ? "py-8" : "py-12")}>
            <Heart className={cn("mx-auto text-gray-400", isMobile ? "h-10 w-10" : "h-12 w-12")} />
            <h3 className={cn("mt-2 font-medium text-gray-900", isMobile ? "text-sm" : "text-base")}>
              No health records or issues yet
            </h3>
            <p className={cn("mt-1 text-gray-500", isMobile ? "text-xs" : "text-sm")}>
              Start tracking this animal's health journey by recording health events.
            </p>
            {canAddRecords && (
              <Button 
                onClick={() => setShowAddModal(true)}
                className="mt-4"
                size={isMobile ? "sm" : "default"}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add First Health Record
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Open Health Issues Section */}
          {healthIssues.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setExpandedHealthIssuesSection(!expandedHealthIssuesSection)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors"
              >
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Open Health Issues ({healthIssues.length})
                </h4>
                {expandedHealthIssuesSection ? (
                  <ChevronUp className="w-5 h-5 text-gray-600 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                )}
              </button>
              
              {expandedHealthIssuesSection && (
                <div className="space-y-2">
                  {healthIssues.map((issue) => (
                    <HealthIssueCard
                      key={issue.id}
                      issue={issue}
                      animal={animal}
                      onCreateRecord={() => handleCreateRecordFromIssue(issue.id)}
                      showCreateButton={canAddRecords}
                      isCreatingRecord={creatingRecordFromIssueId === issue.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Medical Timeline Records Section */}
          {healthRecords.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Medical Timeline ({healthRecords.length})
              </h4>
              <div className="space-y-2">
                {healthRecords.map((record) => (
                  <HealthRecordCard
                    key={record.id}
                    record={{
                      ...record,
                      animals: animal
                    }}
                    onEdit={() => handleEdit(record)}
                    onDelete={() => handleDelete(record.id)}
                    onFollowUp={() => handleFollowUp(record)}
                    canEdit={canAddRecords}
                    isDeleting={deletingRecordId === record.id}
                    showFollowUp={true}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-6 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Load More Records
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Modals */}
      {showAddModal && (
        <AddHealthRecordModal
          farmId={farmId}
          animals={animals}
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false)
            setCreatingRecordFromIssueId(null)
          }}
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
