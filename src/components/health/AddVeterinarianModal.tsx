// src/components/health/AddVeterinarianModal.tsx

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
import { 
  X, 
  Stethoscope, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Star,
  Building,
  User,
  Calendar,
  AlertCircle,
  Shield
} from 'lucide-react'

const veterinarianSchema = z.object({
  name: z.string().min(2, 'Veterinarian name is required'),
  clinic_name: z.string().min(2, 'Clinic/practice name is required'),
  license_number: z.string().min(3, 'License number is required'),
  specialization: z.string().optional(),
  phone_primary: z.string().min(10, 'Primary phone number is required'),
  phone_emergency: z.string().optional(),
  email: z.string().email('Valid email address is required'),
  address_street: z.string().min(5, 'Street address is required'),
  address_city: z.string().min(2, 'City is required'),
  address_state: z.string().min(2, 'State/Province is required'),
  address_postal: z.string().min(3, 'Postal/ZIP code is required'),
  address_country: z.string().min(2, 'Country is required'),
  availability_hours: z.string().optional(),
  emergency_available: z.boolean(),
  travel_radius_km: z.number().min(0).optional(),
  service_types: z.array(z.string()).min(1, 'At least one service type is required'),
  rates_consultation: z.number().min(0).optional(),
  rates_emergency: z.number().min(0).optional(),
  preferred_payment: z.array(z.string()).optional(),
  notes: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  is_primary: z.boolean(),
  is_active: z.boolean(),
})

type VeterinarianFormData = z.infer<typeof veterinarianSchema>

interface AddVeterinarianModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onVeterinarianAdded: (veterinarian: any) => void
  existingVeterinarians?: any[]
}

const serviceTypes = [
  'General Practice',
  'Large Animal Specialist',
  'Dairy Specialist',
  'Reproduction Services',
  'Surgery',
  'Emergency Care',
  'Nutrition Consultation',
  'Herd Health Management',
  'Lameness Treatment',
  'Mastitis Treatment'
]

const paymentMethods = [
  'Cash',
  'Check',
  'Credit Card',
  'Bank Transfer',
  'Invoice/Net 30',
  'Farm Account'
]

