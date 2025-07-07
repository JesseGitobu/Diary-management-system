'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Mail, Clock, RotateCcw, X, Copy } from 'lucide-react'

interface InvitationCardProps {
  invitation: any
  canManage: boolean
  onCancel: (invitationId: string) => void
}

export function InvitationCard({ invitation, canManage, onCancel }: InvitationCardProps) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/team/cancel-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitation.id,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to cancel invitation')
      }
      
      onCancel(invitation.id)
    } catch (error) {
      console.error('Error canceling invitation:', error)
      alert('Failed to cancel invitation. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleResend = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/team/resend-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitation.id,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to resend invitation')
      }
      
      alert('Invitation resent successfully!')
    } catch (error) {
      console.error('Error resending invitation:', error)
      alert('Failed to resend invitation. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const copyInvitationLink = async () => {
    const invitationLink = `${window.location.origin}/invite/${invitation.token}`
    
    try {
      await navigator.clipboard.writeText(invitationLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy invitation link:', error)
    }
  }
  
  const expiresAt = new Date(invitation.expires_at)
  const isExpired = expiresAt < new Date()
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-gray-900">{invitation.email}</h4>
            <p className="text-sm text-gray-600 flex items-center">
              <Mail className="w-3 h-3 mr-1" />
              Role: {invitation.role_type.replace('_', ' ')}
            </p>
          </div>
          
          {canManage && (
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyInvitationLink}
                title="Copy invitation link"
              >
                <Copy className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={loading || isExpired}
                title="Resend invitation"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={loading}
                title="Cancel invitation"
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <Badge variant={isExpired ? "destructive" : "secondary"}>
            <Clock className="w-3 h-3 mr-1" />
            {isExpired ? 'Expired' : `${daysUntilExpiry} days left`}
          </Badge>
          
          {copied && (
            <span className="text-xs text-green-600">Link copied!</span>
          )}
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Sent {new Date(invitation.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )
}