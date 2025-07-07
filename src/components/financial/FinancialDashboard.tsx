'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AddTransactionModal } from '@/components/financial/AddTransactionModal'
import { TransactionsList } from '@/components/financial/TransactionsList'
import { FinancialCharts } from '@/components/financial/FinancialCharts'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  PieChart,
  BarChart3,
  Calculator,
  Dog
} from 'lucide-react'

interface FinancialDashboardProps {
  currentUser: any
  userRole: any
  farmId: string
  financialSummary: any
  monthlyData: any[]
  costPerAnimal: any
  currentYear: number
}

export function FinancialDashboard({
  currentUser,
  userRole,
  farmId,
  financialSummary,
  monthlyData,
  costPerAnimal,
  currentYear
}: FinancialDashboardProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  const canManageFinances = ['farm_owner', 'farm_manager'].includes(userRole.role_type)
  
  const handleTransactionAdded = () => {
    setRefreshKey(prev => prev + 1)
    setShowAddModal(false)
    // In a real app, you'd refresh the data here
    window.location.reload()
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }
  
  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`
  }
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Management</h1>
          <p className="text-gray-600 mt-2">
            Track income, expenses, and farm profitability for {currentYear}
          </p>
        </div>
        {canManageFinances && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        )}
      </div>
      
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(financialSummary.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentYear} total revenue
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(financialSummary.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentYear} total costs
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(financialSummary.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Profit margin: {formatPercentage(financialSummary.profitMargin)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per Animal</CardTitle>
            <Dog className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(costPerAnimal.costPerAnimal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(costPerAnimal.costPerAnimalPerMonth)}/month per animal
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Monthly Trends</span>
            </CardTitle>
            <CardDescription>
              Income and expenses by month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FinancialCharts 
              monthlyData={monthlyData}
              type="monthly"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Expense Breakdown</span>
            </CardTitle>
            <CardDescription>
              Expenses by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FinancialCharts 
              data={financialSummary.expensesByCategory}
              type="expenses"
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Income and Expense Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Income by Category</CardTitle>
            <CardDescription>
              Revenue breakdown for {currentYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(financialSummary.incomeByCategory).map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm capitalize">
                      {category.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {formatCurrency(amount as number)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {((amount as number / financialSummary.totalIncome) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
              {Object.keys(financialSummary.incomeByCategory).length === 0 && (
                <p className="text-gray-500 text-sm">No income recorded yet</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Expenses by Category</CardTitle>
            <CardDescription>
              Cost breakdown for {currentYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(financialSummary.expensesByCategory).map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span className="text-sm capitalize">
                      {category.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {formatCurrency(amount as number)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {((amount as number / financialSummary.totalExpenses) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
              {Object.keys(financialSummary.expensesByCategory).length === 0 && (
                <p className="text-gray-500 text-sm">No expenses recorded yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Key Financial Metrics</span>
          </CardTitle>
          <CardDescription>
            Important financial indicators for your farm
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(financialSummary.totalIncome / 12)}
              </div>
              <p className="text-sm text-gray-600">Average Monthly Income</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(financialSummary.totalExpenses / 12)}
              </div>
              <p className="text-sm text-gray-600">Average Monthly Expenses</p>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(financialSummary.netProfit / 12)}
              </div>
              <p className="text-sm text-gray-600">Average Monthly Profit</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Latest financial activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionsList 
            farmId={farmId}
            refreshKey={refreshKey}
            limit={10}
          />
        </CardContent>
      </Card>
      
      {/* Add Transaction Modal */}
      {showAddModal && (
        <AddTransactionModal
          farmId={farmId}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onTransactionAdded={handleTransactionAdded}
        />
      )}
    </div>
  )
}