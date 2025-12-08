// app/api/farms/[farmId]/animals/[id]/scheduled-feedings/[scheduledId]/complete/route.ts
// Enhanced version to handle actual feeding time input

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { completeScheduledFeeding } from '@/lib/database/scheduledFeedings'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string; id: string; scheduledId: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { farmId, scheduledId } = await params
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check permissions for completing scheduled feedings
    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { actualFeedingTime, lateReason } = body

    // Validate actualFeedingTime if provided
    if (actualFeedingTime) {
      const actualTime = new Date(actualFeedingTime)
      const now = new Date()
      
      if (isNaN(actualTime.getTime())) {
        return NextResponse.json({ 
          error: 'Invalid actual feeding time format' 
        }, { status: 400 })
      }
      
      if (actualTime > now) {
        return NextResponse.json({ 
          error: 'Actual feeding time cannot be in the future' 
        }, { status: 400 })
      }

      // Reasonable bounds check - not more than 30 days ago
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
      if (actualTime < thirtyDaysAgo) {
        return NextResponse.json({ 
          error: 'Actual feeding time cannot be more than 30 days ago' 
        }, { status: 400 })
      }
    }

    // Validate late reason if provided
    if (lateReason && typeof lateReason !== 'string') {
      return NextResponse.json({ 
        error: 'Late reason must be a string' 
      }, { status: 400 })
    }

    if (lateReason && lateReason.trim().length > 500) {
      return NextResponse.json({ 
        error: 'Late reason cannot exceed 500 characters' 
      }, { status: 400 })
    }

    const result = await completeScheduledFeeding(
      scheduledId,
      user.id,
      actualFeedingTime,
      lateReason?.trim()
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Enhanced response with detailed information
    const responseData = {
      success: true,
      data: result.data,
      message: generateCompletionMessage(result.data),
      timing: {
        wasActuallyLate: result.data.wasLate,
        wasRecordedLate: result.data.wasRecordedLate,
        lateByMinutes: result.data.lateByMinutes,
        actualFeedingTime: result.data.actualFeedingTime,
        recordedAt: result.data.recordedAt
      }
    }

    return NextResponse.json(responseData)
    
  } catch (error) {
    console.error('Complete scheduled feeding API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 })
  }
}

// Helper function to generate appropriate completion message
function generateCompletionMessage(data: any): string {
  const { wasLate, wasRecordedLate, lateByMinutes } = data
  
  if (wasLate && wasRecordedLate) {
    return `Feeding was completed ${lateByMinutes} minutes late and recorded with additional delay`
  } else if (wasLate && !wasRecordedLate) {
    return `Feeding was completed ${lateByMinutes} minutes late but recorded promptly`
  } else if (!wasLate && wasRecordedLate) {
    return `Feeding was completed on time but recorded late`
  } else {
    return `Feeding was completed and recorded on time`
  }
}