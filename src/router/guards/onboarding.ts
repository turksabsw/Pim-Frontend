/**
 * Vue Router navigation guard for onboarding gate enforcement.
 *
 * Blocks access to the PIM dashboard and all non-public routes until
 * the onboarding wizard is completed. Uses dual-layer enforcement:
 * 1. Frontend — this guard checks the Pinia onboarding store
 * 2. Backend — the store fetches fresh status from the API on each navigation
 *
 * Uses Vue Router 4 return-based pattern:
 * - Return nothing (undefined) to allow navigation
 * - Return a route location to redirect
 * - Return false to cancel navigation
 *
 * @see https://router.vuejs.org/guide/advanced/navigation-guards.html
 */

import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { useOnboardingStore } from '@/stores/onboarding'

/** Routes that are always accessible without completing onboarding */
const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/api'] as const

/**
 * Check if a route path is a public route that bypasses onboarding.
 */
function isPublicRoute(path: string): boolean {
  return PUBLIC_PATHS.some((publicPath) => path.startsWith(publicPath))
}

/**
 * Check if a route is the onboarding route itself (prevent infinite redirect).
 */
function isOnboardingRoute(path: string): boolean {
  return path.startsWith('/onboarding')
}

/**
 * Onboarding navigation guard.
 *
 * Called before every route navigation via `router.beforeEach()`.
 * Fetches fresh onboarding status from the backend and redirects
 * to the onboarding wizard if the tenant has not completed setup.
 *
 * @param to - The target route being navigated to
 * @param _from - The current route being navigated away from
 * @returns Route to redirect to, or undefined to allow navigation
 *
 * @example
 * ```ts
 * // In router/index.ts
 * import { onboardingGuard } from './guards/onboarding'
 * router.beforeEach(onboardingGuard)
 * ```
 */
export async function onboardingGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
): Promise<RouteLocationRaw | undefined> {
  // Allow onboarding route itself (prevent infinite redirect loop)
  if (isOnboardingRoute(to.path)) return

  // Allow public routes (login, signup, API calls)
  if (isPublicRoute(to.path)) return

  // Allow routes explicitly marked as public in meta
  if (to.meta.public) return

  const store = useOnboardingStore()

  try {
    // Fetch fresh status from backend on every navigation.
    // This ensures the guard always checks the actual backend state,
    // not stale client-side data. Handles session timeout gracefully.
    await store.fetchStatus()

    // Allow navigation if onboarding is completed
    if (store.onboardingStatus === 'completed') {
      return
    }

    // Allow navigation if onboarding was skipped
    if (store.onboardingStatus === 'skipped') {
      return
    }

    // If API returned an error (e.g., permission denied for this user),
    // redirect to login instead of the wizard to avoid a broken state.
    if (store.onboardingStatus === 'error' || !store.initialized) {
      return { path: '/login' }
    }

    // Redirect to wizard at the current step
    return {
      path: '/onboarding',
      query: { step: String(store.currentWizardStep || 1) },
    }
  } catch {
    // On error (network failure, session expired), redirect to login page
    return { path: '/login' }
  }
}
