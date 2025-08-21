'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const invitationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  roleType: z.enum(['farm_manager', 'worker']),
})

type InvitationFormData = z.infer<typeof invitationSchema>

interface AddTeamMemberModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onInvitationSent: (invitation: any) => void
}

export function AddTeamMemberModal({ farmId, isOpen, onClose, onInvitationSent }: AddTeamMemberModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const form = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: '',
      fullName: '',
      roleType: 'worker',
    },
  })
  
  const handleSubmit = async (data: InvitationFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/farms/[farmId]/team/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmId,
          ...data,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation')
      }
      
      setSuccess(true)
      onInvitationSent(result.invitation)
      
      // Reset form
      form.reset()
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 2000)
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }
  
  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Invitation Sent!
          </h3>
          <p className="text-gray-600">
            The team member will receive an email with instructions to join your farm.
          </p>
        </div>
      </Modal>
    )
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Invite Team Member
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              {...form.register('fullName')}
              error={form.formState.errors.fullName?.message}
              placeholder="John Doe"
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              error={form.formState.errors.email?.message}
              placeholder="john@example.com"
            />
          </div>
          
          <div>
            <Label htmlFor="roleType">Role</Label>
            <select
              id="roleType"
              {...form.register('roleType')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
            >
              <option value="worker">Worker</option>
              <option value="farm_manager">Farm Manager</option>
            </select>
            {form.formState.errors.roleType && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.roleType.message}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Workers can view and add data. Managers can also invite team members.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}