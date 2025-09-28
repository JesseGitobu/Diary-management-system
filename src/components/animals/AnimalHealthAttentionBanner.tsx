// src/components/animals/AnimalHealthAttentionBanner.tsx
'use client'

import { useState, useEffect } from 'react'
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
  Stethoscope,
  FileText,
  Heart,
  Shield
} from 'lucide-react'

interface AnimalHealthAttentionBannerProps {
  animalId: string
  onCompleteRecord?: (recordId: string) => void
  onCreateRecord?: () => void
}

interface HealthAttentionRecord {
  id: string
  tag_number: string
  name?: string
  breed?: string
  health_status: string
  requires_health_record: boolean
  health_record_created: boolean
  health_record_completed: boolean
  health_concern_notes?: string
  auto_health_record_id?: string
  health_record_id?: string
  record_type?: string
  health_record_description?: string
  severity?: string
  completion_status?: string
  is_auto_generated?: boolean
  health_record_created_at?: string
}

export function AnimalHealthAttentionBanner({ 
  animalId, 
  onCompleteRecord,
  onCreateRecord
}: AnimalHealthAttentionBannerProps) {
  const [attentionData, setAttentionData] = useState<HealthAttentionRecord | null>(null)
  const [requiresAttention, setRequiresAttention] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  
  const { isMobile } = useDeviceInfo()
  
  useEffect(() => {
    loadHealthAttentionStatus()
  }, [animalId])
  
  const loadHealthAttentionStatus = async () => {
    try {
      const response = await fetch(`/api/animals/${animalId}/health-attention`)
      if (response.ok) {
        const data = await response.json()
        setRequiresAttention(data.requiresAttention)
        setAttentionData(data.record)
      }
    } catch (error) {
      console.error('Error loading health attention status:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading || !requiresAttention || !attentionData || dismissed) {
    return null
  }
  
  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'sick': return 'text-red-600 bg-red-50 border-red-200'
      case 'requires_attention': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'quarantined': return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getHealthStatusLabel = (status: string) => {
    switch (status) {
      case 'sick': return 'Sick'
      case 'requires_attention': return 'Requires Attention'
      case 'quarantined': return 'Quarantined'
      default: return status
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRecordTypeIcon = (type?: string) => {
    switch (type) {
      case 'illness': return <Heart className="w-4 h-4 text-red-600" />
      case 'checkup': return <Stethoscope className="w-4 h-4 text-purple-600" />
      case 'treatment': return <Shield className="w-4 h-4 text-green-600" />
      default: return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  // Determine banner type and message
  const getBannerConfig = () => {
    if (attentionData.health_record_created && !attentionData.health_record_completed) {
      return {
        type: 'complete',
        title: 'Health Record Needs Completion',
        message: 'An automatic health record was created but needs additional details.',
        action: 'Complete Record',
        icon: <Clock className="w-5 h-5 text-orange-600" />,
        bgColor: 'bg-gradient-to-r from-orange-50 to-yellow-50',
        borderColor: 'border-orange-200'
      }
    } else if (attentionData.requires_health_record && !attentionData.health_record_created) {
      return {
        type: 'create',
        title: 'Health Record Required',
        message: 'This animal has a concerning health status but no health record exists.',
        action: 'Create Health Record',
        icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
        bgColor: 'bg-gradient-to-r from-red-50 to-pink-50',
        borderColor: 'border-red-200'
      }
    } else {
      return null
    }
  }

  const bannerConfig = getBannerConfig()
  if (!bannerConfig) return null
  
  return (
    <Card className={cn(
      bannerConfig.borderColor,
      bannerConfig.bgColor,
      isMobile ? "mx-0 mb-4" : "mb-6"
    )}>
      <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {bannerConfig.icon}
            </div>
            <div>
              <h3 className={cn(
                "font-medium",
                isMobile ? "text-sm" : "text-base",
                bannerConfig.type === 'complete' ? "text-orange-900" : "text-red-900"
              )}>
                {bannerConfig.title}
              </h3>
              <p className={cn(
                isMobile ? "text-xs" : "text-sm",
                bannerConfig.type === 'complete' ? "text-orange-700" : "text-red-700"
              )}>
                {bannerConfig.message}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className={cn(
              "h-8 w-8 p-0",
              bannerConfig.type === 'complete' 
                ? "text-orange-600 hover:text-orange-800 hover:bg-orange-100"
                : "text-red-600 hover:text-red-800 hover:bg-red-100"
            )}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Animal and Health Info */}
        <div className="bg-white rounded-lg p-3 mb-4 border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium">
                  {attentionData.name || `Animal ${attentionData.tag_number}`}
                </span>
                <span className="text-gray-400">#{attentionData.tag_number}</span>
                <Badge className={getHealthStatusColor(attentionData.health_status)}>
                  {getHealthStatusLabel(attentionData.health_status)}
                </Badge>
              </div>
              
              {attentionData.health_concern_notes && (
                <p className={cn(
                  "text-gray-600 mb-2",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  <strong>Notes:</strong> {attentionData.health_concern_notes}
                </p>
              )}
              
              {/* Show existing record details if available */}
              {attentionData.health_record_description && (
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2 mb-1">
                    {getRecordTypeIcon(attentionData.record_type)}
                    <span className={cn(
                      "font-medium",
                      isMobile ? "text-xs" : "text-sm"
                    )}>
                      {(attentionData.record_type ?? 'General').charAt(0).toUpperCase() + (attentionData.record_type ?? 'General').slice(1)} Record
                    </span>
                    {attentionData.severity && (
                      <Badge className={cn("text-xs", getSeverityColor(attentionData.severity))}>
                        {attentionData.severity.toUpperCase()}
                      </Badge>
                    )}
                    {attentionData.is_auto_generated && (
                      <Badge variant="outline" className="text-xs">
                        Auto-generated
                      </Badge>
                    )}
                  </div>
                  <p className={cn(
                    "text-gray-700",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {attentionData.health_record_description}
                  </p>
                  {attentionData.health_record_created_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {new Date(attentionData.health_record_created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className={cn(
          "flex gap-2",
          isMobile ? "flex-col" : ""
        )}>
          {bannerConfig.type === 'complete' && attentionData.health_record_id ? (
            <Button
              size="sm"
              className={cn(
                "bg-orange-600 hover:bg-orange-700 text-white",
                isMobile && "w-full"
              )}
              onClick={() => onCompleteRecord?.(attentionData.health_record_id!)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {bannerConfig.action}
            </Button>
          ) : (
            <Button
              size="sm"
              className={cn(
                "bg-red-600 hover:bg-red-700 text-white",
                isMobile && "w-full"
              )}
              onClick={() => onCreateRecord?.()}
            >
              <FileText className="w-4 h-4 mr-2" />
              {bannerConfig.action}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className={cn(
              bannerConfig.type === 'complete'
                ? "border-orange-300 text-orange-700 hover:bg-orange-100"
                : "border-red-300 text-red-700 hover:bg-red-100",
              isMobile && "w-full"
            )}
            onClick={() => {
              // Navigate to the animal's overview to update health status
              window.location.href = `/dashboard/animals/${animalId}?tab=overview&edit=true`
            }}
          >
            <Heart className="w-4 h-4 mr-2" />
            Update Health Status
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}