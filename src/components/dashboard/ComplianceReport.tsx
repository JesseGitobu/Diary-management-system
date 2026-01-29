// src/components/dashboard/ComplianceReport.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { FiDownload, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi'
import {Button} from '@/components/ui/Button'
import { ComplianceReport } from '@/lib/database/compliance-reports'

interface ComplianceReportProps {
  farmId: string
  animalId: string
  animalName: string
  onLoadingChange?: (loading: boolean) => void
}

export default function ComplianceReportComponent({
  farmId,
  animalId,
  animalName,
  onLoadingChange,
}: ComplianceReportProps) {
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(
          `/api/compliance/report/${animalId}?farmId=${farmId}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch report')
        }

        const { data } = await response.json()
        setReport(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching compliance report:', err)
        setError('Failed to load compliance report')
      } finally {
        setIsLoading(false)
        onLoadingChange?.(false)
      }
    }

    fetchReport()
  }, [farmId, animalId, onLoadingChange])

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setExporting(true)
      const response = await fetch(
        `/api/compliance/report/${animalId}?farmId=${farmId}&format=${format}`
      )

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = response.headers
        .get('content-disposition')
        ?.split('filename=')[1]
        ?.replace(/"/g, '') || `compliance-report.${format}`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting report:', err)
      setError('Failed to export report')
    } finally {
      setExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
        <p className="font-semibold">{error || 'Report not available'}</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Compliance Report</h1>
            <p className="text-gray-600 mt-1">
              Animal: <span className="font-semibold">{animalName}</span>
            </p>
            <p className="text-sm text-gray-500">
              Report ID: {report.reportId} | Generated:{' '}
              {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => handleExport('json')}
              disabled={exporting}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
            >
              <FiDownload size={16} />
              JSON
            </Button>
            <Button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
            >
              <FiDownload size={16} />
              CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Compliance Status */}
      <div
        className={`rounded-lg p-6 ${
          report.compliance.isComplete
            ? 'bg-green-50 border border-green-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}
      >
        <div className="flex items-start gap-4">
          {report.compliance.isComplete ? (
            <FiCheck className="text-green-600 flex-shrink-0 mt-1" size={24} />
          ) : (
            <FiAlertCircle className="text-yellow-600 flex-shrink-0 mt-1" size={24} />
          )}
          <div>
            <h2
              className={`text-xl font-bold ${
                report.compliance.isComplete ? 'text-green-900' : 'text-yellow-900'
              }`}
            >
              {report.compliance.isComplete
                ? 'Compliance Requirements Met'
                : 'Compliance Issues Detected'}
            </h2>
            {report.compliance.missingRecords.length > 0 && (
              <div className="mt-3">
                <p className="font-semibold text-gray-900 mb-2">Missing Records:</p>
                <ul className="list-disc list-inside space-y-1">
                  {report.compliance.missingRecords.map((record, i) => (
                    <li key={i} className="text-gray-800">
                      {record}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report.compliance.warnings.length > 0 && (
              <div className="mt-3">
                <p className="font-semibold text-gray-900 mb-2">Warnings:</p>
                <ul className="list-disc list-inside space-y-1">
                  {report.compliance.warnings.map((warning, i) => (
                    <li key={i} className="text-gray-800">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animal Information */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gray-100 px-6 py-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">Animal Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          <div>
            <p className="text-sm text-gray-600">Tag Number</p>
            <p className="text-lg font-semibold text-gray-900">{report.animal.tagNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="text-lg font-semibold text-gray-900">{report.animal.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Breed</p>
            <p className="text-lg font-semibold text-gray-900">{report.animal.breed}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Gender</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">
              {report.animal.gender}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Birth Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(report.animal.birthDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Current Status</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">
              {report.animal.currentStatus}
            </p>
          </div>
        </div>
      </div>

      {/* Audit Summary */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gray-100 px-6 py-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">Audit Summary</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <div>
            <p className="text-sm text-gray-600">Total Audit Events</p>
            <p className="text-2xl font-bold text-blue-600">
              {report.auditSummary.totalEvents}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Last Updated</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(report.auditSummary.lastUpdated).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Created Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(report.auditSummary.createdDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Last Status Change</p>
            <p className="text-lg font-semibold text-gray-900">
              {report.auditSummary.lastStatusChange === 'Never'
                ? 'Never'
                : new Date(report.auditSummary.lastStatusChange).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Health & Production */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health History */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gray-100 px-6 py-4 border-b">
            <h3 className="text-lg font-bold text-gray-900">Health History</h3>
          </div>
          <div className="space-y-4 p-6">
            <div>
              <p className="text-sm text-gray-600">Health Status</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {report.healthHistory.healthStatus}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last Health Check</p>
              <p className="text-lg font-semibold text-gray-900">
                {report.healthHistory.lastHealthCheckDate === 'No records'
                  ? 'No records'
                  : new Date(report.healthHistory.lastHealthCheckDate).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Health Records</p>
              <p className="text-lg font-semibold text-gray-900">
                {report.healthHistory.recordsCount} records
              </p>
            </div>
          </div>
        </div>

        {/* Production History */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gray-100 px-6 py-4 border-b">
            <h3 className="text-lg font-bold text-gray-900">Production History</h3>
          </div>
          <div className="space-y-4 p-6">
            <div>
              <p className="text-sm text-gray-600">Current Daily Production</p>
              <p className="text-lg font-semibold text-gray-900">
                {report.productionHistory.currentDailyProduction} L
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Days in Milk</p>
              <p className="text-lg font-semibold text-gray-900">
                {report.productionHistory.daysInMilk} days
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Lactation Number</p>
              <p className="text-lg font-semibold text-gray-900">
                {report.productionHistory.lactationNumber}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
