// components/feed/FeedConsumptionModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Switch } from '@/components/ui/Switch'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { 
  Plus, 
  Minus,
  Users, 
  User, 
  Wheat, 
  Clock, 
  Calculator,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react'

interface FeedConsumptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (consumption: any) => void
  farmId: string
  feedTypes: any[]
  animals: any[]
  isMobile?: boolean
}

interface ConsumptionEntry {
  feedTypeId: string
  quantityKg: number
  animalIds: string[]
  notes?: string
}

export function FeedConsumptionModal({
  isOpen,
  onClose,
  onSuccess,
  farmId,
  feedTypes,
  animals,
  isMobile = false
}: FeedConsumptionModalProps) {
  const [feedingMode, setFeedingMode] = useState<'individual' | 'batch'>('individual')
  const [selectedFeedType, setSelectedFeedType] = useState('')
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([])
  const [quantity, setQuantity] = useState('')
  const [feedingTime, setFeedingTime] = useState(new Date().toTimeString().slice(0, 5))
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [multipleEntries, setMultipleEntries] = useState<ConsumptionEntry[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const { isMobile: deviceIsMobile } = useDeviceInfo()
  const isMobileView = isMobile || deviceIsMobile

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setFeedingMode('individual')
    setSelectedFeedType('')
    setSelectedAnimals([])
    setQuantity('')
    setFeedingTime(new Date().toTimeString().slice(0, 5))
    setNotes('')
    setErrors({})
    setMultipleEntries([])
    setShowAdvanced(false)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selectedFeedType) newErrors.feedType = 'Please select a feed type'
    
    if (feedingMode === 'individual' && selectedAnimals.length === 0) {
      newErrors.animals = 'Please select at least one animal'
    }
    
    if (feedingMode === 'batch' && multipleEntries.length === 0) {
      newErrors.entries = 'Please add at least one feeding entry'
    }
    
    if (feedingMode === 'individual') {
      if (!quantity || parseFloat(quantity) <= 0) {
        newErrors.quantity = 'Please enter a valid quantity'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAnimalToggle = (animalId: string) => {
    setSelectedAnimals(prev => 
      prev.includes(animalId) 
        ? prev.filter(id => id !== animalId)
        : [...prev, animalId]
    )
  }

  const addBatchEntry = () => {
    if (!selectedFeedType || !quantity || selectedAnimals.length === 0) {
      setErrors({ batch: 'Please fill all fields before adding entry' })
      return
    }

    const newEntry: ConsumptionEntry = {
      feedTypeId: selectedFeedType,
      quantityKg: parseFloat(quantity),
      animalIds: [...selectedAnimals],
      notes
    }

    setMultipleEntries(prev => [...prev, newEntry])
    
    // Reset fields for next entry
    setSelectedFeedType('')
    setSelectedAnimals([])
    setQuantity('')
    setNotes('')
    setErrors({})
  }

  const removeBatchEntry = (index: number) => {
    setMultipleEntries(prev => prev.filter((_, i) => i !== index))
  }

  const getTotalQuantity = () => {
    if (feedingMode === 'individual') {
      return parseFloat(quantity) || 0
    }
    return multipleEntries.reduce((sum, entry) => sum + entry.quantityKg, 0)
  }

  const getTotalAnimals = () => {
    if (feedingMode === 'individual') {
      return selectedAnimals.length
    }
    const allAnimals = new Set(multipleEntries.flatMap(entry => entry.animalIds))
    return allAnimals.size
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      // Create proper timestamp from feeding time
      const today = new Date()
      const [hours, minutes] = feedingTime.split(':')
      today.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      const feedingTimestamp = today.toISOString()

      const consumptionData = {
        farmId,
        feedingTime: feedingTimestamp, // Send full timestamp instead of just time
        mode: feedingMode,
        entries: feedingMode === 'individual' 
          ? [{
              feedTypeId: selectedFeedType,
              quantityKg: parseFloat(quantity),
              animalIds: selectedAnimals,
              notes
            }]
          : multipleEntries
      }

      console.log('Sending consumption data:', consumptionData)

      const response = await fetch('/api/feed/consumption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consumptionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to record consumption')
      }

      const result = await response.json()
      onSuccess(result)
      onClose()
    } catch (error) {
      console.error('Error recording consumption:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to record consumption. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedFeedTypeName = feedTypes.find(ft => ft.id === selectedFeedType)?.name || ''

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={`${isMobileView ? 'max-w-full mx-4 my-4 h-[95vh] overflow-y-auto' : 'max-w-4xl max-h-[90vh] overflow-y-auto'}`}
    >
      <div className={`${isMobileView ? 'p-4' : 'p-6'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`${isMobileView ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 flex items-center space-x-2`}>
              <Wheat className={`${isMobileView ? 'w-6 h-6' : 'w-8 h-8'} text-green-600`} />
              <span>Record Feed Consumption</span>
            </h2>
            <p className={`text-gray-600 mt-1 ${isMobileView ? 'text-sm' : ''}`}>
              Track individual or batch feeding for your animals
            </p>
          </div>
          <Button variant="ghost" onClick={onClose} size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feeding Mode Selection */}
          <Card>
            <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
              <CardTitle className={`${isMobileView ? 'text-lg' : ''}`}>Feeding Mode</CardTitle>
              <CardDescription className={`${isMobileView ? 'text-sm' : ''}`}>
                Choose how you want to record feeding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={feedingMode} onValueChange={(value) => setFeedingMode(value as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="individual" className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Individual</span>
                  </TabsTrigger>
                  <TabsTrigger value="batch" className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Batch</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Individual Feeding */}
          {feedingMode === 'individual' && (
            <div className="space-y-6">
              {/* Feed Selection */}
              <Card>
                <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                  <CardTitle className={`${isMobileView ? 'text-lg' : ''}`}>Feed Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                    <div>
                      <Label htmlFor="feedType">Feed Type *</Label>
                      <Select value={selectedFeedType} onValueChange={setSelectedFeedType}>
                        <SelectTrigger className={errors.feedType ? 'border-red-300' : ''}>
                          <SelectValue placeholder="Select feed type" />
                        </SelectTrigger>
                        <SelectContent>
                          {feedTypes.map(feedType => (
                            <SelectItem key={feedType.id} value={feedType.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{feedType.name}</span>
                                {feedType.currentStock && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {feedType.currentStock.toFixed(1)}kg available
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.feedType && <p className="text-sm text-red-600 mt-1">{errors.feedType}</p>}
                    </div>

                    <div>
                      <Label htmlFor="quantity">Quantity (kg) *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.1"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Enter quantity in kg"
                        className={errors.quantity ? 'border-red-300' : ''}
                      />
                      {errors.quantity && <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="feedingTime">Feeding Time</Label>
                    <Input
                      id="feedingTime"
                      type="time"
                      value={feedingTime}
                      onChange={(e) => setFeedingTime(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Animal Selection */}
              <Card>
                <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                  <CardTitle className={`${isMobileView ? 'text-lg' : ''}`}>Select Animals</CardTitle>
                  <CardDescription className={`${isMobileView ? 'text-sm' : ''}`}>
                    Choose which animals received this feed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-3`}>
                    {animals.map(animal => (
                      <div
                        key={animal.id}
                        onClick={() => handleAnimalToggle(animal.id)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedAnimals.includes(animal.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-medium ${isMobileView ? 'text-sm' : ''}`}>
                              {animal.tag_number || animal.name}
                            </p>
                            <p className={`text-gray-500 ${isMobileView ? 'text-xs' : 'text-sm'}`}>
                              {animal.breed} • {animal.category}
                            </p>
                          </div>
                          {selectedAnimals.includes(animal.id) && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {animals.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <User className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                      <p className={isMobileView ? 'text-sm' : ''}>No animals found</p>
                    </div>
                  )}
                  
                  {errors.animals && <p className="text-sm text-red-600 mt-2">{errors.animals}</p>}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Batch Feeding */}
          {feedingMode === 'batch' && (
            <div className="space-y-6">
              {/* Add Entry Form */}
              <Card>
                <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                  <CardTitle className={`${isMobileView ? 'text-lg' : ''}`}>Add Feeding Entry</CardTitle>
                  <CardDescription className={`${isMobileView ? 'text-sm' : ''}`}>
                    Add multiple feeding entries for different feed types or animal groups
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                    <div>
                      <Label htmlFor="batchFeedType">Feed Type</Label>
                      <Select value={selectedFeedType} onValueChange={setSelectedFeedType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select feed type" />
                        </SelectTrigger>
                        <SelectContent>
                          {feedTypes.map(feedType => (
                            <SelectItem key={feedType.id} value={feedType.id}>
                              {feedType.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="batchQuantity">Quantity (kg)</Label>
                      <Input
                        id="batchQuantity"
                        type="number"
                        step="0.1"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Enter quantity"
                      />
                    </div>
                  </div>

                  {/* Animal Selection for Batch */}
                  <div>
                    <Label>Select Animals</Label>
                    <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-2 mt-2 max-h-40 overflow-y-auto border rounded-lg p-3`}>
                      {animals.map(animal => (
                        <div
                          key={animal.id}
                          onClick={() => handleAnimalToggle(animal.id)}
                          className={`p-2 border rounded cursor-pointer text-sm ${
                            selectedAnimals.includes(animal.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {animal.tag_number || animal.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="batchNotes">Notes (Optional)</Label>
                    <Textarea
                      id="batchNotes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any notes about this feeding..."
                      rows={2}
                    />
                  </div>

                  <Button 
                    type="button" 
                    onClick={addBatchEntry}
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Entry
                  </Button>

                  {errors.batch && <p className="text-sm text-red-600">{errors.batch}</p>}
                </CardContent>
              </Card>

              {/* Batch Entries List */}
              {multipleEntries.length > 0 && (
                <Card>
                  <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                    <CardTitle className={`${isMobileView ? 'text-lg' : ''}`}>Feeding Entries</CardTitle>
                    <CardDescription className={`${isMobileView ? 'text-sm' : ''}`}>
                      Review your batch feeding entries
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {multipleEntries.map((entry, index) => {
                        const feedTypeName = feedTypes.find(ft => ft.id === entry.feedTypeId)?.name
                        return (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{feedTypeName}</Badge>
                                <span className="font-medium">{entry.quantityKg}kg</span>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-500">{entry.animalIds.length} animals</span>
                              </div>
                              {entry.notes && (
                                <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBatchEntry(index)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {errors.entries && <p className="text-sm text-red-600">{errors.entries}</p>}
            </div>
          )}

          {/* Notes (Individual mode only) */}
          {feedingMode === 'individual' && (
            <Card>
              <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                <CardTitle className={`${isMobileView ? 'text-lg' : ''}`}>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about this feeding session..."
                  rows={3}
                />
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {(feedingMode === 'individual' && selectedFeedType && quantity) || 
           (feedingMode === 'batch' && multipleEntries.length > 0) ? (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className={`${isMobileView ? 'pb-3' : ''}`}>
                <CardTitle className={`${isMobileView ? 'text-lg' : ''} text-green-800 flex items-center space-x-2`}>
                  <Calculator className="w-5 h-5" />
                  <span>Feeding Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid ${isMobileView ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {getTotalQuantity().toFixed(1)}kg
                    </div>
                    <div className="text-sm text-green-700">Total Feed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {getTotalAnimals()}
                    </div>
                    <div className="text-sm text-green-700">Animals</div>
                  </div>
                  {!isMobileView && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {feedingTime}
                      </div>
                      <div className="text-sm text-green-700">Feeding Time</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Error Alert */}
          {errors.submit && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                {errors.submit}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Buttons */}
          <div className={`flex ${isMobileView ? 'flex-col space-y-3' : 'flex-row space-x-4'} pt-4`}>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`${isMobileView ? 'w-full' : 'flex-1'} h-12`}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Recording...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Record Feeding</span>
                </div>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className={`${isMobileView ? 'w-full' : ''} h-12`}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}