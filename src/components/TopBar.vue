<script setup lang="ts">
/**
 * TopBar - Flowbite-style admin dashboard navbar.
 *
 * Based on Flowbite Admin Dashboard v2.2.0 navbar-dashboard pattern.
 * Features breadcrumbs, global search, notification bell, and user dropdown.
 */
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    title?: string
    breadcrumbs?: Array<{ label: string; path?: string }>
    showSearch?: boolean
    showSidebarToggle?: boolean
    userName?: string
  }>(),
  {
    showSearch: true,
    showSidebarToggle: true,
    userName: '',
  },
)

const emit = defineEmits<{
  (e: 'toggle-sidebar'): void
  (e: 'search', query: string): void
  (e: 'navigate', path: string): void
}>()

const { t } = useI18n()

const searchQuery = ref('')
const showUserMenu = ref(false)
const isDark = ref(document.documentElement.classList.contains('dark'))

function applyTheme(dark: boolean): void {
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
  // "only light/dark" prevents Chromium auto-darkening
  const scheme = dark ? 'only dark' : 'only light'
  document.documentElement.style.colorScheme = scheme
  const meta = document.querySelector('meta[name="color-scheme"]')
  if (meta) meta.setAttribute('content', scheme)
}

function toggleDarkMode(): void {
  applyTheme(!isDark.value)
  localStorage.setItem('pim-theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  const saved = localStorage.getItem('pim-theme')
  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved === 'dark')
  } else {
    // Sync initial state from whatever main.ts set
    isDark.value = document.documentElement.classList.contains('dark')
    document.documentElement.style.colorScheme = isDark.value ? 'only dark' : 'only light'
  }
})

const userInitials = computed(() => {
  if (!props.userName) return '?'
  return props.userName
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
})

function handleSearch(): void {
  emit('search', searchQuery.value.trim())
}

function handleSearchInput(event: Event): void {
  const target = event.target as HTMLInputElement
  searchQuery.value = target.value
}

function handleBreadcrumbClick(path?: string): void {
  if (path) {
    emit('navigate', path)
  }
}

function toggleUserMenu(): void {
  showUserMenu.value = !showUserMenu.value
}

function closeUserMenu(): void {
  showUserMenu.value = false
}

async function handleLogout(): Promise<void> {
  try {
    await fetch('/api/method/logout', { method: 'POST', credentials: 'include' })
  } finally {
    window.location.href = '/login'
  }
}
</script>

