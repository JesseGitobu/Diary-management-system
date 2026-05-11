'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Settings, Calendar, DollarSign, MapPin, Wrench, Edit,
  MoreHorizontal, CheckCircle, Clock, XCircle, AlertTriangle,
  Truck, Droplets, Zap, Thermometer, Package, Scissors,
  Activity, User, Hash, Fuel, Timer, TrendingDown,
  ChevronDown, ChevronUp, QrCode,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

import { EquipmentHistoryModal } from '@/components/equipment/Equipmenthistorymodal' 

interface EquipmentCardProps {
  equipment: any
  canManage: boolean
  isDemo?: boolean
  onEquipmentUpdated?: (e: any) => void
  onEquipmentRemoved?: (id: string) => void
  onMaintenanceSchedule?: (id: string) => void
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  tractor: Truck, milking_equipment: Droplets, harvester: Scissors,
  feeding_equipment: Package, loader: Truck, cooling_system: Thermometer,
  generator: Zap, pump: Droplets, vehicle: Truck, spray_equipment: Droplets, other: Settings,
}

const STATUS_META: Record<string, { label: string; dot: string; badge: string; border: string }> = {
  operational:     { label: 'Operational',    dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700', border: 'border-l-emerald-500' },
  maintenance_due: { label: 'Maintenance Due', dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700',    border: 'border-l-amber-500' },
  in_maintenance:  { label: 'In Maintenance',  dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700',      border: 'border-l-blue-500' },
  broken:          { label: 'Broken',          dot: 'bg-rose-500',   badge: 'bg-rose-50 text-rose-700',      border: 'border-l-rose-500' },
  retired:         { label: 'Retired',         dot: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-600',   border: 'border-l-slate-400' },
}

const CONDITION_BAR: Record<string, { w: string; color: string }> = {
  excellent: { w: 'w-full',    color: 'bg-emerald-500' },
  good:      { w: 'w-3/4',     color: 'bg-blue-500' },
  fair:      { w: 'w-1/2',     color: 'bg-amber-500' },
  poor:      { w: 'w-1/4',     color: 'bg-rose-500' },
}

const OWNERSHIP_LABELS: Record<string, string> = {
  owned: 'Owned', leased: 'Leased', rented: 'Rented',
}

export function EquipmentCard({
  equipment: eq,
  canManage,
  isDemo,
  onMaintenanceSchedule,
  onEquipmentUpdated,
  onEquipmentRemoved,
}: EquipmentCardProps) {
  const [expanded, setExpanded] = useState(false)

  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const status = STATUS_META[eq.status] || STATUS_META.operational
  // Use equipment_type.code if available (from relation), otherwise fall back to equipment_type (legacy)
  const typeCode = eq.equipment_type?.code || eq.equipment_type || 'other'
  const TypeIcon = TYPE_ICONS[typeCode] || Settings
  const condBar = CONDITION_BAR[eq.condition] || CONDITION_BAR.fair

  const isWarrantyExpiring = eq.warranty_expiry &&
    new Date(eq.warranty_expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const handleStatusUpdate = async (newStatus: string) => {
    if (isDemo) return
    try {
      const res = await fetch(`/api/equipment/${eq.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) onEquipmentUpdated?.({ ...eq, status: newStatus })
    } catch (e) { console.error(e) }
  }

  const handleRemove = async () => {
    if (isDemo || !confirm('Remove this equipment?')) return
    try {
      const res = await fetch(`/api/equipment/${eq.id}`, { method: 'DELETE' })
      if (res.ok) onEquipmentRemoved?.(eq.id)
    } catch (e) { console.error(e) }
  }

  return (
    <>
    <Card className={`group relative flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 ${status.border} hover:shadow-md transition-all duration-200 overflow-hidden`}>

      {/* ── Header ──────────────────────────────────────────── */}
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            eq.status === 'operational' ? 'bg-emerald-50 text-emerald-600' :
            eq.status === 'broken'      ? 'bg-rose-50 text-rose-600' :
            eq.status === 'in_maintenance' ? 'bg-blue-50 text-blue-600' :
            'bg-amber-50 text-amber-600'
          }`}>
            <TypeIcon className="w-5 h-5" />
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm leading-tight">{eq.name}</h3>
              {isDemo && (
                <Badge className="text-xs bg-violet-50 text-violet-600 border border-violet-200 font-normal px-1.5 py-0">Sample</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Hash className="w-3 h-3 text-slate-400" />
              <span className="text-xs font-mono text-slate-500">{eq.asset_id || eq.serial_number}</span>
              {eq.year_manufactured && (
                <span className="text-xs text-slate-400">· {eq.year_manufactured}</span>
              )}
            </div>
          </div>

          {/* Actions menu */}
          {canManage && !isDemo && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="-mr-1 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem><Edit className="w-4 h-4 mr-2" />Edit Asset</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMaintenanceSchedule?.(eq.id)}>
                  <Wrench className="w-4 h-4 mr-2" />Schedule Maintenance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsHistoryOpen(true)}>
                    <Calendar className="w-4 h-4 mr-2" />View History
                  </DropdownMenuItem>
                {/* <DropdownMenuItem><QrCode className="w-4 h-4 mr-2" />Generate QR Code</DropdownMenuItem> */}
                <DropdownMenuItem onClick={handleRemove} className="text-rose-600">
                  <XCircle className="w-4 h-4 mr-2" />Remove Asset
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

          {/* Status + category + ownership badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${status.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 capitalize font-medium">
              {eq.equipment_type?.label || eq.equipment_type?.replace(/_/g, ' ') || 'N/A'}
            </span>
            {eq.ownership_type && (
              <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                {OWNERSHIP_LABELS[eq.ownership_type] || eq.ownership_type}
              </span>
            )}
          </div>
      </CardHeader>

      {/* ── Body ────────────────────────────────────────────── */}
      <CardContent className="px-5 pb-4 space-y-4 flex-1">

        {/* Brand / model / location */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {/* Brand - from equipment table */}
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Brand</span>
          <span className="font-semibold text-slate-800 text-right text-xs truncate">{eq.brand || 'N/A'}</span>

          {/* Model - from equipment table */}
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Model</span>
          <span className="font-semibold text-slate-800 text-right text-xs truncate">{eq.model || 'N/A'}</span>

          {/* Location - from equipment table */}
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wide flex items-center gap-1">
            <MapPin className="w-3 h-3" />Location
          </span>
          <span className="font-semibold text-slate-800 text-right text-xs truncate">{eq.current_location || eq.home_location || 'N/A'}</span>
        </div>

        {/* Utilization bar - from equipment table (utilization_rate_pct) */}
        {eq.utilization_rate_pct !== undefined && eq.utilization_rate_pct !== null && (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Activity className="w-3 h-3" />Utilization
              </span>
              <span className={`text-xs font-bold ${
                eq.utilization_rate_pct >= 80 ? 'text-emerald-600' :
                eq.utilization_rate_pct >= 50 ? 'text-amber-600' : 'text-rose-500'
              }`}>{eq.utilization_rate_pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  eq.utilization_rate_pct >= 80 ? 'bg-emerald-500' :
                  eq.utilization_rate_pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                }`}
                style={{ width: `${eq.utilization_rate_pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Usage meters - from equipment table (odometer_hours, fuel_level_pct) */}
        {(eq.odometer_hours !== undefined || eq.fuel_level_pct !== null) && (
          <div className="flex gap-3">
            {eq.odometer_hours !== undefined && eq.odometer_hours !== null && (
              <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <Timer className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-400">Hours run</span>
                </div>
                <p className="font-bold text-slate-800 text-sm">{eq.odometer_hours.toLocaleString()}h</p>
              </div>
            )}
            {eq.fuel_level_pct !== null && eq.fuel_level_pct !== undefined && (
              <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <Fuel className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-400">Fuel level</span>
                </div>
                <p className="font-bold text-slate-800 text-sm">{eq.fuel_level_pct}%</p>
              </div>
            )}
          </div>
        )}

        {/* Condition bar - from equipment table */}
        {eq.condition && (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-500 font-medium">Condition</span>
              <span className="text-xs font-semibold capitalize text-slate-700">{eq.condition}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${condBar.color} ${condBar.w}`} />
            </div>
          </div>
        )}

        {/* Alert strip - from equipment table status and warranty */}
        {(eq.status === 'maintenance_due' || eq.status === 'broken' || isWarrantyExpiring) && (
          <div className={`rounded-xl px-3 py-2.5 space-y-1.5 text-xs ${
            eq.status === 'broken' ? 'bg-rose-50 border border-rose-100' :
            'bg-amber-50 border border-amber-100'
          }`}>
            {eq.status === 'maintenance_due' && (
              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                Service overdue
              </div>
            )}
            {eq.status === 'broken' && (
              <div className="flex items-center gap-1.5 text-rose-700 font-medium">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Requires immediate repair
              </div>
            )}
            {isWarrantyExpiring && (
              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Warranty expiring within 30 days
              </div>
            )}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors w-full"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Less details' : 'More details'}
        </button>

        {/* Expanded: financial / lifecycle */}
        {expanded && (
          <div className="space-y-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Financial & Lifecycle</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {/* Purchase cost - from equipment table */}
              <span className="text-slate-400">Purchase cost</span>
              <span className="font-semibold text-slate-800 text-right">{eq.purchase_cost ? `$${eq.purchase_cost.toLocaleString()}` : 'N/A'}</span>

              {/* Current value - from equipment table */}
              <span className="text-slate-400">Current value</span>
              <span className="font-semibold text-slate-800 text-right">{eq.current_value ? `$${eq.current_value.toLocaleString()}` : 'N/A'}</span>

              {/* Depreciation - calculated from equipment table */}
              {eq.purchase_cost && eq.current_value && (
                <>
                  <span className="text-slate-400 flex items-center gap-1"><TrendingDown className="w-3 h-3" />Depreciated</span>
                  <span className="font-semibold text-rose-500 text-right">
                    {Math.round(((eq.purchase_cost - eq.current_value) / eq.purchase_cost) * 100)}%
                  </span>
                </>
              )}

              {/* Purchase date - from equipment table */}
              <span className="text-slate-400">Purchased</span>
              <span className="font-medium text-slate-700 text-right">
                {eq.purchase_date ? new Date(eq.purchase_date).toLocaleDateString() : 'N/A'}
              </span>

              {/* Warranty expiry - from equipment table */}
              <span className="text-slate-400">Warranty</span>
              <span className={`font-medium text-right ${isWarrantyExpiring ? 'text-amber-600' : 'text-slate-700'}`}>
                {eq.warranty_expiry ? new Date(eq.warranty_expiry).toLocaleDateString() : 'N/A'}
              </span>

              {/* Expected useful life - from equipment table (expected_useful_life_years) */}
              <span className="text-slate-400">Useful life</span>
              <span className="font-medium text-slate-700 text-right">
                {eq.expected_useful_life_years ? `${eq.expected_useful_life_years} yrs` : 'N/A'}
              </span>
            </div>
          </div>
        )}

        {/* CTA buttons */}
        {canManage && !isDemo && (
          <div className="flex gap-2 border-t border-slate-100 pt-3">
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
              <Wrench className="w-3.5 h-3.5 mr-1.5" />Log Maintenance
            </Button>
            {(eq.status === 'maintenance_due' || eq.status === 'broken') && (
              <Button size="sm" className="flex-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => onMaintenanceSchedule?.(eq.id)}>
                <Calendar className="w-3.5 h-3.5 mr-1.5" />Schedule
              </Button>
            )}
          </div>
        )}
        <div className="flex gap-2 border-t border-slate-100 pt-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs h-8"
              onClick={() => setIsHistoryOpen(true)}
            >
              <Activity className="w-3.5 h-3.5 mr-1.5" />Full History
            </Button>
          </div>
      </CardContent>
    </Card>

    {/* 4. RENDER THE MODAL COMPONENT */}
      <EquipmentHistoryModal 
        open={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        equipment={eq} 
      />

      </>
  )
}