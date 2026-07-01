<script setup lang="ts">
/**
 * SummaryLaunchStep - Review full configuration and launch PIM.
 *
 * Step 12 of 12 (required).
 *
 * Displays:
 * - Full configuration summary from all steps 1-11
 * - Demo product creation toggle
 * - "Launch PIM" button triggering template application
 * - Loading states and progress during apply
 * - Success/failure result display after completion
 */
import { reactive, computed, watch, onMounted, ref } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import { useLivePreview } from '../composables/useLivePreview'
import type {
  SummaryLaunchData,
  StepFormData,
  FullSummaryPreviewData,
  CompletionResponse,
  WizardStepId,
} from '@/types'
import {
  WIZARD_STEP_CONFIGS,
  SKIPPABLE_STEP_IDS,
} from '@/types'

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
const { buildSummaryPreview } = useLivePreview()

// ============================================================================
// Form State
// ============================================================================

/** Load initial data from store or props */
function getInitialData(): SummaryLaunchData {
  const storeData = store.getWizardStepData('summary_launch')
  const source = storeData ?? props.data

  return {
    confirm_launch: (source?.confirm_launch as boolean) ?? false,
    create_demo_products: (source?.create_demo_products as boolean) ?? true,
    acknowledged_summary: (source?.acknowledged_summary as boolean) ?? false,
  }
}

const form = reactive<SummaryLaunchData>(getInitialData())

/** Sync initial data to store on mount */
onMounted(() => {
  store.setWizardStepData('summary_launch', { ...form })
})

// ============================================================================
// Launch State
// ============================================================================

/** Whether the launch process has been initiated */
const launching = ref(false)

/** Whether launch completed (success or failure) */
const launched = ref(false)

/** Launch result from the backend */
const launchResult = ref<CompletionResponse | null>(store.completionResult ?? null)

/** Whether the launch was successful */
const isSuccess = computed(() => {
  return launchResult.value?.success === true && launchResult.value?.status === 'completed'
})

/** Whether there was a partial success */
const isPartial = computed(() => {
  return launchResult.value?.success === true &&
    (launchResult.value?.errors?.length ?? 0) > 0
})

// ============================================================================
// Summary Data
// ============================================================================

/** Build the full summary preview from all steps' form data */
const summary = computed<FullSummaryPreviewData>(() => {
  return buildSummaryPreview(
    store.wizardFormData,
    store.completedSteps,
    store.skippedSteps,
  )
})

/** Number of completed steps (excluding this step) */
const completedCount = computed(() => summary.value.total_steps_completed)

/** Whether all required prior steps are completed */
const readyToLaunch = computed(() => summary.value.ready_to_launch)

/** Skipped step names for display */
const skippedStepNames = computed(() => {
  return summary.value.skipped_steps.map((id) => {
    const config = WIZARD_STEP_CONFIGS.find((c) => c.id === id)
    return config?.title ?? id
  })
})

// ============================================================================
// Summary Section Definitions
// ============================================================================

interface SummarySectionItem {
  label: string
  value: string
}

interface SummarySection {
  id: string
  title: string
  icon: string
  stepNumber: number
  skipped: boolean
  items: SummarySectionItem[]
}

