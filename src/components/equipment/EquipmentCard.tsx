'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Settings,
  Calendar,
  DollarSign,
  MapPin,
  Wrench,
  Edit,
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Truck,
  Droplets,
  Zap,
  Thermometer,
  Package,
  Scissors,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

interface EquipmentCardProps {
  equipment: any
  canManage: boolean
  isDemo?: boolean
  onEquipmentUpdated?: (updatedEquipment: any) => void
  onEquipmentRemoved?: (equipmentId: string) => void
  onMaintenanceSchedule?: (equipmentId: string) => void
}

const EQUIPMENT_TYPE_ICONS: Record<string, React.ElementType> = {
  tractor: Truck,
  milking_equipment: Droplets,
  harvester: Scissors,
  feeding_equipment: Package,
  loader: Truck,
  cooling_system: Thermometer,
  generator: Zap,
  pump: Droplets,
  vehicle: Truck,
  spray_equipment: Droplets,
  other: Settings,
}

const STATUS_BORDER: Record<string, string> = {
  operational:     'border-l-green-500',
  maintenance_due: 'border-l-yellow-500',
  in_maintenance:  'border-l-blue-500',
  broken:          'border-l-red-500',
  retired:         'border-l-gray-400',
}

const TYPE_ICON_BG: Record<string, string> = {
  operational:     'bg-green-100 text-green-700',
  maintenance_due: 'bg-yellow-100 text-yellow-700',
  in_maintenance:  'bg-blue-100 text-blue-700',
  broken:          'bg-red-100 text-red-700',
  retired:         'bg-gray-100 text-gray-600',
}

