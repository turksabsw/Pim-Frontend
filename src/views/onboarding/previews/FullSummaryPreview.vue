<script setup lang="ts">
/**
 * FullSummaryPreview - Live preview for Step 12 (Summary & Launch).
 *
 * Renders a complete configuration summary showing:
 * - Readiness indicator (progress toward launch)
 * - Condensed summaries of all 11 previous steps
 * - Skipped steps highlighted
 * - Launch readiness status
 *
 * Aggregates all step preview data into a single overview.
 * Receives transformed preview data from useLivePreview composable.
 */
import { computed } from 'vue'
import type {
  FullSummaryPreviewData,
  WizardStepId,
} from '@/types'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  data: FullSummaryPreviewData
}>()

// ============================================================================
// Display Helpers
// ============================================================================

/** Step summary configuration — how to render each section in the summary */
const STEP_SUMMARIES: Array<{
  stepId: WizardStepId
  label: string
  icon: string
  color: string
  bgColor: string
}> = [
  {
    stepId: 'company_info',
    label: 'Company',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    stepId: 'industry_selection',
    label: 'Industry',
    icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950',
  },
  {
    stepId: 'product_structure',
    label: 'Products',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950',
  },
  {
    stepId: 'attribute_config',
    label: 'Attributes',
    icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
  },
  {
    stepId: 'taxonomy',
    label: 'Taxonomy',
    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950',
  },
  {
    stepId: 'channel_setup',
    label: 'Channels',
    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-950',
  },
  {
    stepId: 'localization',
    label: 'Localization',
    icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
  },
  {
    stepId: 'workflow_preferences',
    label: 'Workflow',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50 dark:bg-slate-950',
  },
  {
    stepId: 'quality_scoring',
    label: 'Quality',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
  },
  {
    stepId: 'integrations',
    label: 'Integrations',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
  },
  {
    stepId: 'compliance',
    label: 'Compliance',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950',
  },
]

/** Completion percentage */
const completionPercent = computed(() => {
  if (props.data.total_steps === 0) return 0
  return Math.round((props.data.total_steps_completed / props.data.total_steps) * 100)
})

/** Whether a given step was skipped */
function isSkipped(stepId: WizardStepId): boolean {
  return props.data.skipped_steps.includes(stepId)
}

