'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Settings, Plus, AlertTriangle, CheckCircle, Clock, XCircle,
  Wrench, Calendar, Filter, Search, ChevronRight, Sparkles,
  BarChart3, TrendingUp, Zap, Activity,
  User,
  Shield,
  Fuel,
  ChevronDown,
  LogOut,
  LogIn,
} from 'lucide-react'
import { EquipmentCard } from '@/components/equipment/EquipmentCard'
import { AddEquipmentModal } from '@/components/equipment/AddEquipmentModal'
import { MaintenanceScheduleModal } from '@/components/equipment/MaintenanceScheduleModal'
import { EquipmentStatsCards } from '@/components/equipment/EquipmentStatsCards'
import { EquipmentQuickActions } from '@/components/equipment/Equipmentquickactions'
import { CheckInCheckOutModal } from '@/components/equipment/modals/CheckInCheckOutModal'
import { Input } from '@/components/ui/Input'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'

interface EquipmentManagementProps {
  farmId: string
  equipment: any[]
  equipmentStats: any
  canManage: boolean
}

const DEMO_EQUIPMENT = [
  {
    id: 'demo-1',
    asset_id: 'EQ-2021-001',
    name: 'John Deere 5075E Tractor',
    equipment_type: 'tractor',
    category: 'vehicles',
    brand: 'John Deere',
    model: '5075E',
    year_manufactured: 2021,
    serial_number: 'JD5075E-2021-001',
    status: 'operational',
    location: 'Main Barn',
    current_location: 'Field A',
    ownership_type: 'owned',
    purchase_date: '2021-03-15',
    purchase_cost: 45000,
    expected_useful_life: 15,
    current_value: 38500,
    warranty_expiry: '2026-03-15',
    description: 'Primary field and barn work tractor',
    odometer_hours: 1240,
    fuel_level: 75,
    assigned_to: 'James Kamau',
    last_used: '2024-01-10',
    utilization_rate: 78,
    maintenance_cost_total: 3200,
    supplier: null,
    condition: 'good',
  },
  {
    id: 'demo-2',
    asset_id: 'EQ-2020-002',
    name: 'DeLaval Milking System',
    equipment_type: 'milking_equipment',
    category: 'milking_equipment',
    brand: 'DeLaval',
    model: 'MilkMaster 300',
    year_manufactured: 2020,
    serial_number: 'DL-MM300-2020-002',
    status: 'maintenance_due',
    location: 'Milking Parlor',
    current_location: 'Milking Parlor',
    ownership_type: 'owned',
    purchase_date: '2020-06-01',
    purchase_cost: 28000,
    expected_useful_life: 12,
    current_value: 19600,
    warranty_expiry: '2025-06-01',
    description: 'Automated milking system for 30 cows',
    odometer_hours: 8650,
    fuel_level: null,
    assigned_to: 'Mary Wanjiku',
    last_used: '2024-01-11',
    utilization_rate: 95,
    maintenance_cost_total: 6800,
    supplier: null,
    condition: 'fair',
    next_service_hours: 9000,
  },
  {
    id: 'demo-3',
    asset_id: 'EQ-2019-003',
    name: 'Krone BigX 480 Forage Harvester',
    equipment_type: 'harvester',
    category: 'vehicles',
    brand: 'Krone',
    model: 'BigX 480',
    year_manufactured: 2019,
    serial_number: 'KR-BX480-2019-003',
    status: 'in_maintenance',
    location: 'Equipment Shed',
    current_location: 'Workshop',
    ownership_type: 'owned',
    purchase_date: '2019-09-10',
    purchase_cost: 95000,
    expected_useful_life: 18,
    current_value: 71250,
    warranty_expiry: '2024-09-10',
    description: 'High-capacity forage harvester for silage season',
    odometer_hours: 3200,
    fuel_level: 40,
    assigned_to: 'Peter Mwangi',
    last_used: '2024-01-05',
    utilization_rate: 45,
    maintenance_cost_total: 12400,
    supplier: null,
    condition: 'poor',
    downtime_days: 5,
  },
  {
    id: 'demo-4',
    asset_id: 'EQ-2022-004',
    name: 'Lely Vector Feed Robot',
    equipment_type: 'feeding_equipment',
    category: 'feeding_equipment',
    brand: 'Lely',
    model: 'Vector A4',
    year_manufactured: 2022,
    serial_number: 'LY-VEC-2022-004',
    status: 'operational',
    location: 'Freestall Barn',
    current_location: 'Freestall Barn',
    ownership_type: 'leased',
    purchase_date: '2022-01-20',
    purchase_cost: 72000,
    expected_useful_life: 10,
    current_value: 64800,
    warranty_expiry: '2027-01-20',
    description: 'Automated feed pusher and delivery robot',
    odometer_hours: 5100,
    fuel_level: null,
    assigned_to: 'Auto-system',
    last_used: '2024-01-11',
    utilization_rate: 88,
    maintenance_cost_total: 1200,
    supplier: null,
    condition: 'excellent',
  },
  {
    id: 'demo-5',
    asset_id: 'EQ-2020-005',
    name: 'Bobcat S550 Skid Steer',
    equipment_type: 'loader',
    category: 'vehicles',
    brand: 'Bobcat',
    model: 'S550',
    year_manufactured: 2020,
    serial_number: 'BC-S550-2020-005',
    status: 'broken',
    location: 'Workshop',
    current_location: 'Workshop',
    ownership_type: 'owned',
    purchase_date: '2020-11-05',
    purchase_cost: 38000,
    expected_useful_life: 12,
    current_value: 22800,
    warranty_expiry: '2023-11-05',
    description: 'Manure management and general-purpose loader',
    odometer_hours: 2800,
    fuel_level: 20,
    assigned_to: 'Unassigned',
    last_used: '2024-01-02',
    utilization_rate: 30,
    maintenance_cost_total: 8900,
    supplier: null,
    condition: 'poor',
    downtime_days: 9,
  },
  {
    id: 'demo-6',
    asset_id: 'EQ-2021-006',
    name: 'GEA CoolMatic 4000 Tank',
    equipment_type: 'cooling_system',
    category: 'power_equipment',
    brand: 'GEA',
    model: 'CoolMatic 4000',
    year_manufactured: 2021,
    serial_number: 'GEA-CM4000-2021-006',
    status: 'operational',
    location: 'Milk Storage',
    current_location: 'Milk Storage',
    ownership_type: 'owned',
    purchase_date: '2021-07-12',
    purchase_cost: 18500,
    expected_useful_life: 15,
    current_value: 15800,
    warranty_expiry: '2026-07-12',
    description: 'Bulk milk cooling and storage tank',
    odometer_hours: 14200,
    fuel_level: null,
    assigned_to: 'Dairy Unit',
    last_used: '2024-01-11',
    utilization_rate: 99,
    maintenance_cost_total: 950,
    supplier: null,
    condition: 'excellent',
  },
]