/** Build display-ready summary sections from preview data */
const summarySections = computed<SummarySection[]>(() => {
  const s = summary.value
  const skipped = new Set(summary.value.skipped_steps)

  return [
    {
      id: 'company',
      title: 'Company',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      stepNumber: 1,
      skipped: false,
      items: [
        { label: 'Company', value: s.company.company_name || 'Not set' },
        { label: 'Size', value: s.company.company_size ?? 'Not set' },
        { label: 'Role', value: s.company.primary_role ?? 'Not set' },
        { label: 'Systems', value: s.company.existing_systems.length > 0 ? s.company.existing_systems.join(', ') : 'None' },
      ],
    },
    {
      id: 'industry',
      title: 'Industry',
      icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      stepNumber: 2,
      skipped: false,
      items: [
        { label: 'Sector', value: s.industry.industry_label ?? 'Not set' },
        { label: 'Sub-vertical', value: s.industry.sub_vertical ?? 'None' },
      ],
    },
    {
      id: 'product_structure',
      title: 'Products',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      stepNumber: 3,
      skipped: false,
      items: [
        { label: 'SKUs', value: s.product_structure.estimated_sku_count ?? 'Not set' },
        { label: 'Variants', value: s.product_structure.uses_variants ? 'Yes' : 'No' },
        { label: 'Families', value: s.product_structure.product_family_count ?? 'Not set' },
        { label: 'Import', value: formatImportSource(s.product_structure.data_import_source) },
      ],
    },
    {
      id: 'attributes',
      title: 'Attributes',
      icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
      stepNumber: 4,
      skipped: false,
      items: [
        { label: 'Total', value: String(s.attributes.total_attributes) },
        { label: 'Template', value: String(s.attributes.template_count) },
        { label: 'Custom', value: String(s.attributes.custom_count) },
        { label: 'Groups', value: String(s.attributes.groups.length) },
      ],
    },
    {
      id: 'taxonomy',
      title: 'Taxonomy',
      icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',
      stepNumber: 5,
      skipped: false,
      items: [
        { label: 'Source', value: s.taxonomy.source ?? 'Template' },
        { label: 'Categories', value: String(s.taxonomy.total_categories) },
        { label: 'Depth', value: String(s.taxonomy.max_depth) + ' levels' },
        { label: 'Brands', value: s.taxonomy.brands.length > 0 ? s.taxonomy.brands.join(', ') : 'None' },
      ],
    },
    {
      id: 'channels',
      title: 'Channels',
      icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
      stepNumber: 6,
      skipped: false,
      items: [
        { label: 'Channels', value: s.channels.channels.length > 0 ? s.channels.channels.map((c) => c.label).join(', ') : 'None' },
        { label: 'Primary', value: s.channels.primary_channel ?? 'Not set' },
        { label: 'Model', value: formatBusinessModel(s.channels.business_model) },
      ],
    },
    {
      id: 'localization',
      title: 'Localization',
      icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129',
      stepNumber: 7,
      skipped: false,
      items: [
        { label: 'Language', value: s.localization.primary_language_label ?? s.localization.primary_language },
        { label: 'Additional', value: s.localization.additional_languages.length > 0 ? s.localization.additional_languages.map((l) => l.label).join(', ') : 'None' },
        { label: 'Currency', value: s.localization.default_currency ?? 'Not set' },
        { label: 'Auto-translate', value: s.localization.enable_auto_translate ? 'Yes' : 'No' },
      ],
    },
    {
      id: 'workflow',
      title: 'Workflow',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      stepNumber: 8,
      skipped: false,
      items: [
        { label: 'Complexity', value: formatComplexity(s.workflow.workflow_complexity) },
        { label: 'Quality check', value: s.workflow.require_quality_check ? 'Yes' : 'No' },
        { label: 'Auto-publish', value: s.workflow.auto_publish ? 'Yes' : 'No' },
        { label: 'Notifications', value: s.workflow.notify_on_status_change ? 'Yes' : 'No' },
      ],
    },
    {
      id: 'quality',
      title: 'Quality Scoring',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      stepNumber: 9,
      skipped: skipped.has('quality_scoring'),
      items: skipped.has('quality_scoring')
        ? [{ label: 'Status', value: 'Skipped (defaults will be used)' }]
        : [
            { label: 'Threshold', value: s.quality.quality_threshold + '%' },
            { label: 'Dimensions', value: s.quality.dimensions.map((d) => d.label).join(', ') },
          ],
    },
    {
      id: 'integrations',
      title: 'Integrations',
      icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
      stepNumber: 10,
      skipped: skipped.has('integrations'),
      items: skipped.has('integrations')
        ? [{ label: 'Status', value: 'Skipped (configure later)' }]
        : [
            { label: 'ERP Sync', value: s.integrations.integrations.find((i) => i.id === 'erp_sync')?.enabled ? 'Enabled' : 'Disabled' },
            { label: 'AI Enrichment', value: s.integrations.integrations.find((i) => i.id === 'ai_enrichment')?.enabled ? 'Enabled' : 'Disabled' },
            { label: 'GS1', value: s.integrations.integrations.find((i) => i.id === 'gs1')?.enabled ? 'Enabled' : 'Disabled' },
            { label: 'Total active', value: String(s.integrations.total_enabled) },
          ],
    },
    {
      id: 'compliance',
      title: 'Compliance',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      stepNumber: 11,
      skipped: skipped.has('compliance'),
      items: skipped.has('compliance')
        ? [{ label: 'Status', value: 'Skipped (configure later)' }]
        : [
            { label: 'Standards', value: s.compliance.total_standards > 0 ? String(s.compliance.total_standards) + ' selected' : 'None' },
            { label: 'Cert tracking', value: s.compliance.certification_tracking ? 'Enabled' : 'Disabled' },
          ],
    },
  ]
})

// ============================================================================
// Formatters
// ============================================================================