export function AddVeterinarianModal({ 
  farmId, 
  isOpen, 
  onClose, 
  onVeterinarianAdded,
  existingVeterinarians = []
}: AddVeterinarianModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedServices, setSelectedServices] = useState<string[]>(['General Practice'])
  const [selectedPayments, setSelectedPayments] = useState<string[]>(['Cash'])
  
  const form = useForm<VeterinarianFormData>({
    resolver: zodResolver(veterinarianSchema),
    defaultValues: {
      emergency_available: false,
      is_primary: existingVeterinarians.length === 0, // First vet is primary by default
      is_active: true,
      service_types: ['General Practice'],
      preferred_payment: ['Cash'],
      rating: 5,
      address_country: 'United States',
    },
  })
  
  const watchedEmergencyAvailable = form.watch('emergency_available')
  const watchedIsPrimary = form.watch('is_primary')
   
  const handleSubmit = async (data: VeterinarianFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/health/veterinarians', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
          service_types: selectedServices,
          preferred_payment: selectedPayments,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add veterinarian')
      }
      
      onVeterinarianAdded(result.veterinarian)
      form.reset()
      setSelectedServices(['General Practice'])
      setSelectedPayments(['Cash'])
      onClose()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  const toggleService = (service: string) => {
    setSelectedServices(prev => {
      const updated = prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
      form.setValue('service_types', updated)
      return updated
    })
  }
  
  const togglePayment = (payment: string) => {
    setSelectedPayments(prev => {
      const updated = prev.includes(payment) 
        ? prev.filter(p => p !== payment)
        : [...prev, payment]
      form.setValue('preferred_payment', updated)
      return updated
    })
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Stethoscope className="w-6 h-6 text-blue-600" />
            <span>Add Veterinarian</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-4 flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Basic Information</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Veterinarian Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  error={form.formState.errors.name?.message}
                  placeholder="Dr. Sarah Johnson"
                />
              </div>
              
              <div>
                <Label htmlFor="clinic_name">Clinic/Practice Name *</Label>
                <Input
                  id="clinic_name"
                  {...form.register('clinic_name')}
                  error={form.formState.errors.clinic_name?.message}
                  placeholder="Valley Veterinary Clinic"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="license_number">License Number *</Label>
                <Input
                  id="license_number"
                  {...form.register('license_number')}
                  error={form.formState.errors.license_number?.message}
                  placeholder="VET-2024-001234"
                />
              </div>
              
              <div>
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  {...form.register('specialization')}
                  placeholder="Large Animal Medicine, Dairy Health"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="rating">Your Rating (1-5 stars)</Label>
              <div className="flex items-center space-x-2 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => form.setValue('rating', star)}
                    className="focus:outline-none"
                  >
                    <Star 
                      className={`w-6 h-6 ${
                        (form.watch('rating') ?? 0) >= star 
                          ? 'text-yellow-400 fill-current' 
                          : 'text-gray-300'
                      }`} 
                    />
                  </button>
                ))}
                <span className="text-sm text-gray-600 ml-2">
                  {form.watch('rating')} star{form.watch('rating') !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-900 mb-4 flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <span>Contact Information</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone_primary">Primary Phone *</Label>
                <Input
                  id="phone_primary"
                  {...form.register('phone_primary')}
                  error={form.formState.errors.phone_primary?.message}
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div>
                <Label htmlFor="phone_emergency">Emergency Phone</Label>
                <Input
                  id="phone_emergency"
                  {...form.register('phone_emergency')}
                  placeholder="(555) 987-6543"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                error={form.formState.errors.email?.message}
                placeholder="dr.johnson@valleyvet.com"
              />
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-medium text-purple-900 mb-4 flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Address Information</span>
            </h4>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="address_street">Street Address *</Label>
                <Input
                  id="address_street"
                  {...form.register('address_street')}
                  error={form.formState.errors.address_street?.message}
                  placeholder="123 Main Street"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address_city">City *</Label>
                  <Input
                    id="address_city"
                    {...form.register('address_city')}
                    error={form.formState.errors.address_city?.message}
                    placeholder="Springfield"
                  />
                </div>
                
                <div>
                  <Label htmlFor="address_state">State/Province *</Label>
                  <Input
                    id="address_state"
                    {...form.register('address_state')}
                    error={form.formState.errors.address_state?.message}
                    placeholder="California"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address_postal">Postal/ZIP Code *</Label>
                  <Input
                    id="address_postal"
                    {...form.register('address_postal')}
                    error={form.formState.errors.address_postal?.message}
                    placeholder="12345"
                  />
                </div>
                
                <div>
                  <Label htmlFor="address_country">Country *</Label>
                  <Input
                    id="address_country"
                    {...form.register('address_country')}
                    error={form.formState.errors.address_country?.message}
                    placeholder="United States"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Service Information */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-4 flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Services & Availability</span>
            </h4>
            
            <div className="space-y-4">
              <div>
                <Label>Services Offered *</Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {serviceTypes.map(service => (
                    <label
                      key={service}
                      className="flex items-center space-x-2 p-2 hover:bg-yellow-100 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service)}
                        onChange={() => toggleService(service)}
                        className="text-yellow-600 focus:ring-yellow-500"
                      />
                      <span className="text-sm">{service}</span>
                    </label>
                  ))}
                </div>
                {form.formState.errors.service_types && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.service_types.message}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="availability_hours">Availability Hours</Label>
                  <Input
                    id="availability_hours"
                    {...form.register('availability_hours')}
                    placeholder="Mon-Fri 8AM-6PM, Sat 8AM-2PM"
                  />
                </div>
                
                <div>
                  <Label htmlFor="travel_radius_km">Travel Radius (km)</Label>
                  <Input
                    id="travel_radius_km"
                    type="number"
                    min="0"
                    {...form.register('travel_radius_km', { valueAsNumber: true })}
                    placeholder="50"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="emergency_available"
                  {...form.register('emergency_available')}
                  className="text-yellow-600 focus:ring-yellow-500"
                />
                <Label htmlFor="emergency_available" className="cursor-pointer">
                  Available for emergency calls
                </Label>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <h4 className="font-medium text-indigo-900 mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Rates & Payment</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rates_consultation">Consultation Rate ($)</Label>
                <Input
                  id="rates_consultation"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register('rates_consultation', { valueAsNumber: true })}
                  placeholder="150.00"
                />
              </div>
              
              <div>
                <Label htmlFor="rates_emergency">Emergency Rate ($)</Label>
                <Input
                  id="rates_emergency"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register('rates_emergency', { valueAsNumber: true })}
                  placeholder="250.00"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <Label>Accepted Payment Methods</Label>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                {paymentMethods.map(payment => (
                  <label
                    key={payment}
                    className="flex items-center space-x-2 p-2 hover:bg-indigo-100 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPayments.includes(payment)}
                      onChange={() => togglePayment(payment)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm">{payment}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Preferences & Notes */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Preferences & Notes</span>
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_primary"
                    {...form.register('is_primary')}
                    className="text-gray-600 focus:ring-gray-500"
                  />
                  <Label htmlFor="is_primary" className="cursor-pointer">
                    Set as primary veterinarian
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    {...form.register('is_active')}
                    className="text-gray-600 focus:ring-gray-500"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Currently active
                  </Label>
                </div>
              </div>
              
              {watchedIsPrimary && existingVeterinarians.length > 0 && (
                <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Setting this as primary will change your current primary veterinarian.
                  </p>
                </div>
              )}
              
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <textarea
                  id="notes"
                  {...form.register('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  placeholder="Special instructions, preferences, or additional information about this veterinarian..."
                />
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Adding Veterinarian...</span>
                </>
              ) : (
                <>
                  <Stethoscope className="w-4 h-4 mr-2" />
                  Add Veterinarian
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}