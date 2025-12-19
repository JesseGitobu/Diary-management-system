// src/components/support/SupportModal.tsx

'use client'

import { useState, useEffect } from 'react'
import { X, MessageSquare, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { HelpCenter } from './HelpCenter'
import { ContactSupport } from './ContactSupport'
import { SupportTicketsList } from './SupportTicketsList'

interface SupportModalProps {
  isOpen: boolean
  onClose: () => void
  farmId: string
}

type TabType = 'help' | 'contact' | 'tickets'

export function SupportModal({ isOpen, onClose, farmId }: SupportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('help')
  const [showContactForm, setShowContactForm] = useState(false)
  const [ticketCount, setTicketCount] = useState(0)

  // Fetch ticket count for badge
  useEffect(() => {
    if (isOpen && activeTab === 'help') {
      const fetchTicketCount = async () => {
        try {
          const response = await fetch('/api/support/tickets')
          if (response.ok) {
            const data = await response.json()
            setTicketCount(data.tickets?.length || 0)
          }
        } catch (error) {
          console.error('Error fetching ticket count:', error)
        }
      }
      fetchTicketCount()
    }
  }, [isOpen, activeTab])

  if (!isOpen) return null

  // Determine title based on active view
  const getTitle = () => {
    if (showContactForm) return 'Contact Support'
    if (activeTab === 'help') return 'Help Center'
    if (activeTab === 'contact') return 'Contact Support'
    if (activeTab === 'tickets') return 'Your Support Tickets'
    return 'Support & Help'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-dairy-primary/5 to-transparent flex-shrink-0">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-dairy-primary" />
            <h2 className="text-xl font-semibold text-gray-900">
              {getTitle()}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Tab Navigation */}
        {!showContactForm && (
          <div className="flex border-b border-gray-200 bg-gray-50 px-6 flex-shrink-0">
            <button
              onClick={() => {
                setActiveTab('help')
                setShowContactForm(false)
              }}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'help'
                  ? 'border-dairy-primary text-dairy-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Help Center
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('tickets')
                setShowContactForm(false)
              }}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors relative ${
                activeTab === 'tickets'
                  ? 'border-dairy-primary text-dairy-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                Your Tickets
                {ticketCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-dairy-primary rounded-full">
                    {ticketCount > 9 ? '9+' : ticketCount}
                  </span>
                )}
              </span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-grow" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {showContactForm ? (
            <ContactSupport
              farmId={farmId}
              onBack={() => setShowContactForm(false)}
              onSuccess={onClose}
            />
          ) : activeTab === 'help' ? (
            <HelpCenter onContactClick={() => setShowContactForm(true)} />
          ) : activeTab === 'tickets' ? (
            <SupportTicketsList onTicketClick={onClose} />
          ) : null}
        </div>
      </div>
    </div>
  )
}