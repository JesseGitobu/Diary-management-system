'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { X, CheckCircle, AlertCircle } from 'lucide-react'

interface PaymentConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  recordId: string
  channelName: string
  totalAmount: number
  paymentMethod: string
  onConfirm: (data: PaymentConfirmationData) => Promise<void>
  isMobile: boolean
}

export interface PaymentConfirmationData {
  paymentMethod: string
  paymentReference: string
  amountPaid: number
  actualPaymentDate: string
  notes: string
}

export function PaymentConfirmationModal({
  isOpen,
  onClose,
  recordId,
  channelName,
  totalAmount,
  paymentMethod: initialPaymentMethod,
  onConfirm,
  isMobile
}: PaymentConfirmationModalProps) {
  const [formData, setFormData] = useState<PaymentConfirmationData>({
    paymentMethod: initialPaymentMethod || 'mpesa',
    paymentReference: '',
    amountPaid: totalAmount,
    actualPaymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: '💵' },
    { value: 'mpesa', label: 'M-Pesa', icon: '📱' },
    { value: 'bank', label: 'Bank Transfer', icon: '🏦' },
    { value: 'credit', label: 'Credit (Pay Later)', icon: '📋' }
  ]

  const handleChange = (field: keyof PaymentConfirmationData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Please select a payment method'
    }

    if (!formData.paymentReference.trim()) {
      newErrors.paymentReference = 'Payment reference is required'
    }

    if (!formData.amountPaid || parseFloat(formData.amountPaid.toString()) <= 0) {
      newErrors.amountPaid = 'Amount must be greater than 0'
    }

    if (!formData.actualPaymentDate) {
      newErrors.actualPaymentDate = 'Payment date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await onConfirm(formData)
      setFormData({
        paymentMethod: initialPaymentMethod || 'mpesa',
        paymentReference: '',
        amountPaid: totalAmount,
        actualPaymentDate: new Date().toISOString().split('T')[0],
        notes: ''
      })
      onClose()
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to confirm payment'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const selectedPaymentMethod = paymentMethods.find(m => m.value === formData.paymentMethod)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className={`w-full ${isMobile ? 'max-w-md' : 'max-w-lg'}`}>
        <CardHeader className="flex items-center justify-between pb-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            <CardTitle>Confirm Payment</CardTitle>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Channel Information */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Channel</p>
                <p className="font-semibold text-gray-900">{channelName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-lg font-bold text-blue-600">KSh {totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method *
            </label>
            <Select value={formData.paymentMethod} onValueChange={(value) => handleChange('paymentMethod', value)}>
              <SelectTrigger className={errors.paymentMethod ? 'border-red-300' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map(method => (
                  <SelectItem key={method.value} value={method.value}>
                    <span className="flex items-center space-x-2">
                      <span>{method.icon}</span>
                      <span>{method.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <p className="text-sm text-red-600 mt-1">{errors.paymentMethod}</p>
            )}
          </div>

          {/* Payment Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Reference *
            </label>
            <Input
              type="text"
              placeholder={selectedPaymentMethod?.value === 'mpesa' ? 'e.g., MJA1234567890' : 'e.g., CHQ123456 or Bank Ref'}
              value={formData.paymentReference}
              onChange={(e) => handleChange('paymentReference', e.target.value)}
              className={errors.paymentReference ? 'border-red-300' : ''}
            />
            {errors.paymentReference && (
              <p className="text-sm text-red-600 mt-1">{errors.paymentReference}</p>
            )}
          </div>

          {/* Amount Paid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Paid (KSh) *
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.amountPaid}
              onChange={(e) => handleChange('amountPaid', parseFloat(e.target.value))}
              className={errors.amountPaid ? 'border-red-300' : ''}
            />
            {errors.amountPaid && (
              <p className="text-sm text-red-600 mt-1">{errors.amountPaid}</p>
            )}
            {parseFloat(formData.amountPaid.toString()) < totalAmount && (
              <p className="text-sm text-amber-600 mt-1">
                Partial payment: {(totalAmount - parseFloat(formData.amountPaid.toString())).toFixed(2)} KSh remaining
              </p>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Date *
            </label>
            <Input
              type="date"
              value={formData.actualPaymentDate}
              onChange={(e) => handleChange('actualPaymentDate', e.target.value)}
              className={errors.actualPaymentDate ? 'border-red-300' : ''}
            />
            {errors.actualPaymentDate && (
              <p className="text-sm text-red-600 mt-1">{errors.actualPaymentDate}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              placeholder="Any additional details about this payment..."
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error Alert */}
          {errors.submit && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'space-x-3'} pt-4`}>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`${isMobile ? 'w-full' : 'flex-1'} bg-emerald-600 hover:bg-emerald-700 text-white`}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Confirming...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Payment</span>
                </div>
              )}
            </Button>
            <Button
              onClick={onClose}
              disabled={isSubmitting}
              variant="outline"
              className={isMobile ? 'w-full' : ''}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
