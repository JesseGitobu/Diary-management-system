import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/AuthForm'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function AuthPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AuthForm />
    </Suspense>
  )
}