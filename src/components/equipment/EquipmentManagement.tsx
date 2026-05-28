'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Settings, Plus, AlertTriangle, CheckCircle, Clock, XCircle,
  Wrench, Calendar, Filter, Search, ChevronRight,
  BarChart3, TrendingUp, Zap, Activity,
  User,
  Shield,
  Fuel,
  ChevronDown,
  LogOut,
  LogIn,
  AlertCircle,
  CheckSquare,
  DollarSign,
  Timer,
  Package,
  ChevronUp,
  FileText,
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
  const [activeTab, setActiveTab] = useState<'inventory' | 'repairs' | 'assignments' | 'analytics'>('inventory')
  const [activeAssignments, setActiveAssignments] = useState<any[]>([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [usageLogs, setUsageLogs] = useState<any[]>([])

  const [damageReports, setDamageReports] = useState<any[]>([])
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([])
  const [repairsLoading, setRepairsLoading] = useState(false)

  const [checkInOutModalOpen, setCheckInOutModalOpen] = useState(false)
  const [checkInOutMode, setCheckInOutMode] = useState<'out' | 'in'>('out')
  const [checkOutSessions, setCheckOutSessions] = useState<Record<string, any>>({})
  const [expandedCheckoutDetails, setExpandedCheckoutDetails] = useState<string | null>(null)

  const { isMobile } = useDeviceInfo()

  useEffect(() => { setEquipment(initialEquipment) }, [initialEquipment])

  // Fetch equipment assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!farmId) return
      setAssignmentsLoading(true)
      try {
        const response = await fetch('/api/equipment-assignments?active_only=true')
        if (!response.ok) throw new Error(`API error: ${response.status}`)

        const result = await response.json()
        const assignments = result.data || []

        const transformedAssignments = assignments.map((asgn: any) => {
          const equipmentItem = equipment.find(e => e.id === asgn.equipment_id)
          const equipmentName = equipmentItem?.name || 'Unknown Equipment'

          let status = 'active'
          if (asgn.expected_return) {
            const expectedReturnDate = new Date(asgn.expected_return)
            if (expectedReturnDate < new Date() && !asgn.actual_return) {
              status = 'overdue'
            }
          }

          return {
            id: asgn.id,
            equipmentName,
            operator: asgn.staff_id,
            role: asgn.role,
            cert: asgn.certification_required || 'None',
            dateOut: asgn.date_out,
            expectedIn: asgn.expected_return || new Date().toISOString(),
            status,
            staffId: asgn.staff_id,
            equipmentId: asgn.equipment_id,
          }
        })

        try {
          const workersRes = await fetch('/api/workers')
          if (workersRes.ok) {
            const workers = await workersRes.json()
            const workerMap = new Map(
              (Array.isArray(workers) ? workers : workers.data || []).map((w: any) => [w.id, w.name])
            )
            setActiveAssignments(
              transformedAssignments.map((asgn: any) => ({
                ...asgn,
                operator: workerMap.get(asgn.staffId) || 'Unknown Operator',
              }))
            )
          } else {
            setActiveAssignments(transformedAssignments)
          }
        } catch {
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

  // Fetch check sessions for active assignments
  useEffect(() => {
    const fetchCheckSessions = async () => {
      if (activeAssignments.length === 0) return
      try {
        const sessionsMap: Record<string, any> = {}
        const equipmentIds = [...new Set(activeAssignments.map(a => a.equipmentId))]
        for (const equipmentId of equipmentIds) {
          try {
            const response = await fetch(`/api/equipment/check-sessions?equipment_id=${equipmentId}&include_checked_in=true`)
            if (response.ok) {
              const result = await response.json()
              if (result.data?.[0]) sessionsMap[equipmentId] = result.data[0]
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

  // Fetch activity logs
  useEffect(() => {
    const fetchActivityLogs = async () => {
      if (!farmId) return
      try {
        const response = await fetch('/api/equipment/check-sessions?include_checked_in=true')
        if (response.ok) {
          const result = await response.json()
          const sessions = result.data || []
          const logs = sessions.map((session: any) => {
            const isCheckedIn = !!session.checkin_at
            return {
              id: session.id,
              type: isCheckedIn ? 'in' : 'out',
              equipment: session.equipment?.name || 'Unknown',
              staff: session.worker?.name || 'Unknown',
              purpose: session.purpose || 'No purpose specified',
              fuel: isCheckedIn ? session.fuel_level_after_pct : session.fuel_level_before_pct,
              condition: isCheckedIn ? session.condition_on_return : undefined,
              timestamp: isCheckedIn ? session.checkin_at : session.checkout_at,
            }
          })
          logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          setActivityLogs(logs.slice(0, 10))
        }
      } catch (error) {
        console.error('Failed to fetch activity logs:', error)
        setActivityLogs([])
      }
    }
    fetchActivityLogs()
  }, [farmId])

  // Fetch usage logs
  useEffect(() => {
    const fetchUsageLogs = async () => {
      if (!farmId) return
      try {
        const response = await fetch('/api/equipment/usage-logs')
        if (response.ok) {
          const result = await response.json()
          setUsageLogs(result.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch usage logs:', error)
        setUsageLogs([])
      }
    }
    fetchUsageLogs()
  }, [farmId])

  // Fetch damage reports and maintenance records
  useEffect(() => {
    const fetchRepairsData = async () => {
      if (!farmId) return
      setRepairsLoading(true)
      try {
        const [damageRes, maintRes] = await Promise.all([
          fetch('/api/damage-reports'),
          fetch('/api/equipment/maintenance'),
        ])
        if (damageRes.ok) {
          const result = await damageRes.json()
          setDamageReports(result.data || [])
        }
        if (maintRes.ok) {
          const result = await maintRes.json()
          setMaintenanceRecords(result.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch repairs data:', error)
        setDamageReports([])
        setMaintenanceRecords([])
      } finally {
        setRepairsLoading(false)
      }
    }
    fetchRepairsData()
  }, [farmId])

  const handleOpenCheckOut = (assignment: any) => {
    setSelectedEquipment({ id: assignment.equipmentId, name: assignment.equipmentName })
    setCheckInOutMode('out')
    setCheckInOutModalOpen(true)
  }

  const handleOpenCheckIn = (assignment: any) => {
    setSelectedEquipment({ id: assignment.equipmentId, name: assignment.equipmentName, staffId: assignment.staffId })
    setCheckInOutMode('in')
    setCheckInOutModalOpen(true)
  }

  const handleCheckInOutModalClose = () => {
    setCheckInOutModalOpen(false)
    setSelectedEquipment(null)
  }

  const handleEquipmentAdded = (newEquipment: any) => {
    setEquipment(prev => [newEquipment, ...prev])
    setShowAddModal(false)
  }
  const handleEquipmentUpdated = (updated: any) =>
    setEquipment(prev => prev.map(item => item.id === updated.id ? updated : item))
  const handleEquipmentRemoved = (id: string) =>
    setEquipment(prev => prev.filter(item => item.id !== id))

  const filteredEquipment = equipment.filter(item => {
    const matchStatus = selectedStatus === 'all' || item.status === selectedStatus
    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchSearch = !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchStatus && matchCategory && matchSearch
  })

  const urgentItems = equipment.filter(i => i.status === 'maintenance_due' || i.status === 'broken')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top bar ── */}
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
        {/* KPI row */}
        <EquipmentStatsCards stats={equipmentStats} />

        {/* Urgent alerts */}
        {urgentItems.length > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-rose-100 border-b border-rose-200">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span className="font-semibold text-rose-800 text-sm">
                {urgentItems.length} item{urgentItems.length > 1 ? 's' : ''} need immediate attention
              </span>
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
        <div className="flex items-center gap-1 bg-slate-200/50 rounded-xl p-1 w-fit border border-slate-200 flex-wrap">
          {[
            { id: 'inventory', label: 'Inventory', icon: Settings },
            { id: 'repairs', label: 'Repairs & Maintenance', icon: Wrench },
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
          <AnalyticsPanel equipment={equipment} stats={equipmentStats} />
        )}

        {activeTab === 'assignments' && (
          <AssignmentsPanel
            activeAssignments={activeAssignments}
            logs={activityLogs}
            usageLogs={usageLogs}
            checkOutSessions={checkOutSessions}
            expandedCheckoutDetails={expandedCheckoutDetails}
            onExpandCheckoutDetails={setExpandedCheckoutDetails}
            onOpenCheckOut={handleOpenCheckOut}
            onOpenCheckIn={handleOpenCheckIn}
          />
        )}

        {activeTab === 'repairs' && (
          <RepairsMaintenancePanel
            damageReports={damageReports}
            maintenanceRecords={maintenanceRecords}
            loading={repairsLoading}
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
                        {equipment.filter(e => e.status === f.value).length}
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

            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-800">{filteredEquipment.length}</span> of {equipment.length} assets
            </p>

            {filteredEquipment.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
                <Settings className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <h3 className="font-semibold text-slate-700">
                  {equipment.length === 0 ? 'No equipment added yet' : 'No equipment found'}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {equipment.length === 0
                    ? 'Add your first asset to get started.'
                    : 'Try adjusting your filters.'}
                </p>
                {equipment.length === 0 && canManage && (
                  <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowAddModal(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />Add Equipment
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredEquipment.map(item => (
                  <EquipmentCard
                    key={item.id}
                    equipment={item}
                    canManage={canManage}
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

/* ─── Repairs & Maintenance Panel ─────────────────────────────────── */
function RepairsMaintenancePanel({
  damageReports,
  maintenanceRecords,
  loading,
}: {
  damageReports: any[]
  maintenanceRecords: any[]
  loading: boolean
}) {
  const [activeSection, setActiveSection] = useState<'damage' | 'maintenance'>('damage')
  const [expandedDamage, setExpandedDamage] = useState<string | null>(null)
  const [expandedMaint, setExpandedMaint] = useState<string | null>(null)
  const [damageStatusFilter, setDamageStatusFilter] = useState('all')
  const [maintStatusFilter, setMaintStatusFilter] = useState('all')

  const urgencyConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    critical: { label: 'Critical', color: 'text-rose-700',   bg: 'bg-rose-100',   dot: 'bg-rose-500' },
    high:     { label: 'High',     color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
    medium:   { label: 'Medium',   color: 'text-amber-700',  bg: 'bg-amber-100',  dot: 'bg-amber-400' },
    low:      { label: 'Low',      color: 'text-slate-600',  bg: 'bg-slate-100',  dot: 'bg-slate-400' },
  }

  const damageStatusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    open:        { label: 'Open',        color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200',      icon: AlertCircle },
    in_progress: { label: 'In Progress', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',    icon: Clock },
    resolved:    { label: 'Resolved',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
    closed:      { label: 'Closed',      color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200',    icon: CheckSquare },
  }

  const maintStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
    scheduled:   { label: 'Scheduled',   color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
    in_progress: { label: 'In Progress', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
    completed:   { label: 'Completed',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    cancelled:   { label: 'Cancelled',   color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200' },
    overdue:     { label: 'Overdue',     color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200' },
  }

  const maintTypeConfig: Record<string, { label: string; color: string }> = {
    preventive: { label: 'Preventive', color: 'text-blue-600' },
    corrective: { label: 'Corrective', color: 'text-rose-600' },
    inspection: { label: 'Inspection', color: 'text-purple-600' },
    emergency:  { label: 'Emergency',  color: 'text-red-700' },
    upgrade:    { label: 'Upgrade',    color: 'text-emerald-600' },
  }

  const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
    urgent: { label: 'Urgent', color: 'text-rose-700',   bg: 'bg-rose-100' },
    high:   { label: 'High',   color: 'text-orange-700', bg: 'bg-orange-100' },
    medium: { label: 'Medium', color: 'text-amber-700',  bg: 'bg-amber-100' },
    low:    { label: 'Low',    color: 'text-slate-600',  bg: 'bg-slate-100' },
  }

  const filteredDamage = damageReports.filter(r =>
    damageStatusFilter === 'all' || r.status === damageStatusFilter
  )
  const filteredMaint = maintenanceRecords.filter(r =>
    maintStatusFilter === 'all' || r.status === maintStatusFilter
  )

  const openDamage      = damageReports.filter(r => r.status === 'open').length
  const criticalDamage  = damageReports.filter(r => r.urgency === 'critical').length
  const scheduledMaint  = maintenanceRecords.filter(r => r.status === 'scheduled').length
  const totalMaintCost  = maintenanceRecords
    .filter(r => r.status === 'completed' && r.cost)
    .reduce((sum, r) => sum + parseFloat(r.cost || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open Damage Reports',    value: openDamage,                           icon: AlertCircle,  color: 'text-rose-600',    bg: 'bg-rose-50' },
          { label: 'Critical Issues',        value: criticalDamage,                       icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Scheduled Maintenance',  value: scheduledMaint,                       icon: Calendar,     color: 'text-blue-600',    bg: 'bg-blue-50' },
          { label: 'Total Maintenance Cost', value: `KES ${totalMaintCost.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mb-3`}>
              <k.icon className={`w-5 h-5 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{k.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Section Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveSection('damage')}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all",
            activeSection === 'damage'
              ? "bg-rose-600 text-white border-rose-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"
          )}
        >
          <AlertCircle className="w-4 h-4" />
          Damage Reports
          <span className={cn("ml-1 text-xs font-black rounded-full px-1.5 py-0.5",
            activeSection === 'damage' ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700")}>
            {damageReports.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSection('maintenance')}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all",
            activeSection === 'maintenance'
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
          )}
        >
          <Wrench className="w-4 h-4" />
          Maintenance Records
          <span className={cn("ml-1 text-xs font-black rounded-full px-1.5 py-0.5",
            activeSection === 'maintenance' ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700")}>
            {maintenanceRecords.length}
          </span>
        </button>
      </div>

      {/* ── DAMAGE REPORTS ── */}
      {activeSection === 'damage' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
              <button
                key={s}
                onClick={() => setDamageStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                  damageStatusFilter === s
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                )}
              >
                {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-1.5 text-[10px] opacity-60">
                  {s === 'all' ? damageReports.length : damageReports.filter(r => r.status === s).length}
                </span>
              </button>
            ))}
          </div>

          {filteredDamage.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-14 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-600">No damage reports found</p>
              <p className="text-sm text-slate-400 mt-1">
                {damageReports.length === 0 ? 'No damage reports have been logged yet.' : 'No reports match the current filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDamage.map(report => {
                const urg = urgencyConfig[report.urgency] || urgencyConfig.low
                const stat = damageStatusConfig[report.status] || damageStatusConfig.open
                const isExpanded = expandedDamage === report.id

                return (
                  <div key={report.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className={cn("h-1 w-full", {
                      'bg-rose-500': report.urgency === 'critical',
                      'bg-orange-500': report.urgency === 'high',
                      'bg-amber-400': report.urgency === 'medium',
                      'bg-slate-300': report.urgency === 'low',
                    })} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full", urg.bg, urg.color)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", urg.dot)} />
                              {urg.label} Urgency
                            </span>
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", stat.bg, stat.color)}>
                              {stat.label}
                            </span>
                            {report.creates_work_order && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                Work Order Created
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 text-base leading-tight">{report.equipmentName}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">{report.asset_id}</p>
                        </div>
                        <button
                          onClick={() => setExpandedDamage(isExpanded ? null : report.id)}
                          className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                        </button>
                      </div>

                      <p className={cn("text-sm text-slate-600 leading-relaxed", !isExpanded && "line-clamp-2")}>
                        {report.description}
                      </p>

                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <User className="w-3.5 h-3.5" />
                          <span>Reported by <span className="font-semibold text-slate-700">{report.reported_by}</span></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Discovered {new Date(report.discovered_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        {report.check_session_id && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Linked to checkout session</span>
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                          {report.status === 'resolved' && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                              <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" /> Resolution Details
                              </p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-emerald-600">Resolved at:</span>
                                  <span className="font-semibold text-emerald-900">
                                    {new Date(report.resolved_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {report.resolution_notes && (
                                  <div className="flex justify-between items-start gap-4">
                                    <span className="text-emerald-600 flex-shrink-0">Notes:</span>
                                    <span className="font-medium text-emerald-900 text-right">{report.resolution_notes}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {report.maintenance_id && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                              <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5" /> Linked Maintenance Record
                              </p>
                              <p className="text-xs text-blue-600 mt-1">A maintenance record has been created to address this damage report.</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 rounded-lg p-3">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Reported</p>
                              <p className="text-xs font-semibold text-slate-700">
                                {new Date(report.created_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Last Updated</p>
                              <p className="text-xs font-semibold text-slate-700">
                                {new Date(report.updated_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MAINTENANCE RECORDS ── */}
      {activeSection === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['all', 'scheduled', 'in_progress', 'completed', 'cancelled'].map(s => (
              <button
                key={s}
                onClick={() => setMaintStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                  maintStatusFilter === s
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                )}
              >
                {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-1.5 text-[10px] opacity-60">
                  {s === 'all' ? maintenanceRecords.length : maintenanceRecords.filter(r => r.status === s).length}
                </span>
              </button>
            ))}
          </div>

          {filteredMaint.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-14 text-center">
              <Wrench className="mx-auto h-10 w-10 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-600">No maintenance records found</p>
              <p className="text-sm text-slate-400 mt-1">
                {maintenanceRecords.length === 0 ? 'No maintenance has been logged yet.' : 'No records match the current filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMaint.map(record => {
                const stat = maintStatusConfig[record.status] || maintStatusConfig.scheduled
                const typeConf = maintTypeConfig[record.maintenance_type] || { label: record.maintenance_type, color: 'text-slate-600' }
                const pri = priorityConfig[record.priority] || priorityConfig.medium
                const isExpanded = expandedMaint === record.id
                const totalPartsCost = (record.parts || []).reduce((sum: number, p: any) =>
                  sum + (parseFloat(p.unit_cost || 0) * parseFloat(p.quantity || 1)), 0)

                return (
                  <div key={record.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className={cn("h-1 w-full", {
                      'bg-rose-500': record.priority === 'urgent',
                      'bg-orange-500': record.priority === 'high',
                      'bg-amber-400': record.priority === 'medium',
                      'bg-slate-300': record.priority === 'low',
                    })} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", stat.bg, stat.color)}>
                              {stat.label}
                            </span>
                            <span className={cn("text-xs font-bold", typeConf.color)}>
                              {typeConf.label}
                            </span>
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", pri.bg, pri.color)}>
                              {pri.label} Priority
                            </span>
                            {record.damage_report_id && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                Damage Report Linked
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 text-base leading-tight">{record.equipmentName}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">{record.asset_id}</p>
                        </div>
                        <button
                          onClick={() => setExpandedMaint(isExpanded ? null : record.id)}
                          className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                        </button>
                      </div>

                      <p className={cn("text-sm text-slate-600 leading-relaxed", !isExpanded && "line-clamp-2")}>
                        {record.description}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        {[
                          { label: 'Date',       value: new Date(record.maintenance_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) },
                          { label: 'Cost',       value: record.cost != null ? `KES ${parseFloat(record.cost).toLocaleString()}` : '—' },
                          { label: 'Labour Hrs', value: record.labour_hours != null ? `${parseFloat(record.labour_hours).toFixed(1)}h` : '—' },
                          { label: 'Downtime',   value: record.downtime_hours != null ? `${parseFloat(record.downtime_hours).toFixed(0)}h` : '—' },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-slate-50 rounded-lg p-2.5 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
                            <p className="text-xs font-bold text-slate-800 mt-0.5">{value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        {record.performed_by && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <User className="w-3.5 h-3.5" />
                            <span>Performed by <span className="font-semibold text-slate-700">{record.performed_by}</span></span>
                          </div>
                        )}
                        {record.service_interval_hours && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Timer className="w-3.5 h-3.5" />
                            <span>Every <span className="font-semibold text-slate-700">{record.service_interval_hours}h</span></span>
                          </div>
                        )}
                        {record.next_maintenance_date && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Next: <span className="font-semibold text-slate-700">{new Date(record.next_maintenance_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                          {record.notes && (
                            <div className="bg-slate-50 rounded-xl p-4">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Technician Notes</p>
                              <p className="text-sm text-slate-600 leading-relaxed">{record.notes}</p>
                            </div>
                          )}
                          {record.status === 'completed' && record.completed_at && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                              <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" /> Completed
                              </p>
                              <p className="text-xs text-emerald-800">
                                {new Date(record.completed_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          )}
                          {record.parts && record.parts.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5" /> Parts Used ({record.parts.length})
                              </p>
                              <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead className="bg-slate-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-bold text-slate-500">Part Name</th>
                                      <th className="px-3 py-2 text-left font-bold text-slate-500 hidden sm:table-cell">Part No.</th>
                                      <th className="px-3 py-2 text-center font-bold text-slate-500">Qty</th>
                                      <th className="px-3 py-2 text-right font-bold text-slate-500">Unit Cost</th>
                                      <th className="px-3 py-2 text-right font-bold text-slate-500">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {record.parts.map((part: any) => (
                                      <tr key={part.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-2.5">
                                          <p className="font-semibold text-slate-800">{part.part_name}</p>
                                          {part.supplier && <p className="text-[10px] text-slate-400">{part.supplier}</p>}
                                        </td>
                                        <td className="px-3 py-2.5 text-slate-500 hidden sm:table-cell">{part.part_number || '—'}</td>
                                        <td className="px-3 py-2.5 text-center font-semibold text-slate-700">{parseFloat(part.quantity).toFixed(0)}</td>
                                        <td className="px-3 py-2.5 text-right text-slate-600">
                                          {part.unit_cost != null ? `KES ${parseFloat(part.unit_cost).toLocaleString()}` : '—'}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                                          {part.unit_cost != null
                                            ? `KES ${(parseFloat(part.unit_cost) * parseFloat(part.quantity)).toLocaleString()}`
                                            : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-slate-50 border-t border-slate-200">
                                    <tr>
                                      <td colSpan={4} className="px-3 py-2 text-right font-bold text-slate-600 text-xs">Parts Total</td>
                                      <td className="px-3 py-2 text-right font-black text-slate-900 text-sm">
                                        KES {totalPartsCost.toLocaleString()}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          )}
                          {record.parts && record.parts.length === 0 && (
                            <div className="bg-slate-50 rounded-xl p-4 text-center">
                              <Package className="mx-auto w-6 h-6 text-slate-300 mb-1" />
                              <p className="text-xs text-slate-400">No parts recorded for this maintenance</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 rounded-lg p-3">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Created</p>
                              <p className="text-xs font-semibold text-slate-700">
                                {new Date(record.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                              <p className="text-[10px] text-slate-400">by {record.created_by}</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Last Updated</p>
                              <p className="text-xs font-semibold text-slate-700">
                                {new Date(record.updated_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Analytics Panel ──────────────────────────────────────────────── */
function AnalyticsPanel({ equipment, stats }: { equipment: any[]; stats: any }) {
  const totalValue     = equipment.reduce((sum, e) => sum + (e.current_value || 0), 0)
  const totalMaintCost = equipment.reduce((sum, e) => sum + (e.maintenance_cost_total || 0), 0)
  const avgUtil        = Math.round(equipment.reduce((sum, e) => sum + (e.utilization_rate || 0), 0) / (equipment.length || 1))
  const mostUsed       = [...equipment].sort((a, b) => (b.utilization_rate || 0) - (a.utilization_rate || 0)).slice(0, 3)
  const highCost       = [...equipment].sort((a, b) => (b.maintenance_cost_total || 0) - (a.maintenance_cost_total || 0)).slice(0, 3)

  const kpis = [
    { label: 'Fleet Value',       value: `$${(totalValue / 1000).toFixed(0)}k`,     icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg Utilization',   value: `${avgUtil}%`,                              icon: Activity,   color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Maintenance Spend', value: `$${(totalMaintCost / 1000).toFixed(1)}k`, icon: Wrench,     color: 'text-amber-600',   bg: 'bg-amber-50' },
    { label: 'Downtime Assets',   value: `${equipment.filter(e => e.status !== 'operational').length}`, icon: Zap, color: 'text-rose-600', bg: 'bg-rose-50' },
  ]

  return (
    <div className="space-y-5">
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
          {mostUsed.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No utilization data available</p>
          ) : (
            <div className="space-y-3">
              {mostUsed.map(e => (
                <div key={e.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 truncate max-w-[60%]">{e.name}</span>
                    <span className="font-bold text-emerald-600">{e.utilization_rate}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${e.utilization_rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-500" />Highest Maintenance Cost
          </h3>
          {highCost.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No maintenance cost data available</p>
          ) : (
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
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-4">Fleet Condition Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['excellent', 'good', 'fair', 'poor'].map(cond => {
            const count = equipment.filter(e => e.condition === cond).length
            const colors: Record<string, string> = {
              excellent: 'bg-emerald-100 text-emerald-700',
              good:      'bg-blue-100 text-blue-700',
              fair:      'bg-amber-100 text-amber-700',
              poor:      'bg-rose-100 text-rose-700',
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

/* ─── Assignments Panel ────────────────────────────────────────────── */
function AssignmentsPanel({
  activeAssignments,
  logs,
  usageLogs,
  checkOutSessions,
  expandedCheckoutDetails,
  onExpandCheckoutDetails,
  onOpenCheckOut,
  onOpenCheckIn,
}: {
  activeAssignments: any[]
  logs: any[]
  usageLogs: any[]
  checkOutSessions: Record<string, any>
  expandedCheckoutDetails: string | null
  onExpandCheckoutDetails: (id: string | null) => void
  onOpenCheckOut: (assignment: any) => void
  onOpenCheckIn: (assignment: any) => void
}) {
  const calculateDuration = (checkoutTime: string) => {
    const diffMs    = new Date().getTime() - new Date(checkoutTime).getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins  = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return diffHours > 0 ? `${diffHours}h ${diffMins}m` : `${diffMins}m`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Active Assignments */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" /> Current Assignments
          </h3>
          <Badge className="bg-blue-50 text-blue-700 border-blue-100">{activeAssignments.length} Operators Active</Badge>
        </div>

        {activeAssignments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-14 text-center">
            <User className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="font-semibold text-slate-600">No active assignments</p>
            <p className="text-sm text-slate-400 mt-1">Equipment assignments will appear here once created.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAssignments.map(asgn => {
              const session     = checkOutSessions[asgn.equipmentId]
              const isExpanded  = expandedCheckoutDetails === asgn.id
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

                      {session && (
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

                      <div className="flex gap-2">
                        {!session ? (
                          <Button size="sm" onClick={() => onOpenCheckOut(asgn)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                            <LogOut className="w-3.5 h-3.5 mr-1" />Check Out
                          </Button>
                        ) : isCheckedIn ? (
                          <Button size="sm" variant="outline" onClick={() => onExpandCheckoutDetails(isExpanded ? null : asgn.id)} className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                            <Clock className="w-3.5 h-3.5 mr-1" />Check In/Out Details
                            <ChevronDown className={cn("w-3.5 h-3.5 ml-auto transition-transform", isExpanded && "rotate-180")} />
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => onExpandCheckoutDetails(isExpanded ? null : asgn.id)} className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50">
                              <Clock className="w-3.5 h-3.5 mr-1" />Checkout Details
                              <ChevronDown className={cn("w-3.5 h-3.5 ml-auto transition-transform", isExpanded && "rotate-180")} />
                            </Button>
                            <Button size="sm" onClick={() => onOpenCheckIn(asgn)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                              <LogIn className="w-3.5 h-3.5 mr-1" />Check In
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {isExpanded && session && (
                    <Card className={cn("overflow-hidden", isCheckedIn ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
                      <CardContent className="p-4 space-y-4">
                        <h4 className={cn("text-sm font-bold", isCheckedIn ? "text-emerald-900" : "text-amber-900")}>Check In/Out Details</h4>

                        <div className="space-y-3">
                          <p className={cn("text-[10px] font-semibold", isCheckedIn ? "text-emerald-600" : "text-amber-600")}>Checkout Information</p>
                          <div className="space-y-2 text-xs pl-3 border-l-2" style={{ borderColor: isCheckedIn ? 'rgb(16 185 129)' : 'rgb(251 146 60)' }}>
                            {[
                              { label: 'Equipment',       value: session.equipment?.name || 'Unknown' },
                              { label: 'Checked out by',  value: session.worker?.name || 'Unknown' },
                              { label: 'Checkout time',   value: new Date(session.checkout_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                              session.purpose        && { label: 'Purpose',       value: session.purpose },
                              session.location_used  && { label: 'Location used', value: session.location_used },
                              session.fuel_level_before_pct != null && { label: 'Fuel at checkout', value: `${session.fuel_level_before_pct}%` },
                            ].filter(Boolean).map((row: any) => (
                              <div key={row.label} className="flex justify-between items-start">
                                <span className={cn("font-medium", isCheckedIn ? "text-emerald-700" : "text-amber-700")}>{row.label}:</span>
                                <span className={cn("font-semibold text-right", isCheckedIn ? "text-emerald-900" : "text-amber-900")}>{row.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className={cn("text-[10px] font-semibold", isCheckedIn ? "text-emerald-600" : "text-slate-500")}>Check-in Information</p>
                          {isCheckedIn ? (
                            <div className="space-y-2 text-xs pl-3 border-l-2 border-emerald-500">
                              {[
                                { label: 'Checked in',       value: new Date(session.checkin_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                                session.fuel_level_after_pct != null && { label: 'Fuel at check-in', value: `${session.fuel_level_after_pct}%` },
                                session.condition_on_return && { label: 'Condition', value: session.condition_on_return },
                                session.damage_notes        && { label: 'Notes',     value: session.damage_notes },
                              ].filter(Boolean).map((row: any) => (
                                <div key={row.label} className="flex justify-between items-start">
                                  <span className="font-medium text-emerald-700">{row.label}:</span>
                                  <span className="font-semibold capitalize text-emerald-900">{row.value}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic pl-3">Not checked in yet</p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <p className={cn("text-[10px] font-semibold", isCheckedIn ? "text-emerald-600" : "text-amber-600")}>Usage Logs</p>
                          {(() => {
                            const filteredLogs = (usageLogs || []).filter(log => log.check_session_id === session?.id)
                            if (filteredLogs.length === 0) {
                              return <p className="text-xs text-slate-500 italic pl-3">No usage logs for this session</p>
                            }
                            return (
                              <div className="space-y-2">
                                {filteredLogs.slice(0, 5).map((log: any, idx: number) => {
                                  const hours    = typeof log.hours_this_session    === 'string' ? parseFloat(log.hours_this_session)    : log.hours_this_session
                                  const fuel     = typeof log.fuel_consumed_litres  === 'string' ? parseFloat(log.fuel_consumed_litres)  : log.fuel_consumed_litres
                                  const odometer = typeof log.odometer_reading_after === 'string' ? parseFloat(log.odometer_reading_after) : log.odometer_reading_after

                                  return (
                                    <div key={log.id} className="text-xs bg-white rounded-lg p-3 border border-slate-100 space-y-2">
                                      <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                                        <span className="font-bold text-slate-900">{new Date(log.log_date).toLocaleDateString()}</span>
                                        <span className="text-slate-500 font-medium">Log #{idx + 1}</span>
                                      </div>
                                      <div className="space-y-1 text-slate-600">
                                        {hours    != null && <div className="flex justify-between"><span>Hours Run:</span><span className="font-semibold text-slate-900">{hours.toFixed(1)}h</span></div>}
                                        {fuel     != null && <div className="flex justify-between"><span>Fuel Consumed:</span><span className="font-semibold text-slate-900">{fuel.toFixed(2)}L</span></div>}
                                        {odometer != null && <div className="flex justify-between"><span>Odometer:</span><span className="font-semibold text-slate-900">{odometer.toFixed(1)}h</span></div>}
                                        {log.task_reference && <div className="flex justify-between"><span>Task:</span><span className="font-semibold text-slate-900 text-right max-w-[150px] truncate">{log.task_reference}</span></div>}
                                        {log.notes && <div className="flex justify-between items-start pt-1 border-t border-slate-100"><span>Notes:</span><span className="text-right text-slate-700 max-w-[150px] text-[10px] line-clamp-2">{log.notes}</span></div>}
                                      </div>
                                    </div>
                                  )
                                })}
                                {filteredLogs.length > 5 && (
                                  <p className="text-[10px] text-slate-500 italic text-center pt-2">+{filteredLogs.length - 5} more logs</p>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="space-y-4">
        <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" /> Recent Activity
        </h3>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm h-fit">
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">No activity recorded yet</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-100 space-y-8 py-2">
              {logs.map(log => (
                <div key={log.id} className="relative">
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
          )}
          <Button variant="ghost" size="sm" className="w-full mt-4 text-xs font-bold text-slate-500 hover:text-slate-800">
            View All Activity History <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}