/** Format import source for display */
function formatImportSource(source?: string): string {
  const labels: Record<string, string> = {
    manual_entry: 'Manual Entry',
    csv_import: 'CSV Import',
    erp_sync: 'ERP Sync',
    api_import: 'API Import',
    no_existing_data: 'No Existing Data',
  }
  return source ? (labels[source] ?? source) : 'Not set'
}

/** Format business model for display */
function formatBusinessModel(model?: string): string {
  const labels: Record<string, string> = {
    b2c: 'B2C',
    b2b: 'B2B',
    b2b2c: 'B2B2C',
    marketplace: 'Marketplace',
    omnichannel: 'Omnichannel',
  }
  return model ? (labels[model] ?? model) : 'Not set'
}

/** Format workflow complexity for display */
function formatComplexity(complexity?: string): string {
  const labels: Record<string, string> = {
    simple: 'Simple (Draft → Published)',
    standard: 'Standard (Draft → Review → Published)',
    advanced: 'Advanced (Draft → Enrichment → Review → Approved → Published)',
  }
  return complexity ? (labels[complexity] ?? complexity) : 'Not set'
}

// ============================================================================
// Launch Handler
// ============================================================================

/**
 * Trigger the PIM launch process.
 * Calls the backend to apply the template and complete onboarding.
 */
async function handleLaunch(): Promise<void> {
  launching.value = true

  try {
    const result = await store.completeWizard({
      ...form,
      confirm_launch: true,
      acknowledged_summary: true,
    })

    launchResult.value = result
    launched.value = true

    if (result?.success) {
      // Redirect is handled by the isCompleted watch in OnboardingWizard.vue
      // No need to emit 'next' as it would cause double-completion
    }
  } finally {
    launching.value = false
  }
}

// ============================================================================
// Watchers
// ============================================================================

/** Emit form data changes to parent and sync to store */
watch(
  form,
  (newVal) => {
    const data = { ...newVal }
    store.setWizardStepData('summary_launch', data)
    emit('update', data)
  },
  { deep: true },
)
</script>

