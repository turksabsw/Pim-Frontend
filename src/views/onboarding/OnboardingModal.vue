<script setup lang="ts">
/**
 * OnboardingModal - Non-dismissible modal wrapper for the onboarding wizard.
 *
 * Renders a full-screen overlay with a centered content panel, teleported to
 * the document body to ensure correct stacking context above all other UI.
 *
 * Non-dismissible behavior:
 * - No close button
 * - ESC key is intercepted and prevented via @keydown.esc.prevent
 * - Backdrop clicks do not close the modal
 * - Scroll is locked on the body while the modal is open
 *
 * Layout constraints:
 * - Max-width: 1100px (for the inner content panel)
 * - Max-height: 85vh (with internal overflow scrolling)
 * - Backdrop: semi-transparent with blur effect
 *
 * The default slot receives the wizard content (OnboardingWizard.vue).
 */
import { onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Whether the modal is visible */
    visible?: boolean
  }>(),
  {
    visible: true,
  },
)

// =========================================================================
// Body scroll lock
// =========================================================================

/** Lock body scrolling when the modal is open */
function lockBodyScroll(): void {
  document.body.style.overflow = 'hidden'
}

/** Restore body scrolling when the modal closes */
function unlockBodyScroll(): void {
  document.body.style.overflow = ''
}

onMounted(() => {
  if (props.visible) {
    lockBodyScroll()
  }
})

onUnmounted(() => {
  unlockBodyScroll()
})

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      lockBodyScroll()
    } else {
      unlockBodyScroll()
    }
  },
)

// =========================================================================
// Keyboard event handling
// =========================================================================

/**
 * Prevent ESC key from dismissing the modal.
 * The @keydown.esc.prevent on the overlay div handles inline prevention,
 * but we also add a document-level listener for comprehensive coverage.
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
  }
}

onMounted(() => {
  if (props.visible) {
    document.addEventListener('keydown', handleKeydown, true)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown, true)
})

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeydown, true)
    } else {
      document.removeEventListener('keydown', handleKeydown, true)
    }
  },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding Wizard"
      @keydown.esc.prevent
      @click.self.prevent
    >
      <!-- Modal content panel -->
      <div class="relative w-full max-w-[1100px] max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<!-- Styles moved to Tailwind utility classes for proper dark mode support -->
