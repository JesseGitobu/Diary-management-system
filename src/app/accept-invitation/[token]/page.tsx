import { redirect } from 'next/navigation'
import { InvitationLanding } from '@/components/auth/InvitationLanding'
import { validateFarmInvitationToken, getFarmInvitationDetails } from '@/lib/database/invitations'

interface AcceptInvitationPageProps {
  params: Promise<{
    token: string
  }>
}

export default async function AcceptInvitationPage({ params }: AcceptInvitationPageProps) {
  const { token } = await params
  
  console.log('🔍 [ACCEPT_INVITATION] Received token:', { 
    token,
    length: token.length,
    encoded: encodeURIComponent(token)
  })
  
  // Validate the farm invitation token
  const validation = await validateFarmInvitationToken(token)
  
  console.log('🔍 [ACCEPT_INVITATION] Validation result:', {
    isValid: validation.isValid,
    error: validation.error
  })
  
  if (!validation.isValid) {
    // Redirect to an error page or main site
    const errorMap: { [key: string]: string } = {
      'token_not_found': 'invitation_not_found',
      'token_expired': 'expired',
      'already_accepted': 'already_accepted',
      'invitation_rejected': 'declined',
      'invitation_expired': 'expired',
      'database_error': 'error',
    }
    const errorCode = errorMap[validation.error || 'error'] || 'error'
    console.error('❌ [ACCEPT_INVITATION] Validation failed:', errorCode)
    redirect(`/auth?error=${errorCode}`)
  }
  
  const invitationDetails = await getFarmInvitationDetails(token)
  
  console.log('🔍 [ACCEPT_INVITATION] Invitation details:', {
    found: !!invitationDetails,
    email: invitationDetails?.email,
    farmName: invitationDetails?.farms?.name
  })
  
  if (!invitationDetails) {
    console.error('❌ [ACCEPT_INVITATION] Could not fetch invitation details')
    redirect('/auth?error=invitation_not_found')
  }
  
  return (
    <InvitationLanding 
      invitation={invitationDetails}
      token={token}
    />
  )
}
