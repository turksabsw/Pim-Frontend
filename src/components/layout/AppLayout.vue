<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppSidebar from './AppSidebar.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const isBlankLayout = computed(() => route.meta.layout === 'blank')

const navItems = computed(() => [
  { name: t('nav.dashboard'), path: '/', icon: 'dashboard' },
  { name: t('nav.products'), path: '/products', icon: 'products' },
  { name: t('nav.settings'), path: '/settings', icon: 'settings' },
])

function navigateTo(path: string): void {
  router.push(path)
}
</script>

<template>
  <div v-if="isBlankLayout" class="min-h-screen">
    <slot />
  </div>

  <div v-else class="flex min-h-screen">
    <AppSidebar
      :nav-items="navItems"
      :current-path="route.path"
      @navigate="navigateTo"
    />
    <main class="flex-1 overflow-auto">
      <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <slot />
      </div>
    </main>
  </div>
</template>
