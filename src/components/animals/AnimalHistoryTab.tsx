'use client'

import { useEffect, useState } from 'react'
import AnimalTimeline from '@/components/animals/AnimalTimeline'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { AlertCircle, Download } from 'lucide-react'

interface TimelineGroup {
  date: string
  events: any[]
}

interface AnimalHistoryTabProps {
  animalId: string
  animalName: string
  animalTag: string
  farmId: string
}

export function AnimalHistoryTab({ 
  animalId, 
  animalName, 
  animalTag,
  farmId 
}: AnimalHistoryTabProps) {
  const [timelineData, setTimelineData] = useState<TimelineGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isMobile } = useDeviceInfo()

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const url = `/api/audit-logs/animal/${animalId}?farmId=${farmId}&format=timeline`
        console.log('Fetching timeline from:', url)
        
        const response = await fetch(url)

        console.log('Response status:', response.status)
        const data = await response.json()
        console.log('Response data:', data)

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch timeline data')
        }

        setTimelineData(data.data || [])
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred'
        console.error('Error fetching timeline:', err)
        setError(errorMsg)
      } finally {
        setIsLoading(false)
      }
    }

    if (animalId && farmId) {
      fetchTimeline()
    }
  }, [animalId, farmId])

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(
        `/api/audit-logs/export?farmId=${farmId}&animalId=${animalId}&format=${format}`
      )

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `${animalTag}_history.${format}`
      
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="?([^"]+)"?/)
        if (matches) filename = matches[1]
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export data')
    }
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="font-medium text-red-900">Error Loading History</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className={cn(
          isMobile ? "px-4 py-3" : ""
        )}>
          <div className="flex flex-col space-y-2">
            <div>
              <CardTitle className={cn(
                isMobile ? "text-base" : ""
              )}>
                Timeline & History
              </CardTitle>
              <CardDescription className={cn(
                isMobile ? "text-sm" : ""
              )}>
                Complete audit trail of all changes to {animalName}
              </CardDescription>
            </div>

            {/* Export Buttons */}
            <div className={cn(
              "flex gap-2",
              isMobile ? "flex-col" : "flex-row justify-end"
            )}>
              <Button
                variant="outline"
                size={isMobile ? "default" : "sm"}
                onClick={() => handleExport('json')}
                disabled={isLoading || timelineData.length === 0}
                className={cn(
                  isMobile ? "w-full h-10 justify-center" : "text-sm"
                )}
              >
                <Download className={cn(
                  "mr-2",
                  isMobile ? "w-4 h-4" : "w-3 h-3"
                )} />
                Export JSON
              </Button>
              <Button
                variant="outline"
                size={isMobile ? "default" : "sm"}
                onClick={() => handleExport('csv')}
                disabled={isLoading || timelineData.length === 0}
                className={cn(
                  isMobile ? "w-full h-10 justify-center" : "text-sm"
                )}
              >
                <Download className={cn(
                  "mr-2",
                  isMobile ? "w-4 h-4" : "w-3 h-3"
                )} />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Timeline Component */}
      {timelineData.length > 0 ? (
        <AnimalTimeline
          animalId={animalId}
          animalName={animalName}
          logs={timelineData}
          isLoading={isLoading}
          onExport={handleExport}
        />
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <div className="text-gray-400 mb-4 text-4xl">📋</div>
              <h3 className={cn(
                "font-medium text-gray-900 mb-2",
                isMobile ? "text-sm" : ""
              )}>
                No History Available
              </h3>
              <p className={cn(
                "text-gray-600",
                isMobile ? "text-xs" : "text-sm"
              )}>
                {isLoading
                  ? 'Loading audit trail...'
                  : 'This animal has no recorded history yet. Events will appear as you add records.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
