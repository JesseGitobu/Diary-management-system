'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TeamMemberCard } from '@/components/settings/team/TeamMemberCard'
import { InvitationCard } from '@/components/settings/team/InvitationCard'
import { AddTeamMemberModal } from '@/components/settings/team/AddTeamMemberModal'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { Users, UserPlus, Clock, Crown, Settings, Briefcase, ChevronLeft, ChevronRight, ArrowLeft, Stethoscope, Wrench, CheckCircle } from 'lucide-react'

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

const roleConfigs = {
  farm_owner: {
    label: 'Farm Owner',
    icon: Crown,
    color: 'text-purple-600 bg-purple-100',
    description: 'Full access to all farm management features',
    permissions: [
      'Manage all farm settings',
      'Add/remove team members',
      'View financial reports',
      'Export all data',
      'Manage subscriptions'
    ]
  },
  farm_manager: {
    label: 'Farm Manager',
    icon: Briefcase,
    color: 'text-blue-600 bg-blue-100',
    description: 'Comprehensive farm operations management',
    permissions: [
      'Manage animals and records',
      'View production reports',
      'Manage workers',
      'Configure farm settings',
      'Access health records'
    ]
  },
  worker: {
    label: 'Farm Worker',
    icon: Wrench,
    color: 'text-green-600 bg-green-100',
    description: 'Daily operations and data entry',
    permissions: [
      'Record milking data',
      'Log feeding activities',
      'Add animal treatments',
      'View assigned animals',
      'Update animal status'
    ]
  },
  veterinarian: {
    label: 'Veterinarian',
    icon: Stethoscope,
    color: 'text-red-600 bg-red-100',
    description: 'Health and medical management access',
    permissions: [
      'Access health records',
      'Prescribe treatments',
      'Schedule vaccinations',
      'View breeding records',
      'Generate health reports'
    ]
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
  const router = useRouter()
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
  const handleBack = () => {
    router.push(`/dashboard/settings`)
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
      <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Settings</span>
          </Button>
        </div>
        <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                Users & Roles
              </h1>
              <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
                Manage team members and their access permissions
              </p>
            </div>
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

      {/* Roles Information */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(roleConfigs).map(([role, config]) => (
            <Card key={role}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <span className={`p-2 rounded-lg ${config.color}`}>
                    <config.icon className="w-4 h-4" />
                  </span>
                  <span>{config.label}</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  {config.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1 text-sm text-gray-600">
                  {config.permissions.map((permission, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>{permission}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>      
      
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