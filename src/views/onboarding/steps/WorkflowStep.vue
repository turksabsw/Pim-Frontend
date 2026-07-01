<script setup lang="ts">
/**
 * WorkflowStep - Configure approval workflows and publishing preferences.
 *
 * Step 8 of 12 (required).
 *
 * Collects:
 * - Workflow complexity (simple / standard / advanced)
 * - Quality check gate toggle
 * - Auto-publish toggle
 * - Status change notifications toggle
 */
import { reactive, watch, onMounted } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import type { WorkflowPreferencesData, StepFormData, WorkflowComplexity } from '@/types'

const props = defineProps<{
  data: Record<string, unknown>
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update', data: StepFormData): void
  (e: 'next', data: StepFormData): void
  (e: 'back'): void
}>()

const store = useOnboardingStore()

// ============================================================================
// Workflow Complexity Options
// ============================================================================

const WORKFLOW_COMPLEXITIES: readonly {
  value: WorkflowComplexity
  label: string
  description: string
}[] = [
  {
    value: 'simple',
    label: 'Simple',
    description: 'Draft → Published. No approval needed. Best for small teams.',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Draft → Review → Published. One approval step before publishing.',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'Draft → Review → Approved → Published. Multi-stage approval with role-based gates.',
  },
] as const

// ============================================================================
// Form State
// ============================================================================

/** Load initial data from store or props */
function getInitialData(): WorkflowPreferencesData {
  const storeData = store.getWizardStepData('workflow_preferences')
  const source = storeData ?? props.data

  return {
    workflow_complexity: (source?.workflow_complexity as WorkflowComplexity) ?? 'standard',
    require_quality_check: (source?.require_quality_check as boolean) ?? true,
    auto_publish: (source?.auto_publish as boolean) ?? false,
    notify_on_status_change: (source?.notify_on_status_change as boolean) ?? true,
  }
}

const form = reactive<WorkflowPreferencesData>(getInitialData())

/** Sync initial data to store on mount */
onMounted(() => {
  store.setWizardStepData('workflow_preferences', { ...form })
})

// ============================================================================
// Watchers & Submit
// ============================================================================

/** Emit form data changes to parent and sync to store */
watch(
  form,
  (newVal) => {
    const data = { ...newVal }
    store.setWizardStepData('workflow_preferences', data)
    emit('update', data)
  },
  { deep: true },
)

function handleSubmit(): void {
  emit('next', { ...form })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Workflow Complexity -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        Workflow Complexity
      </label>
      <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Choose how many approval stages product changes go through before publishing.
      </p>
      <div class="space-y-2">
        <label
          v-for="complexity in WORKFLOW_COMPLEXITIES"
          :key="complexity.value"
          class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
          :class="{
            'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20': form.workflow_complexity === complexity.value,
          }"
        >
          <input
            v-model="form.workflow_complexity"
            type="radio"
            :value="complexity.value"
            class="mt-0.5 h-4 w-4 border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
          />
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ complexity.label }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ complexity.description }}</p>
          </div>
        </label>
      </div>
    </div>

    <!-- Quality Check Gate -->
    <div class="rounded-lg border border-gray-300 dark:border-gray-600 p-4">
      <div class="flex items-start gap-3">
        <input
          id="require_quality_check"
          v-model="form.require_quality_check"
          type="checkbox"
          class="mt-0.5 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
        />
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-900 dark:text-white" for="require_quality_check">
            Require Quality Check Before Publishing
          </label>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Products must meet the minimum quality score threshold before they can
            be moved to the published state. Configure scoring details in the next step.
          </p>
        </div>
      </div>
    </div>

    <!-- Auto-Publish -->
    <div class="rounded-lg border border-gray-300 dark:border-gray-600 p-4">
      <div class="flex items-start gap-3">
        <input
          id="auto_publish"
          v-model="form.auto_publish"
          type="checkbox"
          class="mt-0.5 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
        />
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-900 dark:text-white" for="auto_publish">
            Auto-Publish After Approval
          </label>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Automatically publish products once they pass all approval stages
            and quality checks. Disable to require manual publishing.
          </p>
        </div>
      </div>
    </div>

    <!-- Notifications -->
    <div class="rounded-lg border border-gray-300 dark:border-gray-600 p-4">
      <div class="flex items-start gap-3">
        <input
          id="notify_on_status_change"
          v-model="form.notify_on_status_change"
          type="checkbox"
          class="mt-0.5 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
        />
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-900 dark:text-white" for="notify_on_status_change">
            Notify on Status Changes
          </label>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Send email notifications to relevant team members when a product
            moves between workflow stages (e.g., submitted for review, approved, published).
          </p>
        </div>
      </div>
    </div>

    <!-- Info callout -->
    <div class="flex items-start gap-2 rounded-lg bg-white dark:bg-gray-800 p-3">
      <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        All workflow settings can be adjusted later in PIM Settings.
        The next three steps (Quality Scoring, Integrations, Compliance) are optional
        and can be skipped.
      </p>
    </div>
  </div>
</template>
