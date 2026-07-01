<script setup lang="ts">
/**
 * ComplianceStep - Configure regulatory compliance and certification tracking.
 *
 * Step 11 of 12 (optional / skippable).
 *
 * Collects:
 * - compliance_standards: string[] — applicable regulatory standards
 * - certification_tracking: boolean — enable certification management
 */
import { reactive, watch, onMounted } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import type { ComplianceData, StepFormData } from '@/types'

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
// Compliance Standard Definitions
// ============================================================================

interface ComplianceStandard {
  value: string
  label: string
  description: string
  category: 'safety' | 'environmental' | 'quality' | 'industry'
}

const COMPLIANCE_STANDARDS: readonly ComplianceStandard[] = [
  // Safety standards
  { value: 'ce', label: 'CE Marking', description: 'European conformity for health, safety, and environment', category: 'safety' },
  { value: 'fda', label: 'FDA', description: 'US Food and Drug Administration regulations', category: 'safety' },
  { value: 'rohs', label: 'RoHS', description: 'Restriction of hazardous substances in electronics', category: 'safety' },
  // Environmental standards
  { value: 'reach', label: 'REACH', description: 'EU regulation on chemicals and their safe use', category: 'environmental' },
  { value: 'gots', label: 'GOTS', description: 'Global Organic Textile Standard', category: 'environmental' },
  { value: 'oeko_tex', label: 'OEKO-TEX', description: 'Textile product safety testing and certification', category: 'environmental' },
  // Quality management
  { value: 'iso9001', label: 'ISO 9001', description: 'Quality management systems', category: 'quality' },
  { value: 'iso14001', label: 'ISO 14001', description: 'Environmental management systems', category: 'quality' },
  { value: 'iso22000', label: 'ISO 22000', description: 'Food safety management systems', category: 'quality' },
  // Industry-specific
  { value: 'iatf16949', label: 'IATF 16949', description: 'Automotive quality management systems', category: 'industry' },
  { value: 'as9100', label: 'AS9100', description: 'Aerospace quality management systems', category: 'industry' },
  { value: 'gmp', label: 'GMP', description: 'Good Manufacturing Practice for food, pharma, cosmetics', category: 'industry' },
] as const

/** Category labels for grouping standards in the UI */
const CATEGORY_LABELS: Record<string, string> = {
  safety: 'Safety & Regulatory',
  environmental: 'Environmental',
  quality: 'Quality Management',
  industry: 'Industry-Specific',
}

/** Unique categories in display order */
const CATEGORIES = ['safety', 'environmental', 'quality', 'industry'] as const

// ============================================================================
// Form State
// ============================================================================

/** Load initial data from store or props */
function getInitialData(): ComplianceData {
  const storeData = store.getWizardStepData('compliance')
  const source = storeData ?? props.data

  return {
    compliance_standards: (source?.compliance_standards as string[])
      ?? (source?.regulatory_standards as string[])
      ?? [],
    certification_tracking: (source?.certification_tracking as boolean) ?? false,
  }
}

const form = reactive<ComplianceData>(getInitialData())

/** Sync initial data to store on mount */
onMounted(() => {
  store.setWizardStepData('compliance', { ...form })
})

// ============================================================================
// Standard Toggle Helpers
// ============================================================================

/** Toggle a compliance standard on/off */
function toggleStandard(standard: string): void {
  if (!form.compliance_standards) {
    form.compliance_standards = []
  }
  const idx = form.compliance_standards.indexOf(standard)
  if (idx >= 0) {
    form.compliance_standards.splice(idx, 1)
  } else {
    form.compliance_standards.push(standard)
  }
}

/** Check if a standard is selected */
function isStandardSelected(standard: string): boolean {
  return form.compliance_standards?.includes(standard) ?? false
}

/** Get standards for a given category */
function getStandardsByCategory(category: string): ComplianceStandard[] {
  return COMPLIANCE_STANDARDS.filter((s) => s.category === category)
}

// ============================================================================
// Watchers & Submit
// ============================================================================

/** Emit form data changes to parent and sync to store */
watch(
  form,
  (newVal) => {
    const data = { ...newVal }
    store.setWizardStepData('compliance', data)
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
    <!-- Compliance Standards by Category -->
    <div
      v-for="category in CATEGORIES"
      :key="category"
    >
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        {{ CATEGORY_LABELS[category] }}
      </label>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          v-for="standard in getStandardsByCategory(category)"
          :key="standard.value"
          class="flex items-start gap-3 rounded-lg border p-3 text-left transition-all duration-200"
          :class="
            isStandardSelected(standard.value)
              ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-300'
          "
          @click="toggleStandard(standard.value)"
        >
          <div
            class="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border"
            :class="
              isStandardSelected(standard.value)
                ? 'border-primary-600 bg-primary-600'
                : 'border-gray-300 dark:border-gray-600'
            "
          >
            <svg
              v-if="isStandardSelected(standard.value)"
              class="h-3 w-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ standard.label }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ standard.description }}</p>
          </div>
        </button>
      </div>
    </div>

    <!-- Certification Tracking -->
    <div class="rounded-lg border border-gray-300 dark:border-gray-600 p-4">
      <div class="flex items-start gap-3">
        <input
          id="certification_tracking"
          v-model="form.certification_tracking"
          type="checkbox"
          class="mt-0.5 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
        />
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-900 dark:text-white" for="certification_tracking">
            Enable Certification Tracking
          </label>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Track certification status, expiration dates, and renewal reminders
            for each product. Includes audit trail for compliance documentation.
          </p>
        </div>
      </div>
    </div>

    <!-- Info callout -->
    <div class="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950 p-3">
      <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-xs text-amber-700 dark:text-amber-400">
        This step is optional. Compliance standards create quality rules that enforce
        required data on products. Products missing compliance data will have reduced
        quality scores. You can skip this step and configure compliance later.
      </p>
    </div>
  </div>
</template>
