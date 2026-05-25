// app/api/distribution/records/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserRole, createServerSupabaseClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await createServerSupabaseClient()

    // ── Confirm delivery ─────────────────────────────────────────────────────
    if (body.action === 'confirm_delivery') {
      const { driverName, vehicleNumber, deliveryDate, deliveryTime, notes } = body

      // Upsert delivery log (unique constraint on distribution_record_id)
      const { error: deliveryError } = await (supabase as any)
        .from('distribution_delivery_logs')
        .upsert({
          distribution_record_id: params.id,
          farm_id: userRole.farm_id,
          driver_name: driverName || null,
          vehicle_number: vehicleNumber || null,
          delivery_date: deliveryDate,
          delivery_time: deliveryTime || null,
        }, { onConflict: 'distribution_record_id' })

      if (deliveryError) throw deliveryError

      // Update distribution record status
      const { data: record, error: recordError } = await (supabase as any)
        .from('distribution_records')
        .update({
          distribution_status: 'delivered',
          notes: notes || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .eq('farm_id', userRole.farm_id)
        .select(`
          *,
          distribution_channels(id, name, type, is_paid_for),
          distribution_delivery_logs(id, delivery_date, delivery_time, driver_name, vehicle_number),
          distribution_payment_records(id, payment_method, expected_payment_date, actual_payment_date, payment_status, amount_paid)
        `)
        .single()

      if (recordError) throw recordError
      return NextResponse.json(record)
    }

    // ── Confirm payment ──────────────────────────────────────────────────────
    if (body.action === 'confirm_payment') {
      const { paymentMethod, actualPaymentDate, amountPaid, reference } = body

      if (!actualPaymentDate || !amountPaid) {
        return NextResponse.json({ error: 'Payment date and amount are required' }, { status: 400 })
      }

      // Upsert payment record
      const { error: payError } = await (supabase as any)
        .from('distribution_payment_records')
        .upsert({
          distribution_record_id: params.id,
          farm_id: userRole.farm_id,
          payment_method: paymentMethod,
          actual_payment_date: actualPaymentDate,
          amount_paid: amountPaid,
          payment_status: 'paid',
          // store reference in notes field or extend schema
        }, { onConflict: 'distribution_record_id' })

      if (payError) throw payError

      // Update record status to paid
      const { data: record, error: recordError } = await (supabase as any)
        .from('distribution_records')
        .update({
          distribution_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .eq('farm_id', userRole.farm_id)
        .select(`
          *,
          distribution_channels(id, name, type, is_paid_for),
          distribution_delivery_logs(id, delivery_date, delivery_time, driver_name, vehicle_number),
          distribution_payment_records(id, payment_method, expected_payment_date, actual_payment_date, payment_status, amount_paid)
        `)
        .single()

      if (recordError) throw recordError
      return NextResponse.json(record)
    }

    // ── General field update (status, notes, quantity, price etc.) ────────────
    const updates: any = {}
    if (body.status)                  updates.distribution_status = body.status
    if (body.notes !== undefined)     updates.notes = body.notes
    if (body.quantity !== undefined)  updates.quantity_distributed = body.quantity
    if (body.unit_price !== undefined) {
      updates.unit_price = body.unit_price
      updates.total_amount = (body.quantity ?? 0) * body.unit_price
    }
    if (body.distribution_date)       updates.distribution_date = body.distribution_date
    updates.updated_at = new Date().toISOString()

    const { data: record, error } = await (supabase as any)
      .from('distribution_records')
      .update(updates)
      .eq('id', params.id)
      .eq('farm_id', userRole.farm_id)
      .select(`
        *,
        distribution_channels(id, name, type, is_paid_for),
        distribution_delivery_logs(id, delivery_date, delivery_time, driver_name, vehicle_number),
        distribution_payment_records(id, payment_method, expected_payment_date, actual_payment_date, payment_status, amount_paid)
      `)
      .single()

    if (error) throw error
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    return NextResponse.json(record)

  } catch (error) {
    console.error('Error updating distribution record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // Get the distribution record to verify farm_id
    const { data: record, error: fetchError } = await (supabase as any)
      .from('distribution_records')
      .select('farm_id, distribution_status')
      .eq('id', params.id)
      .single()

    if (fetchError || !record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // Verify user has access to this farm
    if (record.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if there's an associated milk_sales record with paid status
    const { data: milkSale } = await (supabase as any)
      .from('milk_sales')
      .select('payment_status')
      .eq('distribution_record_id', params.id)
      .single()

    if (milkSale && milkSale.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot delete a distribution record with confirmed payment' },
        { status: 400 }
      )
    }

    // Delete associated milk_sales record if it exists
    if (milkSale) {
      await (supabase as any)
        .from('milk_sales')
        .delete()
        .eq('distribution_record_id', params.id)
    }

    // Delete the distribution record
    const { error: deleteError } = await (supabase as any)
      .from('distribution_records')
      .delete()
      .eq('id', params.id)
      .eq('farm_id', userRole.farm_id)

    if (deleteError) throw deleteError

    return NextResponse.json({ message: 'Distribution record deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error deleting distribution record:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}