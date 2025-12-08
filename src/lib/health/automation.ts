// src/lib/health/automation.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { addDays, format, isBefore, differenceInDays } from 'date-fns'

export interface HealthReminder {
  id: string
  type: 'vaccination' | 'health_check' | 'medication' | 'follow_up'
  title: string
  description: string
  animal_id?: string
  farm_id: string
  due_date: string
  status: 'pending' | 'completed' | 'overdue'
  priority: 'low' | 'medium' | 'high'
  created_at: string
}

export async function generateHealthReminders(farmId: string) {
  const supabase = await createServerSupabaseClient()
  const today = new Date()
  const reminders: Omit<HealthReminder, 'id' | 'created_at'>[] = []
  
  try {
    // First, get all farm animals
    const { data: farmAnimalsData, error: animalsError } = await supabase
      .from('animals')
      .select('id, tag_number, name, birth_date')
      .eq('farm_id', farmId)
      .eq('status', 'active')
    
    if (animalsError) {
      console.error('Error fetching farm animals:', animalsError)
      return []
    }
    
    // FIXED: Cast to any[]
    const farmAnimals = (farmAnimalsData as any[]) || []

    if (farmAnimals.length === 0) {
      return [] // No animals to generate reminders for
    }
    
    const animalIds = farmAnimals.map(animal => animal.id)
    
    // Get overdue vaccinations
    const { data: overdueVaccinationsData, error: vaccinationError } = await supabase
      .from('vaccination_schedules')
      .select(`
        *,
        animal:animals (id, tag_number, name),
        protocol:vaccination_protocols (name, vaccine_name)
      `)
      .in('animal_id', animalIds)
      .eq('status', 'pending')
      .lt('scheduled_date', format(today, 'yyyy-MM-dd'))
    
    if (vaccinationError) {
      console.error('Error fetching overdue vaccinations:', vaccinationError)
    }
    
    // FIXED: Cast to any[]
    const overdueVaccinations = (overdueVaccinationsData as any[]) || []

    // Add vaccination reminders
    overdueVaccinations.forEach(vaccination => {
      const daysOverdue = differenceInDays(today, new Date(vaccination.scheduled_date))
      reminders.push({
        type: 'vaccination',
        title: `Overdue Vaccination: ${vaccination.protocol?.vaccine_name || 'Unknown'}`,
        description: `${vaccination.animal?.name || vaccination.animal?.tag_number || 'Unknown animal'} vaccination is ${daysOverdue} days overdue`,
        animal_id: vaccination.animal_id,
        farm_id: farmId,
        due_date: vaccination.scheduled_date,
        status: 'overdue',
        priority: daysOverdue > 30 ? 'high' : 'medium'
      })
    })

    // Get animals needing health checks (no health record in last 90 days)
    const { data: healthRecordsData, error: healthError } = await supabase
      .from('animal_health_records')
      .select('animal_id, record_date')
      .in('animal_id', animalIds)
      .gte('record_date', format(addDays(today, -90), 'yyyy-MM-dd'))

    if (healthError) {
      console.error('Error fetching health records:', healthError)
    }

    // FIXED: Cast to any[]
    const healthRecords = (healthRecordsData as any[]) || []

    // Find animals without recent health records
    const animalsWithRecentRecords = new Set(
      healthRecords.map(record => record.animal_id)
    )

    farmAnimals.forEach(animal => {
      if (!animalsWithRecentRecords.has(animal.id)) {
        reminders.push({
          type: 'health_check',
          title: `Routine Health Check Due`,
          description: `${animal.name || animal.tag_number} hasn't had a health check in over 90 days`,
          animal_id: animal.id,
          farm_id: farmId,
          due_date: format(today, 'yyyy-MM-dd'),
          status: 'pending',
          priority: 'medium'
        })
      }
    })

    // Get follow-up visits that are due
    const { data: followUpVisitsData, error: followUpError } = await supabase
      .from('veterinary_visits')
      .select('*')
      .eq('farm_id', farmId)
      .eq('follow_up_required', true)
      .lte('follow_up_date', format(today, 'yyyy-MM-dd'))

    if (followUpError) {
      console.error('Error fetching follow-up visits:', followUpError)
    }

    // FIXED: Cast to any[]
    const followUpVisits = (followUpVisitsData as any[]) || []

    followUpVisits.forEach(visit => {
      reminders.push({
        type: 'follow_up',
        title: 'Veterinary Follow-up Due',
        description: `Follow-up required for ${visit.visit_type} visit`,
        farm_id: farmId,
        due_date: visit.follow_up_date ?? '',
        status: 'pending',
        priority: 'medium'
      })
    })

    // Get medications expiring soon
    const { data: expiringMedicationsData, error: medicationError } = await supabase
      .from('medications')
      .select('*')
      .eq('farm_id', farmId)
      .lte('expiry_date', format(addDays(today, 30), 'yyyy-MM-dd'))
      .gt('quantity_available', 0)

    if (medicationError) {
      console.error('Error fetching expiring medications:', medicationError)
    }

    // FIXED: Cast to any[]
    const expiringMedications = (expiringMedicationsData as any[]) || []

    expiringMedications.forEach(medication => {
      if (medication.expiry_date) {
        const daysUntilExpiry = differenceInDays(new Date(medication.expiry_date), today)
        reminders.push({
          type: 'medication',
          title: 'Medication Expiring Soon',
          description: `${medication.name} expires in ${daysUntilExpiry} days`,
          farm_id: farmId,
          due_date: medication.expiry_date,
          status: 'pending',
          priority: daysUntilExpiry < 7 ? 'high' : 'medium'
        })
      }
    })
    
    return reminders.sort((a, b) => {
      // Sort by priority (high first) then by due date
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
    
  } catch (error) {
    console.error('Error generating health reminders:', error)
    return []
  }
}

export async function scheduleAutomaticVaccinations(farmId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get all active protocols
    const { data: protocolsData, error: protocolsError } = await supabase
      .from('vaccination_protocols')
      .select('*')
      .eq('farm_id', farmId)
      .eq('is_active', true)
    
    if (protocolsError) {
      console.error('Error fetching protocols:', protocolsError)
      return { success: false, error: protocolsError.message }
    }
    
    // Get all animals that might need scheduling
    const { data: animalsData, error: animalsError } = await supabase
      .from('animals')
      .select('id, birth_date')
      .eq('farm_id', farmId)
      .eq('status', 'active')
    
    if (animalsError) {
      console.error('Error fetching animals:', animalsError)
      return { success: false, error: animalsError.message }
    }

    // FIXED: Cast to any[]
    const protocols = (protocolsData as any[]) || []
    const animals = (animalsData as any[]) || []
    
    const schedulesToCreate = []
    
    for (const protocol of protocols) {
      for (const animal of animals) {
        // Check if animal already has this protocol scheduled
        const { data: existingSchedule, error: checkError } = await supabase
          .from('vaccination_schedules')
          .select('id')
          .eq('animal_id', animal.id)
          .eq('protocol_id', protocol.id)
          .single()
        
        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 is "not found" which is expected
          console.error('Error checking existing schedule:', checkError)
          continue
        }
        
        if (!existingSchedule && animal.birth_date && protocol.age_at_first_dose_days) {
          // Calculate vaccination date based on birth date and protocol
          const vaccinationDate = addDays(
            new Date(animal.birth_date), 
            protocol.age_at_first_dose_days
          )
          
          // Only schedule if vaccination date is in the future or within last 30 days
          const daysDifference = differenceInDays(vaccinationDate, new Date())
          if (daysDifference >= -30) {
            schedulesToCreate.push({
              animal_id: animal.id,
              protocol_id: protocol.id,
              scheduled_date: format(vaccinationDate, 'yyyy-MM-dd'),
              status: daysDifference < 0 ? 'overdue' : 'pending'
            })
          }
        }
      }
    }
    
    // Insert new schedules
    if (schedulesToCreate.length > 0) {
      // FIXED: Cast to any for insert
      const { data, error } = await (supabase
        .from('vaccination_schedules') as any)
        .insert(schedulesToCreate)
        .select()
      
      if (error) throw error
      // FIXED: Cast data to any[]
      return { success: true, created: (data as any[])?.length || 0 }
    }
    
    return { success: true, created: 0 }
  } catch (error) {
    console.error('Error scheduling automatic vaccinations:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function checkWithdrawalPeriods(farmId: string) {
  const supabase = await createServerSupabaseClient()
  const today = new Date()
  
  try {
    // First get all farm animals
    const { data: farmAnimals, error: animalsError } = await supabase
      .from('animals')
      .select('id')
      .eq('farm_id', farmId)
      .eq('status', 'active')
    
    // FIXED: Cast to any[]
    const animals = (farmAnimals as any[]) || []

    if (animalsError || !animals || animals.length === 0) {
      return []
    }
    
    const animalIds = animals.map(animal => animal.id)
    
    // Get animals with active withdrawal periods
    const { data: withdrawalAnimalsData, error: withdrawalError } = await supabase
      .from('medication_administrations')
      .select(`
        *,
        animal:animals (id, tag_number, name),
        medication:medications (name, withdrawal_period_days)
      `)
      .in('animal_id', animalIds)
      .gte('withdrawal_end_date', format(today, 'yyyy-MM-dd'))
      .order('withdrawal_end_date')
    
    if (withdrawalError) {
      console.error('Error checking withdrawal periods:', withdrawalError)
      return []
    }
    
    // FIXED: Cast to any[]
    const withdrawalAnimals = (withdrawalAnimalsData as any[]) || []

    const alerts = withdrawalAnimals.map(admin => ({
      animal_id: admin.animal_id,
      animal_name: admin.animal?.name || admin.animal?.tag_number || 'Unknown',
      medication: admin.medication?.name || 'Unknown medication',
      withdrawal_end_date: admin.withdrawal_end_date,
      days_remaining: admin.withdrawal_end_date
        ? differenceInDays(new Date(admin.withdrawal_end_date), today)
        : null
    }))
    
    return alerts
  } catch (error) {
    console.error('Error checking withdrawal periods:', error)
    return []
  }
}