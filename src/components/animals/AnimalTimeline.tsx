'use client'

import React, { useState } from 'react'
import { FiDownload, FiFilter, FiCalendar } from 'react-icons/fi'
import { AuditLog } from '@/lib/database/audit-logs'
import { Button } from '@/components/ui/Button'

interface AnimalTimelineProps {
  animalId: string
  animalName: string
  logs: Array<{
    date: string
    events: AuditLog[]
  }>
  isLoading?: boolean
  onExport?: (format: 'json' | 'csv') => void
}

interface TimelineEvent extends AuditLog {
  formattedTime: string
  iconColor: string
  icon: React.ReactNode
}

const ActionIcons: Record<string, { icon: string; color: string; label: string }> = {
  create: { icon: '🐄', color: 'text-green-600', label: 'Animal Created' },
  update: { icon: '✏️', color: 'text-blue-600', label: 'Updated' },
  delete: { icon: '🗑️', color: 'text-red-600', label: 'Deleted' },
  status_change: { icon: '🔄', color: 'text-purple-600', label: 'Status Changed' },
  health_update: { icon: '⚕️', color: 'text-orange-600', label: 'Health Update' },
  production_update: { icon: '🥛', color: 'text-cyan-600', label: 'Production Update' },
  breeding_event: { icon: '👪', color: 'text-pink-600', label: 'Breeding Event' },
  weight_measurement: { icon: '⚖️', color: 'text-indigo-600', label: 'Weight Measured' },
  vaccination: { icon: '💉', color: 'text-yellow-600', label: 'Vaccination' },
  treatment: { icon: '🩹', color: 'text-red-500', label: 'Treatment' },
}

export default function AnimalTimeline({
  animalId,
  animalName,
  logs,
  isLoading = false,
  onExport,
}: AnimalTimelineProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  // Flatten and filter logs
  const allEvents = logs
    .flatMap((dayGroup) =>
      dayGroup.events.map((event) => ({
        ...event,
        formattedTime: new Date(event.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        iconColor: ActionIcons[event.action]?.color || 'text-gray-600',
      }))
    )
    .filter((event) => !selectedAction || event.action === selectedAction)

  const uniqueActions = [...new Set(allEvents.map((e) => e.action))]

  const getChangesSummary = (log: AuditLog): string => {
    if (!log.changed_fields || log.changed_fields.length === 0) {
      return 'No field changes recorded'
    }
    return log.changed_fields.join(', ')
  }

  const getValueDisplay = (value: any): string => {
    if (value === null || value === undefined) {
      return '—'
    }
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    return String(value)
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Animal History Timeline</h1>
        <p className="text-gray-600">
          Complete lifecycle record for <span className="font-semibold">{animalName}</span>
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 flex-wrap items-start sm:items-center justify-between">
        {/* Filter by Action */}
        <div className="flex items-center gap-2 flex-wrap">
          <FiFilter className="text-gray-500" size={20} />
          <button
            onClick={() => setSelectedAction(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedAction === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All ({allEvents.length})
          </button>
          {uniqueActions.map((action) => {
            const count = allEvents.filter((e) => e.action === action).length
            const actionConfig = ActionIcons[action] || { label: action }
            return (
              <button
                key={action}
                onClick={() => setSelectedAction(action === selectedAction ? null : action)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedAction === action
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {actionConfig.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => onExport?.('csv')}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
          >
            <FiDownload size={16} />
            CSV
          </Button>
          <Button
            onClick={() => onExport?.('json')}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
          >
            <FiDownload size={16} />
            JSON
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : allEvents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FiCalendar className="mx-auto mb-4 text-gray-400" size={32} />
          <p className="text-gray-600">No events found for the selected filter</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-purple-500"></div>

          {/* Timeline Events */}
          <div className="space-y-6 ml-20">
            {allEvents.map((event) => {
              const actionConfig = ActionIcons[event.action] || {}
              const isExpanded = expandedLog === event.id

              return (
                <div
                  key={event.id}
                  className="relative bg-gray-50 rounded-lg p-6 hover:shadow-md transition-all duration-200 border border-gray-200"
                >
                  {/* Dot on Timeline */}
                  <div className={`absolute -left-12 top-8 w-6 h-6 rounded-full border-4 border-white ${actionConfig.color || 'bg-gray-400'} shadow-md`} />

                  {/* Event Header */}
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedLog(isExpanded ? null : event.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{actionConfig.icon}</span>
                        <div>
                          <h3 className={`text-lg font-semibold ${actionConfig.color}`}>
                            {actionConfig.label}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {new Date(event.created_at).toLocaleDateString([], {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                            {' at '}
                            {event.formattedTime}
                          </p>
                        </div>
                      </div>

                      {/* Quick Info */}
                      {event.performed_by_name && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">By:</span> {event.performed_by_name}
                          {event.user_role && ` (${event.user_role})`}
                        </p>
                      )}

                      {event.reason && (
                        <p className="text-sm text-gray-700 mt-2">
                          <span className="font-medium">Reason:</span> {event.reason}
                        </p>
                      )}

                      {event.changed_fields && event.changed_fields.length > 0 && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Changed:</span> {getChangesSummary(event)}
                        </p>
                      )}
                    </div>

                    <button className="ml-4 text-gray-400 hover:text-gray-600 flex-shrink-0">
                      <svg
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                      {event.notes && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                          <p className="text-gray-700 bg-white p-3 rounded border border-gray-200">
                            {event.notes}
                          </p>
                        </div>
                      )}

                      {event.changes && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Details</h4>
                          <div className="space-y-4">
                            {/* Before and After Comparison */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {event.changes.before && Object.keys(event.changes.before).length > 0 && (
                                <div>
                                  <h5 className="text-sm font-medium text-gray-600 mb-2">Before</h5>
                                  <div className="bg-red-50 rounded p-3 text-sm space-y-1">
                                    {event.changed_fields?.map((field) => (
                                      <div key={field} className="text-gray-700">
                                        <span className="font-medium">{field}:</span>{' '}
                                        <span className="text-red-700">
                                          {getValueDisplay(event.changes?.before[field])}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {event.changes.after && Object.keys(event.changes.after).length > 0 && (
                                <div>
                                  <h5 className="text-sm font-medium text-gray-600 mb-2">After</h5>
                                  <div className="bg-green-50 rounded p-3 text-sm space-y-1">
                                    {event.changed_fields?.map((field) => (
                                      <div key={field} className="text-gray-700">
                                        <span className="font-medium">{field}:</span>{' '}
                                        <span className="text-green-700">
                                          {getValueDisplay(event.changes?.after[field])}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-gray-500 pt-2">
                        Event ID: {event.id}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
