// Fixed src/components/health/HealthNotificationBanner.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  X,
  ChevronRight,
  Bell,
  Heart,
  Shield,
  Stethoscope,
  FileText,
  Plus
} from 'lucide-react'

interface HealthNotificationBannerProps {
  farmId: string
  onRecordClick?: (recordId: string) => void
  missingRecords: MissingHealthRecord[]
  loading: boolean
}

interface MissingHealthRecord {
  id: string
  animal_id: string
  record_date: string
  record_type: string
  description: string
  severity?: string
  is_missing_record?: boolean
  animals?: {
    id: string
    tag_number: string
    name?: string
    breed?: string
  }
  // Handle both possible structures
  animal?: {
    id: string
    tag_number: string
    name?: string
    breed?: string
  }
}

export function HealthNotificationBanner({ 
  farmId, 
  onRecordClick,
  missingRecords,
  loading 
}: HealthNotificationBannerProps) {
  
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  
  const { isMobile } = useDeviceInfo()
  
  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'vaccination': return '💉'
      case 'treatment': return '💊'
      case 'checkup': return '🩺'
      case 'injury': return '🩹'
      case 'illness': return '🤒'
      default: return '📋'
    }
  }
  
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Helper function to safely get animal data
  const getAnimalData = (record: MissingHealthRecord) => {
    // Handle both possible structures from the API
    return record.animals || record.animal || {
      id: record.animal_id || '',
      tag_number: 'Unknown',
      name: null,
      breed: null
    }
  }
  
  if (loading || missingRecords.length === 0 || dismissed) {
    return null
  }
  
  const visibleRecords = expanded ? missingRecords : missingRecords.slice(0, 2)
  const hasMoreRecords = missingRecords.length > 2
  
  return (
    <Card className={cn(
      "border-red-200 bg-gradient-to-r from-red-50 to-orange-50",
      isMobile ? "mx-4 mb-4" : "mb-6"
    )}>
      <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className={cn(
                "font-medium text-red-900",
                isMobile ? "text-sm" : "text-base"
              )}>
                Animals Need Health Records
              </h3>
              <p className={cn(
                "text-red-700",
                isMobile ? "text-xs" : "text-sm"
              )}>
                {missingRecords.length} animal{missingRecords.length !== 1 ? 's' : ''} require{missingRecords.length === 1 ? 's' : ''} health record creation
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-red-600 hover:text-red-800 hover:bg-red-100 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Records List */}
        <div className="space-y-3">
          {visibleRecords.map((record, index) => {
            const animalData = getAnimalData(record)
            
            return (
              <div
                key={`${record.id}-${record.animal_id || 'unknown'}-${index}`}
                className={cn(
                  "flex items-center justify-between p-3 bg-white rounded-lg border transition-colors cursor-pointer hover:bg-red-50",
                  getSeverityColor(record.severity)
                )}
                onClick={() => {
                  // Open modal to create and complete record for this specific animal
                  if (onRecordClick) {
                    onRecordClick(record.id)
                  }
                }}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Missing Record Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-red-600" />
                    </div>
                  </div>
                  
                  {/* Animal Info */}
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "flex items-center space-x-2",
                      isMobile ? "flex-col items-start space-x-0 space-y-1" : ""
                    )}>
                      <span className="font-medium">
                        {animalData.name || `Animal ${animalData.tag_number}`}
                      </span>
                      <span className="text-gray-400">#{animalData.tag_number}</span>
                    </div>
                    
                    <p className={cn(
                      "text-gray-600 truncate",
                      isMobile ? "text-xs" : "text-sm"
                    )}>
                      {record.description || 'No health record exists for this animal'}
                    </p>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className="text-xs px-2 py-0.5 bg-red-100 text-red-800">
                        Missing Record
                      </Badge>
                      
                      <span className={cn(
                        "text-gray-500",
                        isMobile ? "text-xs" : "text-xs"
                      )}>
                        Attention needed
                      </span>
                      
                      {record.severity && (
                        <Badge className={cn(
                          "text-xs",
                          getSeverityColor(record.severity)
                        )}>
                          {record.severity.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Arrow */}
                <div className="flex-shrink-0">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Expand/Collapse Button */}
        {hasMoreRecords && (
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-red-600 hover:text-red-800 hover:bg-red-100"
            >
              {expanded ? (
                <>Show Less</>
              ) : (
                <>Show {missingRecords.length - 2} More</>
              )}
            </Button>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className={cn(
          "flex gap-2 mt-4 pt-4 border-t border-red-200",
          isMobile ? "flex-col" : ""
        )}>
          <Button
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-100"
            onClick={() => {
              // Navigate to health management
              window.location.href = '/dashboard/health'
            }}
          >
            <Heart className="w-4 h-4 mr-2" />
            View Health Dashboard
          </Button>
          
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => {
              // Open modal to create and complete record for the first animal
              if (visibleRecords.length > 0 && onRecordClick) {
                const firstRecord = visibleRecords[0]
                onRecordClick(firstRecord.id)
              }
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Health Records
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}