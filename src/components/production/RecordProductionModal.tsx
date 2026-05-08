'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { IndividualRecordForm } from './IndividualRecordForm'
import { GroupRecordForm } from './GroupRecordForm'
import { ProductionSettings } from '@/types/production-distribution-settings'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { Calendar, Clock } from 'lucide-react'

type Tab = 'individual' | 'group'
type MilkingSession = 'morning' | 'afternoon' | 'evening'

/** Returns the ID of the session whose start time is closest to (but not after) now.
 *  Falls back to the last session of the day (wraps around midnight). */
function getSessionForCurrentTime(sessions: Array<{ id: string; time: string }>): string {
  if (sessions.length === 0) return ''
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const sorted = [...sessions]
    .map(s => {
      const [h, m] = s.time.split(':').map(Number)
      return { id: s.id, minutes: h * 60 + m }
    })
    .sort((a, b) => a.minutes - b.minutes)
  // Last session whose start time <= now; if none, use the last (wraps past midnight)
  let match = sorted[sorted.length - 1]
  for (const s of sorted) {
    if (s.minutes <= currentMinutes) match = s
  }
  return match.id
}

interface RecordProductionModalProps {
  isOpen: boolean
  onClose: () => void
  farmId: string
  animals: Array<{ 
    id: string
    tag_number: string
    name?: string
    gender: string
    production_status: string 
  }>
  settings: ProductionSettings | null
  onSuccess?: () => void
  recordingType?: 'individual' | 'group'
  milkingGroupName?: string
  editingRecord?: {
    id: string
    animal_id: string
    record_date: string
    milking_session_id: string
    milk_volume: number
    milk_safety_status: 'safe' | 'unsafe_health' | 'unsafe_colostrum'
    temperature?: number | null
    mastitis_test_performed?: boolean
    mastitis_result?: 'negative' | 'mild' | 'severe' | null
    affected_quarters?: string[] | null
    fat_content?: number | null
    protein_content?: number | null
    somatic_cell_count?: number | null
    lactose_content?: number | null
    ph_level?: number | null
    notes?: string | null
    milking_time?: string | null
  } | null
}

