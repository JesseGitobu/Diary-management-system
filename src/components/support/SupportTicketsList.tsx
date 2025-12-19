// src/components/support/SupportTicketsList.tsx

'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, AlertCircle, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
}

const statusConfig: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  open: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: MessageSquare,
    label: 'Open',
  },
  in_progress: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    icon: Clock,
    label: 'In Progress',
  },
  resolved: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    icon: CheckCircle,
    label: 'Resolved',
  },
  closed: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    icon: XCircle,
    label: 'Closed',
  },
}

const priorityConfig: Record<string, string> = {
  low: '🟢 Low',
  medium: '🟡 Medium',
  high: '🔴 High',
  urgent: '🔴 Urgent',
}

interface SupportTicketsListProps {
  onTicketClick?: () => void
}

export function SupportTicketsList({ onTicketClick }: SupportTicketsListProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all')

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const response = await fetch('/api/support/tickets')

        if (!response.ok) {
          throw new Error('Failed to fetch support tickets')
        }

        const data = await response.json()
        setTickets(data.tickets || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load support tickets'
        setError(errorMessage)
        console.error('Error loading tickets:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTickets()
  }, [])

  const filteredTickets = tickets.filter((ticket) => {
    if (filter === 'all') return true
    if (filter === 'open') return ticket.status !== 'closed'
    if (filter === 'closed') return ticket.status === 'closed'
    return true
  })

  if (isLoading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-dairy-primary"></div>
        </div>
        <p className="mt-2 text-sm">Loading your tickets...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-900 text-sm">Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      {filteredTickets.length > 0 && (
        <div className="flex gap-2">
          {(['all', 'open', 'closed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-dairy-primary text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredTickets.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-700 mb-1">
            {filter === 'all' ? 'No support tickets yet' : 'No tickets found'}
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            {filter === 'all'
              ? "You haven't created any support requests yet."
              : 'Try adjusting your filters.'}
          </p>
          {filter === 'all' && (
            <div className="text-xs text-gray-600">
              Need help? Check the Help Center tab or create a new ticket.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const config = statusConfig[ticket.status]
            const StatusIcon = config.icon
            const priorityLabel = priorityConfig[ticket.priority]

            return (
              <Link
                key={ticket.id}
                href={`/dashboard/support/${ticket.id}`}
                onClick={onTicketClick}
              >
                <div className={`p-3 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer ${config.bg}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 text-sm truncate">{ticket.subject}</h4>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${config.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                        {ticket.description}
                      </p>

                      <div className="flex gap-2 flex-wrap text-xs text-gray-600">
                        <span className="font-mono font-medium text-gray-900 bg-white/70 px-1.5 py-0.5 rounded">
                          {ticket.ticket_number}
                        </span>
                        <span>{priorityLabel}</span>
                      </div>
                    </div>

                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* View All Link */}
      {filteredTickets.length > 0 && (
        <div className="pt-2 border-t border-gray-200">
          <Link href="/dashboard/support" onClick={onTicketClick}>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              View All Tickets in Full Page
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}