const DEMO_STATS = {
  totalEquipment: 6,
  operational: 3,
  maintenanceDue: 1,
  inMaintenance: 1,
  broken: 1,
  upcomingMaintenance: 2,
  totalAssetValue: 232750,
  totalMaintenanceCost: 33450,
  avgUtilization: 72,
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'operational', label: 'Operational' },
  { value: 'maintenance_due', label: 'Due' },
  { value: 'in_maintenance', label: 'In Service' },
  { value: 'broken', label: 'Broken' },
]

const CATEGORY_FILTERS = [
  { value: 'all', label: 'All Types' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'milking_equipment', label: 'Milking' },
  { value: 'feeding_equipment', label: 'Feeding' },
  { value: 'power_equipment', label: 'Power' },
]

// ─── NEW SIMULATED DATA FOR ASSIGNMENTS ───────────────────────────────────────
const SIMULATED_ACTIVE_ASSIGNMENTS = [
  {
    id: 'asgn-1',
    equipmentName: 'John Deere 5075E Tractor',
    operator: 'James Kamau',
    role: 'Driver',
    cert: 'Heavy Machinery Class G',
    dateOut: '2024-05-11T07:00:00Z',
    expectedIn: '2024-05-15T18:00:00Z',
    status: 'active'
  },
  {
    id: 'asgn-2',
    equipmentName: 'Krone BigX 480 Harvester',
    operator: 'Peter Mwangi',
    role: 'Technician',
    cert: 'Krone Certified Tech',
    dateOut: '2024-05-10T08:30:00Z',
    expectedIn: '2024-05-10T17:00:00Z',
    status: 'overdue'
  }
]

