'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Plus, Trash2, Edit2, X, Save, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface VaccinationDisease {
  id: string
  name: string
  scientificName?: string
  vaccineName: string
  vaccinationIntervalMonths: number
  ageAtFirstVaccinationMonths: number
  boosterRequired: boolean
  boosterIntervalMonths?: number
  administeredVia: 'intramuscular' | 'subcutaneous' | 'intranasal' | 'oral'
  cost: number
  active: boolean
  notes?: string
  createdAt?: string
  updatedAt?: string
}

interface VaccinationDiseasesManagerProps {
  farmId: string
  diseases: VaccinationDisease[]
  onDiseasesChange: (diseases: VaccinationDisease[]) => void
  isLoading?: boolean
}

// Helper function to transform snake_case API response to camelCase
function transformFromApi(data: any): VaccinationDisease {
  return {
    id: data.id,
    name: data.name,
    scientificName: data.scientific_name,
    vaccineName: data.vaccine_name,
    ageAtFirstVaccinationMonths: data.age_at_first_vaccination_months,
    vaccinationIntervalMonths: data.vaccination_interval_months,
    boosterRequired: data.booster_required,
    boosterIntervalMonths: data.booster_interval_months,
    administeredVia: data.administered_via,
    cost: data.cost_kes,
    active: data.is_active,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
}

export function VaccinationDiseasesManager({
  farmId,
  diseases,
  onDiseasesChange,
  isLoading = false
}: VaccinationDiseasesManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<VaccinationDisease>>({
    name: '',
    scientificName: '',
    vaccineName: '',
    vaccinationIntervalMonths: 12,
    ageAtFirstVaccinationMonths: 0,
    boosterRequired: false,
    administeredVia: 'intramuscular',
    cost: 0,
    active: true
  })
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      scientificName: '',
      vaccineName: '',
      vaccinationIntervalMonths: undefined,
      ageAtFirstVaccinationMonths: undefined,
      boosterRequired: false,
      administeredVia: 'intramuscular',
      cost: undefined,
      active: true
    })
    setEditingId(null)
    setShowForm(false)
  }, [])

  const handleAddDisease = useCallback(() => {
    resetForm()
    setShowForm(true)
  }, [resetForm])

  const handleEditDisease = useCallback((disease: VaccinationDisease) => {
    setFormData(disease)
    setEditingId(disease.id)
    setShowForm(true)
  }, [])

  const handleDeleteDisease = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vaccination disease? This action cannot be undone.')) {
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch(`/api/settings/vaccination-diseases/${farmId}/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete disease')
      }

      const updatedDiseases = diseases.filter(d => d.id !== id)
      onDiseasesChange(updatedDiseases)
      toast.success('Disease removed from vaccination list')
    } catch (error) {
      console.error('Error deleting disease:', error)
      toast.error('Failed to delete vaccination disease')
    } finally {
      setIsSaving(false)
    }
  }, [diseases, onDiseasesChange, farmId])

  const handleSaveDisease = useCallback(async () => {
    // Validation
    if (!formData.name?.trim()) {
      toast.error('Disease name is required')
      return
    }
    if (!formData.vaccineName?.trim()) {
      toast.error('Vaccine name is required')
      return
    }
    if ((formData.vaccinationIntervalMonths || 0) <= 0) {
      toast.error('Vaccination interval must be greater than 0')
      return
    }
    if (formData.boosterRequired && (!formData.boosterIntervalMonths || formData.boosterIntervalMonths <= 0)) {
      toast.error('Booster interval is required when boosters are enabled')
      return
    }

    try {
      setIsSaving(true)

      // Prepare data in backend format (snake_case)
      const backendData = {
        name: formData.name,
        scientific_name: formData.scientificName || null,
        vaccine_name: formData.vaccineName,
        age_at_first_vaccination_months: formData.ageAtFirstVaccinationMonths ?? 0,
        vaccination_interval_months: formData.vaccinationIntervalMonths || 12,
        booster_required: formData.boosterRequired || false,
        booster_interval_months: formData.boosterRequired ? formData.boosterIntervalMonths : null,
        administered_via: formData.administeredVia || 'intramuscular',
        cost_kes: formData.cost ?? 0,
        is_active: formData.active !== false,
        notes: formData.notes || null
      }

      if (editingId) {
        // Update existing disease via API
        const response = await fetch('/api/settings/vaccination-diseases', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmId,
            diseaseId: editingId,
            diseaseData: backendData
          })
        })

        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update disease')
        }

        // Update local state with transformed data (snake_case to camelCase)
        const updatedDiseases = diseases.map(d =>
          d.id === editingId
            ? transformFromApi(result.data)
            : d
        )
        onDiseasesChange(updatedDiseases)
        toast.success('Vaccination disease updated')
      } else {
        // Create new disease via API
        const response = await fetch('/api/settings/vaccination-diseases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmId,
            diseaseData: backendData
          })
        })

        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create disease')
        }

        // Update local state with transformed data (snake_case to camelCase)
        onDiseasesChange([...diseases, transformFromApi(result.data)])
        toast.success('Vaccination disease added')
      }

      resetForm()
    } catch (error) {
      console.error('Error saving disease:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save vaccination disease')
    } finally {
      setIsSaving(false)
    }
  }, [formData, editingId, diseases, onDiseasesChange, farmId, resetForm])

  const handleCancel = useCallback(() => {
    resetForm()
  }, [resetForm])

  const activeDiseases = diseases.filter(d => d.active)
  const inactiveDiseases = diseases.filter(d => !d.active)

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Vaccination Diseases</h3>
          <p className="text-sm text-gray-600 mt-1">Manage diseases your farm vaccinates against</p>
        </div>
        {!showForm && (
          <Button onClick={handleAddDisease} disabled={isLoading}>
            <Plus className="w-4 h-4 mr-2" />
            Add Disease
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? '✏️ Edit Vaccination Disease' : '➕ Add New Vaccination Disease'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Disease Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="disease_name">Disease Name *</Label>
                <Input
                  id="disease_name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Brucellosis, Tuberculosis"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="scientific_name">Scientific Name</Label>
                <Input
                  id="scientific_name"
                  value={formData.scientificName || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, scientificName: e.target.value }))}
                  placeholder="e.g., Brucella abortus"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Vaccine Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vaccine_name">Vaccine Name *</Label>
                <Input
                  id="vaccine_name"
                  value={formData.vaccineName || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, vaccineName: e.target.value }))}
                  placeholder="e.g., Brucella S19, Bovi Shield"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="admin_route">Vaccination Route</Label>
                <select
                  id="admin_route"
                  value={formData.administeredVia || 'intramuscular'}
                  onChange={(e) => setFormData(prev => ({ ...prev, administeredVia: e.target.value as any }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green"
                >
                  <option value="intramuscular">Intramuscular (IM)</option>
                  <option value="subcutaneous">Subcutaneous (SC)</option>
                  <option value="intranasal">Intranasal</option>
                  <option value="oral">Oral</option>
                </select>
              </div>
            </div>

            {/* Vaccination Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <Label htmlFor="first_vac_age">Age at First Vaccination (months)</Label>
                <Input
                  id="first_vac_age"
                  type="number"
                  min="0"
                  value={formData.ageAtFirstVaccinationMonths === undefined ? '' : formData.ageAtFirstVaccinationMonths}
                  onChange={(e) => setFormData(prev => ({ ...prev, ageAtFirstVaccinationMonths: e.target.value ? parseInt(e.target.value) : undefined }))}
                  placeholder="e.g., 3, 6, 12"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="vac_interval">Vaccination Interval (months) *</Label>
                <Input
                  id="vac_interval"
                  type="number"
                  min="1"
                  value={formData.vaccinationIntervalMonths === undefined ? '' : formData.vaccinationIntervalMonths}
                  onChange={(e) => setFormData(prev => ({ ...prev, vaccinationIntervalMonths: e.target.value ? parseInt(e.target.value) : undefined }))}
                  placeholder="e.g., 6, 12, 24"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Booster Settings */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  id="booster_required"
                  checked={formData.boosterRequired || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, boosterRequired: e.target.checked }))}
                  className="rounded border-gray-300 text-farm-green focus:ring-farm-green"
                />
                <Label htmlFor="booster_required" className="font-medium">Booster Vaccinations Required</Label>
              </div>
              {formData.boosterRequired && (
                <div>
                  <Label htmlFor="booster_interval">Booster Interval (months)</Label>
                  <Input
                    id="booster_interval"
                    type="number"
                    min="1"
                    value={formData.boosterIntervalMonths === undefined ? '' : formData.boosterIntervalMonths}
                    onChange={(e) => setFormData(prev => ({ ...prev, boosterIntervalMonths: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="e.g., 6, 12, 24"
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            {/* Cost */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <Label htmlFor="cost">Cost per Vaccination (KES)</Label>
                <div className="flex items-center mt-1">
                  <span className="px-3 py-2 bg-gray-100 border border-gray-300 border-r-0 rounded-l-md text-gray-700 font-medium">KES</span>
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost === undefined ? '' : formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    placeholder="e.g., 500, 850, 1200"
                    className="rounded-l-none"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active ?? true}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    className="rounded border-gray-300 text-farm-green focus:ring-farm-green"
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t pt-4">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this vaccination..."
                rows={2}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveDisease} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Disease'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Diseases List */}
      {activeDiseases.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <span>Active Diseases ({activeDiseases.length})</span>
          </h4>
          <div className="grid gap-3">
            {activeDiseases.map((disease) => (
              <Card key={disease.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    {/* Disease Info */}
                    <div>
                      <h5 className="font-semibold text-gray-900">{disease.name}</h5>
                      {disease.scientificName && (
                        <p className="text-sm text-gray-600 italic">{disease.scientificName}</p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">Vaccine: {disease.vaccineName}</p>
                    </div>

                    {/* Schedule Info */}
                    <div className="space-y-1">
                      <div className="text-sm">
                        <span className="text-gray-600">First Vaccination:</span>
                        <p className="font-medium">{disease.ageAtFirstVaccinationMonths} months</p>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Interval:</span>
                        <p className="font-medium">{disease.vaccinationIntervalMonths} months</p>
                      </div>
                    </div>

                    {/* Booster Info */}
                    <div className="space-y-1">
                      {disease.boosterRequired ? (
                        <>
                          <div className="text-sm">
                            <span className="text-gray-600">Booster:</span>
                            <p className="font-medium">Every {disease.boosterIntervalMonths} months</p>
                          </div>
                          <Badge variant="secondary">Boosters Required</Badge>
                        </>
                      ) : (
                        <>
                          <div className="text-sm">
                            <span className="text-gray-600">Booster:</span>
                            <p className="font-medium">Not required</p>
                          </div>
                          <Badge variant="outline">No Boosters</Badge>
                        </>
                      )}
                    </div>

                    {/* Route & Cost */}
                    <div className="space-y-2 md:flex md:flex-col md:items-end">
                      <div className="text-sm text-right">
                        <span className="text-gray-600">Route:</span>
                        <p className="font-medium capitalize">{disease.administeredVia.replace('_', ' ')}</p>
                      </div>
                      <div className="text-sm text-right">
                        <span className="text-gray-600">Cost:</span>
                        <p className="font-medium">KES {disease.cost.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDisease(disease)}
                          disabled={isLoading || isSaving}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDisease(disease.id)}
                          disabled={isLoading || isSaving}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {disease.notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-gray-600"><strong>Notes:</strong> {disease.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Inactive Diseases List */}
      {inactiveDiseases.length > 0 && (
        <div className="space-y-2 opacity-60">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <span>Inactive Diseases ({inactiveDiseases.length})</span>
          </h4>
          <div className="grid gap-3">
            {inactiveDiseases.map((disease) => (
              <Card key={disease.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-gray-900">{disease.name}</h5>
                      <p className="text-sm text-gray-600">Vaccine: {disease.vaccineName}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">Inactive</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDisease(disease)}
                        disabled={isLoading || isSaving}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {diseases.length === 0 && !showForm && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 mb-1">No Vaccination Diseases Added</h4>
            <p className="text-sm text-gray-600 mb-4">Add diseases your farm vaccinates against to track vaccination schedules</p>
            <Button onClick={handleAddDisease} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Disease
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
