<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

type Tab = 'login' | 'register'

const router = useRouter()
const authStore = useAuthStore()

const tab = ref<Tab>('login')
const error = ref('')
const info = ref('')
const loading = ref(false)

// Login fields
const usr = ref('')
const pwd = ref('')

// Register fields
const email = ref('')
const fullName = ref('')

function switchTab(next: Tab): void {
  tab.value = next
  error.value = ''
  info.value = ''
}

async function handleLogin(): Promise<void> {
  error.value = ''
  info.value = ''
  loading.value = true
  try {
    await authStore.login(usr.value, pwd.value)
    router.push('/')
  } catch (e) {
    error.value = extractMessage(e, 'Giriş başarısız')
  } finally {
    loading.value = false
  }
}

async function handleRegister(): Promise<void> {
  error.value = ''
  info.value = ''
  loading.value = true
  try {
    await authStore.register(email.value, fullName.value)
    switchTab('login')
    info.value = 'Hesabın oluşturuldu. E-postana gönderilen bağlantıyla doğrula, sonra giriş yap.'
  } catch (e) {
    error.value = extractMessage(e, 'Kayıt başarısız')
  } finally {
    loading.value = false
  }
}

function extractMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string; _server_messages?: string } } }
  const data = err?.response?.data
  if (data?.message) return data.message
  if (data?._server_messages) {
    try {
      const arr = JSON.parse(data._server_messages)
      const first = JSON.parse(arr[0])
      return first.message || fallback
    } catch {
      return fallback
    }
  }
  return fallback
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
    <div class="w-full max-w-sm">
      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 class="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-white">PIM</h1>

        <!-- Tabs -->
        <div class="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
          <button
            type="button"
            @click="switchTab('login')"
            :class="[
              'rounded-md py-2 text-sm font-medium transition',
              tab === 'login' ? 'bg-white text-gray-900 shadow dark:bg-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-300',
            ]"
          >
            Giriş
          </button>
          <button
            type="button"
            @click="switchTab('register')"
            :class="[
              'rounded-md py-2 text-sm font-medium transition',
              tab === 'register' ? 'bg-white text-gray-900 shadow dark:bg-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-300',
            ]"
          >
            Kayıt Ol
          </button>
        </div>

        <div v-if="error" class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {{ error }}
        </div>
        <div v-if="info" class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
          {{ info }}
        </div>

        <!-- Login form -->
        <form v-if="tab === 'login'" @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label for="usr" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">E-posta veya kullanıcı adı</label>
            <input id="usr" v-model="usr" type="text" required autofocus
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-600 focus:ring-primary-600 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="ornek@firma.com" />
          </div>
          <div>
            <label for="pwd" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Parola</label>
            <input id="pwd" v-model="pwd" type="password" required
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-600 focus:ring-primary-600 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Parola" />
          </div>
          <button type="submit" :disabled="loading"
            class="w-full rounded-lg bg-primary-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-50">
            {{ loading ? 'Giriş yapılıyor...' : 'Giriş Yap' }}
          </button>
        </form>

        <!-- Register form -->
        <form v-else @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <label for="fullName" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Ad Soyad</label>
            <input id="fullName" v-model="fullName" type="text" required autofocus
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-600 focus:ring-primary-600 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Ad Soyad" />
          </div>
          <div>
            <label for="email" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">E-posta</label>
            <input id="email" v-model="email" type="email" required
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-600 focus:ring-primary-600 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="ornek@firma.com" />
          </div>
          <button type="submit" :disabled="loading"
            class="w-full rounded-lg bg-primary-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-50">
            {{ loading ? 'Kaydediliyor...' : 'Kayıt Ol' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
