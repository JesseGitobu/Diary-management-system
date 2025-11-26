// src/lib/config/validation.ts
import { z } from 'zod'

// Email validation schema
export const emailSchema = z.string().email('Invalid email address')

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// Sign up schema with terms acceptance
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the Terms of Service and Privacy Policy'
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Sign in schema
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

// Password recovery schema
export const passwordRecoverySchema = z.object({
  email: emailSchema,
})

// Password reset schema (for when user receives reset link)
export const passwordResetSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Farm basic info schema
export const farmBasicsSchema = z.object({
  farmName: z.string().min(2, 'Farm name must be at least 2 characters'),
  location: z.string().optional(),
  farmType: z.string().optional(),
  herdSize: z.number().min(0).optional(),
})