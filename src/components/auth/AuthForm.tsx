'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/lib/hooks/useAuth'
import { signUpSchema, signInSchema } from '@/lib/config/validation'
import { Building2 } from 'lucide-react'

type AuthMode = 'signin' | 'signup'

type SignInFormData = z.infer<typeof signInSchema>
type SignUpFormData = z.infer<typeof signUpSchema>

interface AuthFormProps {
  mode?: AuthMode
  invitationToken?: string
}

export function AuthForm({ mode = 'signin' }: AuthFormProps) {
  const searchParams = useSearchParams()
  const invitationToken = searchParams.get('invitation')
  const urlMode = searchParams.get('mode') as AuthMode
  
  const [authMode, setAuthMode] = useState<AuthMode>(urlMode || mode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitationData, setInvitationData] = useState<any>(null)
  const router = useRouter()
  const { signIn, signUp } = useAuth()

  // Load invitation data if token is present
  useEffect(() => {
    if (invitationToken) {
      loadInvitationData(invitationToken)
      setAuthMode('signup') // Force signup mode for invitations
    }
  }, [invitationToken])

  const loadInvitationData = async (token: string) => {
    try {
      const response = await fetch(`/api/invitations/validate?token=${token}`)
      if (response.ok) {
        const data = await response.json()
        setInvitationData(data.invitation)
        
        // Pre-fill form with invitation data
        signUpForm.setValue('email', data.invitation.email)
        // You can add more pre-filling here if you have the invitee name
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
    },
  })

  const handleSignIn = async (data: SignInFormData) => {
    console.log('🔍 Sign in attempt started:', data.email) // Debug log
    setLoading(true)
    setError(null)

    try {
      console.log('🔍 Calling signIn function...') // Debug log
      const { error } = await signIn(data.email, data.password)

      console.log('🔍 Sign in response:', { error }) // Debug log

      if (error) {
        console.error('❌ Sign in error:', error) // Debug log
        setError(error)
        setLoading(false)
      } else {
        console.log('✅ Sign in successful, attempting redirect...') // Debug log
        // Add a small delay to see if redirect happens
        setTimeout(() => {
          console.log('🔍 Redirecting to dashboard...')
          router.push('/dashboard')
        }, 100)
      }
    } catch (err) {
      console.error('❌ Sign in exception:', err) // Debug log
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  const handleSignUp = async (data: SignUpFormData) => {
  setLoading(true)
  setError(null)

  console.log('🔍 AuthForm: Signing up with invitation token:', invitationToken)

  // Pass invitation token to signUp function
  const { error } = await signUp(data.email, data.password, data.fullName, invitationToken || undefined)

  if (error) {
    setError(error)
    setLoading(false)
  } else {
    // For invitations, redirect with token for reference (optional since it's in metadata now)
    if (invitationToken) {
      router.push(`/auth/confirm-email?invitation=${invitationToken}`)
    } else {
      router.push('/auth/confirm-email')
    }
  }
}

  const toggleMode = () => {
    // Don't allow mode toggle if this is an invitation signup
    if (invitationToken) return
    
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
    setError(null)
  }

  return (
    <div className="auth-container">
      <div className={"logo"}>DairyTrack Pro</div>
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
            {invitationData ? 'Complete Your Registration' : (authMode === 'signin' ? 'Welcome Back' : 'Create Account')}
          </CardTitle>
          <CardDescription className="text-center mb-5">
            {invitationData 
              ? 'Create your account to join the farm team'
              : (authMode === 'signin' 
                ? 'Sign in to your farm management account' 
                : 'Get started with your dairy farm management'
              )
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
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
                <Input
                  id="password"
                  type="password"
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
          ) : (
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
                  disabled={!!invitationData} // Disable if pre-filled from invitation
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...signUpForm.register('password')}
                  error={signUpForm.formState.errors.password?.message}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  {...signUpForm.register('confirmPassword')}
                  error={signUpForm.formState.errors.confirmPassword?.message}
                />
              </div>
              <Button
                type="submit"
                primary={true}
                className="w-full"
                disabled={loading}
              >
                {loading ? <LoadingSpinner size="sm" /> : (invitationData ? 'Join Team' : 'Create Account')}
              </Button>
            </form>
          )}

          {/* Only show mode toggle if not an invitation */}
          {!invitationToken && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-dairy-gray hover:text-dairy-primary"
              >
                {authMode === 'signin' 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </button>
            </div>
          )}

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