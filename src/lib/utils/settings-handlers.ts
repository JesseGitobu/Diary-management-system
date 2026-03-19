// lib/utils/settings-handlers.ts
import { toast } from 'react-hot-toast'

export async function saveSettings(
  endpoint: string,
  farmId: string,
  settings: any,
  onSuccess: () => void
): Promise<void> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        farmId,
        settings,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to save settings')
    }

    const data = await response.json()
    toast.success('Settings saved successfully', { duration: 3000 })
    onSuccess()
    
    return data
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    toast.error(`Failed to save settings: ${message}`, { duration: 4000 })
    throw error
  }
}
