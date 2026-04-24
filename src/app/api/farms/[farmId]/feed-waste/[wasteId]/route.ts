// src/app/api/farms/[farmId]/feed-waste/[wasteId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { deleteWasteRecord } from '@/lib/database/feedWaste'
import { reverseInventoryTransaction } from '@/lib/database/feedInventoryTransactions'

type Params = { params: Promise<{ farmId: string; wasteId: string }> }

export async function DELETE(req: NextRequest, { params }: Params) {
  const { farmId, wasteId } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch the waste record to reverse its ledger entry
  const { data: wasteRecord, error: fetchError } = await (supabase as any)
    .from('feed_waste_records')
    .select('*, feed_inventory_transactions!inner(id, quantity_kg, feed_type_id)')
    .eq('id', wasteId)
    .eq('farm_id', farmId)
    .single()

  if (fetchError || !wasteRecord) {
    return NextResponse.json({ error: 'Waste record not found' }, { status: 404 })
  }

  // Find and reverse the matching ledger transaction
  const { data: txn } = await (supabase as any)
    .from('feed_inventory_transactions')
    .select('id, farm_id, feed_type_id, quantity_kg')
    .eq('reference_id', wasteId)
    .eq('reference_type', 'feed_waste_record')
    .single()

  if (txn) {
    await reverseInventoryTransaction(txn, user.id, `Reversal: waste record ${wasteId} deleted`)
  }

  const result = await deleteWasteRecord(farmId, wasteId)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
