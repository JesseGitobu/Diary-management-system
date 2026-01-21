'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  User, 
  Receipt,
  Filter,
  Edit,
  Trash2
} from 'lucide-react'

interface TransactionsListProps {
  farmId: string
  refreshKey: number
  limit?: number
  showFilters?: boolean
  showActions?: boolean
}

export function TransactionsList({ 
  farmId, 
  refreshKey, 
  limit = 20, 
  showFilters = true,
  showActions = false
}: TransactionsListProps) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    type: 'all',
    startDate: '',
    endDate: '',
    category: 'all'
  })
  
  useEffect(() => {
    fetchTransactions()
  }, [farmId, refreshKey, filters])
  
  const fetchTransactions = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams({
        farmId,
        limit: limit.toString(),
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.category !== 'all' && { category: filters.category }),
      })
      
      const response = await fetch(`/api/financial/transactions?${queryParams}`)
      const result = await response.json()
      
      if (response.ok) {
        setTransactions(result.data || [])
      } else {
        throw new Error(result.error || 'Failed to fetch transactions')
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }
  
  const getCategoryDisplay = (transaction: any) => {
    if (transaction.transaction_type === 'income') {
      return transaction.income_category?.replace('_', ' ') || 'Income'
    }
    return transaction.expense_category?.replace('_', ' ') || 'Expense'
  }
  
  const getCustomerVendor = (transaction: any) => {
    return transaction.customer_name || transaction.vendor_name || 'N/A'
  }
  
  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/financial/transactions/${transactionId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setTransactions(prev => prev.filter((t: any) => t.id !== transactionId))
      } else {
        const result = await response.json()
        alert(result.error || 'Failed to delete transaction')
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      alert('Failed to delete transaction')
    }
  }
  
  const clearFilters = () => {
    setFilters({ 
      type: 'all', 
      startDate: '', 
      endDate: '', 
      category: 'all' 
    })
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-red-600 mb-4">
            <Receipt className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Transactions</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchTransactions} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  <option value="milk_sales">Milk Sales</option>
                  <option value="animal_sales">Animal Sales</option>
                  <option value="feed">Feed</option>
                  <option value="veterinary">Veterinary</option>
                  <option value="equipment">Equipment</option>
                  <option value="labor">Labor</option>
                  <option value="utilities">Utilities</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Summary Stats */}
      {transactions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    transactions
                      .filter((t: any) => t.transaction_type === 'income')
                      .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
                  )}
                </div>
                <p className="text-sm text-gray-600">Total Income</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(
                    transactions
                      .filter((t: any) => t.transaction_type === 'expense')
                      .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
                  )}
                </div>
                <p className="text-sm text-gray-600">Total Expenses</p>
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  transactions.reduce((sum: number, t: any) => 
                    sum + Number(t.amount) * (t.transaction_type === 'income' ? 1 : -1), 0
                  ) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(
                    transactions.reduce((sum: number, t: any) => 
                      sum + Number(t.amount) * (t.transaction_type === 'income' ? 1 : -1), 0
                    )
                  )}
                </div>
                <p className="text-sm text-gray-600">Net Amount</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Transactions List */}
      <div className="space-y-2">
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {Object.values(filters).some(v => v !== 'all' && v !== '') 
                  ? 'Try adjusting your filters or add your first transaction.'
                  : 'Get started by adding your first financial transaction.'
                }
              </p>
              {Object.values(filters).some(v => v !== 'all' && v !== '') && (
                <Button 
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          transactions.map((transaction: any) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      transaction.transaction_type === 'income' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {transaction.transaction_type === 'income' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {transaction.description}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(transaction.transaction_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{getCustomerVendor(transaction)}</span>
                        </div>
                        {transaction.payment_method && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.payment_method.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        transaction.transaction_type === 'income' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getCategoryDisplay(transaction)}
                      </Badge>
                    </div>
                    
                    {showActions && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Handle edit - you can implement this
                            console.log('Edit transaction:', transaction.id)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                {transaction.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600">{transaction.notes}</p>
                  </div>
                )}
                
                {transaction.animals && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span>Related to:</span>
                      <Badge variant="outline">
                        {transaction.animals.name || `Animal ${transaction.animals.tag_number}`}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {(transaction.invoice_number || transaction.receipt_number) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Receipt className="w-3 h-3" />
                      <span>
                        {transaction.invoice_number ? `Invoice: ${transaction.invoice_number}` : ''}
                        {transaction.receipt_number ? `Receipt: ${transaction.receipt_number}` : ''}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Load More Button */}
      {transactions.length === limit && (
        <Card>
          <CardContent className="p-4 text-center">
            <Button
              variant="outline"
              onClick={() => {
                // Implement load more functionality
                console.log('Load more transactions')
              }}
            >
              Load More Transactions
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}