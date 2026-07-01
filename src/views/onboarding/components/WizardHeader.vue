<script setup lang="ts">
/**
 * WizardHeader - Flowbite-style onboarding wizard header with progress stepper.
 */
import { computed } from 'vue'
import type { WizardStepConfig, StepStatus } from '@/types'

export interface WizardHeaderProps {
  currentStep: number
  totalSteps: number
  progressPercent: number
  stepTitle: string
  stepDescription?: string
  steps: Array<WizardStepConfig & { status: StepStatus }>
}

const props = withDefaults(defineProps<WizardHeaderProps>(), {
  stepDescription: '',
})

const emit = defineEmits<{
  (e: 'step-click', stepNumber: number): void
}>()

const stepCounterLabel = computed(() => `Step ${props.currentStep} of ${props.totalSteps}`)
const progressLabel = computed(() => `${Math.round(props.progressPercent)}%`)
const progressBarStyle = computed(() => ({ width: `${props.progressPercent}%` }))

function handleStepClick(step: WizardStepConfig & { status: StepStatus }): void {
  if (step.status === 'completed' || step.status === 'skipped') {
    emit('step-click', step.number)
  }
}

function getStepIndicatorClasses(step: WizardStepConfig & { status: StepStatus }): Record<string, boolean> {
  return {
    'bg-primary-600 text-white shadow-md ring-4 ring-primary-100 dark:ring-primary-900': step.status === 'active',
    'bg-green-500 text-white cursor-pointer hover:bg-green-600': step.status === 'completed',
    'bg-yellow-400 text-white cursor-pointer hover:bg-yellow-500': step.status === 'skipped',
    'bg-gray-200 text-gray-500 cursor-default dark:bg-gray-600 dark:text-gray-400': step.status === 'pending',
    'bg-red-500 text-white': step.status === 'error',
  }
}

function isStepDisabled(step: WizardStepConfig & { status: StepStatus }): boolean {
  return step.status === 'pending' || step.status === 'active'
}

function getConnectorClasses(index: number): string {
  const step = props.steps[index]
  if (step?.status === 'completed' || step?.status === 'skipped') {
    return 'bg-green-400'
  }
  return 'bg-gray-200 dark:bg-gray-700'
}
</script>

<template>
  <div>
    <!-- Progress Counter Row -->
    <div class="mb-2 flex items-center justify-between text-sm">
      <span class="font-medium text-gray-700 dark:text-gray-300">{{ stepCounterLabel }}</span>
      <span class="text-gray-500 dark:text-gray-400">{{ progressLabel }}</span>
    </div>

    <!-- Progress Bar (Flowbite style) -->
    <div class="mb-4 h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        class="h-2.5 rounded-full bg-primary-600 transition-all duration-500 ease-out"
        :style="progressBarStyle"
      />
    </div>

    <!-- Step Indicators (visible on desktop) -->
    <div class="mb-4 hidden items-center justify-between sm:flex">
      <template v-for="(step, index) in steps" :key="step.id">
        <button
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all duration-200"
          :class="getStepIndicatorClasses(step)"
          :disabled="isStepDisabled(step)"
          :title="step.title"
          :aria-label="`Step ${step.number}: ${step.title} (${step.status})`"
          :aria-current="step.status === 'active' ? 'step' : undefined"
          @click="handleStepClick(step)"
        >
          <svg
            v-if="step.status === 'completed'"
            class="h-3.5 w-3.5"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 11.917 9.724 16.5 19 7.5" />
          </svg>
          <svg
            v-else-if="step.status === 'skipped'"
            class="h-3.5 w-3.5"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14" />
          </svg>
          <span v-else>{{ step.number }}</span>
        </button>

        <div
          v-if="index < steps.length - 1"
          class="mx-0.5 h-px flex-1 transition-colors duration-200"
          :class="getConnectorClasses(index)"
        />
      </template>
    </div>

    <!-- Step Title and Description -->
    <div class="mb-2">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ stepTitle }}</h2>
      <p v-if="stepDescription" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ stepDescription }}
      </p>
    </div>
  </div>
</template>
