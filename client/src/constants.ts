// Application constants

export const APP_NAME = 'KnowHub'
export const APP_VERSION = '1.0.0'
export const APP_DESCRIPTION = '面向团队与组织的结构化知识协作系统'

// API Configuration
export const API_BASE_URL = '/api/v1'
export const API_TIMEOUT = 10000

// Storage Keys
export const STORAGE_TOKEN_KEY = 'knowhub_token'
export const STORAGE_USER_KEY = 'knowhub_user'

// Validation Rules
export const MIN_PASSWORD_LENGTH = 6
export const MAX_PASSWORD_LENGTH = 128
export const MIN_EMAIL_LENGTH = 5
export const MAX_EMAIL_LENGTH = 255

// UI Constants
export const DEFAULT_PAGE_SIZE = 20
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Error Codes
export const ERROR_CODES = {
  SUCCESS: 0,
  VALIDATION_ERROR: 1001,
  NOT_FOUND: 1002,
  ALREADY_EXISTS: 1003,
  UNAUTHORIZED: 2001,
  TOKEN_EXPIRED: 2002,
  FORBIDDEN: 2003,
  SERVER_ERROR: 5001,
  DATABASE_ERROR: 5002
}

// Date Formats
export const DATE_FORMAT = 'YYYY-MM-DD'
export const TIME_FORMAT = 'HH:mm:ss'
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

// Theme Colors
export const THEME_COLORS = {
  primary: '#1A73E8',
  success: '#34A853',
  warning: '#FBBC04',
  error: '#EA4335',
  info: '#4285F4'
}
