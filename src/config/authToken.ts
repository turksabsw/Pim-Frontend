/**
 * Token storage for cross-origin Frappe API auth.
 * Stores the api_key:api_secret pair in localStorage and builds the
 * Authorization header. Shared by useFrappeAPI (request interceptor) and the
 * auth store to avoid circular imports.
 */

const TOKEN_KEY = 'pim-auth-token'

export interface AuthToken {
  api_key: string
  api_secret: string
}

export function getStoredToken(): AuthToken | null {
  const raw = localStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthToken
  } catch {
    return null
  }
}

export function setStoredToken(token: AuthToken): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/** Frappe token auth header, or null if not logged in. */
export function authHeader(): string | null {
  const token = getStoredToken()
  return token ? `token ${token.api_key}:${token.api_secret}` : null
}
