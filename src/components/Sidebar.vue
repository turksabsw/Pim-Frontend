<script setup lang="ts">
/**
 * Sidebar - Flowbite Pro collapsible admin sidebar.
 *
 * Based on Flowbite Admin Dashboard v2.2.0 sidebar pattern:
 * - w-64 (expanded) ↔ w-16 (collapsed icon rail)
 * - Hover-to-expand when collapsed
 * - localStorage persistence for collapsed state
 * - Responsive mobile drawer
 * - Unique SVG icons per navigation group
 */
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { useOnboardingStore } from '@/stores/onboarding'

export interface SidebarNavItem {
  label: string
  path: string
  icon: string
  badge?: number
  visible?: boolean
}

export interface SidebarNavGroup {
  label: string
  icon?: string
  items: Array<{ label: string; path: string }>
}

const props = withDefaults(
  defineProps<{
    navItems: SidebarNavItem[]
    navGroups?: SidebarNavGroup[]
    currentPath: string
    expanded?: boolean
    appTitle?: string
  }>(),
  {
    navGroups: () => [],
    expanded: true,
    appTitle: 'PIM',
  },
)

const emit = defineEmits<{
  (e: 'navigate', path: string): void
  (e: 'close'): void
}>()

const appStore = useAppStore()
const onboardingStore = useOnboardingStore()

const isOnboardingCompleted = computed(() =>
  onboardingStore.onboardingStatus === 'completed' || onboardingStore.onboardingStatus === 'skipped'
)

const visibleItems = computed(() =>
  props.navItems.filter((item) => item.visible !== false),
)

/** Whether sidebar shows full width (not collapsed, or hovered while collapsed) */
const isWide = computed(() => appStore.sidebarExpanded)

// Track which group is expanded (only one at a time)
const expandedGroupIdx = ref<number | null>(null)

function toggleGroup(idx: number): void {
  expandedGroupIdx.value = expandedGroupIdx.value === idx ? null : idx
}

function isGroupExpanded(idx: number): boolean {
  const group = props.navGroups[idx]
  if (group?.items.some((item) => props.currentPath.startsWith(item.path))) {
    if (expandedGroupIdx.value === null) expandedGroupIdx.value = idx
    return true
  }
  return expandedGroupIdx.value === idx
}

function isActive(path: string): boolean {
  if (path === '/') return props.currentPath === '/'
  return props.currentPath.startsWith(path)
}


function handleNavigate(path: string): void {
  emit('navigate', path)
  emit('close')
}

function onMouseEnter(): void {
  if (appStore.sidebarCollapsed) {
    appStore.setSidebarHovered(true)
  }
}

function onMouseLeave(): void {
  if (appStore.sidebarCollapsed) {
    appStore.setSidebarHovered(false)
  }
}
</script>

