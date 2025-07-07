export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 401, 'AUTH_ERROR')
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

export function handleApiError(error: unknown): { error: string, statusCode: number } {
  if (error instanceof AppError) {
    return { error: error.message, statusCode: error.statusCode }
  }
  
  if (error instanceof Error) {
    return { error: error.message, statusCode: 500 }
  }
  
  return { error: 'An unexpected error occurred', statusCode: 500 }
}