//src/components/admin/AuditLogs.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  FileText, 
  Search, 
  Filter,
  Calendar,
  User,
  Building2,
  Download
} from 'lucide-react'

interface AuditLogsProps {
  logs: any[]
}

export function AuditLogs({ logs: initialLogs }: AuditLogsProps) {
  const [logs, setLogs] = useState(initialLogs)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [resourceFilter, setResourceFilter] = useState('all')

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      suspend: 'bg-orange-100 text-orange-800',
      activate: 'bg-green-100 text-green-800'
    }
    
    return (
      <Badge className={colors[action] || 'bg-gray-100 text-gray-800'}>
        {action.toUpperCase()}
      </Badge>
    )
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter
    const matchesResource = resourceFilter === 'all' || log.resource_type === resourceFilter
    
    return matchesSearch && matchesAction && matchesResource
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-2">
            Track all administrative actions and changes
          </p>
        </div>
        
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search audit logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="suspend">Suspend</option>
        </select>
        
        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Resources</option>
          <option value="user">User</option>
          <option value="farm">Farm</option>
          <option value="animal">Animal</option>
          <option value="subscription">Subscription</option>
        </select>
      </div>

      {/* Logs List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredLogs.length > 0 ? filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getActionBadge(log.action)}
                      <span className="font-medium">{log.resource_type}</span>
                      <span className="text-sm text-gray-500">ID: {log.resource_id}</span>
                    </div>
                    
                    {log.old_values && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">Changes: </span>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {JSON.stringify(log.new_values).substring(0, 100)}...
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        User ID: {log.user_id}
                      </span>
                      {log.farm_id && (
                        <span className="flex items-center">
                          <Building2 className="w-3 h-3 mr-1" />
                          Farm ID: {log.farm_id}
                        </span>
                      )}
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No logs match your current filters.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}