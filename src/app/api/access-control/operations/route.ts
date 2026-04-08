// src/app/api/access-control/operations/route.ts
// Returns the full resource_operations catalogue from the DB.
// Used by the AccessControlModal to build the permissions UI.
// All authenticated users can read (RLS: "Authenticated users can read resource operations").

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await (supabase as any)
      .from('resource_operations')
      .select('resource, operation_key, action_category, label, sort_order')
      .eq('is_active', true)
      .order('resource', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('❌ [GET /api/access-control/operations]', error)
      return NextResponse.json({ error: 'Failed to fetch operations' }, { status: 500 })
    }

    // Group into { resource: { action_category: [{ operation_key, label }] } }
    const grouped: Record<string, Record<string, { operation_key: string; label: string }[]>> = {}

    for (const row of (data || [])) {
      if (!grouped[row.resource]) grouped[row.resource] = {}
      if (!grouped[row.resource][row.action_category]) grouped[row.resource][row.action_category] = []
      grouped[row.resource][row.action_category].push({
        operation_key: row.operation_key,
        label: row.label,
      })
    }

    return NextResponse.json({ operations: grouped })
  } catch (error) {
    console.error('❌ [GET /api/access-control/operations]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
