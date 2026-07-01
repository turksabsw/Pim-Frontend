<script setup lang="ts">
/**
 * WorkflowDiagramPreview - Live preview for Step 8 (Workflow Preferences).
 *
 * Renders a state machine diagram showing:
 * - Workflow states as connected nodes with color coding
 * - Transition arrows between states
 * - Complexity level indicator (simple, standard, advanced)
 * - Feature flags: quality check, auto-publish, notifications
 *
 * Updates in real time as the user configures workflow preferences.
 * Receives transformed preview data from useLivePreview composable.
 */
import { computed } from 'vue'
import type { WorkflowDiagramPreviewData, WorkflowStatePreview, WorkflowComplexity } from '@/types'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  data: WorkflowDiagramPreviewData
}>()

// ============================================================================
// Display Helpers
// ============================================================================

/** Workflow complexity metadata */
const COMPLEXITY_META: Record<string, {
  label: string
  description: string
  color: string
  bgColor: string
}> = {
  simple: {
    label: 'Simple',
    description: 'Draft → Published',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950',
  },
  standard: {
    label: 'Standard',
    description: 'Draft → Review → Published',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  advanced: {
    label: 'Advanced',
    description: 'Draft → Enrichment → Review → Approval → Published',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
  },
}

/** Default complexity metadata */
const DEFAULT_COMPLEXITY = {
  label: 'Unknown',
  description: '',
  color: 'text-gray-700 dark:text-gray-400',
  bgColor: 'bg-gray-50 dark:bg-gray-800',
}

/** Whether there is any workflow data to display */
const hasContent = computed(() => {
  return props.data.states.length > 0
})

/** Complexity metadata for the selected level */
const complexityMeta = computed(() => {
  return COMPLEXITY_META[props.data.workflow_complexity] ?? DEFAULT_COMPLEXITY
})

/** Feature flags summary */
const activeFeatures = computed(() => {
  const features: Array<{ label: string; enabled: boolean; icon: string }> = [
    {
      label: 'Quality Check',
      enabled: props.data.require_quality_check,
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Auto-Publish',
      enabled: props.data.auto_publish,
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    },
    {
      label: 'Notifications',
      enabled: props.data.notify_on_status_change,
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    },
  ]
  return features
})

/** Count of enabled features */
const enabledFeatureCount = computed(() => {
  return activeFeatures.value.filter((f) => f.enabled).length
})
</script>

<template>
  <div class="space-y-4">
    <!-- Complexity Badge -->
    <div v-if="hasContent" class="flex items-center justify-center">
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
        :class="[complexityMeta.bgColor, complexityMeta.color]"
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {{ complexityMeta.label }} Workflow
      </span>
    </div>

    <!-- State Machine Diagram -->
    <div v-if="hasContent" class="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-5 shadow-sm">
      <h4 class="mb-4 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Workflow States
      </h4>

      <!-- State Flow -->
      <div class="flex flex-col items-center space-y-2">
        <template v-for="(state, index) in data.states" :key="state.name">
          <!-- State Node -->
          <div class="flex w-full items-center gap-3">
            <!-- State Circle -->
            <div
              class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2"
              :style="{
                borderColor: state.color,
                backgroundColor: state.color + '20',
              }"
            >
              <!-- Initial state icon -->
              <svg
                v-if="state.is_initial"
                class="h-4 w-4"
                :style="{ color: state.color }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
              <!-- Final state icon -->
              <svg
                v-else-if="state.is_final"
                class="h-4 w-4"
                :style="{ color: state.color }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <!-- Intermediate state icon -->
              <div
                v-else
                class="h-2.5 w-2.5 rounded-full"
                :style="{ backgroundColor: state.color }"
              />
            </div>

            <!-- State Info -->
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ state.label }}
              </p>
              <p v-if="state.is_initial" class="text-[10px] text-gray-500 dark:text-gray-400">Initial state</p>
              <p v-else-if="state.is_final" class="text-[10px] text-gray-500 dark:text-gray-400">Final state</p>
              <p v-else class="text-[10px] text-gray-500 dark:text-gray-400">
                {{ state.transitions_to.length }} {{ state.transitions_to.length === 1 ? 'transition' : 'transitions' }}
              </p>
            </div>

            <!-- State Badge -->
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-medium"
              :style="{
                backgroundColor: state.color + '15',
                color: state.color,
              }"
            >
              {{ state.name }}
            </span>
          </div>

          <!-- Transition Arrow (between states, not after last) -->
          <div
            v-if="index < data.states.length - 1"
            class="flex items-center"
          >
            <div class="flex flex-col items-center">
              <div class="h-3 w-px bg-gray-300" />
              <svg class="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Workflow Features -->
    <div v-if="hasContent" class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-4">
      <h4 class="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Workflow Features
        <span class="ml-1 rounded-full bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px]">
          {{ enabledFeatureCount }}/{{ activeFeatures.length }}
        </span>
      </h4>

      <div class="space-y-2">
        <div
          v-for="feature in activeFeatures"
          :key="feature.label"
          class="flex items-center gap-2.5"
        >
          <!-- Feature Icon -->
          <div
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded"
            :class="feature.enabled ? 'bg-green-100 dark:bg-green-900/40' : 'bg-gray-100 dark:bg-gray-700'"
          >
            <svg
              class="h-3.5 w-3.5"
              :class="feature.enabled ? 'text-green-600' : 'text-gray-400'"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="feature.icon" />
            </svg>
          </div>

          <!-- Feature Label -->
          <span
            class="flex-1 text-xs"
            :class="feature.enabled ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'"
          >
            {{ feature.label }}
          </span>

          <!-- Status Toggle Visual -->
          <div
            class="h-4 w-7 rounded-full transition-colors"
            :class="feature.enabled ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-600'"
          >
            <div
              class="h-4 w-4 rounded-full bg-white dark:bg-gray-700 shadow-sm transition-transform"
              :class="feature.enabled ? 'translate-x-3' : 'translate-x-0'"
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
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <p class="text-sm text-gray-500 dark:text-gray-400">Configure workflow preferences to see the diagram</p>
    </div>
  </div>
</template>
