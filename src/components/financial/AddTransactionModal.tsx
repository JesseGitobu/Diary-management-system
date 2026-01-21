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

const transactionSchema = z.object({
  transaction_type: z.enum(['income', 'expense']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  transaction_date: z.string().min(1, 'Date is required'),
  payment_method: z.enum(['cash', 'check', 'bank_transfer', 'credit_card', 'debit_card']).optional(),
  
  // Income fields
  income_category: z.enum(['milk_sales', 'animal_sales', 'breeding_fees', 'insurance_claims', 'grants', 'other_income']).optional(),
  customer_name: z.string().optional(),
  invoice_number: z.string().optional(),
  
  // Expense fields
  expense_category: z.enum(['feed', 'veterinary', 'labor', 'equipment', 'utilities', 'maintenance', 'insurance', 'breeding', 'supplies', 'transportation', 'other_expense']).optional(),
  vendor_name: z.string().optional(),
  receipt_number: z.string().optional(),
  
  notes: z.string().optional(),
}).refine((data) => {
  // Validate that income transactions have income_category
  if (data.transaction_type === 'income' && !data.income_category) {
    return false
  }
  // Validate that expense transactions have expense_category
  if (data.transaction_type === 'expense' && !data.expense_category) {
    return false
  }
  return true
}, {
  message: "Please select a category for the transaction",
  path: ["income_category", "expense_category"]
})

type TransactionFormData = z.infer<typeof transactionSchema>

interface AddTransactionModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onTransactionAdded: (transaction: any) => void
}

export function AddTransactionModal({ farmId, isOpen, onClose, onTransactionAdded }: AddTransactionModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transaction_type: 'expense',
      amount: 0,
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
    },
  })
  
  const transactionType = form.watch('transaction_type')
  
  const handleSubmit = async (data: TransactionFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('Submitting transaction data:', { farmId, ...data })
      
      const response = await fetch('/api/financial/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmId,
          ...data,
        }),
      })
      
      const result = await response.json()
      console.log('API Response:', result)
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add transaction')
      }
      
      // Success!
      onTransactionAdded(result.data)
      form.reset()
      onClose()
      
    } catch (err) {
      console.error('Error adding transaction:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Add Financial Transaction
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Transaction Type */}
          <div>
            <Label>Transaction Type</Label>
            <div className="mt-2 flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="income"
                  {...form.register('transaction_type')}
                  className="mr-2"
                />
                Income
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="expense"
                  {...form.register('transaction_type')}
                  className="mr-2"
                />
                Expense
              </label>
            </div>
          </div>
          
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...form.register('amount', { valueAsNumber: true })}
                error={form.formState.errors.amount?.message}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <Label htmlFor="transaction_date">Date</Label>
              <Input
                id="transaction_date"
                type="date"
                {...form.register('transaction_date')}
                error={form.formState.errors.transaction_date?.message}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              {...form.register('description')}
              error={form.formState.errors.description?.message}
              placeholder="Brief description of the transaction"
            />
          </div>
          
          {/* Category Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transactionType === 'income' ? (
              <>
                <div>
                  <Label htmlFor="income_category">Income Category *</Label>
                  <select
                    id="income_category"
                    {...form.register('income_category')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    <option value="milk_sales">Milk Sales</option>
                    <option value="animal_sales">Animal Sales</option>
                    <option value="breeding_fees">Breeding Fees</option>
                    <option value="insurance_claims">Insurance Claims</option>
                    <option value="grants">Grants</option>
                    <option value="other_income">Other Income</option>
                  </select>
                  {form.formState.errors.income_category && (
                    <p className="text-sm text-red-600 mt-1">Income category is required</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    {...form.register('customer_name')}
                    placeholder="Customer or buyer name"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="expense_category">Expense Category *</Label>
                  <select
                    id="expense_category"
                    {...form.register('expense_category')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    <option value="feed">Feed</option>
                    <option value="veterinary">Veterinary</option>
                    <option value="labor">Labor</option>
                    <option value="equipment">Equipment</option>
                    <option value="utilities">Utilities</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="insurance">Insurance</option>
                    <option value="breeding">Breeding</option>
                    <option value="supplies">Supplies</option>
                    <option value="transportation">Transportation</option>
                    <option value="other_expense">Other Expense</option>
                  </select>
                  {form.formState.errors.expense_category && (
                    <p className="text-sm text-red-600 mt-1">Expense category is required</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="vendor_name">Vendor Name</Label>
                  <Input
                    id="vendor_name"
                    {...form.register('vendor_name')}
                    placeholder="Vendor or supplier name"
                  />
                </div>
              </>
            )}
          </div>
          
          {/* Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <select
                id="payment_method"
                {...form.register('payment_method')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="reference_number">
                {transactionType === 'income' ? 'Invoice Number' : 'Receipt Number'}
              </Label>
              <Input
                id="reference_number"
                {...form.register(transactionType === 'income' ? 'invoice_number' : 'receipt_number')}
                placeholder={transactionType === 'income' ? 'Invoice #' : 'Receipt #'}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Additional notes or details"
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
              disabled={loading}
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}