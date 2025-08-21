'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { 
  Plus,
  Calendar,
  Heart,
  Baby,
  Clock,
  AlertCircle,
  CheckCircle,
  Zap,
  Users,
  TrendingUp,
  FileText,
  Edit,
  Trash2,
  Eye,
  CalendarDays,
  Timer,
  Activity,
  AlertTriangle
} from 'lucide-react'
import { format, differenceInDays, addDays, parseISO } from 'date-fns'

interface BreedingRecord {
  id: string
  animal_id: string
  breeding_date: string
  breeding_method: 'natural' | 'artificial_insemination'
  sire_id?: string
  sire_tag?: string
  sire_breed?: string
  expected_calving_date?: string
  actual_calving_date?: string
  pregnancy_confirmed: boolean
  pregnancy_check_date?: string
  pregnancy_status: 'pending' | 'confirmed' | 'negative' | 'aborted' | 'completed'
  gestation_period?: number
  breeding_notes?: string
  veterinarian?: string
  breeding_cost?: number
  offspring_count?: number
  offspring_ids?: string[]
  complications?: string
  created_at: string
  updated_at: string
}

interface PregnancyCheck {
  id: string
  breeding_record_id: string
  check_date: string
  check_method: 'palpation' | 'ultrasound' | 'blood_test' | 'visual'
  result: 'positive' | 'negative' | 'inconclusive'
  checked_by: string
  notes?: string
  next_check_date?: string
}

interface AnimalBreedingRecordsProps {
  animalId: string
  animal: any
  canAddRecords: boolean
}

