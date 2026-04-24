// src/app/api/farms/[farmId]/feed-settings/alerts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import {
  getFeedAlertSettings,
  upsertAllFeedAlertSettings,
  ALERT_TYPE_META,
} from '@/lib/database/feedSettings'

// GET  /api/farms/[farmId]/feed-settings/alerts
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const settings = await getFeedAlertSettings(farmId)
    return NextResponse.json(settings)
  } catch (error) {
    console.error('GET feed alert settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT  /api/farms/[farmId]/feed-settings/alerts
// Body: array of { alert_type, threshold_value, is_enabled, notes? }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: 'Body must be a non-empty array of alert settings' }, { status: 400 })
    }

    for (const item of body) {
      if (!item.alert_type || !ALERT_TYPE_META[item.alert_type]) {
        return NextResponse.json({ error: `Invalid alert_type: ${item.alert_type}` }, { status: 400 })
      }
      if (item.threshold_value === undefined || item.threshold_value < 0) {
        return NextResponse.json(
          { error: `threshold_value must be >= 0 for ${item.alert_type}` },
          { status: 400 }
        )
      }
    }

    const result = await upsertAllFeedAlertSettings(farmId, body)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const updated = await getFeedAlertSettings(farmId)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT feed alert settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
