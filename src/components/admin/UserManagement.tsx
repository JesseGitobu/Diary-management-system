//src/components/admin/UserManagement.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  Users, 
  Search, 
  CheckCircle,
  XCircle,
  Mail,
  Eye,
  Ban,
  Check,
  X
} from 'lucide-react'

interface UserManagementProps {
  initialUsers: any[]
  totalCount: number
}

// User Details Modal Component
function UserDetailsModal({ user, onClose }: { user: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">User Details</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <p className="text-lg">{user.profiles?.user_metadata?.full_name || 'N/A'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-lg">{user.profiles?.email || 'N/A'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Role</label>
              <p className="text-lg">{user.role_type.replace('_', ' ')}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <p className="text-lg">{user.status || 'active'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Farm</label>
              <p className="text-lg">{user.farms?.name || 'No farm assigned'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">User ID</label>
              <p className="text-sm font-mono bg-gray-100 p-2 rounded">{user.user_id}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Joined Date</label>
              <p className="text-lg">{new Date(user.created_at).toLocaleString()}</p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function UserManagement({ initialUsers, totalCount }: UserManagementProps) {
  const [users, setUsers] = useState(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      farm_owner: 'bg-purple-100 text-purple-800',
      farm_manager: 'bg-blue-100 text-blue-800',
      team_member: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <Badge className={colors[role] || 'bg-gray-100 text-gray-800'}>
        {role.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const handleSuspendUser = async (userId: string) => {
    if (!confirm('Are you sure you want to suspend this user? They will lose all access immediately.')) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason: 'Admin suspension' })
      })
      
      if (response.ok) {
        // Update the local state
        const updatedUsers = users.map(user => 
          user.user_id === userId ? { ...user, status: 'suspended' } : user
        )
        setUsers(updatedUsers)
        alert('User suspended successfully')
      } else {
        const error = await response.json()
        alert(`Failed to suspend user: ${error.error}`)
      }
    } catch (error) {
      console.error('Error suspending user:', error)
      alert('Error suspending user. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleActivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to activate this user?')) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      
      if (response.ok) {
        // Update the local state
        const updatedUsers = users.map(user => 
          user.user_id === userId ? { ...user, status: 'active' } : user
        )
        setUsers(updatedUsers)
        alert('User activated successfully')
      } else {
        alert('Failed to activate user')
      }
    } catch (error) {
      console.error('Error activating user:', error)
      alert('Error activating user')
    } finally {
      setLoading(false)
    }
  }

  const handleExportUsers = () => {
    // Create CSV content
    const headers = ['Name', 'Email', 'Role', 'Status', 'Farm', 'Joined Date']
    const rows = users.map(user => [
      user.profiles?.user_metadata?.full_name || 'N/A',
      user.profiles?.email || 'N/A',
      user.role_type,
      user.status || 'active',
      user.farms?.name || 'No farm',
      new Date(user.created_at).toLocaleDateString()
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profiles?.user_metadata?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.farms?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role_type === roleFilter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    
    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            Manage all platform users ({totalCount} total)
          </p>
        </div>
        
        <Button variant="outline" onClick={handleExportUsers}>
          Export Users
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Total Users</span>
            </div>
            <div className="text-2xl font-bold mt-1">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Active</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {users.filter(u => u.status === 'active' || !u.status).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium">Suspended</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {users.filter(u => u.status === 'suspended').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Farm Owners</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {users.filter(u => u.role_type === 'farm_owner').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Roles</option>
          <option value="farm_owner">Farm Owner</option>
          <option value="farm_manager">Farm Manager</option>
          <option value="team_member">Team Member</option>
          <option value="viewer">Viewer</option>
        </select>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {user.profiles?.user_metadata?.full_name || 'Unnamed User'}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {user.profiles?.email || 'No email'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <span className="text-xs text-gray-500">Role</span>
                      <div className="mt-1">{getRoleBadge(user.role_type)}</div>
                    </div>
                    
                    <div>
                      <span className="text-xs text-gray-500">Status</span>
                      <div className="mt-1">{getStatusBadge(user.status || 'active')}</div>
                    </div>
                    
                    <div>
                      <span className="text-xs text-gray-500">Farm</span>
                      <div className="mt-1 text-sm font-medium">
                        {user.farms?.name || 'No farm assigned'}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-xs text-gray-500">Joined</span>
                      <div className="mt-1 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedUser(user)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  
                  {user.status === 'suspended' ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleActivateUser(user.user_id)}
                      disabled={loading}
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Activate
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSuspendUser(user.user_id)}
                      disabled={loading}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <Ban className="w-4 h-4 mr-1" />
                      Suspend
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No users match your current filters.
          </p>
        </div>
      )}
    </div>
  )
}