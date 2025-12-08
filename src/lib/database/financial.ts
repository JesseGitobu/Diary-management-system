import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'

type FinancialTransaction = Database['public']['Tables']['financial_transactions']['Row']
type FinancialTransactionInsert = Database['public']['Tables']['financial_transactions']['Insert']
type MilkSale = Database['public']['Tables']['milk_sales']['Row']
type AnimalSale = Database['public']['Tables']['animal_sales']['Row']

export async function createFinancialTransaction(
  farmId: string, 
  userId: string, 
  transactionData: Omit<FinancialTransactionInsert, 'farm_id' | 'created_by'>
) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await (supabase
    .from('financial_transactions') as any)
    .insert({
      ...transactionData,
      farm_id: farmId,
      created_by: userId,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating financial transaction:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
  
  return { success: true, data }
}

export async function getFinancialTransactions(
  farmId: string, 
  filters?: {
    startDate?: string
    endDate?: string
    type?: 'income' | 'expense'
    category?: string
  }
) {
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('financial_transactions')
    .select(`
      *,
      animals (
        id,
        name,
        tag_number
      )
    `)
    .eq('farm_id', farmId)
    .order('transaction_date', { ascending: false })
  
  if (filters?.startDate) {
    query = query.gte('transaction_date', filters.startDate)
  }
  
  if (filters?.endDate) {
    query = query.lte('transaction_date', filters.endDate)
  }
  
  if (filters?.type) {
    query = query.eq('transaction_type', filters.type)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching financial transactions:', error)
    return []
  }
  
  return data || []
}

export async function getFinancialSummary(farmId: string, year?: number) {
  const supabase = await createServerSupabaseClient()
  
  const currentYear = year || new Date().getFullYear()
  const startDate = `${currentYear}-01-01`
  const endDate = `${currentYear}-12-31`
  
  // Get income summary
  const { data: incomeDataResult } = await supabase
    .from('financial_transactions')
    .select('amount, income_category')
    .eq('farm_id', farmId)
    .eq('transaction_type', 'income')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
  
  // FIXED: Cast to any[]
  const incomeData = (incomeDataResult as any[]) || []

  // Get expense summary
  const { data: expenseDataResult } = await supabase
    .from('financial_transactions')
    .select('amount, expense_category')
    .eq('farm_id', farmId)
    .eq('transaction_type', 'expense')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
  
  // FIXED: Cast to any[]
  const expenseData = (expenseDataResult as any[]) || []

  // Calculate totals
  const totalIncome = incomeData.reduce((sum, record) => sum + Number(record.amount), 0) || 0
  const totalExpenses = expenseData.reduce((sum, record) => sum + Number(record.amount), 0) || 0
  const netProfit = totalIncome - totalExpenses
  
  // Group by category
  const incomeByCategory = incomeData.reduce((acc, record) => {
    const category = record.income_category || 'other_income'
    acc[category] = (acc[category] || 0) + Number(record.amount)
    return acc
  }, {} as Record<string, number>) || {}
  
  const expensesByCategory = expenseData.reduce((acc, record) => {
    const category = record.expense_category || 'other_expense'
    acc[category] = (acc[category] || 0) + Number(record.amount)
    return acc
  }, {} as Record<string, number>) || {}
  
  return {
    totalIncome,
    totalExpenses,
    netProfit,
    profitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0,
    incomeByCategory,
    expensesByCategory,
    year: currentYear
  }
}

export async function createMilkSale(farmId: string, milkSaleData: any) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Start a transaction
    // FIXED: Cast to any
    const { data: milkSale, error: milkSaleError } = await (supabase
      .from('milk_sales') as any)
      .insert({
        ...milkSaleData,
        farm_id: farmId,
      })
      .select()
      .single()
    
    if (milkSaleError) throw milkSaleError
    
    // Create corresponding financial transaction
    // FIXED: Cast to any
    const { data: transaction, error: transactionError } = await (supabase
      .from('financial_transactions') as any)
      .insert({
        farm_id: farmId,
        transaction_type: 'income',
        amount: milkSaleData.total_amount,
        description: `Milk sale - ${milkSaleData.volume_liters}L to ${milkSaleData.buyer_name || 'Customer'}`,
        transaction_date: milkSaleData.sale_date,
        income_category: 'milk_sales',
        customer_name: milkSaleData.buyer_name,
        created_by: milkSaleData.created_by,
      })
      .select()
      .single()
    
    if (transactionError) throw transactionError
    
    // Link the milk sale to the transaction
    // FIXED: Cast to any
    await (supabase
      .from('milk_sales') as any)
      .update({ transaction_id: transaction.id })
      .eq('id', milkSale.id)
    
    return { success: true, data: { milkSale, transaction } }
  } catch (error) {
    console.error('Error creating milk sale:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function createAnimalSale(farmId: string, animalSaleData: any) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Create animal sale record
    // FIXED: Cast to any
    const { data: animalSale, error: animalSaleError } = await (supabase
      .from('animal_sales') as any)
      .insert({
        ...animalSaleData,
        farm_id: farmId,
      })
      .select()
      .single()
    
    if (animalSaleError) throw animalSaleError
    
    // Create corresponding financial transaction
    // FIXED: Cast to any
    const { data: transaction, error: transactionError } = await (supabase
      .from('financial_transactions') as any)
      .insert({
        farm_id: farmId,
        transaction_type: 'income',
        amount: animalSaleData.sale_price,
        description: `Animal sale - ${animalSaleData.animal_tag || 'Animal'} to ${animalSaleData.buyer_name || 'Customer'}`,
        transaction_date: animalSaleData.sale_date,
        income_category: 'animal_sales',
        customer_name: animalSaleData.buyer_name,
        animal_id: animalSaleData.animal_id,
        created_by: animalSaleData.created_by,
      })
      .select()
      .single()
    
    if (transactionError) throw transactionError
    
    // Update animal status to 'sold'
    // FIXED: Cast to any
    await (supabase
      .from('animals') as any)
      .update({ status: 'sold' })
      .eq('id', animalSaleData.animal_id)
    
    // Link the animal sale to the transaction
    // FIXED: Cast to any
    await (supabase
      .from('animal_sales') as any)
      .update({ transaction_id: transaction.id })
      .eq('id', animalSale.id)
    
    return { success: true, data: { animalSale, transaction } }
  } catch (error) {
    console.error('Error creating animal sale:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getMonthlyFinancialData(farmId: string, year: number) {
  const supabase = await createServerSupabaseClient()
  
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const monthlyData = await Promise.all(
    months.map(async (month) => {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`
      
      const { data: transactionsData } = await supabase
        .from('financial_transactions')
        .select('amount, transaction_type')
        .eq('farm_id', farmId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
      
      // FIXED: Cast to any[]
      const transactions = (transactionsData as any[]) || []

      const income = transactions
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0
      
      const expenses = transactions
        .filter(t => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0
      
      return {
        month,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
        income,
        expenses,
        profit: income - expenses
      }
    })
  )
  
  return monthlyData
}

export async function getCostPerAnimal(farmId: string, year?: number) {
  const supabase = await createServerSupabaseClient()
  
  const currentYear = year || new Date().getFullYear()
  
  // Get total expenses for the year
  const summary = await getFinancialSummary(farmId, currentYear)
  
  // Get average animal count for the year
  const { count: animalCount } = await supabase
    .from('animals')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .eq('status', 'active')
  
  const totalAnimals = animalCount || 1 // Avoid division by zero
  
  return {
    totalExpenses: summary.totalExpenses,
    totalAnimals,
    costPerAnimal: summary.totalExpenses / totalAnimals,
    costPerAnimalPerMonth: summary.totalExpenses / totalAnimals / 12,
    year: currentYear
  }
}