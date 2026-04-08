// src/components/teams-roles/TeamRolesManagement.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/Tabs'
import { TeamRolesStatsCards } from './TeamRolesStatsCards'
import { DepartmentModal } from './DepartmentModal'
import { WorkerModal } from './WorkerModal'
import { InvitationModal } from './InvitationModal'
import { AccessControlModal } from './AccessControlModal'
import {
  Users,
  Briefcase,
  CheckSquare,
  Clock,
  Shield,
  Mail,
  Plus,
  ChevronDown,
  UserPlus,
  FolderPlus,
  ListPlus,
  MailPlus,
  LockKeyhole,
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock3,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { OPERATION_CATEGORIES } from '@/lib/utils/permissions'

const RESOURCE_LABELS: Record<string, string> = {
  animals: 'Animals', health: 'Health', production: 'Production',
  breeding: 'Breeding', financial: 'Financial', inventory: 'Inventory',
  equipment: 'Equipment', feed: 'Feed', reports: 'Reports',
  team: 'Team', dashboard: 'Dashboard', settings: 'Settings',
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  view:   { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'View' },
  create: { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Create' },
  edit:   { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Edit' },
  delete: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Delete' },
  export: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Export' },
}

// Component to display access control policies with user counts
interface AccessControlPoliciesViewProps {
  farmId: string
  onOpenModal: () => void
  onEditPolicy?: (policy: any) => void
  onDeletePolicy?: (policyId: string, policyName: string) => void
}

function AccessControlPoliciesView({ farmId, onOpenModal, onEditPolicy, onDeletePolicy }: AccessControlPoliciesViewProps) {
  const [policies, setPolicies] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set())
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set())
  const [expandedResourceRows, setExpandedResourceRows] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPoliciesAndMembers()
  }, [farmId])

  const fetchPoliciesAndMembers = async () => {
    setError(null)

    try {
      // Fetch policies
      const policiesResponse = await fetch(`/api/access-control?farmId=${farmId}`)
      if (!policiesResponse.ok) throw new Error('Failed to fetch policies')
      const policiesData = await policiesResponse.json()
      setPolicies(policiesData || [])

      // Fetch team members
      const membersResponse = await fetch(`/api/access-control/team-members?farmId=${farmId}`)
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        setTeamMembers(membersData || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    }
  }

  const togglePolicyExpanded = (policyId: string) => {
    setExpandedPolicies((prev) => {
      const updated = new Set(prev)
      if (updated.has(policyId)) {
        updated.delete(policyId)
      } else {
        updated.add(policyId)
      }
      return updated
    })
  }

  const toggleResourceExpanded = (policyId: string) => {
    const key = `policy-${policyId}`
    setExpandedResources((prev) => {
      const updated = new Set(prev)
      if (updated.has(key)) { updated.delete(key) } else { updated.add(key) }
      return updated
    })
  }

  const toggleResourceRow = (policyId: string, resource: string) => {
    const key = `${policyId}-${resource}`
    setExpandedResourceRows((prev) => {
      const updated = new Set(prev)
      if (updated.has(key)) { updated.delete(key) } else { updated.add(key) }
      return updated
    })
  }

  const toggleCategoryRow = (policyId: string, resource: string, cat: string) => {
    const key = `${policyId}-${resource}-${cat}`
    setExpandedCategories((prev) => {
      const updated = new Set(prev)
      if (updated.has(key)) { updated.delete(key) } else { updated.add(key) }
      return updated
    })
  }

  const getAssignedUsers = (policyId: string) => {
    return teamMembers.filter((member) => member.assigned_policy_id === policyId)
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700 font-medium">
          <AlertCircle className="w-4 h-4" />
          Error loading policies
        </div>
        <p className="text-sm text-red-600 mt-2">{error}</p>
      </div>
    )
  }

  if (policies.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="font-medium">No policies configured yet</p>
        <p className="text-sm text-gray-500 mt-1">Create policies to define team member permissions</p>
        <Button onClick={onOpenModal} className="mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Create Policy
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
      {policies.map((policy) => {
        const assignedUsers = getAssignedUsers(policy.id)
        const isExpanded = expandedPolicies.has(policy.id)

        return (
          <Card key={policy.id} className="hover:shadow-md transition-shadow overflow-hidden">
            {/* Policy Header */}
            <div className="flex items-start justify-between p-4 hover:bg-gray-50 transition-colors group">
              <button
                onClick={() => togglePolicyExpanded(policy.id)}
                className="flex items-start gap-3 flex-1 min-w-0"
              >
                <ChevronDown
                  className={`w-5 h-5 text-gray-600 mt-1 flex-shrink-0 transition-transform ${
                    isExpanded ? 'rotate-0' : '-rotate-90'
                  }`}
                />
                <div className="text-left flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate mb-1.5">
                    {policy.name}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium whitespace-nowrap">
                      {policy.role_type.replace(/_/g, ' ')}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium whitespace-nowrap">
                      {assignedUsers.length} user{assignedUsers.length !== 1 ? 's' : ''}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs whitespace-nowrap">
                      {(() => {
                        const count = Object.keys(policy.operations || {}).length
                        return `${count} resource${count !== 1 ? 's' : ''}`
                      })()}
                    </span>
                  </div>
                  {policy.description && (
                    <p className="text-xs text-gray-500 line-clamp-1 mt-1">{policy.description}</p>
                  )}
                </div>
              </button>

              {/* Edit/Delete Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <button
                  onClick={() => onEditPolicy?.(policy)}
                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 hover:text-blue-700"
                  title="Edit policy"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeletePolicy?.(policy.id, policy.name)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600 hover:text-red-700"
                  title="Delete policy"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                {/* Resource Permissions */}
                <div>
                  <button
                    onClick={() => toggleResourceExpanded(policy.id)}
                    className="w-full flex items-center justify-between hover:bg-gray-100 transition-colors rounded px-2 py-1 mb-2"
                  >
                    <p className="text-xs font-medium text-gray-700">Resources & Actions</p>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-600 transition-transform ${
                        expandedResources.has(`policy-${policy.id}`) ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </button>

                  {expandedResources.has(`policy-${policy.id}`) && (
                    <div className="space-y-1.5">
                      {Object.keys(policy.operations || {}).length > 0 ? (
                        Object.entries(policy.operations as Record<string, string[]>).map(([resource, opKeys]) => {
                          const byCategory: Record<string, string[]> = {}
                          const catMap = OPERATION_CATEGORIES[resource] ?? {}
                          for (const key of opKeys) {
                            const cat = catMap[key] ?? 'other'
                            if (!byCategory[cat]) byCategory[cat] = []
                            byCategory[cat].push(key)
                          }
                          const resourceRowKey = `${policy.id}-${resource}`
                          const isResourceRowOpen = expandedResourceRows.has(resourceRowKey)
                          const totalOps = opKeys.length

                          return (
                            <div key={resource} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                              {/* Resource header — collapsible */}
                              <button
                                onClick={() => toggleResourceRow(policy.id, resource)}
                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 transition-transform ${isResourceRowOpen ? 'rotate-0' : '-rotate-90'}`} />
                                  <span className="text-xs font-semibold text-gray-800">
                                    {RESOURCE_LABELS[resource] ?? resource}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  {totalOps} op{totalOps !== 1 ? 's' : ''}
                                </span>
                              </button>

                              {/* Categories — shown when resource is open */}
                              {isResourceRowOpen && (
                                <div className="border-t border-gray-100 divide-y divide-gray-100">
                                  {Object.entries(byCategory).map(([cat, keys]) => {
                                    const style = CATEGORY_STYLES[cat] ?? { bg: 'bg-gray-100', text: 'text-gray-700', label: cat }
                                    const catKey = `${policy.id}-${resource}-${cat}`
                                    const isCatOpen = expandedCategories.has(catKey)

                                    return (
                                      <div key={cat}>
                                        {/* Category header — collapsible */}
                                        <button
                                          onClick={() => toggleCategoryRow(policy.id, resource, cat)}
                                          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 transition-colors"
                                        >
                                          <div className="flex items-center gap-2">
                                            <ChevronDown className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform ${isCatOpen ? 'rotate-0' : '-rotate-90'}`} />
                                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${style.bg} ${style.text}`}>
                                              {style.label}
                                            </span>
                                          </div>
                                          <span className="text-xs text-gray-400 flex-shrink-0">
                                            {keys.length}
                                          </span>
                                        </button>

                                        {/* Operations — shown when category is open */}
                                        {isCatOpen && (
                                          <div className="px-3 pb-2 pt-1 flex flex-wrap gap-1 bg-gray-50">
                                            {keys.map(key => (
                                              <span key={key} className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600 rounded text-xs">
                                                {key.replace(/_/g, ' ')}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-xs text-gray-500 italic px-2">No operations configured</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Assigned Users Section */}
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Assigned Users ({assignedUsers.length})
                  </p>
                  {assignedUsers.length > 0 ? (
                    <div className="space-y-2 bg-white rounded p-3 border border-gray-200">
                      {assignedUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-6 h-6 rounded-full bg-dairy-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                              {(user.full_name || user.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {user.full_name || 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-600 truncate">{user.email}</p>
                            </div>
                          </div>
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium flex-shrink-0 ml-2">
                            {user.role_type.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded border border-gray-200">
                      <p className="text-xs text-gray-600 italic">No users assigned to this policy yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// Deletion confirmation dialog component
interface DeleteConfirmationProps {
  isOpen: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
}

function DeleteConfirmationDialog({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  isPending = false,
}: DeleteConfirmationProps) {
  const [confirmPhrase, setConfirmPhrase] = useState('')
  const confirmText = 'DELETE'
  const isConfirmValid = confirmPhrase === confirmText

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
            <p className="text-sm text-gray-600 mt-2">{description}</p>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type "{confirmText}" to confirm deletion:
              </label>
              <input
                type="text"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={isPending}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onCancel}
                disabled={isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={!isConfirmValid || isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

interface Department {
  id: string
  name: string
  description: string | null
  created_at: string | null
  updated_at: string | null
}

interface Worker {
  id: string
  name: string
  worker_number: string
  employment_status: string
  position: string
  shift?: string | null
  department_id?: string | null
  casual_rate?: number | null
}

interface Invitation {
  id: string
  farm_id: string
  email: string
  full_name: string
  role_type: 'farm_owner' | 'farm_manager' | 'worker' | 'veterinarian'
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  sent_by: string
  sent_at: string
  accepted_at: string | null
  department_id?: string | null
  created_at: string
  updated_at: string
}

interface TeamRolesManagementProps {
  stats?: {
    activeWorkers?: number
    activeTasks?: number
    pendingInvitations?: number
    departments?: number
  }
  farmId?: string
  departmentsList?: Department[]
  workersList?: Worker[]
}

type TabType = 'team' | 'tasks' | 'system-users'

const QUICK_ACTIONS = [
  {
    label: 'Add Team Member',
    icon: UserPlus,
    href: null,
    color: 'text-blue-600',
    action: 'openWorkerModal',
  },
  {
    label: 'Create Department',
    icon: FolderPlus,
    href: null,
    color: 'text-purple-600',
    action: 'openDepartmentModal',
  },
  {
    label: 'Create Task',
    icon: ListPlus,
    href: '/dashboard/teams/tasks/new',
    color: 'text-green-600',
    action: null,
  },
  {
    label: 'Send Invitation',
    icon: MailPlus,
    href: null,
    color: 'text-indigo-600',
    action: 'openInvitationModal',
  },
  {
    label: 'Manage Access',
    icon: LockKeyhole,
    href: null,
    color: 'text-red-600',
    action: 'openAccessControlModal',
  },
]

export function TeamRolesManagement({ 
  stats = {
    activeWorkers: 0,
    activeTasks: 0,
    pendingInvitations: 0,
    departments: 0,
  },
  farmId = '',
  departmentsList = [],
  workersList = [],
}: TeamRolesManagementProps) {
  const [activeTab, setActiveTab] = useState<TabType>('team')
  const [teamSubTab, setTeamSubTab] = useState<'workers' | 'departments'>('workers')
  const [tasksSubTab, setTasksSubTab] = useState<'tasks' | 'daily-activities'>('tasks')
  const [systemUsersSubTab, setSystemUsersSubTab] = useState<'access-control' | 'system-users'>('access-control')
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false)
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false)
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false)
  const [isAccessControlModalOpen, setIsAccessControlModalOpen] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false)
  const [invitationsError, setInvitationsError] = useState<string | null>(null)
  const [farmOwners, setFarmOwners] = useState<Invitation[]>([])
  const [policies, setPolicies] = useState<any[]>([])
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false)
  const [policiesError, setPoliciesError] = useState<string | null>(null)
  const [userPolicies, setUserPolicies] = useState<{ [email: string]: string | null }>({})
  const [userRoleIds, setUserRoleIds] = useState<{ [email: string]: string }>({})
  const [assigningPolicy, setAssigningPolicy] = useState<string | null>(null)
  const [resendingInvitation, setResendingInvitation] = useState<string | null>(null)
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set(['farm_owner', 'farm_manager', 'worker', 'veterinarian']))
  
  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    type: 'worker' | 'department' | 'invitation' | 'policy' | null
    id: string | null
    name: string | null
  }>({
    isOpen: false,
    type: null,
    id: null,
    name: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Edit state
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null)
  const [editingPolicy, setEditingPolicy] = useState<any | null>(null)

  // Fetch invitations when component mounts
  useEffect(() => {
    fetchInvitations()
    fetchPolicies()
    fetchFarmOwner()
  }, [farmId])

  const fetchInvitations = async () => {
    if (!farmId) return

    setIsLoadingInvitations(true)
    setInvitationsError(null)

    try {
      const response = await fetch('/api/teams/invitations')
      if (!response.ok) {
        throw new Error('Failed to fetch invitations')
      }
      const data = await response.json()
      setInvitations(data || [])
    } catch (error) {
      console.error('Error fetching invitations:', error)
      setInvitationsError(error instanceof Error ? error.message : 'Failed to fetch invitations')
      setInvitations([])
    } finally {
      setIsLoadingInvitations(false)
    }
  }

  const fetchFarmOwner = async () => {
    if (!farmId) return
    try {
      const response = await fetch(`/api/teams/farm-owner?farmId=${farmId}`)
      if (!response.ok) return
      const data = await response.json()
      setFarmOwners(data || [])
    } catch (error) {
      console.error('Error fetching farm owner:', error)
    }
  }

  const fetchPolicies = async () => {
    if (!farmId) return

    setIsLoadingPolicies(true)
    setPoliciesError(null)
    try {
      const response = await fetch(`/api/access-control?farmId=${farmId}`)
      const data = await response.json()

      if (!response.ok) {
        setPoliciesError(data.error || 'Failed to fetch policies')
        return
      }

      setPolicies(data || [])

      // Fetch team members to get user-policy assignments
      const membersResponse = await fetch(`/api/access-control/team-members?farmId=${farmId}`)
      if (membersResponse.ok) {
        const members = await membersResponse.json()
        const policyMap: { [email: string]: string | null } = {}
        const roleIdMap: { [email: string]: string } = {}
        members.forEach((member: any) => {
          policyMap[member.email] = member.assigned_policy_id || null
          roleIdMap[member.email] = member.user_roles_id
        })
        setUserPolicies(policyMap)
        setUserRoleIds(roleIdMap)
      }
    } catch (error) {
      console.error('Error fetching policies:', error)
      setPoliciesError(error instanceof Error ? error.message : 'Failed to fetch policies')
    } finally {
      setIsLoadingPolicies(false)
    }
  }

  const handleDeleteClick = (type: 'worker' | 'department' | 'invitation' | 'policy', id: string, name: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type,
      id,
      name,
    })
  }

  const handleConfirmDelete = async () => {
    const { type, id } = deleteConfirmation
    if (!type || !id) return

    setIsDeleting(true)
    try {
      const endpoint =
        type === 'worker'
          ? `/api/workers/${id}`
          : type === 'department'
            ? `/api/departments/${id}`
            : type === 'policy'
              ? `/api/access-control/${id}`
              : `/api/teams/invitations/${id}`

      const response = await fetch(endpoint, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')

      // Refresh data
      if (type === 'worker') {
        window.location.reload()
      } else if (type === 'department') {
        window.location.reload()
      } else if (type === 'policy') {
        window.location.reload()
      } else {
        fetchInvitations()
      }

      setDeleteConfirmation({ isOpen: false, type: null, id: null, name: null })
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Stats configuration with multiple items per card (for carousel navigation)
  const statsConfig = useMemo(() => [
    {
      title: 'Active Workers',
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-100',
      items: [
        {
          label: 'Total Workers',
          value: stats.activeWorkers || 0,
          description: 'On your farm',
        },
      ],
    },
    {
      title: 'Active Tasks',
      icon: CheckSquare,
      color: 'bg-green-500',
      bgColor: 'bg-green-100',
      items: [
        {
          label: 'Pending Tasks',
          value: stats.activeTasks || 0,
          description: 'To complete',
        },
      ],
    },
    {
      title: 'Pending Invitations',
      icon: Mail,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-100',
      items: [
        {
          label: 'Invitations',
          value: stats.pendingInvitations || 0,
          description: 'Awaiting response',
        },
      ],
    },
    {
      title: 'Departments',
      icon: Briefcase,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-100',
      items: [
        {
          label: 'Total Departments',
          value: stats.departments || 0,
          description: 'Organized teams',
        },
      ],
    },
  ], [stats])

  const handleAssignPolicy = async (userEmail: string, policyId: string | null) => {
    try {
      const userRoleId = userRoleIds[userEmail]
      if (!userRoleId) {
        alert('User role not found. Please refresh and try again.')
        return
      }

      setAssigningPolicy(userEmail)
      const response = await fetch('/api/access-control/assign-team-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamMemberId: userRoleId,
          policyId,
          farmId,
        }),
      })

      if (!response.ok) throw new Error('Failed to assign policy')

      // Update local state
      setUserPolicies(prev => ({
        ...prev,
        [userEmail]: policyId,
      }))

      // Refresh policies
      await fetchPolicies()
    } catch (error) {
      console.error('Error assigning policy:', error)
      alert('Failed to assign policy. Please try again.')
    } finally {
      setAssigningPolicy(null)
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    setResendingInvitation(invitationId)
    try {
      const response = await fetch(`/api/teams/invitations/${invitationId}/resend`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to resend invitation')
      await fetchInvitations()
    } catch (error) {
      console.error('Error resending invitation:', error)
      alert('Failed to resend invitation. Please try again.')
    } finally {
      setResendingInvitation(null)
    }
  }

  // Helper functions for role-based grouping
  const toggleRoleExpanded = (role: string) => {
    setExpandedRoles((prev) => {
      const updated = new Set(prev)
      if (updated.has(role)) {
        updated.delete(role)
      } else {
        updated.add(role)
      }
      return updated
    })
  }

  const getUsersByRole = (role: string) => {
    if (role === 'farm_owner') return farmOwners
    return invitations.filter((inv) => inv.role_type === role)
  }

  const roleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    farm_owner: { label: 'Farm Owners', color: 'text-purple-700', bgColor: 'bg-purple-50' },
    farm_manager: { label: 'Farm Managers', color: 'text-blue-700', bgColor: 'bg-blue-50' },
    worker: { label: 'Workers', color: 'text-green-700', bgColor: 'bg-green-50' },
    veterinarian: { label: 'Veterinarians', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  }

  const getTabContent = () => {
    switch (activeTab) {
      case 'team':
        return (
          <div className="space-y-6">
            <Tabs value={teamSubTab} onValueChange={(value) => setTeamSubTab(value as 'workers' | 'departments')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="workers">
                  <Users className="w-4 h-4 mr-2" />
                  <span>Farm Team</span>
                </TabsTrigger>
                <TabsTrigger value="departments">
                  <Briefcase className="w-4 h-4 mr-2" />
                  <span>Departments</span>
                </TabsTrigger>
              </TabsList>

              {/* Farm Team Section */}
              <TabsContent value="workers" className="mt-6 px-4 lg:px-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg text-gray-900">Farm Team</h3>
                  <Button
                    onClick={() => setIsWorkerModalOpen(true)}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Team Member
                  </Button>
                </div>

                <div className="overflow-y-auto max-h-[55vh] pr-1 pb-4">
                {workersList && workersList.length > 0 ? (
                  <div className="space-y-2">
                    {(() => {
                      const knownPositions = ['farm_manager', 'worker', 'veterinarian']
                      const sections = [
                        {
                          key: 'farm_manager',
                          label: 'Farm Managers',
                          headerColor: 'bg-blue-50 hover:bg-blue-100',
                          textColor: 'text-blue-700',
                          badgeColor: 'bg-blue-100 text-blue-700',
                          workers: workersList.filter((w) => w.position === 'farm_manager'),
                        },
                        {
                          key: 'worker',
                          label: 'Workers',
                          headerColor: 'bg-green-50 hover:bg-green-100',
                          textColor: 'text-green-700',
                          badgeColor: 'bg-green-100 text-green-700',
                          workers: workersList.filter((w) => w.position === 'worker'),
                        },
                        {
                          key: 'veterinarian',
                          label: 'Veterinarians',
                          headerColor: 'bg-teal-50 hover:bg-teal-100',
                          textColor: 'text-teal-700',
                          badgeColor: 'bg-teal-100 text-teal-700',
                          workers: workersList.filter((w) => w.position === 'veterinarian'),
                        },
                        {
                          key: 'others',
                          label: 'Others',
                          headerColor: 'bg-gray-50 hover:bg-gray-100',
                          textColor: 'text-gray-700',
                          badgeColor: 'bg-gray-100 text-gray-700',
                          workers: workersList.filter((w) => !knownPositions.includes(w.position)),
                        },
                      ]

                      const employmentStatusLabel: Record<string, string> = {
                        full_time: 'Full Time',
                        part_time: 'Part Time',
                        casual: 'Casual',
                        contract: 'Contract',
                      }

                      return sections.map(({ key, label, headerColor, textColor, badgeColor, workers: sectionWorkers }) => {
                        const isExpanded = expandedRoles.has(key)
                        return (
                          <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleRoleExpanded(key)}
                              className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${headerColor}`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <ChevronDown
                                  className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                                />
                                <h4 className={`font-semibold ${textColor}`}>{label}</h4>
                                <span className="text-sm font-medium text-gray-600 ml-auto">
                                  {sectionWorkers.length} member{sectionWorkers.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-gray-200 p-4">
                                {sectionWorkers.length === 0 ? (
                                  <p className="text-sm text-gray-500 text-center py-2">No {label.toLowerCase()} added yet</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {sectionWorkers.map((worker) => {
                                      const dept = departmentsList?.find((d) => d.id === worker.department_id)
                                      return (
                                        <Card key={worker.id} className="p-4 hover:shadow-md transition-shadow">
                                          <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                              <h4 className="font-semibold text-gray-900 truncate">{worker.name}</h4>
                                              <p className="text-xs text-gray-400 mt-0.5 font-mono">{worker.worker_number}</p>
                                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeColor}`}>
                                                  {worker.position.replace(/_/g, ' ')}
                                                </span>
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                  {employmentStatusLabel[worker.employment_status] ?? worker.employment_status}
                                                </span>
                                              </div>
                                              {(dept || worker.shift) && (
                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                  {dept && (
                                                    <span className="text-xs text-gray-500 truncate">
                                                      {dept.name}
                                                    </span>
                                                  )}
                                                  {dept && worker.shift && <span className="text-gray-300 text-xs">·</span>}
                                                  {worker.shift && (
                                                    <span className="text-xs text-gray-500">{worker.shift}</span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              <button
                                                onClick={() => setEditingWorker(worker)}
                                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 hover:text-blue-700"
                                                title="Edit worker"
                                              >
                                                <Edit2 className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() => handleDeleteClick('worker', worker.id, worker.name)}
                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600 hover:text-red-700"
                                                title="Delete worker"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </div>
                                        </Card>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-600">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="font-medium">No team members added yet</p>
                    <p className="text-sm text-gray-500 mt-1">Start by adding your first farm team member</p>
                    <Button
                      onClick={() => setIsWorkerModalOpen(true)}
                      className="mt-4"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Team Member
                    </Button>
                  </div>
                )}
                </div>
              </TabsContent>

              {/* Departments Section */}
              <TabsContent value="departments" className="mt-6 px-4 lg:px-6">
                {departmentsList && departmentsList.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-lg text-gray-900">Departments</h3>
                      <Button
                        onClick={() => setIsDepartmentModalOpen(true)}
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Department
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {departmentsList.map((dept) => (
                        <Card key={dept.id} className="p-4 hover:shadow-md transition-shadow group">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 truncate">{dept.name}</h4>
                              {dept.description && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{dept.description}</p>
                              )}
                              {dept.created_at && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Created: {new Date(dept.created_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => setEditingDepartment(dept)}
                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 hover:text-blue-700"
                                title="Edit department"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick('department', dept.id, dept.name)}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600 hover:text-red-700"
                                title="Delete department"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-600">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="font-medium">No departments created yet</p>
                    <p className="text-sm text-gray-500 mt-1">Organize your team into custom departments</p>
                    <Button
                      onClick={() => setIsDepartmentModalOpen(true)}
                      className="mt-4"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Department
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )

      case 'tasks':
        return (
          <div className="space-y-6">
            <Tabs value={tasksSubTab} onValueChange={(value) => setTasksSubTab(value as 'tasks' | 'daily-activities')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tasks">
                  <CheckSquare className="w-4 h-4 mr-2" />
                  <span>Tasks</span>
                </TabsTrigger>
                <TabsTrigger value="daily-activities">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Daily Activities</span>
                </TabsTrigger>
              </TabsList>

              {/* Tasks Section */}
              <TabsContent value="tasks" className="mt-6 px-4 lg:px-6">
                <div className="text-center py-12 text-gray-600">
                  <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="font-medium">No active tasks</p>
                  <p className="text-sm text-gray-500 mt-1">Create tasks to assign work to your team</p>
                  <Link href="/dashboard/teams/tasks/new">
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Task
                    </Button>
                  </Link>
                </div>
              </TabsContent>

              {/* Daily Activities Section */}
              <TabsContent value="daily-activities" className="mt-6 px-4 lg:px-6">
                <div className="text-center py-12 text-gray-600">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="font-medium">No daily activities yet</p>
                  <p className="text-sm text-gray-500 mt-1">Set up recurring daily work to track team progress</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )

      case 'system-users':
        return (
          <div className="space-y-6">
            <Tabs value={systemUsersSubTab} onValueChange={(value) => setSystemUsersSubTab(value as 'access-control' | 'system-users')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="access-control">
                  <Shield className="w-4 h-4 mr-2" />
                  <span>Access Control</span>
                </TabsTrigger>
                <TabsTrigger value="system-users">
                  <LockKeyhole className="w-4 h-4 mr-2" />
                  <span>System Users</span>
                </TabsTrigger>
              </TabsList>

              {/* Access Control Section */}
              <TabsContent value="access-control" className="mt-6 px-4 lg:px-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg text-gray-900">Access Control Policies</h3>
                  <Button
                    onClick={() => setIsAccessControlModalOpen(true)}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Manage Policies
                  </Button>
                </div>

                {isLoadingPolicies ? (
                  <div className="text-center py-12 text-gray-600">
                    <div className="flex justify-center mb-4">
                      <div className="animate-spin">
                        <Shield className="w-8 h-8 text-gray-300" />
                      </div>
                    </div>
                    <p className="font-medium">Loading policies...</p>
                  </div>
                ) : policiesError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-700 font-medium">
                      <AlertCircle className="w-4 h-4" />
                      Permission Denied
                    </div>
                    <p className="text-sm text-red-600 mt-2">{policiesError}</p>
                  </div>
                ) : (
                  <AccessControlPoliciesView
                    farmId={farmId}
                    onOpenModal={() => setIsAccessControlModalOpen(true)}
                    onEditPolicy={(policy) => {
                      setEditingPolicy(policy)
                      setIsAccessControlModalOpen(true)
                    }}
                    onDeletePolicy={(policyId, policyName) => {
                      handleDeleteClick('policy', policyId, policyName)
                    }}
                  />
                )}
              </TabsContent>

              {/* System Users Section - Grouped by Role */}
              <TabsContent value="system-users" className="mt-6 px-4 lg:px-6">
                {isLoadingInvitations ? (
                  <div className="text-center py-12 text-gray-600">
                    <div className="flex justify-center mb-4">
                      <div className="animate-spin">
                        <Mail className="w-8 h-8 text-gray-300" />
                      </div>
                    </div>
                    <p className="font-medium">Loading team members...</p>
                  </div>
                ) : invitationsError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-red-700 font-medium">
                      <AlertCircle className="w-4 h-4" />
                      Error loading invitations
                    </div>
                    <p className="text-sm text-red-600 mt-2">{invitationsError}</p>
                  </div>
                ) : invitations && invitations.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-lg text-gray-900">System Users</h3>
                      <Button
                        onClick={() => setIsInvitationModalOpen(true)}
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add User
                      </Button>
                    </div>

                    {/* Role-based collapsible sections */}
                    <div className="overflow-y-auto max-h-[55vh] pr-1 pb-4 space-y-2">
                      {Object.entries(roleConfig).map(([role, config]) => {
                        const roleUsers = getUsersByRole(role)
                        const isExpanded = expandedRoles.has(role)

                        return (
                          <div key={role} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Role Header - Collapsible */}
                            <button
                              onClick={() => toggleRoleExpanded(role)}
                              className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${config.bgColor}`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <ChevronDown
                                  className={`w-5 h-5 transition-transform ${
                                    isExpanded ? 'rotate-0' : '-rotate-90'
                                  }`}
                                />
                                <h4 className={`font-semibold ${config.color}`}>{config.label}</h4>
                                <span className="text-sm font-medium text-gray-600 ml-auto">
                                  {roleUsers.length} user{roleUsers.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </button>

                            {/* Role Content */}
                            {isExpanded && roleUsers.length > 0 && (
                              <div className="border-t border-gray-200 p-4 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {roleUsers.map((invitation) => {
                                    const getStatusBadge = () => {
                                      switch (invitation.status) {
                                        case 'accepted':
                                          return (
                                            <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                              <CheckCircle2 className="w-3 h-3" />
                                              Accepted
                                            </div>
                                          )
                                        case 'pending':
                                          return (
                                            <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                              <Clock3 className="w-3 h-3" />
                                              Pending
                                            </div>
                                          )
                                        case 'rejected':
                                          return (
                                            <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                              <XCircle className="w-3 h-3" />
                                              Rejected
                                            </div>
                                          )
                                        case 'expired':
                                          return (
                                            <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                              <XCircle className="w-3 h-3" />
                                              Expired
                                            </div>
                                          )
                                        default:
                                          return null
                                      }
                                    }

                                    return (
                                      <Card key={invitation.id} className="p-4 hover:shadow-md transition-shadow group">
                                        {/* Name row + action buttons */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                          <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-gray-900 truncate text-sm">{invitation.full_name}</h4>
                                            <p className="text-xs text-gray-500 truncate">{invitation.email}</p>
                                            <div className="mt-1.5">{getStatusBadge()}</div>
                                          </div>
                                          {invitation.role_type !== 'farm_owner' && (
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            {invitation.status !== 'accepted' && (
                                              <button
                                                onClick={() => handleResendInvitation(invitation.id)}
                                                disabled={resendingInvitation === invitation.id}
                                                className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-green-600 hover:text-green-700 disabled:opacity-50"
                                                title="Resend invitation email"
                                              >
                                                <RefreshCw className={`w-3.5 h-3.5 ${resendingInvitation === invitation.id ? 'animate-spin' : ''}`} />
                                              </button>
                                            )}
                                            <button
                                              onClick={() => setEditingInvitation(invitation)}
                                              className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 hover:text-blue-700"
                                              title="Edit invitation"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteClick('invitation', invitation.id, invitation.full_name)}
                                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-600 hover:text-red-700"
                                              title="Delete invitation"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                          )}
                                        </div>

                                        {/* Details grid */}
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs border-t border-gray-100 pt-2">
                                          <div>
                                            <p className="text-gray-500">Role</p>
                                            <p className="font-medium text-gray-800 capitalize truncate">{invitation.role_type.replace(/_/g, ' ')}</p>
                                          </div>
                                          {invitation.department_id && (
                                            <div>
                                              <p className="text-gray-500">Department</p>
                                              <p className="font-medium text-gray-800 truncate">
                                                {departmentsList.find(d => d.id === invitation.department_id)?.name || 'Unknown'}
                                              </p>
                                            </div>
                                          )}
                                          <div>
                                            <p className="text-gray-500">Invited</p>
                                            <p className="font-medium text-gray-800">{new Date(invitation.sent_at).toLocaleDateString()}</p>
                                          </div>
                                          {invitation.accepted_at && (
                                            <div>
                                              <p className="text-gray-500">Accepted</p>
                                              <p className="font-medium text-gray-800">{new Date(invitation.accepted_at).toLocaleDateString()}</p>
                                            </div>
                                          )}
                                        </div>

                                        {/* Policy Assignment */}
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                          <p className="text-xs font-medium text-gray-600 mb-1.5">Access Policy</p>
                                          {(invitation.role_type === 'farm_owner' || invitation.role_type === 'farm_manager') ? (
                                            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                                              <Shield className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                                              <div>
                                                <p className="text-xs font-semibold text-purple-800">Full System Access</p>
                                                <p className="text-[10px] text-purple-600 leading-tight">All modules · All actions</p>
                                              </div>
                                            </div>
                                          ) : invitation.status === 'accepted' ? (
                                            <>
                                              {userPolicies[invitation.email] && (
                                                <p className="text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded px-2 py-1 mb-1.5 truncate">
                                                  {policies.find(p => p.id === userPolicies[invitation.email])?.name || 'Policy'}
                                                </p>
                                              )}
                                              <select
                                                value={userPolicies[invitation.email] || ''}
                                                onChange={(e) => handleAssignPolicy(invitation.email, e.target.value || null)}
                                                disabled={assigningPolicy === invitation.email}
                                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary"
                                              >
                                                <option value="">{userPolicies[invitation.email] ? 'Change policy...' : 'Assign policy...'}</option>
                                                {policies.map(policy => (
                                                  <option key={policy.id} value={policy.id}>{policy.name}</option>
                                                ))}
                                              </select>
                                            </>
                                          ) : (
                                            <p className="text-xs text-gray-500 italic">Awaiting invitation acceptance</p>
                                          )}
                                        </div>
                                      </Card>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Empty state for role */}
                            {isExpanded && roleUsers.length === 0 && (
                              <div className="px-4 py-6 text-center text-gray-600">
                                <p className="text-sm">No users with this role</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-600">
                    <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="font-medium">No system users added yet</p>
                    <p className="text-sm text-gray-500 mt-1">Add users to manage system access and permissions</p>
                    <Button
                      onClick={() => setIsInvitationModalOpen(true)}
                      className="mt-4"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6 pb-12 pt-6 px-4 lg:px-6">
      {/* Header with Quick Actions Dropdown */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Teams & Roles</h1>
          <p className="mt-1 text-sm md:text-base text-gray-600">
            Manage your farm team, assign roles, create tasks, and monitor work activities
          </p>
        </div>

        {/* Quick Actions Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-dairy-primary text-white rounded-lg hover:bg-dairy-primary/90 transition-colors font-medium"
          >
            <Zap className="w-5 h-5" />
            <span>Quick Actions</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isQuickActionsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isQuickActionsOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="py-2">
                {QUICK_ACTIONS.map((action, index) => {
                  const ActionIcon = action.icon
                  
                  if (action.action === 'openDepartmentModal') {
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          setIsDepartmentModalOpen(true)
                          setIsQuickActionsOpen(false)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <ActionIcon className={`w-4 h-4 mr-2 inline ${action.color}`} />
                        {action.label}
                      </button>
                    )
                  }

                  if (action.action === 'openWorkerModal') {
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          setIsWorkerModalOpen(true)
                          setIsQuickActionsOpen(false)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <ActionIcon className={`w-4 h-4 mr-2 inline ${action.color}`} />
                        {action.label}
                      </button>
                    )
                  }

                  if (action.action === 'openInvitationModal') {
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          setIsInvitationModalOpen(true)
                          setIsQuickActionsOpen(false)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <ActionIcon className={`w-4 h-4 mr-2 inline ${action.color}`} />
                        {action.label}
                      </button>
                    )
                  }

                  if (action.action === 'openAccessControlModal') {
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          setIsAccessControlModalOpen(true)
                          setIsQuickActionsOpen(false)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <ActionIcon className={`w-4 h-4 mr-2 inline ${action.color}`} />
                        {action.label}
                      </button>
                    )
                  }
                  
                  return (
                    <Link key={index} href={action.href || '#'}>
                      <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                        <ActionIcon className={`w-4 h-4 mr-2 inline ${action.color}`} />
                        {action.label}
                      </button>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <TeamRolesStatsCards stats={statsConfig} />

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="team">
            <Users className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckSquare className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="system-users">
            <LockKeyhole className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">System Users</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="team" className="mt-6 px-4 lg:px-6">
          <div>{getTabContent()}</div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6 px-4 lg:px-6">
          <div>{getTabContent()}</div>
        </TabsContent>

        <TabsContent value="system-users" className="mt-6 px-4 lg:px-6">
          <div>{getTabContent()}</div>
        </TabsContent>
      </Tabs>

      {/* Department Modal */}
      {farmId && (
        <DepartmentModal
          isOpen={isDepartmentModalOpen}
          onClose={() => setIsDepartmentModalOpen(false)}
          farmId={farmId}
          onSuccess={() => {
            // Refresh stats or data as needed
            window.location.reload()
          }}
        />
      )}

      {/* Worker Modal */}
      {farmId && (
        <WorkerModal
          isOpen={isWorkerModalOpen}
          onClose={() => setIsWorkerModalOpen(false)}
          farmId={farmId}
          departments={departmentsList}
          onSuccess={() => {
            // Refresh stats or data as needed
            window.location.reload()
          }}
        />
      )}

      {/* Invitation Modal */}
      {farmId && (
        <InvitationModal
          isOpen={isInvitationModalOpen}
          onClose={() => setIsInvitationModalOpen(false)}
          farmId={farmId}
          workersList={workersList}
          departmentsList={departmentsList}
          onSuccess={() => {
            // Refresh invitations list
            fetchInvitations()
            // Also reload page to update stats
            window.location.reload()
          }}
        />
      )}

      {/* Access Control Modal */}
      {farmId && (
        <AccessControlModal
          isOpen={isAccessControlModalOpen}
          onClose={() => {
            setIsAccessControlModalOpen(false)
            setEditingPolicy(null)
          }}
          farmId={farmId}
          editingPolicy={editingPolicy}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        title={`Delete ${deleteConfirmation.type === 'worker' ? 'Worker' : deleteConfirmation.type === 'department' ? 'Department' : deleteConfirmation.type === 'policy' ? 'Policy' : 'Invitation'}?`}
        description={`Are you sure you want to delete ${deleteConfirmation.name}? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, type: null, id: null, name: null })}
        isPending={isDeleting}
      />

      {/* Edit Worker Modal - using existing WorkerModal */}
      {editingWorker && farmId && (
        <WorkerModal
          isOpen={!!editingWorker}
          onClose={() => setEditingWorker(null)}
          farmId={farmId}
          departments={departmentsList}
          editingWorker={editingWorker}
          onSuccess={() => {
            setEditingWorker(null)
            window.location.reload()
          }}
        />
      )}

      {/* Edit Department Modal - using existing DepartmentModal */}
      {editingDepartment && farmId && (
        <DepartmentModal
          isOpen={!!editingDepartment}
          onClose={() => setEditingDepartment(null)}
          farmId={farmId}
          editingDepartment={editingDepartment}
          onSuccess={() => {
            setEditingDepartment(null)
            window.location.reload()
          }}
        />
      )}

      {/* Edit Invitation Modal - using existing InvitationModal */}
      {editingInvitation && farmId && (
        <InvitationModal
          isOpen={!!editingInvitation}
          onClose={() => setEditingInvitation(null)}
          farmId={farmId}
          workersList={workersList}
          departmentsList={departmentsList}
          editingInvitation={editingInvitation}
          onSuccess={() => {
            setEditingInvitation(null)
            fetchInvitations()
          }}
        />
      )}
    </div>
  )
}
