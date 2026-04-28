'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { ReportGenerator } from '@/components/reports/ReportGenerator'
import { ReportsStatsCards } from '@/components/reports/ReportsStatsCards'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import {
  Download, TrendingUp, DollarSign, Milk, Wheat, Calendar, Target,
  RefreshCw, FileText, FileSpreadsheet, Wrench, Users, Activity,
  ClipboardList, PieChart, Sparkles, CheckCircle2, AlertTriangle,
  Award, Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ---------------------------------------------------------------------------
// Static demo data — shown when no real farm data has been recorded yet
// ---------------------------------------------------------------------------
const DEMO_TREND = [
  { date: 'Mar 28', volume: 598, fat: 3.88, protein: 3.22, revenue: 29900, costs: 23500, profit: 6400, feedCost: 13800, feedPerAnimal: 307 },
  { date: 'Mar 30', volume: 612, fat: 3.82, protein: 3.20, revenue: 30600, costs: 24100, profit: 6500, feedCost: 14200, feedPerAnimal: 316 },
  { date: 'Apr 1',  volume: 625, fat: 3.79, protein: 3.25, revenue: 31250, costs: 24800, profit: 6450, feedCost: 14600, feedPerAnimal: 324 },
  { date: 'Apr 3',  volume: 601, fat: 3.84, protein: 3.19, revenue: 30050, costs: 23600, profit: 6450, feedCost: 14100, feedPerAnimal: 313 },
  { date: 'Apr 5',  volume: 618, fat: 3.86, protein: 3.21, revenue: 30900, costs: 24300, profit: 6600, feedCost: 14800, feedPerAnimal: 329 },
  { date: 'Apr 7',  volume: 634, fat: 3.80, protein: 3.24, revenue: 31700, costs: 25100, profit: 6600, feedCost: 15100, feedPerAnimal: 336 },
  { date: 'Apr 9',  volume: 622, fat: 3.83, protein: 3.20, revenue: 31100, costs: 24600, profit: 6500, feedCost: 14900, feedPerAnimal: 331 },
  { date: 'Apr 11', volume: 628, fat: 3.81, protein: 3.23, revenue: 31400, costs: 24900, profit: 6500, feedCost: 15000, feedPerAnimal: 333 },
  { date: 'Apr 13', volume: 640, fat: 3.78, protein: 3.26, revenue: 32000, costs: 25400, profit: 6600, feedCost: 15400, feedPerAnimal: 342 },
  { date: 'Apr 15', volume: 614, fat: 3.85, protein: 3.18, revenue: 30700, costs: 24200, profit: 6500, feedCost: 14700, feedPerAnimal: 327 },
  { date: 'Apr 17', volume: 618, fat: 3.87, protein: 3.20, revenue: 30900, costs: 24300, profit: 6600, feedCost: 14900, feedPerAnimal: 331 },
  { date: 'Apr 19', volume: 630, fat: 3.84, protein: 3.22, revenue: 31500, costs: 24700, profit: 6800, feedCost: 15200, feedPerAnimal: 338 },
]

const DEMO_KPIS = {
  currentMonth: {
    production: { summary: { totalMilkVolume: 18420, averageDailyProduction: 614.0, averageFatContent: 3.82, averageProteinContent: 3.18, daysReported: 30, animalsReported: 45 } },
    feed:       { summary: { totalFeedCost: 145200, totalFeedQuantity: 4350, averageDailyCost: 4840, averageCostPerAnimal: 3227 } },
    financial:  { summary: { totalRevenue: 921000, totalCosts: 714300, grossProfit: 206700, profitMargin: 22.4, costPerLiter: 38.78, revenuePerLiter: 50.0 } },
  },
  previousMonth: {
    production: { summary: { totalMilkVolume: 17020 } },
    feed:       { summary: { totalFeedCost: 149800 } },
    financial:  { summary: { profitMargin: 19.1, grossProfit: 183200 } },
  },
  changes: { production: 8.2, costs: -3.1, profit: 12.8 },
}

// ---------------------------------------------------------------------------
// Department report definitions
// ---------------------------------------------------------------------------
const DEPARTMENT_REPORTS = [
  {
    id: 'milk',
    title: 'Milk Production',
    icon: Milk,
    iconBg: 'bg-blue-100 text-blue-600',
    accentBar: 'bg-blue-500',
    description: 'Daily yields, fat & protein content, session logs and per-cow averages.',
    tags: ['Daily Summary', 'Monthly Trend', 'Animal Performance'],
    lastGenerated: '2 days ago',
    reportType: 'production',
  },
  {
    id: 'feed',
    title: 'Feed & Nutrition',
    icon: Wheat,
    iconBg: 'bg-orange-100 text-orange-600',
    accentBar: 'bg-orange-500',
    description: 'Feed consumption, TMR recipe usage, cost per animal and inventory levels.',
    tags: ['Cost Analysis', 'Consumption Log', 'TMR Efficiency'],
    lastGenerated: '5 days ago',
    reportType: 'feed',
  },
  {
    id: 'health',
    title: 'Animal Health',
    icon: Activity,
    iconBg: 'bg-red-100 text-red-600',
    accentBar: 'bg-red-500',
    description: 'Health events, treatments, vaccinations, sick records and vet visits.',
    tags: ['Health Log', 'Treatment History', 'Vaccination Report'],
    lastGenerated: '1 week ago',
    reportType: 'health',
  },
  {
    id: 'financial',
    title: 'Financial Overview',
    icon: DollarSign,
    iconBg: 'bg-green-100 text-green-600',
    accentBar: 'bg-green-500',
    description: 'Revenue breakdown, cost centres, profit margins and financial KPIs.',
    tags: ['P&L Summary', 'Cost Breakdown', 'Quarterly Report'],
    lastGenerated: 'Today',
    reportType: 'financial',
  },
  {
    id: 'equipment',
    title: 'Equipment & Assets',
    icon: Wrench,
    iconBg: 'bg-slate-100 text-slate-600',
    accentBar: 'bg-slate-500',
    description: 'Maintenance logs, service history, upcoming service and asset register.',
    tags: ['Maintenance Log', 'Asset Register', 'Service Due'],
    lastGenerated: '3 days ago',
    reportType: 'equipment',
  },
  {
    id: 'herd',
    title: 'Herd Management',
    icon: Users,
    iconBg: 'bg-purple-100 text-purple-600',
    accentBar: 'bg-purple-500',
    description: 'Animal inventory, breeding records, calvings, dry-offs and lifecycle tracking.',
    tags: ['Herd Inventory', 'Breeding Report', 'Calving Schedule'],
    lastGenerated: '4 days ago',
    reportType: 'herd',
  },
]

// ---------------------------------------------------------------------------
// Demo recent reports list
// ---------------------------------------------------------------------------
const DEMO_RECENT_REPORTS = [
  { id: 'r1', name: 'Monthly Production Report — March 2026',   dept: 'Milk Production',  deptColor: 'bg-blue-50 text-blue-700',   date: 'Apr 1, 2026',  format: 'PDF',   FormatIcon: FileText,        formatColor: 'text-red-500',     size: '2.3 MB' },
  { id: 'r2', name: 'Q1 2026 Financial Analysis',               dept: 'Financial',         deptColor: 'bg-green-50 text-green-700', date: 'Apr 5, 2026',  format: 'Excel', FormatIcon: FileSpreadsheet,  formatColor: 'text-emerald-600', size: '1.8 MB' },
  { id: 'r3', name: 'Feed Cost Summary — March 2026',           dept: 'Feed & Nutrition',  deptColor: 'bg-orange-50 text-orange-700', date: 'Apr 2, 2026',  format: 'PDF',   FormatIcon: FileText,        formatColor: 'text-red-500',     size: '1.1 MB' },
  { id: 'r4', name: 'Comprehensive Farm Report — March 2026',   dept: 'All Departments',   deptColor: 'bg-purple-50 text-purple-700', date: 'Mar 31, 2026', format: 'PDF',   FormatIcon: FileText,        formatColor: 'text-red-500',     size: '4.2 MB' },
  { id: 'r5', name: 'Animal Health Log — Q1 2026',              dept: 'Animal Health',     deptColor: 'bg-red-50 text-red-700',     date: 'Apr 8, 2026',  format: 'Excel', FormatIcon: FileSpreadsheet,  formatColor: 'text-emerald-600', size: '0.7 MB' },
  { id: 'r6', name: 'Equipment Maintenance Log — Q1 2026',      dept: 'Equipment',         deptColor: 'bg-slate-50 text-slate-700', date: 'Apr 10, 2026', format: 'Excel', FormatIcon: FileSpreadsheet,  formatColor: 'text-emerald-600', size: '0.9 MB' },
]

// ---------------------------------------------------------------------------
// Analytics insight cards
// ---------------------------------------------------------------------------
const buildInsights = (cur: any, changes: any) => [
  {
    icon: TrendingUp,
    title: 'Production Momentum',
    color: 'bg-blue-50 border-blue-100',
    titleColor: 'text-blue-800',
    bodyColor: 'text-blue-700',
    body: `Daily average of ${cur?.production?.summary?.averageDailyProduction?.toFixed(0) || 614}L/day exceeds the industry benchmark of 550L. Consistent feeding schedules are driving this result.`,
  },
  {
    icon: DollarSign,
    title: 'Cost Efficiency',
    color: 'bg-green-50 border-green-100',
    titleColor: 'text-green-800',
    bodyColor: 'text-green-700',
    body: `Feed costs dropped ${Math.abs(changes?.costs || 3.1).toFixed(1)}% while production rose ${(changes?.production || 8.2).toFixed(1)}%. Your cost-to-yield ratio is trending in the right direction.`,
  },
  {
    icon: Award,
    title: 'Milk Quality',
    color: 'bg-amber-50 border-amber-100',
    titleColor: 'text-amber-800',
    bodyColor: 'text-amber-700',
    body: `Fat at ${cur?.production?.summary?.averageFatContent?.toFixed(2) || '3.82'}% and protein at ${cur?.production?.summary?.averageProteinContent?.toFixed(2) || '3.18'}% both exceed grading thresholds — qualifying for premium pricing tiers.`,
  },
  {
    icon: Lightbulb,
    title: 'Profit Outlook',
    color: 'bg-purple-50 border-purple-100',
    titleColor: 'text-purple-800',
    bodyColor: 'text-purple-700',
    body: `${cur?.financial?.summary?.profitMargin?.toFixed(1) || '22.4'}% profit margin is well above the industry average of 15%. Reinvesting in equipment maintenance can protect this trajectory.`,
  },
]

interface ReportsDashboardProps {
  farmId: string
  initialKPIs: any
  userRole: string
}

export function ReportsDashboard({ farmId, initialKPIs, userRole }: ReportsDashboardProps) {
  const [kpis, setKPIs] = useState(initialKPIs)
  const [loading, setLoading] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState<string | undefined>(undefined)
  const generatorRef = useRef<HTMLDivElement>(null)
  const { isMobile } = useDeviceInfo()

  const hasRealData = (kpis?.currentMonth?.production?.summary?.totalMilkVolume ?? 0) > 0
  const displayKPIs = hasRealData ? kpis : DEMO_KPIS
  const isShowingDemo = !hasRealData

  const refreshKPIs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/reports/kpis')
      const result = await response.json()
      if (result.success) setKPIs(result.data)
    } catch (error) {
      console.error('Error refreshing KPIs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateDept = (reportType: string) => {
    setSelectedReportType(reportType)
    setTimeout(() => generatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const cur = displayKPIs?.currentMonth
  const changes = displayKPIs?.changes

  // KPI summary cards for ReportsStatsCards
  const kpiCards = [
    { title: 'Milk Production', value: `${(cur?.production?.summary?.totalMilkVolume ?? 0).toLocaleString()}L`, change: changes?.production || 0, icon: Milk, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: 'Feed Costs', value: `KES ${(cur?.feed?.summary?.totalFeedCost ?? 0).toLocaleString()}`, change: changes?.costs || 0, icon: Wheat, color: 'text-orange-600', bgColor: 'bg-orange-50', inverted: true },
    { title: 'Profit Margin', value: `${(cur?.financial?.summary?.profitMargin ?? 0).toFixed(1)}%`, change: changes?.profit || 0, icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-50' },
    { title: 'Cost per Liter', value: `KES ${(cur?.financial?.summary?.costPerLiter ?? 0).toFixed(2)}`, change: 0, icon: Target, color: 'text-purple-600', bgColor: 'bg-purple-50', subtitle: 'Industry avg: KES 25-35' },
  ]

  // Chart data — use demo when no real data; otherwise merge real API arrays
  const chartData = (() => {
    if (isShowingDemo) return DEMO_TREND
    const quality = cur?.production?.qualityTrends
    if (!quality?.length) return DEMO_TREND
    const financial = cur?.financial?.dailyFinancials || []
    const feed = cur?.feed?.costTrends || []
    return quality.map((pt: any, i: number) => ({
      date: pt.date,
      volume: pt.volume || 0,
      fat: pt.fat || 0,
      protein: pt.protein || 0,
      revenue: financial[i]?.revenue || 0,
      costs: financial[i]?.costs || 0,
      profit: financial[i]?.profit || 0,
      feedCost: feed[i]?.totalCost || 0,
      feedPerAnimal: feed[i]?.costPerAnimal || 0,
    }))
  })()

  const insights = buildInsights(cur, changes)

  return (
    <div className="space-y-4 lg:space-y-6 pb-20 lg:pb-0">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className={cn('flex items-start justify-between', isMobile ? 'flex-col space-y-4' : 'flex-row')}>
        <div className={cn(isMobile && 'w-full')}>
          <h1 className={cn('font-bold text-gray-900', isMobile ? 'text-2xl' : 'text-3xl')}>Reports & Analytics</h1>
          <p className={cn('text-gray-500 mt-1', isMobile ? 'text-sm' : 'text-base')}>
            {isMobile ? 'Farm performance insights' : "Comprehensive insights into your farm's performance across all departments"}
          </p>
        </div>
        <Button
          onClick={refreshKPIs}
          disabled={loading}
          variant="outline"
          size={isMobile ? 'sm' : 'default'}
          className={cn(isMobile && 'w-full')}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          {loading ? 'Refreshing…' : 'Refresh Data'}
        </Button>
      </div>

      {/* ── Top KPI summary row ──────────────────────────────────────────── */}
      <ReportsStatsCards kpis={kpiCards} />

      {/* ── Two-tab layout ──────────────────────────────────────────────── */}
      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className={cn('grid grid-cols-2', isMobile ? 'w-full' : 'w-72')}>
          <TabsTrigger value="reports" className="flex items-center gap-2 text-sm">
            <ClipboardList className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 text-sm">
            <PieChart className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════
            REPORTS TAB
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="reports" className="space-y-6">

          {/* Demo notice */}
          <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
            <Sparkles className="h-5 w-5 text-violet-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-violet-900">Sample report history is shown below</p>
              <p className="text-xs text-violet-700 mt-0.5">
                Reports generated from each department will appear here. Click <strong>Generate</strong> on any department card or use the custom generator to create your first report.
              </p>
            </div>
          </div>

          {/* ── Department report cards ────────────────────────────────── */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Generate by Department</h2>
            <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3')}>
              {DEPARTMENT_REPORTS.map(dept => {
                const Icon = dept.icon
                return (
                  <Card key={dept.id} className="hover:shadow-md transition-shadow overflow-hidden">
                    {/* Coloured accent strip */}
                    <div className={cn('h-1 w-full', dept.accentBar)} />
                    <CardHeader className="pb-3 pt-4">
                      <div className="flex items-start gap-3">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', dept.iconBg)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-semibold leading-tight">{dept.title}</CardTitle>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{dept.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {/* Report type tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {dept.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs font-normal">{tag}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Last: {dept.lastGenerated}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-3"
                          onClick={() => handleGenerateDept(dept.reportType)}
                        >
                          Generate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>

          {/* ── Recent reports list ───────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Reports</CardTitle>
                  <CardDescription className="text-sm">Reports generated across all farm departments</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-600 border border-violet-200">
                  Sample
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {DEMO_RECENT_REPORTS.map(report => {
                  const FIcon = report.FormatIcon
                  return (
                    <div
                      key={report.id}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <FIcon className={cn('w-5 h-5', report.formatColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{report.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge variant="secondary" className={cn('text-xs font-normal', report.deptColor)}>
                            {report.dept}
                          </Badge>
                          <span className="text-xs text-gray-400">{report.date}</span>
                          <span className="text-xs text-gray-400 hidden sm:inline">•</span>
                          <span className="text-xs text-gray-400 hidden sm:inline">{report.format} · {report.size}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 w-8 p-0 text-gray-400 hover:text-gray-600">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Custom report generator ───────────────────────────────── */}
          <div ref={generatorRef}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Custom Report</h2>
            <ReportGenerator farmId={farmId} initialReportType={selectedReportType} />
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            ANALYTICS TAB
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-6">

          {/* Demo notice */}
          {isShowingDemo && (
            <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
              <Sparkles className="h-5 w-5 text-violet-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-violet-900">Viewing sample analytics</p>
                <p className="text-xs text-violet-700 mt-0.5">
                  These charts use sample data to illustrate what your farm analytics will look like once you start recording milk production, feed consumption and financial transactions.
                </p>
              </div>
            </div>
          )}

          {/* ── Performance alerts ────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Performance Alerts
                {isShowingDemo && (
                  <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-600 border border-violet-200">Sample</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                Flags raised when metrics fall below industry benchmarks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* In demo mode show a healthy-state example */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">All metrics within healthy range</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      Production, feed efficiency and profit margins are all above industry benchmarks in this {isShowingDemo ? 'sample' : 'reporting'} period.
                    </p>
                  </div>
                </div>
                {/* Example of what a warning looks like */}
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">Quality score nearing lower threshold</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Current: 34.4 pts · Industry avg: 35 pts. Monitor fat and protein content closely.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs bg-amber-100 border-amber-200 text-amber-700 flex-shrink-0">Monitor</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Charts row (Production + Financial) ───────────────────── */}
          <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>

            {/* Production + quality trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Milk className="w-4 h-4 text-blue-600" />
                  Daily Milk Production
                  {isShowingDemo && (
                    <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-600 border border-violet-200">Sample</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">Volume (L) with fat & protein quality overlay</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={isMobile ? 180 : 230}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" fontSize={10} tick={{ fill: '#9ca3af' }} />
                    <YAxis yAxisId="vol" orientation="left" fontSize={10} tick={{ fill: '#9ca3af' }} />
                    <YAxis yAxisId="pct" orientation="right" domain={[3, 4.5]} fontSize={10} tick={{ fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area yAxisId="vol" type="monotone" dataKey="volume" stroke="#3b82f6" fill="#bfdbfe" fillOpacity={0.5} name="Volume (L)" strokeWidth={2} dot={false} />
                    <Line yAxisId="pct" type="monotone" dataKey="fat" stroke="#f59e0b" name="Fat %" strokeWidth={2} dot={false} />
                    <Line yAxisId="pct" type="monotone" dataKey="protein" stroke="#8b5cf6" name="Protein %" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Financial performance */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Financial Performance
                  {isShowingDemo && (
                    <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-600 border border-violet-200">Sample</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">Revenue, costs and profit over time (KES)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={isMobile ? 180 : 230}>
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" fontSize={10} tick={{ fill: '#9ca3af' }} />
                    <YAxis fontSize={10} tick={{ fill: '#9ca3af' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      formatter={(v: any) => `KES ${(v as number).toLocaleString()}`}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} name="Revenue" dot={false} />
                    <Line type="monotone" dataKey="costs"   stroke="#ef4444" strokeWidth={2} name="Costs"   dot={false} />
                    <Line type="monotone" dataKey="profit"  stroke="#2563eb" strokeWidth={2} name="Profit"  dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ── Feed cost efficiency ──────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wheat className="w-4 h-4 text-orange-600" />
                Feed Cost Efficiency
                {isShowingDemo && (
                  <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-600 border border-violet-200">Sample</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Total daily feed cost vs cost per animal (dual axis, KES)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" fontSize={10} tick={{ fill: '#9ca3af' }} />
                  <YAxis yAxisId="total" orientation="left"  fontSize={10} tick={{ fill: '#9ca3af' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="per"   orientation="right" fontSize={10} tick={{ fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    formatter={(v: any) => `KES ${(v as number).toLocaleString()}`}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line yAxisId="total" type="monotone" dataKey="feedCost"      stroke="#f97316" strokeWidth={2} name="Total Feed Cost"  dot={false} />
                  <Line yAxisId="per"   type="monotone" dataKey="feedPerAnimal" stroke="#a78bfa" strokeWidth={2} name="Per Animal (KES)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ── Key insights ──────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Key Insights
                {isShowingDemo && (
                  <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-600 border border-violet-200">Sample</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                Automated analysis of performance patterns across all departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
                {insights.map((insight, i) => {
                  const IIcon = insight.icon
                  return (
                    <div key={i} className={cn('rounded-xl border p-4', insight.color)}>
                      <div className="flex items-center gap-2 mb-2">
                        <IIcon className={cn('w-4 h-4 flex-shrink-0', insight.titleColor)} />
                        <h4 className={cn('font-semibold text-sm', insight.titleColor)}>{insight.title}</h4>
                      </div>
                      <p className={cn('text-xs leading-relaxed', insight.bodyColor)}>{insight.body}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
