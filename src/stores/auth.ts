import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useFrappeAPI } from '@/composables/useFrappeAPI'
import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  type AuthToken,
} from '@/config/authToken'

interface AuthUser {
  name: string
  full_name: string
}

interface LoginResponse extends AuthToken {
  user: string
  full_name: string
}

interface RegisterResponse {
  status: number
  message: string
}

interface MeResponse {
  authenticated: boolean
  user?: string
  full_name?: string
}

export const useAuthStore = defineStore('auth', () => {
  const { callMethod } = useFrappeAPI()

  const user = ref<AuthUser | null>(null)

  const isAuthenticated = computed(() => getStoredToken() !== null)

  async function login(usr: string, pwd: string): Promise<void> {
    const res = await callMethod<LoginResponse>(
      'frappe_pim.pim.api.auth.login',
      { usr, pwd },
    )
    setStoredToken({ api_key: res.api_key, api_secret: res.api_secret })
    user.value = { name: res.user, full_name: res.full_name }
  }

  async function register(
    email: string,
    full_name: string,
  ): Promise<RegisterResponse> {
    return callMethod<RegisterResponse>(
      'frappe_pim.pim.api.auth.register',
      { email, full_name },
    )
  }

  function logout(): void {
    clearStoredToken()
    user.value = null
    window.location.href = '/login'
  }

  async function fetchCurrentUser(): Promise<void> {
    if (!getStoredToken()) {
      user.value = null
      return
    }
    try {
      const res = await callMethod<MeResponse>('frappe_pim.pim.api.auth.me')
      if (res.authenticated && res.user) {
        user.value = { name: res.user, full_name: res.full_name ?? res.user }
      } else {
        clearStoredToken()
        user.value = null
      }
    } catch {
      clearStoredToken()
      user.value = null
    }
  }

  return { user, isAuthenticated, login, register, logout, fetchCurrentUser }
})
