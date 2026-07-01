/**
 * Frappe REST API composable for Vue.js 3.
 *
 * Provides reactive wrappers around Frappe's REST API with:
 * - Automatic CSRF token management
 * - Authentication state detection
 * - Loading and error states via Vue refs
 * - Typed document CRUD operations
 * - Method calls to whitelisted APIs
 * - Frappe Resource API (get_list, get_count, get_doc)
 * - PIM-specific API helpers (products, onboarding, taxonomy)
 *
 * Usage:
 *   const { getDoc, getList, callMethod, loading, error } = useFrappeAPI()
 *   const product = await getDoc<ProductMaster>('Product Master', 'PROD-001')
 */

import { ref, readonly, type Ref, type DeepReadonly } from 'vue'
import axios, { type AxiosInstance, type AxiosError, type AxiosRequestConfig } from 'axios'
import type {
  FrappeResponse,
  FrappeDocResponse,
  FrappeEntity,
  FrappeListParams,
  APIError,
} from '@/types'

// ============================================================================
// CSRF Token Management
// ============================================================================

/** Cached CSRF token - shared across all composable instances */
let _csrfToken: string | null = null

/**
 * Get the CSRF token from cookies or meta tag.
 * Frappe stores the token in a cookie named 'csrf_token'
 * or in a meta tag in the HTML head.
 */
function getCSRFToken(): string {
  if (_csrfToken) {
    return _csrfToken
  }

  // Try cookie first (standard Frappe approach)
  const cookieMatch = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrf_token='))
  if (cookieMatch) {
    _csrfToken = decodeURIComponent(cookieMatch.split('=')[1])
    return _csrfToken
  }

  // Fallback: try meta tag
  const metaTag = document.querySelector('meta[name="csrf_token"]')
  if (metaTag) {
    _csrfToken = metaTag.getAttribute('content') || ''
    return _csrfToken
  }

  // Fallback: try window.__frappe_csrf_token (set by some Frappe pages)
  const win = window as unknown as Record<string, unknown>
  if (typeof win.__frappe_csrf_token === 'string') {
    _csrfToken = win.__frappe_csrf_token
    return _csrfToken
  }

  return ''
}

/** Clear the cached CSRF token (e.g., after logout) */
export function clearCSRFToken(): void {
  _csrfToken = null
}

// ============================================================================
// Axios Instance
// ============================================================================

/** Create a configured axios instance for Frappe API calls */
function createFrappeAxios(): AxiosInstance {
  const instance = axios.create({
    baseURL: '/',
    timeout: 30000,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })

  // Request interceptor: attach CSRF token
  instance.interceptors.request.use((config) => {
    const token = getCSRFToken()
    if (token) {
      config.headers['X-Frappe-CSRF-Token'] = token
    }
    return config
  })

  // Response interceptor: handle common errors
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // If CSRF token expired, clear cache and retry once
      if (error.response?.status === 403) {
        const data = error.response.data as Record<string, unknown> | undefined
        if (data?.exc_type === 'CSRFTokenError') {
          clearCSRFToken()
        }
      }

      // If unauthorized, redirect to login
      if (error.response?.status === 401 || error.response?.status === 403) {
        const data = error.response.data as Record<string, unknown> | undefined
        if (
          data?.session_expired ||
          data?.exc_type === 'AuthenticationError' ||
          data?.exc_type === 'PermissionError'
        ) {
          window.location.href = '/login'
          return Promise.reject(error)
        }
      }

      return Promise.reject(error)
    },
  )

  return instance
}

/** Shared axios instance */
const frappeAxios = createFrappeAxios()

// ============================================================================
// Error Parsing
// ============================================================================

/**
 * Parse a Frappe API error response into a structured APIError.
 */
function parseError(error: unknown): APIError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<FrappeResponse<unknown>>
    const response = axiosError.response

    if (response?.data) {
      const data = response.data

      // Parse _server_messages if present (Frappe's standard format)
      let message = 'An unexpected error occurred'
      const serverMessages: string[] = []

      if (data._server_messages) {
        try {
          const parsed = JSON.parse(data._server_messages)
          if (Array.isArray(parsed)) {
            for (const msg of parsed) {
              try {
                const inner = JSON.parse(msg)
                serverMessages.push(inner.message || String(inner))
              } catch {
                serverMessages.push(String(msg))
              }
            }
          }
          message = serverMessages[0] || message
        } catch {
          message = String(data._server_messages)
        }
      } else if (data.exc) {
        message = String(data.exc).split('\n').pop() || 'Server error'
      } else if (typeof data.message === 'string') {
        message = data.message
      }

      return {
        message,
        exc_type: data.exc_type || undefined,
        status_code: response.status,
        server_messages: serverMessages.length > 0 ? serverMessages : undefined,
      }
    }

    return {
      message: axiosError.message || 'Network error',
      status_code: response?.status,
    }
  }

  if (error instanceof Error) {
    return { message: error.message }
  }

  return { message: String(error) }
}

