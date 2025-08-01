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
  Search,
  Menu,
  ChevronRight
} from 'lucide-react'
import { EquipmentCard } from '@/components/equipment/EquipmentCard'
import { AddEquipmentModal } from '@/components/equipment/AddEquipmentModal'
import { MaintenanceScheduleModal } from '@/components/equipment/MaintenanceScheduleModal'
import { Input } from '@/components/ui/Input'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'

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
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  
  const { isMobile, isTablet } = useDeviceInfo()
  
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

  // Mobile Stats Cards Data
  const statsCards = [
    {
      title: 'Total Equipment',
      value: equipmentStats.totalEquipment,
      subtitle: 'All equipment items',
      icon: Settings,
      color: 'text-gray-600'
    },
    {
      title: 'Operational',
      value: equipmentStats.operational,
      subtitle: 'Working properly',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'Maintenance Due',
      value: equipmentStats.maintenanceDue,
      subtitle: 'Needs maintenance',
      icon: Clock,
      color: 'text-yellow-600'
    },
    {
      title: 'In Maintenance',
      value: equipmentStats.inMaintenance,
      subtitle: 'Currently servicing',
      icon: Wrench,
      color: 'text-blue-600'
    },
    {
      title: 'Broken',
      value: equipmentStats.broken,
      subtitle: 'Needs repair',
      icon: XCircle,
      color: 'text-red-600'
    }
  ]
  
  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Mobile Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Equipment Management</h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">
            Track and maintain your farm equipment and machinery
          </p>
        </div>
        
        {/* Mobile Action Buttons */}
        {isMobile ? (
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowMaintenanceModal(true)}
              className="flex-1"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </Button>
            {canManage && (
              <Button 
                onClick={() => setShowAddModal(true)}
                size="sm"
                className="flex-1"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Equipment
              </Button>
            )}
          </div>
        ) : (
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
        )}
      </div>
      
      {/* Mobile Horizontal Scrollable Stats */}
      {isMobile ? (
        <div className="relative">
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {statsCards.map((stat, index) => (
              <Card key={index} className="min-w-[280px] flex-shrink-0 snap-start">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.color.replace('text-', 'text-').replace('-600', '-500')}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Scroll indicator dots */}
          <div className="flex justify-center space-x-2 mt-2">
            {statsCards.map((_, index) => (
              <div 
                key={index} 
                className="w-2 h-2 rounded-full bg-gray-300"
              />
            ))}
          </div>
        </div>
      ) : (
        /* Desktop Stats Grid */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {statsCards.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color.replace('text-', 'text-').replace('-600', '-500')}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.subtitle}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Urgent Maintenance Alerts - Mobile Optimized */}
      {urgentMaintenance.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-orange-800 text-base lg:text-lg">
              <AlertTriangle className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
              Urgent Maintenance Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgentMaintenance.slice(0, isMobile ? 3 : 5).map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(item.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-sm text-gray-600 truncate">
                        {item.equipment_type.replace('_', ' ')} 
                        {item.location && ` • ${item.location}`}
                      </p>
                    </div>
                  </div>
                  
                  {!isMobile && (
                    <Badge 
                      variant="secondary"
                      className={item.status === 'broken' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}
                    >
                      {item.status === 'broken' ? 'Repair Needed' : 'Maintenance Due'}
                    </Badge>
                  )}
                  
                  {isMobile && <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                </div>
              ))}
            </div>
            
            {urgentMaintenance.length > (isMobile ? 3 : 5) && (
              <p className="text-sm text-orange-700 mt-3">
                +{urgentMaintenance.length - (isMobile ? 3 : 5)} more items need attention
              </p>
            )}
            
            <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'space-x-2'} mt-4`}>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowMaintenanceModal(true)}
                className={isMobile ? 'w-full' : ''}
              >
                View Maintenance Schedule
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedStatus('maintenance_due')}
                className={isMobile ? 'w-full' : ''}
              >
                Filter Maintenance Due
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Upcoming Maintenance - Mobile Optimized */}
      {equipmentStats.upcomingMaintenance > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-blue-800 text-base lg:text-lg">
              <Calendar className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
              Upcoming Maintenance
            </CardTitle>
            {!isMobile && <CardDescription>(Next 30 Days)</CardDescription>}
          </CardHeader>
          <CardContent>
            <p className="text-blue-700 mb-3 text-sm lg:text-base">
              {equipmentStats.upcomingMaintenance} equipment items have scheduled maintenance 
              {isMobile ? ' coming up' : ' in the next 30 days'}.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowMaintenanceModal(true)}
              className={isMobile ? 'w-full' : ''}
            >
              View Full Schedule
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Search and Filters - Mobile Optimized */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div>
              <CardTitle className="text-base lg:text-lg">Equipment Inventory</CardTitle>
              <CardDescription className="text-sm">
                {isMobile ? 'Manage equipment & maintenance' : 'Manage your farm equipment and track maintenance schedules'}
              </CardDescription>
            </div>
            
            {/* Mobile Search & Filter Toggle */}
            {isMobile ? (
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search equipment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              /* Desktop Search & Filters */
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
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Mobile Filter Panel */}
          {isMobile && showMobileFilters && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Filter by Status</h4>
              <div className="space-y-2">
                {statusFilters.map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => {
                      setSelectedStatus(filter.value)
                      setShowMobileFilters(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedStatus === filter.value
                        ? 'bg-farm-green text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{filter.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {filter.count}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Desktop Status Filter Tabs */}
          {!isMobile && (
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
          )}
          
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
              <div className="flex flex-col space-y-3 mb-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
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
                      setShowMobileFilters(false)
                    }}
                    className={isMobile ? 'w-full' : ''}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
              
              <div className={`grid gap-4 ${
                isMobile 
                  ? 'grid-cols-1' 
                  : isTablet 
                    ? 'grid-cols-2' 
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}>
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
          onMaintenanceScheduled={(maintenance: any) => {
            setShowMaintenanceModal(false)
          }}
        />
      )}
    </div>
  )
}