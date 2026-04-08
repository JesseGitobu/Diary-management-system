'use client'
// src/components/teams-roles/AccessControlModal.tsx

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalContent, ModalTitle, ModalDescription } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  Users,
  ChevronDown,
} from 'lucide-react'

type UserRole = 'farm_owner' | 'farm_manager' | 'worker' | 'veterinarian' | 'super_admin'

interface AccessControlPolicy {
  id: string
  farm_id: string
  name: string
  role_type: UserRole
  is_granted: boolean
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  /** Granted operations: { animals: ['view_list', 'add_newborn'], health: ['view_records'] } */
  operations: Record<string, string[]>
}

interface TeamMember {
  id: string
  user_id: string
  email: string
  full_name: string
  role_type: UserRole
  accepted_at: string
  user_roles_id?: string
  assigned_policy_id?: string | null
}

interface AccessControlModalProps {
  isOpen: boolean
  onClose: () => void
  farmId: string
  editingPolicy?: any
}

/** Grouped catalogue from /api/access-control/operations */
type OperationsCatalogue = Record<string, Record<string, { operation_key: string; label: string }[]>>

const ROLES: UserRole[] = ['worker', 'veterinarian']

const ACTION_CATEGORY_ORDER = ['view', 'create', 'edit', 'delete', 'export'] as const

const ACTION_CATEGORY_STYLES: Record<string, { label: string; badge: string }> = {
  view:   { label: 'View',   badge: 'bg-blue-100 text-blue-700' },
  create: { label: 'Create', badge: 'bg-green-100 text-green-700' },
  edit:   { label: 'Edit',   badge: 'bg-yellow-100 text-yellow-700' },
  delete: { label: 'Delete', badge: 'bg-red-100 text-red-700' },
  export: { label: 'Export', badge: 'bg-purple-100 text-purple-700' },
}

const RESOURCE_LABELS: Record<string, string> = {
  animals: 'Animals', health: 'Health', production: 'Production', breeding: 'Breeding',
  financial: 'Financial', inventory: 'Inventory', equipment: 'Equipment', reports: 'Reports',
  feed: 'Feed', team: 'Team', dashboard: 'Dashboard', settings: 'Settings',
}