// ============================================================================
// Composable
// ============================================================================

/** Return type of useFrappeAPI composable */
export interface UseFrappeAPIReturn {
  /** Whether an API call is in progress */
  loading: DeepReadonly<Ref<boolean>>
  /** The last error that occurred, or null */
  error: DeepReadonly<Ref<APIError | null>>
  /** Clear the current error */
  clearError: () => void

  // Document operations
  /** Fetch a single document by DocType and name */
  getDoc: <T extends FrappeEntity>(doctype: string, name: string) => Promise<T>
  /** Fetch a list of documents */
  getList: <T extends FrappeEntity>(params: FrappeListParams) => Promise<T[]>
  /** Get count of documents matching filters */
  getCount: (doctype: string, filters?: Record<string, unknown>) => Promise<number>
  /** Create a new document */
  createDoc: <T extends FrappeEntity>(doctype: string, data: Partial<T>) => Promise<T>
  /** Update an existing document */
  updateDoc: <T extends FrappeEntity>(doctype: string, name: string, data: Partial<T>) => Promise<T>
  /** Delete a document */
  deleteDoc: (doctype: string, name: string) => Promise<void>

  // Method calls
  /** Call a whitelisted Frappe method */
  callMethod: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>
  /** Call a whitelisted method with GET (for read-only operations) */
  callGetMethod: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>

  // Auth helpers
  /** Get the current logged-in user info */
  getLoggedUser: () => Promise<string>
  /** Check if the user is authenticated */
  isAuthenticated: () => Promise<boolean>

  // Raw request
  /** Make a raw API request (for advanced use cases) */
  request: <T = unknown>(config: AxiosRequestConfig) => Promise<T>
}

/**
 * Vue.js 3 composable for Frappe REST API.
 *
 * Provides reactive loading/error state and typed API methods.
 * Each composable instance has its own loading/error state,
 * but shares the same axios instance and CSRF token.
 *
 * @example
 * ```ts
 * const { getDoc, getList, callMethod, loading, error } = useFrappeAPI()
 *
 * // Fetch a product
 * const product = await getDoc<ProductMaster>('Product Master', 'PROD-001')
 *
 * // List products
 * const products = await getList<ProductMaster>({
 *   doctype: 'Product Master',
 *   fields: ['name', 'product_name', 'status'],
 *   filters: { status: 'Active' },
 *   limit_page_length: 20,
 * })
 *
 * // Call a PIM API method
 * const result = await callMethod<ProductListResponse>(
 *   'frappe_pim.pim.api.product.get_products',
 *   { status: 'Active', page: 1 }
 * )
 * ```
 */