/** Get a brief text summary for each step section */
function getStepSummary(stepId: WizardStepId): string {
  switch (stepId) {
    case 'company_info':
      return props.data.company.company_name || 'Not configured'
    case 'industry_selection':
      return props.data.industry.industry_label ?? props.data.industry.selected_industry ?? 'Not selected'
    case 'product_structure': {
      const ps = props.data.product_structure
      const parts: string[] = []
      if (ps.estimated_sku_count) parts.push(`${ps.estimated_sku_count} SKUs`)
      if (ps.uses_variants) parts.push('Variants')
      if (ps.product_family_count) parts.push(`${ps.product_family_count} families`)
      return parts.length > 0 ? parts.join(' · ') : 'Not configured'
    }
    case 'attribute_config':
      return props.data.attributes.total_attributes > 0
        ? `${props.data.attributes.total_attributes} attributes in ${props.data.attributes.groups.length} groups`
        : 'Not configured'
    case 'taxonomy':
      return props.data.taxonomy.total_categories > 0
        ? `${props.data.taxonomy.total_categories} categories, ${props.data.taxonomy.brands.length} brands`
        : 'Not configured'
    case 'channel_setup':
      return props.data.channels.channels.length > 0
        ? `${props.data.channels.channels.length} channels`
        : 'Not configured'
    case 'localization': {
      const loc = props.data.localization
      const langCount = 1 + loc.additional_languages.length
      return loc.primary_language
        ? `${langCount} language${langCount > 1 ? 's' : ''}, ${loc.default_currency ?? 'No currency'}`
        : 'Not configured'
    }
    case 'workflow_preferences':
      return props.data.workflow.states.length > 0
        ? `${props.data.workflow.workflow_complexity} workflow (${props.data.workflow.states.length} states)`
        : 'Not configured'
    case 'quality_scoring':
      return `${props.data.quality.quality_threshold}% threshold, ${props.data.quality.dimensions.length} dimensions`
    case 'integrations':
      return `${props.data.integrations.total_enabled}/${props.data.integrations.integrations.length} enabled`
    case 'compliance':
      return props.data.compliance.total_standards > 0
        ? `${props.data.compliance.total_standards} standards`
        : 'No standards selected'
    default:
      return 'Not configured'
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Readiness Header -->
    <div class="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-5 shadow-sm">
      <div class="text-center">
        <!-- Readiness Icon -->
        <div
          class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
          :class="data.ready_to_launch ? 'bg-green-100 dark:bg-green-900/40' : 'bg-amber-100 dark:bg-amber-900/40'"
        >
          <svg
            v-if="data.ready_to_launch"
            class="h-7 w-7 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <svg
            v-else
            class="h-7 w-7 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h3 class="text-base font-semibold text-gray-900 dark:text-white">
          {{ data.ready_to_launch ? 'Ready to Launch!' : 'Almost There' }}
        </h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {{ data.total_steps_completed }} of {{ data.total_steps }} steps completed
          <template v-if="data.skipped_steps.length > 0">
            · {{ data.skipped_steps.length }} skipped
          </template>
        </p>
      </div>

      <!-- Progress Bar -->
      <div class="mt-4">
        <div class="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
          <span>Progress</span>
          <span>{{ completionPercent }}%</span>
        </div>
        <div class="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-600">
          <div
            class="h-full rounded-full transition-all duration-700"
            :class="data.ready_to_launch ? 'bg-green-500' : 'bg-primary-500'"
            :style="{ width: `${completionPercent}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Configuration Summary Cards -->
    <div class="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 shadow-sm">
      <div class="border-b border-gray-100 dark:border-gray-600 px-4 py-3">
        <h4 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Configuration Summary
        </h4>
      </div>

      <div class="divide-y divide-gray-50 dark:divide-gray-600">
        <div
          v-for="step in STEP_SUMMARIES"
          :key="step.stepId"
          class="flex items-center gap-3 px-4 py-3"
          :class="isSkipped(step.stepId) ? 'opacity-50' : ''"
        >
          <!-- Step Icon -->
          <div
            class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            :class="isSkipped(step.stepId) ? 'bg-gray-100 dark:bg-gray-700' : step.bgColor"
          >
            <svg
              class="h-4 w-4"
              :class="isSkipped(step.stepId) ? 'text-gray-400' : step.color"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                :d="step.icon"
              />
            </svg>
          </div>

          <!-- Step Info -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-gray-900 dark:text-white">
                {{ step.label }}
              </span>
              <span
                v-if="isSkipped(step.stepId)"
                class="rounded-full bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:text-gray-400"
              >
                Skipped
              </span>
            </div>
            <p class="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
              {{ getStepSummary(step.stepId) }}
            </p>
          </div>

          <!-- Status Indicator -->
          <div class="flex-shrink-0">
            <svg
              v-if="!isSkipped(step.stepId)"
              class="h-4 w-4 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg
              v-else
              class="h-4 w-4 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Key Stats -->
    <div class="grid grid-cols-3 gap-2">
      <div class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-3 text-center">
        <p class="text-lg font-semibold text-primary-600">
          {{ data.attributes.total_attributes }}
        </p>
        <p class="text-[10px] text-gray-500 dark:text-gray-400">Attributes</p>
      </div>
      <div class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-3 text-center">
        <p class="text-lg font-semibold text-green-600">
          {{ data.taxonomy.total_categories }}
        </p>
        <p class="text-[10px] text-gray-500 dark:text-gray-400">Categories</p>
      </div>
      <div class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-3 text-center">
        <p class="text-lg font-semibold text-purple-600">
          {{ data.channels.channels.length }}
        </p>
        <p class="text-[10px] text-gray-500 dark:text-gray-400">Channels</p>
      </div>
    </div>

    <!-- Launch Reminder -->
    <div
      v-if="data.ready_to_launch"
      class="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 p-3"
    >
      <svg class="h-4 w-4 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <p class="text-xs text-green-700 dark:text-green-400">
        Your PIM environment is configured and ready to launch. Click <strong>"Launch PIM"</strong> to create all entities and start using your system.
      </p>
    </div>

    <div
      v-else
      class="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-3"
    >
      <svg class="h-4 w-4 flex-shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p class="text-xs text-amber-700 dark:text-amber-400">
        Please complete all required steps before launching. You can skip optional steps (Quality, Integrations, Compliance).
      </p>
    </div>
  </div>
</template>
