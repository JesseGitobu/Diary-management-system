// src/app/dashboard/support/[id]/page.tsx

'use client'

// 1. Import 'use' from react
import { useState, useEffect, useRef, use } from 'react'
import { Send, AlertCircle, CheckCircle, ArrowLeft, Clock, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

interface Message {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  is_internal: boolean
  created_at: string
}

const statusColors: Record<string, string> = {
  open: 'text-blue-700 bg-blue-50 border-blue-200',
  in_progress: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  resolved: 'text-green-700 bg-green-50 border-green-200',
  closed: 'text-gray-700 bg-gray-50 border-gray-200',
}

// 2. Update Prop Interface to be a Promise
export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // 3. Unwrap the params using the `use` hook
  const { id } = use(params)

  const router = useRouter()
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const loadTicket = async () => {
      try {
        // 4. Use the unwrapped 'id' variable instead of 'params.id'
        const response = await fetch(`/api/support/tickets/${id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Ticket not found')
          }
          throw new Error('Failed to load ticket')
        }

        const data = await response.json()
        setTicket(data.ticket)
        setMessages(data.messages || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load support ticket'
        setError(errorMessage)
        console.error('Error loading ticket:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTicket()
  // 5. Update dependency array to use 'id'
  }, [id])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket || !newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      const response = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      setMessages([...messages, data.message])
      setNewMessage('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      console.error('Error sending message:', err)
    } finally {
      setIsSending(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return

    try {
      const response = await fetch(`/api/support/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      const data = await response.json()
      setTicket(data.ticket)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status'
      setError(errorMessage)
      console.error('Error updating status:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-dairy-primary"></div>
        </div>
        <p className="mt-4">Loading support ticket...</p>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Ticket Not Found</h3>
        <p className="text-gray-600 mb-6">{error || 'Support ticket could not be loaded'}</p>
        <Link href="/dashboard/support">
          <Button className="bg-dairy-primary hover:bg-dairy-primary/90 text-white">
            Back to Support Tickets
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Back Link */}
      <Link 
        href="/dashboard/support" 
        className="flex items-center gap-2 text-dairy-primary hover:text-dairy-primary/80 font-medium mb-6 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Support Tickets
      </Link>

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

      {/* Ticket Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
            <p className="text-sm text-gray-600 mt-2 font-mono">
              Ticket: <span className="font-semibold text-gray-900">{ticket.ticket_number}</span>
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${statusColors[ticket.status]}`}>
            {ticket.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-gray-600 text-xs font-medium mb-1">Priority</p>
            <p className="font-semibold text-gray-900 capitalize">{ticket.priority}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-gray-600 text-xs font-medium mb-1">Created</p>
            <p className="font-semibold text-gray-900 text-xs">
              {new Date(ticket.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-gray-600 text-xs font-medium mb-1">Last Updated</p>
            <p className="font-semibold text-gray-900 text-xs">
              {new Date(ticket.updated_at).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-gray-600 text-xs font-medium mb-1">Messages</p>
            <p className="font-semibold text-gray-900">{messages.length}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {/* Status Update Buttons */}
        {ticket.status !== 'closed' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Update Status:</p>
            <div className="flex flex-wrap gap-2">
              {(['open', 'in_progress', 'resolved', 'closed'] as const).map((status) => (
                <Button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  variant={ticket.status === status ? 'default' : 'outline'}
                  size="sm"
                  disabled={ticket.status === status || isSending}
                  className={ticket.status === status ? 'bg-dairy-primary text-white' : ''}
                >
                  {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messages Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Conversation
        </h2>

        <div 
          className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 space-y-3 overflow-y-auto"
          style={{ maxHeight: '400px' }}
        >
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No messages yet. Start the conversation by sending a message below.
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-3 rounded-lg ${
                    message.sender_id
                      ? 'bg-dairy-primary text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-900 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  <p className={`text-xs mt-2 ${message.sender_id ? 'text-dairy-primary/70' : 'text-gray-600'}`}>
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        {ticket.status !== 'closed' ? (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message here..."
              maxLength={500}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dairy-primary focus:border-transparent outline-none"
              disabled={isSending}
            />
            <Button
              type="submit"
              disabled={isSending || !newMessage.trim()}
              className="bg-dairy-primary hover:bg-dairy-primary/90 text-white disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center text-yellow-800 text-sm">
            ✓ This ticket is closed. You cannot add new messages to closed tickets.
          </div>
        )}
      </div>
    </div>
  )
}