// src/app/auth/reset-password/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { passwordResetSchema } from '@/lib/config/validation'
import { createClient } from '@/lib/supabase/client'
import { debugLogger } from '@/lib/utils/debugLogger'

type PasswordResetData = z.infer<typeof passwordResetSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<PasswordResetData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  // Check if user has an active session (from auth callback)
  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      debugLogger.info('ResetPasswordPage', 'Checking for active session')
      
      try {
        // Create a timeout promise to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), 10000)
        })

        // Race getSession against the timeout
        const { data: { session }, error: sessionError } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]) as any

        if (!mounted) return
        
        debugLogger.debug('ResetPasswordPage', 'Session check result', {
          hasSession: !!session,
          hasError: !!sessionError,
          userId: session?.user?.id,
          email: session?.user?.email
        })
        
        if (sessionError) {
          debugLogger.error('ResetPasswordPage', 'Session error', { error: sessionError.message })
          setError('Invalid or expired reset link. Please request a new password reset.')
          setCheckingAuth(false)
          return
        }

        if (session?.user) {
          debugLogger.success('ResetPasswordPage', 'Active session found', {
            userId: session.user.id,
            email: session.user.email
          })
          setIsRecoveryMode(true)
          setCheckingAuth(false)
        } else {
          // If no session found immediately, checking if we might be in a hash flow
          // If hash exists, we might want to wait for onAuthStateChange instead of failing immediately
          // But to be safe, we'll default to error if no event fires shortly
          debugLogger.warning('ResetPasswordPage', 'No active session found')
          
          if (window.location.hash && window.location.hash.includes('type=recovery')) {
            debugLogger.info('ResetPasswordPage', 'Hash detected, waiting for auth event')
            // Don't set error yet, let the listener handle it or the backup timeout
          } else {
            setError('Invalid or expired reset link. Please request a new password reset.')
            setCheckingAuth(false)
          }
        }
      } catch (err) {
        if (!mounted) return
        debugLogger.error('ResetPasswordPage', 'Exception checking session', { error: err })
        // If it was a timeout or other error, ensure we stop loading
        if (checkingAuth) {
           setError('Unable to verify session. Please try refreshing the page.')
           setCheckingAuth(false)
        }
      }
    }

    checkSession()
    
    return () => { mounted = false }
  }, [supabase])

  // Listen for Auth events (Recovery or Sign In)
  useEffect(() => {
    debugLogger.info('ResetPasswordPage', 'Setting up auth state listener')
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        debugLogger.debug('ResetPasswordPage', 'Auth state event', { 
          event,
          hasSession: !!session,
        })
        
        // Handle Password Recovery Event
        if (event === 'PASSWORD_RECOVERY') {
          debugLogger.success('ResetPasswordPage', 'Password recovery event detected')
          setIsRecoveryMode(true)
          setCheckingAuth(false)
        } 
        // Also handle SIGNED_IN if we are still checking or had an error
        else if (event === 'SIGNED_IN' && session) {
          debugLogger.success('ResetPasswordPage', 'User signed in detected')
          setIsRecoveryMode(true)
          setCheckingAuth(false)
          setError(null) // Clear any previous "no session" error
        }
      }
    )

    return () => {
      debugLogger.debug('ResetPasswordPage', 'Cleaning up auth listener')
      subscription.unsubscribe()
    }
  }, [supabase])

  // Handle form submission
  const onSubmit = async (data: PasswordResetData) => {
    if (!isRecoveryMode) {
      debugLogger.warning('ResetPasswordPage', 'Form submitted but not in recovery mode')
      setError('Please use a valid password reset link.')
      return
    }

    setLoading(true)
    setError(null)

    debugLogger.info('ResetPasswordPage', 'Updating password via Server API')

    try {
      // Use the Server API route for password updates.
      // This is more robust than client-side updates as it uses the HttpOnly cookies strictly.
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: data.password }),
      })

      const result = await response.json()

      debugLogger.debug('ResetPasswordPage', 'API response', {
        status: response.status,
        success: result.success,
        error: result.error
      })

      if (!response.ok || result.error) {
        const errorMsg = result.error || 'Failed to update password'
        debugLogger.error('ResetPasswordPage', 'Password update failed', { error: errorMsg })

        let userMessage = 'Failed to update password. Please try again.'
        const lowerError = errorMsg.toLowerCase()

        if (lowerError.includes('different') || lowerError.includes('same')) {
          userMessage = 'New password must be different from your old password.'
        } else if (lowerError.includes('weak') || lowerError.includes('security')) {
          userMessage = 'Password is too weak. Please use a stronger password (include numbers and symbols).'
        } else if (lowerError.includes('session') || lowerError.includes('expired')) {
          userMessage = 'Your session has expired. Please request a new reset link.'
        } else {
           userMessage = errorMsg
        }

        setError(userMessage)
        toast.error(userMessage)
        setLoading(false)
        return
      }

      // Success!
      debugLogger.success('ResetPasswordPage', 'Password updated successfully!')
      
      toast.success('Your password has been updated successfully!')
      setLoading(false)
      setSuccess(true)
      
      // Redirect after 2 seconds
      setTimeout(() => {
        debugLogger.info('ResetPasswordPage', 'Redirecting to sign in page')
        router.push('/auth?mode=signin&message=password_reset_success')
      }, 2000)

    } catch (err) {
      debugLogger.error('ResetPasswordPage', 'Exception during password update', { error: err })
      const errorMsg = 'An unexpected error occurred. Please try again.'
      setError(errorMsg)
      toast.error(errorMsg)
      setLoading(false)
    }
  }

  // Success UI
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <CardTitle className="text-2xl text-green-600">Password Reset Successful!</CardTitle>
            <CardDescription className="text-center text-gray-600 mt-2">
              Your password has been updated successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✓ You can now sign in with your new password.
              </p>
            </div>

            <div className="text-center text-xs text-gray-500 py-2">
              Redirecting to sign in...
            </div>

            <Button
              onClick={() => router.push('/auth?mode=signin')}
              className="w-full"
              primary={true}
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading UI
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <LoadingSpinner />
            <p className="text-sm text-gray-600 mt-4">Verifying your reset link...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state (no valid session)
  if (!isRecoveryMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-600">Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error || 'This password reset link is invalid or has expired.'}
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <p className="font-semibold">What to do next:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go back to the sign in page</li>
                <li>Click "Forgot password?"</li>
                <li>Request a new password reset link</li>
              </ol>
            </div>

            <Button
              onClick={() => router.push('/auth?mode=signin')}
              className="w-full"
              primary={true}
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Form UI (valid session)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
              <p className="font-medium mb-1">Password Requirements:</p>
              <ul className="text-xs space-y-1 ml-4 list-disc">
                <li>Must be at least 8 characters long</li>
                <li>Must be different from your current password</li>
              </ul>
            </div>

            <div>
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  {...form.register('password')}
                  error={form.formState.errors.password?.message}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  {...form.register('confirmPassword')}
                  error={form.formState.errors.confirmPassword?.message}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading} primary>
              {loading ? <LoadingSpinner size="sm" /> : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}