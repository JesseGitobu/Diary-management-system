'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Baby, Calendar, CheckCircle, X, FileText } from 'lucide-react'

interface PregnancyCheckFormProps {
  farmId: string
}

export function PregnancyCheckForm({ farmId }: PregnancyCheckFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingBreedings, setPendingBreedings] = useState<any[]>([])
  const [selectedBreeding, setSelectedBreeding] = useState<any>(null)
  type PregnancyStatus = 'suspected' | 'confirmed' | 'false' | 'aborted'
  type ConfirmationMethod = 'ultrasound' | 'blood_test' | 'rectal_palpation' | 'visual'

  const [pregnancyData, setPregnancyData] = useState<{
    pregnancy_status: PregnancyStatus
    confirmed_date: string
    confirmation_method: ConfirmationMethod
    expected_calving_date: string
    pregnancy_notes: string
    veterinarian: string
  }>({
    pregnancy_status: 'suspected',
    confirmed_date: '',
    confirmation_method: 'ultrasound',
    expected_calving_date: '',
    pregnancy_notes: '',
    veterinarian: '',
  })
  const router = useRouter()
  
  useEffect(() => {
    fetchPendingBreedings()
  }, [farmId])
  
  const fetchPendingBreedings = async () => {
    try {
      const response = await fetch(`/api/breeding/pending?farmId=${farmId}`)
      if (response.ok) {
        const data = await response.json()
        setPendingBreedings(data.breedings || [])
      }
    } catch (error) {
      console.error('Error fetching pending breedings:', error)
    }
  }
  
  const calculateExpectedCalvingDate = (breedingDate: string) => {
    // Average gestation period for cattle is 283 days
    const breeding = new Date(breedingDate)
    const expected = new Date(breeding.getTime() + (283 * 24 * 60 * 60 * 1000))
    return expected.toISOString().split('T')[0]
  }
  
  const handleBreedingSelect = (breeding: any) => {
    setSelectedBreeding(breeding)
    setPregnancyData({
      ...pregnancyData,
      expected_calving_date: calculateExpectedCalvingDate(breeding.breeding_date)
    })
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/breeding/pregnancy-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          breeding_record_id: selectedBreeding.id,
          animal_id: selectedBreeding.animal_id,
          farm_id: farmId,
          ...pregnancyData,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update pregnancy status')
      }
      
      router.push('/dashboard/breeding?success=pregnancy_updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Pending Breedings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Baby className="h-5 w-5" />
            <span>Select Breeding to Check</span>
          </CardTitle>
          <CardDescription>
            Choose a recent breeding to update pregnancy status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingBreedings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No recent breedings found. Animals need to be bred before pregnancy checks can be performed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingBreedings.map((breeding) => (
                <div
                  key={breeding.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedBreeding?.id === breeding.id
                      ? 'border-farm-green bg-farm-green/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleBreedingSelect(breeding)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        {breeding.animals?.name || `Animal ${breeding.animals?.tag_number}`}
                      </h4>
                      <div className="text-sm text-gray-600 mt-1">
                        <p>Bred: {new Date(breeding.breeding_date).toLocaleDateString()}</p>
                        <p>Method: {breeding.breeding_type.replace('_', ' ')}</p>
                        {breeding.sire_name && <p>Sire: {breeding.sire_name}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        {breeding.animals?.tag_number}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.floor((new Date().getTime() - new Date(breeding.breeding_date).getTime()) / (1000 * 60 * 60 * 24))} days ago
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Pregnancy Status Form */}
      {selectedBreeding && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Update Pregnancy Status</span>
            </CardTitle>
            <CardDescription>
              Record pregnancy check results for {selectedBreeding.animals?.name || selectedBreeding.animals?.tag_number}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pregnancy_status">Pregnancy Status</Label>
                  <select
                    id="pregnancy_status"
                    value={pregnancyData.pregnancy_status}
                    onChange={(e) => setPregnancyData({
                      ...pregnancyData,
                      pregnancy_status: e.target.value as any
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="suspected">Suspected Pregnant</option>
                    <option value="confirmed">Confirmed Pregnant</option>
                    <option value="false">Not Pregnant</option>
                    <option value="aborted">Pregnancy Lost</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="confirmed_date">Check Date</Label>
                  <Input
                    id="confirmed_date"
                    type="date"
                    value={pregnancyData.confirmed_date}
                    onChange={(e) => setPregnancyData({
                      ...pregnancyData,
                      confirmed_date: e.target.value
                    })}
                  />
                </div>
              </div>
              
              {pregnancyData.pregnancy_status === 'confirmed' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="confirmation_method">Confirmation Method</Label>
                      <select
                        id="confirmation_method"
                        value={pregnancyData.confirmation_method}
                        onChange={(e) => setPregnancyData({
                          ...pregnancyData,
                          confirmation_method: e.target.value as any
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                      >
                        <option value="ultrasound">Ultrasound</option>
                        <option value="blood_test">Blood Test</option>
                        <option value="rectal_palpation">Rectal Palpation</option>
                        <option value="visual">Visual Observation</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="expected_calving_date">Expected Calving Date</Label>
                      <Input
                        id="expected_calving_date"
                        type="date"
                        value={pregnancyData.expected_calving_date}
                        onChange={(e) => setPregnancyData({
                          ...pregnancyData,
                          expected_calving_date: e.target.value
                        })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="veterinarian">Veterinarian</Label>
                    <Input
                      id="veterinarian"
                      value={pregnancyData.veterinarian}
                      onChange={(e) => setPregnancyData({
                        ...pregnancyData,
                        veterinarian: e.target.value
                      })}
                      placeholder="Veterinarian name"
                    />
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="pregnancy_notes">Notes</Label>
                <textarea
                  id="pregnancy_notes"
                  value={pregnancyData.pregnancy_notes}
                  onChange={(e) => setPregnancyData({
                    ...pregnancyData,
                    pregnancy_notes: e.target.value
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Pregnancy check notes, observations, or recommendations..."
                />
              </div>
              
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/breeding')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Update Status'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}