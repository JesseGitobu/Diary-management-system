// src/app/api/farms/[farmId]/feed-waste/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getWasteRecords, createWasteRecord } from '@/lib/database/feedWaste'

type Params = { params: Promise<{ farmId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { farmId } = await params
  const { searchParams } = new URL(req.url)

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const records = await getWasteRecords(farmId, {
    fromDate: searchParams.get('from') ?? undefined,
    toDate: searchParams.get('to') ?? undefined,
    feedTypeId: searchParams.get('feed_type_id') ?? undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
  })

  return NextResponse.json({ records })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { farmId } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (!body.feed_type_id || !body.waste_kg || body.waste_kg <= 0) {
    return NextResponse.json(
      { error: 'feed_type_id and waste_kg (> 0) are required' },
      { status: 400 }
    )
  }

  const result = await createWasteRecord(farmId, body, user.id)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ record: result.data }, { status: 201 })
}
