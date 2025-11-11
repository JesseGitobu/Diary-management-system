//src/components/admin/BillingManagement.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle,
  Download
} from 'lucide-react'

interface BillingManagementProps {
  billingOverview: any
}

export function BillingManagement({ billingOverview }: BillingManagementProps) {
  const [selectedPlan, setSelectedPlan] = useState('all')
  const [exporting, setExporting] = useState(false)

  if (!billingOverview) {
    return <div>Loading billing data...</div>
  }

  const planPrices = {
    starter: 29,
    professional: 59,
    enterprise: 99
  }

  const handleExportRevenue = () => {
    setExporting(true)
    
    try {
      // Create CSV content
      const headers = ['Metric', 'Value']
      const rows = [
        ['Total MRR', `$${billingOverview.totalMRR}`],
        ['Active Subscriptions', billingOverview.active],
        ['Cancelled Subscriptions', billingOverview.cancelled],
        ['Past Due', billingOverview.pastDue],
        ['Starter Plan', billingOverview.planBreakdown.starter],
        ['Professional Plan', billingOverview.planBreakdown.professional],
        ['Enterprise Plan', billingOverview.planBreakdown.enterprise],
        ['Total Subscriptions', billingOverview.totalSubscriptions]
      ]
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `revenue-report-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      alert('Revenue report exported successfully!')
    } catch (error) {
      console.error('Error exporting revenue:', error)
      alert('Error exporting revenue report')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing Management</h1>
          <p className="text-gray-600 mt-2">
            Monitor subscriptions, revenue, and billing health
          </p>
        </div>
        
        <Button variant="outline" onClick={handleExportRevenue} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export Revenue Report'}
        </Button>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${billingOverview.totalMRR.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billingOverview.active}</div>
            <p className="text-xs text-muted-foreground">
              {billingOverview.totalSubscriptions} total subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2%</div>
            <p className="text-xs text-muted-foreground">
              -0.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billingOverview.pastDue}</div>
            <p className="text-xs text-muted-foreground">
              Past due accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>
              Distribution of active subscriptions by plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Starter ($29/month)</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{billingOverview.planBreakdown.starter}</div>
                  <div className="text-sm text-gray-500">
                    ${(billingOverview.planBreakdown.starter * planPrices.starter).toLocaleString()} MRR
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Professional ($59/month)</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{billingOverview.planBreakdown.professional}</div>
                  <div className="text-sm text-gray-500">
                    ${(billingOverview.planBreakdown.professional * planPrices.professional).toLocaleString()} MRR
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="font-medium">Enterprise ($99/month)</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{billingOverview.planBreakdown.enterprise}</div>
                  <div className="text-sm text-gray-500">
                    ${(billingOverview.planBreakdown.enterprise * planPrices.enterprise).toLocaleString()} MRR
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Health</CardTitle>
            <CardDescription>
              Current status of all subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Active Subscriptions</span>
                  <span>{billingOverview.active}/{billingOverview.totalSubscriptions}</span>
                </div>
                <Progress 
                  value={(billingOverview.active / billingOverview.totalSubscriptions) * 100} 
                  className="h-2"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{billingOverview.active}</div>
                  <div className="text-sm text-gray-500">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{billingOverview.cancelled}</div>
                  <div className="text-sm text-gray-500">Cancelled</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Billing Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Billing Activity</CardTitle>
          <CardDescription>
            Latest subscription changes and payment events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 border rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">New subscription - Professional Plan</span>
                  <span className="text-sm text-gray-500">2 hours ago</span>
                </div>
                <p className="text-sm text-gray-600">Sunny Acres Farm upgraded to Professional</p>
              </div>
              <Badge className="bg-green-100 text-green-800">+$59 MRR</Badge>
            </div>
            
            <div className="flex items-center space-x-4 p-4 border rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Payment failed</span>
                  <span className="text-sm text-gray-500">5 hours ago</span>
                </div>
                <p className="text-sm text-gray-600">Green Valley Farm - card expired</p>
              </div>
              <Badge variant="destructive">Action Required</Badge>
            </div>
            
            <div className="flex items-center space-x-4 p-4 border rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Subscription cancelled</span>
                  <span className="text-sm text-gray-500">1 day ago</span>
                </div>
                <p className="text-sm text-gray-600">Highland Dairy downgraded to free trial</p>
              </div>
              <Badge className="bg-red-100 text-red-800">-$29 MRR</Badge>
            </div>
            
            <div className="flex items-center space-x-4 p-4 border rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Invoice paid</span>
                  <span className="text-sm text-gray-500">2 days ago</span>
                </div>
                <p className="text-sm text-gray-600">Meadow View Farm - $99.00</p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">Paid</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}