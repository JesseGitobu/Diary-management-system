export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count: number
  page: number
  limit: number
}

export interface SignUpData {
  email: string
  password: string
  fullName: string
  invitationToken?: string
}

export interface SignInData {
  email: string
  password: string
}