const SIMULATED_ACTIVITY_LOG = [
  {
    id: 'log-1',
    type: 'out',
    equipment: 'Bobcat S550 Skid Steer',
    staff: 'James Kamau',
    purpose: 'Manure management',
    fuel: 80,
    timestamp: '2024-05-11T09:15:00Z'
  },
  {
    id: 'log-2',
    type: 'in',
    equipment: 'John Deere 5075E Tractor',
    staff: 'Mary Wanjiku',
    purpose: 'Transporting feed',
    fuel: 45,
    condition: 'Good',
    timestamp: '2024-05-11T08:45:00Z'
  },
  {
    id: 'log-3',
    type: 'out',
    equipment: 'Lely Vector Feed Robot',
    staff: 'System Auto',
    purpose: 'Routine feeding cycle',
    fuel: 100,
    timestamp: '2024-05-11T06:00:00Z'
  }
]

export function EquipmentManagement({
  farmId,
  equipment: initialEquipment,
  equipmentStats,
  canManage,
}: EquipmentManagementProps) {
  const [equipment, setEquipment] = useState(initialEquipment)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null)
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<'inventory' | 'assignments' | 'analytics'>('inventory')
  const [activeAssignments, setActiveAssignments] = useState<any[]>([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  
  // Check-in/out modal state
  const [checkInOutModalOpen, setCheckInOutModalOpen] = useState(false)
  const [checkInOutMode, setCheckInOutMode] = useState<'out' | 'in'>('out')
  const [checkOutSessions, setCheckOutSessions] = useState<Record<string, any>>({})
  const [expandedCheckoutDetails, setExpandedCheckoutDetails] = useState<string | null>(null)

  const { isMobile } = useDeviceInfo()

  // Fetch equipment assignments from API
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!farmId) return
      setAssignmentsLoading(true)
      try {
        const response = await fetch('/api/equipment-assignments?active_only=true')
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const result = await response.json()
        const assignments = result.data || []
        
        // Transform database assignments to UI format
        const transformedAssignments = assignments.map((asgn: any) => {
          // Find the equipment name
          const equipmentItem = equipment.find(e => e.id === asgn.equipment_id)
          const equipmentName = equipmentItem?.name || 'Unknown Equipment'
          
          // Determine status based on expected_return date
          let status = 'active'
          if (asgn.expected_return) {
            const expectedReturnDate = new Date(asgn.expected_return)
            const now = new Date()
            if (expectedReturnDate < now && !asgn.actual_return) {
              status = 'overdue'
            }
          }
          
          return {
            id: asgn.id,
            equipmentName,
            operator: asgn.staff_id, // We'll use this to match with worker later
            role: asgn.role,
            cert: asgn.certification_required || 'None',
            dateOut: asgn.date_out,
            expectedIn: asgn.expected_return || new Date().toISOString(),
            status,
            staffId: asgn.staff_id,
            equipmentId: asgn.equipment_id,
          }
        })

        // Fetch worker names to populate operator field
        try {
          const workersRes = await fetch('/api/workers')
          if (workersRes.ok) {
            const workers = await workersRes.json()
            const workerMap = new Map(
              (Array.isArray(workers) ? workers : workers.data || []).map((w: any) => [w.id, w.name])
            )
            
            // Replace staff_id with worker name
            const assignmentsWithNames = transformedAssignments.map((asgn: any) => ({
              ...asgn,
              operator: workerMap.get(asgn.staffId) || 'Unknown Operator',
            }))
            
            setActiveAssignments(assignmentsWithNames)
          }
        } catch (error) {
          console.error('Failed to fetch worker names:', error)
          setActiveAssignments(transformedAssignments)
        }
      } catch (error) {
        console.error('Failed to fetch assignments:', error)
        setActiveAssignments([])
      } finally {
        setAssignmentsLoading(false)
      }
    }

    fetchAssignments()
  }, [farmId, equipment])

  // Fetch check-out and check-in sessions for active assignments
  useEffect(() => {
    const fetchCheckSessions = async () => {
      if (activeAssignments.length === 0) return
      
      try {
        const sessionsMap: Record<string, any> = {}
        
        // Fetch sessions for each unique equipment
        const equipmentIds = [...new Set(activeAssignments.map(a => a.equipmentId))]
        
        for (const equipmentId of equipmentIds) {
          try {
            // Include both checked-out and checked-in sessions
            const response = await fetch(`/api/equipment/check-sessions?equipment_id=${equipmentId}&include_checked_in=true`)
            if (response.ok) {
              const result = await response.json()
              if (result.data && result.data.length > 0) {
                // Get the most recent session (either open or completed)
                const mostRecentSession = result.data[0]
                if (mostRecentSession) {
                  sessionsMap[equipmentId] = mostRecentSession
                }
              }
            }
          } catch (error) {
            console.error(`Failed to fetch check sessions for equipment ${equipmentId}:`, error)
          }
        }
        
        setCheckOutSessions(sessionsMap)
      } catch (error) {
        console.error('Failed to fetch check sessions:', error)
      }
    }

    fetchCheckSessions()
  }, [activeAssignments])

  // Fetch activity logs from check sessions
  useEffect(() => {
    const fetchActivityLogs = async () => {
      if (!farmId) return
      
      try {
        // Fetch all check sessions (including completed ones) for activity log
        const response = await fetch(`/api/equipment/check-sessions?include_checked_in=true`)
        if (response.ok) {
          const result = await response.json()
          const sessions = result.data || []
          
          // Transform check sessions into activity log entries
          const logs = sessions.map((session: any) => {
            // Determine if this is a checkout or check-in entry
            const isCheckedIn = !!session.checkin_at
            const timestamp = isCheckedIn ? session.checkin_at : session.checkout_at
            const fuel = isCheckedIn ? session.fuel_level_after_pct : session.fuel_level_before_pct
            
            return {
              id: session.id,
              type: isCheckedIn ? 'in' : 'out',
              equipment: session.equipment?.name || 'Unknown',
              staff: session.worker?.name || 'Unknown',
              purpose: session.purpose || 'No purpose specified',
              fuel,
              condition: isCheckedIn ? session.condition_on_return : undefined,
              timestamp,
            }
          })
          
          // Sort by timestamp descending (most recent first)
          logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          
          setActivityLogs(logs.slice(0, 10)) // Keep last 10 activities
        }
      } catch (error) {
        console.error('Failed to fetch activity logs:', error)
        setActivityLogs([])
      }
    }

    fetchActivityLogs()
  }, [farmId])

  const handleOpenCheckOut = (assignment: any) => {
    setSelectedEquipment({
      id: assignment.equipmentId,
      name: assignment.equipmentName
    })
    setCheckInOutMode('out')
    setCheckInOutModalOpen(true)
  }

  const handleOpenCheckIn = (assignment: any) => {
    setSelectedEquipment({
      id: assignment.equipmentId,
      name: assignment.equipmentName,
      staffId: assignment.staffId
    })
    setCheckInOutMode('in')
    setCheckInOutModalOpen(true)
  }

  const handleCheckInOutModalClose = () => {
    setCheckInOutModalOpen(false)
    setSelectedEquipment(null)
  }

  const isShowingDemo = equipment.length === 0
  const displayEquipment = isShowingDemo ? DEMO_EQUIPMENT : equipment
  const displayStats = isShowingDemo ? DEMO_STATS : { ...equipmentStats, totalAssetValue: 232750, totalMaintenanceCost: 33450, avgUtilization: 72 }

  const handleEquipmentAdded = (newEquipment: any) => {
    setEquipment(prev => [newEquipment, ...prev])
    setShowAddModal(false)
  }
  const handleEquipmentUpdated = (updated: any) =>
    setEquipment(prev => prev.map(item => item.id === updated.id ? updated : item))
  const handleEquipmentRemoved = (id: string) =>
    setEquipment(prev => prev.filter(item => item.id !== id))

  const filteredEquipment = displayEquipment.filter(item => {
    const matchStatus = selectedStatus === 'all' || item.status === selectedStatus
    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchSearch = !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchStatus && matchCategory && matchSearch
  })

  const urgentItems = displayEquipment.filter(i => i.status === 'maintenance_due' || i.status === 'broken')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Equipment and Asset Management</h1>
                <p className="text-xs text-slate-500 hidden sm:block">Farm equipment & machinery</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canManage && (
                <EquipmentQuickActions
                  farmId={farmId}
                  equipment={selectedEquipment}
                  canManage={canManage}
                  onAddEquipment={() => setShowAddModal(true)}
                  onScheduleMaintenance={() => setShowMaintenanceModal(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Demo banner */}
        {isShowingDemo && (
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 px-5 py-4">
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-violet-900">Sample data preview</p>
              <p className="text-xs text-violet-600 mt-0.5">Add your first asset to replace this example data.</p>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setShowAddModal(true)} className="bg-violet-600 hover:bg-violet-700 text-white flex-shrink-0">
                <Plus className="h-3.5 w-3.5 mr-1" />Add Asset
              </Button>
            )}
          </div>
        )}

        {/* KPI row */}
        <EquipmentStatsCards stats={displayStats} />

        {/* Urgent alerts */}
        {urgentItems.length > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-rose-100 border-b border-rose-200">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span className="font-semibold text-rose-800 text-sm">
                {urgentItems.length} item{urgentItems.length > 1 ? 's' : ''} need immediate attention
              </span>
              {isShowingDemo && <Badge className="ml-auto text-xs bg-violet-100 text-violet-700 border-none">Sample</Badge>}
            </div>
            <div className="divide-y divide-rose-100">
              {urgentItems.slice(0, 4).map(item => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    {item.status === 'broken'
                      ? <XCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                      : <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.asset_id} · {item.location}</p>
                    </div>
                  </div>
                  <Badge className={item.status === 'broken'
                    ? 'bg-rose-100 text-rose-700 border-none'
                    : 'bg-amber-100 text-amber-700 border-none'}>
                    {item.status === 'broken' ? 'Repair needed' : 'Maintenance due'}
                  </Badge>
                </div>
              ))}
            </div>
            {urgentItems.length > 4 && (
              <div className="px-5 py-2 text-xs text-rose-600 font-medium">
                +{urgentItems.length - 4} more items require attention
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/50 rounded-xl p-1 w-fit border border-slate-200">
          {[
            { id: 'inventory', label: 'Inventory', icon: Settings },
            { id: 'assignments', label: 'Assignments & Activity', icon: User },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'analytics' && (
          <AnalyticsPanel equipment={displayEquipment} stats={displayStats} isDemo={isShowingDemo} />
        )}

        {activeTab === 'assignments' && (
          <AssignmentsPanel 
             activeAssignments={activeAssignments} 
             logs={activityLogs.length > 0 ? activityLogs : SIMULATED_ACTIVITY_LOG}
             checkOutSessions={checkOutSessions}
             expandedCheckoutDetails={expandedCheckoutDetails}
             onExpandCheckoutDetails={setExpandedCheckoutDetails}
             onOpenCheckOut={handleOpenCheckOut}
             onOpenCheckIn={handleOpenCheckIn}
          />
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, asset ID, operator…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-slate-200"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setSelectedStatus(f.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedStatus === f.value
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300'
                    }`}
                  >
                    {f.label}
                    {f.value !== 'all' && (
                      <span className={`ml-1.5 ${selectedStatus === f.value ? 'opacity-75' : 'text-slate-400'}`}>
                        {displayEquipment.filter(e => e.status === f.value).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setSelectedCategory(f.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === f.value
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              {(searchTerm || selectedStatus !== 'all' || selectedCategory !== 'all') && (
                <button
                  onClick={() => { setSearchTerm(''); setSelectedStatus('all'); setSelectedCategory('all') }}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100"
                >
                  Clear filters ×
                </button>
              )}
            </div>

            {/* Result count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-800">{filteredEquipment.length}</span> of {displayEquipment.length} assets
                {isShowingDemo && <span className="ml-1 text-violet-500">(demo)</span>}
              </p>
            </div>

            {/* Grid */}
            {filteredEquipment.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
                <Settings className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-700">No equipment found</h3>
                <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
            )}
          </div>
        )}
      </div>

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
      {checkInOutModalOpen && selectedEquipment && (
        <CheckInCheckOutModal
          open={checkInOutModalOpen}
          onClose={handleCheckInOutModalClose}
          equipment={selectedEquipment}
          initialMode={checkInOutMode}
        />
      )}
    </div>
  )
}

/* ─── Inline Analytics Panel ───────────────────────────────────────── */
function AnalyticsPanel({ equipment, stats, isDemo }: { equipment: any[]; stats: any; isDemo: boolean }) {
  const totalValue = equipment.reduce((sum, e) => sum + (e.current_value || 0), 0)
  const totalMaintCost = equipment.reduce((sum, e) => sum + (e.maintenance_cost_total || 0), 0)
  const avgUtil = Math.round(equipment.reduce((sum, e) => sum + (e.utilization_rate || 0), 0) / (equipment.length || 1))
  const mostUsed = [...equipment].sort((a, b) => (b.utilization_rate || 0) - (a.utilization_rate || 0)).slice(0, 3)
  const highCost = [...equipment].sort((a, b) => (b.maintenance_cost_total || 0) - (a.maintenance_cost_total || 0)).slice(0, 3)

  const kpis = [
    { label: 'Fleet Value', value: `$${(totalValue / 1000).toFixed(0)}k`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg Utilization', value: `${avgUtil}%`, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Maintenance Spend', value: `$${(totalMaintCost / 1000).toFixed(1)}k`, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Downtime Assets', value: `${equipment.filter(e => e.status !== 'operational').length}`, icon: Zap, color: 'text-rose-600', bg: 'bg-rose-50' },
  ]

  return (
    <div className="space-y-5">
      {isDemo && (
        <p className="text-xs text-violet-500 font-medium bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 w-fit">
          Sample analytics — add real equipment for live data
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mb-3`}>
              <k.icon className={`w-5 h-5 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{k.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />Top Utilization
          </h3>
          <div className="space-y-3">
            {mostUsed.map(e => (
              <div key={e.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700 truncate max-w-[60%]">{e.name}</span>
                  <span className="font-bold text-emerald-600">{e.utilization_rate}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${e.utilization_rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-500" />Highest Maintenance Cost
          </h3>
          <div className="space-y-3">
            {highCost.map(e => (
              <div key={e.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{e.name}</p>
                  <p className="text-xs text-slate-400">{e.asset_id}</p>
                </div>
                <span className="text-sm font-bold text-amber-600">
                  ${(e.maintenance_cost_total || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Condition overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-4">Fleet Condition Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['excellent', 'good', 'fair', 'poor'].map(cond => {
            const count = equipment.filter(e => e.condition === cond).length
            const colors: Record<string, string> = {
              excellent: 'bg-emerald-100 text-emerald-700',
              good: 'bg-blue-100 text-blue-700',
              fair: 'bg-amber-100 text-amber-700',
              poor: 'bg-rose-100 text-rose-700',
            }
            return (
              <div key={cond} className={`rounded-xl px-4 py-3 ${colors[cond]} text-center`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs font-semibold capitalize mt-0.5">{cond}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AssignmentsPanel({ 
  activeAssignments, 
  logs,
  checkOutSessions,
  expandedCheckoutDetails,
  onExpandCheckoutDetails,
  onOpenCheckOut,
  onOpenCheckIn,
}: { 
  activeAssignments: any[]
  logs: any[]
  checkOutSessions: Record<string, any>
  expandedCheckoutDetails: string | null
  onExpandCheckoutDetails: (id: string | null) => void
  onOpenCheckOut: (assignment: any) => void
  onOpenCheckIn: (assignment: any) => void
}) {
  const calculateDuration = (checkoutTime: string) => {
    const checkoutDate = new Date(checkoutTime)
    const now = new Date()
    const diffMs = now.getTime() - checkoutDate.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`
    }
    return `${diffMins}m`
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left 2 Columns: Active Assignments */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" /> Current Assignments
          </h3>
          <Badge className="bg-blue-50 text-blue-700 border-blue-100">{activeAssignments.length} Operators Active</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeAssignments.map(asgn => {
            const hasCheckoutSession = !!checkOutSessions[asgn.equipmentId]
            const session = checkOutSessions[asgn.equipmentId]
            const isExpanded = expandedCheckoutDetails === asgn.id
            const isCheckedIn = session?.checkin_at
            const isCheckedOut = session && !session.checkin_at
            
            return (
              <div key={asgn.id} className="space-y-2">
                <Card className="border-slate-200 overflow-hidden group hover:border-blue-300 transition-colors">
                  <div className={cn("h-1 w-full", asgn.status === 'overdue' ? "bg-rose-500" : "bg-blue-500")} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 border border-slate-200">
                          {asgn.operator[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{asgn.operator}</p>
                          <p className="text-xs text-blue-600 font-medium">{asgn.role}</p>
                        </div>
                      </div>
                      {asgn.status === 'overdue' && (
                        <Badge className="bg-rose-50 text-rose-700 border-none animate-pulse">Overdue</Badge>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Settings className="w-3.5 h-3.5" />
                        <span className="font-semibold text-slate-700">{asgn.equipmentName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Assigned: {new Date(asgn.dateOut).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Expected back: {new Date(asgn.expectedIn).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2 flex items-center gap-2 mb-4">
                       <Shield className="w-3.5 h-3.5 text-slate-400" />
                       <span className="text-[10px] font-bold text-slate-500 uppercase">{asgn.cert}</span>
                    </div>

                    {/* Checkout/Checkin Status Section */}
                    {hasCheckoutSession && session && (
                      <div className={cn("rounded-lg p-3 mb-4 border", isCheckedIn ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200")}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", isCheckedIn ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
                            <span className={cn("text-xs font-bold", isCheckedIn ? "text-emerald-700" : "text-amber-700")}>
                              {isCheckedIn ? 'Equipment Checked In' : 'Equipment Checked Out'}
                            </span>
                          </div>
                          {!isCheckedIn && <span className="text-xs font-bold text-amber-600">{calculateDuration(session.checkout_at)}</span>}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {!hasCheckoutSession ? (
                        <Button 
                          size="sm" 
                          onClick={() => onOpenCheckOut(asgn)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1" />
                          Check Out
                        </Button>
                      ) : isCheckedIn ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onExpandCheckoutDetails(isExpanded ? null : asgn.id)}
                          className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          Check In/Out Details
                          <ChevronDown className={cn("w-3.5 h-3.5 ml-auto transition-transform", isExpanded && "rotate-180")} />
                        </Button>
                      ) : (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onExpandCheckoutDetails(isExpanded ? null : asgn.id)}
                            className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            Checkout Details
                            <ChevronDown className={cn("w-3.5 h-3.5 ml-auto transition-transform", isExpanded && "rotate-180")} />
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => onOpenCheckIn(asgn)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <LogIn className="w-3.5 h-3.5 mr-1" />
                            Check In
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Expandable Details */}
                {isExpanded && hasCheckoutSession && session && (
                  <Card className={cn("overflow-hidden", isCheckedIn ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
                    <CardContent className="p-4 space-y-4">
                      <h4 className={cn("text-sm font-bold", isCheckedIn ? "text-emerald-900" : "text-amber-900")}>
                        Check In/Out Details
                      </h4>
                      
                      {/* Checkout Information Section */}
                      <div className="space-y-3">
                        <p className={cn("text-[10px] font-semibold", isCheckedIn ? "text-emerald-600" : "text-amber-600")}>Checkout Information</p>
                        <div className="space-y-2 text-xs pl-3 border-l-2" style={{borderColor: isCheckedIn ? 'rgb(16 185 129)' : 'rgb(251 146 60)'}}>
                          <div className="flex justify-between items-start">
                            <span className={cn("font-medium", isCheckedIn ? "text-emerald-700" : "text-amber-700")}>Equipment:</span>
                            <span className={cn("font-semibold text-right", isCheckedIn ? "text-emerald-900" : "text-amber-900")}>{session.equipment?.name || 'Unknown'}</span>
                          </div>

                          <div className="flex justify-between items-start">
                            <span className={cn("font-medium", isCheckedIn ? "text-emerald-700" : "text-amber-700")}>Checked out by:</span>
                            <span className={cn("font-semibold", isCheckedIn ? "text-emerald-900" : "text-amber-900")}>{session.worker?.name || 'Unknown'}</span>
                          </div>

                          <div className="flex justify-between items-start">
                            <span className={cn("font-medium", isCheckedIn ? "text-emerald-700" : "text-amber-700")}>Checkout time:</span>
                            <span className={cn("font-semibold", isCheckedIn ? "text-emerald-900" : "text-amber-900")}>
                              {new Date(session.checkout_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {session.purpose && (
                            <div className="flex justify-between items-start">
                              <span className={cn("font-medium", isCheckedIn ? "text-emerald-700" : "text-amber-700")}>Purpose:</span>
                              <span className={cn("font-semibold text-right", isCheckedIn ? "text-emerald-900" : "text-amber-900")}>{session.purpose}</span>
                            </div>
                          )}

                          {session.location_used && (
                            <div className="flex justify-between items-start">
                              <span className={cn("font-medium", isCheckedIn ? "text-emerald-700" : "text-amber-700")}>Location used:</span>
                              <span className={cn("font-semibold text-right", isCheckedIn ? "text-emerald-900" : "text-amber-900")}>{session.location_used}</span>
                            </div>
                          )}

                          {session.fuel_level_before_pct !== null && (
                            <div className="flex justify-between items-start">
                              <span className={cn("font-medium", isCheckedIn ? "text-emerald-700" : "text-amber-700")}>Fuel at checkout:</span>
                              <span className={cn("font-semibold", isCheckedIn ? "text-emerald-900" : "text-amber-900")}>{session.fuel_level_before_pct}%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Check-in Information Section */}
                      <div className="space-y-3">
                        <p className={cn("text-[10px] font-semibold", isCheckedIn ? "text-emerald-600" : "text-slate-500")}>Check-in Information</p>
                        {isCheckedIn ? (
                          <div className="space-y-2 text-xs pl-3 border-l-2 border-emerald-500">
                            <div className="flex justify-between items-start">
                              <span className="font-medium text-emerald-700">Checked in:</span>
                              <span className="font-semibold text-emerald-900">
                                {new Date(session.checkin_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {session.fuel_level_after_pct !== null && (
                              <div className="flex justify-between items-start">
                                <span className="font-medium text-emerald-700">Fuel at check-in:</span>
                                <span className="font-semibold text-emerald-900">{session.fuel_level_after_pct}%</span>
                              </div>
                            )}

                            {session.condition_on_return && (
                              <div className="flex justify-between items-start">
                                <span className="font-medium text-emerald-700">Condition:</span>
                                <span className="font-semibold capitalize text-emerald-900">{session.condition_on_return}</span>
                              </div>
                            )}

                            {session.damage_notes && (
                              <div className="flex justify-between items-start">
                                <span className="font-medium text-emerald-700">Notes:</span>
                                <span className="font-semibold text-right text-emerald-900">{session.damage_notes}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic pl-3">Not checked in yet</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Column: Checkout/Activity Log */}
      <div className="space-y-4">
        <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" /> Recent Activity
        </h3>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm h-fit">
          <div className="relative pl-6 border-l-2 border-slate-100 space-y-8 py-2">
            {logs.map((log) => (
              <div key={log.id} className="relative">
                {/* Timeline Dot */}
                <div className={cn(
                  "absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm",
                  log.type === 'out' ? "bg-amber-500" : "bg-emerald-500"
                )} />
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-black uppercase",
                      log.type === 'out' ? "text-amber-600 border-amber-200" : "text-emerald-600 border-emerald-200"
                    )}>
                      {log.type === 'out' ? 'Checked Out' : 'Checked In'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm font-bold text-slate-800 leading-tight">{log.equipment}</p>
                  <p className="text-xs text-slate-500 mb-2">{log.staff} · {log.purpose}</p>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-600">{log.fuel}%</span>
                    </div>
                    {log.condition && (
                       <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-600">{log.condition}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <Button variant="ghost" size="sm" className="w-full mt-4 text-xs font-bold text-slate-500 hover:text-slate-800">
            View All Activity History <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}