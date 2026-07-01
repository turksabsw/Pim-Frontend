<script setup lang="ts">
/**
 * IndustryProfilePreview - Live preview for Step 2 (Industry Selection).
 *
 * Renders an industry profile card showing:
 * - Selected industry sector with icon and color
 * - Industry description
 * - Sub-vertical selection (if any)
 * - Template entity counts (attributes, families, categories)
 *
 * Updates in real time as the user selects an industry sector.
 * Receives transformed preview data from useLivePreview composable.
 */
import { computed } from 'vue'
import type { IndustryProfilePreviewData, IndustrySector } from '@/types'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  data: IndustryProfilePreviewData
}>()

// ============================================================================
// Industry Display Metadata
// ============================================================================

/** Industry sector visual metadata: icon (HTML entity) and Tailwind color classes */
const INDUSTRY_META: Record<string, {
  icon: string
  bgColor: string
  textColor: string
  borderColor: string
  accentBg: string
}> = {
  fashion: {
    icon: '&#128087;',
    bgColor: 'bg-pink-50 dark:bg-pink-950',
    textColor: 'text-pink-700 dark:text-pink-400',
    borderColor: 'border-pink-200 dark:border-pink-800',
    accentBg: 'bg-pink-100 dark:bg-pink-900/40',
  },
  industrial: {
    icon: '&#9881;',
    bgColor: 'bg-slate-50 dark:bg-slate-950',
    textColor: 'text-slate-700 dark:text-slate-400',
    borderColor: 'border-slate-200 dark:border-slate-800',
    accentBg: 'bg-slate-100 dark:bg-slate-900/40',
  },
  food: {
    icon: '&#127828;',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
    accentBg: 'bg-amber-100 dark:bg-amber-900/40',
  },
  electronics: {
    icon: '&#128187;',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950',
    textColor: 'text-cyan-700 dark:text-cyan-400',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    accentBg: 'bg-cyan-100 dark:bg-cyan-900/40',
  },
  health_beauty: {
    icon: '&#128142;',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    textColor: 'text-purple-700 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800',
    accentBg: 'bg-purple-100 dark:bg-purple-900/40',
  },
  automotive: {
    icon: '&#128663;',
    bgColor: 'bg-red-50 dark:bg-red-950',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800',
    accentBg: 'bg-red-100 dark:bg-red-900/40',
  },
  custom: {
    icon: '&#128295;',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-400',
    borderColor: 'border-gray-200 dark:border-gray-600',
    accentBg: 'bg-gray-100 dark:bg-gray-700',
  },
}

/** Default visual metadata for unknown sectors */
const DEFAULT_META = {
  icon: '&#128736;',
  bgColor: 'bg-gray-50 dark:bg-gray-800',
  textColor: 'text-gray-700 dark:text-gray-400',
  borderColor: 'border-gray-200 dark:border-gray-600',
  accentBg: 'bg-gray-100 dark:bg-gray-700',
}

// ============================================================================
// Computed
// ============================================================================

/** Visual metadata for the selected industry */
const meta = computed(() => {
  const industry = props.data.selected_industry
  if (!industry) return DEFAULT_META
  return INDUSTRY_META[industry] ?? DEFAULT_META
})

/** Whether any industry is selected */
const hasSelection = computed(() => {
  return !!props.data.selected_industry
})

/** Whether template entity counts are available */
const hasEntityCounts = computed(() => {
  return (
    (props.data.attribute_count ?? 0) > 0 ||
    (props.data.family_count ?? 0) > 0 ||
    (props.data.category_count ?? 0) > 0
  )
})
</script>

<template>
  <div class="space-y-4">
    <!-- Industry Profile Card -->
    <div
      v-if="hasSelection"
      class="overflow-hidden rounded-xl border shadow-sm"
      :class="[meta.borderColor, meta.bgColor]"
    >
      <!-- Card Header -->
      <div class="p-5">
        <div class="flex items-start gap-3">
          <!-- Industry Icon -->
          <div
            class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-2xl"
            :class="meta.accentBg"
            v-html="meta.icon"
          />

          <div class="min-w-0 flex-1">
            <!-- Industry Name -->
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">
              {{ data.industry_label ?? 'Selected Industry' }}
            </h3>

            <!-- Sub-vertical -->
            <p
              v-if="data.sub_vertical"
              class="mt-0.5 text-xs font-medium"
              :class="meta.textColor"
            >
              {{ data.sub_vertical }}
            </p>

            <!-- Description -->
            <p
              v-if="data.industry_description"
              class="mt-1.5 text-xs text-gray-500 dark:text-gray-400"
            >
              {{ data.industry_description }}
            </p>
          </div>
        </div>
      </div>

      <!-- Entity Counts (from template) -->
      <div
        v-if="hasEntityCounts"
        class="grid grid-cols-3 gap-px border-t bg-white/50 dark:bg-gray-700/50"
        :class="meta.borderColor"
      >
        <div class="bg-white dark:bg-gray-700 p-3 text-center">
          <p class="text-lg font-semibold text-primary-600">
            {{ data.attribute_count ?? 0 }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Attributes</p>
        </div>
        <div class="bg-white dark:bg-gray-700 p-3 text-center">
          <p class="text-lg font-semibold text-primary-600">
            {{ data.family_count ?? 0 }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Families</p>
        </div>
        <div class="bg-white dark:bg-gray-700 p-3 text-center">
          <p class="text-lg font-semibold text-primary-600">
            {{ data.category_count ?? 0 }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Categories</p>
        </div>
      </div>
    </div>

    <!-- Template Version Badge -->
    <div
      v-if="hasSelection && data.template_version"
      class="flex items-center justify-center"
    >
      <span class="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        Template v{{ data.template_version }}
      </span>
    </div>

    <!-- What You'll Get Section (no entity counts but has selection) -->
    <div
      v-if="hasSelection && !hasEntityCounts"
      class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-4 text-center"
    >
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Template details will appear after selection is confirmed.
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-if="!hasSelection"
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
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      <p class="text-sm text-gray-500 dark:text-gray-400">Select an industry to see your profile</p>
    </div>
  </div>
</template>
