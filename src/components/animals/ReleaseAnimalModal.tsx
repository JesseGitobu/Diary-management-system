'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AlertTriangle, DollarSign, Heart, Truck, X } from 'lucide-react'

const releaseAnimalSchema = z.object({
  release_reason: z.enum(['sold', 'died', 'transferred', 'culled', 'other']),
  release_date: z.string().min(1, 'Release date is required'),
  sale_price: z.number().optional(),
  buyer_info: z.string().optional(),
  death_cause: z.string().optional(),
  transfer_location: z.string().optional(),
  notes: z.string().min(1, 'Additional notes are required for record keeping'),
})

type ReleaseAnimalFormData = z.infer<typeof releaseAnimalSchema>

interface ReleaseAnimalModalProps {
  animal: any
  isOpen: boolean
  onClose: () => void
  onAnimalReleased: () => void
}

export function ReleaseAnimalModal({ 
  animal, 
  isOpen, 
  onClose, 
  onAnimalReleased 
}: ReleaseAnimalModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  
  const form = useForm<ReleaseAnimalFormData>({
    resolver: zodResolver(releaseAnimalSchema),
    defaultValues: {
      release_date: new Date().toISOString().split('T')[0],
    },
  })
  
  const releaseReason = form.watch('release_reason')
  
  const handleSubmit = async (data: ReleaseAnimalFormData) => {
    if (!confirmDelete) {
      setError('Please confirm that you want to release this animal')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/animals/${animal.id}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to release animal')
      }
      
      onAnimalReleased()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const getReleaseIcon = (reason: string) => {
    switch (reason) {
      case 'sold': return <DollarSign className="w-5 h-5 text-green-600" />
      case 'died': return <Heart className="w-5 h-5 text-red-600" />
      case 'transferred': return <Truck className="w-5 h-5 text-blue-600" />
      default: return <AlertTriangle className="w-5 h-5 text-yellow-600" />
    }
  }
  
  const getReleaseDescription = (reason: string) => {
    switch (reason) {
      case 'sold': return 'Animal was sold to another farm or buyer'
      case 'died': return 'Animal died due to illness, accident, or natural causes'
      case 'transferred': return 'Animal was moved to another location or farm'
      case 'culled': return 'Animal was culled due to poor performance or health'
      case 'other': return 'Other reason for removing animal from herd'
      default: return ''
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Release Animal</h2>
              <p className="text-gray-600">
                Remove {animal.name || animal.tag_number} from active herd
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Important: Record Keeping
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                This action will remove the animal from your active herd but maintain all historical records for auditing and compliance purposes.
              </p>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Release Reason Selection */}
          <div>
            <Label htmlFor="release_reason">Reason for Release *</Label>
            <Select
              value={form.watch('release_reason')}
              onValueChange={(value) => form.setValue('release_reason', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sold">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span>Sold</span>
                  </div>
                </SelectItem>
                <SelectItem value="died">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-red-600" />
                    <span>Died</span>
                  </div>
                </SelectItem>
                <SelectItem value="transferred">
                  <div className="flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>Transferred</span>
                  </div>
                </SelectItem>
                <SelectItem value="culled">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span>Culled</span>
                  </div>
                </SelectItem>
                <SelectItem value="other">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-gray-600" />
                    <span>Other</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.release_reason && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.release_reason.message}
              </p>
            )}
            
            {releaseReason && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2">
                  {getReleaseIcon(releaseReason)}
                  <span className="text-sm text-gray-700">
                    {getReleaseDescription(releaseReason)}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Release Date */}
          <div>
            <Label htmlFor="release_date">Release Date *</Label>
            <Input
              id="release_date"
              type="date"
              {...form.register('release_date')}
              error={form.formState.errors.release_date?.message}
            />
          </div>
          
          {/* Conditional Fields Based on Release Reason */}
          {releaseReason === 'sold' && (
            <div className="border-l-4 border-green-500 pl-4 space-y-4">
              <h4 className="font-medium text-green-900">Sale Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sale_price">Sale Price</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    step="0.01"
                    {...form.register('sale_price', { valueAsNumber: true })}
                    placeholder="e.g., 1500.00"
                  />
                </div>
                <div>
                  <Label htmlFor="buyer_info">Buyer Information</Label>
                  <Input
                    id="buyer_info"
                    {...form.register('buyer_info')}
                    placeholder="Buyer name or farm"
                  />
                </div>
              </div>
            </div>
          )}
          
          {releaseReason === 'died' && (
            <div className="border-l-4 border-red-500 pl-4 space-y-4">
              <h4 className="font-medium text-red-900">Death Information</h4>
              <div>
                <Label htmlFor="death_cause">Cause of Death</Label>
                <Input
                  id="death_cause"
                  {...form.register('death_cause')}
                  placeholder="e.g., Illness, accident, natural causes"
                />
              </div>
            </div>
          )}
          
          {releaseReason === 'transferred' && (
            <div className="border-l-4 border-blue-500 pl-4 space-y-4">
              <h4 className="font-medium text-blue-900">Transfer Information</h4>
              <div>
                <Label htmlFor="transfer_location">Transfer Location</Label>
                <Input
                  id="transfer_location"
                  {...form.register('transfer_location')}
                  placeholder="e.g., Another farm, facility name"
                />
              </div>
            </div>
          )}
          
          {releaseReason === 'culled' && (
            <div className="border-l-4 border-orange-500 pl-4 space-y-4">
              <h4 className="font-medium text-orange-900">Culling Information</h4>
              <div>
                <Label htmlFor="notes">Reason for Culling</Label>
                <Input
                  {...form.register('notes')}
                  placeholder="e.g., Poor production, health issues, age"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Specify the primary reason for culling this animal
                </p>
              </div>
            </div>
          )}
          
          {/* Additional Notes (only if not culling, as culling uses notes field above) */}
          {releaseReason !== 'culled' && (
            <div>
              <Label htmlFor="notes">Additional Notes *</Label>
              <textarea
                id="notes"
                {...form.register('notes')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                placeholder="Detailed explanation for record keeping purposes..."
              />
              {form.formState.errors.notes && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.notes.message}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Required for audit trail and compliance purposes
              </p>
            </div>
          )}
          
          {/* Animal Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h4 className="font-medium text-gray-900 mb-3">Animal Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Tag Number:</span>
                <span className="ml-2 font-medium">{animal.tag_number}</span>
              </div>
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{animal.name || 'Not set'}</span>
              </div>
              <div>
                <span className="text-gray-600">Breed:</span>
                <span className="ml-2 font-medium">{animal.breed || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-gray-600">Gender:</span>
                <span className="ml-2 font-medium capitalize">{animal.gender}</span>
              </div>
              {animal.birth_date && (
                <div>
                  <span className="text-gray-600">Birth Date:</span>
                  <span className="ml-2 font-medium">
                    {new Date(animal.birth_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {animal.weight && (
                <div>
                  <span className="text-gray-600">Weight:</span>
                  <span className="ml-2 font-medium">{animal.weight} kg</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Confirmation Checkbox */}
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="confirmDelete"
                checked={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.checked)}
                className="mt-1 mr-3"
              />
              <div>
                <label htmlFor="confirmDelete" className="text-sm font-medium text-red-800">
                  I confirm that I want to release this animal from the active herd
                </label>
                <p className="text-sm text-red-700 mt-1">
                  This will remove <strong>{animal.name || animal.tag_number}</strong> from your active animal list. 
                  All historical records will be preserved for compliance and auditing.
                </p>
              </div>
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
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
              variant="destructive"
              disabled={loading || !confirmDelete}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Releasing...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Release Animal
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}