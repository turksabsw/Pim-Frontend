<script setup lang="ts">
/**
 * IntegrationsStep - Configure external system integrations.
 *
 * Step 10 of 12 (optional / skippable).
 *
 * Collects:
 * - ERP sync toggle, ERP type, sync direction
 * - AI enrichment toggle, AI provider, AI use cases
 * - GS1 barcode support toggle
 * - MDM (Master Data Management) toggle
 */
import { reactive, watch, onMounted } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import type {
  IntegrationsData,
  StepFormData,
  ErpType,
  SyncDirection,
  AiProvider,
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

// ============================================================================
// ERP Options
// ============================================================================

const ERP_TYPES: readonly { value: ErpType; label: string; description: string }[] = [
  { value: 'erpnext', label: 'ERPNext', description: 'Native Frappe/ERPNext integration with bidirectional sync' },
  { value: 'sap', label: 'SAP', description: 'SAP ERP integration via API connector' },
  { value: 'oracle', label: 'Oracle', description: 'Oracle ERP Cloud integration' },
  { value: 'microsoft_dynamics', label: 'Microsoft Dynamics', description: 'Microsoft Dynamics 365 integration' },
  { value: 'other', label: 'Other', description: 'Custom ERP integration via API' },
] as const

const SYNC_DIRECTIONS: readonly { value: SyncDirection; label: string; description: string }[] = [
  {
    value: 'pim_to_erp',
    label: 'PIM → ERP',
    description: 'PIM is the source of truth. Changes flow from PIM to ERP.',
  },
  {
    value: 'erp_to_pim',
    label: 'ERP → PIM',
    description: 'ERP is the source of truth. Changes flow from ERP to PIM.',
  },
  {
    value: 'bidirectional',
    label: 'Bidirectional',
    description: 'Changes sync both ways with conflict detection.',
  },
] as const

// ============================================================================
// AI Options
// ============================================================================

const AI_PROVIDERS: readonly { value: AiProvider; label: string; description: string }[] = [
  { value: 'openai', label: 'OpenAI', description: 'GPT-4 for content generation and enrichment' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude for intelligent product enrichment' },
  { value: 'google', label: 'Google AI', description: 'Gemini for multi-modal product analysis' },
  { value: 'local', label: 'Local / Self-hosted', description: 'Self-hosted model (Ollama, vLLM, etc.)' },
] as const

const AI_USE_CASE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'description_generation', label: 'Description Generation' },
  { value: 'attribute_extraction', label: 'Attribute Extraction' },
  { value: 'image_tagging', label: 'Image Tagging' },
  { value: 'translation', label: 'Translation' },
  { value: 'seo_optimization', label: 'SEO Optimization' },
  { value: 'categorization', label: 'Auto-Categorization' },
] as const

// ============================================================================
// Form State
// ============================================================================

/** Load initial data from store or props */
function getInitialData(): IntegrationsData {
  const storeData = store.getWizardStepData('integrations')
  const source = storeData ?? props.data

  return {
    enable_erp_sync: (source?.enable_erp_sync as boolean) ?? true,
    erp_type: (source?.erp_type as ErpType) ?? 'erpnext',
    sync_direction: (source?.sync_direction as SyncDirection) ?? 'pim_to_erp',
    enable_ai_enrichment: (source?.enable_ai_enrichment as boolean) ?? false,
    ai_provider: (source?.ai_provider as AiProvider) ?? undefined,
    ai_use_cases: (source?.ai_use_cases as string[]) ?? [],
    enable_gs1: (source?.enable_gs1 as boolean) ?? false,
    enable_mdm: (source?.enable_mdm as boolean) ?? false,
  }
}

const form = reactive<IntegrationsData>(getInitialData())

/** Sync initial data to store on mount */
onMounted(() => {
  store.setWizardStepData('integrations', { ...form })
})

// ============================================================================
// AI Use Case Toggle
// ============================================================================

/** Toggle an AI use case on/off */
function toggleUseCase(useCase: string): void {
  if (!form.ai_use_cases) {
    form.ai_use_cases = []
  }
  const idx = form.ai_use_cases.indexOf(useCase)
  if (idx >= 0) {
    form.ai_use_cases.splice(idx, 1)
  } else {
    form.ai_use_cases.push(useCase)
  }
}

/** Check if an AI use case is selected */
function isUseCaseSelected(useCase: string): boolean {
  return form.ai_use_cases?.includes(useCase) ?? false
}

// ============================================================================
// Watchers & Submit
// ============================================================================

