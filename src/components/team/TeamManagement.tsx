'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TeamMemberCard } from '@/components/team/TeamMemberCard'
import { InvitationCard } from '@/components/team/InvitationCard'
import { AddTeamMemberModal } from '@/components/team/AddTeamMemberModal'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { Users, UserPlus, Clock, Crown, Settings, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react'

interface TeamManagementProps {
  currentUser: any
  currentUserRole: string
  farmId: string
  teamMembers: any[]
  pendingInvitations: any[]
  teamStats: {
    total: number
    pending: number
    owners: number
    managers: number
    workers: number
  }
}

export function TeamManagement({
  currentUser,
  currentUserRole,
  farmId,
  teamMembers: initialTeamMembers,
  pendingInvitations: initialPendingInvitations,
  teamStats: initialTeamStats
}: TeamManagementProps) {
  const [teamMembers, setTeamMembers] = useState(initialTeamMembers)
  const [pendingInvitations, setPendingInvitations] = useState(initialPendingInvitations)
  const [teamStats, setTeamStats] = useState(initialTeamStats)
  const [showAddModal, setShowAddModal] = useState(false)
  
  const { isMobile, isTablet } = useDeviceInfo()
  const canManageTeam = ['farm_owner', 'farm_manager'].includes(currentUserRole)
  
  const handleInvitationSent = (newInvitation: any) => {
    setPendingInvitations(prev => [newInvitation, ...prev])
    setTeamStats(prev => ({ ...prev, pending: prev.pending + 1 }))
    setShowAddModal(false)
  }
  
  const handleMemberRemoved = (removedMemberId: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== removedMemberId))
    setTeamStats(prev => ({ ...prev, total: prev.total - 1 }))
  }
  
  const handleInvitationCanceled = (canceledInvitationId: string) => {
    setPendingInvitations(prev => prev.filter(inv => inv.id !== canceledInvitationId))
    setTeamStats(prev => ({ ...prev, pending: prev.pending - 1 }))
  }

  // Stats data for easier management
  const statsData = [
    {
      id: 'total',
      title: 'Total Members',
      value: teamStats.total,
      description: 'Active team members',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'pending',
      title: 'Pending Invites',
      value: teamStats.pending,
      description: 'Awaiting response',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      id: 'managers',
      title: 'Managers',
      value: teamStats.owners + teamStats.managers,
      description: 'Owners & managers',
      icon: Settings,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      id: 'workers',
      title: 'Workers',
      value: teamStats.workers,
      description: 'Farm workers',
      icon: Briefcase,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ]
  
  return (
    <div className="space-y-4 lg:space-y-8 px-4 lg:px-0">
      {/* Mobile-Optimized Header */}
      <div className="space-y-4">
        <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Team Management</h1>
            <p className="text-sm lg:text-base text-gray-600">
              Manage your farm team and collaborate on daily operations
            </p>
          </div>
          
          {canManageTeam && (
            <Button 
              onClick={() => setShowAddModal(true)}
              className={`${isMobile ? 'w-full justify-center h-12' : ''}`}
              size={isMobile ? 'lg' : 'default'}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {isMobile ? 'Invite Team Member' : 'Invite Member'}
            </Button>
          )}
        </div>
      </div>
      
      {/* Horizontally Scrollable Team Stats */}
      <div className="relative">
        {/* Mobile: Horizontal scroll */}
        <div className="lg:hidden">
          <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
            {statsData.map((stat) => (
              <Card key={stat.id} className="flex-shrink-0 w-[280px] snap-start">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Scroll indicator dots */}
          <div className="flex justify-center space-x-1 mt-3">
            {statsData.map((_, index) => (
              <div 
                key={index} 
                className="w-1.5 h-1.5 bg-gray-300 rounded-full"
              />
            ))}
          </div>
        </div>
        
        {/* Desktop: Grid layout */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-6">
          {statsData.map((stat) => (
            <Card key={stat.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Current Team Members - Mobile Optimized */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg lg:text-xl">Team Members</CardTitle>
              <CardDescription className="text-sm">
                Current active members of your farm team
              </CardDescription>
            </div>
            {isMobile && teamMembers.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {teamMembers.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className={isMobile ? 'px-4' : ''}>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 lg:py-12">
              <div className="mx-auto w-16 h-16 lg:w-20 lg:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 lg:h-10 lg:w-10 text-gray-400" />
              </div>
              <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-2">No team members</h3>
              <p className="text-sm text-gray-500 mb-6">
                Get started by inviting your first team member.
              </p>
              {canManageTeam && (
                <Button 
                  onClick={() => setShowAddModal(true)}
                  size={isMobile ? 'lg' : 'default'}
                  className={isMobile ? 'w-full max-w-xs' : ''}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Team Member
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile: Single column with better spacing */}
              {isMobile ? (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <TeamMemberCard
                      key={member.id}
                      member={member}
                      currentUserId={currentUser.id}
                      canManage={canManageTeam}
                      onRemove={handleMemberRemoved}
                    />
                  ))}
                </div>
              ) : (
                /* Desktop: Grid layout */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamMembers.map((member) => (
                    <TeamMemberCard
                      key={member.id}
                      member={member}
                      currentUserId={currentUser.id}
                      canManage={canManageTeam}
                      onRemove={handleMemberRemoved}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Pending Invitations - Mobile Optimized */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg lg:text-xl">Pending Invitations</CardTitle>
                <CardDescription className="text-sm">
                  Invitations waiting for response
                </CardDescription>
              </div>
              {isMobile && (
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                  {pendingInvitations.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className={isMobile ? 'px-4' : ''}>
            {/* Mobile: Single column, Desktop: Grid */}
            <div className={`${
              isMobile 
                ? 'space-y-3' 
                : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            }`}>
              {pendingInvitations.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  canManage={canManageTeam}
                  onCancel={handleInvitationCanceled}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      
      
      {/* Add Team Member Modal */}
      {showAddModal && (
        <AddTeamMemberModal
          farmId={farmId}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onInvitationSent={handleInvitationSent}
        />
      )}
    
    </div>
  )
}