export function EquipmentCard({
  equipment,
  canManage,
  isDemo,
  onMaintenanceSchedule,
  onEquipmentUpdated,
  onEquipmentRemoved,
}: EquipmentCardProps) {
  type EquipmentStatus = 'operational' | 'maintenance_due' | 'in_maintenance' | 'broken' | 'retired'

  const getStatusColor = (status: string) => {
    const colors: Record<EquipmentStatus, string> = {
      operational:     'bg-green-100 text-green-800',
      maintenance_due: 'bg-yellow-100 text-yellow-800',
      in_maintenance:  'bg-blue-100 text-blue-800',
      broken:          'bg-red-100 text-red-800',
      retired:         'bg-gray-100 text-gray-800',
    }
    return colors[status as EquipmentStatus] || colors.operational
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':     return <CheckCircle className="w-3.5 h-3.5" />
      case 'maintenance_due': return <Clock className="w-3.5 h-3.5" />
      case 'in_maintenance':  return <Wrench className="w-3.5 h-3.5" />
      case 'broken':          return <XCircle className="w-3.5 h-3.5" />
      default:                return <Settings className="w-3.5 h-3.5" />
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (isDemo) return
    try {
      const response = await fetch(`/api/equipment/${equipment.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) {
        onEquipmentUpdated?.({ ...equipment, status: newStatus })
      }
    } catch (error) {
      console.error('Error updating equipment status:', error)
    }
  }

  const handleRemove = async () => {
    if (isDemo || !confirm('Are you sure you want to remove this equipment?')) return
    try {
      const response = await fetch(`/api/equipment/${equipment.id}`, { method: 'DELETE' })
      if (response.ok) onEquipmentRemoved?.(equipment.id)
    } catch (error) {
      console.error('Error removing equipment:', error)
    }
  }

  const isWarrantyExpiring = equipment.warranty_expiry &&
    new Date(equipment.warranty_expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const handleScheduleMaintenance = () => {
    if (!isDemo) onMaintenanceSchedule?.(equipment.id)
  }

  const TypeIcon = EQUIPMENT_TYPE_ICONS[equipment.equipment_type] || Settings
  const borderColor = STATUS_BORDER[equipment.status] || 'border-l-gray-400'
  const iconBg = TYPE_ICON_BG[equipment.status] || 'bg-gray-100 text-gray-600'

  const alertBg =
    equipment.status === 'broken'          ? 'bg-red-50 border border-red-100' :
    equipment.status === 'maintenance_due' ? 'bg-yellow-50 border border-yellow-100' :
                                             'bg-orange-50 border border-orange-100'

  return (
    <Card className={`hover:shadow-md transition-shadow border-l-4 ${borderColor}`}>
      <CardHeader className="pb-2">
        {/* Title row */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <TypeIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base leading-tight">{equipment.name}</CardTitle>
              {isDemo && (
                <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-600 border border-violet-200 font-normal">
                  Sample
                </Badge>
              )}
            </div>
            {equipment.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{equipment.description}</p>
            )}
          </div>
          {canManage && !isDemo && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-shrink-0 -mr-1">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Equipment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleScheduleMaintenance}>
                  <Wrench className="w-4 h-4 mr-2" />
                  Schedule Maintenance
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Calendar className="w-4 h-4 mr-2" />
                  View History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Status + type badges */}
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <Badge className={`${getStatusColor(equipment.status)} gap-1`}>
            {getStatusIcon(equipment.status)}
            <span className="capitalize">{equipment.status.replace(/_/g, ' ')}</span>
          </Badge>
          <Badge variant="outline" className="capitalize text-xs">
            {equipment.equipment_type.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {equipment.brand && (
            <>
              <span className="text-gray-500">Brand</span>
              <span className="font-medium text-right truncate">{equipment.brand}</span>
            </>
          )}
          {equipment.model && (
            <>
              <span className="text-gray-500">Model</span>
              <span className="font-medium text-right truncate">{equipment.model}</span>
            </>
          )}
          {equipment.serial_number && (
            <>
              <span className="text-gray-500">Serial No.</span>
              <span className="font-mono text-xs font-medium text-right truncate">{equipment.serial_number}</span>
            </>
          )}
          {equipment.location && (
            <>
              <span className="text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />Location
              </span>
              <span className="font-medium text-right truncate">{equipment.location}</span>
            </>
          )}
        </div>

        {/* Financial + dates */}
        <div className="border-t pt-3 space-y-1.5 text-sm">
          {equipment.purchase_cost && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />Purchase cost
              </span>
              <span className="font-semibold">${equipment.purchase_cost.toLocaleString()}</span>
            </div>
          )}
          {equipment.purchase_date && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />Purchased
              </span>
              <span>{new Date(equipment.purchase_date).toLocaleDateString()}</span>
            </div>
          )}
          {equipment.warranty_expiry && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Warranty expires</span>
              <div className="flex items-center gap-1">
                {isWarrantyExpiring && <AlertTriangle className="w-3 h-3 text-orange-500" />}
                <span className={isWarrantyExpiring ? 'text-orange-600 font-medium' : ''}>
                  {new Date(equipment.warranty_expiry).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Alert panel */}
        {(equipment.status === 'maintenance_due' || equipment.status === 'broken' || isWarrantyExpiring) && (
          <div className={`rounded-lg px-3 py-2.5 space-y-1 text-sm ${alertBg}`}>
            {equipment.status === 'maintenance_due' && (
              <div className="flex items-center gap-1.5 text-yellow-700">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Maintenance service overdue</span>
              </div>
            )}
            {equipment.status === 'broken' && (
              <div className="flex items-center gap-1.5 text-red-700">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Equipment requires immediate repair</span>
              </div>
            )}
            {isWarrantyExpiring && (
              <div className="flex items-center gap-1.5 text-orange-700">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Warranty expiring within 30 days</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {canManage && !isDemo && (
          <div className="border-t pt-2 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Wrench className="w-3.5 h-3.5 mr-1.5" />
              Maintenance Log
            </Button>
            {equipment.status === 'maintenance_due' && (
              <Button size="sm" className="flex-1" onClick={handleScheduleMaintenance}>
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Schedule
              </Button>
            )}
          </div>
        )}

        {equipment.supplier && (
          <div className="text-xs text-gray-400">Supplier: {equipment.supplier.name}</div>
        )}
      </CardContent>
    </Card>
  )
}