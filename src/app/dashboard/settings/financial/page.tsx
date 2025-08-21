// dashboard/settings/financial/page.tsx
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFinancialSettings } from '@/lib/database/settings'
import { FinancialSettings } from '@/components/settings/FinancialSettings'

export const metadata: Metadata = {
  title: 'Financial Settings | Farm Management',
  description: 'Configure pricing, payments, and financial tracking',
}



export default async function FinancialPage() {
  const user = await getCurrentUser()
  
    if (!user) {
      redirect('/auth')
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      redirect('/dashboard')
    }
  
  
  // Check if user can access financial settings
  const canAccessFinancial = ['farm_owner', 'farm_manager'].includes(userRole.role_type)
  
  if (!canAccessFinancial) {
    redirect(`/dashboard/settings`)
  }

  // Get financial settings
  const financialSettings = await getFinancialSettings(userRole.farm_id)

  return (
    <FinancialSettings
      farmId={userRole.farm_id}
      userRole={userRole.role_type}
      initialSettings={{ 
        ...financialSettings, 
        currency: financialSettings.currency as "KSH" | "USD", 
        default_payment_method: financialSettings.default_payment_method as "cash" | "bank_transfer" | "mpesa" | "cheque",
        buyers: financialSettings.buyers.map(buyer => ({
          ...buyer,
          contact_person: buyer.contact_person ?? undefined,
          email: buyer.email ?? undefined,
          farm_id: buyer.farm_id ?? undefined,
          is_active: buyer.is_active ?? false,
          payment_terms: (buyer.payment_terms as "cash" | "credit_7" | "credit_14" | "credit_30") ?? "cash",
          phone: buyer.phone ?? undefined,
          preferred_payment_method: (buyer.preferred_payment_method as "cash" | "bank_transfer" | "mpesa" | "cheque") ?? "cash",
          created_at: buyer.created_at ?? undefined,
          updated_at: buyer.updated_at ?? undefined
        }))
      }}
    />
  )
}