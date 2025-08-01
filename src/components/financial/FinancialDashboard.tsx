'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AddTransactionModal } from '@/components/financial/AddTransactionModal'
import { TransactionsList } from '@/components/financial/TransactionsList'
import { FinancialCharts } from '@/components/financial/FinancialCharts'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  PieChart,
  BarChart3,
  Calculator,
  Dog,
  ArrowRight
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
  const { isMobile, isTablet } = useDeviceInfo()
  
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

  // Stats data for horizontal scrolling
  const statsData = [
    {
      title: "Total Income",
      value: formatCurrency(financialSummary.totalIncome),
      subtitle: `${currentYear} total revenue`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      title: "Total Expenses", 
      value: formatCurrency(financialSummary.totalExpenses),
      subtitle: `${currentYear} total costs`,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50",
      iconColor: "text-red-600"
    },
    {
      title: "Net Profit",
      value: formatCurrency(financialSummary.netProfit),
      subtitle: `Profit margin: ${formatPercentage(financialSummary.profitMargin)}`,
      icon: DollarSign,
      color: financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: financialSummary.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50',
      iconColor: "text-blue-600"
    },
    {
      title: "Cost per Animal",
      value: formatCurrency(costPerAnimal.costPerAnimal),
      subtitle: `${formatCurrency(costPerAnimal.costPerAnimalPerMonth)}/month per animal`,
      icon: Dog,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600"
    }
  ]
  
  return (
    <div className="space-y-6 pb-6">
      {/* Mobile Header */}
      <div className="px-4 sm:px-0">
        <div className={`${isMobile ? 'space-y-4' : 'flex items-center justify-between'}`}>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900`}>
              Financial Management
            </h1>
            <p className={`text-gray-600 mt-2 ${isMobile ? 'text-sm' : ''}`}>
              Track income, expenses, and farm profitability for {currentYear}
            </p>
          </div>
          {canManageFinances && (
            <Button 
              onClick={() => setShowAddModal(true)}
              className={`${isMobile ? 'w-full' : ''}`}
              size={isMobile ? 'lg' : 'default'}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          )}
        </div>
      </div>
      
      {/* Horizontally Scrollable Financial Summary Cards */}
      <div className="px-4 sm:px-0">
        {isMobile || isTablet ? (
          // Mobile: Horizontal scroll
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            {statsData.map((stat, index) => (
              <Card key={index} className="flex-shrink-0 w-72">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium truncate pr-2">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold ${stat.color} mb-1`}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stat.subtitle}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Desktop: Grid layout
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {statsData.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stat.subtitle}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Charts and Analytics - Mobile Optimized */}
      <div className="px-4 sm:px-0">
        <div className={`${isMobile ? 'space-y-6' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}`}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span className={isMobile ? 'text-base' : ''}>Monthly Trends</span>
              </CardTitle>
              <CardDescription className={isMobile ? 'text-sm' : ''}>
                Income and expenses by month
              </CardDescription>
            </CardHeader>
            <CardContent className={isMobile ? 'px-2' : ''}>
              <div className={isMobile ? 'overflow-x-auto' : ''}>
                <FinancialCharts 
                  monthlyData={monthlyData}
                  type="monthly"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5" />
                <span className={isMobile ? 'text-base' : ''}>Expense Breakdown</span>
              </CardTitle>
              <CardDescription className={isMobile ? 'text-sm' : ''}>
                Expenses by category
              </CardDescription>
            </CardHeader>
            <CardContent className={isMobile ? 'px-2' : ''}>
              <FinancialCharts 
                data={financialSummary.expensesByCategory}
                type="expenses"
              />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Income and Expense Categories - Mobile Optimized */}
      <div className="px-4 sm:px-0">
        <div className={`${isMobile ? 'space-y-6' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}`}>
          <Card>
            <CardHeader>
              <CardTitle className={`text-green-600 ${isMobile ? 'text-base' : ''}`}>
                Income by Category
              </CardTitle>
              <CardDescription className={isMobile ? 'text-sm' : ''}>
                Revenue breakdown for {currentYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(financialSummary.incomeByCategory).map(([category, amount]) => (
                  <div key={category} className={`flex items-center justify-between ${isMobile ? 'py-1' : ''}`}>
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0" />
                      <span className={`${isMobile ? 'text-sm' : 'text-sm'} capitalize truncate`}>
                        {category.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
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
              <CardTitle className={`text-red-600 ${isMobile ? 'text-base' : ''}`}>
                Expenses by Category
              </CardTitle>
              <CardDescription className={isMobile ? 'text-sm' : ''}>
                Cost breakdown for {currentYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(financialSummary.expensesByCategory).map(([category, amount]) => (
                  <div key={category} className={`flex items-center justify-between ${isMobile ? 'py-1' : ''}`}>
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0" />
                      <span className={`${isMobile ? 'text-sm' : 'text-sm'} capitalize truncate`}>
                        {category.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
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
      </div>
      
      {/* Key Metrics - Mobile Optimized */}
      <div className="px-4 sm:px-0">
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : ''}`}>
              <Calculator className="h-5 w-5" />
              <span>Key Financial Metrics</span>
            </CardTitle>
            <CardDescription className={isMobile ? 'text-sm' : ''}>
              Important financial indicators for your farm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`${isMobile ? 'space-y-6' : 'grid grid-cols-1 md:grid-cols-3 gap-6'}`}>
              <div className={`text-center ${isMobile ? 'bg-gray-50 p-4 rounded-lg' : ''}`}>
                <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-blue-600`}>
                  {formatCurrency(financialSummary.totalIncome / 12)}
                </div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>
                  Average Monthly Income
                </p>
              </div>
              
              <div className={`text-center ${isMobile ? 'bg-gray-50 p-4 rounded-lg' : ''}`}>
                <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-orange-600`}>
                  {formatCurrency(financialSummary.totalExpenses / 12)}
                </div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>
                  Average Monthly Expenses
                </p>
              </div>
              
              <div className={`text-center ${isMobile ? 'bg-gray-50 p-4 rounded-lg' : ''}`}>
                <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold ${financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(financialSummary.netProfit / 12)}
                </div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>
                  Average Monthly Profit
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Transactions - Mobile Optimized */}
      <div className="px-4 sm:px-0">
        <Card>
          <CardHeader>
            <CardTitle className={isMobile ? 'text-base' : ''}>Recent Transactions</CardTitle>
            <CardDescription className={isMobile ? 'text-sm' : ''}>
              Latest financial activity
            </CardDescription>
          </CardHeader>
          <CardContent className={isMobile ? 'px-2' : ''}>
            <TransactionsList 
              farmId={farmId}
              refreshKey={refreshKey}
              limit={isMobile ? 5 : 10}
            />
          </CardContent>
        </Card>
      </div>
      
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