export function AccessControlModal({ isOpen, onClose, farmId, editingPolicy }: AccessControlModalProps) {
  const [policies, setPolicies] = useState<AccessControlPolicy[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [catalogue, setCatalogue] = useState<OperationsCatalogue>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isCatalogueLoading, setIsCatalogueLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'policies' | 'team'>('policies')
  const [policyAssignmentLoading, setPolicyAssignmentLoading] = useState<Set<string>>(new Set())

  // Form metadata
  const [formData, setFormData] = useState({ name: '', role_type: 'worker' as UserRole, description: '' })

  // Selected operations per resource: { animals: Set(['view_list', 'add_newborn']), ... }
  const [selectedOps, setSelectedOps] = useState<Record<string, Set<string>>>({})

  // Expanded state for resource sections in form
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set())
  // Expanded state for policies in list
  const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set())

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen && farmId) {
      fetchData()
      fetchCatalogue()
    }
  }, [isOpen, farmId])

  useEffect(() => {
    if (editingPolicy?.id && isOpen) {
      handleEditPolicy(editingPolicy)
      setActiveTab('policies')
    }
  }, [editingPolicy, isOpen])

  useEffect(() => {
    if (!isOpen) resetForm()
  }, [isOpen])

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [policiesRes, membersRes] = await Promise.all([
        fetch(`/api/access-control?farmId=${farmId}`),
        fetch(`/api/access-control/team-members?farmId=${farmId}`),
      ])
      if (!policiesRes.ok) throw new Error('Failed to fetch policies')
      setPolicies(await policiesRes.json() || [])
      if (membersRes.ok) setTeamMembers(await membersRes.json() || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCatalogue = async () => {
    setIsCatalogueLoading(true)
    try {
      const res = await fetch('/api/access-control/operations')
      if (res.ok) {
        const data = await res.json()
        setCatalogue(data.operations || {})
      }
    } catch (err) {
      console.error('Failed to fetch operations catalogue:', err)
    } finally {
      setIsCatalogueLoading(false)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Convert selectedOps (Sets) to plain arrays for API */
  const buildOperationsPayload = (): Record<string, string[]> => {
    const result: Record<string, string[]> = {}
    for (const [resource, opsSet] of Object.entries(selectedOps)) {
      if (opsSet.size > 0) result[resource] = Array.from(opsSet)
    }
    return result
  }

  const totalSelectedOps = Object.values(selectedOps).reduce((sum, s) => sum + s.size, 0)
  const isFormValid = formData.name.trim().length > 0 && totalSelectedOps > 0

  // ── Form handlers ────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({ name: '', role_type: 'worker', description: '' })
    setSelectedOps({})
    setExpandedResources(new Set())
    setEditingId(null)
  }

  const handleEditPolicy = (policy: AccessControlPolicy) => {
    setFormData({
      name: policy.name,
      role_type: policy.role_type,
      description: policy.description || '',
    })
    // Populate selectedOps from policy.operations
    const ops: Record<string, Set<string>> = {}
    for (const [resource, keys] of Object.entries(policy.operations || {})) {
      ops[resource] = new Set(keys)
    }
    setSelectedOps(ops)
    setExpandedResources(new Set(Object.keys(policy.operations || {})))
    setEditingId(policy.id)
  }

  /** Toggle a single operation_key for a resource */
  const handleOpToggle = (resource: string, opKey: string, checked: boolean) => {
    setSelectedOps(prev => {
      const updated = { ...prev }
      const current = new Set(updated[resource] || [])
      if (checked) {
        current.add(opKey)
      } else {
        current.delete(opKey)
      }
      if (current.size === 0) {
        delete updated[resource]
      } else {
        updated[resource] = current
      }
      return updated
    })
  }

  /** Toggle all operations in a category for a resource */
  const handleCategoryToggle = (resource: string, category: string, checked: boolean) => {
    const categoryOps = (catalogue[resource]?.[category] || []).map(o => o.operation_key)
    setSelectedOps(prev => {
      const updated = { ...prev }
      const current = new Set(updated[resource] || [])
      if (checked) {
        categoryOps.forEach(op => current.add(op))
      } else {
        categoryOps.forEach(op => current.delete(op))
      }
      if (current.size === 0) {
        delete updated[resource]
      } else {
        updated[resource] = current
      }
      return updated
    })
  }

  /** Select ALL operations for a resource */
  const handleSelectAllForResource = (resource: string, checked: boolean) => {
    setSelectedOps(prev => {
      const updated = { ...prev }
      if (checked) {
        updated[resource] = new Set(getAllOpsForResource(resource))
      } else {
        delete updated[resource]
      }
      return updated
    })
  }

  const getAllOpsForResource = (resource: string): string[] => {
    const resourceCatalogue = catalogue[resource] || {}
    return Object.values(resourceCatalogue).flatMap(ops => ops.map(o => o.operation_key))
  }

  const isCategoryFullySelected = (resource: string, category: string): boolean => {
    const categoryOps = (catalogue[resource]?.[category] || []).map(o => o.operation_key)
    if (categoryOps.length === 0) return false
    const selected = selectedOps[resource] || new Set()
    return categoryOps.every(op => selected.has(op))
  }

  const isCategoryPartiallySelected = (resource: string, category: string): boolean => {
    const categoryOps = (catalogue[resource]?.[category] || []).map(o => o.operation_key)
    if (categoryOps.length === 0) return false
    const selected = selectedOps[resource] || new Set()
    const count = categoryOps.filter(op => selected.has(op)).length
    return count > 0 && count < categoryOps.length
  }

  const isResourceFullySelected = (resource: string): boolean => {
    const all = getAllOpsForResource(resource)
    if (all.length === 0) return false
    const selected = selectedOps[resource] || new Set()
    return all.every(op => selected.has(op))
  }

  const isResourcePartiallySelected = (resource: string): boolean => {
    const all = getAllOpsForResource(resource)
    if (all.length === 0) return false
    const selected = selectedOps[resource] || new Set()
    const count = all.filter(op => selected.has(op)).length
    return count > 0 && count < all.length
  }

  // ── API calls ────────────────────────────────────────────────────────────────

  const handleCreatePolicy = async () => {
    if (!isFormValid) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/access-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          name: formData.name,
          role_type: formData.role_type,
          operations: buildOperationsPayload(),
          is_granted: true,
          description: formData.description || null,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to create policy')
      }
      await fetchData()
      resetForm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create policy')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePolicy = async (policyId: string) => {
    if (!isFormValid) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/access-control', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyId,
          farmId,
          name: formData.name,
          description: formData.description,
          operations: buildOperationsPayload(),
        }),
      })
      if (!response.ok) throw new Error('Failed to update policy')
      await fetchData()
      resetForm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update policy')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/access-control?id=${policyId}&farmId=${farmId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete policy')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete policy')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignPolicy = async (memberId: string, policyId: string | null) => {
    setPolicyAssignmentLoading(prev => new Set([...prev, memberId]))
    try {
      const response = await fetch('/api/access-control/assign-team-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId, teamMemberId: memberId, policyId }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to assign policy')
      }
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign policy')
    } finally {
      setPolicyAssignmentLoading(prev => { const s = new Set(prev); s.delete(memberId); return s })
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const resourceList = Object.keys(catalogue).length > 0
    ? Object.keys(catalogue)
    : Object.keys(RESOURCE_LABELS)

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader>
        <ModalTitle>Manage Access Control</ModalTitle>
        <ModalDescription>
          Configure role-based access control policies. Define exactly which operations each role can perform.
        </ModalDescription>
      </ModalHeader>

      <ModalContent className="space-y-4">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700 font-medium">
              <AlertCircle className="w-4 h-4" />
              Error
            </div>
            <p className="text-sm text-red-600 mt-2">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'policies'
                ? 'border-b-2 border-dairy-primary text-dairy-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Access Policies
          </button>
          {!editingId && (
            <button
              onClick={() => setActiveTab('team')}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'team'
                  ? 'border-b-2 border-dairy-primary text-dairy-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Team Members
            </button>
          )}
        </div>

        {/* ── Policies Tab ───────────────────────────────────────────────── */}
        {activeTab === 'policies' && (
          <>
            {/* Create / Edit Form */}
            <Card className="p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-4">
                {editingId ? 'Edit Policy' : 'Create New Policy'}
              </h3>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Policy Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Worker Animal Care, Veterinarian Full Health"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary"
                  />
                </div>

                {/* Role Type */}
                {editingId ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Role Type</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">
                      {formData.role_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Role type cannot be changed after creation</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Role Type <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={formData.role_type}
                      onChange={e => setFormData({ ...formData, role_type: e.target.value as UserRole })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary"
                    >
                      {ROLES.map(role => (
                        <option key={role} value={role}>
                          {role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Operations Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-900">
                      Permissions <span className="text-red-600">*</span>
                    </label>
                    <span className="text-xs text-gray-500">
                      {totalSelectedOps} operation{totalSelectedOps !== 1 ? 's' : ''} selected
                    </span>
                  </div>

                  {totalSelectedOps === 0 && (
                    <p className="mb-2 text-xs text-red-600">Select at least one operation</p>
                  )}

                  {isCatalogueLoading ? (
                    <div className="flex items-center gap-2 p-4 text-gray-500 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading available operations...
                    </div>
                  ) : (
                    <div className="border border-gray-300 rounded-lg bg-white divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
                      {resourceList.map(resource => {
                        const resourceCatalogue = catalogue[resource] || {}
                        const isFull = isResourceFullySelected(resource)
                        const isPartial = isResourcePartiallySelected(resource)
                        const isExpanded = expandedResources.has(resource)
                        const selectedCount = selectedOps[resource]?.size || 0

                        return (
                          <div key={resource}>
                            {/* Resource row */}
                            <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50">
                              {/* Resource select-all checkbox */}
                              <input
                                type="checkbox"
                                checked={isFull}
                                ref={el => {
                                  if (el) el.indeterminate = isPartial
                                }}
                                onChange={e => handleSelectAllForResource(resource, e.target.checked)}
                                className="rounded border-gray-300 flex-shrink-0"
                              />
                              {/* Expand/collapse button */}
                              <button
                                type="button"
                                onClick={() => setExpandedResources(prev => {
                                  const s = new Set(prev)
                                  s.has(resource) ? s.delete(resource) : s.add(resource)
                                  return s
                                })}
                                className="flex items-center gap-2 flex-1 text-left"
                              >
                                <ChevronDown
                                  className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                                />
                                <span className="text-sm font-medium text-gray-900">
                                  {RESOURCE_LABELS[resource] || resource}
                                </span>
                                {selectedCount > 0 && (
                                  <span className="ml-auto text-xs text-gray-500 pr-2">
                                    {selectedCount} selected
                                  </span>
                                )}
                              </button>
                            </div>

                            {/* Operations grouped by action_category */}
                            {isExpanded && (
                              <div className="bg-gray-50 px-4 pb-3 space-y-3">
                                {ACTION_CATEGORY_ORDER.map(category => {
                                  const ops = resourceCatalogue[category]
                                  if (!ops || ops.length === 0) return null
                                  const catFullySelected = isCategoryFullySelected(resource, category)
                                  const catPartial = isCategoryPartiallySelected(resource, category)
                                  const styles = ACTION_CATEGORY_STYLES[category]

                                  return (
                                    <div key={category}>
                                      {/* Category header + select-all */}
                                      <div className="flex items-center gap-2 mt-2 mb-1">
                                        <input
                                          type="checkbox"
                                          checked={catFullySelected}
                                          ref={el => { if (el) el.indeterminate = catPartial }}
                                          onChange={e => handleCategoryToggle(resource, category, e.target.checked)}
                                          className="rounded border-gray-300"
                                        />
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${styles.badge}`}>
                                          {styles.label}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                          {ops.filter(o => selectedOps[resource]?.has(o.operation_key)).length}/{ops.length}
                                        </span>
                                      </div>

                                      {/* Individual operation checkboxes */}
                                      <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                        {ops.map(op => (
                                          <label
                                            key={op.operation_key}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-white rounded px-1.5 py-1"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={selectedOps[resource]?.has(op.operation_key) || false}
                                              onChange={e => handleOpToggle(resource, op.operation_key, e.target.checked)}
                                              className="rounded border-gray-300 flex-shrink-0"
                                            />
                                            <span className="text-xs text-gray-700">{op.label}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this policy allows..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dairy-primary"
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => editingId ? handleUpdatePolicy(editingId) : handleCreatePolicy()}
                    disabled={!isFormValid || isLoading}
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{editingId ? 'Updating...' : 'Creating...'}</>
                    ) : editingId ? 'Update Policy' : (
                      <><Plus className="w-4 h-4 mr-2" />Create Policy</>
                    )}
                  </Button>
                  {editingId && (
                    <Button variant="outline" onClick={resetForm}>Cancel</Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Policies List */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Current Policies</h3>
              {isLoading && !policies.length ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : policies.length === 0 ? (
                <p className="text-center py-8 text-gray-600 text-sm">
                  No policies yet. Create one to get started.
                </p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {policies.map(policy => {
                    const resourceCount = Object.keys(policy.operations || {}).length
                    const opCount = Object.values(policy.operations || {}).reduce((s, arr) => s + arr.length, 0)

                    return (
                      <Card key={policy.id} className="hover:shadow-md transition-shadow overflow-hidden">
                        <button
                          onClick={() => setExpandedPolicies(prev => {
                            const s = new Set(prev)
                            s.has(policy.id) ? s.delete(policy.id) : s.add(policy.id)
                            return s
                          })}
                          className="w-full p-4 flex items-start justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <ChevronDown
                              className={`w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0 transition-transform ${expandedPolicies.has(policy.id) ? 'rotate-0' : '-rotate-90'}`}
                            />
                            <div className="text-left flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm mb-1">{policy.name}</p>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                  {policy.role_type.replace(/_/g, ' ')}
                                </span>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Active
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                {resourceCount} resource{resourceCount !== 1 ? 's' : ''} · {opCount} operation{opCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <span
                            onClick={e => { e.stopPropagation(); handleDeletePolicy(policy.id) }}
                            className="p-1.5 hover:bg-red-50 rounded transition-colors cursor-pointer ml-2 flex-shrink-0"
                            title="Delete policy"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </span>
                        </button>

                        {expandedPolicies.has(policy.id) && (
                          <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
                            {policy.description && (
                              <p className="text-sm text-gray-600">{policy.description}</p>
                            )}

                            {/* Operations by resource */}
                            <div className="space-y-2">
                              {Object.entries(policy.operations || {}).map(([resource, keys]) => {
                                // Group keys by category for display
                                const byCategory: Record<string, string[]> = {}
                                for (const key of keys) {
                                  const cat = catalogue[resource]
                                    ? Object.entries(catalogue[resource]).find(([, ops]) =>
                                        ops.some(o => o.operation_key === key)
                                      )?.[0]
                                    : undefined
                                  const c = cat || 'other'
                                  if (!byCategory[c]) byCategory[c] = []
                                  byCategory[c].push(key)
                                }

                                return (
                                  <div key={resource} className="bg-white rounded p-2 border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-800 mb-1.5">
                                      {RESOURCE_LABELS[resource] || resource}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {ACTION_CATEGORY_ORDER.map(cat => {
                                        if (!byCategory[cat]?.length) return null
                                        const styles = ACTION_CATEGORY_STYLES[cat]
                                        return (
                                          <span key={cat} className={`px-2 py-0.5 rounded text-xs font-medium ${styles.badge}`}>
                                            {styles.label} ({byCategory[cat].length})
                                          </span>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 border-t pt-3">
                              <div><p className="font-medium text-gray-700">Created</p><p>{new Date(policy.created_at).toLocaleDateString()}</p></div>
                              <div><p className="font-medium text-gray-700">Updated</p><p>{new Date(policy.updated_at).toLocaleDateString()}</p></div>
                            </div>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Team Members Tab ────────────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Accepted Team Members</h3>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : teamMembers.length === 0 ? (
              <p className="text-center py-8 text-gray-600 text-sm">
                No team members have accepted their invitations yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {teamMembers.map(member => (
                  <Card key={member.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-dairy-primary text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                            {(member.full_name || member.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {member.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {member.role_type?.replace(/_/g, ' ') || 'No role'}
                          </span>
                          <span className="text-xs text-gray-500">
                            Joined {new Date(member.accepted_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Policy Assignment */}
                      <div className="flex-shrink-0 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Assigned Policy
                        </label>
                        <select
                          value={member.assigned_policy_id || ''}
                          onChange={e => handleAssignPolicy(member.user_roles_id || '', e.target.value || null)}
                          disabled={policyAssignmentLoading.has(member.user_roles_id || '')}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-dairy-primary disabled:bg-gray-100"
                        >
                          <option value="">
                            {policyAssignmentLoading.has(member.user_roles_id || '') ? 'Assigning...' : 'No policy assigned'}
                          </option>
                          {policies.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>

                        {member.assigned_policy_id && (() => {
                          const assigned = policies.find(p => p.id === member.assigned_policy_id)
                          if (!assigned) return null
                          const resources = Object.keys(assigned.operations || {})
                          const opCount = Object.values(assigned.operations || {}).reduce((s, a) => s + a.length, 0)
                          return (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                              <p className="text-xs font-medium text-green-900 mb-1">{assigned.name}</p>
                              <div className="flex flex-wrap gap-1">
                                {resources.slice(0, 3).map(r => (
                                  <span key={r} className="px-1.5 py-0.5 bg-green-200 text-green-800 rounded text-xs">
                                    {RESOURCE_LABELS[r] || r}
                                  </span>
                                ))}
                                {resources.length > 3 && (
                                  <span className="px-1.5 py-0.5 bg-green-200 text-green-800 rounded text-xs">
                                    +{resources.length - 3} more
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-green-700 mt-1">{opCount} operations granted</p>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </ModalContent>
    </Modal>
  )
}
