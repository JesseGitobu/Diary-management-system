// components/settings/production-distribution/sections/GeneralSessionsSection.tsx
'use client'

import React, { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface GeneralSessionsSectionProps {
  settings: any
  updateSetting: (key: string, value: any) => void
}

interface Session {
  id: string
  name: string
  time: string
}

export default function GeneralSessionsSection({
  settings,
  updateSetting
}: GeneralSessionsSectionProps) {
  const [sessions, setSessions] = useState<Session[]>(
    settings.milkingSessions || [
      { id: '1', name: 'Morning', time: '06:00' },
      { id: '2', name: 'Afternoon', time: '14:00' },
      { id: '3', name: 'Evening', time: '18:00' }
    ]
  )

  const addSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      name: '',
      time: '00:00'
    }
    const updatedSessions = [...sessions, newSession]
    setSessions(updatedSessions)
    updateSetting('milkingSessions', updatedSessions)
  }

  const removeSession = (id: string) => {
    const updatedSessions = sessions.filter(s => s.id !== id)
    setSessions(updatedSessions)
    updateSetting('milkingSessions', updatedSessions)
  }

  const updateSession = (id: string, field: 'name' | 'time', value: string) => {
    const updatedSessions = sessions.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    )
    setSessions(updatedSessions)
    updateSetting('milkingSessions', updatedSessions)
  }

  return (
    <div className="space-y-6">
      {/* General Tracking Card */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">General Tracking</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tracking Mode
            </label>
            <select
              value={settings.productionTrackingMode || 'basic'}
              onChange={e => updateSetting('productionTrackingMode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="basic">Basic - Volume Only</option>
              <option value="advanced">Advanced - Volume + Quality</option>
              <option value="quality_focused">Quality Focused - Emphasis on Quality Metrics</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Production Unit
            </label>
            <select
              value={settings.productionUnit || 'liters'}
              onChange={e => updateSetting('productionUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="liters">Liters (L)</option>
              <option value="kilograms">Kilograms (kg)</option>
              <option value="gallons">Gallons (US)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Recording Method
            </label>
            <select
              value={settings.recordingMethod || 'manual'}
              onChange={e => updateSetting('recordingMethod', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="manual">Manual Entry</option>
              <option value="automated">Automated (Device Integration)</option>
              <option value="hybrid">Hybrid (Manual + Device)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Milking Sessions Card */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Milking Sessions</h3>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.allowMultipleSessionsPerDay !== false}
              onChange={e => updateSetting('allowMultipleSessionsPerDay', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Allow Multiple Sessions Per Day
            </span>
          </label>

          <div className="space-y-3 mt-6 border-t pt-4">
            <h4 className="font-medium text-gray-900">Configured Sessions</h4>
            <p className="text-sm text-gray-600">
              Add or edit milking sessions. All sessions are automatically active.
            </p>
            
            {sessions.map(session => (
              <div key={session.id} className="flex gap-2 items-end p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Session Name
                  </label>
                  <input
                    type="text"
                    value={session.name}
                    onChange={e => updateSession(session.id, 'name', e.target.value)}
                    placeholder="e.g., Morning"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Session Time
                  </label>
                  <input
                    type="time"
                    value={session.time}
                    onChange={e => updateSession(session.id, 'time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <button
                  onClick={() => removeSession(session.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <Button
              onClick={addSession}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