<template>
  <!-- Overlay for mobile -->
  <div
    v-if="expanded"
    class="fixed inset-0 z-30 bg-gray-900/50 lg:hidden"
    @click="emit('close')"
  />

  <!-- Sidebar -->
  <aside
    id="sidebar"
    :class="[
      'fixed left-0 top-0 z-40 h-screen transition-all duration-200 ease-in-out lg:translate-x-0 lg:pt-16',
      expanded ? 'translate-x-0' : '-translate-x-full',
      isWide ? 'w-64' : 'w-16',
    ]"
    aria-label="Sidebar"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div class="flex h-full flex-col overflow-y-auto overflow-x-hidden border-r border-gray-200 bg-white px-3 py-4 dark:border-gray-700 dark:bg-gray-800">
      <!-- Logo (visible on mobile, hidden on desktop where navbar has logo) -->
      <div class="mb-4 flex items-center gap-3 px-2 lg:hidden">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
          P
        </div>
        <span v-if="isWide" class="text-lg font-semibold text-gray-900 dark:text-white">{{ appTitle }}</span>
      </div>

      <!-- Collapse toggle button (desktop only) -->
      <div class="mb-2 hidden lg:flex" :class="isWide ? 'justify-end' : 'justify-center'">
        <button
          type="button"
          class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          :title="appStore.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          @click="appStore.toggleSidebarCollapse()"
        >
          <svg
            class="h-5 w-5 transition-transform duration-200"
            :class="appStore.sidebarCollapsed ? 'rotate-180' : ''"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <ul class="flex-1 text-sm font-normal">
        <!-- Top-level items (Dashboard) -->
        <li v-for="item in visibleItems" :key="'top-' + item.path" class="mb-1">
          <button
            :class="[
              'group flex h-8 w-full items-center rounded-md px-2 text-[13px]',
              isActive(item.path)
                ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white',
            ]"
            :title="!isWide ? item.label : undefined"
            @click="handleNavigate(item.path)"
          >
            <!-- Dashboard icon -->
            <svg
              :class="[
                'h-5 w-5 shrink-0 transition duration-75',
                isActive(item.path)
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white',
              ]"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M13.5 2c-.178 0-.356.013-.492.022l-.074.005a1 1 0 0 0-.934.998V11a1 1 0 0 0 1 1h7.975a1 1 0 0 0 .998-.934l.005-.074A7.04 7.04 0 0 0 22 10.5 8.5 8.5 0 0 0 13.5 2Z" />
              <path d="M11 6.025a1 1 0 0 0-1.065-.998 8.5 8.5 0 1 0 9.038 9.039A1 1 0 0 0 17.975 13H11V6.025Z" />
            </svg>

            <span v-if="isWide" class="ms-3 flex-1 whitespace-nowrap text-left">{{ item.label }}</span>

            <!-- Badge -->
            <span
              v-if="item.badge && item.badge > 0 && isWide"
              class="ms-3 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-100 px-2 text-xs font-medium text-primary-800 dark:bg-primary-900 dark:text-primary-300"
            >
              {{ item.badge > 99 ? '99+' : item.badge }}
            </span>
          </button>
        </li>

        <!-- Grouped doctype links -->
        <template v-for="(group, gIdx) in navGroups" :key="'group-' + gIdx">
          <li v-if="gIdx > 0" class="mx-2 my-0.5 border-t border-gray-200 dark:border-gray-700" />
          <li>
            <!-- Group header (collapsible) -->
            <button
              type="button"
              class="group flex h-8 w-full items-center rounded-md px-2 text-[13px] font-normal text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
              :title="!isWide ? group.label : undefined"
              @click="isWide ? toggleGroup(gIdx) : handleNavigate(group.items[0]?.path || '/')"
            >
              <!-- Products icon -->
              <svg
                v-if="group.icon === 'products'"
                class="h-4 w-4 shrink-0 text-gray-400 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"
              >
                <path fill-rule="evenodd" d="M14 7h-4v3a1 1 0 0 1-2 0V7H6a1 1 0 0 0-.997.923l-.917 11.924A2 2 0 0 0 6.08 22h11.84a2 2 0 0 0 1.994-2.153l-.917-11.924A1 1 0 0 0 18 7h-2v3a1 1 0 1 1-2 0V7Zm-2-3a2 2 0 0 0-2 2v1H8V6a4 4 0 1 1 8 0v1h-2V6a2 2 0 0 0-2-2Z" clip-rule="evenodd"/>
              </svg>

              <!-- Attributes icon (tag) -->
              <svg
                v-else-if="group.icon === 'attributes'"
                class="h-4 w-4 shrink-0 text-gray-400 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"
              >
                <path d="M18.045 3.007 12.31 3a1.965 1.965 0 0 0-1.4.585l-7.33 7.394a2 2 0 0 0 0 2.805l6.573 6.631a1.957 1.957 0 0 0 1.4.585 1.965 1.965 0 0 0 1.4-.585l7.409-7.477A2 2 0 0 0 21 11.479V5.948a2.953 2.953 0 0 0-2.955-2.941Zm-2.452 6.438a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>
              </svg>

              <!-- Classification icon (folder tree) -->
              <svg
                v-else-if="group.icon === 'categories'"
                class="h-4 w-4 shrink-0 text-gray-400 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"
              >
                <path fill-rule="evenodd" d="M3 6a2 2 0 0 1 2-2h5.532a2 2 0 0 1 1.536.72l1.9 2.28H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm8 10a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2-1a1 1 0 0 1 1 1 1 1 0 1 1-2 0 1 1 0 0 1 1-1Zm5 1a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-9-5a1 1 0 0 1 1 1 1 1 0 1 1-2 0 1 1 0 0 1 1-1Zm4 0a1 1 0 0 1 1 1 1 1 0 1 1-2 0 1 1 0 0 1 1-1Z" clip-rule="evenodd"/>
              </svg>

              <!-- Pricing icon (currency/dollar) -->
              <svg
                v-else-if="group.icon === 'pricing'"
                class="h-4 w-4 shrink-0 text-gray-400 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              >
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17.345a4.76 4.76 0 0 0 2.558 1.618c2.274.589 4.512-.446 4.999-2.31.487-1.866-1.273-3.9-3.546-4.49-2.273-.59-4.034-2.623-3.547-4.49.487-1.864 2.725-2.899 4.999-2.31A4.76 4.76 0 0 1 16 6.955M12 2v20"/>
              </svg>

              <!-- Templates icon (document/clipboard) -->
              <svg
                v-else-if="group.icon === 'templates'"
                class="h-4 w-4 shrink-0 text-gray-400 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"
              >
                <path fill-rule="evenodd" d="M9 2.221V7H4.221a2 2 0 0 1 .365-.5L8.5 2.586A2 2 0 0 1 9 2.22ZM11 2v5a2 2 0 0 1-2 2H4v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-7Zm-.293 9.293a1 1 0 0 1 0 1.414L9.414 14l1.293 1.293a1 1 0 0 1-1.414 1.414l-2-2a1 1 0 0 1 0-1.414l2-2a1 1 0 0 1 1.414 0Zm2.586 0a1 1 0 0 1 1.414 0l2 2a1 1 0 0 1 0 1.414l-2 2a1 1 0 0 1-1.414-1.414L14.586 14l-1.293-1.293a1 1 0 0 1 0-1.414Z" clip-rule="evenodd"/>
              </svg>

              <!-- Quality icon (shield check) -->
              <svg
                v-else-if="group.icon === 'quality'"
                class="h-4 w-4 shrink-0 text-gray-400 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"
              >
                <path fill-rule="evenodd" d="M12 2c-.791 0-1.55.314-2.11.874l-.893.893a.985.985 0 0 1-.696.288H7.04A2.984 2.984 0 0 0 4.055 7.04v1.262a.986.986 0 0 1-.288.696l-.893.893a2.984 2.984 0 0 0 0 4.22l.893.893a.985.985 0 0 1 .288.696v1.262a2.984 2.984 0 0 0 2.984 2.984h1.262c.261 0 .512.104.696.288l.893.893a2.984 2.984 0 0 0 4.22 0l.893-.893a.985.985 0 0 1 .696-.288h1.262a2.984 2.984 0 0 0 2.984-2.984V15.7c0-.261.104-.512.288-.696l.893-.893a2.984 2.984 0 0 0 0-4.22l-.893-.893a.985.985 0 0 1-.288-.696V7.04a2.984 2.984 0 0 0-2.984-2.984h-1.262a.985.985 0 0 1-.696-.288l-.893-.893A2.984 2.984 0 0 0 12 2Zm3.683 7.73a1 1 0 1 0-1.414-1.413l-4.253 4.253-1.277-1.277a1 1 0 0 0-1.415 1.414l1.985 1.984a1 1 0 0 0 1.414 0l4.96-4.96Z" clip-rule="evenodd"/>
              </svg>

              <!-- Market Intelligence icon (chart/trending) -->
              <svg
                v-else-if="group.icon === 'market'"
                class="h-4 w-4 shrink-0 text-gray-400 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              >
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4.5V19a1 1 0 0 0 1 1h15M7 14l4-4 4 4 5-5m0 0h-3.207M20 9v3.207"/>
              </svg>

              <!-- MDM icon (database) -->
              <svg
                v-else-if="group.icon === 'mdm'"
                class="h-4 w-4 shrink-0 text-gray-400 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"
              >
                <path d="M12 4C7.582 4 4 5.79 4 8s3.582 4 8 4 8-1.79 8-4-3.582-4-8-4Z"/>
                <path d="M4 12c0 2.21 3.582 4 8 4s8-1.79 8-4V9.5c-1.457 1.468-4.377 2.5-8 2.5s-6.543-1.032-8-2.5V12Z"/>
                <path d="M4 16c0 2.21 3.582 4 8 4s8-1.79 8-4v-2.5c-1.457 1.468-4.377 2.5-8 2.5s-6.543-1.032-8-2.5V16Z"/>
              </svg>

              <!-- AI icon (sparkles/brain) -->
              <svg
                v-else-if="group.icon === 'ai'"
                class="h-4 w-4 shrink-0 text-gray-400 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"
              >
                <path d="M9.032 11l.862-1.724L11.618 8.5l-1.724-.776L9.032 6l-.862 1.724L6.446 8.5l1.724.776L9.032 11Zm0 0"/>
                <path d="M15 2l-1.5 3L10.5 6.5l3 1.5L15 11l1.5-3 3-1.5-3-1.5L15 2Z"/>
                <path d="M9.032 19l1.139-2.278L12.45 15.5l-2.279-1.222L9.032 12l-1.139 2.278L5.614 15.5l2.279 1.222L9.032 19Z"/>
                <path d="M19 13l-1.065 2.13L15.8 16.2l2.135 1.07L19 19.4l1.065-2.13L22.2 16.2l-2.135-1.07L19 13Z"/>
              </svg>

              <!-- Locale icon (globe) -->
              <svg
                v-else-if="group.icon === 'locale'"
                class="h-4 w-4 shrink-0 text-gray-400 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              >
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/>
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18"/>
              </svg>

              <!-- Portal icon (users/shield) -->
              <svg
                v-else-if="group.icon === 'portal'"
                class="h-4 w-4 shrink-0 text-gray-400 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"
              >
                <path fill-rule="evenodd" d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4H6Zm7.25-2.095c.478-.86.75-1.85.75-2.905a5.973 5.973 0 0 0-.75-2.906 4 4 0 1 1 0 5.811ZM15.466 20c.34-.588.535-1.271.535-2v-1a5.978 5.978 0 0 0-1.528-4H18a4 4 0 0 1 4 4v1a2 2 0 0 1-2 2h-4.535Z" clip-rule="evenodd"/>
              </svg>

              <!-- Settings icon (gear) -->
              <svg
                v-else-if="group.icon === 'settings'"
                class="h-4 w-4 shrink-0 text-gray-400 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"
              >
                <path fill-rule="evenodd" d="M9.586 2.586A2 2 0 0 1 11 2h2a2 2 0 0 1 2 2v.089l.473.196.335-.335a2 2 0 0 1 2.828 0l1.414 1.414a2 2 0 0 1 0 2.827l-.335.336.196.473H20a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-.089l-.196.473.335.335a2 2 0 0 1 0 2.828l-1.414 1.414a2 2 0 0 1-2.828 0l-.335-.335-.473.196V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.089l-.473-.196-.335.335a2 2 0 0 1-2.828 0L3.636 18.636a2 2 0 0 1 0-2.828l.335-.335L3.775 15H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h.089l.196-.473-.335-.335a2 2 0 0 1 0-2.828L5.364 3.95a2 2 0 0 1 2.828 0l.335.335.473-.196V4a2 2 0 0 1 .586-1.414ZM8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clip-rule="evenodd"/>
              </svg>

              <!-- Fallback icon -->
              <svg
                v-else
                class="h-4 w-4 shrink-0 text-gray-400 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>

              <span v-if="isWide" class="ms-3 flex-1 whitespace-nowrap text-left">{{ group.label }}</span>
              <svg
                v-if="isWide"
                :class="[
                  'h-3.5 w-3.5 transition-transform duration-200',
                  isGroupExpanded(gIdx) ? 'rotate-180' : '',
                ]"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" />
              </svg>
            </button>

            <!-- Group sub-items (only when wide) -->
            <Transition name="accordion">
              <div
                v-if="isWide && isGroupExpanded(gIdx)"
                class="accordion-wrap"
              >
              <ul class="space-y-0.5 py-1">
                <li v-for="link in group.items" :key="link.path">
                  <button
                    :class="[
                      'group flex w-full items-center rounded-md py-1.5 pl-9 pr-2 text-[13px] text-gray-600 dark:text-gray-300',
                      isActive(link.path)
                        ? 'bg-gray-100 font-medium text-gray-900 dark:bg-gray-700 dark:text-white'
                        : 'hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white',
                    ]"
                    @click="handleNavigate(link.path)"
                  >
                    <span class="mr-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
                    {{ link.label }}
                  </button>
                </li>
              </ul>
              </div>
            </Transition>
          </li>
        </template>
      </ul>

      <!-- Bottom section -->
      <div class="mt-auto space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
        <!-- Onboarding / Setup Wizard -->
        <button
          :class="[
            'group flex h-10 w-full items-center rounded-lg p-2 text-base font-medium transition-colors duration-150',
            isActive(isOnboardingCompleted ? '/settings/onboarding-configuration' : '/onboarding')
              ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white',
          ]"
          :title="!isWide ? (isOnboardingCompleted ? 'Onboarding Configuration' : 'Setup Wizard') : undefined"
          @click="handleNavigate(isOnboardingCompleted ? '/settings/onboarding-configuration' : '/onboarding')"
        >
          <svg
            :class="[
              'h-5 w-5 shrink-0 transition duration-75',
              isActive(isOnboardingCompleted ? '/settings/onboarding-configuration' : '/onboarding')
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-400 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white',
            ]"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path fill-rule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm9.408-5.5a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2h-.01ZM10 10a1 1 0 1 0 0 2h1v3h-1a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2h-1v-4a1 1 0 0 0-1-1h-2Z" clip-rule="evenodd"/>
          </svg>
          <span v-if="isWide" class="ms-3 flex-1 whitespace-nowrap text-left">
            {{ isOnboardingCompleted ? 'Onboarding Configuration' : 'Setup Wizard' }}
          </span>
        </button>

        <!-- Help -->
        <a
          href="https://docs.frappe.io"
          target="_blank"
          class="group flex h-10 w-full items-center rounded-lg p-2 text-base font-medium text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
          :title="!isWide ? 'Help' : undefined"
        >
          <svg
            class="h-4 w-4 shrink-0 text-gray-400 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
            aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"
          >
            <path fill-rule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm9.008-3.018a1.502 1.502 0 0 1 2.522 1.159v.024a1.44 1.44 0 0 1-1.493 1.418 1 1 0 0 0-1.037.999V14a1 1 0 1 0 2 0v-.539a3.44 3.44 0 0 0 2.529-3.256 3.502 3.502 0 0 0-7-.255 1 1 0 0 0 2 .076c.014-.398.187-.774.48-1.044Zm.982 7.026a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2h-.01Z" clip-rule="evenodd"/>
          </svg>
          <span v-if="isWide" class="ms-3 flex-1 whitespace-nowrap text-left">Help</span>
        </a>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.accordion-enter-active,
.accordion-leave-active {
  display: grid;
  transition: grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.28s ease;
}

.accordion-enter-from,
.accordion-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}

.accordion-enter-to,
.accordion-leave-from {
  grid-template-rows: 1fr;
  opacity: 1;
}

.accordion-wrap {
  overflow: hidden;
}
</style>

