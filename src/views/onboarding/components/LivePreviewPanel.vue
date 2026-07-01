<script setup lang="ts">
/**
 * LivePreviewPanel - Right panel container for the onboarding wizard live preview.
 *
 * Shows a real-time preview of how the user's wizard selections will manifest
 * in the PIM system. The preview updates instantly as form fields change.
 *
 * Layout behavior:
 * - Desktop (>= 1024px): Always visible as the right 45% panel
 * - Tablet (768-1023px): Compressed right panel, always visible
 * - Mobile (< 768px): Hidden by default with a floating toggle button
 *   that slides the preview in as a bottom sheet / overlay
 *
 * The panel renders a dynamic preview component via the default slot,
 * which receives step-specific preview data from the parent.
 *
 * Usage:
 *   <LivePreviewPanel
 *     :step-title="currentStepConfig.title"
 *     :has-preview="livePreview.hasPreview.value"
 *   >
 *     <component :is="previewComponent" :data="previewData" />
 *   </LivePreviewPanel>
 */
import { ref, computed, watch } from 'vue'

// ============================================================================
// Props
// ============================================================================

export interface LivePreviewPanelProps {
  /** Title displayed at the top of the preview panel */
  stepTitle?: string
  /** Whether preview data is available to display */
  hasPreview?: boolean
  /** Whether the panel is loading preview data */
  loading?: boolean
  /** Whether to show the panel on mobile (controlled externally or internally) */
  mobileVisible?: boolean
}

const props = withDefaults(defineProps<LivePreviewPanelProps>(), {
  stepTitle: 'Preview',
  hasPreview: false,
  loading: false,
  mobileVisible: undefined,
})

// ============================================================================
// Emits
// ============================================================================

const emit = defineEmits<{
  /** Emitted when the mobile toggle button is clicked */
  (e: 'toggle-mobile'): void
}>()

// ============================================================================
// State
// ============================================================================

/** Internal mobile visibility state (used when mobileVisible prop is not provided) */
const internalMobileVisible = ref(false)

/** Whether the panel is visible on mobile */
const isMobileOpen = computed(() => {
  if (props.mobileVisible !== undefined) {
    return props.mobileVisible
  }
  return internalMobileVisible.value
})

// ============================================================================
// Handlers
// ============================================================================

/** Toggle mobile preview visibility */
function toggleMobile(): void {
  if (props.mobileVisible !== undefined) {
    emit('toggle-mobile')
  } else {
    internalMobileVisible.value = !internalMobileVisible.value
  }
}

/** Close mobile preview */
function closeMobile(): void {
  if (props.mobileVisible !== undefined) {
    emit('toggle-mobile')
  } else {
    internalMobileVisible.value = false
  }
}
</script>

<template>
  <!-- Desktop / Tablet: Always-visible right panel -->
  <aside
    class="hidden flex-col border-l border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 lg:flex lg:w-[45%]"
    aria-label="Live preview panel"
  >
    <!-- Panel Header -->
    <div class="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
      <div class="flex items-center gap-2">
        <svg
          class="h-4 w-4 text-gray-500 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">{{ stepTitle }}</h3>
      </div>
      <span class="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
        Live
      </span>
    </div>

    <!-- Panel Content -->
    <div class="flex-1 overflow-y-auto px-5 py-4">
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-12">
        <div class="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        <p class="text-sm text-gray-500 dark:text-gray-400">Updating preview...</p>
      </div>

      <!-- Preview Content (via slot) -->
      <div v-else-if="hasPreview">
        <slot />
      </div>

      <!-- Empty State (no preview data yet) -->
      <div v-else class="flex flex-col items-center justify-center py-12 text-center">
        <svg
          class="mb-3 h-10 w-10 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Preview will appear here</p>
        <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">Fill in the form to see a live preview</p>
      </div>
    </div>
  </aside>

  <!-- Mobile: Floating Toggle Button -->
  <button
    class="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 lg:hidden"
    :aria-label="isMobileOpen ? 'Hide preview' : 'Show preview'"
    @click="toggleMobile"
  >
    <svg
      v-if="!isMobileOpen"
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
    <svg
      v-else
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>

  <!-- Mobile: Preview Overlay (Bottom Sheet) -->
  <Transition name="slide-up">
    <div
      v-if="isMobileOpen"
      class="fixed inset-0 z-30 lg:hidden"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/30"
        @click="closeMobile"
      />

      <!-- Bottom Sheet Panel -->
      <div class="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-gray-800">
        <!-- Drag Handle -->
        <div class="flex justify-center py-2">
          <div class="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        <!-- Mobile Panel Header -->
        <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <div class="flex items-center gap-2">
            <svg
              class="h-4 w-4 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">{{ stepTitle }}</h3>
          </div>
          <button
            class="rounded-lg p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:text-white"
            aria-label="Close preview"
            @click="closeMobile"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Mobile Panel Content -->
        <div class="overflow-y-auto px-4 py-4" style="max-height: calc(70vh - 5rem)">
          <!-- Loading State -->
          <div v-if="loading" class="flex flex-col items-center justify-center py-8">
            <div class="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <p class="text-sm text-gray-500 dark:text-gray-400">Updating preview...</p>
          </div>

          <!-- Preview Content -->
          <div v-else-if="hasPreview">
            <slot name="mobile">
              <slot />
            </slot>
          </div>

          <!-- Empty State -->
          <div v-else class="flex flex-col items-center justify-center py-8 text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">Fill in the form to see a live preview</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ─── Mobile Bottom Sheet Slide-Up Transition ─────────────────── */

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
}

.slide-up-enter-from > div:last-child,
.slide-up-leave-to > div:last-child {
  transform: translateY(100%);
}

.slide-up-enter-active > div:last-child,
.slide-up-leave-active > div:last-child {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
