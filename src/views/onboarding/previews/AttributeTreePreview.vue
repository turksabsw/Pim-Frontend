<script setup lang="ts">
/**
 * AttributeTreePreview - Live preview for Step 4 (Attribute Configuration).
 *
 * Renders an attribute group tree visualization showing:
 * - Attribute groups as collapsible tree nodes
 * - Individual attributes within each group with type badges
 * - Template vs custom attribute distinction
 * - Summary counts: total, template, custom, removed
 *
 * Updates in real time as the user configures attributes.
 * Receives transformed preview data from useLivePreview composable.
 */
import { ref, computed } from 'vue'
import type { AttributeTreePreviewData, AttributeGroupPreview } from '@/types'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  data: AttributeTreePreviewData
}>()

// ============================================================================
// State
// ============================================================================

/** Track expanded/collapsed state for each group */
const expandedGroups = ref<Set<string>>(new Set())

// ============================================================================
// Display Helpers
// ============================================================================

/** Attribute type display metadata */
const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  text: { label: 'Text', color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  textarea: { label: 'Text Area', color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  number: { label: 'Number', color: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  decimal: { label: 'Decimal', color: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  select: { label: 'Select', color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  multiselect: { label: 'Multi-Select', color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  boolean: { label: 'Yes/No', color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  date: { label: 'Date', color: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400' },
  datetime: { label: 'DateTime', color: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400' },
  image: { label: 'Image', color: 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400' },
  file: { label: 'File', color: 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400' },
  link: { label: 'Link', color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' },
  json: { label: 'JSON', color: 'bg-slate-50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-400' },
  html: { label: 'HTML', color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
  measurement: { label: 'Measurement', color: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' },
}

/** Default type badge for unknown types */
const DEFAULT_TYPE_BADGE = { label: 'Unknown', color: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-400' }

/** Whether any attribute data is available */
const hasContent = computed(() => {
  return props.data.groups.length > 0 || props.data.total_attributes > 0
})

// ============================================================================
// Actions
// ============================================================================

/** Toggle a group's expanded/collapsed state */
function toggleGroup(groupName: string): void {
  if (expandedGroups.value.has(groupName)) {
    expandedGroups.value.delete(groupName)
  } else {
    expandedGroups.value.add(groupName)
  }
}

/** Check if a group is expanded */
function isExpanded(groupName: string): boolean {
  return expandedGroups.value.has(groupName)
}

/** Get display metadata for an attribute type */
function getTypeBadge(type: string): { label: string; color: string } {
  return TYPE_BADGES[type] ?? { label: type || 'Unknown', color: DEFAULT_TYPE_BADGE.color }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Summary Counts -->
    <div v-if="hasContent" class="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-3 text-center">
        <p class="text-lg font-semibold text-primary-600">{{ data.total_attributes }}</p>
        <p class="text-[10px] text-gray-500 dark:text-gray-400">Total</p>
      </div>
      <div class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-3 text-center">
        <p class="text-lg font-semibold text-blue-600">{{ data.template_count }}</p>
        <p class="text-[10px] text-gray-500 dark:text-gray-400">Template</p>
      </div>
      <div class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-3 text-center">
        <p class="text-lg font-semibold text-green-600">{{ data.custom_count }}</p>
        <p class="text-[10px] text-gray-500 dark:text-gray-400">Custom</p>
      </div>
      <div class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-3 text-center">
        <p class="text-lg font-semibold text-red-500">{{ data.removed_count }}</p>
        <p class="text-[10px] text-gray-500 dark:text-gray-400">Removed</p>
      </div>
    </div>

    <!-- Attribute Group Tree -->
    <div v-if="data.groups.length > 0" class="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 shadow-sm">
      <div class="border-b border-gray-100 dark:border-gray-600 px-4 py-3">
        <h4 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Attribute Groups
        </h4>
      </div>

      <div class="divide-y divide-gray-50 dark:divide-gray-600">
        <div
          v-for="group in data.groups"
          :key="group.name"
          class="group"
        >
          <!-- Group Header (clickable) -->
          <button
            class="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-600"
            @click="toggleGroup(group.name)"
          >
            <!-- Expand/Collapse Arrow -->
            <svg
              class="h-3.5 w-3.5 flex-shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200"
              :class="{ 'rotate-90': isExpanded(group.name) }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>

            <!-- Group Icon -->
            <svg class="h-4 w-4 flex-shrink-0 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>

            <!-- Group Label -->
            <span class="flex-1 text-sm font-medium text-gray-900 dark:text-white">
              {{ group.label }}
            </span>

            <!-- Attribute Count Badge -->
            <span class="rounded-full bg-gray-100 dark:bg-gray-600 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
              {{ group.attributes.length }}
            </span>
          </button>

          <!-- Expanded: Attribute List -->
          <Transition name="expand">
            <div v-if="isExpanded(group.name)" class="border-t border-gray-50 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 px-4 py-2">
              <div class="space-y-1.5 pl-6">
                <div
                  v-for="attr in group.attributes"
                  :key="attr.name"
                  class="flex items-center gap-2"
                >
                  <!-- Attribute icon (template or custom) -->
                  <svg
                    v-if="attr.from_template"
                    class="h-3 w-3 flex-shrink-0 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    title="From template"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  <svg
                    v-else
                    class="h-3 w-3 flex-shrink-0 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    title="Custom attribute"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>

                  <!-- Attribute Label -->
                  <span class="flex-1 truncate text-xs text-gray-900 dark:text-white">
                    {{ attr.label }}
                  </span>

                  <!-- Type Badge -->
                  <span
                    class="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                    :class="getTypeBadge(attr.type).color"
                  >
                    {{ getTypeBadge(attr.type).label }}
                  </span>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div v-if="hasContent" class="flex items-center justify-center gap-4 text-[10px] text-gray-500 dark:text-gray-400">
      <span class="flex items-center gap-1">
        <span class="inline-block h-2 w-2 rounded-full bg-blue-400" />
        Template
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block h-2 w-2 rounded-full bg-green-400" />
        Custom
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block h-2 w-2 rounded-full bg-red-400" />
        Removed
      </span>
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
          d="M4 6h16M4 10h16M4 14h16M4 18h16"
        />
      </svg>
      <p class="text-sm text-gray-500 dark:text-gray-400">Configure attributes to see the tree view</p>
    </div>
  </div>
</template>

<style scoped>
/* ─── Expand/Collapse Transition ─────────────────────────────── */

.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease-in-out;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
