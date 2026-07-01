<script setup lang="ts">
/**
 * IntegrationBoardPreview - Live preview for Step 10 (Integrations).
 *
 * Renders an integration status board showing:
 * - Integration cards with enabled/disabled status
 * - Icon and description for each integration
 * - Configuration summary when enabled
 * - Total enabled count badge
 *
 * Updates in real time as the user configures integrations.
 * Receives transformed preview data from useLivePreview composable.
 */
import { computed } from 'vue'
import type { IntegrationBoardPreviewData, IntegrationPreview } from '@/types'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  data: IntegrationBoardPreviewData
}>()

// ============================================================================
// Display Helpers
// ============================================================================

/** Integration icon SVG paths keyed by integration ID */
const INTEGRATION_ICONS: Record<string, string> = {
  erp_sync: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  ai_enrichment: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  gs1: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z',
  mdm: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
}

/** Default icon for unknown integrations */
const DEFAULT_ICON = 'M13 10V3L4 14h7v7l9-11h-7z'

/** Integration color metadata */
const INTEGRATION_COLORS: Record<string, {
  enabledBg: string
  enabledText: string
  enabledBorder: string
}> = {
  erp_sync: { enabledBg: 'bg-blue-50 dark:bg-blue-950', enabledText: 'text-blue-600 dark:text-blue-400', enabledBorder: 'border-blue-200 dark:border-blue-800' },
  ai_enrichment: { enabledBg: 'bg-purple-50 dark:bg-purple-950', enabledText: 'text-purple-600 dark:text-purple-400', enabledBorder: 'border-purple-200 dark:border-purple-800' },
  gs1: { enabledBg: 'bg-green-50 dark:bg-green-950', enabledText: 'text-green-600 dark:text-green-400', enabledBorder: 'border-green-200 dark:border-green-800' },
  mdm: { enabledBg: 'bg-amber-50 dark:bg-amber-950', enabledText: 'text-amber-600 dark:text-amber-400', enabledBorder: 'border-amber-200 dark:border-amber-800' },
}

/** Default integration colors */
const DEFAULT_COLORS = {
  enabledBg: 'bg-gray-50 dark:bg-gray-800',
  enabledText: 'text-gray-600 dark:text-gray-400',
  enabledBorder: 'border-gray-200 dark:border-gray-600',
}

/** Whether there are any integrations to display */
const hasContent = computed(() => {
  return props.data.integrations.length > 0
})

/** Get icon SVG path for an integration */
function getIcon(id: string): string {
  return INTEGRATION_ICONS[id] ?? DEFAULT_ICON
}

/** Get color metadata for an integration */
function getColors(id: string): { enabledBg: string; enabledText: string; enabledBorder: string } {
  return INTEGRATION_COLORS[id] ?? DEFAULT_COLORS
}
</script>

<template>
  <div class="space-y-4">
    <!-- Summary Header -->
    <div v-if="hasContent" class="flex items-center justify-center">
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
        :class="data.total_enabled > 0 ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'"
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {{ data.total_enabled }} / {{ data.integrations.length }} Integrations Active
      </span>
    </div>

    <!-- Integration Board -->
    <div v-if="hasContent" class="space-y-2">
      <div
        v-for="integration in data.integrations"
        :key="integration.id"
        class="rounded-xl border bg-white dark:bg-gray-700 p-4 transition-all duration-300"
        :class="integration.enabled
          ? [getColors(integration.id).enabledBorder, 'shadow-sm']
          : 'border-gray-100 dark:border-gray-600 opacity-60'"
      >
        <div class="flex items-start gap-3">
          <!-- Integration Icon -->
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
            :class="integration.enabled
              ? getColors(integration.id).enabledBg
              : 'bg-gray-100 dark:bg-gray-700'"
          >
            <svg
              class="h-5 w-5"
              :class="integration.enabled
                ? getColors(integration.id).enabledText
                : 'text-gray-400'"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                :d="getIcon(integration.id)"
              />
            </svg>
          </div>

          <!-- Integration Info -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3
                class="text-sm font-medium"
                :class="integration.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400'"
              >
                {{ integration.label }}
              </h3>

              <!-- Status Badge -->
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-medium"
                :class="integration.enabled
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'"
              >
                {{ integration.enabled ? 'Enabled' : 'Disabled' }}
              </span>
            </div>

            <p
              class="mt-0.5 text-xs"
              :class="integration.enabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-300'"
            >
              {{ integration.description }}
            </p>

            <!-- Config Summary (when enabled and has config) -->
            <div
              v-if="integration.enabled && integration.config_summary"
              class="mt-2 flex items-center gap-1.5 rounded-md bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5"
            >
              <svg class="h-3 w-3 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span class="text-[11px] text-gray-500 dark:text-gray-400">{{ integration.config_summary }}</span>
            </div>
          </div>

          <!-- Toggle Visual -->
          <div
            class="mt-1 h-5 w-9 flex-shrink-0 rounded-full transition-colors"
            :class="integration.enabled ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-600'"
          >
            <div
              class="h-5 w-5 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform"
              :class="integration.enabled ? 'translate-x-4' : 'translate-x-0'"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!hasContent"
      class="flex flex-col items-center justify-center py-8 text-center"
    >
      <svg
        class="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
      <p class="text-sm text-gray-500 dark:text-gray-400">Configure integrations to see the status board</p>
    </div>
  </div>
</template>
