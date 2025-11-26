// src/components/auth/AuthForm.tsx - UPDATED WITH PASSWORD TOGGLE
// Updated AuthForm component with password visibility toggle

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/lib/hooks/useAuth'
import { signUpSchema, signInSchema, passwordRecoverySchema } from '@/lib/config/validation'
import { Building2 } from 'lucide-react'

type AuthMode = 'signin' | 'signup' | 'forgot-password'

type SignInFormData = z.infer<typeof signInSchema>
type SignUpFormData = z.infer<typeof signUpSchema>
type PasswordRecoveryData = z.infer<typeof passwordRecoverySchema>

interface AuthFormProps {
  mode?: AuthMode
  invitationToken?: string
}

export function AuthForm({ mode = 'signin' }: AuthFormProps) {
  const searchParams = useSearchParams()
  const invitationToken = searchParams.get('invitation')
  const urlMode = searchParams.get('mode') as AuthMode
  const message = searchParams.get('message')
  
  const [authMode, setAuthMode] = useState<AuthMode>(urlMode || mode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [invitationData, setInvitationData] = useState<any>(null)
  const router = useRouter()
  const { signIn, signUp, resetPassword } = useAuth()

  // Handle URL messages (like password reset success)
  useEffect(() => {
    if (message === 'password_reset_success') {
      setSuccess('✓ Password reset successful! Please sign in with your new password.')
      // Clear the message from URL
      router.replace('/auth?mode=signin')
    }
  }, [message, router])

  useEffect(() => {
    if (invitationToken) {
      loadInvitationData(invitationToken)
      setAuthMode('signup')
    }
  }, [invitationToken])

  const loadInvitationData = async (token: string) => {
    try {
      const response = await fetch(`/api/invitations/validate?token=${token}`)
      if (response.ok) {
        const data = await response.json()
        setInvitationData(data.invitation)
        signUpForm.setValue('email', data.invitation.email)
      }
    } catch (error) {
      console.error('Error loading invitation data:', error)
      setError('Invalid or expired invitation')
    }
  }

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      agreeToTerms: false,
    },
  })

  const passwordRecoveryForm = useForm<PasswordRecoveryData>({
    resolver: zodResolver(passwordRecoverySchema),
    defaultValues: {
      email: '',
    },
  })

  const handleSignIn = async (data: SignInFormData) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await signIn(data.email, data.password)

      if (error) {
        setError(error)
        setLoading(false)
      } else {
        setTimeout(() => {
          router.push('/dashboard')
        }, 100)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  const handleSignUp = async (data: SignUpFormData) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error } = await signUp(data.email, data.password, data.fullName, invitationToken || undefined)

    if (error) {
      setError(error)
      setLoading(false)
    } else {
      if (invitationToken) {
        router.push(`/auth/confirm-email?invitation=${invitationToken}`)
      } else {
        router.push('/auth/confirm-email')
      }
    }
  }

  const handlePasswordRecovery = async (data: PasswordRecoveryData) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await resetPassword(data.email)

      if (error) {
        setError(error)
        setLoading(false)
      } else {
        setSuccess('✓ Check your email for password recovery instructions. The link will expire in 1 hour.')
        setTimeout(() => {
          setAuthMode('signin')
          passwordRecoveryForm.reset()
        }, 3000)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  const toggleMode = () => {
    if (invitationToken) return
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
    setError(null)
    setSuccess(null)
  }

  const goToForgotPassword = () => {
    setAuthMode('forgot-password')
    setError(null)
    setSuccess(null)
  }

  const backToSignIn = () => {
    setAuthMode('signin')
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="auth-container">
      <div className="logo">DairyTrack Pro</div>
      <Card className="auth-card">
        {/* Invitation Banner */}
        {invitationData && (
          <div className="bg-farm-green/10 border-farm-green/20 border rounded-t-lg p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-farm-green" />
              <div>
                <p className="text-sm font-medium text-farm-green">
                  Joining {invitationData.farms?.name || 'Farm Team'}
                </p>
                <p className="text-xs text-farm-green/80">
                  As {invitationData.role_type?.replace('_', ' ') || 'Team Member'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {authMode === 'forgot-password' 
              ? 'Reset Password'
              : invitationData 
                ? 'Complete Your Registration' 
                : (authMode === 'signin' ? 'Welcome Back' : 'Create Account')
            }
          </CardTitle>
          <CardDescription className="text-center mb-5">
            {authMode === 'forgot-password'
              ? 'Enter your email to receive password reset instructions'
              : invitationData 
                ? 'Create your account to join the farm team'
                : (authMode === 'signin' 
                  ? 'Sign in to your farm management account' 
                  : 'Get started with your dairy farm management'
                )
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{success}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {authMode === 'signin' ? (
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...signInForm.register('email')}
                  error={signInForm.formState.errors.email?.message}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  placeholder="Enter your password"
                  {...signInForm.register('password')}
                  error={signInForm.formState.errors.password?.message}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                primary={true}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Sign In'}
              </Button>
            </form>
          ) : authMode === 'signup' ? (
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  {...signUpForm.register('fullName')}
                  error={signUpForm.formState.errors.fullName?.message}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...signUpForm.register('email')}
                  error={signUpForm.formState.errors.email?.message}
                  disabled={!!invitationData}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  placeholder="Enter your password"
                  {...signUpForm.register('password')}
                  error={signUpForm.formState.errors.password?.message}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  {...signUpForm.register('confirmPassword')}
                  error={signUpForm.formState.errors.confirmPassword?.message}
                />
              </div>

              {/* Terms & Conditions Checkbox */}
              <div className="flex items-start space-x-2 mt-4">
                <input
                  id="agreeToTerms"
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-farm-green rounded"
                  {...signUpForm.register('agreeToTerms')}
                />
                <Label htmlFor="agreeToTerms" className="text-sm font-normal cursor-pointer">
                  I agree to the{' '}
                  <a 
                    href="/terms-of-service" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-farm-green hover:underline"
                  >
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a 
                    href="/privacy-policy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-farm-green hover:underline"
                  >
                    Privacy Policy
                  </a>
                </Label>
              </div>
              {signUpForm.formState.errors.agreeToTerms && (
                <p className="text-red-600 text-sm">{signUpForm.formState.errors.agreeToTerms.message}</p>
              )}

              <Button
                type="submit"
                primary={true}
                className="w-full"
                disabled={loading}
              >
                {loading ? <LoadingSpinner size="sm" /> : (invitationData ? 'Join Team' : 'Create Account')}
              </Button>
            </form>
          ) : (
            // Forgot Password Form
            <form onSubmit={passwordRecoveryForm.handleSubmit(handlePasswordRecovery)} className="space-y-4">
              <div>
                <Label htmlFor="recovery-email">Email Address</Label>
                <Input
                  id="recovery-email"
                  type="email"
                  placeholder="Enter your registered email"
                  {...passwordRecoveryForm.register('email')}
                  error={passwordRecoveryForm.formState.errors.email?.message}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                primary={true}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Send Reset Link'}
              </Button>
            </form>
          )}

          {/* Navigation Links */}
          <div className="mt-6 text-center space-y-2">
            {authMode === 'signin' ? (
              <>
                {!invitationToken && (
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="block w-full text-sm text-dairy-gray hover:text-dairy-primary"
                  >
                    Don't have an account? Sign up
                  </button>
                )}
                <button
                  type="button"
                  onClick={goToForgotPassword}
                  className="block w-full text-sm text-dairy-gray hover:text-dairy-primary"
                >
                  Forgot your password?
                </button>
              </>
            ) : authMode === 'signup' ? (
              !invitationToken && (
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-sm text-dairy-gray hover:text-dairy-primary"
                >
                  Already have an account? Sign in
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={backToSignIn}
                className="text-sm text-dairy-gray hover:text-dairy-primary"
              >
                Back to Sign In
              </button>
            )}
          </div>

          {/* Show invitation info if present */}
          {invitationData && (
            <div className="mt-4 text-center text-xs text-gray-500">
              <p>You're being invited to join {invitationData.farms?.name}</p>
              <p>by {invitationData.inviter?.user_metadata?.full_name || 'Farm Owner'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}