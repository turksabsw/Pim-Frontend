<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface NavItem {
  name: string
  path: string
  icon: string
}

defineProps<{
  navItems: NavItem[]
  currentPath: string
}>()

const emit = defineEmits<{
  (e: 'navigate', path: string): void
}>()

const { t } = useI18n()

function handleNavigate(path: string): void {
  emit('navigate', path)
}
</script>

<template>
  <aside class="flex w-64 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
    <div class="flex h-16 items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-6">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
        P
      </div>
      <span class="text-lg font-semibold text-gray-900 dark:text-white">
        {{ t('app.title') }}
      </span>
    </div>

    <nav class="flex-1 space-y-1 px-3 py-4">
      <button
        v-for="item in navItems"
        :key="item.path"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        :class="
          currentPath === item.path
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
        "
        @click="handleNavigate(item.path)"
      >
        {{ item.name }}
      </button>
    </nav>
  </aside>
</template>
