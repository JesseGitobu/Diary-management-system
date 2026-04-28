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
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { EquipmentCard } from '@/components/equipment/EquipmentCard'
import { AddEquipmentModal } from '@/components/equipment/AddEquipmentModal'
import { MaintenanceScheduleModal } from '@/components/equipment/MaintenanceScheduleModal'
import { EquipmentStatsCards } from '@/components/equipment/EquipmentStatsCards'
import { Input } from '@/components/ui/Input'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'

interface EquipmentManagementProps {
  farmId: string
  equipment: any[]
  equipmentStats: any
  canManage: boolean
}

// ---------------------------------------------------------------------------
// Sample data shown to new users so they can see what to expect
// ---------------------------------------------------------------------------
const DEMO_EQUIPMENT = [
  {
    id: 'demo-1',
    name: 'John Deere 5075E Tractor',
    equipment_type: 'tractor',
    brand: 'John Deere',
    model: '5075E',
    serial_number: 'JD5075E-2021-001',
    status: 'operational',
    location: 'Main Barn',
    purchase_date: '2021-03-15',
    purchase_cost: 45000,
    warranty_expiry: '2026-03-15',
    description: 'Primary field and barn work tractor',
    supplier: null,
  },
  {
    id: 'demo-2',
    name: 'DeLaval Milking System',
    equipment_type: 'milking_equipment',
    brand: 'DeLaval',
    model: 'MilkMaster 300',
    serial_number: 'DL-MM300-2020-002',
    status: 'maintenance_due',
    location: 'Milking Parlor',
    purchase_date: '2020-06-01',
    purchase_cost: 28000,
    warranty_expiry: '2025-06-01',
    description: 'Automated milking system for 30 cows',
    supplier: null,
  },
  {
    id: 'demo-3',
    name: 'Krone BigX 480 Forage Harvester',
    equipment_type: 'harvester',
    brand: 'Krone',
    model: 'BigX 480',
    serial_number: 'KR-BX480-2019-003',
    status: 'in_maintenance',
    location: 'Equipment Shed',
    purchase_date: '2019-09-10',
    purchase_cost: 95000,
    warranty_expiry: '2024-09-10',
    description: 'High-capacity forage harvester for silage season',
    supplier: null,
  },
  {
    id: 'demo-4',
    name: 'Lely Vector Feed Robot',
    equipment_type: 'feeding_equipment',
    brand: 'Lely',
    model: 'Vector A4',
    serial_number: 'LY-VEC-2022-004',
    status: 'operational',
    location: 'Freestall Barn',
    purchase_date: '2022-01-20',
    purchase_cost: 72000,
    warranty_expiry: '2027-01-20',
    description: 'Automated feed pusher and delivery robot',
    supplier: null,
  },
  {
    id: 'demo-5',
    name: 'Bobcat S550 Skid Steer',
    equipment_type: 'loader',
    brand: 'Bobcat',
    model: 'S550',
    serial_number: 'BC-S550-2020-005',
    status: 'broken',
    location: 'Workshop',
    purchase_date: '2020-11-05',
    purchase_cost: 38000,
    warranty_expiry: '2023-11-05',
    description: 'Manure management and general-purpose loader',
    supplier: null,
  },
  {
    id: 'demo-6',
    name: 'GEA CoolMatic 4000 Tank',
    equipment_type: 'cooling_system',
    brand: 'GEA',
    model: 'CoolMatic 4000',
    serial_number: 'GEA-CM4000-2021-006',
    status: 'operational',
    location: 'Milk Storage',
    purchase_date: '2021-07-12',
    purchase_cost: 18500,
    warranty_expiry: '2026-07-12',
    description: 'Bulk milk cooling and storage tank',
    supplier: null,
  },
]

const DEMO_STATS = {
  totalEquipment: 6,
  operational: 3,
  maintenanceDue: 1,
  inMaintenance: 1,
  broken: 1,
  upcomingMaintenance: 2,
}

