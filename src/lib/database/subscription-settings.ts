// lib/database/subscription-settings.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface SubscriptionSettings {
  // Plan Info
  planType: 'free' | 'starter' | 'professional' | 'enterprise'
  planStatus: 'active' | 'cancelled' | 'expired' | 'suspended' | 'trial'
  
  // Billing
  billingCycle: 'monthly' | 'yearly'
  pricePerMonth: number
  currency: string
  
  // Payment
  paymentMethod?: string
  mpesaNumber?: string
  cardLastFour?: string
  
  // Dates
  subscriptionStartDate: string
  currentPeriodStart: string
  currentPeriodEnd?: string
  trialStartDate?: string
  trialEndDate?: string
  cancelledAt?: string
  
  // Limits
  maxAnimals: number
  maxUsers: number
  maxStorageGb: number
  maxMonthlyRecords: number
  
  // Features
  featuresEnabled: {
    healthManagement: boolean
    breedingManagement: boolean
    milkProduction: boolean
    financialTracking: boolean
    advancedReports: boolean
    apiAccess: boolean
    prioritySupport: boolean
    customBranding: boolean
    multiFarm: boolean
    dataExport: boolean
  }
  
  // Usage
  currentAnimalsCount: number
  currentUsersCount: number
  currentStorageUsedMb: number
  currentMonthlyRecords: number
  
  // Billing Contact
  billingEmail?: string
  billingPhone?: string
  billingAddress?: string
  
  // Auto-renewal
  autoRenew: boolean
  autoRenewReminderSent: boolean
  
  // Pending changes
  pendingPlanChange?: string
  planChangeEffectiveDate?: string
  
  // Invoicing
  lastInvoiceDate?: string
  nextInvoiceDate?: string
  lastInvoiceAmount?: number
}

export async function getSubscriptionSettings(farmId: string): Promise<SubscriptionSettings | null> {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('farm_subscriptions')
    .select('*')
    .eq('farm_id', farmId)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null
  
  return transformDbToSubscription(data)
}