export function RecordProductionModal({
  isOpen,
  onClose,
  farmId,
  animals,
  settings,
  onSuccess,
  recordingType,
  milkingGroupName,
  editingRecord
}: RecordProductionModalProps) {

  
  const { isMobile, isTablet } = useDeviceInfo()
  const [activeTab, setActiveTab] = useState<Tab>(
    editingRecord && recordingType ? recordingType : 'individual'
  )
  const [selectedDate, setSelectedDate] = useState<string>(
    editingRecord?.record_date || new Date().toISOString().split('T')[0]
  )

  // Get sessions from milking_sessions configuration
  const sessions = useMemo(() => {
    if (settings?.milkingSessions && settings.milkingSessions.length > 0) {
      return settings.milkingSessions
    }
    // Default fallback
    return [
      { id: '1', name: 'Morning', time: '06:00' },
      { id: '2', name: 'Afternoon', time: '14:00' },
      { id: '3', name: 'Evening', time: '18:00' }
    ]
  }, [settings?.milkingSessions])

  // Initialize selectedSession to the session matching the current time, or the editing record's session
  const [selectedSession, setSelectedSession] = useState<string>(() => {
    if (editingRecord?.milking_session_id) {
      return editingRecord.milking_session_id
    }
    return getSessionForCurrentTime(sessions)
  })

  // Re-select the time-appropriate session each time the modal is opened, or use editing record's session
  useEffect(() => {
    if (isOpen) {
      if (editingRecord?.milking_session_id) {
        setSelectedSession(editingRecord.milking_session_id)
      } else {
        setSelectedSession(getSessionForCurrentTime(sessions))
      }
    }
  }, [isOpen, sessions, editingRecord])
  
  // Get the session object for selectedSession to pass sessionId to forms
  const currentSessionObject = useMemo(
    () => sessions.find(s => s.id === selectedSession) || sessions[0],
    [sessions, selectedSession]
  )
  
  // Calculate min allowed date based on maxRetroactiveDays
  const minAllowedDate = useMemo(() => {
    const today = new Date()
    const retroactiveDays = settings?.maxRetroactiveDays || 0
    const minDate = new Date(today)
    minDate.setDate(minDate.getDate() - retroactiveDays)
    return minDate.toISOString().split('T')[0]
  }, [settings?.maxRetroactiveDays])

  // Build session labels from configured sessions
  const sessionLabels: Record<string, string> = useMemo(() => {
    const labels: Record<string, string> = {}
    sessions.forEach(session => {
      const key = session.name.toLowerCase().replace(/\s+/g, '')
      labels[key] = `${session.name} (${session.time})`
    })
    return labels
  }, [sessions])

  const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess()
    }
    // Note: Don't close automatically - let parent handle it
  }

  const handleCloseModal = () => {
    // Call onSuccess before closing (for data refresh)
    handleSuccess()
    // Now close the modal
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="sm:max-w-4xl">
      {/* Header with Title */}
      <div className="bg-stone-50 border-b border-stone-200 px-4 sm:px-6 py-3 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-stone-900">
          {editingRecord ? 'Edit Production Record' : 'Record Production'}
        </h2>
      </div>

      {/* Header Bar — stacks vertically on mobile */}
      <div className="bg-stone-50 border-b border-stone-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          {/* Date Picker */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-stone-500 flex-shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minAllowedDate}
              max={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
              className="flex-1 sm:flex-none px-3 py-1.5 border border-stone-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              title={`Can record up to ${settings?.maxRetroactiveDays || 0} days back`}
            />
            {!isMobile && (
              <span className="text-xs text-stone-500">{formattedDate}</span>
            )}
          </div>

          {/* Session Selector */}
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-stone-500 flex-shrink-0" />
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-1.5 border border-stone-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name} ({session.time})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Switcher — full width on mobile, only show when creating new records */}
        {!editingRecord && (
          <div className="flex items-center bg-white border border-stone-200 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('individual')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded font-medium text-sm transition-colors ${
                activeTab === 'individual'
                  ? 'bg-green-100 text-green-700'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {isMobile ? 'Individual' : 'By Individual'}
            </button>
            <button
              onClick={() => setActiveTab('group')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded font-medium text-sm transition-colors ${
                activeTab === 'group'
                  ? 'bg-green-100 text-green-700'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {isMobile ? 'Group' : 'By Group'}
            </button>
          </div>
        )}

        {/* Recording Method Badge — only show when editing */}
        {editingRecord && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-stone-200 sm:pl-3">
            <span className="text-xs font-semibold text-stone-600 uppercase">Created:</span>
            <div className="flex items-center gap-2">
              <Badge className={recordingType === 'group' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                {recordingType === 'group' ? 'By Group' : 'By Individual'}
              </Badge>
              {recordingType === 'group' && milkingGroupName && (
                <Badge className="bg-stone-100 text-stone-700">
                  {milkingGroupName}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="min-h-[300px] sm:min-h-[400px] p-4 sm:p-6">
        {/* When editing, show only the original recording method */}
        {editingRecord ? (
          recordingType === 'individual' ? (
            <>
              <IndividualRecordForm
                farmId={farmId}
                animals={animals}
                session={selectedSession}
                sessionId={selectedSession}
                recordDate={selectedDate}
                settings={settings}
                closeAfterSuccess={false}
                sessionName={currentSessionObject?.name}
                editingRecord={editingRecord}
              />
            </>
          ) : (
            <>
              <GroupRecordForm
                farmId={farmId}
                animals={animals}
                session={selectedSession}
                sessionId={selectedSession}
                recordDate={selectedDate}
                settings={settings}
                sessionName={currentSessionObject?.name}
                editingRecord={editingRecord}
              />
            </>
          )
        ) : (
          /* When creating new records, show tabs */
          <>
            {activeTab === 'individual' && (
              <>
                <IndividualRecordForm
                  farmId={farmId}
                  animals={animals}
                  session={selectedSession}
                  sessionId={selectedSession}
                  recordDate={selectedDate}
                  settings={settings}
                  closeAfterSuccess={false}
                  sessionName={currentSessionObject?.name}
                  editingRecord={null}
                />
              </>
            )}

            {activeTab === 'group' && (
              <>
                <GroupRecordForm
                  farmId={farmId}
                  animals={animals}
                  session={selectedSession}
                  sessionId={selectedSession}
                  recordDate={selectedDate}
                  settings={settings}
                  sessionName={currentSessionObject?.name}
                  editingRecord={null}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Footer — rendered only when not in editing mode */}
      {!editingRecord && (
        <div className="border-t border-stone-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-end">
          <Button variant="outline" onClick={handleCloseModal}>
            Close
          </Button>
        </div>
      )}
    </Modal>
  )
}
