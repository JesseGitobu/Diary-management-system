'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TeamMemberCard } from '@/components/team/TeamMemberCard'
import { InvitationCard } from '@/components/team/InvitationCard'
import { AddTeamMemberModal } from '@/components/team/AddTeamMemberModal'
import { Users, UserPlus, Clock, Crown, Settings, Briefcase } from 'lucide-react'

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
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-2">
            Manage your farm team and collaborate on daily operations
          </p>
        </div>
        {canManageTeam && (
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Team Member
          </Button>
        )}
      </div>
      
      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Active team members
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.owners + teamStats.managers}</div>
            <p className="text-xs text-muted-foreground">
              Owners & managers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workers</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.workers}</div>
            <p className="text-xs text-muted-foreground">
              Farm workers
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Current Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Current active members of your farm team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by inviting your first team member.
              </p>
            </div>
          ) : (
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
        </CardContent>
      </Card>
      
      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Invitations waiting for response
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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