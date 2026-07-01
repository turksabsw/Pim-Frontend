<script setup lang="ts">
/**
 * TemplateReviewStep - Review and apply the industry template.
 *
 * Two modes:
 * 1. Template Application (template_applied step):
 *    - Shows the selected archetype summary
 *    - Apply button triggers template engine
 *    - Displays application results
 *
 * 2. Customization Review (customization_review step):
 *    - Shows what was created by the template
 *    - Allows reviewing configuration before proceeding
 *    - Links to settings for detailed customization
 */
import { ref, computed, watch } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import type { StepFormData } from '@/types'

const props = defineProps<{
  data: Record<string, unknown>
  reviewMode: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update', data: StepFormData): void
  (e: 'next', data: StepFormData): void
  (e: 'back'): void
}>()

const store = useOnboardingStore()
const applying = ref(false)
const applied = ref(store.templateApplied)

/** The selected archetype name for display */
const archetypeName = computed(() => {
  return store.selectedArchetype ?? 'base'
})

/** Preview data for the archetype */
const preview = computed(() => store.archetypePreview)

/** Template application result */
const result = computed(() => store.templateResult)

/** Whether template was successfully applied */
const isSuccess = computed(() => {
  return result.value?.status === 'completed' || result.value?.status === 'partial'
})

/**
 * Apply the selected archetype template.
 */
async function handleApplyTemplate(): Promise<void> {
  applying.value = true
  try {
    await store.applyArchetypeTemplate(archetypeName.value)
    applied.value = true
  } finally {
    applying.value = false
  }
}

/** Emit form data for customization review step */
function handleCustomizationUpdate(): void {
  emit('update', { reviewed: true })
}

watch(
  () => props.reviewMode,
  () => {
    if (props.reviewMode) {
      handleCustomizationUpdate()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-6">
    <!-- Template Application Mode -->
    <template v-if="!props.reviewMode">
      <!-- Archetype Summary -->
      <div class="rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-lg text-white">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <div>
            <h3 class="font-medium text-primary-900 dark:text-primary-300 capitalize">{{ archetypeName }} Template</h3>
            <p class="text-sm text-primary-700 dark:text-primary-400">Ready to apply to your workspace</p>
          </div>
        </div>
      </div>

      <!-- Preview of what will be created -->
      <div v-if="preview" class="space-y-3">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">This template will create:</h3>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div
            v-for="(section, key) in preview.sections"
            :key="key"
            class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 text-center"
          >
            <p class="text-2xl font-bold text-primary-600">{{ section.count }}</p>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 capitalize">{{ String(key).replace(/_/g, ' ') }}</p>
          </div>
        </div>
      </div>

      <!-- Not yet applied: Show apply button -->
      <div v-if="!applied && !result">
        <button
          class="btn-primary w-full"
          :disabled="applying || props.loading"
          @click="handleApplyTemplate"
        >
          <span
            v-if="applying"
            class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
          />
          {{ applying ? 'Applying Template...' : 'Apply Template' }}
        </button>
        <p class="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
          This will create the configuration entities in your workspace.
          Existing entities will not be overwritten.
        </p>
      </div>

      <!-- Application Result -->
      <div v-if="result" class="space-y-3">
        <!-- Status Banner -->
        <div
          class="flex items-center gap-3 rounded-lg p-4"
          :class="{
            'border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950': isSuccess,
            'border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950': !isSuccess,
          }"
        >
          <svg
            v-if="isSuccess"
            class="h-6 w-6 flex-shrink-0 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg
            v-else
            class="h-6 w-6 flex-shrink-0 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="font-medium" :class="isSuccess ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'">
              {{ isSuccess ? 'Template applied successfully!' : 'Template application failed' }}
            </p>
            <p class="text-sm" :class="isSuccess ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'">
              {{ result.entities_created }} created, {{ result.entities_skipped }} skipped
              <span v-if="result.entities_failed">, {{ result.entities_failed }} failed</span>
            </p>
          </div>
        </div>

        <!-- Detail Breakdown -->
        <div v-if="result.details" class="rounded-lg border border-gray-300 dark:border-gray-600">
          <div
            v-for="(detail, entityType) in result.details"
            :key="entityType"
            class="flex items-center justify-between border-b border-gray-300 dark:border-gray-600 px-4 py-2.5 last:border-b-0"
          >
            <span class="text-sm text-gray-900 dark:text-white capitalize">{{ String(entityType).replace(/_/g, ' ') }}</span>
            <div class="flex gap-3 text-xs">
              <span v-if="detail.created" class="text-green-600">+{{ detail.created }}</span>
              <span v-if="detail.skipped" class="text-gray-500 dark:text-gray-400">{{ detail.skipped }} skipped</span>
              <span v-if="detail.failed" class="text-red-600">{{ detail.failed }} failed</span>
            </div>
          </div>
        </div>

        <!-- Errors -->
        <div v-if="result.errors.length > 0" class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3">
          <p class="mb-1 text-xs font-medium text-red-800 dark:text-red-300">Errors:</p>
          <ul class="list-inside list-disc space-y-0.5 text-xs text-red-700 dark:text-red-400">
            <li v-for="(err, idx) in result.errors" :key="idx">{{ err }}</li>
          </ul>
        </div>
      </div>
    </template>

    <!-- Customization Review Mode -->
    <template v-else>
      <div class="space-y-4">
        <div class="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4">
          <div class="flex items-center gap-3">
            <svg class="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 class="font-medium text-green-900 dark:text-green-300">Your workspace is configured</h3>
              <p class="text-sm text-green-700 dark:text-green-400">
                The {{ archetypeName }} template has been applied. Review the configuration below.
              </p>
            </div>
          </div>
        </div>

        <!-- Summary of what was created -->
        <div v-if="result" class="rounded-lg border border-gray-300 dark:border-gray-600">
          <div class="border-b border-gray-300 dark:border-gray-600 px-4 py-3">
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">Configuration Summary</h3>
          </div>
          <div
            v-for="(detail, entityType) in result.details"
            :key="entityType"
            class="flex items-center justify-between border-b border-gray-300 dark:border-gray-600 px-4 py-2.5 last:border-b-0"
          >
            <span class="text-sm text-gray-900 dark:text-white capitalize">{{ String(entityType).replace(/_/g, ' ') }}</span>
            <span class="rounded-full bg-primary-100 dark:bg-primary-900/40 px-2 py-0.5 text-xs font-medium text-primary-700 dark:text-primary-400">
              {{ detail.created + detail.skipped }}
            </span>
          </div>
        </div>

        <!-- Customization Links -->
        <div class="space-y-2">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            You can customize all configuration in Settings after completing the wizard.
            Continue to create your first product.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
