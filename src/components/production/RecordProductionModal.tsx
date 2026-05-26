'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { IndividualRecordForm } from './IndividualRecordForm'
import { GroupRecordForm } from './GroupRecordForm'
import { ProductionSettings } from '@/types/production-distribution-settings'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { Calendar, Clock, Droplets, Users, X } from 'lucide-react'

type Tab = 'individual' | 'group'

/** Finds the session whose start-time is closest to (but not after) now. */
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
  /** Only set when editing an existing record */
  recordingType?: 'individual' | 'group'
  /** Group name snapshot from the record being edited (group records only) */
  milkingGroupName?: string
  /** Session name for the editing record (helps display the original session) */
  editingSessionName?: string
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
  editingSessionName,
  editingRecord,
}: RecordProductionModalProps) {
  const { isMobile } = useDeviceInfo()
  const [activeTab, setActiveTab] = useState<Tab>(
    editingRecord && recordingType ? recordingType : 'individual'
  )
  const [selectedDate, setSelectedDate] = useState<string>(
    editingRecord?.record_date || new Date().toISOString().split('T')[0]
  )

  const sessions = useMemo(() => {
    if (settings?.milkingSessions?.length) return settings.milkingSessions
    return [
      { id: '1', name: 'Morning',   time: '06:00' },
      { id: '2', name: 'Afternoon', time: '14:00' },
      { id: '3', name: 'Evening',   time: '18:00' },
    ]
  }, [settings?.milkingSessions])

  const [selectedSession, setSelectedSession] = useState<string>(() => {
    if (editingRecord?.milking_session_id) {
      console.log('[RecordProductionModal] Editing record with milking_session_id:', {
        milking_session_id: editingRecord.milking_session_id,
        availableSessions: sessions.map(s => ({ id: s.id, name: s.name })),
      })
      return editingRecord.milking_session_id
    }
    const defaultSession = getSessionForCurrentTime(sessions)
    console.log('[RecordProductionModal] Using current time to select session:', defaultSession)
    return defaultSession
  })

  useEffect(() => {
    if (isOpen) {
      console.log('[RecordProductionModal] Modal opened, currentState:', {
        isEditing: !!editingRecord,
        editingSessionId: editingRecord?.milking_session_id,
        currentSelectedSession: selectedSession,
      })
      if (editingRecord?.milking_session_id) {
        console.log('[RecordProductionModal] Setting session from editing record:', editingRecord.milking_session_id)
        setSelectedSession(editingRecord.milking_session_id)
      } else {
        const defaultSession = getSessionForCurrentTime(sessions)
        console.log('[RecordProductionModal] Setting session from current time:', defaultSession)
        setSelectedSession(defaultSession)
      }
    }
  }, [isOpen, sessions, editingRecord])

  const currentSessionObject = useMemo(
    () => sessions.find(s => s.id === selectedSession) || sessions[0],
    [sessions, selectedSession]
  )

  // Get display name for a session ID (handles both configured and previously recorded sessions)
  const getSessionDisplayName = (sessionId: string): string => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) return session.name
    // If editing and this is the original session, use the passed session name
    if (editingRecord && sessionId === editingRecord.milking_session_id && editingSessionName) {
      return editingSessionName
    }
    return 'Unknown Session'
  }

  const minAllowedDate = useMemo(() => {
    const today = new Date()
    const retro = settings?.maxRetroactiveDays || 0
    const d = new Date(today)
    d.setDate(d.getDate() - retro)
    return d.toISOString().split('T')[0]
  }, [settings?.maxRetroactiveDays])

  const maxDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()

  const handleSuccess = () => {
    onSuccess?.()
    onClose()
  }

  // ── When editing a group record we always use IndividualRecordForm ─────────
  // Group records are per-animal; editing should adjust that one animal's data
  // while surfacing that it originated from a group recording session.
  const isEditingGroupRecord = !!editingRecord && recordingType === 'group'

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="sm:max-w-2xl" closeOnOverlayClick={false}>

      {/* ── Modal header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 leading-tight">
              {editingRecord ? 'Edit production record' : 'Record production'}
            </h2>
            {isEditingGroupRecord && (
              <p className="text-xs text-violet-600 font-medium mt-0.5 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Originally recorded via group
                {milkingGroupName && <span className="font-semibold">· {milkingGroupName}</span>}
              </p>
            )}
          </div>
        </div>
        {/* <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button> */}
      </div>

      {/* ── Date + session bar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
        {/* Date picker */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            min={minAllowedDate}
            max={maxDate}
            title={`Can record up to ${settings?.maxRetroactiveDays || 0} days back`}
            className="text-sm font-medium px-3 py-1.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
          />
        </div>

        {/* Session picker — static when editing, selectable when creating */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {editingRecord ? (
            /* Static display when editing */
            <div className="text-sm font-medium px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700">
              {getSessionDisplayName(selectedSession)}
            </div>
          ) : (
            /* Dropdown for new records */
            <select
              value={selectedSession}
              onChange={e => {
                console.log('[RecordProductionModal] Session changed from', selectedSession, 'to', e.target.value)
                setSelectedSession(e.target.value)
              }}
              className="text-sm font-medium px-3 py-1.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.time})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tab switcher — only when creating new records */}
        {!editingRecord && (
          <div className="ml-auto flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('individual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'individual'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              {isMobile ? 'Individual' : 'By individual'}
            </button>
            <button
              onClick={() => setActiveTab('group')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'group'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              {isMobile ? 'Group' : 'By group'}
            </button>
          </div>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="p-5 overflow-y-auto max-h-[70vh]">
        {editingRecord ? (
          /*
           * EDITING MODE
           * ─────────────────────────────────────────────────────────────
           * Regardless of whether the original record was created via a
           * group or individual workflow, we always edit it with
           * IndividualRecordForm (since each record belongs to exactly one
           * animal). When the origin was a group recording we surface that
           * context through sourceRecordingType + sourceGroupName props.
           */
          <>
            {console.log('[RecordProductionModal] Rendering editing form with session:', {
              selectedSession,
              currentSessionObject: currentSessionObject?.name,
              sessionId: selectedSession,
            })}
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
              sourceRecordingType={recordingType}
              sourceGroupName={milkingGroupName}
              onSuccess={handleSuccess}
            />
          </>
        ) : (
          /* CREATION MODE */
          <>
            {activeTab === 'individual' && (
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
                onSuccess={handleSuccess}
              />
            )}
            {activeTab === 'group' && (
              <GroupRecordForm
                farmId={farmId}
                animals={animals}
                session={selectedSession}
                sessionId={selectedSession}
                recordDate={selectedDate}
                settings={settings}
                sessionName={currentSessionObject?.name}
                editingRecord={null}
                onSuccess={handleSuccess}
              />
            )}
          </>
        )}
      </div>

      {/* ── Footer (creation mode only) ───────────────────────────────────── */}
      {!editingRecord && (
        <div className="flex justify-end px-5 py-3 border-t border-gray-100 bg-gray-50">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-gray-600 border-gray-200 hover:bg-white rounded-xl"
          >
            Close
          </Button>
        </div>
      )}
    </Modal>
  )
}