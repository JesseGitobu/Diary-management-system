// Enhanced Schedule Tab Component
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  Users,
  Wheat,
  XCircle,
  Timer,
  AlertCircle,
  Trash2
} from 'lucide-react'
import { format, parseISO, differenceInMinutes, isPast, isFuture } from 'date-fns'

interface ScheduledFeeding {
  id: string
  feed_type_id: string
  quantity_kg: number
  scheduled_time: string
  feeding_mode: 'individual' | 'batch'
  animal_count: number
  consumption_batch_id?: string
  notes?: string
  status: 'pending' | 'completed' | 'cancelled' | 'overdue'
  completed_at?: string
  late_by_minutes?: number
  late_reason?: string
  feed_types: {
    name: string
    category_id?: string
  }
  consumption_batches?: {
    batch_name: string
  }
}

interface ScheduleTabContentProps {
  animalId: string
  farmId: string
  canAddRecords: boolean
  onFeedingCompleted?: () => void
}

export function ScheduleTabContent({ 
  animalId, 
  farmId, 
  canAddRecords,
  onFeedingCompleted 
}: ScheduleTabContentProps) {
  const [scheduledFeedings, setScheduledFeedings] = useState<ScheduledFeeding[]>([])
  const [farmSchedules, setFarmSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingFeeding, setConfirmingFeeding] = useState<ScheduledFeeding | null>(null)
  const [cancelling, setCancelling] = useState<ScheduledFeeding | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [deleting, setDeleting] = useState<ScheduledFeeding | null>(null)
  const [deletionReason, setDeletionReason] = useState('')
  const [lateReason, setLateReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load scheduled feedings and farm schedules
  useEffect(() => {
    loadScheduleData()
    
    // Set up polling to check for overdue feedings every minute
    const interval = setInterval(loadScheduleData, 60000)
    return () => clearInterval(interval)
  }, [animalId, farmId])

  const loadScheduleData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load scheduled feedings
      const scheduledResponse = await fetch(
        `/api/farms/${farmId}/animals/${animalId}/scheduled-feedings`
      )
      
      if (scheduledResponse.ok) {
        const scheduledData = await scheduledResponse.json()
        setScheduledFeedings(scheduledData.scheduledFeedings || [])
      }

      // Load farm schedules
      const farmSchedulesResponse = await fetch(
        `/api/farms/${farmId}/animals/${animalId}/feeding-schedules`
      )
      
      if (farmSchedulesResponse.ok) {
        const farmSchedulesData = await farmSchedulesResponse.json()
        setFarmSchedules(farmSchedulesData.schedules || [])
      }

    } catch (err) {
      console.error('Error loading schedule data:', err)
      setError('Failed to load schedule data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (feeding: ScheduledFeeding) => {
    const now = new Date()
    const scheduledTime = parseISO(feeding.scheduled_time)
    const minutesUntilFeeding = differenceInMinutes(scheduledTime, now)
    
    switch (feeding.status) {
      case 'pending':
        if (minutesUntilFeeding <= 0) {
          return <Badge className="bg-orange-100 text-orange-800">Ready to Feed</Badge>
        } else if (minutesUntilFeeding <= 30) {
          return <Badge className="bg-yellow-100 text-yellow-800">Feeding Soon</Badge>
        } else {
          return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>
        }
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{feeding.status}</Badge>
    }
  }

  const getTimeDisplay = (feeding: ScheduledFeeding) => {
    const now = new Date()
    const scheduledTime = parseISO(feeding.scheduled_time)
    const minutesUntilFeeding = differenceInMinutes(scheduledTime, now)
    
    if (feeding.status === 'completed') {
      return (
        <div className="text-sm text-gray-600">
          <div>Completed: {format(parseISO(feeding.completed_at!), 'HH:mm')}</div>
          {feeding.late_by_minutes && feeding.late_by_minutes > 0 && (
            <div className="text-red-600 font-medium">
              Late by {feeding.late_by_minutes} minutes
              {feeding.late_reason && (
                <span className="block text-gray-600 mt-1">
                  Reason: {feeding.late_reason}
                </span>
              )}
            </div>
          )}
        </div>
      )
    }

    if (minutesUntilFeeding <= 0) {
      const overdueMinutes = Math.abs(minutesUntilFeeding)
      return (
        <div className="text-sm">
          <div className="text-orange-600 font-medium">
            {overdueMinutes === 0 ? 'Now' : `${overdueMinutes} min overdue`}
          </div>
          <div className="text-gray-600">
            Scheduled: {format(scheduledTime, 'HH:mm')}
          </div>
        </div>
      )
    }

    return (
      <div className="text-sm text-gray-600">
        <div>In {minutesUntilFeeding} minutes</div>
        <div>At {format(scheduledTime, 'HH:mm')}</div>
      </div>
    )
  }

  const canConfirmFeeding = (feeding: ScheduledFeeding): boolean => {
    // Allow confirmation anytime for pending or overdue feedings
    return feeding.status === 'pending' || feeding.status === 'overdue'
  }

  const isLateFeeding = (feeding: ScheduledFeeding): boolean => {
    const now = new Date()
    const scheduledTime = parseISO(feeding.scheduled_time)
    return now > scheduledTime
  }

  const handleConfirmFeeding = async () => {
    if (!confirmingFeeding) return

    setSubmitting(true)
    try {
      const now = new Date()
      const scheduledTime = parseISO(confirmingFeeding.scheduled_time)
      const isLate = now > scheduledTime

      // If feeding is late and no reason provided, ask for reason
      if (isLate && !lateReason.trim()) {
        setError('Please provide a reason for the late feeding completion')
        setSubmitting(false)
        return
      }

      const response = await fetch(
        `/api/farms/${farmId}/animals/${animalId}/scheduled-feedings/${confirmingFeeding.id}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actualFeedingTime: new Date().toISOString(),
            lateReason: isLate ? lateReason : undefined
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to confirm feeding')
      }

      const result = await response.json()
      
      // Clear form and reload data
      setLateReason('')
      await loadScheduleData()
      onFeedingCompleted?.()
      setConfirmingFeeding(null)
      setError(null)

    } catch (err) {
      console.error('Error confirming feeding:', err)
      setError(err instanceof Error ? err.message : 'Failed to confirm feeding')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelFeeding = async () => {
    if (!cancelling) return

    setSubmitting(true)
    try {
      const response = await fetch(
        `/api/farms/${farmId}/animals/${animalId}/scheduled-feedings/${cancelling.id}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: cancellationReason || 'Cancelled by user'
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel feeding')
      }

      // Reload schedule data
      await loadScheduleData()
      setCancelling(null)
      setCancellationReason('')

    } catch (err) {
      console.error('Error cancelling feeding:', err)
      setError(err instanceof Error ? err.message : 'Failed to cancel feeding')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteFeeding = async () => {
    if (!deleting) return

    setSubmitting(true)
    try {
      const response = await fetch(
        `/api/farms/${farmId}/animals/${animalId}/scheduled-feedings/${deleting.id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: deletionReason || 'Deleted by user'
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete feeding')
      }

      // Reload schedule data
      await loadScheduleData()
      setDeleting(null)
      setDeletionReason('')

    } catch (err) {
      console.error('Error deleting feeding:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete feeding')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
        <span className="ml-2">Loading schedule...</span>
      </div>
    )
  }

  const pendingFeedings = scheduledFeedings.filter(f => f.status === 'pending' || f.status === 'overdue')
  const completedFeedings = scheduledFeedings.filter(f => f.status === 'completed')
  const cancelledFeedings = scheduledFeedings.filter(f => f.status === 'cancelled')

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Pending Scheduled Feedings */}
      {pendingFeedings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Timer className="w-5 h-5 text-blue-600" />
              <span>Scheduled Feedings ({pendingFeedings.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingFeedings.map((feeding) => {
                const canConfirm = canConfirmFeeding(feeding)
                const now = new Date()
                const scheduledTime = parseISO(feeding.scheduled_time)
                const minutesUntilFeeding = differenceInMinutes(scheduledTime, now)
                
                return (
                  <div key={feeding.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {feeding.feed_types.name}
                          </h4>
                          {getStatusBadge(feeding)}
                          {feeding.feeding_mode === 'batch' && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              Batch ({feeding.animal_count})
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Quantity:</span>
                            <div className="font-medium">{feeding.quantity_kg}kg</div>
                          </div>
                          
                          <div>
                            <span className="text-gray-600">Scheduled Time:</span>
                            {getTimeDisplay(feeding)}
                          </div>
                          
                          <div>
                            <span className="text-gray-600">Mode:</span>
                            <div className="font-medium capitalize">{feeding.feeding_mode}</div>
                          </div>
                        </div>

                        {feeding.consumption_batches?.batch_name && (
                          <div className="mt-2 text-sm text-blue-600">
                            Batch: {feeding.consumption_batches.batch_name}
                          </div>
                        )}

                        {feeding.notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                            <strong>Notes:</strong> {feeding.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {canConfirm && canAddRecords && (
                        <Button
                          onClick={() => setConfirmingFeeding(feeding)}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {minutesUntilFeeding <= 0 ? 'Complete Feeding' : 'Confirm Feeding'}
                        </Button>
                      )}
                      
                      {feeding.status === 'pending' && canAddRecords && (
                        <Button
                          onClick={() => setCancelling(feeding)}
                          variant="outline"
                          size="sm"
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      )}

                      {(feeding.status === 'pending' || feeding.status === 'overdue') && canAddRecords && (
                        <Button
                          onClick={() => setDeleting(feeding)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>

                    {/* Updated Feeding Window Indicator */}
                    {minutesUntilFeeding > 30 && feeding.status === 'pending' && (
                      <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                        <Clock className="w-4 h-4 inline mr-1" />
                        You can complete this feeding at any time, but it will be marked as late if done after the scheduled time
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Farm Feeding Schedules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <span>Farm Schedules</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {farmSchedules.length > 0 ? (
            <div className="space-y-3">
              {farmSchedules.map((schedule) => (
                <div key={schedule.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-medium">{schedule.feed_name}</h5>
                      <p className="text-sm text-gray-600">
                        {schedule.scheduled_time} • {schedule.frequency}
                      </p>
                      <p className="text-sm text-gray-500">
                        {schedule.quantity_kg}kg planned
                      </p>
                    </div>
                    <Badge className={schedule.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {schedule.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <p>No farm schedules affecting this animal</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Feedings (Recent) */}
      {completedFeedings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Recently Completed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedFeedings.slice(0, 5).map((feeding) => (
                <div key={feeding.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <h5 className="font-medium text-green-900">{feeding.feed_types.name}</h5>
                    <p className="text-sm text-green-700">
                      {feeding.quantity_kg}kg • Completed {format(parseISO(feeding.completed_at!), 'MMM dd, HH:mm')}
                    </p>
                    {feeding.late_by_minutes && feeding.late_by_minutes > 0 && (
                      <p className="text-xs text-orange-600 font-medium">
                        Late by {feeding.late_by_minutes} minutes
                        {feeding.late_reason && (
                          <span className="block text-gray-600 mt-1">
                            Reason: {feeding.late_reason}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Scheduled Feedings Message */}
      {scheduledFeedings.length === 0 && farmSchedules.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No scheduled feedings</h3>
            <p className="text-gray-500 mb-4">
              Feeding records with future times will appear here as scheduled feedings.
            </p>
            <p className="text-sm text-gray-400">
              Set feeding times more than 1 hour in the future when recording to create schedules.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Confirmation Modal with Late Reason */}
      {confirmingFeeding && (
        <Modal isOpen={true} onClose={() => {
          setConfirmingFeeding(null)
          setLateReason('')
          setError(null)
        }}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span>Confirm Feeding</span>
            </h2>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">{confirmingFeeding.feed_types.name}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Quantity:</span>
                  <div className="font-medium">{confirmingFeeding.quantity_kg}kg</div>
                </div>
                <div>
                  <span className="text-gray-600">Scheduled:</span>
                  <div className="font-medium">
                    {format(parseISO(confirmingFeeding.scheduled_time), 'MMM dd, HH:mm')}
                  </div>
                </div>
              </div>
              
              {(() => {
                const now = new Date()
                const scheduledTime = parseISO(confirmingFeeding.scheduled_time)
                const lateMinutes = Math.max(0, differenceInMinutes(now, scheduledTime))
                const isCurrentlyLate = now > scheduledTime
                
                if (isCurrentlyLate) {
                  return (
                    <div className="mt-3 p-3 bg-orange-100 rounded text-sm">
                      <AlertTriangle className="w-4 h-4 inline mr-1 text-orange-600" />
                      <span className="text-orange-700 font-medium">
                        This feeding is {lateMinutes} minutes late
                      </span>
                    </div>
                  )
                } else {
                  return (
                    <div className="mt-3 p-3 bg-green-100 rounded text-sm">
                      <CheckCircle className="w-4 h-4 inline mr-1 text-green-600" />
                      <span className="text-green-700">Feeding is on time</span>
                    </div>
                  )
                }
              })()}
            </div>

            {/* Late Reason Input - Only show if feeding is late */}
            {isLateFeeding(confirmingFeeding) && (
              <div className="mb-6">
                <Label htmlFor="lateReason" className="text-red-700 font-medium">
                  Reason for Late Feeding *
                </Label>
                <Textarea
                  id="lateReason"
                  value={lateReason}
                  onChange={(e) => setLateReason(e.target.value)}
                  placeholder="Please explain why this feeding is being completed late..."
                  rows={3}
                  className="border-red-300 focus:border-red-500"
                />
                <p className="text-xs text-red-600 mt-1">
                  This reason will be recorded with the feeding record
                </p>
              </div>
            )}

            <p className="text-gray-600 mb-6">
              Are you sure you want to mark this feeding as completed? This will create a feeding record 
              and update the inventory.
            </p>

            <div className="flex space-x-3">
              <Button
                onClick={handleConfirmFeeding}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Confirming...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Feeding
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmingFeeding(null)
                  setLateReason('')
                  setError(null)
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleting && (
        <Modal isOpen={true} onClose={() => {
          setDeleting(null)
          setDeletionReason('')
        }}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <Trash2 className="w-6 h-6 text-red-600" />
              <span>Delete Scheduled Feeding</span>
            </h2>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">{deleting.feed_types.name}</h3>
              <p className="text-sm text-gray-600">
                {deleting.quantity_kg}kg scheduled for {format(parseISO(deleting.scheduled_time), 'MMM dd, HH:mm')}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Status: {deleting.status}
              </p>
            </div>

            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium text-sm">
                    Warning: This action cannot be undone
                  </p>
                  <p className="text-red-700 text-sm mt-1">
                    The scheduled feeding will be permanently deleted and cannot be recovered.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <Label htmlFor="deletionReason">Reason for deletion (optional)</Label>
              <Textarea
                id="deletionReason"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Enter reason for deleting this scheduled feeding..."
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleDeleteFeeding}
                disabled={submitting}
                variant="destructive"
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Feeding
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setDeleting(null)
                  setDeletionReason('')
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancellation Modal */}
      {cancelling && (
        <Modal isOpen={true} onClose={() => setCancelling(null)}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <XCircle className="w-6 h-6 text-red-600" />
              <span>Cancel Scheduled Feeding</span>
            </h2>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">{cancelling.feed_types.name}</h3>
              <p className="text-sm text-gray-600">
                {cancelling.quantity_kg}kg scheduled for {format(parseISO(cancelling.scheduled_time), 'MMM dd, HH:mm')}
              </p>
            </div>

            <div className="mb-6">
              <Label htmlFor="cancellationReason">Reason for cancellation (optional)</Label>
              <Textarea
                id="cancellationReason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Enter reason for cancelling this feeding..."
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleCancelFeeding}
                disabled={submitting}
                variant="destructive"
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Cancelling...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Feeding
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                disabled={submitting}
              >
                Keep Schedule
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}