export function AnimalBreedingRecords({ animalId, animal, canAddRecords }: AnimalBreedingRecordsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([])
  const [pregnancyChecks, setPregnancyChecks] = useState<PregnancyCheck[]>([])
  const [showAddBreedingModal, setShowAddBreedingModal] = useState(false)
  const [showAddCheckModal, setShowAddCheckModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<BreedingRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isMobile } = useDeviceInfo()

  // Form states
  const [breedingForm, setBreedingForm] = useState<{
    breeding_date: string,
    breeding_method: 'natural' | 'artificial_insemination',
    sire_tag: string,
    sire_breed: string,
    veterinarian: string,
    breeding_cost: string,
    breeding_notes: string
  }>({
    breeding_date: format(new Date(), 'yyyy-MM-dd'),
    breeding_method: 'artificial_insemination',
    sire_tag: '',
    sire_breed: '',
    veterinarian: '',
    breeding_cost: '',
    breeding_notes: ''
  })

  const [checkForm, setCheckForm] = useState<{
    check_date: string,
    check_method: 'palpation' | 'ultrasound' | 'blood_test' | 'visual',
    result: 'positive' | 'negative' | 'inconclusive',
    checked_by: string,
    notes: string,
    next_check_date: string
  }>({
    check_date: format(new Date(), 'yyyy-MM-dd'),
    check_method: 'palpation',
    result: 'positive',
    checked_by: '',
    notes: '',
    next_check_date: ''
  })

  // Load breeding records
  useEffect(() => {
    loadBreedingRecords()
  }, [animalId])

  const loadBreedingRecords = async () => {
    try {
      setLoading(true)
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock data - replace with actual API call
      const mockRecords: BreedingRecord[] = [
        {
          id: '1',
          animal_id: animalId,
          breeding_date: '2024-06-15',
          breeding_method: 'artificial_insemination',
          sire_tag: 'BULL001',
          sire_breed: 'Holstein',
          expected_calving_date: '2025-03-23',
          pregnancy_confirmed: true,
          pregnancy_check_date: '2024-07-20',
          pregnancy_status: 'confirmed',
          gestation_period: 280,
          breeding_notes: 'First breeding attempt, successful confirmation',
          veterinarian: 'Dr. Sarah Johnson',
          breeding_cost: 150,
          created_at: '2024-06-15T08:00:00Z',
          updated_at: '2024-07-20T10:30:00Z'
        }
      ]
      
      setBreedingRecords(mockRecords)
    } catch (err) {
      setError('Failed to load breeding records')
      console.error('Error loading breeding records:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateExpectedCalvingDate = (breedingDate: string, gestationDays = 280): string => {
    return format(addDays(parseISO(breedingDate), gestationDays), 'yyyy-MM-dd')
  }

  const getDaysToCalving = (expectedDate: string): number => {
    return differenceInDays(parseISO(expectedDate), new Date())
  }

  const getPregnancyStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'negative':
        return <Badge className="bg-red-100 text-red-800">Not Pregnant</Badge>
      case 'aborted':
        return <Badge className="bg-red-100 text-red-800">Aborted</Badge>
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
  }

  const handleAddBreeding = async () => {
    try {
      const expectedCalvingDate = calculateExpectedCalvingDate(breedingForm.breeding_date)
      
      const newRecord: BreedingRecord = {
        id: Date.now().toString(),
        animal_id: animalId,
        breeding_date: breedingForm.breeding_date,
        breeding_method: breedingForm.breeding_method,
        sire_tag: breedingForm.sire_tag || undefined,
        sire_breed: breedingForm.sire_breed || undefined,
        expected_calving_date: expectedCalvingDate,
        pregnancy_confirmed: false,
        pregnancy_status: 'pending',
        gestation_period: 280,
        breeding_notes: breedingForm.breeding_notes || undefined,
        veterinarian: breedingForm.veterinarian || undefined,
        breeding_cost: breedingForm.breeding_cost ? Number(breedingForm.breeding_cost) : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Simulate API call
      setBreedingRecords(prev => [newRecord, ...prev])
      setShowAddBreedingModal(false)
      resetBreedingForm()
    } catch (err) {
      setError('Failed to add breeding record')
      console.error('Error adding breeding record:', err)
    }
  }

  const handleAddPregnancyCheck = async (breedingRecordId: string) => {
    try {
      const newCheck: PregnancyCheck = {
        id: Date.now().toString(),
        breeding_record_id: breedingRecordId,
        check_date: checkForm.check_date,
        check_method: checkForm.check_method,
        result: checkForm.result,
        checked_by: checkForm.checked_by,
        notes: checkForm.notes || undefined,
        next_check_date: checkForm.next_check_date || undefined
      }

      // Update breeding record if pregnancy confirmed
      if (checkForm.result === 'positive') {
        setBreedingRecords(prev => prev.map(record => 
          record.id === breedingRecordId 
            ? { 
                ...record, 
                pregnancy_confirmed: true, 
                pregnancy_status: 'confirmed',
                pregnancy_check_date: checkForm.check_date
              }
            : record
        ))
      } else if (checkForm.result === 'negative') {
        setBreedingRecords(prev => prev.map(record => 
          record.id === breedingRecordId 
            ? { 
                ...record, 
                pregnancy_confirmed: false, 
                pregnancy_status: 'negative',
                pregnancy_check_date: checkForm.check_date
              }
            : record
        ))
      }

      setPregnancyChecks(prev => [newCheck, ...prev])
      setShowAddCheckModal(false)
      resetCheckForm()
    } catch (err) {
      setError('Failed to add pregnancy check')
      console.error('Error adding pregnancy check:', err)
    }
  }

  const resetBreedingForm = () => {
    setBreedingForm({
      breeding_date: format(new Date(), 'yyyy-MM-dd'),
      breeding_method: 'artificial_insemination',
      sire_tag: '',
      sire_breed: '',
      veterinarian: '',
      breeding_cost: '',
      breeding_notes: ''
    })
  }

  const resetCheckForm = () => {
    setCheckForm({
      check_date: format(new Date(), 'yyyy-MM-dd'),
      check_method: 'palpation',
      result: 'positive',
      checked_by: '',
      notes: '',
      next_check_date: ''
    })
  }

  const getCurrentPregnancy = () => {
    return breedingRecords.find(record => 
      record.pregnancy_status === 'confirmed' && !record.actual_calving_date
    )
  }

  const currentPregnancy = getCurrentPregnancy()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Pregnancy Status */}
      {currentPregnancy && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className={cn("pb-3", isMobile && "px-4 py-3")}>
            <div className="flex items-center justify-between">
              <CardTitle className={cn("text-green-800", isMobile ? "text-base" : "text-lg")}>
                🤱 Currently Pregnant
              </CardTitle>
              {getPregnancyStatusBadge(currentPregnancy.pregnancy_status)}
            </div>
          </CardHeader>
          <CardContent className={cn(isMobile && "px-4 pb-4 pt-0")}>
            <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2 md:grid-cols-4")}>
              <div>
                <p className="text-sm text-green-700 font-medium">Breeding Date</p>
                <p className="text-green-900">{format(parseISO(currentPregnancy.breeding_date), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-green-700 font-medium">Expected Calving</p>
                <p className="text-green-900">
                  {currentPregnancy.expected_calving_date 
                    ? format(parseISO(currentPregnancy.expected_calving_date), 'MMM dd, yyyy')
                    : 'Not calculated'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700 font-medium">Days to Calving</p>
                <p className="text-green-900 font-semibold">
                  {currentPregnancy.expected_calving_date 
                    ? `${getDaysToCalving(currentPregnancy.expected_calving_date)} days`
                    : 'Unknown'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700 font-medium">Sire</p>
                <p className="text-green-900">{currentPregnancy.sire_tag || 'Unknown'}</p>
              </div>
            </div>
            
            {canAddRecords && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedRecord(currentPregnancy)
                    setShowAddCheckModal(true)
                  }}
                  className="text-green-700 border-green-300 hover:bg-green-100"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Add Check
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedRecord(currentPregnancy)
                    setShowEditModal(true)
                  }}
                  className="text-green-700 border-green-300 hover:bg-green-100"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Update
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={cn("font-semibold text-gray-900", isMobile ? "text-lg" : "text-xl")}>
            Breeding Records
          </h3>
          <p className={cn("text-gray-600", isMobile ? "text-sm" : "text-base")}>
            Track breeding history and pregnancy status
          </p>
        </div>
        {canAddRecords && (
          <Button 
            onClick={() => setShowAddBreedingModal(true)}
            className={cn(isMobile ? "text-sm px-3 py-2" : "")}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isMobile ? "Add" : "New Breeding"}
          </Button>
        )}
      </div>

      {/* Breeding Records Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={cn("grid w-full grid-cols-3", isMobile && "h-10")}>
          <TabsTrigger value="overview" className={cn(isMobile && "text-xs")}>
            {isMobile ? "Overview" : "Overview"}
          </TabsTrigger>
          <TabsTrigger value="history" className={cn(isMobile && "text-xs")}>
            {isMobile ? "History" : "Breeding History"}
          </TabsTrigger>
          <TabsTrigger value="genetics" className={cn(isMobile && "text-xs")}>
            {isMobile ? "Genetics" : "Genetic Records"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Breeding Stats */}
          <div className={cn("grid gap-4", isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-4")}>
            <Card>
              <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 rounded-lg p-2">
                    <Heart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                      Total Breedings
                    </p>
                    <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                      {breedingRecords.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 rounded-lg p-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                      Successful
                    </p>
                    <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                      {breedingRecords.filter(r => r.pregnancy_status === 'confirmed' || r.pregnancy_status === 'completed').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 rounded-lg p-2">
                    <Baby className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                      Offspring
                    </p>
                    <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                      {breedingRecords.reduce((total, r) => total + (r.offspring_count || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
                <div className="flex items-center space-x-3">
                  <div className="bg-yellow-100 rounded-lg p-2">
                    <TrendingUp className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                      Success Rate
                    </p>
                    <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                      {breedingRecords.length > 0 
                        ? Math.round((breedingRecords.filter(r => r.pregnancy_status === 'confirmed' || r.pregnancy_status === 'completed').length / breedingRecords.length) * 100)
                        : 0
                      }%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Breeding Activity */}
          <Card>
            <CardHeader>
              <CardTitle className={cn(isMobile ? "text-base" : "text-lg")}>
                Recent Breeding Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {breedingRecords.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">No breeding records yet</p>
                  {canAddRecords && (
                    <Button onClick={() => setShowAddBreedingModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Breeding
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {breedingRecords.slice(0, 3).map((record) => (
                    <div 
                      key={record.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 rounded-lg p-2">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {format(parseISO(record.breeding_date), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {record.breeding_method === 'artificial_insemination' ? 'AI' : 'Natural'} • 
                            Sire: {record.sire_tag || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getPregnancyStatusBadge(record.pregnancy_status)}
                        {record.expected_calving_date && record.pregnancy_status === 'confirmed' && (
                          <p className="text-xs text-gray-500 mt-1">
                            Due: {format(parseISO(record.expected_calving_date), 'MMM dd')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="space-y-4">
            {breedingRecords.map((record) => (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium">
                        Breeding #{record.id}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {format(parseISO(record.breeding_date), 'MMMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getPregnancyStatusBadge(record.pregnancy_status)}
                      {canAddRecords && (
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3")}>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Method</p>
                      <p className="text-sm">
                        {record.breeding_method === 'artificial_insemination' ? 'Artificial Insemination' : 'Natural Breeding'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Sire</p>
                      <p className="text-sm">{record.sire_tag || 'Unknown'}</p>
                      {record.sire_breed && (
                        <p className="text-xs text-gray-600">{record.sire_breed}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Expected Calving</p>
                      <p className="text-sm">
                        {record.expected_calving_date 
                          ? format(parseISO(record.expected_calving_date), 'MMM dd, yyyy')
                          : 'Not calculated'
                        }
                      </p>
                    </div>
                    {record.veterinarian && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Veterinarian</p>
                        <p className="text-sm">{record.veterinarian}</p>
                      </div>
                    )}
                    {record.breeding_cost && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Cost</p>
                        <p className="text-sm">${record.breeding_cost}</p>
                      </div>
                    )}
                  </div>

                  {record.breeding_notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                      <p className="text-sm text-gray-600">{record.breeding_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="genetics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Genetic Information</CardTitle>
              <CardDescription>
                Breeding lineage and genetic tracking for {animal.name || animal.tag_number}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">Genetic tracking coming soon</p>
                <p className="text-sm text-gray-400">
                  This will include pedigree charts, genetic coefficients, and breeding recommendations
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Breeding Modal */}
      <Modal isOpen={showAddBreedingModal} onClose={() => setShowAddBreedingModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Record New Breeding</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="breeding_date">Breeding Date *</Label>
              <Input
                id="breeding_date"
                type="date"
                value={breedingForm.breeding_date}
                onChange={(e) => setBreedingForm(prev => ({ ...prev, breeding_date: e.target.value }))}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div>
              <Label htmlFor="breeding_method">Breeding Method *</Label>
              <Select
                value={breedingForm.breeding_method}
                onValueChange={(value: 'natural' | 'artificial_insemination') => 
                  setBreedingForm(prev => ({ ...prev, breeding_method: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="artificial_insemination">Artificial Insemination</SelectItem>
                  <SelectItem value="natural">Natural Breeding</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sire_tag">Sire Tag Number</Label>
              <Input
                id="sire_tag"
                value={breedingForm.sire_tag}
                onChange={(e) => setBreedingForm(prev => ({ ...prev, sire_tag: e.target.value }))}
                placeholder="e.g., BULL001"
              />
            </div>

            <div>
              <Label htmlFor="sire_breed">Sire Breed</Label>
              <Input
                id="sire_breed"
                value={breedingForm.sire_breed}
                onChange={(e) => setBreedingForm(prev => ({ ...prev, sire_breed: e.target.value }))}
                placeholder="e.g., Holstein"
              />
            </div>

            <div>
              <Label htmlFor="veterinarian">Veterinarian</Label>
              <Input
                id="veterinarian"
                value={breedingForm.veterinarian}
                onChange={(e) => setBreedingForm(prev => ({ ...prev, veterinarian: e.target.value }))}
                placeholder="Veterinarian name"
              />
            </div>

            <div>
              <Label htmlFor="breeding_cost">Cost ($)</Label>
              <Input
                id="breeding_cost"
                type="number"
                value={breedingForm.breeding_cost}
                onChange={(e) => setBreedingForm(prev => ({ ...prev, breeding_cost: e.target.value }))}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <Label htmlFor="breeding_notes">Notes</Label>
              <Textarea
                id="breeding_notes"
                value={breedingForm.breeding_notes}
                onChange={(e) => setBreedingForm(prev => ({ ...prev, breeding_notes: e.target.value }))}
                placeholder="Additional notes about the breeding"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowAddBreedingModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddBreeding}>
              Record Breeding
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Pregnancy Check Modal */}
      <Modal isOpen={showAddCheckModal} onClose={() => setShowAddCheckModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Add Pregnancy Check</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="check_date">Check Date *</Label>
              <Input
                id="check_date"
                type="date"
                value={checkForm.check_date}
                onChange={(e) => setCheckForm(prev => ({ ...prev, check_date: e.target.value }))}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div>
              <Label htmlFor="check_method">Check Method *</Label>
              <Select
                value={checkForm.check_method}
                onValueChange={(value: 'palpation' | 'ultrasound' | 'blood_test' | 'visual') => 
                  setCheckForm(prev => ({ ...prev, check_method: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="palpation">Rectal Palpation</SelectItem>
                  <SelectItem value="ultrasound">Ultrasound</SelectItem>
                  <SelectItem value="blood_test">Blood Test</SelectItem>
                  <SelectItem value="visual">Visual Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="result">Result *</Label>
              <Select
                value={checkForm.result}
                onValueChange={(value: 'positive' | 'negative' | 'inconclusive') => 
                  setCheckForm(prev => ({ ...prev, result: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Positive (Pregnant)</SelectItem>
                  <SelectItem value="negative">Negative (Not Pregnant)</SelectItem>
                  <SelectItem value="inconclusive">Inconclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="checked_by">Checked By *</Label>
              <Input
                id="checked_by"
                value={checkForm.checked_by}
                onChange={(e) => setCheckForm(prev => ({ ...prev, checked_by: e.target.value }))}
                placeholder="Veterinarian or technician name"
                required
              />
            </div>

            <div>
              <Label htmlFor="next_check_date">Next Check Date</Label>
              <Input
                id="next_check_date"
                type="date"
                value={checkForm.next_check_date}
                onChange={(e) => setCheckForm(prev => ({ ...prev, next_check_date: e.target.value }))}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div>
              <Label htmlFor="check_notes">Notes</Label>
              <Textarea
                id="check_notes"
                value={checkForm.notes}
                onChange={(e) => setCheckForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional observations or notes"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowAddCheckModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => selectedRecord && handleAddPregnancyCheck(selectedRecord.id)}
              disabled={!checkForm.checked_by}
            >
              Add Check
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Breeding Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Update Breeding Record</h2>
          
          {selectedRecord && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Editing breeding record for {format(parseISO(selectedRecord.breeding_date), 'MMMM dd, yyyy')}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Current Status</Label>
                  <div className="mt-1">
                    {getPregnancyStatusBadge(selectedRecord.pregnancy_status)}
                  </div>
                </div>
                <div>
                  <Label>Breeding Method</Label>
                  <p className="mt-1 text-sm">
                    {selectedRecord.breeding_method === 'artificial_insemination' 
                      ? 'Artificial Insemination' 
                      : 'Natural Breeding'
                    }
                  </p>
                </div>
              </div>

              {/* Update Status Options */}
              <div className="border-t pt-4">
                <Label className="text-base font-medium">Update Status</Label>
                <div className="mt-2 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedRecord(selectedRecord)
                      setShowEditModal(false)
                      setShowAddCheckModal(true)
                    }}
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    Add Pregnancy Check
                  </Button>
                  
                  {selectedRecord.pregnancy_status === 'confirmed' && (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-blue-600"
                      onClick={() => {
                        // Handle calving record
                        setShowEditModal(false)
                      }}
                    >
                      <Baby className="w-4 h-4 mr-2" />
                      Record Calving
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600"
                    onClick={() => {
                      // Handle abort/end pregnancy
                      setBreedingRecords(prev => prev.map(record => 
                        record.id === selectedRecord.id 
                          ? { ...record, pregnancy_status: 'aborted' }
                          : record
                      ))
                      setShowEditModal(false)
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Mark as Aborted
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowEditModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}