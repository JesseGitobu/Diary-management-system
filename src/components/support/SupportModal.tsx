// src/components/support/SupportModal.tsx
'use client'

import { useState } from 'react'
import { X, ChevronLeft, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { HelpCenter } from './HelpCenter'
import { ContactSupport } from './ContactSupport'

interface SupportModalProps {
  isOpen: boolean
  onClose: () => void
  farmId: string
}

type TabType = 'help' | 'contact'

export function SupportModal({ isOpen, onClose, farmId }: SupportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('help')
  const [showContactForm, setShowContactForm] = useState(false)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-dairy-primary/5 to-transparent">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-dairy-primary" />
            <h2 className="text-xl font-semibold text-gray-900">
              {showContactForm ? 'Contact Support' : 'Help Center'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {showContactForm ? (
            <ContactSupport
              farmId={farmId}
              onBack={() => setShowContactForm(false)}
              onSuccess={onClose}
            />
          ) : (
            <HelpCenter onContactClick={() => setShowContactForm(true)} />
          )}
        </div>
      </div>
    </div>
  )
}