<script setup lang="ts">
/**
 * WizardFooter - Flowbite-style navigation buttons for the onboarding wizard.
 */

export interface WizardFooterProps {
  isFirstStep: boolean
  isLastStep: boolean
  canSkipStep: boolean
  loading: boolean
  isApplying?: boolean
  nextLabel?: string
  backLabel?: string
  skipLabel?: string
  nextDisabled?: boolean
}

const props = withDefaults(defineProps<WizardFooterProps>(), {
  isApplying: false,
  nextLabel: '',
  backLabel: '',
  skipLabel: '',
  nextDisabled: false,
})

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'back'): void
  (e: 'skip'): void
  (e: 'skip-all'): void
}>()

function getPrimaryLabel(): string {
  if (props.nextLabel) return props.nextLabel
  if (props.isLastStep) return 'Launch PIM'
  return 'Continue'
}

function getBackLabel(): string {
  if (props.backLabel) return props.backLabel
  return 'Back'
}

function getSkipLabel(): string {
  if (props.skipLabel) return props.skipLabel
  return 'Skip this step'
}

function isDisabled(): boolean {
  return props.loading || props.isApplying
}
</script>

<template>
  <div class="flex items-center justify-between">
    <!-- Left Side: Back Button or Skip-All Link -->
    <div class="flex items-center gap-3">
      <!-- Back Button -->
      <button
        v-if="!isFirstStep"
        type="button"
        class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
        :disabled="isDisabled()"
        @click="emit('back')"
      >
        <svg class="me-2 h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12l4-4m-4 4 4 4" />
        </svg>
        {{ getBackLabel() }}
      </button>

      <!-- Skip Entire Wizard link (first step only) -->
      <button
        v-if="isFirstStep"
        type="button"
        class="text-sm font-medium text-gray-500 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-white"
        :disabled="isDisabled()"
        @click="emit('skip-all')"
      >
        Skip setup for now
      </button>
    </div>

    <!-- Right Side: Skip Step + Primary Button -->
    <div class="flex items-center gap-3">
      <!-- Skip Step Button -->
      <button
        v-if="canSkipStep"
        type="button"
        class="text-sm font-medium text-gray-500 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-white"
        :disabled="isDisabled()"
        @click="emit('skip')"
      >
        {{ getSkipLabel() }}
      </button>

      <!-- Skip All link (non-first steps) -->
      <button
        v-if="!isFirstStep"
        type="button"
        class="text-xs text-gray-400 hover:text-gray-700 hover:underline dark:text-gray-500 dark:hover:text-gray-300"
        :disabled="isDisabled()"
        @click="emit('skip-all')"
      >
        Skip all
      </button>

      <!-- Primary Action Button -->
      <button
        type="button"
        class="inline-flex items-center rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
        :disabled="isDisabled() || nextDisabled"
        @click="emit('next')"
      >
        <!-- Loading spinner -->
        <svg
          v-if="loading || isApplying"
          class="me-2 h-4 w-4 animate-spin fill-white text-gray-200 dark:text-gray-600"
          viewBox="0 0 100 101"
          fill="none"
          aria-hidden="true"
        >
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
        {{ getPrimaryLabel() }}
        <!-- Forward arrow -->
        <svg
          v-if="!isLastStep && !loading && !isApplying"
          class="ms-2 h-4 w-4"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m14 0-4 4m4-4-4-4" />
        </svg>
        <!-- Rocket icon on last step -->
        <svg
          v-if="isLastStep && !loading && !isApplying"
          class="ms-2 h-4 w-4"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12H4m12 0-4 4m4-4-4-4m3-4h2a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-2" />
        </svg>
      </button>
    </div>
  </div>
</template>
