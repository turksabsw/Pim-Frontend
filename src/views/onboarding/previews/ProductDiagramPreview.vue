<script setup lang="ts">
/**
 * ProductDiagramPreview - Live preview for Step 3 (Product Structure).
 *
 * Renders a product hierarchy diagram showing:
 * - Estimated SKU count with visual indicator
 * - Variant configuration (axes like color, size, etc.)
 * - Product family count and list of custom families
 * - Data import source indicator
 * - A visual hierarchy: Families → Products → Variants
 *
 * Updates in real time as the user configures product structure.
 * Receives transformed preview data from useLivePreview composable.
 */
import { computed } from 'vue'
import type { ProductDiagramPreviewData, SkuRange, FamilyCountRange } from '@/types'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  data: ProductDiagramPreviewData
}>()

// ============================================================================
// Display Helpers
// ============================================================================

/** SKU range display labels */
const SKU_LABELS: Record<string, string> = {
  '1-100': '1 - 100',
  '101-500': '101 - 500',
  '501-2000': '501 - 2,000',
  '2001-10000': '2,001 - 10,000',
  '10000+': '10,000+',
}

/** SKU range scale indicator (0-100) */
const SKU_SCALE: Record<string, number> = {
  '1-100': 15,
  '101-500': 35,
  '501-2000': 55,
  '2001-10000': 80,
  '10000+': 100,
}

/** Family count display labels */
const FAMILY_LABELS: Record<string, string> = {
  '1-5': '1 - 5',
  '6-15': '6 - 15',
  '16-50': '16 - 50',
  '50+': '50+',
}

/** Data import source labels */
const IMPORT_SOURCE_LABELS: Record<string, { label: string; icon: string }> = {
  manual_entry: { label: 'Manual Entry', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  csv_import: { label: 'CSV Import', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  erp_sync: { label: 'ERP Sync', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  api_import: { label: 'API Import', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  no_existing_data: { label: 'Fresh Start', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
}

/** Whether there is any product structure data to show */
const hasContent = computed(() => {
  return !!(
    props.data.estimated_sku_count ||
    props.data.product_family_count ||
    props.data.uses_variants ||
    props.data.custom_families.length > 0
  )
})

/** SKU bar width as a percentage */
const skuBarWidth = computed(() => {
  if (!props.data.estimated_sku_count) return 0
  return SKU_SCALE[props.data.estimated_sku_count] ?? 10
})

/** Formatted variant axes display */
const formattedAxes = computed(() => {
  return props.data.variant_axes.map((axis) =>
    axis.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  )
})

/** Import source metadata */
const importSource = computed(() => {
  if (!props.data.data_import_source) return null
  return IMPORT_SOURCE_LABELS[props.data.data_import_source] ?? null
})
</script>

<template>
  <div class="space-y-4">
    <!-- Product Hierarchy Diagram -->
    <div v-if="hasContent" class="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-5 shadow-sm">
      <h4 class="mb-4 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Product Hierarchy
      </h4>

      <!-- Visual Hierarchy: Families → Products → Variants -->
      <div class="space-y-3">
        <!-- Families Level -->
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
            <svg class="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900 dark:text-white">Product Families</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ FAMILY_LABELS[data.product_family_count ?? ''] ?? 'Not set' }} families
            </p>
          </div>
        </div>

        <!-- Connector -->
        <div class="ml-4 h-4 border-l-2 border-dashed border-gray-200 dark:border-gray-600" />

        <!-- Products Level -->
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
            <svg class="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900 dark:text-white">Products (SKUs)</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ SKU_LABELS[data.estimated_sku_count ?? ''] ?? 'Not set' }} SKUs
            </p>
          </div>
        </div>

        <!-- Connector (only if variants enabled) -->
        <template v-if="data.uses_variants">
          <div class="ml-4 h-4 border-l-2 border-dashed border-gray-200 dark:border-gray-600" />

          <!-- Variants Level -->
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
              <svg class="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">Variants</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ formattedAxes.length }} variant {{ formattedAxes.length === 1 ? 'axis' : 'axes' }}
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- SKU Scale Bar -->
    <div v-if="data.estimated_sku_count" class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-4">
      <h4 class="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Catalog Size
      </h4>
      <div class="mb-1.5 flex items-center justify-between">
        <span class="text-sm font-semibold text-gray-900 dark:text-white">
          {{ SKU_LABELS[data.estimated_sku_count] ?? data.estimated_sku_count }} SKUs
        </span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          class="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500"
          :style="{ width: skuBarWidth + '%' }"
        />
      </div>
      <div class="mt-1 flex justify-between text-[10px] text-gray-400">
        <span>Small</span>
        <span>Enterprise</span>
      </div>
    </div>

    <!-- Variant Axes -->
    <div v-if="data.uses_variants && formattedAxes.length > 0" class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-4">
      <h4 class="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Variant Axes
      </h4>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="axis in formattedAxes"
          :key="axis"
          class="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/30 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400"
        >
          {{ axis }}
        </span>
      </div>
    </div>

    <!-- Custom Families -->
    <div v-if="data.custom_families.length > 0" class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-4">
      <h4 class="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Custom Families
      </h4>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="family in data.custom_families"
          :key="family"
          class="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400"
        >
          {{ family }}
        </span>
      </div>
    </div>

    <!-- Data Import Source -->
    <div v-if="importSource" class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-4">
      <h4 class="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Data Source
      </h4>
      <div class="flex items-center gap-2">
        <svg class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="importSource.icon" />
        </svg>
        <span class="text-sm text-gray-900 dark:text-white">{{ importSource.label }}</span>
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
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
      <p class="text-sm text-gray-500 dark:text-gray-400">Configure your product structure to see the hierarchy</p>
    </div>
  </div>
</template>
