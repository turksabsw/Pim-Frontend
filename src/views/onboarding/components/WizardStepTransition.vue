<script setup lang="ts">
/**
 * WizardStepTransition - Animated slide transition wrapper for wizard steps.
 *
 * Wraps each wizard step in a Vue `<Transition>` component that slides
 * left or right depending on navigation direction:
 * - Forward navigation (next): slides left (current exits left, new enters from right)
 * - Backward navigation (back): slides right (current exits right, new enters from left)
 *
 * Uses CSS transitions for smooth, performant animations. The direction
 * prop controls which transition class set is applied.
 *
 * Usage:
 *   <WizardStepTransition :direction="direction" :step-key="currentStepId">
 *     <component :is="activeStepComponent" />
 *   </WizardStepTransition>
 */
import type { WizardDirection } from '@/types'

// ============================================================================
// Props
// ============================================================================

export interface WizardStepTransitionProps {
  /** Navigation direction: 'forward' slides left, 'backward' slides right */
  direction?: WizardDirection
  /** Unique key for the current step (triggers transition on change) */
  stepKey: string
}

withDefaults(defineProps<WizardStepTransitionProps>(), {
  direction: 'forward',
})
</script>

<template>
  <Transition
    :name="direction === 'forward' ? 'slide-left' : 'slide-right'"
    mode="out-in"
  >
    <div :key="stepKey" class="wizard-step-content">
      <slot />
    </div>
  </Transition>
</template>

<style scoped>
/* ─── Slide Left (Forward Navigation) ─────────────────────────── */

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* ─── Slide Right (Backward Navigation) ───────────────────────── */

.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* ─── Step Content ────────────────────────────────────────────── */

.wizard-step-content {
  width: 100%;
}
</style>
