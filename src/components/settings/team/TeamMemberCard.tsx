'use client'

import { useState } from 'react'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { MoreHorizontal, Mail, Shield, User, Trash2, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

interface TeamMemberCardProps {
  member: any
  currentUserId: string
  canManage: boolean
  farmId: string
  onRemove: (memberId: string) => void
}

export function TeamMemberCard({ member, currentUserId, canManage, farmId, onRemove }: TeamMemberCardProps) {
  const { isMobile } = useDeviceInfo()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  
  const isCurrentUser = member.user_id === currentUserId
  const isOwner = member.role_type === 'farm_owner'
  
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'farm_owner': return 'bg-yellow-100 text-yellow-800'
      case 'farm_manager': return 'bg-blue-100 text-blue-800'
      case 'worker': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'farm_owner': return <Shield className="w-3 h-3" />
      case 'farm_manager': return <User className="w-3 h-3" />
      case 'worker': return <User className="w-3 h-3" />
      default: return <User className="w-3 h-3" />
    }
  }
  
  const handleRemove = async () => {
    setLoading(true)
    
    try {
      const response = await fetch(`/api/farms/${farmId}/team/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userRoleId: member.id,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove team member')
      }
      
      onRemove(member.id)
      setShowConfirm(false)
    } catch (error) {
      console.error('Error removing team member:', error)
      alert('Failed to remove team member. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  // Use the corrected data structure
  const userEmail = member.profiles?.email || 'No email'
  const userName = member.profiles?.user_metadata?.full_name || 
                   member.profiles?.user_metadata?.name || 
                   userEmail
  const avatarUrl = member.profiles?.user_metadata?.avatar_url
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  
  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <Avatar className={isMobile ? 'h-9 w-9 flex-shrink-0' : 'h-10 w-10 flex-shrink-0'}>
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={userName} />
                ) : (
                  <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0 flex-1">
                <h4 className={`font-medium text-gray-900 truncate ${isMobile ? 'text-sm' : 'text-base'}`}>
                  {userName}
                  {isCurrentUser && <span className="text-xs text-gray-500 ml-1">(You)</span>}
                </h4>
                <p className={`text-gray-600 flex items-center gap-1 truncate ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{userEmail}</span>
                </p>
              </div>
            </div>
            
            {canManage && !isCurrentUser && !isOwner && !isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex-shrink-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setShowConfirm(true)}
                    disabled={loading}
                    className="text-red-600 focus:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove from team
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {canManage && !isCurrentUser && !isOwner && isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={loading}
                className="flex-shrink-0 h-8 w-8 p-0"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            )}
          </div>
          
          <div className={`flex items-center justify-between gap-2 ${isMobile ? 'mt-2' : 'mt-3'}`}>
            <Badge className={`${getRoleBadgeColor(member.role_type)} ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {getRoleIcon(member.role_type)}
              <span className="ml-1 capitalize">
                {member.role_type.replace('_', ' ')}
              </span>
            </Badge>
            
            <span className={`text-gray-500 flex-shrink-0 ${isMobile ? 'text-xs' : 'text-xs'}`}>
              {new Date(member.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Confirmation Modal */}
      {showConfirm && isMobile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Remove Member?</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-sm text-gray-600">
              Are you sure you want to remove <strong>{userName}</strong> from the team?
            </p>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Confirmation Dialog */}
      {showConfirm && !isMobile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Remove Member?</h3>
              <p className="text-sm text-gray-600">
                Are you sure you want to remove <strong>{userName}</strong> from the team? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Removing...' : 'Remove'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}