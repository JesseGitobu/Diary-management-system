'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Calendar, Clock, DollarSign, Wrench, User } from 'lucide-react'

const maintenanceSchema = z.object({
  maintenance_type: z.enum(['scheduled', 'repair', 'inspection']),
  description: z.string().min(1, 'Description is required'),
  maintenance_date: z.string().min(1, 'Maintenance date is required'),
  next_maintenance_date: z.string().optional(),
  cost: z.number().optional(),
  performed_by: z.string().optional(),
  parts_used: z.string().optional(),
  labor_hours: z.number().optional(),
  notes: z.string().optional(),
})

type MaintenanceFormData = z.infer<typeof maintenanceSchema>

interface MaintenanceScheduleModalProps {
  farmId: string,
  equipment: any[]
  isOpen: boolean
  onClose: () => void
  onMaintenanceScheduled: (maintenance: any) => void
}

export function MaintenanceScheduleModal({ 
  equipment, 
  isOpen, 
  onClose, 
  onMaintenanceScheduled 
}: MaintenanceScheduleModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [maintenanceHistory, setMaintenanceHistory] = useState([])
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null)
  
  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      maintenance_type: 'scheduled',
      description: '',
      maintenance_date: new Date().toISOString().split('T')[0],
      next_maintenance_date: '',
      cost: undefined,
      performed_by: '',
      parts_used: '',
      labor_hours: undefined,
      notes: '',
    },
  })
  
  const handleSubmit = async (data: MaintenanceFormData) => {
    if (!selectedEquipment) {
      setError('Please select equipment first')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/equipment/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          equipment_id: selectedEquipment.id,
          cost: data.cost || null,
          labor_hours: data.labor_hours || null,
          next_maintenance_date: data.next_maintenance_date || null,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to schedule maintenance')
      }
      
      onMaintenanceScheduled?.(result.maintenance)
      form.reset()
      setSelectedEquipment(null)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  const getMaintenanceTypeColor = (type: 'scheduled' | 'repair' | 'inspection') => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      repair: 'bg-red-100 text-red-800',
      inspection: 'bg-green-100 text-green-800',
    }
    return colors[type] || colors.scheduled
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Maintenance Schedule
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Schedule maintenance for your equipment
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Maintenance Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New Maintenance Record</CardTitle>
                <CardDescription>
                  Schedule or record maintenance for equipment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                    {error}
                  </div>
                )}
                
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  {/* Equipment Selection */}
                  <div>
                    <Label htmlFor="equipment_select">Select Equipment *</Label>
                    <select
                      id="equipment_select"
                      value={selectedEquipment?.id || ''}
                      onChange={(e) => {
                        const selected = equipment.find(eq => eq.id === e.target.value)
                        setSelectedEquipment(selected || null)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                    >
                      <option value="">Choose equipment...</option>
                      {equipment.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} - {eq.equipment_type.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="maintenance_type">Maintenance Type *</Label>
                    <select
                      id="maintenance_type"
                      {...form.register('maintenance_type')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                    >
                      <option value="scheduled">Scheduled Maintenance</option>
                      <option value="repair">Repair</option>
                      <option value="inspection">Inspection</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Input
                      id="description"
                      {...form.register('description')}
                      error={form.formState.errors.description?.message}
                      placeholder="e.g., Oil change, brake inspection"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="maintenance_date">Maintenance Date *</Label>
                      <Input
                        id="maintenance_date"
                        type="date"
                        {...form.register('maintenance_date')}
                        error={form.formState.errors.maintenance_date?.message}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="next_maintenance_date">Next Maintenance</Label>
                      <Input
                        id="next_maintenance_date"
                        type="date"
                        {...form.register('next_maintenance_date')}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cost">Cost ($)</Label>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        {...form.register('cost', { valueAsNumber: true })}
                        placeholder="Maintenance cost"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="labor_hours">Labor Hours</Label>
                      <Input
                        id="labor_hours"
                        type="number"
                        step="0.5"
                        {...form.register('labor_hours', { valueAsNumber: true })}
                        placeholder="Hours worked"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="performed_by">Performed By</Label>
                    <Input
                      id="performed_by"
                      {...form.register('performed_by')}
                      placeholder="Technician or company name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="parts_used">Parts Used</Label>
                    <Input
                      id="parts_used"
                      {...form.register('parts_used')}
                      placeholder="List of parts or components"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      {...form.register('notes')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                      placeholder="Additional maintenance notes..."
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || !selectedEquipment}
                    >
                      {loading ? <LoadingSpinner size="sm" /> : 'Schedule Maintenance'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
          
          {/* Equipment Info & Maintenance History */}
          <div className="space-y-6">
            {selectedEquipment ? (
              <>
                {/* Equipment Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Equipment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Brand:</span>
                        <span className="ml-2 font-medium">{selectedEquipment.brand || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Model:</span>
                        <span className="ml-2 font-medium">{selectedEquipment.model || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Serial:</span>
                        <span className="ml-2 font-medium">{selectedEquipment.serial_number || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Location:</span>
                        <span className="ml-2 font-medium">{selectedEquipment.location || 'N/A'}</span>
                      </div>
                    </div>
                    
                    {selectedEquipment.purchase_date && (
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="text-gray-600">Purchased:</span>
                        <span className="ml-2 font-medium">
                          {new Date(selectedEquipment.purchase_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {selectedEquipment.warranty_expiry && (
                      <div className="flex items-center text-sm">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="text-gray-600">Warranty Expires:</span>
                        <span className="ml-2 font-medium">
                          {new Date(selectedEquipment.warranty_expiry).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Recent Maintenance History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Maintenance</CardTitle>
                    <CardDescription>
                      Last 5 maintenance records
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {maintenanceHistory.length === 0 ? (
                      <div className="text-center py-6">
                        <Wrench className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">
                          No maintenance history
                        </p>
                        <p className="text-xs text-gray-400">
                          This will be the first maintenance record
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {maintenanceHistory.slice(0, 5).map((maintenance: any) => (
                          <div key={maintenance.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <Badge className={getMaintenanceTypeColor(maintenance.maintenance_type)}>
                                  {maintenance.maintenance_type}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                  {new Date(maintenance.maintenance_date).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900">
                                {maintenance.description}
                              </p>
                              {maintenance.performed_by && (
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                  <User className="w-3 h-3 mr-1" />
                                  {maintenance.performed_by}
                                </div>
                              )}
                            </div>
                            {maintenance.cost && (
                              <div className="flex items-center text-sm font-medium text-gray-900">
                                <DollarSign className="w-4 h-4 mr-1" />
                                ${maintenance.cost.toFixed(2)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    Select Equipment
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose equipment from the dropdown to view details and schedule maintenance.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}