export async function getPaymentHistory(farmId: string, limit = 10) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('subscription_payment_history')
    .select('*')
    .eq('farm_id', farmId)
    .order('payment_date', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

export async function updateSubscription(farmId: string, updates: Partial<SubscriptionSettings>) {
  const supabase = await createServerSupabaseClient()
  
  const dbUpdates = transformSubscriptionToDb(updates)
  
  const { error } = await (supabase
    .from('farm_subscriptions') as any)
    .update(dbUpdates)
    .eq('farm_id', farmId)
  
  if (error) throw error
  return { success: true }
}

// Transform database record to SubscriptionSettings
function transformDbToSubscription(data: any): SubscriptionSettings {
  return {
    planType: data.plan_type,
    planStatus: data.plan_status,
    billingCycle: data.billing_cycle,
    pricePerMonth: parseFloat(data.price_per_month),
    currency: data.currency,
    paymentMethod: data.payment_method,
    mpesaNumber: data.mpesa_number,
    cardLastFour: data.card_last_four,
    subscriptionStartDate: data.subscription_start_date,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    trialStartDate: data.trial_start_date,
    trialEndDate: data.trial_end_date,
    cancelledAt: data.cancelled_at,
    maxAnimals: data.max_animals,
    maxUsers: data.max_users,
    maxStorageGb: data.max_storage_gb,
    maxMonthlyRecords: data.max_monthly_records,
    featuresEnabled: {
      healthManagement: data.features_enabled?.health_management ?? true,
      breedingManagement: data.features_enabled?.breeding_management ?? true,
      milkProduction: data.features_enabled?.milk_production ?? true,
      financialTracking: data.features_enabled?.financial_tracking ?? false,
      advancedReports: data.features_enabled?.advanced_reports ?? false,
      apiAccess: data.features_enabled?.api_access ?? false,
      prioritySupport: data.features_enabled?.priority_support ?? false,
      customBranding: data.features_enabled?.custom_branding ?? false,
      multiFarm: data.features_enabled?.multi_farm ?? false,
      dataExport: data.features_enabled?.data_export ?? true
    },
    currentAnimalsCount: data.current_animals_count,
    currentUsersCount: data.current_users_count,
    currentStorageUsedMb: data.current_storage_used_mb,
    currentMonthlyRecords: data.current_monthly_records,
    billingEmail: data.billing_email,
    billingPhone: data.billing_phone,
    billingAddress: data.billing_address,
    autoRenew: data.auto_renew,
    autoRenewReminderSent: data.auto_renew_reminder_sent,
    pendingPlanChange: data.pending_plan_change,
    planChangeEffectiveDate: data.plan_change_effective_date,
    lastInvoiceDate: data.last_invoice_date,
    nextInvoiceDate: data.next_invoice_date,
    lastInvoiceAmount: data.last_invoice_amount ? parseFloat(data.last_invoice_amount) : undefined
  }
}

// Transform SubscriptionSettings to database format
function transformSubscriptionToDb(updates: Partial<SubscriptionSettings>) {
  const dbUpdates: any = {
    updated_at: new Date().toISOString()
  }

  if (updates.planType !== undefined) dbUpdates.plan_type = updates.planType
  if (updates.planStatus !== undefined) dbUpdates.plan_status = updates.planStatus
  if (updates.billingCycle !== undefined) dbUpdates.billing_cycle = updates.billingCycle
  if (updates.pricePerMonth !== undefined) dbUpdates.price_per_month = updates.pricePerMonth
  if (updates.currency !== undefined) dbUpdates.currency = updates.currency
  if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod
  if (updates.mpesaNumber !== undefined) dbUpdates.mpesa_number = updates.mpesaNumber
  if (updates.cardLastFour !== undefined) dbUpdates.card_last_four = updates.cardLastFour
  if (updates.currentPeriodEnd !== undefined) dbUpdates.current_period_end = updates.currentPeriodEnd
  if (updates.trialEndDate !== undefined) dbUpdates.trial_end_date = updates.trialEndDate
  if (updates.cancelledAt !== undefined) dbUpdates.cancelled_at = updates.cancelledAt
  if (updates.maxAnimals !== undefined) dbUpdates.max_animals = updates.maxAnimals
  if (updates.maxUsers !== undefined) dbUpdates.max_users = updates.maxUsers
  if (updates.maxStorageGb !== undefined) dbUpdates.max_storage_gb = updates.maxStorageGb
  if (updates.maxMonthlyRecords !== undefined) dbUpdates.max_monthly_records = updates.maxMonthlyRecords
  
  if (updates.featuresEnabled !== undefined) {
    dbUpdates.features_enabled = {
      health_management: updates.featuresEnabled.healthManagement,
      breeding_management: updates.featuresEnabled.breedingManagement,
      milk_production: updates.featuresEnabled.milkProduction,
      financial_tracking: updates.featuresEnabled.financialTracking,
      advanced_reports: updates.featuresEnabled.advancedReports,
      api_access: updates.featuresEnabled.apiAccess,
      priority_support: updates.featuresEnabled.prioritySupport,
      custom_branding: updates.featuresEnabled.customBranding,
      multi_farm: updates.featuresEnabled.multiFarm,
      data_export: updates.featuresEnabled.dataExport
    }
  }
  
  if (updates.currentAnimalsCount !== undefined) dbUpdates.current_animals_count = updates.currentAnimalsCount
  if (updates.currentUsersCount !== undefined) dbUpdates.current_users_count = updates.currentUsersCount
  if (updates.currentStorageUsedMb !== undefined) dbUpdates.current_storage_used_mb = updates.currentStorageUsedMb
  if (updates.currentMonthlyRecords !== undefined) dbUpdates.current_monthly_records = updates.currentMonthlyRecords
  if (updates.billingEmail !== undefined) dbUpdates.billing_email = updates.billingEmail
  if (updates.billingPhone !== undefined) dbUpdates.billing_phone = updates.billingPhone
  if (updates.billingAddress !== undefined) dbUpdates.billing_address = updates.billingAddress
  if (updates.autoRenew !== undefined) dbUpdates.auto_renew = updates.autoRenew
  if (updates.autoRenewReminderSent !== undefined) dbUpdates.auto_renew_reminder_sent = updates.autoRenewReminderSent
  if (updates.pendingPlanChange !== undefined) dbUpdates.pending_plan_change = updates.pendingPlanChange
  if (updates.planChangeEffectiveDate !== undefined) dbUpdates.plan_change_effective_date = updates.planChangeEffectiveDate
  if (updates.lastInvoiceDate !== undefined) dbUpdates.last_invoice_date = updates.lastInvoiceDate
  if (updates.nextInvoiceDate !== undefined) dbUpdates.next_invoice_date = updates.nextInvoiceDate
  if (updates.lastInvoiceAmount !== undefined) dbUpdates.last_invoice_amount = updates.lastInvoiceAmount

  return dbUpdates
}