export function EquipmentManagement({
  farmId,
  equipment: initialEquipment,
  equipmentStats,
  canManage,
}: EquipmentManagementProps) {
  const [equipment, setEquipment] = useState(initialEquipment)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const { isMobile, isTablet } = useDeviceInfo()

  // When no real equipment exists yet, show sample data so users know what to expect
  const isShowingDemo = equipment.length === 0
  const displayEquipment = isShowingDemo ? DEMO_EQUIPMENT : equipment
  const displayStats    = isShowingDemo ? DEMO_STATS    : equipmentStats

  const handleEquipmentAdded = (newEquipment: any) => {
    setEquipment(prev => [newEquipment, ...prev])
    setShowAddModal(false)
  }

  const handleEquipmentUpdated = (updatedEquipment: any) => {
    setEquipment(prev =>
      prev.map(item => item.id === updatedEquipment.id ? updatedEquipment : item)
    )
  }

  const handleEquipmentRemoved = (equipmentId: string) => {
    setEquipment(prev => prev.filter(item => item.id !== equipmentId))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':     return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'maintenance_due': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'in_maintenance':  return <Wrench className="h-4 w-4 text-blue-500" />
      case 'broken':          return <XCircle className="h-4 w-4 text-red-500" />
      default:                return <Settings className="h-4 w-4 text-gray-500" />
    }
  }

  const filteredEquipment = displayEquipment.filter(item => {
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
    const matchesSearch = searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.equipment_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.model && item.model.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  const statusFilters = [
    { value: 'all',             label: 'All Equipment',   count: displayEquipment.length },
    { value: 'operational',     label: 'Operational',     count: displayStats.operational },
    { value: 'maintenance_due', label: 'Maintenance Due', count: displayStats.maintenanceDue },
    { value: 'in_maintenance',  label: 'In Maintenance',  count: displayStats.inMaintenance },
    { value: 'broken',          label: 'Broken',          count: displayStats.broken },
  ]

  const urgentMaintenance = displayEquipment.filter(item =>
    item.status === 'maintenance_due' || item.status === 'broken'
  )

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Equipment Management</h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">
            Track and maintain your farm equipment and machinery
          </p>
        </div>

        {isMobile ? (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowMaintenanceModal(true)} className="flex-1">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </Button>
            {canManage && (
              <Button onClick={() => setShowAddModal(true)} size="sm" className="flex-1">
                <Plus className="mr-2 h-4 w-4" />
                Add Equipment
              </Button>
            )}
          </div>
        ) : (
          <div className="flex space-x-3">
            {canManage && (
              <>
                <Button variant="outline" onClick={() => setShowMaintenanceModal(true)}>
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

      {/* Demo data notice */}
      {isShowingDemo && (
        <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <Sparkles className="h-5 w-5 text-violet-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-violet-900">You&apos;re viewing sample data</p>
            <p className="text-xs text-violet-700 mt-0.5">
              These are example equipment entries to help you get started. Add your first piece of equipment and your real data will appear here.
            </p>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setShowAddModal(true)} className="flex-shrink-0 bg-violet-600 hover:bg-violet-700 text-white">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Equipment
            </Button>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <EquipmentStatsCards stats={displayStats} />

      {/* Urgent Maintenance Alerts */}
      {urgentMaintenance.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-orange-800 text-base lg:text-lg">
              <AlertTriangle className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
              Urgent Maintenance Required
              {isShowingDemo && (
                <Badge variant="secondary" className="ml-2 text-xs bg-violet-100 text-violet-700 border-violet-200">
                  Sample
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgentMaintenance.slice(0, isMobile ? 3 : 5).map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(item.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-sm text-gray-500 truncate capitalize">
                        {item.equipment_type.replace(/_/g, ' ')}
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
              <Button variant="outline" size="sm" onClick={() => setShowMaintenanceModal(true)} className={isMobile ? 'w-full' : ''}>
                View Maintenance Schedule
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedStatus('maintenance_due')} className={isMobile ? 'w-full' : ''}>
                Filter Maintenance Due
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Maintenance */}
      {displayStats.upcomingMaintenance > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-blue-800 text-base lg:text-lg">
              <Calendar className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
              Upcoming Maintenance
              {isShowingDemo && (
                <Badge variant="secondary" className="ml-2 text-xs bg-violet-100 text-violet-700 border-violet-200">
                  Sample
                </Badge>
              )}
            </CardTitle>
            {!isMobile && <CardDescription>Next 30 days</CardDescription>}
          </CardHeader>
          <CardContent>
            <p className="text-blue-700 mb-3 text-sm lg:text-base">
              {displayStats.upcomingMaintenance} equipment items have scheduled maintenance
              {isMobile ? ' coming up' : ' in the next 30 days'}.
            </p>
            <Button variant="outline" size="sm" onClick={() => setShowMaintenanceModal(true)} className={isMobile ? 'w-full' : ''}>
              View Full Schedule
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search, Filters & Inventory */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div>
              <CardTitle className="text-base lg:text-lg">Equipment Inventory</CardTitle>
              <CardDescription className="text-sm">
                {isMobile ? 'Manage equipment & maintenance' : 'Manage your farm equipment and track maintenance schedules'}
              </CardDescription>
            </div>

            {isMobile ? (
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input placeholder="Search equipment..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowMobileFilters(!showMobileFilters)}>
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input placeholder="Search equipment..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 w-64" />
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
          {/* Mobile filter panel */}
          {isMobile && showMobileFilters && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Filter by Status</h4>
              <div className="space-y-2">
                {statusFilters.map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => { setSelectedStatus(filter.value); setShowMobileFilters(false) }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedStatus === filter.value ? 'bg-farm-green text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{filter.label}</span>
                      <Badge variant="secondary" className="text-xs">{filter.count}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Desktop filter tabs */}
          {!isMobile && (
            <div className="flex flex-wrap gap-2 mb-6">
              {statusFilters.map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedStatus(filter.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedStatus === filter.value ? 'bg-farm-green text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          )}

          {/* Equipment grid */}
          {filteredEquipment.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-3 text-sm font-medium text-gray-900">
                {searchTerm || selectedStatus !== 'all' ? 'No equipment matches your filters' : 'No equipment added yet'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedStatus !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first piece of equipment.'}
              </p>
              {canManage && !searchTerm && selectedStatus === 'all' && (
                <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Equipment
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col space-y-3 mb-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                <p className="text-sm text-gray-500">
                  Showing {filteredEquipment.length} of {displayEquipment.length} equipment items
                  {isShowingDemo && <span className="ml-1 text-violet-600">(sample data)</span>}
                </p>
                {(searchTerm || selectedStatus !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSearchTerm(''); setSelectedStatus('all'); setShowMobileFilters(false) }}
                    className={isMobile ? 'w-full' : ''}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              <div className={`grid gap-4 ${
                isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}>
                {filteredEquipment.map(item => (
                  <EquipmentCard
                    key={item.id}
                    equipment={item}
                    canManage={canManage}
                    isDemo={isShowingDemo}
                    onEquipmentUpdated={handleEquipmentUpdated}
                    onEquipmentRemoved={handleEquipmentRemoved}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {showAddModal && (
        <AddEquipmentModal
          farmId={farmId}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onEquipmentAdded={handleEquipmentAdded}
        />
      )}

      {showMaintenanceModal && (
        <MaintenanceScheduleModal
          farmId={farmId}
          equipment={equipment}
          isOpen={showMaintenanceModal}
          onClose={() => setShowMaintenanceModal(false)}
          onMaintenanceScheduled={() => setShowMaintenanceModal(false)}
        />
      )}
    </div>
  )
}