export function useFrappeAPI(): UseFrappeAPIReturn {
  const loading = ref(false)
  const error = ref<APIError | null>(null)

  /** Track active requests for nested loading state */
  let activeRequests = 0

  function startLoading(): void {
    activeRequests++
    loading.value = true
  }

  function stopLoading(): void {
    activeRequests = Math.max(0, activeRequests - 1)
    if (activeRequests === 0) {
      loading.value = false
    }
  }

  function clearError(): void {
    error.value = null
  }

  /**
   * Execute an async API operation with loading/error tracking.
   */
  async function withTracking<T>(fn: () => Promise<T>): Promise<T> {
    startLoading()
    error.value = null

    try {
      return await fn()
    } catch (err) {
      error.value = parseError(err)
      throw err
    } finally {
      stopLoading()
    }
  }

  // --------------------------------------------------------------------------
  // Document CRUD Operations (Frappe Resource API)
  // --------------------------------------------------------------------------

  /**
   * Fetch a single document by DocType and name.
   *
   * Uses Frappe Resource API: GET /api/resource/{doctype}/{name}
   */
  async function getDoc<T extends FrappeEntity>(
    doctype: string,
    name: string,
  ): Promise<T> {
    return withTracking(async () => {
      const url = `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
      const response = await frappeAxios.get<FrappeDocResponse<T>>(url)
      return response.data.data
    })
  }

  /**
   * Fetch a list of documents with filters and pagination.
   *
   * Uses Frappe Resource API: GET /api/resource/{doctype}
   */
  async function getList<T extends FrappeEntity>(
    params: FrappeListParams,
  ): Promise<T[]> {
    return withTracking(async () => {
      const { doctype, ...queryParams } = params
      const url = `/api/resource/${encodeURIComponent(doctype)}`

      // Build query parameters
      const apiParams: Record<string, string> = {}

      if (queryParams.fields) {
        apiParams.fields = JSON.stringify(queryParams.fields)
      }
      if (queryParams.filters) {
        apiParams.filters = JSON.stringify(queryParams.filters)
      }
      if (queryParams.or_filters) {
        apiParams.or_filters = JSON.stringify(queryParams.or_filters)
      }
      if (queryParams.order_by) {
        apiParams.order_by = queryParams.order_by
      }
      if (queryParams.limit_start !== undefined) {
        apiParams.limit_start = String(queryParams.limit_start)
      }
      if (queryParams.limit_page_length !== undefined) {
        apiParams.limit_page_length = String(queryParams.limit_page_length)
      }
      if (queryParams.parent) {
        apiParams.parent = queryParams.parent
      }
      if (queryParams.group_by) {
        apiParams.group_by = queryParams.group_by
      }

      const response = await frappeAxios.get<{ data: T[] }>(url, {
        params: apiParams,
      })
      return response.data.data
    })
  }

  /**
   * Get count of documents matching filters.
   *
   * Uses Frappe API: POST /api/method/frappe.client.get_count
   */
  async function getCount(
    doctype: string,
    filters?: Record<string, unknown>,
  ): Promise<number> {
    return withTracking(async () => {
      const response = await frappeAxios.post<FrappeResponse<number>>(
        '/api/method/frappe.client.get_count',
        { doctype, filters },
      )
      return response.data.message
    })
  }

  /**
   * Create a new document.
   *
   * Uses Frappe Resource API: POST /api/resource/{doctype}
   */
  async function createDoc<T extends FrappeEntity>(
    doctype: string,
    data: Partial<T>,
  ): Promise<T> {
    return withTracking(async () => {
      const url = `/api/resource/${encodeURIComponent(doctype)}`
      const response = await frappeAxios.post<FrappeDocResponse<T>>(url, data)
      return response.data.data
    })
  }

  /**
   * Update an existing document.
   *
   * Uses Frappe Resource API: PUT /api/resource/{doctype}/{name}
   */
  async function updateDoc<T extends FrappeEntity>(
    doctype: string,
    name: string,
    data: Partial<T>,
  ): Promise<T> {
    return withTracking(async () => {
      const url = `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
      const response = await frappeAxios.put<FrappeDocResponse<T>>(url, data)
      return response.data.data
    })
  }

  /**
   * Delete a document.
   *
   * Uses Frappe Resource API: DELETE /api/resource/{doctype}/{name}
   */
  async function deleteDoc(doctype: string, name: string): Promise<void> {
    return withTracking(async () => {
      const url = `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
      await frappeAxios.delete(url)
    })
  }

  // --------------------------------------------------------------------------
  // Method Calls (Frappe Whitelisted API)
  // --------------------------------------------------------------------------

  /**
   * Call a whitelisted Frappe method via POST.
   *
   * Uses Frappe Method API: POST /api/method/{method}
   *
   * @example
   * ```ts
   * const result = await callMethod<ProductListResponse>(
   *   'frappe_pim.pim.api.product.get_products',
   *   { status: 'Active', page: 1, page_size: 20 }
   * )
   * ```
   */
  async function callMethod<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    return withTracking(async () => {
      const url = `/api/method/${method}`
      const response = await frappeAxios.post<FrappeResponse<T>>(url, params)
      return response.data.message
    })
  }

  /**
   * Call a whitelisted Frappe method via GET.
   *
   * Suitable for read-only operations that benefit from caching.
   *
   * Uses Frappe Method API: GET /api/method/{method}?params
   */
  async function callGetMethod<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    return withTracking(async () => {
      const url = `/api/method/${method}`
      const response = await frappeAxios.get<FrappeResponse<T>>(url, { params })
      return response.data.message
    })
  }

  // --------------------------------------------------------------------------
  // Auth Helpers
  // --------------------------------------------------------------------------

  /**
   * Get the current logged-in user email.
   *
   * Returns 'Guest' if not authenticated.
   */
  async function getLoggedUser(): Promise<string> {
    return withTracking(async () => {
      const response = await frappeAxios.get<FrappeResponse<string>>(
        '/api/method/frappe.auth.get_logged_user',
      )
      return response.data.message
    })
  }

  /**
   * Check if the current user is authenticated (not Guest).
   */
  async function isAuthenticated(): Promise<boolean> {
    try {
      const user = await getLoggedUser()
      return user !== 'Guest'
    } catch {
      return false
    }
  }

  // --------------------------------------------------------------------------
  // Raw Request
  // --------------------------------------------------------------------------

  /**
   * Make a raw API request for advanced use cases.
   *
   * CSRF token and credentials are automatically included.
   */
  async function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    return withTracking(async () => {
      const response = await frappeAxios.request<T>(config)
      return response.data
    })
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    clearError,
    getDoc,
    getList,
    getCount,
    createDoc,
    updateDoc,
    deleteDoc,
    callMethod,
    callGetMethod,
    getLoggedUser,
    isAuthenticated,
    request,
  }
}

// ============================================================================
// PIM-specific API Helpers
// ============================================================================

/** PIM API method paths */
export const PIM_API = {
  // Product API
  products: {
    list: 'frappe_pim.pim.api.product.get_products',
    detail: 'frappe_pim.pim.api.product.get_product_detail',
    create: 'frappe_pim.pim.api.product.create_product',
    update: 'frappe_pim.pim.api.product.update_product',
    delete: 'frappe_pim.pim.api.product.delete_product',
    bulkUpdate: 'frappe_pim.pim.api.product.bulk_update_products',
    families: 'frappe_pim.pim.api.product.get_product_families',
    statuses: 'frappe_pim.pim.api.product.get_product_statuses',
  },
  // Taxonomy API
  taxonomy: {
    categoryTree: 'frappe_pim.pim.api.taxonomy.get_category_tree',
    categoryChildren: 'frappe_pim.pim.api.taxonomy.get_category_children',
    categoryAncestors: 'frappe_pim.pim.api.taxonomy.get_category_ancestors',
    categoryDescendants: 'frappe_pim.pim.api.taxonomy.get_category_descendants',
    familyTree: 'frappe_pim.pim.api.taxonomy.get_family_tree',
    familyChildren: 'frappe_pim.pim.api.taxonomy.get_family_children',
    familyAncestors: 'frappe_pim.pim.api.taxonomy.get_family_ancestors',
    familyDescendants: 'frappe_pim.pim.api.taxonomy.get_family_descendants',
    familyAttributes: 'frappe_pim.pim.api.taxonomy.get_family_attributes',
    searchNodes: 'frappe_pim.pim.api.taxonomy.search_taxonomy_nodes',
  },
  // Onboarding API
  onboarding: {
    start: 'frappe_pim.pim.api.onboarding.start_onboarding',
    getState: 'frappe_pim.pim.api.onboarding.get_onboarding_state',
    saveStepData: 'frappe_pim.pim.api.onboarding.save_step_data',
    applyTemplate: 'frappe_pim.pim.api.onboarding.apply_archetype_template',
    complete: 'frappe_pim.pim.api.onboarding.complete_onboarding',
    getArchetypes: 'frappe_pim.pim.api.onboarding.get_available_archetypes',
    skip: 'frappe_pim.pim.api.onboarding.skip_onboarding',
    reset: 'frappe_pim.pim.api.onboarding.reset_onboarding',
    preview: 'frappe_pim.pim.api.onboarding.preview_archetype',
  },
  // Onboarding State DocType API (whitelisted on the DocType controller)
  onboardingState: {
    getOrCreate: 'frappe_pim.pim.doctype.pim_onboarding_state.pim_onboarding_state.get_or_create_onboarding_state',
    advance: 'frappe_pim.pim.doctype.pim_onboarding_state.pim_onboarding_state.advance_onboarding_step',
    saveData: 'frappe_pim.pim.doctype.pim_onboarding_state.pim_onboarding_state.save_onboarding_step_data',
    skip: 'frappe_pim.pim.doctype.pim_onboarding_state.pim_onboarding_state.skip_onboarding',
    getSteps: 'frappe_pim.pim.doctype.pim_onboarding_state.pim_onboarding_state.get_onboarding_steps',
  },
} as const
