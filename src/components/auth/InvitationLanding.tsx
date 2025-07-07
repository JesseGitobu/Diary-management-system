'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Building2, 
  MapPin, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle,
  XCircle 
} from 'lucide-react'

interface InvitationLandingProps {
  invitation: any
  token: string
}

export function InvitationLanding({ invitation, token }: InvitationLandingProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  const handleAccept = () => {
    setLoading(true)
    // Redirect to auth page with invitation token
    router.push(`/auth?invitation=${token}&mode=signup`)
  }
  
  const handleDecline = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/invitations/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })
      
      if (response.ok) {
        router.push('/?message=invitation_declined')
      } else {
        alert('Failed to decline invitation. Please try again.')
      }
    } catch (error) {
      console.error('Error declining invitation:', error)
      alert('Failed to decline invitation. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const expiresAt = new Date(invitation.expires_at)
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  
  const roleDisplayName = invitation.role_type.replace('_', ' ')
  const inviterName = invitation.inviter?.full_name || invitation.inviter?.email || 'Farm Owner'
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-farm-green/10 to-farm-sky/10 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            You're Invited to Join a Farm Team!
          </h1>
          <p className="text-gray-600">
            You've been invited to collaborate on farm management
          </p>
        </div>
        
        {/* Invitation Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-farm-green" />
              <span>{invitation.farms.name}</span>
            </CardTitle>
            <CardDescription>
              Invitation from {inviterName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Farm Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Farm Details</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {invitation.farms.location || 'Location not specified'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 capitalize">
                      {invitation.farms.farm_type || 'Farm type not specified'} Farm
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      Invited by {inviterName}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Role Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Your Role</h3>
                
                <div className="space-y-3">
                  <div>
                    <Badge className="mb-2 capitalize">
                      {roleDisplayName}
                    </Badge>
                    <p className="text-sm text-gray-600">
                      {invitation.role_type === 'farm_manager' 
                        ? 'You can manage animals, view reports, and invite team members.'
                        : 'You can view and add data for animals and farm operations.'
                      }
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      Invited on {new Date(invitation.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* What You'll Get Access To */}
        <Card>
          <CardHeader>
            <CardTitle>What You'll Have Access To</CardTitle>
            <CardDescription>
              As a {roleDisplayName}, you can use these features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Animal Management</p>
                  <p className="text-sm text-gray-600">View and track animal health and production</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Data Entry</p>
                  <p className="text-sm text-gray-600">Record daily activities and observations</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Reports & Analytics</p>
                  <p className="text-sm text-gray-600">View farm performance and insights</p>
                </div>
              </div>
              
              {invitation.role_type === 'farm_manager' && (
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Team Management</p>
                    <p className="text-sm text-gray-600">Invite and manage other team members</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleAccept}
            disabled={loading}
            size="lg"
            className="flex-1 sm:flex-none"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Accept Invitation
          </Button>
          
          <Button
            onClick={handleDecline}
            disabled={loading}
            variant="outline"
            size="lg"
            className="flex-1 sm:flex-none"
          >
            <XCircle className="mr-2 h-5 w-5" />
            Decline
          </Button>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <p>
            By accepting this invitation, you agree to collaborate on {invitation.farms.name}'s 
            farm management and data.
          </p>
        </div>
      </div>
    </div>
  )
}