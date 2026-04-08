import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired'
export type UserRole = 'farm_owner' | 'farm_manager' | 'worker' | 'veterinarian'

export interface Invitation {
  id: string
  farm_id: string
  email: string
  full_name: string
  role_type: UserRole
  status: InvitationStatus
  sent_by: string
  sent_at: string
  accepted_at: string | null
  token: string
  expires_at: string
  department_id?: string | null
  created_at: string
  updated_at: string
}

export interface CreateInvitationInput {
  email: string
  full_name: string
  role_type: UserRole
  department_id?: string | null
}

export interface UpdateInvitationInput {
  status?: InvitationStatus
  accepted_at?: string | null
}

/**
 * Get all invitations for a farm
 */
export async function getInvitations(farmId: string): Promise<Invitation[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('farm_invitations')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invitations:', error)
    return []
  }

  return ((data as any[]) || []) as Invitation[]
}

/**
 * Get a single invitation by ID
 */
export async function getInvitationById(id: string): Promise<Invitation | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('farm_invitations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching invitation:', error)
    return null
  }

  return ((data as any) || null) as Invitation
}

/**
 * Get pending invitations for a farm
 */
export async function getPendingInvitations(farmId: string): Promise<Invitation[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('farm_invitations')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending invitations:', error)
    return []
  }

  return ((data as any[]) || []).filter((inv: any) => inv.status === 'pending' || !inv.accepted_at) as Invitation[]
}

/**
 * Create a new invitation
 */
export async function createInvitation(
  farmId: string,
  userId: string,
  data: CreateInvitationInput
): Promise<{ invitation: Invitation | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient()

    // Validate input
    const validationError = validateInvitationInput(data)
    if (validationError) {
      return { invitation: null, error: validationError }
    }

    const generatedToken = generateSecureToken()
    console.log('🔍 [CREATE_INVITATION] Generated token:', {
      token: generatedToken,
      length: generatedToken.length,
      email: data.email.toLowerCase().trim()
    })

    const invitationData = {
      farm_id: farmId,
      email: data.email.toLowerCase().trim(),
      full_name: data.full_name.trim(),
      role_type: data.role_type,
      department_id: data.department_id || null,
      status: 'pending',
      invited_by: userId,
      sent_by: userId,
      sent_at: new Date().toISOString(),
      token: generatedToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    console.log('🔍 [CREATE_INVITATION] About to insert:', {
      token: invitationData.token,
      email: invitationData.email,
      farmId: invitationData.farm_id
    })

    const { data: newInvitation, error } = await (supabase as any)
      .from('farm_invitations')
      .insert([invitationData])
      .select()
      .single()

    if (error) {
      console.error('❌ [CREATE_INVITATION] Insert error:', error)
      return {
        invitation: null,
        error: error.message.includes('duplicate')
          ? `An invitation for "${data.email}" already exists`
          : 'Failed to create invitation',
      }
    }

    console.log('✅ [CREATE_INVITATION] Invitation created:', {
      id: (newInvitation as any)?.id,
      token: (newInvitation as any)?.token,
      email: (newInvitation as any)?.email,
      receivedToken: (newInvitation as any)?.token === generatedToken
    })

    return { invitation: ((newInvitation as any) || null) as Invitation, error: null }
  } catch (error) {
    console.error('❌ [CREATE_INVITATION] Unexpected error:', error)
    return {
      invitation: null,
      error: error instanceof Error ? error.message : 'An unexpected error occurred while creating the invitation',
    }
  }
}

/**
 * Update an invitation
 */
export async function updateInvitation(
  id: string,
  updates: UpdateInvitationInput
): Promise<{ invitation: Invitation | null; error: string | null }> {
  const supabase = await createServerSupabaseClient()

  if (Object.keys(updates).length === 0) {
    return { invitation: null, error: 'No updates provided' }
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  }

  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.accepted_at !== undefined) updateData.accepted_at = updates.accepted_at

  const { data, error } = await supabase
    .from('farm_invitations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating invitation:', error)
    return { invitation: null, error: 'Failed to update invitation' }
  }

  return { invitation: ((data as any) || null) as Invitation, error: null }
}

/**
 * Delete an invitation
 */
export async function deleteInvitation(id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  const { error, count } = await supabase
    .from('farm_invitations')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) {
    console.error('Error deleting invitation:', error)
    return false
  }

  if (count === 0) {
    console.warn('deleteInvitation: no rows deleted for id', id)
    return false
  }

  return true
}

/**
 * Get invitation count for a farm
 */
export async function getInvitationCount(farmId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()

  const { count, error } = await supabase
    .from('farm_invitations')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)

  if (error) {
    console.error('Error counting invitations:', error)
    return 0
  }

  return count || 0
}

/**
 * Get pending invitation count for a farm
 */
export async function getPendingInvitationCount(farmId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('farm_invitations')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error counting pending invitations:', error)
    return 0
  }

  return ((data as any[]) || []).filter((inv: any) => inv.status === 'pending' || !inv.accepted_at).length
}

/**
 * Validates invitation input data
 */
export function validateInvitationInput(data: Partial<CreateInvitationInput>): string | null {
  if (data.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!data.email || !emailRegex.test(data.email)) {
      return 'Please provide a valid email address'
    }
  }

  if (data.full_name !== undefined && (!data.full_name || !data.full_name.trim())) {
    return 'Full name is required and cannot be empty'
  }

  if (data.full_name && data.full_name.trim().length < 2) {
    return 'Full name must be at least 2 characters'
  }

  if (data.role_type !== undefined) {
    const validRoles: UserRole[] = ['farm_owner', 'farm_manager', 'worker', 'veterinarian']
    if (!validRoles.includes(data.role_type)) {
      return `Invalid role type. Must be one of: ${validRoles.join(', ')}`
    }
  }

  return null
}

