import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'

export interface ExportData {
  title: string
  summary: any
  tableData: any[]
  chartData?: any[]
  metadata: {
    farmName: string
    generatedDate: string
    reportPeriod: string
  }
}

export async function exportToPDF(data: ExportData): Promise<Blob> {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.text(data.title, 20, 20)
  
  doc.setFontSize(12)
  doc.text(`Farm: ${data.metadata.farmName}`, 20, 35)
  doc.text(`Period: ${data.metadata.reportPeriod}`, 20, 45)
  doc.text(`Generated: ${data.metadata.generatedDate}`, 20, 55)
  
  // Summary section
  let yPosition = 75
  doc.setFontSize(16)
  doc.text('Summary', 20, yPosition)
  
  yPosition += 15
  doc.setFontSize(10)
  
  Object.entries(data.summary).forEach(([key, value]) => {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    doc.text(`${label}: ${value}`, 20, yPosition)
    yPosition += 8
  })
  
  // Table data
  if (data.tableData.length > 0) {
    yPosition += 15
    doc.setFontSize(16)
    doc.text('Detailed Data', 20, yPosition)
    
    const columns = Object.keys(data.tableData[0]).map(key => ({
      header: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      dataKey: key
    }))
    
    ;(doc as any).autoTable({
      columns,
      body: data.tableData,
      startY: yPosition + 10,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74] } // farm-green
    })
  }
  
  return doc.output('blob')
}

export async function exportToExcel(data: ExportData): Promise<Blob> {
  const workbook = XLSX.utils.book_new()
  
  // Summary worksheet
  const summaryData = Object.entries(data.summary).map(([key, value]) => ({
    Metric: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
    Value: value
  }))
  
  const summaryWS = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summaryWS, 'Summary')
  
  // Detailed data worksheet
  if (data.tableData.length > 0) {
    const dataWS = XLSX.utils.json_to_sheet(data.tableData)
    XLSX.utils.book_append_sheet(workbook, dataWS, 'Detailed Data')
  }
  
  // Chart data worksheet (if available)
  if (data.chartData && data.chartData.length > 0) {
    const chartWS = XLSX.utils.json_to_sheet(data.chartData)
    XLSX.utils.book_append_sheet(workbook, chartWS, 'Chart Data')
  }
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

export function formatPercentage(num: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(num / 100)
}