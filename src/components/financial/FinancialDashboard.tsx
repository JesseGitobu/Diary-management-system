'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Progress } from '@/components/ui/Progress'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { AddTransactionModal } from '@/components/financial/AddTransactionModal'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts'
import {
  DollarSign, TrendingUp, TrendingDown, Plus, AlertTriangle, AlertCircle,
  CreditCard, Building2, Car, Stethoscope, Users, Landmark, PiggyBank,
  BarChart3, FileText, Calculator, ArrowUpRight, ArrowDownRight, Search,
  Download, Wallet, Package, Scale, Clock, Bell, Wheat, Zap, ChevronRight,
  BookOpen, Coins, Target, Activity, ShieldAlert, Filter
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

const KES = (amount: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)

const pct = (val: number, total: number) => total > 0 ? ((val / total) * 100).toFixed(1) : '0.0'

// ─── FILLER DATA ─────────────────────────────────────────────────────────────

const MONTHLY_TREND = [
  { month: 'Jan', income: 1850000, expenses: 1150000, profit: 700000 },
  { month: 'Feb', income: 1920000, expenses: 1280000, profit: 640000 },
  { month: 'Mar', income: 2050000, expenses: 1310000, profit: 740000 },
  { month: 'Apr', income: 1780000, expenses: 1190000, profit: 590000 },
]

const EXPENSE_BREAKDOWN = [
  { name: 'Feed', value: 450000, color: '#f97316' },
  { name: 'Labor', value: 280000, color: '#8b5cf6' },
  { name: 'Veterinary', value: 125000, color: '#ef4444' },
  { name: 'Equipment', value: 85000, color: '#3b82f6' },
  { name: 'Utilities', value: 72000, color: '#06b6d4' },
  { name: 'Transport', value: 48000, color: '#84cc16' },
  { name: 'Other', value: 130000, color: '#94a3b8' },
]

const REVENUE_SOURCES = [
  { source: 'Milk Sales', amount: 1420000, color: '#22c55e', icon: '🥛', unit: '44,375 L @ KES 32/L', trend: +4.2 },
  { source: 'Animal Sales', amount: 280000, color: '#3b82f6', icon: '🐄', unit: '3 heifers sold', trend: -12.0 },
  { source: 'Manure Sales', amount: 45000, color: '#a78bfa', icon: '🌿', unit: '45 bags @ KES 1,000', trend: +8.5 },
  { source: 'Breeding Services', amount: 35000, color: '#f59e0b', icon: '🔬', unit: '7 services @ KES 5,000', trend: +2.0 },
]

const TRANSACTIONS = [
  { id: 'T001', date: '2026-04-25', description: 'Milk sales — Morning batch', type: 'income', account: 'KCB Bank', amount: 180000, ref: 'Milk Sales', status: 'completed' },
  { id: 'T002', date: '2026-04-24', description: 'Feed purchase — FeedKe Ltd', type: 'expense', account: 'Cash', amount: -85000, ref: 'Feed', status: 'completed' },
  { id: 'T003', date: '2026-04-23', description: 'Staff salaries — April', type: 'expense', account: 'KCB Bank', amount: -180000, ref: 'Payroll', status: 'completed' },
  { id: 'T004', date: '2026-04-22', description: 'Vet visit — Dr. Kariuki', type: 'expense', account: 'Cash', amount: -15000, ref: 'Veterinary', status: 'completed' },
  { id: 'T005', date: '2026-04-21', description: 'Milk sales — Evening batch', type: 'income', account: 'M-Pesa', amount: 165000, ref: 'Milk Sales', status: 'completed' },
  { id: 'T006', date: '2026-04-20', description: 'Water & electricity bill', type: 'expense', account: 'KCB Bank', amount: -18500, ref: 'Utilities', status: 'completed' },
  { id: 'T007', date: '2026-04-19', description: 'Heifer #H002 sale', type: 'income', account: 'Cash', amount: 85000, ref: 'Animal Sales', status: 'completed' },
  { id: 'T008', date: '2026-04-18', description: 'Tractor fuel', type: 'expense', account: 'Cash', amount: -12000, ref: 'Transport', status: 'completed' },
  { id: 'T009', date: '2026-04-17', description: 'Breeding service fee', type: 'income', account: 'M-Pesa', amount: 15000, ref: 'Breeding', status: 'completed' },
  { id: 'T010', date: '2026-04-16', description: 'Milk sales — Morning batch', type: 'income', account: 'KCB Bank', amount: 175000, ref: 'Milk Sales', status: 'completed' },
]

const ACCOUNTS = [
  { id: 'A001', name: 'Cash on Hand', type: 'cash', balance: 120000, icon: Coins, color: 'text-green-600', bg: 'bg-green-50' },
  { id: 'A002', name: 'KCB Farm Account', type: 'bank', balance: 485000, icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-50', accountNo: '****4821' },
  { id: 'A003', name: 'Equity Bank Savings', type: 'bank', balance: 215000, icon: Landmark, color: 'text-purple-600', bg: 'bg-purple-50', accountNo: '****2034' },
  { id: 'A004', name: 'M-Pesa Business', type: 'mobile', balance: 48500, icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50', accountNo: '0722 *** 456' },
]

const ASSETS = [
  { id: 'AS001', name: 'Dairy Milking Machine (2 units)', category: 'Equipment', purchaseCost: 350000, currentValue: 280000, depRate: 10, purchaseDate: '2023-06-15', age: '2y 10m' },
  { id: 'AS002', name: 'Farm Tractor (Massey Ferguson)', category: 'Machinery', purchaseCost: 1200000, currentValue: 900000, depRate: 10, purchaseDate: '2022-03-10', age: '4y 1m' },
  { id: 'AS003', name: 'Dairy Shed & Buildings', category: 'Buildings', purchaseCost: 2500000, currentValue: 2250000, depRate: 4, purchaseDate: '2021-01-05', age: '5y 3m' },
  { id: 'AS004', name: 'Dairy Cows (52 heads)', category: 'Livestock', purchaseCost: 5200000, currentValue: 4800000, depRate: 8, purchaseDate: '2022-08-20', age: '3y 8m' },
  { id: 'AS005', name: 'Water Borehole & Tank', category: 'Infrastructure', purchaseCost: 480000, currentValue: 420000, depRate: 5, purchaseDate: '2022-01-12', age: '4y 3m' },
  { id: 'AS006', name: 'Pickup Truck (Toyota Hilux)', category: 'Vehicle', purchaseCost: 3500000, currentValue: 2800000, depRate: 10, purchaseDate: '2023-09-01', age: '2y 7m' },
]

const LIABILITIES = [
  { id: 'L001', lender: 'KCB Bank', type: 'Term Loan', original: 2000000, remaining: 1380000, rate: 14, nextPayment: '2026-05-01', monthlyPayment: 52000, status: 'current' },
  { id: 'L002', lender: 'Equity Bank', type: 'Asset Finance', original: 500000, remaining: 285000, rate: 16, nextPayment: '2026-05-05', monthlyPayment: 18500, status: 'current' },
  { id: 'L003', lender: 'FeedKe Ltd', type: 'Supplier Credit', original: 120000, remaining: 85000, rate: 0, nextPayment: '2026-04-30', monthlyPayment: 85000, status: 'overdue' },
]

const PAYROLL = [
  { id: 'E001', name: 'David Mwangi', role: 'Farm Manager', basic: 55000, allowances: 8000, deductions: 5280, net: 57720, status: 'paid', payDate: '2026-04-25' },
  { id: 'E002', name: 'Peter Kamau', role: 'Senior Milker', basic: 28000, allowances: 3000, deductions: 2100, net: 28900, status: 'paid', payDate: '2026-04-25' },
  { id: 'E003', name: 'Mary Wanjiku', role: 'Milker', basic: 22000, allowances: 2000, deductions: 1650, net: 22350, status: 'paid', payDate: '2026-04-25' },
  { id: 'E004', name: 'James Ochieng', role: 'Milker', basic: 22000, allowances: 2000, deductions: 1650, net: 22350, status: 'paid', payDate: '2026-04-25' },
  { id: 'E005', name: 'Grace Njeri', role: 'Vet Assistant', basic: 35000, allowances: 4000, deductions: 2925, net: 36075, status: 'paid', payDate: '2026-04-25' },
  { id: 'E006', name: 'Esther Akinyi', role: 'General Worker', basic: 18000, allowances: 1500, deductions: 1350, net: 18150, status: 'pending', payDate: '2026-04-30' },
]

const BUDGETS = [
  { category: 'Feed', icon: Wheat, budget: 480000, actual: 450000, color: 'bg-orange-500' },
  { category: 'Labor & Payroll', icon: Users, budget: 285000, actual: 280000, color: 'bg-purple-500' },
  { category: 'Veterinary', icon: Stethoscope, budget: 100000, actual: 125000, color: 'bg-red-500' },
  { category: 'Equipment Maintenance', icon: Package, budget: 80000, actual: 85000, color: 'bg-blue-500' },
  { category: 'Utilities', icon: Zap, budget: 75000, actual: 72000, color: 'bg-cyan-500' },
  { category: 'Transport', icon: Car, budget: 55000, actual: 48000, color: 'bg-green-500' },
  { category: 'Administration', icon: FileText, budget: 50000, actual: 45000, color: 'bg-gray-500' },
]

const CHART_OF_ACCOUNTS = [
  { code: '1000', name: 'Income', type: 'income', children: [
    { code: '1100', name: 'Milk Sales', type: 'income' },
    { code: '1200', name: 'Animal Sales', type: 'income' },
    { code: '1300', name: 'Manure Sales', type: 'income' },
    { code: '1400', name: 'Breeding Services', type: 'income' },
  ]},
  { code: '2000', name: 'Expenses', type: 'expense', children: [
    { code: '2100', name: 'Feed Costs', type: 'expense' },
    { code: '2200', name: 'Labor & Wages', type: 'expense' },
    { code: '2300', name: 'Veterinary Costs', type: 'expense' },
    { code: '2400', name: 'Equipment & Maintenance', type: 'expense' },
    { code: '2500', name: 'Utilities', type: 'expense' },
    { code: '2600', name: 'Transport', type: 'expense' },
  ]},
  { code: '3000', name: 'Assets', type: 'asset', children: [
    { code: '3100', name: 'Cash & Bank', type: 'asset' },
    { code: '3200', name: 'Livestock', type: 'asset' },
    { code: '3300', name: 'Equipment', type: 'asset' },
    { code: '3400', name: 'Buildings', type: 'asset' },
  ]},
  { code: '4000', name: 'Liabilities', type: 'liability', children: [
    { code: '4100', name: 'Bank Loans', type: 'liability' },
    { code: '4200', name: 'Supplier Credit', type: 'liability' },
  ]},
  { code: '5000', name: 'Equity', type: 'equity', children: [
    { code: '5100', name: "Owner's Capital", type: 'equity' },
    { code: '5200', name: 'Retained Earnings', type: 'equity' },
  ]},
]

const ALERTS = [
  { id: 1, severity: 'danger', title: 'Supplier Credit Overdue', message: 'FeedKe Ltd credit of KES 85,000 was due on Apr 30. Pay immediately to avoid supply disruption.', icon: AlertCircle },
  { id: 2, severity: 'warning', title: 'Veterinary Budget Exceeded', message: 'Vet spending (KES 125,000) is 25% over monthly budget (KES 100,000). Review upcoming treatments.', icon: AlertTriangle },
  { id: 3, severity: 'warning', title: 'Equipment Budget Exceeded', message: 'Equipment costs (KES 85,000) exceed budget by KES 5,000 this month.', icon: AlertTriangle },
  { id: 4, severity: 'info', title: 'Loan Payment Due Soon', message: 'KCB Bank monthly loan repayment of KES 52,000 is due on May 1, 2026.', icon: Clock },
]

const COST_ALLOCATIONS = [
  { entity: 'Dairy Cows (High Production)', type: 'animal_group', feedCost: 180000, vetCost: 45000, laborCost: 112000, total: 337000, units: 20, perUnit: 16850 },
  { entity: 'Dairy Cows (Mid Production)', type: 'animal_group', feedCost: 150000, vetCost: 35000, laborCost: 84000, total: 269000, units: 18, perUnit: 14944 },
  { entity: 'Heifers & Young Stock', type: 'animal_group', feedCost: 72000, vetCost: 28000, laborCost: 42000, total: 142000, units: 10, perUnit: 14200 },
  { entity: 'Dry Cows', type: 'animal_group', feedCost: 48000, vetCost: 17000, laborCost: 42000, total: 107000, units: 4, perUnit: 26750 },
]

const MILK_PRODUCTION_DATA = [
  { month: 'Jan', liters: 40250, costPerLiter: 28.6, revenue: 1288000, costTotal: 1150000 },
  { month: 'Feb', liters: 42100, costPerLiter: 30.4, revenue: 1347200, costTotal: 1280000 },
  { month: 'Mar', liters: 44800, costPerLiter: 29.2, revenue: 1433600, costTotal: 1310000 },
  { month: 'Apr', liters: 44375, costPerLiter: 26.8, revenue: 1420000, costTotal: 1190000 },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function StatCard({ title, value, subtitle, icon: Icon, trend, trendLabel, color, bg }: any) {
  const isPositive = trend >= 0
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            {trend !== undefined && (
              <div className={`flex items-center mt-2 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                {isPositive ? '+' : ''}{trend.toFixed(1)}% {trendLabel || 'vs last month'}
              </div>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${bg || 'bg-gray-100'}`}>
            <Icon className={`h-5 w-5 ${color || 'text-gray-600'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SectionHeader({ icon: Icon, title, subtitle, action }: any) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-gray-700" />
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  income: 'bg-green-100 text-green-700',
  expense: 'bg-red-100 text-red-700',
  asset: 'bg-blue-100 text-blue-700',
  liability: 'bg-orange-100 text-orange-700',
  equity: 'bg-purple-100 text-purple-700',
}

const SEVERITY_STYLES: Record<string, string> = {
  danger: 'border-red-200 bg-red-50',
  warning: 'border-yellow-200 bg-yellow-50',
  info: 'border-blue-200 bg-blue-50',
}
const SEVERITY_ICON_COLOR: Record<string, string> = {
  danger: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function FinancialDashboard({
  currentUser,
  userRole,
  farmId,
  currentYear,
}: FinancialDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showAddModal, setShowAddModal] = useState(false)
  const [txSearch, setTxSearch] = useState('')
  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense'>('all')
  const { isMobile } = useDeviceInfo()

  const canManage = ['farm_owner', 'farm_manager'].includes(userRole?.role_type)

  const totalCashBalance = ACCOUNTS.reduce((s, a) => s + a.balance, 0)
  const totalAssets = ASSETS.reduce((s, a) => s + a.currentValue, 0)
  const totalLiabilities = LIABILITIES.reduce((s, l) => s + l.remaining, 0)
  const netWorth = totalAssets - totalLiabilities
  const latestMonth = MONTHLY_TREND[MONTHLY_TREND.length - 1]
  const totalIncome = MONTHLY_TREND.reduce((s, m) => s + m.income, 0)
  const totalExpenses = MONTHLY_TREND.reduce((s, m) => s + m.expenses, 0)
  const netProfit = totalIncome - totalExpenses
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0
  const totalPayroll = PAYROLL.reduce((s, e) => s + e.net, 0)
  const latestCostPerLiter = MILK_PRODUCTION_DATA[MILK_PRODUCTION_DATA.length - 1].costPerLiter

  const filteredTx = useMemo(() => {
    return TRANSACTIONS.filter(t => {
      const matchType = txFilter === 'all' || t.type === txFilter
      const matchSearch = txSearch === '' ||
        t.description.toLowerCase().includes(txSearch.toLowerCase()) ||
        t.ref.toLowerCase().includes(txSearch.toLowerCase())
      return matchType && matchSearch
    })
  }, [txFilter, txSearch])

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Farm finances · FY {currentYear}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Transaction
            </Button>
          </div>
        )}
      </div>

      {/* ── Alerts Banner ── */}
      {ALERTS.filter(a => a.severity !== 'info').length > 0 && (
        <div className="space-y-2">
          {ALERTS.filter(a => a.severity === 'danger').map(alert => (
            <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${SEVERITY_STYLES.danger}`}>
              <alert.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${SEVERITY_ICON_COLOR.danger}`} />
              <div>
                <p className="text-sm font-semibold text-red-800">{alert.title}</p>
                <p className="text-xs text-red-700 mt-0.5">{alert.message}</p>
              </div>
            </div>
          ))}
          {ALERTS.filter(a => a.severity === 'warning').slice(0, 1).map(alert => (
            <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${SEVERITY_STYLES.warning}`}>
              <alert.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${SEVERITY_ICON_COLOR.warning}`} />
              <div>
                <p className="text-sm font-semibold text-yellow-800">{alert.title}</p>
                <p className="text-xs text-yellow-700 mt-0.5">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Top KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Income (YTD)" value={KES(totalIncome)} subtitle="4 months" icon={TrendingUp} trend={4.2} color="text-green-600" bg="bg-green-100" />
        <StatCard title="Total Expenses (YTD)" value={KES(totalExpenses)} subtitle="4 months" icon={TrendingDown} trend={2.8} trendLabel="vs same period" color="text-red-600" bg="bg-red-100" />
        <StatCard title="Net Profit (YTD)" value={KES(netProfit)} subtitle={`${profitMargin.toFixed(1)}% margin`} icon={DollarSign} trend={1.6} color="text-blue-600" bg="bg-blue-100" />
        <StatCard title="Cash Balance" value={KES(totalCashBalance)} subtitle="All accounts" icon={Wallet} color="text-purple-600" bg="bg-purple-100" />
      </div>

      {/* ── Main Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList className="flex h-auto w-max min-w-full sm:w-auto gap-0.5 p-1 bg-gray-100 rounded-lg">
            {[
              { value: 'overview', label: 'Overview', icon: BarChart3 },
              { value: 'transactions', label: 'Transactions', icon: FileText },
              { value: 'revenue', label: 'Revenue', icon: TrendingUp },
              { value: 'expenses', label: 'Expenses', icon: TrendingDown },
              { value: 'payroll', label: 'Payroll', icon: Users },
              { value: 'balance', label: 'Balance Sheet', icon: Scale },
              { value: 'budgets', label: 'Budgets', icon: Target },
              { value: 'reports', label: 'Reports', icon: Activity },
              { value: 'accounts_chart', label: 'Chart of Accounts', icon: BookOpen },
              { value: 'alerts', label: `Alerts (${ALERTS.length})`, icon: Bell },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
        <TabsContent value="overview">
          <div className="space-y-5">
            {/* Monthly Trend + Expense Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Monthly Income vs Expenses</CardTitle>
                  <CardDescription className="text-xs">Jan – Apr {currentYear}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={MONTHLY_TREND} barGap={4} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip formatter={(v: any) => KES(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="income" name="Income" fill="#22c55e" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Expense Breakdown</CardTitle>
                  <CardDescription className="text-xs">Current month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie data={EXPENSE_BREAKDOWN} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" stroke="none">
                        {EXPENSE_BREAKDOWN.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => KES(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {EXPENSE_BREAKDOWN.slice(0, 4).map(item => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-gray-600">{item.name}</span>
                        </div>
                        <span className="font-medium">{KES(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPI Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Avg Monthly Income', value: KES(totalIncome / 4), color: 'text-green-700', bg: 'bg-green-50' },
                { label: 'Avg Monthly Expense', value: KES(totalExpenses / 4), color: 'text-red-700', bg: 'bg-red-50' },
                { label: 'Cost per Litre (Milk)', value: `KES ${latestCostPerLiter.toFixed(2)}`, color: 'text-blue-700', bg: 'bg-blue-50' },
                { label: 'Net Worth', value: KES(netWorth), color: 'text-purple-700', bg: 'bg-purple-50' },
              ].map(metric => (
                <div key={metric.label} className={`${metric.bg} rounded-xl p-4`}>
                  <p className={`text-lg font-bold ${metric.color}`}>{metric.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{metric.label}</p>
                </div>
              ))}
            </div>

            {/* Revenue Sources Mini View */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Revenue Sources — This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {REVENUE_SOURCES.map(src => (
                    <div key={src.source} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="text-lg">{src.icon}</div>
                      <p className="text-sm font-bold text-gray-900 mt-1">{KES(src.amount)}</p>
                      <p className="text-xs text-gray-500">{src.source}</p>
                      <p className={`text-xs font-medium mt-1 ${src.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {src.trend >= 0 ? '+' : ''}{src.trend}% MoM
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setActiveTab('transactions')}>
                    View All <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50">
                  {TRANSACTIONS.slice(0, 5).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                          {tx.type === 'income' ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                          <p className="text-xs text-gray-400">{tx.date} · {tx.account}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{KES(Math.abs(tx.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════ TRANSACTIONS TAB ═══════════════ */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Transaction Ledger</CardTitle>
                  <CardDescription className="text-xs">All financial events · {currentYear}</CardDescription>
                </div>
                {canManage && (
                  <Button size="sm" onClick={() => setShowAddModal(true)}>
                    <Plus className="h-4 w-4 mr-1.5" /> Record Transaction
                  </Button>
                )}
              </div>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input placeholder="Search transactions..." className="pl-8 h-8 text-sm" value={txSearch} onChange={e => setTxSearch(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  {(['all', 'income', 'expense'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setTxFilter(f)}
                      className={`px-3 py-1.5 text-xs rounded-md font-medium capitalize transition-colors ${txFilter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Account</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTx.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{tx.date}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                              {tx.type === 'income' ? <ArrowUpRight className="h-3 w-3 text-green-600" /> : <ArrowDownRight className="h-3 w-3 text-red-600" />}
                            </div>
                            <span className="text-xs font-medium text-gray-800">{tx.description}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Badge variant="secondary" className="text-xs">{tx.ref}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{tx.account}</td>
                        <td className={`px-4 py-3 text-right text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}{KES(Math.abs(tx.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTx.length === 0 && (
                  <div className="text-center py-10 text-gray-400 text-sm">No transactions match your filter.</div>
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">{filteredTx.length} transactions</p>
                <div className="flex gap-2">
                  <span className="text-xs text-green-600 font-medium">
                    In: {KES(filteredTx.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0))}
                  </span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-red-600 font-medium">
                    Out: {KES(Math.abs(filteredTx.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ REVENUE TAB ═══════════════ */}
        <TabsContent value="revenue">
          <div className="space-y-4">
            {/* Revenue summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {REVENUE_SOURCES.map(src => (
                <Card key={src.source}>
                  <CardContent className="p-4">
                    <div className="text-2xl mb-1">{src.icon}</div>
                    <p className="text-lg font-bold text-gray-900">{KES(src.amount)}</p>
                    <p className="text-xs font-semibold text-gray-700">{src.source}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{src.unit}</p>
                    <p className={`text-xs font-medium mt-2 ${src.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {src.trend >= 0 ? '↑' : '↓'} {Math.abs(src.trend)}% vs last month
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Revenue Trend Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle>
                  <CardDescription className="text-xs">Monthly income by source</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={MONTHLY_TREND}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip formatter={(v: any) => KES(v)} />
                      <Area type="monotone" dataKey="income" name="Revenue" stroke="#22c55e" fill="#dcfce7" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Milk Production KPIs */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">🥛 Milk Production & Revenue</CardTitle>
                  <CardDescription className="text-xs">Monthly performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 font-semibold text-gray-500">Month</th>
                          <th className="text-right py-2 font-semibold text-gray-500">Litres</th>
                          <th className="text-right py-2 font-semibold text-gray-500">Revenue</th>
                          <th className="text-right py-2 font-semibold text-gray-500">Cost/L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {MILK_PRODUCTION_DATA.map(row => (
                          <tr key={row.month}>
                            <td className="py-2.5 font-medium">{row.month}</td>
                            <td className="py-2.5 text-right">{row.liters.toLocaleString()}</td>
                            <td className="py-2.5 text-right text-green-600 font-medium">{KES(row.revenue)}</td>
                            <td className={`py-2.5 text-right font-medium ${row.costPerLiter > 30 ? 'text-red-600' : 'text-blue-600'}`}>
                              KES {row.costPerLiter}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs font-semibold text-blue-800">💡 Current cost per litre: KES {latestCostPerLiter}</p>
                    <p className="text-xs text-blue-600 mt-0.5">Selling price: KES 32/L · Margin: KES {(32 - latestCostPerLiter).toFixed(2)}/L</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════ EXPENSES TAB ═══════════════ */}
        <TabsContent value="expenses">
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {EXPENSE_BREAKDOWN.map(exp => (
                <Card key={exp.name}>
                  <CardContent className="p-3 text-center">
                    <p className="text-sm font-bold text-gray-900">{KES(exp.value)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{exp.name}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                      <div className="h-full rounded-full" style={{ width: `${pct(exp.value, 1190000)}%`, backgroundColor: exp.color }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct(exp.value, 1190000)}%</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Expense Categories</CardTitle>
                  <CardDescription className="text-xs">Current month breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {EXPENSE_BREAKDOWN.map(exp => (
                    <div key={exp.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: exp.color }} />
                          <span className="font-medium text-gray-700">{exp.name}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{KES(exp.value)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct(exp.value, 1190000)}%`, backgroundColor: exp.color }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Expense Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={MONTHLY_TREND}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip formatter={(v: any) => KES(v)} />
                      <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Expense Transactions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Recent Expense Transactions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50">
                  {TRANSACTIONS.filter(t => t.type === 'expense').map(tx => (
                    <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{tx.description}</p>
                        <p className="text-xs text-gray-400">{tx.date} · {tx.account}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-red-600">{KES(Math.abs(tx.amount))}</p>
                        <Badge variant="secondary" className="text-xs">{tx.ref}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════ PAYROLL TAB ═══════════════ */}
        <TabsContent value="payroll">
          <div className="space-y-4">
            {/* Payroll Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Gross Pay', value: KES(PAYROLL.reduce((s, e) => s + e.basic + e.allowances, 0)), color: 'text-blue-700', bg: 'bg-blue-50' },
                { label: 'Total Deductions', value: KES(PAYROLL.reduce((s, e) => s + e.deductions, 0)), color: 'text-red-700', bg: 'bg-red-50' },
                { label: 'Total Net Pay', value: KES(totalPayroll), color: 'text-green-700', bg: 'bg-green-50' },
                { label: 'Employees', value: `${PAYROLL.length} staff`, color: 'text-purple-700', bg: 'bg-purple-50' },
              ].map(m => (
                <div key={m.label} className={`${m.bg} rounded-xl p-4`}>
                  <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Payroll — April 2026</CardTitle>
                  {canManage && <Button size="sm" variant="outline" className="text-xs h-7"><Plus className="h-3 w-3 mr-1" />Process Payroll</Button>}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Basic</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Allowances</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Deductions</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Net Pay</th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {PAYROLL.map(emp => (
                        <tr key={emp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-gray-900">{emp.name}</p>
                            <p className="text-xs text-gray-400">{emp.role}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-xs">{KES(emp.basic)}</td>
                          <td className="px-4 py-3 text-right text-xs text-green-600 hidden sm:table-cell">+{KES(emp.allowances)}</td>
                          <td className="px-4 py-3 text-right text-xs text-red-600 hidden sm:table-cell">-{KES(emp.deductions)}</td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{KES(emp.net)}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`text-xs ${emp.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {emp.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                        <td className="px-4 py-3 text-xs text-gray-700">TOTAL</td>
                        <td className="px-4 py-3 text-right text-xs">{KES(PAYROLL.reduce((s, e) => s + e.basic, 0))}</td>
                        <td className="px-4 py-3 text-right text-xs hidden sm:table-cell">{KES(PAYROLL.reduce((s, e) => s + e.allowances, 0))}</td>
                        <td className="px-4 py-3 text-right text-xs hidden sm:table-cell">{KES(PAYROLL.reduce((s, e) => s + e.deductions, 0))}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">{KES(totalPayroll)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════ BALANCE SHEET TAB ═══════════════ */}
        <TabsContent value="balance">
          <div className="space-y-4">
            {/* Balance Sheet Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-blue-700">{KES(totalAssets)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Assets</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-red-700">{KES(totalLiabilities)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Liabilities</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-green-700">{KES(netWorth)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Net Worth (Equity)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Cash & Bank Accounts */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2"><Wallet className="h-4 w-4" />Cash & Bank Accounts</CardTitle>
                  <CardDescription className="text-xs">Total: {KES(totalCashBalance)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ACCOUNTS.map(acc => (
                    <div key={acc.id} className={`flex items-center justify-between p-3 rounded-xl ${acc.bg}`}>
                      <div className="flex items-center gap-3">
                        <acc.icon className={`h-5 w-5 ${acc.color}`} />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{acc.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{acc.type}{(acc as any).accountNo ? ` · ${(acc as any).accountNo}` : ''}</p>
                        </div>
                      </div>
                      <p className={`text-base font-bold ${acc.color}`}>{KES(acc.balance)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Assets */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4" />Farm Assets</CardTitle>
                  <CardDescription className="text-xs">Book value: {KES(totalAssets)}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-50">
                    {ASSETS.map(asset => (
                      <div key={asset.id} className="px-5 py-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-semibold text-gray-900">{asset.name}</p>
                            <p className="text-xs text-gray-400">{asset.category} · {asset.age} old</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{KES(asset.currentValue)}</p>
                            <p className="text-xs text-gray-400">Cost: {KES(asset.purchaseCost)}</p>
                          </div>
                        </div>
                        <div className="mt-1.5">
                          <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                            <span>Depreciated {(100 - (asset.currentValue / asset.purchaseCost) * 100).toFixed(0)}%</span>
                            <span>{asset.depRate}% p.a.</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(asset.currentValue / asset.purchaseCost) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Liabilities */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Landmark className="h-4 w-4" />Liabilities & Loans</CardTitle>
                <CardDescription className="text-xs">Outstanding: {KES(totalLiabilities)}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Lender / Type</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Original</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Remaining</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Rate</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Monthly</th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {LIABILITIES.map(lib => (
                        <tr key={lib.id} className={`hover:bg-gray-50 ${lib.status === 'overdue' ? 'bg-red-50/50' : ''}`}>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-gray-900">{lib.lender}</p>
                            <p className="text-xs text-gray-400">{lib.type} · Due: {lib.nextPayment}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-600">{KES(lib.original)}</td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-red-700">{KES(lib.remaining)}</td>
                          <td className="px-4 py-3 text-right text-xs hidden sm:table-cell">{lib.rate > 0 ? `${lib.rate}%` : 'None'}</td>
                          <td className="px-4 py-3 text-right text-xs hidden sm:table-cell">{KES(lib.monthlyPayment)}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`text-xs ${lib.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {lib.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════ BUDGETS TAB ═══════════════ */}
        <TabsContent value="budgets">
          <div className="space-y-4">
            {/* Budget Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-lg font-bold text-blue-700">{KES(BUDGETS.reduce((s, b) => s + b.budget, 0))}</p>
                <p className="text-xs text-gray-500">Total Budget</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4">
                <p className="text-lg font-bold text-orange-700">{KES(BUDGETS.reduce((s, b) => s + b.actual, 0))}</p>
                <p className="text-xs text-gray-500">Actual Spend</p>
              </div>
              <div className={`rounded-xl p-4 ${BUDGETS.reduce((s, b) => s + b.actual - b.budget, 0) > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className={`text-lg font-bold ${BUDGETS.reduce((s, b) => s + b.actual - b.budget, 0) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {KES(Math.abs(BUDGETS.reduce((s, b) => s + b.actual - b.budget, 0)))}
                </p>
                <p className="text-xs text-gray-500">{BUDGETS.reduce((s, b) => s + b.actual - b.budget, 0) > 0 ? 'Over Budget' : 'Under Budget'}</p>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Budget vs Actual — April 2026</CardTitle>
                <CardDescription className="text-xs">Monthly budget utilization by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {BUDGETS.map(b => {
                    const pctUsed = (b.actual / b.budget) * 100
                    const over = b.actual > b.budget
                    return (
                      <div key={b.category}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <b.icon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-800">{b.category}</span>
                            {over && <Badge className="text-xs bg-red-100 text-red-700">Over Budget</Badge>}
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-bold ${over ? 'text-red-600' : 'text-gray-900'}`}>{KES(b.actual)}</span>
                            <span className="text-xs text-gray-400 ml-1">/ {KES(b.budget)}</span>
                          </div>
                        </div>
                        <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`absolute left-0 top-0 h-full rounded-full transition-all ${over ? 'bg-red-500' : b.color}`}
                            style={{ width: `${Math.min(pctUsed, 100)}%` }}
                          />
                          {over && (
                            <div className="absolute right-0 top-0 h-full w-px bg-red-700 opacity-50" />
                          )}
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className={`text-xs ${over ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                            {pctUsed.toFixed(0)}% used {over ? `(+${KES(b.actual - b.budget)})` : ''}
                          </span>
                          <span className="text-xs text-gray-400">
                            {over ? 'Exceeded' : `${KES(b.budget - b.actual)} remaining`}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Budget vs Actual Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Budget vs Actual Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={BUDGETS.map(b => ({ name: b.category.split(' ')[0], budget: b.budget, actual: b.actual }))} barGap={4} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: any) => KES(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="budget" name="Budget" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="actual" name="Actual" fill="#f97316" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════ REPORTS TAB ═══════════════ */}
        <TabsContent value="reports">
          <div className="space-y-4">
            {/* Report Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { title: 'Profit & Loss', icon: BarChart3, desc: 'Income vs expenses summary', color: 'bg-green-50 border-green-200' },
                { title: 'Cash Flow', icon: Activity, desc: 'Money in & out over time', color: 'bg-blue-50 border-blue-200' },
                { title: 'Cost per Litre', icon: Calculator, desc: 'Production cost analysis', color: 'bg-purple-50 border-purple-200' },
              ].map(r => (
                <button key={r.title} className={`text-left p-4 rounded-xl border ${r.color} hover:shadow-md transition-shadow`}>
                  <r.icon className="h-6 w-6 text-gray-600 mb-2" />
                  <p className="font-semibold text-gray-900 text-sm">{r.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                  <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">View Report <ChevronRight className="h-3 w-3" /></p>
                </button>
              ))}
            </div>

            {/* P&L Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Profit & Loss Statement — Jan to Apr {currentYear}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="font-semibold text-gray-500 text-xs uppercase tracking-wide pb-1 border-b">Revenue</div>
                  {REVENUE_SOURCES.map(s => (
                    <div key={s.source} className="flex justify-between text-xs py-0.5">
                      <span className="text-gray-600 pl-3">{s.source}</span>
                      <span className="text-green-700 font-medium">{KES(s.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-sm pt-1 border-t">
                    <span>Total Revenue</span>
                    <span className="text-green-700">{KES(REVENUE_SOURCES.reduce((s, r) => s + r.amount, 0))}</span>
                  </div>

                  <div className="font-semibold text-gray-500 text-xs uppercase tracking-wide pb-1 border-b mt-3">Expenses</div>
                  {EXPENSE_BREAKDOWN.map(e => (
                    <div key={e.name} className="flex justify-between text-xs py-0.5">
                      <span className="text-gray-600 pl-3">{e.name}</span>
                      <span className="text-red-600 font-medium">({KES(e.value)})</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-sm pt-1 border-t">
                    <span>Total Expenses</span>
                    <span className="text-red-600">({KES(EXPENSE_BREAKDOWN.reduce((s, e) => s + e.value, 0))})</span>
                  </div>

                  <div className="flex justify-between font-bold text-base pt-2 border-t-2 border-gray-900 mt-2">
                    <span>Net Profit</span>
                    <span className={netProfit >= 0 ? 'text-green-700' : 'text-red-700'}>{KES(latestMonth.profit)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 pt-0.5">
                    <span>Profit Margin</span>
                    <span className="font-semibold">{pct(latestMonth.profit, latestMonth.income)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Allocation */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Scale className="h-4 w-4" />Cost Allocation by Animal Group
                </CardTitle>
                <CardDescription className="text-xs">Link costs to specific herd groups for profitability analysis</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase">Group</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase">Feed</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase hidden sm:table-cell">Vet</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase hidden sm:table-cell">Labor</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase">Total</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase">Per Head</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {COST_ALLOCATIONS.map(alloc => (
                        <tr key={alloc.entity} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-800">{alloc.entity}</p>
                            <p className="text-gray-400">{alloc.units} animals</p>
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600">{KES(alloc.feedCost)}</td>
                          <td className="px-4 py-3 text-right text-red-600 hidden sm:table-cell">{KES(alloc.vetCost)}</td>
                          <td className="px-4 py-3 text-right text-purple-600 hidden sm:table-cell">{KES(alloc.laborCost)}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">{KES(alloc.total)}</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-700">{KES(alloc.perUnit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Break-even Analysis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">📉 Break-Even Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Fixed Costs/Month', value: KES(650000), color: 'text-red-700', bg: 'bg-red-50' },
                    { label: 'Variable Cost/Litre', value: 'KES 12.50', color: 'text-orange-700', bg: 'bg-orange-50' },
                    { label: 'Selling Price/Litre', value: 'KES 32.00', color: 'text-green-700', bg: 'bg-green-50' },
                    { label: 'Break-even Volume', value: '33,333 L/mo', color: 'text-blue-700', bg: 'bg-blue-50' },
                  ].map(m => (
                    <div key={m.label} className={`${m.bg} rounded-xl p-3`}>
                      <p className={`text-base font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-green-800">✅ Farm is above break-even</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    Current production: 44,375 L/mo · Break-even: 33,333 L/mo · Buffer: +11,042 L (+33%)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════ CHART OF ACCOUNTS TAB ═══════════════ */}
        <TabsContent value="accounts_chart">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Chart of Accounts</CardTitle>
                  <CardDescription className="text-xs">Standardized account hierarchy for your farm finances</CardDescription>
                </div>
                {canManage && <Button size="sm" variant="outline" className="text-xs h-7"><Plus className="h-3 w-3 mr-1" />Add Account</Button>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {CHART_OF_ACCOUNTS.map(group => (
                <div key={group.code} className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">{group.code}</span>
                      <span className="font-semibold text-sm text-gray-900">{group.name}</span>
                    </div>
                    <Badge className={`text-xs ${ACCOUNT_TYPE_COLORS[group.type]}`}>{group.type}</Badge>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {group.children.map(child => (
                      <div key={child.code} className="flex items-center justify-between px-4 py-2.5 pl-8">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400">{child.code}</span>
                          <span className="text-sm text-gray-700">{child.name}</span>
                        </div>
                        <Badge variant="secondary" className={`text-xs ${ACCOUNT_TYPE_COLORS[child.type]}`}>{child.type}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ ALERTS TAB ═══════════════ */}
        <TabsContent value="alerts">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Financial Alerts & Controls</h3>
              <Badge className="bg-red-100 text-red-700 text-xs">{ALERTS.filter(a => a.severity === 'danger').length} Critical</Badge>
            </div>
            {ALERTS.map(alert => (
              <div key={alert.id} className={`flex items-start gap-4 p-4 rounded-xl border ${SEVERITY_STYLES[alert.severity]}`}>
                <alert.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${SEVERITY_ICON_COLOR[alert.severity]}`} />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                    <Badge className={`text-xs flex-shrink-0 ${
                      alert.severity === 'danger' ? 'bg-red-100 text-red-700' :
                      alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{alert.severity}</Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                </div>
              </div>
            ))}

            {/* Financial Controls Summary */}
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />Financial Controls Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { control: 'Cash Balance Monitoring', status: 'Active', ok: true, detail: `Current: ${KES(totalCashBalance)} · Min threshold: KES 100,000` },
                    { control: 'Budget Overspend Alerts', status: '2 Exceeded', ok: false, detail: 'Veterinary (+25%) and Equipment (+6%) over budget' },
                    { control: 'Supplier Credit Tracking', status: '1 Overdue', ok: false, detail: 'FeedKe Ltd: KES 85,000 overdue since Apr 30' },
                    { control: 'Loan Repayment Schedule', status: 'On Track', ok: true, detail: 'KCB: due May 1 · Equity: due May 5' },
                    { control: 'Revenue vs Target', status: 'On Track', ok: true, detail: `Monthly revenue ${KES(1780000)} vs target ${KES(1750000)}` },
                  ].map(ctrl => (
                    <div key={ctrl.control} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ctrl.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-800">{ctrl.control}</p>
                        <p className="text-xs text-gray-500">{ctrl.detail}</p>
                      </div>
                      <Badge className={`text-xs flex-shrink-0 ${ctrl.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {ctrl.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Add Transaction Modal ── */}
      {showAddModal && (
        <AddTransactionModal
          farmId={farmId}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onTransactionAdded={() => { setShowAddModal(false) }}
        />
      )}
    </div>
  )
}
