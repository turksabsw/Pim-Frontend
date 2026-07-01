import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const SIDEBAR_COLLAPSED_KEY = 'pim-sidebar-collapsed'

export const useAppStore = defineStore('app', () => {
  const isLoading = ref(false)
  const sidebarOpen = ref(true)
  const sidebarCollapsed = ref(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true')
  const sidebarHovered = ref(false)
  const currentLocale = ref('en')

  const isReady = computed(() => !isLoading.value)

  /** Effective width: collapsed visually but expanded on hover */
  const sidebarExpanded = computed(() => !sidebarCollapsed.value || sidebarHovered.value)

  function setLoading(value: boolean): void {
    isLoading.value = value
  }

  /** Mobile: open/close drawer */
  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value
  }

  /** Desktop: collapse/expand rail */
  function toggleSidebarCollapse(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed.value))
    if (sidebarCollapsed.value) {
      sidebarHovered.value = false
    }
  }

  function setSidebarHovered(value: boolean): void {
    sidebarHovered.value = value
  }

  function setLocale(locale: string): void {
    currentLocale.value = locale
  }

  return {
    isLoading,
    sidebarOpen,
    sidebarCollapsed,
    sidebarHovered,
    sidebarExpanded,
    currentLocale,
    isReady,
    setLoading,
    toggleSidebar,
    toggleSidebarCollapse,
    setSidebarHovered,
    setLocale,
  }
})
