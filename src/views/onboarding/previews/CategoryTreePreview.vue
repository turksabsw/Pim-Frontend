<script setup lang="ts">
/**
 * CategoryTreePreview - Live preview for Step 5 (Taxonomy).
 *
 * Renders a NestedSet category tree visualization showing:
 * - Hierarchical category tree with expand/collapse
 * - Total category count and max depth indicators
 * - Category source badge (template, custom, import, GPC)
 * - Brand tags if any are defined
 *
 * Updates in real time as the user configures taxonomy.
 * Receives transformed preview data from useLivePreview composable.
 */
import { ref, computed } from 'vue'
import type { CategoryTreePreviewData, CategoryNode, CategorySource } from '@/types'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  data: CategoryTreePreviewData
}>()

// ============================================================================
// State
// ============================================================================

/** Track expanded/collapsed nodes by name */
const expandedNodes = ref<Set<string>>(new Set())

// ============================================================================
// Display Helpers
// ============================================================================

/** Category source display metadata */
const SOURCE_META: Record<string, { label: string; color: string }> = {
  template: { label: 'From Template', color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  custom: { label: 'Custom Built', color: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  import: { label: 'Imported', color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  gpc: { label: 'GPC Standard', color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
}

/** Default source metadata */
const DEFAULT_SOURCE = { label: 'Unknown', color: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-400' }

/** Whether there is any taxonomy data to display */
const hasContent = computed(() => {
  return props.data.categories.length > 0 || props.data.total_categories > 0
})

/** Source badge metadata */
const sourceMeta = computed(() => {
  return SOURCE_META[props.data.source] ?? DEFAULT_SOURCE
})

// ============================================================================
// Actions
// ============================================================================

/** Toggle a node's expanded/collapsed state */
function toggleNode(name: string): void {
  if (expandedNodes.value.has(name)) {
    expandedNodes.value.delete(name)
  } else {
    expandedNodes.value.add(name)
  }
}

/** Check if a node is expanded */
function isExpanded(name: string): boolean {
  return expandedNodes.value.has(name)
}

/** Check if a node has children */
function hasChildren(node: CategoryNode): boolean {
  return !!(node.children && node.children.length > 0)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Summary Stats -->
    <div v-if="hasContent" class="grid grid-cols-3 gap-2">
      <div class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-3 text-center">
        <p class="text-lg font-semibold text-primary-600">{{ data.total_categories }}</p>
        <p class="text-[10px] text-gray-500 dark:text-gray-400">Categories</p>
      </div>
      <div class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-3 text-center">
        <p class="text-lg font-semibold text-indigo-600">{{ data.max_depth }}</p>
        <p class="text-[10px] text-gray-500 dark:text-gray-400">Max Depth</p>
      </div>
      <div class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-3 text-center">
        <p class="text-lg font-semibold text-teal-600">{{ data.brands.length }}</p>
        <p class="text-[10px] text-gray-500 dark:text-gray-400">Brands</p>
      </div>
    </div>

    <!-- Source Badge -->
    <div v-if="hasContent" class="flex items-center justify-center">
      <span
        class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
        :class="sourceMeta.color"
      >
        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        {{ sourceMeta.label }}
      </span>
    </div>

    <!-- Category Tree -->
    <div v-if="data.categories.length > 0" class="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 shadow-sm">
      <div class="border-b border-gray-100 dark:border-gray-600 px-4 py-3">
        <h4 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Category Tree
        </h4>
      </div>

      <div class="p-3">
        <!-- Recursive Tree Rendering -->
        <template v-for="node in data.categories" :key="node.name">
          <div class="category-node">
            <!-- Node Row -->
            <button
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-600"
              @click="hasChildren(node) ? toggleNode(node.name) : undefined"
              :class="{ 'cursor-default': !hasChildren(node) }"
            >
              <!-- Expand/Collapse Arrow -->
              <svg
                v-if="hasChildren(node)"
                class="h-3 w-3 flex-shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200"
                :class="{ 'rotate-90': isExpanded(node.name) }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <span v-else class="h-3 w-3 flex-shrink-0" />

              <!-- Folder / Leaf Icon -->
              <svg
                v-if="node.is_group || hasChildren(node)"
                class="h-4 w-4 flex-shrink-0 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <svg
                v-else
                class="h-4 w-4 flex-shrink-0 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>

              <!-- Node Label -->
              <span class="flex-1 truncate text-sm text-gray-900 dark:text-white">
                {{ node.label }}
              </span>

              <!-- Children Count -->
              <span
                v-if="hasChildren(node)"
                class="rounded-full bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 text-[10px] text-gray-500 dark:text-gray-400"
              >
                {{ node.children!.length }}
              </span>
            </button>

            <!-- Children (level 2) -->
            <Transition name="expand">
              <div v-if="hasChildren(node) && isExpanded(node.name)" class="pl-6">
                <template v-for="child in node.children" :key="child.name">
                  <div class="category-node">
                    <button
                      class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-600"
                      @click="hasChildren(child) ? toggleNode(child.name) : undefined"
                      :class="{ 'cursor-default': !hasChildren(child) }"
                    >
                      <svg
                        v-if="hasChildren(child)"
                        class="h-3 w-3 flex-shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200"
                        :class="{ 'rotate-90': isExpanded(child.name) }"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                      <span v-else class="h-3 w-3 flex-shrink-0" />

                      <svg
                        v-if="child.is_group || hasChildren(child)"
                        class="h-3.5 w-3.5 flex-shrink-0 text-amber-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <svg
                        v-else
                        class="h-3.5 w-3.5 flex-shrink-0 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>

                      <span class="flex-1 truncate text-xs text-gray-900 dark:text-white">
                        {{ child.label }}
                      </span>

                      <span
                        v-if="hasChildren(child)"
                        class="rounded-full bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 text-[10px] text-gray-500 dark:text-gray-400"
                      >
                        {{ child.children!.length }}
                      </span>
                    </button>

                    <!-- Children (level 3) -->
                    <Transition name="expand">
                      <div v-if="hasChildren(child) && isExpanded(child.name)" class="pl-6">
                        <div
                          v-for="leaf in child.children"
                          :key="leaf.name"
                          class="flex items-center gap-2 rounded-md px-2 py-1 text-left"
                        >
                          <span class="h-3 w-3 flex-shrink-0" />
                          <svg
                            class="h-3 w-3 flex-shrink-0 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span class="truncate text-xs text-gray-500 dark:text-gray-400">
                            {{ leaf.label }}
                          </span>
                        </div>
                      </div>
                    </Transition>
                  </div>
                </template>
              </div>
            </Transition>
          </div>
        </template>
      </div>
    </div>

    <!-- Brands -->
    <div v-if="data.brands.length > 0" class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-4">
      <h4 class="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Brands
      </h4>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="brand in data.brands"
          :key="brand"
          class="inline-flex items-center rounded-full bg-teal-50 dark:bg-teal-900/30 px-2.5 py-1 text-xs font-medium text-teal-700 dark:text-teal-400"
        >
          {{ brand }}
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
          d="M4 6h16M4 10h16M4 14h16M4 18h16"
        />
      </svg>
      <p class="text-sm text-gray-500 dark:text-gray-400">Configure taxonomy to see the category tree</p>
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
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
