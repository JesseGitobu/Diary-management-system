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
  AlertTriangle
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
  onEquipmentUpdated?: (updatedEquipment: any) => void
  onEquipmentRemoved?: (equipmentId: string) => void
  onMaintenanceSchedule?: (equipmentId: string) => void
}

export function EquipmentCard({ 
  equipment, 
  canManage, 
  onMaintenanceSchedule,
  onEquipmentUpdated,
  onEquipmentRemoved
}: EquipmentCardProps) {
  const [showMaintenance, setShowMaintenance] = useState(false)
  
  type EquipmentStatus = 'operational' | 'maintenance_due' | 'in_maintenance' | 'broken' | 'retired';

  const getStatusColor = (status: string) => {
    const colors: Record<EquipmentStatus, string> = {
      operational: 'bg-green-100 text-green-800',
      maintenance_due: 'bg-yellow-100 text-yellow-800',
      in_maintenance: 'bg-blue-100 text-blue-800',
      broken: 'bg-red-100 text-red-800',
      retired: 'bg-gray-100 text-gray-800',
    }
    return colors[status as EquipmentStatus] || colors.operational
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-4 h-4" />
      case 'maintenance_due': return <Clock className="w-4 h-4" />
      case 'in_maintenance': return <Wrench className="w-4 h-4" />
      case 'broken': return <XCircle className="w-4 h-4" />
      default: return <Settings className="w-4 h-4" />
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/equipment/${equipment.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (response.ok) {
        const updatedEquipment = { ...equipment, status: newStatus }
        onEquipmentUpdated?.(updatedEquipment)
      }
    } catch (error) {
      console.error('Error updating equipment status:', error)
    }
  }
  
  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this equipment?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/equipment/${equipment.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        onEquipmentRemoved?.(equipment.id)
      }
    } catch (error) {
      console.error('Error removing equipment:', error)
    }
  }
  
  const isWarrantyExpiring = equipment.warranty_expiry && 
    new Date(equipment.warranty_expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  
  const handleScheduleMaintenance = () => {
    if (onMaintenanceSchedule) {
      onMaintenanceSchedule(equipment.id)
    }
  }
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{equipment.name}</CardTitle>
            {equipment.description && (
              <p className="text-sm text-gray-600 mt-1">{equipment.description}</p>
            )}
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
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
        
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(equipment.status)}>
            {getStatusIcon(equipment.status)}
            <span className="ml-1 capitalize">
              {equipment.status.replace('_', ' ')}
            </span>
          </Badge>
          <Badge variant="outline">
            {equipment.equipment_type.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Equipment Details */}
        <div className="space-y-2 text-sm">
          {equipment.brand && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Brand</span>
              <span className="font-medium">{equipment.brand}</span>
            </div>
          )}
          
          {equipment.model && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Model</span>
              <span className="font-medium">{equipment.model}</span>
            </div>
          )}
          
          {equipment.serial_number && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Serial</span>
              <span className="font-medium">{equipment.serial_number}</span>
            </div>
          )}
          
          {equipment.location && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Location</span>
              <span className="font-medium">{equipment.location}</span>
            </div>
          )}
        </div>
        
        {/* Financial Info */}
        {equipment.purchase_cost && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center">
              <DollarSign className="w-4 h-4 mr-1" />
              Purchase Cost
            </span>
            <span className="font-medium">${equipment.purchase_cost.toLocaleString()}</span>
          </div>
        )}
        
        {/* Dates */}
        <div className="space-y-2 text-sm">
          {equipment.purchase_date && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Purchased
              </span>
              <span>{new Date(equipment.purchase_date).toLocaleDateString()}</span>
            </div>
          )}
          
          {equipment.warranty_expiry && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Warranty</span>
              <div className="flex items-center space-x-1">
                {isWarrantyExpiring && (
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                )}
                <span className={isWarrantyExpiring ? 'text-orange-600' : ''}>
                  {new Date(equipment.warranty_expiry).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Alerts */}
        {(equipment.status === 'maintenance_due' || equipment.status === 'broken' || isWarrantyExpiring) && (
          <div className="pt-2 border-t space-y-1">
            {equipment.status === 'maintenance_due' && (
              <div className="flex items-center text-yellow-600 text-sm">
                <Clock className="w-4 h-4 mr-1" />
                Maintenance due
              </div>
            )}
            {equipment.status === 'broken' && (
              <div className="flex items-center text-red-600 text-sm">
                <XCircle className="w-4 h-4 mr-1" />
                Requires repair
              </div>
            )}
            {isWarrantyExpiring && (
              <div className="flex items-center text-orange-600 text-sm">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Warranty expiring soon
              </div>
            )}
          </div>
        )}
        
        {/* Actions */}
        {canManage && (
          <div className="pt-2 border-t space-y-2">
            <Button variant="outline" size="sm" className="w-full">
              <Wrench className="w-4 h-4 mr-2" />
              View Maintenance
            </Button>
            {equipment.status === 'maintenance_due' && (
              <Button size="sm" className="w-full" onClick={handleScheduleMaintenance}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Service
              </Button>
            )}
          </div>
        )}
        
        {/* Supplier Info */}
        {equipment.supplier && (
          <div className="text-xs text-gray-500">
            Supplier: {equipment.supplier.name}
          </div>
        )}
      </CardContent>
    </Card>
  )
}