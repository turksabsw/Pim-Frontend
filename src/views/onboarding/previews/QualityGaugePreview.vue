<script setup lang="ts">
/**
 * QualityGaugePreview - Live preview for Step 9 (Quality Scoring).
 *
 * Renders a quality scoring gauge visualization showing:
 * - Quality threshold gauge with percentage indicator
 * - Threshold line showing minimum quality requirement
 * - Scoring dimension breakdown (radar-style bar chart)
 * - Weight distribution across quality dimensions
 *
 * Updates in real time as the user configures quality scoring.
 * Receives transformed preview data from useLivePreview composable.
 */
import { computed } from 'vue'
import type { QualityGaugePreviewData, QualityDimensionPreview } from '@/types'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  data: QualityGaugePreviewData
}>()

// ============================================================================
// Display Helpers
// ============================================================================

/** Threshold color based on value */
const thresholdColor = computed(() => {
  const t = props.data.quality_threshold
  if (t >= 85) return { text: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950', ring: 'ring-green-200 dark:ring-green-800', fill: '#22c55e' }
  if (t >= 70) return { text: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950', ring: 'ring-blue-200 dark:ring-blue-800', fill: '#3b82f6' }
  if (t >= 50) return { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950', ring: 'ring-amber-200 dark:ring-amber-800', fill: '#f59e0b' }
  return { text: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950', ring: 'ring-red-200 dark:ring-red-800', fill: '#ef4444' }
})

/** Whether there is any quality data to display */
const hasContent = computed(() => {
  return props.data.dimensions.length > 0
})

/** Total weight across all dimensions */
const totalWeight = computed(() => {
  return props.data.dimensions.reduce((sum, d) => sum + d.weight, 0)
})

/** Max weight among dimensions (for bar scaling) */
const maxWeight = computed(() => {
  return Math.max(...props.data.dimensions.map((d) => d.weight), 1)
})

/** Threshold quality label */
const thresholdLabel = computed(() => {
  const t = props.data.quality_threshold
  if (t >= 90) return 'Excellent'
  if (t >= 75) return 'Good'
  if (t >= 60) return 'Acceptable'
  if (t >= 40) return 'Needs Improvement'
  return 'Minimal'
})

/** SVG gauge arc parameters */
const gaugeArc = computed(() => {
  const radius = 60
  const circumference = Math.PI * radius
  const progress = (props.data.quality_threshold / 100) * circumference
  return { radius, circumference, progress }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Quality Threshold Gauge -->
    <div v-if="hasContent" class="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-5 shadow-sm">
      <h4 class="mb-4 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Quality Threshold
      </h4>

      <!-- Semi-circle Gauge -->
      <div class="flex justify-center">
        <div class="relative">
          <svg width="160" height="90" viewBox="0 0 160 90">
            <!-- Background arc -->
            <path
              d="M 10 80 A 60 60 0 0 1 150 80"
              fill="none"
              stroke="#e5e7eb"
              stroke-width="10"
              stroke-linecap="round"
            />
            <!-- Progress arc -->
            <path
              d="M 10 80 A 60 60 0 0 1 150 80"
              fill="none"
              :stroke="thresholdColor.fill"
              stroke-width="10"
              stroke-linecap="round"
              :stroke-dasharray="`${gaugeArc.progress} ${gaugeArc.circumference}`"
              class="transition-all duration-500"
            />
          </svg>

          <!-- Threshold Value -->
          <div class="absolute inset-x-0 bottom-0 text-center">
            <span class="text-2xl font-bold" :class="thresholdColor.text">
              {{ data.quality_threshold }}%
            </span>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ thresholdLabel }}</p>
          </div>
        </div>
      </div>

      <!-- Threshold Legend -->
      <div class="mt-3 flex items-center justify-center gap-1">
        <svg class="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-[10px] text-gray-500 dark:text-gray-400">
          Products below this threshold will be flagged for review
        </span>
      </div>
    </div>

    <!-- Scoring Dimensions -->
    <div v-if="hasContent" class="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 shadow-sm">
      <div class="border-b border-gray-100 dark:border-gray-600 px-4 py-3">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Scoring Dimensions
          </h4>
          <span class="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[10px] text-gray-500 dark:text-gray-400">
            {{ totalWeight }}% total
          </span>
        </div>
      </div>

      <div class="divide-y divide-gray-50 dark:divide-gray-600 p-4">
        <div
          v-for="dimension in data.dimensions"
          :key="dimension.key"
          class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <!-- Color Indicator -->
          <div
            class="h-3 w-3 flex-shrink-0 rounded-full"
            :style="{ backgroundColor: dimension.color }"
          />

          <!-- Dimension Info -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-900 dark:text-white">
                {{ dimension.label }}
              </span>
              <span
                class="ml-2 text-xs font-semibold"
                :style="{ color: dimension.color }"
              >
                {{ dimension.weight }}%
              </span>
            </div>

            <!-- Weight Bar -->
            <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-600">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{
                  width: `${(dimension.weight / maxWeight) * 100}%`,
                  backgroundColor: dimension.color,
                }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Weight Distribution Summary -->
    <div v-if="hasContent" class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-4">
      <h4 class="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Weight Distribution
      </h4>

      <!-- Stacked Bar -->
      <div class="flex h-4 w-full overflow-hidden rounded-full">
        <div
          v-for="dimension in data.dimensions"
          :key="dimension.key"
          class="transition-all duration-500"
          :style="{
            width: `${(dimension.weight / totalWeight) * 100}%`,
            backgroundColor: dimension.color,
          }"
          :title="`${dimension.label}: ${dimension.weight}%`"
        />
      </div>

      <!-- Legend -->
      <div class="mt-3 flex flex-wrap gap-x-3 gap-y-1">
        <span
          v-for="dimension in data.dimensions"
          :key="dimension.key"
          class="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400"
        >
          <span
            class="inline-block h-2 w-2 rounded-full"
            :style="{ backgroundColor: dimension.color }"
          />
          {{ dimension.label }}
        </span>
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
      <p class="text-sm text-gray-500 dark:text-gray-400">Configure quality scoring to see the gauge</p>
    </div>
  </div>
</template>
