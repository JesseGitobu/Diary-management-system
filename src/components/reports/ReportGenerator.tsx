'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Download, FileText, FileSpreadsheet } from 'lucide-react'
import { exportToPDF, exportToExcel, downloadFile, formatCurrency, formatNumber } from '@/lib/utils/export'
import { format, subDays, subMonths } from 'date-fns'

interface ReportGeneratorProps {
  farmId: string
}

export function ReportGenerator({ farmId }: ReportGeneratorProps) {
  const [reportConfig, setReportConfig] = useState({
    reportType: 'comprehensive',
    dateRange: 'month',
    customStartDate: '',
    customEndDate: '',
    includeCharts: true,
    includeAnimals: true,
    exportFormat: 'pdf'
  })
  const [loading, setLoading] = useState(false)
  
  const generateReport = async () => {
    setLoading(true)
    
    try {
      // Calculate date range
      let startDate, endDate
      const today = new Date()
      
      switch (reportConfig.dateRange) {
        case 'week':
          startDate = subDays(today, 7)
          endDate = today
          break
        case 'month':
          startDate = subMonths(today, 1)
          endDate = today
          break
        case 'quarter':
          startDate = subMonths(today, 3)
          endDate = today
          break
        case 'custom':
          startDate = new Date(reportConfig.customStartDate)
          endDate = new Date(reportConfig.customEndDate)
          break
        default:
          startDate = subMonths(today, 1)
          endDate = today
      }
      
      // Fetch report data
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: reportConfig.reportType,
          dateRange: {
            start: format(startDate, 'yyyy-MM-dd'),
            end: format(endDate, 'yyyy-MM-dd')
          }
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      // Prepare export data
      const exportData = {
        title: `${reportConfig.reportType.charAt(0).toUpperCase() + reportConfig.reportType.slice(1)} Report`,
        summary: formatSummaryForExport(result.data, reportConfig.reportType),
        tableData: formatTableDataForExport(result.data, reportConfig.reportType),
        chartData: reportConfig.includeCharts ? formatChartDataForExport(result.data) : undefined,
        metadata: {
          farmName: 'Your Farm', // TODO: Get actual farm name
          generatedDate: format(new Date(), 'PPP'),
          reportPeriod: `${format(startDate, 'PPP')} - ${format(endDate, 'PPP')}`
        }
      }
      
      // Generate and download file
      let blob: Blob
      let filename: string
      
      if (reportConfig.exportFormat === 'pdf') {
        blob = await exportToPDF(exportData)
        filename = `${reportConfig.reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      } else {
        blob = await exportToExcel(exportData)
        filename = `${reportConfig.reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      }
      
      downloadFile(blob, filename)
      
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const formatSummaryForExport = (data: any, reportType: string) => {
    switch (reportType) {
      case 'production':
        return {
          'Total Milk Volume': `${formatNumber(data.summary.totalMilkVolume)} L`,
          'Average Daily Production': `${formatNumber(data.summary.averageDailyProduction)} L`,
          'Average Fat Content': `${formatNumber(data.summary.averageFatContent)}%`,
          'Average Protein Content': `${formatNumber(data.summary.averageProteinContent)}%`,
          'Days Reported': data.summary.daysReported,
          'Animals Reported': data.summary.animalsReported
        }
      case 'feed':
        return {
          'Total Feed Cost': formatCurrency(data.summary.totalFeedCost),
          'Total Feed Quantity': `${formatNumber(data.summary.totalFeedQuantity)} kg`,
          'Average Daily Cost': formatCurrency(data.summary.averageDailyCost),
          'Average Cost Per Animal': formatCurrency(data.summary.averageCostPerAnimal),
          'Days Reported': data.summary.daysReported,
          'Feed Types Used': data.summary.feedTypesUsed
        }
      case 'financial':
        return {
          'Total Revenue': formatCurrency(data.summary.totalRevenue),
          'Total Costs': formatCurrency(data.summary.totalCosts),
          'Gross Profit': formatCurrency(data.summary.grossProfit),
          'Profit Margin': `${formatNumber(data.summary.profitMargin)}%`,
          'Cost Per Liter': formatCurrency(data.summary.costPerLiter),
          'Revenue Per Liter': formatCurrency(data.summary.revenuePerLiter),
          'Days Analyzed': data.summary.daysAnalyzed
        }
      case 'comprehensive':
        return {
          'Milk Production': `${formatNumber(data.production.summary.totalMilkVolume)} L`,
          'Feed Costs': formatCurrency(data.feed.summary.totalFeedCost),
          'Gross Profit': formatCurrency(data.financial.summary.grossProfit),
          'Profit Margin': `${formatNumber(data.financial.summary.profitMargin)}%`,
          'Feed Efficiency': formatNumber(data.production.summary.totalMilkVolume / data.feed.summary.totalFeedQuantity),
          'Quality Score': formatNumber((data.production.summary.averageFatContent * 0.4 + data.production.summary.averageProteinContent * 0.6) * 10)
        }
      default:
        return {}
    }
  }
  
  const formatTableDataForExport = (data: any, reportType: string) => {
    switch (reportType) {
      case 'production':
        return data.dailyData?.map((day: any) => ({
          Date: format(new Date(day.record_date), 'yyyy-MM-dd'),
          'Total Volume (L)': formatNumber(day.total_milk_volume),
          'Average Fat (%)': formatNumber(day.average_fat_content),
          'Average Protein (%)': formatNumber(day.average_protein_content),
          'Animals Milked': day.animals_milked,
          'Sessions Recorded': day.sessions_recorded
        })) || []
      case 'feed':
        return data.dailyData?.map((day: any) => ({
          Date: format(new Date(day.summary_date), 'yyyy-MM-dd'),
          'Total Cost ($)': formatNumber(day.total_feed_cost),
          'Total Quantity (kg)': formatNumber(day.total_quantity_kg),
          'Cost Per Animal ($)': formatNumber(day.cost_per_animal),
          'Animals Fed': day.animals_fed,
          'Feed Types Used': day.feed_types_used
        })) || []
      case 'financial':
        return data.dailyFinancials?.map((day: any) => ({
          Date: format(new Date(day.date), 'yyyy-MM-dd'),
          'Revenue ($)': formatNumber(day.revenue),
          'Costs ($)': formatNumber(day.costs),
          'Profit ($)': formatNumber(day.profit),
          'Milk Volume (L)': formatNumber(day.milkVolume)
        })) || []
      default:
        return []
    }
  }
  
  const formatChartDataForExport = (data: any) => {
    // Return the most relevant chart data based on report type
    return data.production?.qualityTrends || data.feed?.costTrends || data.financial?.dailyFinancials || []
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Custom Report</CardTitle>
          <CardDescription>
            Create detailed reports for your farm operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select 
                value={reportConfig.reportType} 
                onValueChange={(value) => setReportConfig({...reportConfig, reportType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production Report</SelectItem>
                  <SelectItem value="feed">Feed Management Report</SelectItem>
                  <SelectItem value="financial">Financial Analysis</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <Select 
                value={reportConfig.dateRange} 
                onValueChange={(value) => setReportConfig({...reportConfig, dateRange: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Custom Date Range */}
          {reportConfig.dateRange === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  type="date"
                  value={reportConfig.customStartDate}
                  onChange={(e) => setReportConfig({...reportConfig, customStartDate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  type="date"
                  value={reportConfig.customEndDate}
                  onChange={(e) => setReportConfig({...reportConfig, customEndDate: e.target.value})}
                />
              </div>
            </div>
          )}
          
          {/* Report Options */}
          <div className="space-y-3">
            <Label>Report Options</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeCharts"
                checked={reportConfig.includeCharts}
                onCheckedChange={(checked) => setReportConfig({...reportConfig, includeCharts: !!checked})}
              />
              <Label htmlFor="includeCharts">Include charts and visualizations</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeAnimals"
                checked={reportConfig.includeAnimals}
                onCheckedChange={(checked) => setReportConfig({...reportConfig, includeAnimals: !!checked})}
              />
              <Label htmlFor="includeAnimals">Include individual animal data</Label>
            </div>
          </div>
          
          {/* Export Format */}
          <div>
            <Label>Export Format</Label>
            <div className="flex space-x-4 mt-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="pdf"
                  checked={reportConfig.exportFormat === 'pdf'}
                  onChange={(e) => setReportConfig({...reportConfig, exportFormat: e.target.value})}
                />
                <FileText className="h-4 w-4" />
                <span>PDF</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="excel"
                  checked={reportConfig.exportFormat === 'excel'}
                  onChange={(e) => setReportConfig({...reportConfig, exportFormat: e.target.value})}
                />
                <FileSpreadsheet className="h-4 w-4" />
                <span>Excel</span>
              </label>
            </div>
          </div>
          
          {/* Generate Button */}
          <Button 
            onClick={generateReport} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Generating Report...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate & Download Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {/* Quick Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reports</CardTitle>
          <CardDescription>
            Generate common reports instantly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col justify-center"
              onClick={() => {
                setReportConfig({...reportConfig, reportType: 'production', dateRange: 'month'})
                generateReport()
              }}
            >
              <FileText className="h-6 w-6 mb-2" />
              <span>Monthly Production</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex flex-col justify-center"
              onClick={() => {
                setReportConfig({...reportConfig, reportType: 'financial', dateRange: 'quarter'})
                generateReport()
              }}
            >
              <FileSpreadsheet className="h-6 w-6 mb-2" />
              <span>Quarterly Financial</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex flex-col justify-center"
              onClick={() => {
                setReportConfig({...reportConfig, reportType: 'comprehensive', dateRange: 'month'})
                generateReport()
              }}
            >
              <Download className="h-6 w-6 mb-2" />
              <span>Complete Farm Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}