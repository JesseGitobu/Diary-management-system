'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react'
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
    label: 'Open'
  },
  in_progress: { 
    bg: 'bg-yellow-50', 
    text: 'text-yellow-700', 
    icon: Clock,
    label: 'In Progress'
  },
  resolved: { 
    bg: 'bg-green-50', 
    text: 'text-green-700', 
    icon: CheckCircle,
    label: 'Resolved'
  },
  closed: { 
    bg: 'bg-gray-50', 
    text: 'text-gray-700', 
    icon: XCircle,
    label: 'Closed'
  },
}

const priorityConfig: Record<string, string> = {
  low: '🟢 Low',
  medium: '🟡 Medium',
  high: '🔴 High',
  urgent: '🔴 Urgent',
}

export default function SupportPage() {
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

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true
    if (filter === 'open') return ticket.status !== 'closed'
    if (filter === 'closed') return ticket.status === 'closed'
    return true
  })

  if (isLoading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-dairy-primary"></div>
        </div>
        <p className="mt-4">Loading support tickets...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Support Tickets</h1>
        <p className="text-gray-600 mt-2">Track and manage your support requests</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-3 mb-6">
        {(['all', 'open', 'closed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === f
                ? 'bg-dairy-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="flex-1"></div>
        <Link href="/dashboard">
          <Button className="bg-dairy-primary hover:bg-dairy-primary/90 text-white">
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'No support tickets yet' : 'No tickets found'}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all' 
              ? "You haven't created any support requests. Contact support if you need help!"
              : 'Try adjusting your filters to see more tickets.'}
          </p>
          <Link href="/dashboard">
            <Button className="bg-dairy-primary hover:bg-dairy-primary/90 text-white">
              Go to Help Center
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const config = statusConfig[ticket.status]
            const StatusIcon = config.icon
            const priorityLabel = priorityConfig[ticket.priority]

            return (
              <Link
                key={ticket.id}
                href={`/dashboard/support/${ticket.id}`}
              >
                <div className={`p-5 border border-gray-200 rounded-lg hover:shadow-lg transition-all cursor-pointer ${config.bg}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{ticket.subject}</h3>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {ticket.description.substring(0, 120)}
                        {ticket.description.length > 120 ? '...' : ''}
                      </p>

                      <div className="flex gap-4 flex-wrap text-xs text-gray-600">
                        <span className="font-mono font-medium text-gray-900 bg-white px-2 py-1 rounded">
                          {ticket.ticket_number}
                        </span>
                        <span>{priorityLabel}</span>
                        <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                        <span>Updated: {new Date(ticket.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}