/** Emit form data changes to parent and sync to store */
watch(
  form,
  (newVal) => {
    const data = { ...newVal }
    store.setWizardStepData('integrations', data)
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
    <!-- ERP Integration Section -->
    <div class="space-y-4">
      <h3 class="text-sm font-medium text-gray-900 dark:text-white">ERP Integration</h3>

      <!-- ERP Sync Toggle -->
      <div class="rounded-lg border border-gray-300 dark:border-gray-600 p-4">
        <div class="flex items-start gap-3">
          <input
            id="enable_erp_sync"
            v-model="form.enable_erp_sync"
            type="checkbox"
            class="mt-0.5 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
          />
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-900 dark:text-white" for="enable_erp_sync">
              Enable ERP Sync
            </label>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Synchronize product data with your ERP system. Products, pricing,
              and inventory data will be kept in sync automatically.
            </p>
          </div>
        </div>
      </div>

      <!-- ERP Type (visible when sync enabled) -->
      <div v-if="form.enable_erp_sync" class="space-y-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white" for="erp_type">
            ERP System
          </label>
          <select
            id="erp_type"
            v-model="form.erp_type"
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
          >
            <option
              v-for="erp in ERP_TYPES"
              :key="erp.value"
              :value="erp.value"
            >
              {{ erp.label }} — {{ erp.description }}
            </option>
          </select>
        </div>

        <!-- Sync Direction -->
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            Sync Direction
          </label>
          <div class="space-y-2">
            <label
              v-for="direction in SYNC_DIRECTIONS"
              :key="direction.value"
              class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              :class="{
                'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20': form.sync_direction === direction.value,
              }"
            >
              <input
                v-model="form.sync_direction"
                type="radio"
                :value="direction.value"
                class="mt-0.5 h-4 w-4 border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
              />
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ direction.label }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ direction.description }}</p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Enrichment Section -->
    <div class="space-y-4">
      <h3 class="text-sm font-medium text-gray-900 dark:text-white">AI Enrichment</h3>

      <!-- AI Toggle -->
      <div class="rounded-lg border border-gray-300 dark:border-gray-600 p-4">
        <div class="flex items-start gap-3">
          <input
            id="enable_ai_enrichment"
            v-model="form.enable_ai_enrichment"
            type="checkbox"
            class="mt-0.5 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
          />
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-900 dark:text-white" for="enable_ai_enrichment">
              Enable AI Enrichment
            </label>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Use AI to automatically generate descriptions, extract attributes,
              tag images, and optimize product content.
            </p>
          </div>
        </div>
      </div>

      <!-- AI Provider & Use Cases (visible when AI enabled) -->
      <div v-if="form.enable_ai_enrichment" class="space-y-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white" for="ai_provider">
            AI Provider
          </label>
          <select
            id="ai_provider"
            v-model="form.ai_provider"
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
          >
            <option :value="undefined" disabled>Select a provider...</option>
            <option
              v-for="provider in AI_PROVIDERS"
              :key="provider.value"
              :value="provider.value"
            >
              {{ provider.label }} — {{ provider.description }}
            </option>
          </select>
        </div>

        <!-- AI Use Cases -->
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            AI Use Cases
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="useCase in AI_USE_CASE_OPTIONS"
              :key="useCase.value"
              class="rounded-full border px-3 py-1.5 text-sm transition-all duration-200"
              :class="
                isUseCaseSelected(useCase.value)
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
              "
              @click="toggleUseCase(useCase.value)"
            >
              {{ useCase.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Standards & Data Section -->
    <div class="space-y-4">
      <h3 class="text-sm font-medium text-gray-900 dark:text-white">Standards & Data Management</h3>

      <!-- GS1 Toggle -->
      <div class="rounded-lg border border-gray-300 dark:border-gray-600 p-4">
        <div class="flex items-start gap-3">
          <input
            id="enable_gs1"
            v-model="form.enable_gs1"
            type="checkbox"
            class="mt-0.5 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
          />
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-900 dark:text-white" for="enable_gs1">
              GS1 Barcode Support
            </label>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Enable GS1 GTIN/EAN barcode validation and management.
              Required for retail and marketplace channel compliance.
            </p>
          </div>
        </div>
      </div>

      <!-- MDM Toggle -->
      <div class="rounded-lg border border-gray-300 dark:border-gray-600 p-4">
        <div class="flex items-start gap-3">
          <input
            id="enable_mdm"
            v-model="form.enable_mdm"
            type="checkbox"
            class="mt-0.5 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
          />
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-900 dark:text-white" for="enable_mdm">
              Master Data Management (MDM)
            </label>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Enable MDM features for deduplication, golden record management,
              and cross-system data governance.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Info callout -->
    <div class="flex items-start gap-2 rounded-lg bg-white dark:bg-gray-800 p-3">
      <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        This step is optional. All integrations can be configured or modified later
        in PIM Settings. API keys and credentials are set up after onboarding completes.
      </p>
    </div>
  </div>
</template>