<template>
  <nav class="fixed left-0 right-0 top-0 z-30 flex h-16 w-full items-center border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800 lg:z-30">
    <div class="flex w-full items-center justify-between">
      <!-- Left: toggle + logo + breadcrumbs -->
      <div class="flex items-center justify-start">
        <!-- Sidebar toggle (mobile) -->
        <button
          v-if="showSidebarToggle"
          class="me-2 inline cursor-pointer rounded-sm p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white lg:hidden"
          aria-label="Toggle sidebar"
          @click="emit('toggle-sidebar')"
        >
          <svg class="h-6 w-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5 7h14M5 12h14M5 17h10" />
          </svg>
        </button>

        <!-- Logo -->
        <a class="me-4 flex items-center gap-2" href="/" @click.prevent="emit('navigate', '/')">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
            P
          </div>
          <span class="hidden self-center whitespace-nowrap text-xl font-semibold text-gray-900 dark:text-white sm:flex">
            PIM
          </span>
        </a>

        <!-- Breadcrumbs -->
        <nav
          v-if="breadcrumbs && breadcrumbs.length > 0"
          class="ms-2 hidden items-center gap-1 text-sm sm:flex"
          aria-label="Breadcrumb"
        >
          <template v-for="(crumb, idx) in breadcrumbs" :key="idx">
            <svg
              v-if="idx > 0"
              class="mx-1 h-4 w-4 text-gray-400"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 5 7 7-7 7" />
            </svg>
            <button
              v-if="crumb.path"
              class="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              @click="handleBreadcrumbClick(crumb.path)"
            >
              {{ crumb.label }}
            </button>
            <span v-else class="font-medium text-gray-900 dark:text-white">
              {{ crumb.label }}
            </span>
          </template>
        </nav>

        <!-- Page title fallback -->
        <h2
          v-else-if="title"
          class="ms-2 hidden text-lg font-semibold text-gray-900 dark:text-white sm:block"
        >
          {{ title }}
        </h2>
      </div>

      <!-- Right: search + actions -->
      <div class="flex items-center gap-2 lg:order-2">
        <!-- Search -->
        <div v-if="showSearch" class="hidden md:block">
          <div class="relative">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg class="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
              </svg>
            </div>
            <input
              type="text"
              :value="searchQuery"
              :placeholder="t('common.search') + '...'"
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 pl-9 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
              @input="handleSearchInput"
              @keydown.enter="handleSearch"
            />
          </div>
        </div>

        <!-- Dark mode toggle -->
        <button
          type="button"
          class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleDarkMode"
        >
          <!-- Sun icon (shown in dark mode) -->
          <svg v-if="isDark" class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M13 3a1 1 0 1 0-2 0v2a1 1 0 1 0 2 0V3ZM6.343 4.929A1 1 0 0 0 4.93 6.343l1.414 1.414a1 1 0 0 0 1.414-1.414L6.343 4.929Zm12.728 1.414a1 1 0 0 0-1.414-1.414l-1.414 1.414a1 1 0 0 0 1.414 1.414l1.414-1.414ZM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm-9 4a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2H3Zm16 0a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2h-2ZM7.757 17.657a1 1 0 1 0-1.414-1.414l-1.414 1.414a1 1 0 1 0 1.414 1.414l1.414-1.414Zm9.9-1.414a1 1 0 0 0-1.414 1.414l1.414 1.414a1 1 0 0 0 1.414-1.414l-1.414-1.414ZM13 19a1 1 0 1 0-2 0v2a1 1 0 1 0 2 0v-2Z" clip-rule="evenodd"/>
          </svg>
          <!-- Moon icon (shown in light mode) -->
          <svg v-else class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M11.675 2.015a.998.998 0 0 0-.403.011C6.09 2.4 2 6.722 2 12c0 5.523 4.477 10 10 10 4.356 0 8.058-2.784 9.43-6.667a1 1 0 0 0-1.02-1.33c-.08.006-.105.009-.127.01a7.004 7.004 0 0 1-6.336-10.318 1 1 0 0 0-.272-.68Z" clip-rule="evenodd"/>
          </svg>
        </button>

        <!-- Notification bell -->
        <button
          type="button"
          class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          aria-label="Notifications"
        >
          <svg class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.133 12.632v-1.8a5.406 5.406 0 0 0-4.154-5.262.955.955 0 0 0 .021-.106V3.1a1 1 0 0 0-2 0v2.364a.955.955 0 0 0 .021.106 5.406 5.406 0 0 0-4.154 5.262v1.8C6.867 15.018 5 15.614 5 16.807 5 17.4 5 18 5.538 18h12.924C19 18 19 17.4 19 16.807c0-1.193-1.867-1.789-1.867-4.175ZM8.823 19a3.453 3.453 0 0 0 6.354 0H8.823Z" />
          </svg>
        </button>

        <!-- User avatar + dropdown -->
        <div class="relative">
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            @click="toggleUserMenu"
            @blur="closeUserMenu"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
              {{ userInitials }}
            </div>
            <span class="hidden text-sm font-medium text-gray-900 dark:text-white lg:inline">
              {{ userName || 'User' }}
            </span>
            <svg class="hidden h-4 w-4 lg:inline" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" />
            </svg>
          </button>

          <!-- Dropdown -->
          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="scale-95 opacity-0"
            enter-to-class="scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="scale-100 opacity-100"
            leave-to-class="scale-95 opacity-0"
          >
            <div
              v-if="showUserMenu"
              class="absolute right-0 top-full z-50 mt-1 w-56 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-lg dark:divide-gray-600 dark:border-gray-700 dark:bg-gray-700"
            >
              <!-- User info -->
              <div class="px-4 py-3">
                <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {{ userName || 'User' }}
                </p>
              </div>

              <!-- Menu items -->
              <ul class="py-1">
                <li>
                  <button
                    class="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white"
                    @mousedown.prevent
                    @click="emit('navigate', '/settings')"
                  >
                    <svg class="h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13v-2a1 1 0 0 0-1-1h-.757l-.707-1.707.535-.536a1 1 0 0 0 0-1.414l-1.414-1.414a1 1 0 0 0-1.414 0l-.536.535L14 4.757V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v.757l-1.707.707-.536-.535a1 1 0 0 0-1.414 0L4.929 6.343a1 1 0 0 0 0 1.414l.536.536L4.757 10H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h.757l.707 1.707-.535.536a1 1 0 0 0 0 1.414l1.414 1.414a1 1 0 0 0 1.414 0l.536-.535L10 19.243V20a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-.757l1.707-.708.536.536a1 1 0 0 0 1.414 0l1.414-1.414a1 1 0 0 0 0-1.414l-.535-.536.707-1.707H20a1 1 0 0 0 1-1Z" />
                      <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    </svg>
                    {{ t('nav.settings') }}
                  </button>
                </li>
              </ul>

              <!-- Logout -->
              <div class="py-1">
                <button
                  class="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-500 dark:hover:bg-gray-600"
                  @mousedown.prevent
                  @click="handleLogout"
                >
                  <svg class="h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12H4m12 0-4 4m4-4-4-4m3-4h2a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-2" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </nav>
</template>
