//src/app/api/distribution/records/[id]/confirm-payment/route.ts
import { getCurrentUser, getUserRole, createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface PaymentConfirmationBody {
  paymentMethod: string
  paymentReference: string
  amountPaid: number
  actualPaymentDate: string
  notes: string
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const recordId = params.id
    const body: PaymentConfirmationBody = await request.json()

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id || !['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // Get the distribution record
    const { data: record, error: recordError } = await (supabase as any)
      .from('distribution_records')
      .select('*')
      .eq('id', recordId)
      .eq('farm_id', userRole.farm_id)
      .single()

    if (recordError || !record) {
      return NextResponse.json({ error: 'Distribution record not found' }, { status: 404 })
    }

    // Determine payment status
    const totalAmount = record.total_amount || 0
    const amountPaid = body.amountPaid || 0
    let paymentStatus = 'paid'

    if (amountPaid < totalAmount) {
      paymentStatus = 'partial'
    } else if (amountPaid > totalAmount) {
      paymentStatus = 'paid' // Still mark as paid if overpaid
    }

    // Update distribution_records status to 'paid'
    const { error: updateRecordError } = await (supabase as any)
      .from('distribution_records')
      .update({
        distribution_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .eq('farm_id', userRole.farm_id)

    if (updateRecordError) {
      return NextResponse.json({ error: 'Failed to update distribution record' }, { status: 500 })
    }

    // Create or update milk_sales record
    const { data: existingMilkSale } = await (supabase as any)
      .from('milk_sales')
      .select('id')
      .eq('distribution_record_id', recordId)
      .single()

    if (existingMilkSale) {
      // Update existing milk_sales record
      const { error: updateMilkSaleError } = await (supabase as any)
        .from('milk_sales')
        .update({
          amount_paid: body.amountPaid,
          payment_method: body.paymentMethod,
          payment_reference: body.paymentReference,
          actual_payment_date: body.actualPaymentDate,
          payment_status: paymentStatus,
          notes: body.notes,
          updated_at: new Date().toISOString()
        })
        .eq('distribution_record_id', recordId)
        .eq('farm_id', userRole.farm_id)

      if (updateMilkSaleError) {
        return NextResponse.json(
          { error: 'Failed to update milk sales record' },
          { status: 500 }
        )
      }
    } else {
      // Create new milk_sales record
      const { error: createMilkSaleError } = await (supabase as any)
        .from('milk_sales')
        .insert({
          farm_id: userRole.farm_id,
          distribution_record_id: recordId,
          sale_date: body.actualPaymentDate,
          amount_paid: body.amountPaid,
          payment_method: body.paymentMethod,
          payment_reference: body.paymentReference,
          actual_payment_date: body.actualPaymentDate,
          payment_status: paymentStatus,
          notes: body.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (createMilkSaleError) {
        return NextResponse.json(
          { error: 'Failed to create milk sales record' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      {
        message: 'Payment confirmed successfully',
        recordId,
        paymentStatus
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error confirming payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
