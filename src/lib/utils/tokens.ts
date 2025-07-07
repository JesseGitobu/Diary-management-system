import { randomBytes, createHash } from 'crypto'

export function generateInvitationToken(): string {
  // Generate a secure random token
  const buffer = randomBytes(32)
  return buffer.toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function validateTokenFormat(token: string): boolean {
  // Check if token is 64 character hex string
  return /^[a-f0-9]{64}$/i.test(token)
}

export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

export function generateSecurePassword(): string {
  // Generate a temporary password for invited users
  const length = 12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  
  return password
}