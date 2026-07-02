<script setup lang="ts">
/**
 * AppLayout - Flowbite admin dashboard application shell.
 *
 * Based on Flowbite Admin Dashboard v2.2.0 layout pattern:
 * fixed navbar (top) + fixed sidebar (left) + scrollable main content.
 */
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'
import type { SidebarNavItem, SidebarNavGroup } from './Sidebar.vue'
import { PIM_NAV_GROUPS } from '@/config/pimNav'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const appStore = useAppStore()

const authStore = useAuthStore()
const userName = ref('')

onMounted(async () => {
  await authStore.fetchCurrentUser()
  userName.value = authStore.user?.full_name ?? authStore.user?.name ?? ''
})

/** Whether current route uses blank layout (no sidebar/topbar) */
const isBlankLayout = computed(() => route.meta.layout === 'blank')

/** Page title from route meta */
const pageTitle = computed(() => (route.meta.title as string) || '')

/** Breadcrumbs computed from current route */
const breadcrumbs = computed(() => {
  const crumbs: Array<{ label: string; path?: string }> = []

  if (route.name === 'dashboard') {
    crumbs.push({ label: t('nav.dashboard') })
  } else if (route.name === 'products') {
    crumbs.push({ label: t('nav.dashboard'), path: '/' })
    crumbs.push({ label: t('nav.products') })
  } else if (route.name === 'doctype-list') {
    crumbs.push({ label: t('nav.dashboard'), path: '/' })
    const dt = route.params.doctype as string
    crumbs.push({ label: dt ? decodeURIComponent(dt) : 'List' })
  } else if (route.name === 'doctype-detail') {
    crumbs.push({ label: t('nav.dashboard'), path: '/' })
    const dt = route.params.doctype as string
    const doctypeLabel = dt ? decodeURIComponent(dt) : 'DocType'
    const listHref = doctypeLabel === 'Product Master' ? '/products' : `/list/${encodeURIComponent(doctypeLabel)}`
    crumbs.push({ label: doctypeLabel, path: listHref })
    const nm = route.params.name as string
    crumbs.push({ label: nm ? decodeURIComponent(nm) : 'Detail' })
  } else if (route.name === 'settings') {
    crumbs.push({ label: t('nav.dashboard'), path: '/' })
    crumbs.push({ label: t('nav.settings') })
  }

  return crumbs
})

/** Top nav: Dashboard only; doctypes come from navGroups */
const navItems = computed<SidebarNavItem[]>(() => [
  {
    label: t('nav.dashboard'),
    path: '/',
    icon: 'dashboard',
  },
])

/** Grouped PIM doctype links for sidebar */
const navGroups = computed<SidebarNavGroup[]>(() =>
  PIM_NAV_GROUPS.map((g) => ({
    label: g.label,
    icon: g.icon,
    items: g.items.map((item) => ({ label: item.label, path: item.path })),
  })),
)

function handleNavigate(path: string): void {
  router.push(path)
}

function handleToggleSidebar(): void {
  appStore.toggleSidebar()
}

function handleSearch(query: string): void {
  if (query) {
    router.push({ path: '/products', query: { search: query } })
  }
}
</script>

<template>
  <!-- Blank layout (for onboarding wizard, etc.) -->
  <div v-if="isBlankLayout" class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <slot />
  </div>

  <!-- Standard Flowbite dashboard layout: fixed navbar + fixed sidebar + scrollable main -->
  <div v-else class="bg-gray-50 antialiased dark:bg-gray-900">
    <!-- Fixed top navbar -->
    <TopBar
      :title="pageTitle"
      :breadcrumbs="breadcrumbs"
      :user-name="userName"
      :show-search="true"
      :show-sidebar-toggle="true"
      @toggle-sidebar="handleToggleSidebar"
      @search="handleSearch"
      @navigate="handleNavigate"
    />

    <!-- Sidebar + main content wrapper (offset by navbar height) -->
    <div class="flex overflow-hidden pt-16">
      <!-- Fixed sidebar -->
      <Sidebar
        :nav-items="navItems"
        :nav-groups="navGroups"
        :current-path="route.path"
        :expanded="appStore.sidebarOpen"
        @navigate="handleNavigate"
        @close="appStore.sidebarOpen = false"
      />

      <!-- Main content area -->
      <div id="main-content" :class="['relative h-full min-h-screen w-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-[margin] duration-200 ease-in-out', appStore.sidebarCollapsed && !appStore.sidebarHovered ? 'lg:ms-16' : 'lg:ms-64']">
        <main>
          <div class="px-4 py-6 sm:px-6 lg:px-8">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
