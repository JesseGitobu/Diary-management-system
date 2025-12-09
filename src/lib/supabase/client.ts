// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

// ✅ FIXED: Suppress Supabase's internal error logging for AuthSessionMissingError
const originalConsoleError = console.error

console.error = function (...args: any[]) {
  // Check if this is the AuthSessionMissingError we want to suppress
  const errorMessage = args[0]?.message || args[0]?.toString() || ''
  const stackTrace = args[0]?.stack || args[1] || ''
  
  // Suppress only AuthSessionMissingError from Supabase
  if (
    errorMessage.includes('AuthSessionMissingError') &&
    stackTrace.includes('GoTrueClient')
  ) {
    // Don't log this expected error
    return
  }
  
  // Log all other errors normally
  originalConsoleError.apply(console, args)
}

// Client-side Supabase client
export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton client for client-side operations
let supabaseClient: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}

// Export default for convenience
export default getSupabaseClient()