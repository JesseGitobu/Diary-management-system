'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { MoreHorizontal, Mail, Shield, User, Trash2 } from 'lucide-react'
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
  onRemove: (memberId: string) => void
}

export function TeamMemberCard({ member, currentUserId, canManage, onRemove }: TeamMemberCardProps) {
  const [loading, setLoading] = useState(false)
  
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
      case 'farm_owner': return <Shield className="w-4 h-4" />
      case 'farm_manager': return <User className="w-4 h-4" />
      case 'worker': return <User className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }
  
  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/farms/[farmId]/team/remove', {
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
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={userName} />
              ) : (
                <AvatarFallback>{userInitials}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <h4 className="font-medium text-gray-900">
                {userName}
                {isCurrentUser && <span className="text-sm text-gray-500 ml-1">(You)</span>}
              </h4>
              <p className="text-sm text-gray-600 flex items-center">
                <Mail className="w-3 h-3 mr-1" />
                {userEmail}
              </p>
            </div>
          </div>
          
          {canManage && !isCurrentUser && !isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleRemove}
                  disabled={loading}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove from team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          <Badge className={getRoleBadgeColor(member.role_type)}>
            {getRoleIcon(member.role_type)}
            <span className="ml-1 capitalize">
              {member.role_type.replace('_', ' ')}
            </span>
          </Badge>
          
          <span className="text-xs text-gray-500">
            Joined {new Date(member.created_at).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}