/**
 * Validate a farm invitation token
 * Uses admin client because this is called from public pages where user is not authenticated
 */
export async function validateFarmInvitationToken(token: string): Promise<{ isValid: boolean; error?: string; invitation?: any }> {
  const adminSupabase = createAdminClient()

  console.log('🔍 [VALIDATE_TOKEN] Starting validation:', {
    receivedToken: token,
    tokenLength: token?.length,
    tokenType: typeof token,
  })

  // Make sure token is a string
  if (!token || typeof token !== 'string') {
    console.error('❌ [VALIDATE_TOKEN] Invalid token format:', { token, type: typeof token })
    return { isValid: false, error: 'token_not_found' }
  }

  const { data: invitation, error, count } = await adminSupabase
    .from('farm_invitations')
    .select('*', { count: 'exact' })
    .eq('token', token)
    .maybeSingle()

  console.log('🔍 [VALIDATE_TOKEN] Query result:', {
    found: !!invitation,
    error: error?.message,
    queryToken: token,
    databaseToken: invitation?.token,
    tokensMatch: invitation?.token === token,
    databaseEntry: {
      id: invitation?.id,
      email: invitation?.email,
      status: (invitation as any)?.status,
      expiresAt: invitation?.expires_at
    }
  })

  if (error) {
    console.error('❌ [VALIDATE_TOKEN] Database error:', error)
    return { isValid: false, error: 'database_error' }
  }

  if (!invitation) {
    console.warn('⚠️ [VALIDATE_TOKEN] Token not found in database')
    // Let's try to see what tokens exist for debugging
    const { data: allTokens } = await adminSupabase
      .from('farm_invitations')
      .select('token, email, status')
      .limit(5)
    
    console.log('ℹ️ [VALIDATE_TOKEN] Recent invitations in database:', allTokens)
    
    return { isValid: false, error: 'token_not_found' }
  }

  const inv = invitation as any
  
  console.log('✅ [VALIDATE_TOKEN] Token found:', {
    email: inv.email,
    status: inv.status,
    expiresAt: inv.expires_at
  })
  
  // Check if invitation is expired
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    console.warn('⚠️ [VALIDATE_TOKEN] Token is expired')
    return { isValid: false, error: 'token_expired' }
  }

  // Check if already accepted
  if (inv.status === 'accepted') {
    console.warn('⚠️ [VALIDATE_TOKEN] Token already accepted')
    return { isValid: false, error: 'already_accepted' }
  }

  // Check if already rejected or expired in status
  if (['rejected', 'expired'].includes(inv.status)) {
    console.warn(`⚠️ [VALIDATE_TOKEN] Token status is ${inv.status}`)
    return { isValid: false, error: `invitation_${inv.status}` }
  }

  console.log('✅ [VALIDATE_TOKEN] Token is valid and ready to use')
  return { isValid: true, invitation: inv }
}

/**
 * Get full farm invitation details with farm and inviter info
 * Uses admin client because this is called from public pages where user is not authenticated
 */
export async function getFarmInvitationDetails(token: string): Promise<any> {
  const adminSupabase = createAdminClient()

  const { data: invitation, error: invError } = await adminSupabase
    .from('farm_invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (invError || !invitation) {
    console.error('❌ [GET_DETAILS] Error fetching farm invitation:', invError)
    return null
  }

  const inv = invitation as any

  console.log('✅ [GET_DETAILS] Fetching full invitation details for:', inv.email)

  // Fetch farm details
  const { data: farm, error: farmError } = await adminSupabase
    .from('farms')
    .select('id, name, location, farm_type')
    .eq('id', inv.farm_id)
    .maybeSingle()

  if (farmError) {
    console.error('❌ [GET_DETAILS] Error fetching farm details:', farmError)
  }

  // Fetch inviter details
  const { data: inviterData } = await adminSupabase.auth.admin.getUserById(inv.sent_by)
  const inviterEmail = inviterData?.user?.email
  const inviterName = inviterData?.user?.user_metadata?.full_name || inviterEmail?.split('@')[0] || 'Farm Manager'

  // Calculate expiration days
  const expirationDate = new Date(inv.expires_at)
  const today = new Date()
  const daysRemaining = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const details = {
    id: inv.id,
    token: inv.token,
    email: inv.email,
    full_name: inv.full_name,
    role_type: inv.role_type,
    department_id: inv.department_id,
    status: inv.status,
    expires_at: inv.expires_at,
    daysRemaining,
    farms: farm || null,
    inviter: {
      name: inviterName,
      email: inviterEmail,
    },
    sent_at: inv.sent_at,
    accepted_at: inv.accepted_at,
  }

  console.log('✅ [GET_DETAILS] Invitation details prepared:', {
    email: details.email,
    farmName: details.farms?.name,
    roleType: details.role_type,
    daysRemaining: details.daysRemaining
  })

  return details
}

/**
 * Generate a secure random token for invitations
 * Uses crypto.getRandomValues for better randomness and URL-safe characters
 */
export function generateSecureToken(): string {
  // Generate 32 random bytes and convert to hex string
  const bytes = new Uint8Array(32)
  if (typeof window === 'undefined' && global.crypto?.getRandomValues) {
    // Server-side (Node.js)
    global.crypto.getRandomValues(bytes)
  } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Client-side or Node.js with crypto available
    crypto.getRandomValues(bytes)
  } else {
    // Fallback (should rarely happen)
    for (let i = 0; i < 32; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  
  // Convert to hex string (URL-safe)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
