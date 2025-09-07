// lib/utils/scheduleUtils.ts

export function isScheduledFeeding(feedingTime: string): boolean {
  const now = new Date()
  const feedingDate = new Date(feedingTime)
  const timeDifferenceHours = (feedingDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  return timeDifferenceHours > 1
}

export function calculateLateness(scheduledTime: string, actualTime?: string): number {
  const scheduled = new Date(scheduledTime)
  const actual = actualTime ? new Date(actualTime) : new Date()
  
  return Math.max(0, Math.floor((actual.getTime() - scheduled.getTime()) / (1000 * 60)))
}

export function canConfirmFeeding(scheduledTime: string): boolean {
  const now = new Date()
  const scheduled = new Date(scheduledTime)
  const minutesUntilFeeding = Math.floor((scheduled.getTime() - now.getTime()) / (1000 * 60))
  
  return minutesUntilFeeding <= 30
}

export function getFeedingStatus(scheduledTime: string, status: string): {
  status: string
  color: string
  message: string
} {
  const now = new Date()
  const scheduled = new Date(scheduledTime)
  const minutesUntilFeeding = Math.floor((scheduled.getTime() - scheduled.getTime()) / (1000 * 60))
  
  if (status === 'completed') {
    return {
      status: 'completed',
      color: 'green',
      message: 'Completed'
    }
  }
  
  if (status === 'cancelled') {
    return {
      status: 'cancelled',
      color: 'gray',
      message: 'Cancelled'
    }
  }
  
  if (status === 'overdue' || minutesUntilFeeding < -30) {
    return {
      status: 'overdue',
      color: 'red',
      message: 'Overdue'
    }
  }
  
  if (minutesUntilFeeding <= 0) {
    return {
      status: 'ready',
      color: 'orange',
      message: 'Ready to feed'
    }
  }
  
  if (minutesUntilFeeding <= 30) {
    return {
      status: 'soon',
      color: 'yellow',
      message: 'Feeding soon'
    }
  }
  
  return {
    status: 'scheduled',
    color: 'blue',
    message: 'Scheduled'
  }
}

// Background job function to update overdue statuses
export async function updateOverdueFeedings(farmId: string): Promise<void> {
  try {
    const response = await fetch(`/api/farms/${farmId}/scheduled-feedings/update-overdue`, {
      method: 'POST'
    })
    
    if (!response.ok) {
      console.error('Failed to update overdue feedings')
    }
  } catch (error) {
    console.error('Error updating overdue feedings:', error)
  }
}