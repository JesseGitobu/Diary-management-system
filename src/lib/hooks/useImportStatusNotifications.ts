import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

interface ImportStatus {
  status: 'pass_1_complete' | 'pass_2_complete' | 'pass_2_failed'
  message: string
  animalsImported: number
  animalsSkipped: number
  errorCount?: number
  timestamp: Date
}

/**
 * Hook to listen for import completion notifications via Supabase Realtime
 * Usage:
 *   const { status, isComplete } = useImportStatusNotifications('import-session-123', farmId)
 *   useEffect(() => {
 *     if (isComplete) {
 *       toast.success('Import complete! Related records created.')
 *     }
 *   }, [isComplete])
 */
export function useImportStatusNotifications(
  importSessionId: string | null,
  farmId: string
) {
  const [status, setStatus] = useState<ImportStatus | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!importSessionId || !farmId) return

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log(`📡 Listening for import status updates for session: ${importSessionId}`)

    // Subscribe to import_status_logs table changes
    const subscription = supabase
      .channel(`import-status:${importSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'import_status_logs',
          filter: `import_session_id=eq.${importSessionId}`
        },
        (payload) => {
          const newLog = payload.new as any
          
          console.log(`🔔 Import status update:`, newLog)
          
          const newStatus: ImportStatus = {
            status: newLog.status,
            message: newLog.message,
            animalsImported: newLog.animals_imported,
            animalsSkipped: newLog.animals_skipped,
            errorCount: newLog.error_count,
            timestamp: new Date(newLog.created_at)
          }
          
          setStatus(newStatus)
          
          // Mark as complete when PASS 2 finishes (success or failure)
          if (newLog.status === 'pass_2_complete' || newLog.status === 'pass_2_failed') {
            setIsComplete(true)
            console.log(`✅ Import session ${importSessionId} is complete`)
            
            // Auto-unsubscribe after completion
            subscription.unsubscribe()
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to import status for: ${importSessionId}`)
        }
      })

    // Cleanup: unsubscribe when component unmounts
    return () => {
      subscription.unsubscribe()
    }
  }, [importSessionId, farmId])

  return { status, isComplete }
}
