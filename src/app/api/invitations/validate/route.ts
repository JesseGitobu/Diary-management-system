import { NextRequest, NextResponse } from 'next/server'
import { getInvitationDetails } from '@/lib/database/team-invitation'
import { getFarmInvitationDetails } from '@/lib/database/invitations'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }
    
    // FIRST: Try new farm_invitations system
    let invitation = await getFarmInvitationDetails(token)
    
    // SECOND: Fall back to legacy invitations system
    if (!invitation) {
      invitation = await getInvitationDetails(token)
    }
    
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      invitation 
    })
    
  } catch (error) {
    console.error('Validate invitation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}