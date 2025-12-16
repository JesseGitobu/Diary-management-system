// src/components/support/ContactSupport.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { createSupportTicket } from '@/lib/database/support'
import { SUPPORT_CATEGORIES } from '@/types/support'
import { ChevronRight, AlertCircle, CheckCircle } from 'lucide-react'

interface ContactSupportProps {
  farmId: string
  onBack: () => void
  onSuccess: () => void
}

export function ContactSupport({ farmId, onBack, onSuccess }: ContactSupportProps) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    tags: [] as string[],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validation
      if (!formData.subject.trim()) {
        throw new Error('Please enter a subject')
      }
      if (!formData.category) {
        throw new Error('Please select a category')
      }
      if (!formData.description.trim()) {
        throw new Error('Please describe your issue')
      }

      // Create ticket
      const ticket = await createSupportTicket(
        formData.subject,
        formData.description,
        farmId,
        formData.priority,
        [formData.category, ...formData.tags] // Include category as a tag
      )

      setTicketId(ticket.id)
      setTicketNumber(ticket.ticket_number)
      setStep('success')

      // Auto close after 3 seconds
      setTimeout(onSuccess, 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create support ticket'
      setError(errorMessage)
      console.error('Create ticket error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Success screen
  if (step === 'success') {
    return (
      <div className="p-6 text-center space-y-4">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Support Ticket Created</h3>
          <p className="text-sm text-gray-600 mt-2">
            Your ticket number is: <span className="font-mono font-bold text-dairy-primary">{ticketNumber}</span>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Ticket ID: <span className="font-mono text-xs text-gray-500">{ticketId?.slice(0, 8)}</span>
          </p>
          <p className="text-sm text-gray-600 mt-4">
            Our support team will respond to you within 24 hours. You'll receive an email update at your registered email address.
          </p>
          <p className="text-xs text-gray-500 mt-6">Redirecting...</p>
        </div>
      </div>
    )
  }

  // Form screen
  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center space-x-2 text-dairy-primary hover:text-dairy-primary/80 text-sm font-medium"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        Back to Help Center
      </button>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-900">Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
          Subject <span className="text-red-500">*</span>
        </label>
        <input
          id="subject"
          type="text"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Brief description of your issue"
          maxLength={200}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dairy-primary focus:border-transparent outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">{formData.subject.length}/200</p>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dairy-primary focus:border-transparent outline-none"
        >
          <option value="">Select a category...</option>
          {SUPPORT_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Priority
        </label>
        <div className="flex gap-4">
          {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
            <label key={priority} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="priority"
                value={priority}
                checked={formData.priority === priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-4 h-4 text-dairy-primary cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-700 capitalize cursor-pointer">
                {priority === 'urgent' ? '🔴 Urgent' : priority}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Select urgent only if your farm operations are affected
        </p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Please provide as much detail as possible about your issue. Include steps you've already taken to resolve it."
          rows={6}
          maxLength={2000}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dairy-primary focus:border-transparent resize-none outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">{formData.description.length}/2000</p>
      </div>

      {/* Additional Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Include specific details like error messages, the affected feature, and when the issue started. This helps us resolve your issue faster.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !formData.subject || !formData.category || !formData.description}
          className="flex-1 bg-dairy-primary hover:bg-dairy-primary/90 text-white disabled:opacity-50"
        >
          {isLoading ? 'Creating Ticket...' : 'Submit Support Request'}
        </Button>
      </div>
    </form>
  )
}