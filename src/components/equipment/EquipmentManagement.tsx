'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Settings, 
  Plus, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  XCircle,
  Wrench,
  Calendar,
  Filter,
  Search
} from 'lucide-react'
import { EquipmentCard } from '@/components/equipment/EquipmentCard'
import { AddEquipmentModal } from '@/components/equipment/AddEquipmentModal'
import { MaintenanceScheduleModal } from '@/components/equipment/MaintenanceScheduleModal'
import { Input } from '@/components/ui/Input'

interface EquipmentManagementProps {
  farmId: string
  equipment: any[]
  equipmentStats: any
  canManage: boolean
}

export function EquipmentManagement({ 
  farmId, 
  equipment: initialEquipment, 
  equipmentStats,
  canManage 
}: EquipmentManagementProps) {
  const [equipment, setEquipment] = useState(initialEquipment)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  const handleEquipmentAdded = (newEquipment: any) => {
    setEquipment(prev => [newEquipment, ...prev])
    setShowAddModal(false)
  }
  
  const handleEquipmentUpdated = (updatedEquipment: any) => {
    setEquipment(prev => 
      prev.map(item => 
        item.id === updatedEquipment.id 
          ? updatedEquipment 
          : item
      )
    )
  }
  
  const handleEquipmentRemoved = (equipmentId: string) => {
    setEquipment(prev => prev.filter(item => item.id !== equipmentId))
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'maintenance_due': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'in_maintenance': return <Wrench className="h-4 w-4 text-blue-500" />
      case 'broken': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Settings className="h-4 w-4 text-gray-500" />
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600'
      case 'maintenance_due': return 'text-yellow-600'
      case 'in_maintenance': return 'text-blue-600'
      case 'broken': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }
  
  // Filter equipment based on status and search term
  const filteredEquipment = equipment.filter(item => {
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
    const matchesSearch = searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.equipment_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.model && item.model.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesStatus && matchesSearch
  })
  
  const statusFilters = [
    { value: 'all', label: 'All Equipment', count: equipment.length },
    { value: 'operational', label: 'Operational', count: equipmentStats.operational },
    { value: 'maintenance_due', label: 'Maintenance Due', count: equipmentStats.maintenanceDue },
    { value: 'in_maintenance', label: 'In Maintenance', count: equipmentStats.inMaintenance },
    { value: 'broken', label: 'Broken', count: equipmentStats.broken },
  ]
  
  const urgentMaintenance = equipment.filter(item => 
    item.status === 'maintenance_due' || item.status === 'broken'
  )
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipment Management</h1>
          <p className="text-gray-600 mt-2">
            Track and maintain your farm equipment and machinery
          </p>
        </div>
        <div className="flex space-x-3">
          {canManage && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setShowMaintenanceModal(true)}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Maintenance Schedule
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Equipment
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipmentStats.totalEquipment}</div>
            <p className="text-xs text-muted-foreground">
              All equipment items
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{equipmentStats.operational}</div>
            <p className="text-xs text-muted-foreground">
              Working properly
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Due</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{equipmentStats.maintenanceDue}</div>
            <p className="text-xs text-muted-foreground">
              Needs maintenance
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{equipmentStats.inMaintenance}</div>
            <p className="text-xs text-muted-foreground">
              Currently servicing
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Broken</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{equipmentStats.broken}</div>
            <p className="text-xs text-muted-foreground">
              Needs repair
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Urgent Maintenance Alerts */}
      {urgentMaintenance.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Urgent Maintenance Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentMaintenance.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.equipment_type.replace('_', ' ')} • {item.location || 'No location'}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant="secondary"
                    className={item.status === 'broken' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}
                  >
                    {item.status === 'broken' ? 'Repair Needed' : 'Maintenance Due'}
                  </Badge>
                </div>
              ))}
            </div>
            {urgentMaintenance.length > 5 && (
              <p className="text-sm text-orange-700 mt-3">
                +{urgentMaintenance.length - 5} more items need attention
              </p>
            )}
            <div className="flex space-x-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowMaintenanceModal(true)}>
                View Maintenance Schedule
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedStatus('maintenance_due')}>
                Filter Maintenance Due
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Upcoming Maintenance */}
      {equipmentStats.upcomingMaintenance > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <Calendar className="mr-2 h-5 w-5" />
              Upcoming Maintenance (Next 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700 mb-3">
              {equipmentStats.upcomingMaintenance} equipment items have scheduled maintenance in the next 30 days.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowMaintenanceModal(true)}
            >
              View Full Schedule
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Equipment Inventory</CardTitle>
              <CardDescription>
                Manage your farm equipment and track maintenance schedules
              </CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search equipment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {statusFilters.map(filter => (
              <button
                key={filter.value}
                onClick={() => setSelectedStatus(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedStatus === filter.value
                    ? 'bg-farm-green text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
          
          {/* Equipment Grid */}
          {filteredEquipment.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'No equipment matches your filters' 
                  : 'No equipment added yet'
                }
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedStatus !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first piece of equipment.'
                }
              </p>
              {canManage && (!searchTerm && selectedStatus === 'all') && (
                <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Equipment
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Showing {filteredEquipment.length} of {equipment.length} equipment items
                </p>
                {(searchTerm || selectedStatus !== 'all') && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedStatus('all')
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEquipment.map((item) => (
                  <EquipmentCard
                    key={item.id}
                    equipment={item}
                    canManage={canManage}
                    onEquipmentUpdated={handleEquipmentUpdated}
                    onEquipmentRemoved={handleEquipmentRemoved}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Add Equipment Modal */}
      {showAddModal && (
        <AddEquipmentModal
          farmId={farmId}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onEquipmentAdded={handleEquipmentAdded}
        />
      )}
      
      {/* Maintenance Schedule Modal */}
      {showMaintenanceModal && (
        <MaintenanceScheduleModal
          farmId={farmId}
          equipment={equipment}
          isOpen={showMaintenanceModal}
          onClose={() => setShowMaintenanceModal(false)}
        />
      )}
    </div>
  )
}