<template>
  <div class="space-y-6">
    <!-- Launch Result: Success -->
    <template v-if="launched && isSuccess">
      <div class="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4">
        <div class="flex items-center gap-3">
          <svg class="h-8 w-8 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="text-lg font-semibold text-green-900 dark:text-green-300">PIM Launched Successfully!</h3>
            <p class="mt-1 text-sm text-green-700 dark:text-green-400">
              Your workspace has been configured and is ready to use.
            </p>
          </div>
        </div>
      </div>

      <!-- Entities Created -->
      <div v-if="launchResult?.entities_created" class="rounded-lg border border-gray-300 dark:border-gray-600">
        <div class="border-b border-gray-300 dark:border-gray-600 px-4 py-3">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">Created Entities</h3>
        </div>
        <div
          v-for="(count, entityType) in launchResult.entities_created"
          :key="entityType"
          class="flex items-center justify-between border-b border-gray-300 dark:border-gray-600 px-4 py-2.5 last:border-b-0"
        >
          <span class="text-sm text-gray-900 dark:text-white capitalize">{{ String(entityType).replace(/_/g, ' ') }}</span>
          <span class="rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
            {{ count }}
          </span>
        </div>
      </div>

      <!-- Demo Products -->
      <div v-if="launchResult?.demo_products_created" class="flex items-center gap-2 rounded-lg bg-primary-50 dark:bg-primary-900/30 p-3">
        <svg class="h-4 w-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <span class="text-sm text-primary-700 dark:text-primary-400">
          {{ launchResult.demo_products_created }} demo products created for testing.
        </span>
      </div>

      <!-- Messages -->
      <div v-if="launchResult?.messages?.length" class="space-y-1">
        <p
          v-for="(msg, idx) in launchResult.messages"
          :key="idx"
          class="text-xs text-gray-500 dark:text-gray-400"
        >
          {{ msg }}
        </p>
      </div>
    </template>

    <!-- Launch Result: Failed -->
    <template v-else-if="launched && !isSuccess">
      <div class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4">
        <div class="flex items-center gap-3">
          <svg class="h-6 w-6 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="font-medium text-red-900 dark:text-red-300">Launch encountered issues</h3>
            <p class="mt-1 text-sm text-red-700 dark:text-red-400">
              {{ launchResult?.message || (isPartial ? 'Some entities were created, but errors occurred.' : 'The launch process failed. Please try again.') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Errors -->
      <div v-if="launchResult?.errors?.length" class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3">
        <p class="mb-1 text-xs font-medium text-red-800 dark:text-red-300">Errors:</p>
        <ul class="list-inside list-disc space-y-0.5 text-xs text-red-700 dark:text-red-400">
          <li v-for="(err, idx) in launchResult.errors" :key="idx">{{ err }}</li>
        </ul>
      </div>

      <!-- Retry button -->
      <button
        class="btn-primary w-full"
        :disabled="launching || props.loading"
        @click="handleLaunch"
      >
        <span
          v-if="launching"
          class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
        />
        {{ launching ? 'Retrying...' : 'Retry Launch' }}
      </button>
    </template>

    <!-- Pre-launch: Configuration Summary + Launch Controls -->
    <template v-else>
      <!-- Readiness Banner -->
      <div
        class="flex items-center gap-3 rounded-lg p-4"
        :class="readyToLaunch
          ? 'border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950'
          : 'border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950'
        "
      >
        <svg
          v-if="readyToLaunch"
          class="h-6 w-6 flex-shrink-0 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg
          v-else
          class="h-6 w-6 flex-shrink-0 text-amber-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h3
            class="font-medium"
            :class="readyToLaunch ? 'text-green-900 dark:text-green-300' : 'text-amber-900 dark:text-amber-300'"
          >
            {{ readyToLaunch ? 'Ready to Launch' : 'Almost there' }}
          </h3>
          <p
            class="text-sm"
            :class="readyToLaunch ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'"
          >
            {{ completedCount }} of {{ summary.total_steps - 1 }} steps completed
            <span v-if="summary.skipped_steps.length > 0">
              ({{ summary.skipped_steps.length }} skipped)
            </span>
          </p>
        </div>
      </div>

      <!-- Skipped Steps Notice -->
      <div
        v-if="skippedStepNames.length > 0"
        class="flex items-start gap-2 rounded-lg bg-white dark:bg-gray-800 p-3"
      >
        <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Skipped: {{ skippedStepNames.join(', ') }}.
          Default settings will be used. You can configure these later in Settings.
        </p>
      </div>

      <!-- Configuration Summary Grid -->
      <div class="space-y-3">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Configuration Summary</h3>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div
            v-for="section in summarySections"
            :key="section.id"
            class="rounded-lg border border-gray-300 dark:border-gray-600 p-3"
            :class="{ 'opacity-60': section.skipped }"
          >
            <!-- Section Header -->
            <div class="mb-2 flex items-center gap-2">
              <div
                class="flex h-6 w-6 items-center justify-center rounded"
                :class="section.skipped ? 'bg-gray-100 dark:bg-gray-700' : 'bg-primary-100 dark:bg-primary-900/40'"
              >
                <svg
                  class="h-3.5 w-3.5"
                  :class="section.skipped ? 'text-gray-400' : 'text-primary-600'"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="section.icon" />
                </svg>
              </div>
              <span class="text-xs font-medium text-gray-900 dark:text-white">
                {{ section.title }}
              </span>
              <span
                v-if="section.skipped"
                class="ml-auto rounded-full bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-500 dark:text-gray-400"
              >
                Skipped
              </span>
            </div>

            <!-- Section Items -->
            <dl class="space-y-1">
              <div
                v-for="item in section.items"
                :key="item.label"
                class="flex items-baseline justify-between gap-2"
              >
                <dt class="text-[11px] text-gray-500 dark:text-gray-400">{{ item.label }}</dt>
                <dd class="truncate text-right text-[11px] font-medium text-gray-900 dark:text-white">
                  {{ item.value }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <!-- Demo Product Toggle -->
      <div class="rounded-lg border border-gray-300 dark:border-gray-600 p-4">
        <div class="flex items-start gap-3">
          <input
            id="create_demo_products"
            v-model="form.create_demo_products"
            type="checkbox"
            class="mt-0.5 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
          />
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-900 dark:text-white" for="create_demo_products">
              Create Demo Products
            </label>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Generate sample products using your industry template to help you
              explore the system. Demo products can be deleted later.
            </p>
          </div>
        </div>
      </div>

      <!-- Launch Button -->
      <div>
        <button
          class="btn-primary w-full py-3 text-base font-semibold"
          :disabled="launching || props.loading || !readyToLaunch"
          @click="handleLaunch"
        >
          <span
            v-if="launching"
            class="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
          />
          <svg
            v-else
            class="mr-2 inline-block h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {{ launching ? 'Launching PIM...' : 'Launch PIM' }}
        </button>
        <p class="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
          This will apply your industry template and create all configured entities.
          You can customize everything after launch in Settings.
        </p>
      </div>
    </template>
  </div>
</template>
