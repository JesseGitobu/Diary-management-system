// Helper function to add at the top of each file or in a utilities file
// src/lib/utils/errorHelpers.ts

export function isAuthSessionMissingError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = error?.message || error?.toString() || ''
  const errorCode = error?.code || ''
  
  return (
    errorMessage.includes('AuthSessionMissingError') ||
    errorCode === 'AuthSessionMissingError' ||
    (error.__isAuthError && error.status === 400 && !errorCode)
  )
}

export function logErrorIfNotAuthMissing(context: string, error: any): void {
  if (isAuthSessionMissingError(error)) {
    // Expected error for unauthenticated users - don't log it
    return
  }
  
  // Log unexpected errors
  console.error(`${context}:`, error)
}