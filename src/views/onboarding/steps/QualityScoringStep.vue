<script setup lang="ts">
/**
 * QualityScoringStep - Configure quality scoring thresholds and dimension weights.
 *
 * Step 9 of 12 (optional / skippable).
 *
 * Collects:
 * - Minimum quality threshold (0-100 slider)
 * - Scoring dimension weights (attribute_completeness, content_quality,
 *   media_coverage, seo_optimization, compliance)
 */
import { reactive, computed, watch, onMounted } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import type { QualityScoringData, ScoringWeights, StepFormData } from '@/types'

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
// Scoring Dimension Definitions
// ============================================================================

interface ScoringDimension {
  key: keyof ScoringWeights
  label: string
  description: string
  color: string
}

const SCORING_DIMENSIONS: readonly ScoringDimension[] = [
  {
    key: 'attribute_completeness',
    label: 'Attribute Completeness',
    description: 'Weight for how complete the required attributes are for each product.',
    color: 'bg-blue-500',
  },
  {
    key: 'content_quality',
    label: 'Content Quality',
    description: 'Weight for product descriptions, titles, and text content quality.',
    color: 'bg-green-500',
  },
  {
    key: 'media_coverage',
    label: 'Media Coverage',
    description: 'Weight for product images, videos, and other media assets.',
    color: 'bg-purple-500',
  },
  {
    key: 'seo_optimization',
    label: 'SEO Optimization',
    description: 'Weight for search engine optimization factors like keywords and meta data.',
    color: 'bg-orange-500',
  },
  {
    key: 'compliance',
    label: 'Compliance',
    description: 'Weight for regulatory compliance and certification data completeness.',
    color: 'bg-red-500',
  },
] as const

// ============================================================================
// Default Weights
// ============================================================================

const DEFAULT_WEIGHTS: ScoringWeights = {
  attribute_completeness: 30,
  content_quality: 25,
  media_coverage: 20,
  seo_optimization: 15,
  compliance: 10,
}

// ============================================================================
// Form State
// ============================================================================

/** Load initial data from store or props */
function getInitialData(): QualityScoringData {
  const storeData = store.getWizardStepData('quality_scoring')
  const source = storeData ?? props.data

  const weights = (source?.scoring_weights as ScoringWeights) ?? {}

  return {
    quality_threshold: (source?.quality_threshold as number) ?? 70,
    scoring_weights: {
      attribute_completeness: weights.attribute_completeness ?? DEFAULT_WEIGHTS.attribute_completeness,
      content_quality: weights.content_quality ?? DEFAULT_WEIGHTS.content_quality,
      media_coverage: weights.media_coverage ?? DEFAULT_WEIGHTS.media_coverage,
      seo_optimization: weights.seo_optimization ?? DEFAULT_WEIGHTS.seo_optimization,
      compliance: weights.compliance ?? DEFAULT_WEIGHTS.compliance,
    },
  }
}

const form = reactive<QualityScoringData>(getInitialData())

/** Sync initial data to store on mount */
onMounted(() => {
  store.setWizardStepData('quality_scoring', { ...form })
})

// ============================================================================
// Computed
// ============================================================================

/** Sum of all scoring weights */
const totalWeight = computed<number>(() => {
  if (!form.scoring_weights) return 0
  return Object.values(form.scoring_weights).reduce(
    (sum: number, w: number | undefined) => sum + (w ?? 0),
    0,
  )
})

/** Whether weights sum to exactly 100 */
const weightsBalanced = computed<boolean>(() => totalWeight.value === 100)

/** Threshold label based on value */
const thresholdLabel = computed<string>(() => {
  const t = form.quality_threshold ?? 0
  if (t >= 90) return 'Very High'
  if (t >= 70) return 'High'
  if (t >= 50) return 'Medium'
  if (t >= 30) return 'Low'
  return 'Minimal'
})

// ============================================================================
// Actions
// ============================================================================

