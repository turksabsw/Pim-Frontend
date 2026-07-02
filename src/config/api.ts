/**
 * Backend API base URL.
 * - Production: baked from VITE_API_BASE_URL (.env.production) → absolute cloud URL.
 * - Dev: undefined → '' → Vite dev proxy handles /api (same-origin, no CORS).
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''
