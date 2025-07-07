import { redirect } from 'next/navigation'
import { InvitationLanding } from '@/components/auth/InvitationLanding'
import { validateInvitationToken, getInvitationDetails } from '@/lib/database/team'

interface InvitePageProps {
  params: Promise<{
    token: string
  }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  
  // Validate the invitation token
  const validation = await validateInvitationToken(token)
  
  if (!validation.isValid) {
    // Redirect to an error page or main site
    redirect(`/auth?error=${validation.error}`)
  }
  
  const invitationDetails = await getInvitationDetails(token)
  
  if (!invitationDetails) {
    redirect('/auth?error=invitation_not_found')
  }
  
  return (
    <InvitationLanding 
      invitation={invitationDetails}
      token={token}
    />
  )
}