/** Reset weights to defaults */
function resetWeights(): void {
  if (!form.scoring_weights) return
  form.scoring_weights.attribute_completeness = DEFAULT_WEIGHTS.attribute_completeness
  form.scoring_weights.content_quality = DEFAULT_WEIGHTS.content_quality
  form.scoring_weights.media_coverage = DEFAULT_WEIGHTS.media_coverage
  form.scoring_weights.seo_optimization = DEFAULT_WEIGHTS.seo_optimization
  form.scoring_weights.compliance = DEFAULT_WEIGHTS.compliance
}

// ============================================================================
// Watchers & Submit
// ============================================================================

/** Emit form data changes to parent and sync to store */
watch(
  form,
  (newVal) => {
    const data = { ...newVal }
    store.setWizardStepData('quality_scoring', data)
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
    <!-- Quality Threshold Slider -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white" for="quality_threshold">
        Minimum Quality Threshold
      </label>
      <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Products must reach this score before they can be published.
        A higher threshold enforces stricter data quality standards.
      </p>
      <div class="rounded-lg border border-gray-300 dark:border-gray-600 p-4">
        <div class="flex items-center justify-between">
          <span class="text-2xl font-bold text-primary-600">
            {{ form.quality_threshold }}%
          </span>
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="{
              'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400': (form.quality_threshold ?? 0) < 30,
              'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400': (form.quality_threshold ?? 0) >= 30 && (form.quality_threshold ?? 0) < 50,
              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400': (form.quality_threshold ?? 0) >= 50 && (form.quality_threshold ?? 0) < 70,
              'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400': (form.quality_threshold ?? 0) >= 70 && (form.quality_threshold ?? 0) < 90,
              'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400': (form.quality_threshold ?? 0) >= 90,
            }"
          >
            {{ thresholdLabel }}
          </span>
        </div>
        <input
          id="quality_threshold"
          v-model.number="form.quality_threshold"
          type="range"
          min="0"
          max="100"
          step="5"
          class="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary-600"
        />
        <div class="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>

    <!-- Scoring Weights -->
    <div>
      <div class="mb-3 flex items-center justify-between">
        <div>
          <label class="block text-sm font-medium text-gray-900 dark:text-white">
            Scoring Dimension Weights
          </label>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Adjust how much each dimension contributes to the overall quality score.
            Weights should sum to 100.
          </p>
        </div>
        <button
          class="rounded-md border border-gray-300 dark:border-gray-600 px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-900 dark:text-white"
          @click="resetWeights"
        >
          Reset Defaults
        </button>
      </div>

      <div class="space-y-4">
        <div
          v-for="dimension in SCORING_DIMENSIONS"
          :key="dimension.key"
          class="rounded-lg border border-gray-300 dark:border-gray-600 p-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="h-3 w-3 rounded-full" :class="dimension.color" />
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ dimension.label }}</span>
            </div>
            <span class="text-sm font-medium text-primary-600">
              {{ form.scoring_weights?.[dimension.key] ?? 0 }}%
            </span>
          </div>
          <p class="mb-2 mt-1 text-xs text-gray-500 dark:text-gray-400">{{ dimension.description }}</p>
          <input
            v-model.number="form.scoring_weights![dimension.key]"
            type="range"
            min="0"
            max="100"
            step="5"
            class="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary-600"
          />
        </div>
      </div>

      <!-- Weight Total -->
      <div
        class="mt-3 flex items-center justify-between rounded-lg p-3"
        :class="weightsBalanced ? 'bg-green-50 dark:bg-green-950' : 'bg-amber-50 dark:bg-amber-950'"
      >
        <span class="text-sm font-medium" :class="weightsBalanced ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'">
          Total Weight
        </span>
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold" :class="weightsBalanced ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'">
            {{ totalWeight }}%
          </span>
          <svg
            v-if="weightsBalanced"
            class="h-4 w-4 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span v-else class="text-xs text-amber-600 dark:text-amber-400">(should be 100%)</span>
        </div>
      </div>
    </div>

    <!-- Info callout -->
    <div class="flex items-start gap-2 rounded-lg bg-white dark:bg-gray-800 p-3">
      <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        This step is optional. You can skip it to use default scoring settings.
        Quality scoring can be fine-tuned later in PIM Settings.
      </p>
    </div>
  </div>
</template>
