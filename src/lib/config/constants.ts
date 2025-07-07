export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'DairyTrack Pro',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  description: 'Modern dairy farm management software',
} as const

export const ROUTES = {
  home: '/',
  auth: '/auth',
  dashboard: '/dashboard',
  onboarding: '/onboarding',
  admin: '/admin',
} as const

export const USER_ROLES = {
  FARM_OWNER: 'farm_owner',
  FARM_MANAGER: 'farm_manager', 
  WORKER: 'worker',
  SUPER_ADMIN: 'super_admin',
} as const

export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
} as const