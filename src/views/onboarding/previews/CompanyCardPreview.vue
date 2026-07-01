<script setup lang="ts">
/**
 * CompanyCardPreview - Live preview for Step 1 (Company Information).
 */
import { computed } from 'vue'
import type { CompanyCardPreviewData, CompanySize, PrimaryRole } from '@/types'

const props = defineProps<{
  data: CompanyCardPreviewData
}>()

const COMPANY_SIZE_LABELS: Record<string, string> = {
  '1-10': '1-10 employees',
  '11-50': '11-50 employees',
  '51-200': '51-200 employees',
  '201-500': '201-500 employees',
  '501-1000': '501-1,000 employees',
  '1000+': '1,000+ employees',
}

const SYSTEM_LABELS: Record<string, string> = {
  excel: 'Excel / Spreadsheets',
  erp: 'ERP System',
  erpnext: 'ERPNext',
  legacy_pim: 'Legacy PIM',
  custom_db: 'Custom Database',
  ecommerce: 'E-Commerce Platform',
  none: 'No Existing System',
}

const PAIN_POINT_LABELS: Record<string, string> = {
  data_inconsistency: 'Data Inconsistency',
  slow_time_to_market: 'Slow Time-to-Market',
  manual_data_entry: 'Manual Data Entry',
  poor_data_quality: 'Poor Data Quality',
  channel_sync: 'Channel Sync Issues',
  compliance: 'Compliance Challenges',
  scalability: 'Scalability Issues',
}

const hasContent = computed(() => {
  return !!(
    props.data.company_name ||
    props.data.company_size ||
    props.data.primary_role ||
    props.data.existing_systems.length > 0
  )
})

function formatSize(size?: CompanySize): string {
  if (!size) return ''
  return COMPANY_SIZE_LABELS[size] ?? size
}

function formatSystem(system: string): string {
  return SYSTEM_LABELS[system] ?? system
}

function formatPainPoint(point: string): string {
  return PAIN_POINT_LABELS[point] ?? point
}
</script>

<template>
  <div class="space-y-4">
    <!-- Company Card -->
    <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-700">
      <!-- Company Header -->
      <div class="flex items-start gap-3">
        <div
          class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 text-lg font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-300"
        >
          {{ data.company_name ? data.company_name.charAt(0).toUpperCase() : '?' }}
        </div>

        <div class="min-w-0 flex-1">
          <h3 class="truncate text-base font-semibold text-gray-900 dark:text-white">
            {{ data.company_name || 'Your Company' }}
          </h3>
          <p
            v-if="data.company_website"
            class="mt-0.5 truncate text-xs text-primary-600 dark:text-primary-400"
          >
            {{ data.company_website }}
          </p>
          <p v-else class="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            No website provided
          </p>
        </div>
      </div>

      <!-- Badges: Size & Role -->
      <div v-if="data.company_size || data.primary_role" class="mt-4 flex flex-wrap gap-2">
        <span
          v-if="data.company_size"
          class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        >
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {{ formatSize(data.company_size) }}
        </span>

        <span
          v-if="data.primary_role"
          class="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
        >
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {{ data.primary_role }}
        </span>
      </div>
    </div>

    <!-- Existing Systems -->
    <div v-if="data.existing_systems.length > 0" class="rounded-lg border border-gray-100 bg-white p-4 dark:border-gray-600 dark:bg-gray-700">
      <h4 class="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Current Systems
      </h4>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="system in data.existing_systems"
          :key="system"
          class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-300"
        >
          {{ formatSystem(system) }}
        </span>
      </div>
    </div>

    <!-- Pain Points -->
    <div v-if="data.pain_points.length > 0" class="rounded-lg border border-gray-100 bg-white p-4 dark:border-gray-600 dark:bg-gray-700">
      <h4 class="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Key Challenges
      </h4>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="point in data.pain_points"
          :key="point"
          class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        >
          {{ formatPainPoint(point) }}
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
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
      <p class="text-sm text-gray-500 dark:text-gray-400">Start filling in your company details</p>
    </div>
  </div>
</template>
