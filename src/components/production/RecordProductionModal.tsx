'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { IndividualRecordForm } from './IndividualRecordForm'
import { GroupRecordForm } from './GroupRecordForm'
import { ProductionSettings } from '@/types/production-distribution-settings'
import { Calendar, Clock } from 'lucide-react'

type Tab = 'individual' | 'group'
type MilkingSession = 'morning' | 'afternoon' | 'evening'

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
}

export function RecordProductionModal({
  isOpen,
  onClose,
  farmId,
  animals,
  settings,
  onSuccess
}: RecordProductionModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('individual')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
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

  // Initialize selectedSession to first session ID
  const [selectedSession, setSelectedSession] = useState<string>(
    sessions.length > 0 ? sessions[0].id : 'morning'
  )
  
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      {/* Header with Title */}
      <div className="bg-stone-50 border-b border-stone-200 px-6 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">Record Production</h2>
      </div>

      {/* Header Bar */}
      <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        {/* Left Side — Context Info */}
        <div className="flex items-center space-x-6">
          {/* Date Picker */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-stone-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minAllowedDate}
              max={new Date().toISOString().split('T')[0]}
              className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              title={`Can record up to ${settings?.maxRetroactiveDays || 0} days back`}
            />
            <span className="text-xs text-stone-500">
              {formattedDate}
            </span>
          </div>

          {/* Session Selector */}
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-stone-500" />
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name} ({session.time})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Side — Tab Switcher */}
        <div className="flex items-center space-x-2 bg-white border border-stone-200 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
              activeTab === 'individual'
                ? 'bg-green-100 text-green-700'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            By Individual
          </button>
          <button
            onClick={() => setActiveTab('group')}
            className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
              activeTab === 'group'
                ? 'bg-green-100 text-green-700'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            By Group
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px] p-6">
        {activeTab === 'individual' && (
          <IndividualRecordForm
            farmId={farmId}
            animals={animals}
            session={selectedSession}
            sessionId={selectedSession}
            recordDate={selectedDate}
            settings={settings}
            closeAfterSuccess={false}
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
          />
        )}
      </div>

      {/* Close Button */}
      <div className="border-t border-stone-200 px-6 py-4 flex justify-end">
        <Button variant="outline" onClick={handleCloseModal}>
          Close
        </Button>
      </div>
    </Modal>
  )
}
