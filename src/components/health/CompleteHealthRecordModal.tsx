import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, Stethoscope, Calendar, User, FileText, CheckCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface CompleteHealthRecordModalProps {
  isOpen: boolean
  onClose: () => void
  healthRecord: any
  animal: any
  onHealthRecordUpdated: (record: any) => void
}

export default function CompleteHealthRecordModal({
  isOpen,
  onClose,
  healthRecord,
  animal,
  onHealthRecordUpdated
}: CompleteHealthRecordModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    symptoms: '',
    veterinarian: '',
    medication: '',
    cost: '',
    next_due_date: '',
    notes: healthRecord?.notes || '',
    severity: healthRecord?.severity || 'medium'
  })

  const handleSubmit = async () => {
    setLoading(true)

    try {
      // Prepare update data
      const updateData: { [key: string]: string | number | null } = {
        symptoms: formData.symptoms || null,
        veterinarian: formData.veterinarian || null,
        medication: formData.medication || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        next_due_date: formData.next_due_date || null,
        notes: formData.notes || null,
        severity: formData.severity
      }

      // Remove empty fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === '' || updateData[key] === null) {
          delete updateData[key]
        }
      })

      const response = await fetch(`/api/health/records/${healthRecord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update health record')
      }

      toast.success('Health record completed successfully!')
      onHealthRecordUpdated(result.record)
      onClose()
    } catch (error) {
      console.error('Error updating health record:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update health record')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'illness': return '🤒'
      case 'checkup': return '🩺'
      case 'treatment': return '💊'
      default: return '📋'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Complete Health Record
              </h2>
              <p className="text-sm text-gray-600">
                Add detailed information for the automatically created health record
              </p>
            </div>
          </div>

          {/* Alert Banner */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-orange-800">
                Health Record Created Automatically
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                A health record was created because {animal?.name || `Animal ${animal?.tag_number}`} was 
                registered with a concerning health status. Please complete the details below for proper tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Current Record Info */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <span className="text-lg">{getRecordTypeIcon(healthRecord.record_type)}</span>
              <span>Current Record Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Animal</Label>
                <p className="font-medium">
                  {animal?.name || `Animal ${animal?.tag_number}`}
                </p>
                <p className="text-sm text-gray-600">#{animal?.tag_number}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Record Type</Label>
                <Badge className={getSeverityColor(healthRecord.record_type)}>
                  {healthRecord.record_type.charAt(0).toUpperCase() + healthRecord.record_type.slice(1)}
                </Badge>
              </div>
            </div>
            
            <div>
              <Label className="text-xs text-gray-500">Description</Label>
              <p className="text-sm bg-gray-50 p-2 rounded">
                {healthRecord.description}
              </p>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Date: {new Date(healthRecord.record_date).toLocaleDateString()}</span>
              </div>
              <Badge className={getSeverityColor(healthRecord.severity)}>
                {healthRecord.severity?.toUpperCase()} Priority
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Input Fields */}
        <div className="space-y-6">
          {/* Symptoms */}
          <div>
            <Label htmlFor="symptoms" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Symptoms Observed</span>
            </Label>
            <Textarea
              id="symptoms"
              placeholder="Describe any symptoms you've observed (e.g., lethargy, loss of appetite, fever, limping...)"
              value={formData.symptoms}
              onChange={(e) => setFormData(prev => ({ ...prev, symptoms: e.target.value }))}
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Veterinarian and Medication Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="veterinarian" className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Veterinarian Consulted</span>
              </Label>
              <Input
                id="veterinarian"
                placeholder="Dr. Smith / Veterinary Clinic Name"
                value={formData.veterinarian}
                onChange={(e) => setFormData(prev => ({ ...prev, veterinarian: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="medication">Medication/Treatment Given</Label>
              <Input
                id="medication"
                placeholder="e.g., Antibiotics, Pain relief, Vitamins"
                value={formData.medication}
                onChange={(e) => setFormData(prev => ({ ...prev, medication: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          {/* Cost and Follow-up Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost">Treatment Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="next_due_date">Next Check-up/Follow-up Date</Label>
              <Input
                id="next_due_date"
                type="date"
                value={formData.next_due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, next_due_date: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          {/* Severity */}
          <div>
            <Label htmlFor="severity">Update Severity Level</Label>
            <Select value={formData.severity} onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Low - Minor concern</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>Medium - Requires attention</span>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>High - Urgent care needed</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional observations, treatment plan, or important information..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Complete Later
            </Button>

            <div className="flex space-x-3">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>{loading ? 'Saving...' : 'Complete Health Record'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}