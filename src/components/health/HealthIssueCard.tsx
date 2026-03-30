'use client'

import { AlertTriangle, Clock, Plus, MoreVertical, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatDistanceToNow } from 'date-fns'

interface HealthIssueCardProps {
  issue: any
  animal: any
  onCreateRecord?: (issueId: string) => void
  onMarkResolved?: (issueId: string) => void
  showCreateButton?: boolean
  isCreatingRecord?: boolean
}

const issueTypeLabels: Record<string, string> = {
  'injury': 'Injury',
  'illness': 'Illness',
  'behavior_change': 'Behavior Change',
  'poor_appetite': 'Poor Appetite',
  'lameness': 'Lameness',
  'respiratory': 'Respiratory',
  'reproductive': 'Reproductive',
  'other': 'Other'
}

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  'low': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'medium': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  'high': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'critical': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
}

const statusColors: Record<string, { badge: string; icon: any }> = {
  'open': { badge: 'bg-red-100 text-red-800', icon: AlertCircle },
  'in_progress': { badge: 'bg-yellow-100 text-yellow-800', icon: Clock },
  'under_observation': { badge: 'bg-blue-100 text-blue-800', icon: Clock },
  'resolved': { badge: 'bg-green-100 text-green-800', icon: CheckCircle2 }
}

export function HealthIssueCard({
  issue,
  animal,
  onCreateRecord,
  onMarkResolved,
  showCreateButton = true,
  isCreatingRecord = false
}: HealthIssueCardProps) {
  const severityColor = severityColors[issue.severity] || severityColors.medium
  const statusBadge = statusColors[issue.status] || statusColors.open
  const StatusIcon = statusBadge.icon

  const createdDate = new Date(issue.created_at)
  const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true })

  // Determine if issue is resolved or not
  const isResolved = issue.status === 'resolved'

  return (
    <Card className={`border-l-4 transition-all ${severityColor.border} ${severityColor.bg}`}>
      <div className="p-4">
        {/* Header: Type, Severity, Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">
                {issueTypeLabels[issue.issue_type] || issue.issue_type_custom || 'Health Issue'}
              </h3>
              <Badge variant="outline" className={`${severityColor.text} text-xs`}>
                {issue.severity?.charAt(0).toUpperCase() + issue.severity?.slice(1) || 'Medium'}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Badge className={statusBadge.badge}>
              <StatusIcon className="w-3 h-3 mr-1 inline" />
              {issue.status?.replace(/_/g, ' ').charAt(0).toUpperCase() + issue.status?.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Animal Info */}
        {animal && (
          <div className="mb-3 p-2 bg-white/50 rounded text-xs">
            <p className="font-medium text-gray-700">
              {animal.name || `Animal #${animal.tag_number}`}
              <span className="text-gray-500 ml-1">({animal.tag_number})</span>
            </p>
            {animal.breed && <p className="text-gray-600">{animal.breed}</p>}
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-gray-700 mb-3 leading-relaxed">
          {issue.description}
        </p>

        {/* Notes if available */}
        {issue.notes && (
          <div className="mb-3 p-2 bg-white/50 rounded text-xs text-gray-600 border-l-2 border-gray-300">
            <p className="font-medium mb-1">Notes:</p>
            <p>{issue.notes}</p>
          </div>
        )}

        {/* Severity-specific information */}
        {issue.severity === 'critical' && issue.alert_veterinarian && (
          <div className="mb-3 p-2 bg-red-100 rounded border border-red-300 text-xs text-red-800">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Veterinarian alert sent
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {showCreateButton && !isResolved && (
            <Button
              size="sm"
              onClick={() => onCreateRecord?.(issue.id)}
              disabled={isCreatingRecord}
              className="flex-1"
              variant="default"
            >
              <Plus className="w-4 h-4 mr-1" />
              {isCreatingRecord ? 'Creating...' : 'Create Record'}
            </Button>
          )}
          {onMarkResolved && !isResolved && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMarkResolved(issue.id)}
              className="flex-1"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Resolve
            </Button>
          )}
          {isResolved && (
            <div className="flex-1 flex items-center justify-center text-xs text-green-600 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Resolved
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
