/**
 * Template engine composable for industry template management.
 *
 * Provides frontend access to the backend template engine via API calls:
 * - Load and preview industry templates (7 sectors)
 * - Apply templates to create PIM entities
 * - Track template application progress
 * - Manage template version selection
 *
 * Communicates with:
 * - frappe_pim.pim.api.onboarding.get_template_preview
 * - frappe_pim.pim.api.onboarding.apply_template
 * - frappe_pim.pim.api.onboarding.v2_complete_onboarding
 * - Industry Template DocType (via useFrappeAPI resource calls)
 *
 * Usage:
 *   const engine = useTemplateEngine()
 *   await engine.loadPreview('fashion')
 *   const result = await engine.applyTemplate(true)
 */

import { ref, computed, readonly, type Ref, type DeepReadonly } from 'vue'
import { useOnboardingAPI } from './useOnboardingAPI'
import type {
  IndustrySector,
  IndustryTemplateCode,
  TemplatePreviewResponse,
  TemplateFamilyPreview,
  CompletionResponse,
  ScoringWeights,
} from '@/types'

// ============================================================================
// Types
// ============================================================================

/** Template application status */
export type TemplateApplicationStatus =
  | 'idle'
  | 'loading_preview'
  | 'preview_loaded'
  | 'applying'
  | 'applied'
  | 'failed'

/** Template application progress event */
export interface TemplateProgressEvent {
  phase: string
  message: string
  percent: number
  timestamp: string
}

/** Summary of template application results */
export interface TemplateApplicationSummary {
  success: boolean
  status: 'completed' | 'failed' | 'pending'
  entities_created: Record<string, number>
  demo_products_created: number
  errors: string[]
  messages: string[]
  applied_at: string | null
}

/** Return type of useTemplateEngine composable */
export interface UseTemplateEngineReturn {
  // ── Reactive State ─────────────────────────────────────────────────────

  /** Current template application status */
  status: DeepReadonly<Ref<TemplateApplicationStatus>>

  /** Selected industry sector for template operations */
  selectedIndustry: DeepReadonly<Ref<IndustrySector | null>>

  /** Loaded template preview data */
  preview: DeepReadonly<Ref<TemplatePreviewResponse | null>>

  /** Template application result */
  applicationResult: DeepReadonly<Ref<TemplateApplicationSummary | null>>

  /** Whether a template operation is in progress */
  loading: DeepReadonly<Ref<boolean>>

  /** Current error message, or null */
  error: DeepReadonly<Ref<string | null>>

  /** Progress events during template application */
  progressEvents: DeepReadonly<Ref<TemplateProgressEvent[]>>

  // ── Computed ───────────────────────────────────────────────────────────

  /** Whether a preview is loaded and ready */
  hasPreview: Readonly<Ref<boolean>>

  /** Whether the template has been successfully applied */
  isApplied: Readonly<Ref<boolean>>

  /** Whether a template operation is in progress */
  isBusy: Readonly<Ref<boolean>>

  /** Number of attribute groups in the template */
  attributeGroupCount: Readonly<Ref<number>>

  /** Number of product families in the template */
  familyCount: Readonly<Ref<number>>

  /** Total attributes in the template */
  attributeCount: Readonly<Ref<number>>

  /** Demo product count from the template */
  demoProductCount: Readonly<Ref<number>>

  /** Estimated setup time in minutes */
  estimatedSetupMinutes: Readonly<Ref<number>>

  /** Product family previews from the template */
  families: Readonly<Ref<TemplateFamilyPreview[]>>

  /** Default channels from the template */
  defaultChannels: Readonly<Ref<string[]>>

  /** Compliance modules from the template */
  complianceModules: Readonly<Ref<string[]>>

  /** Quality scoring configuration from the template */
  qualityConfig: Readonly<Ref<{ threshold: number; weights: ScoringWeights } | null>>

  // ── Actions ────────────────────────────────────────────────────────────

  /** Set the industry sector for template operations */
  setIndustry: (industry: IndustrySector) => void

  /** Load template preview for the selected (or specified) industry */
  loadPreview: (industry?: IndustrySector) => Promise<TemplatePreviewResponse | null>

  /** Apply the template, creating all PIM entities */
  applyTemplate: (createDemoProducts?: boolean) => Promise<CompletionResponse | null>

  /** Complete onboarding (calls v2_complete_onboarding) */
  completeOnboarding: (formData?: Record<string, unknown>) => Promise<CompletionResponse | null>

  /** Reset template engine state */
  reset: () => void

  /** Clear the current error */
  clearError: () => void
}

// ============================================================================
// Industry Metadata
// ============================================================================

/** Display names for industry sectors */
const INDUSTRY_DISPLAY_NAMES: Record<IndustryTemplateCode, string> = {
  fashion: 'Fashion & Apparel',
  industrial: 'Industrial & Manufacturing',
  food: 'Food & Beverage',
  electronics: 'Electronics & Technology',
  health_beauty: 'Health & Beauty',
  automotive: 'Automotive & Parts',
  custom: 'Custom',
}

/** Get display name for an industry sector */
export function getIndustryDisplayName(sector: string): string {
  return INDUSTRY_DISPLAY_NAMES[sector as IndustryTemplateCode] ?? sector
}

/** All available industry sector codes */
export const AVAILABLE_INDUSTRIES: readonly IndustryTemplateCode[] = [
  'fashion',
  'industrial',
  'food',
  'electronics',
  'health_beauty',
  'automotive',
  'custom',
] as const

// ============================================================================
// Composable
// ============================================================================

/**
 * Vue 3 composable for industry template management.
 *
 * Wraps the backend template engine via `useOnboardingAPI`, providing
 * reactive state for template preview, application, and progress
 * tracking. Used primarily by the Industry Selection step (Step 2)
 * and Summary & Launch step (Step 12).
 *
 * @example
 * ```ts
 * const engine = useTemplateEngine()
 *
 * // Load preview when user selects industry
 * async function onIndustryChange(industry: IndustrySector) {
 *   engine.setIndustry(industry)
 *   await engine.loadPreview()
 * }
 *
 * // Apply template on final step
 * async function onLaunch() {
 *   const result = await engine.applyTemplate(true)
 *   if (result?.success) {
 *     router.push(result.redirect_to)
 *   }
 * }
 * ```
 */
export function useTemplateEngine(): UseTemplateEngineReturn {
  const api = useOnboardingAPI()

  // ==========================================================================
  // Reactive State
  // ==========================================================================

  const status = ref<TemplateApplicationStatus>('idle')
  const selectedIndustry = ref<IndustrySector | null>(null)
  const preview = ref<TemplatePreviewResponse | null>(null)
  const applicationResult = ref<TemplateApplicationSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const progressEvents = ref<TemplateProgressEvent[]>([])

  // ==========================================================================
  // Computed
  // ==========================================================================

  const hasPreview = computed(() => preview.value !== null)

  const isApplied = computed(() =>
    status.value === 'applied' && applicationResult.value?.success === true,
  )

  const isBusy = computed(() =>
    status.value === 'loading_preview' || status.value === 'applying',
  )

  const attributeGroupCount = computed(() =>
    preview.value?.attribute_groups?.length ?? 0,
  )

  const familyCount = computed(() =>
    preview.value?.product_families?.length ?? 0,
  )

  const attributeCount = computed(() =>
    preview.value?.attribute_count ?? 0,
  )

  const demoProductCount = computed(() =>
    preview.value?.demo_products ?? 0,
  )

  const estimatedSetupMinutes = computed(() =>
    preview.value?.estimated_setup_minutes ?? 0,
  )

  const families = computed<TemplateFamilyPreview[]>(() =>
    preview.value?.product_families ?? [],
  )

  const defaultChannels = computed<string[]>(() =>
    preview.value?.default_channels ?? [],
  )

  const complianceModules = computed<string[]>(() =>
    preview.value?.compliance_modules ?? [],
  )

  const qualityConfig = computed(() => {
    if (!preview.value) return null
    return {
      threshold: preview.value.quality_threshold,
      weights: preview.value.scoring_weights,
    }
  })

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Set the industry sector for template operations.
   *
   * Resets preview and application state when the industry changes.
   *
   * @param industry - Industry sector code
   */
  function setIndustry(industry: IndustrySector): void {
    if (selectedIndustry.value !== industry) {
      selectedIndustry.value = industry
      // Reset preview when industry changes
      preview.value = null
      applicationResult.value = null
      status.value = 'idle'
      error.value = null
      progressEvents.value = []
    }
  }

  /**
   * Load a template preview for the selected (or specified) industry.
   *
   * Calls the backend `get_template_preview` API to fetch template
   * metadata: attribute counts, families, channels, compliance modules,
   * quality thresholds, and estimated setup time.
   *
   * @param industry - Industry sector code. Uses selectedIndustry if omitted.
   * @returns Template preview data, or null on error
   */
  async function loadPreview(
    industry?: IndustrySector,
  ): Promise<TemplatePreviewResponse | null> {
    const target = industry ?? selectedIndustry.value
    if (!target) {
      error.value = 'No industry selected for template preview'
      return null
    }

    // Update selected industry if a specific one was provided
    if (industry) {
      selectedIndustry.value = industry
    }

    loading.value = true
    status.value = 'loading_preview'
    error.value = null

    try {
      const result = await api.getTemplatePreview(target)
      preview.value = result
      status.value = 'preview_loaded'
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load template preview'
      error.value = message
      status.value = 'idle'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Apply the industry template, creating all PIM entities.
   *
   * Calls the backend `apply_template` API which creates attribute
   * groups, product families, categories, channels, and optionally
   * demo products based on the selected industry template.
   *
   * @param createDemoProducts - Whether to create demo products
   * @returns Completion response with entity counts, or null on error
   */
  async function applyTemplate(
    createDemoProducts = false,
  ): Promise<CompletionResponse | null> {
    if (!selectedIndustry.value) {
      error.value = 'No industry selected for template application'
      return null
    }

    loading.value = true
    status.value = 'applying'
    error.value = null
    progressEvents.value = []

    addProgressEvent('init', 'Starting template application...', 0)

    try {
      addProgressEvent('applying', 'Creating PIM entities from template...', 30)

      const result = await api.applyTemplate(createDemoProducts)

      if (result.success) {
        addProgressEvent('complete', 'Template applied successfully', 100)
        status.value = 'applied'
        applicationResult.value = {
          success: result.success,
          status: result.status,
          entities_created: result.entities_created,
          demo_products_created: result.demo_products_created,
          errors: result.errors,
          messages: result.messages,
          applied_at: result.onboarding_completed_at ?? new Date().toISOString(),
        }
      } else {
        addProgressEvent('error', 'Template application encountered issues', 100)
        status.value = 'failed'
        error.value = result.errors?.join('; ') ?? 'Template application failed'
        applicationResult.value = {
          success: false,
          status: result.status,
          entities_created: result.entities_created,
          demo_products_created: result.demo_products_created,
          errors: result.errors,
          messages: result.messages,
          applied_at: null,
        }
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply template'
      error.value = message
      status.value = 'failed'
      addProgressEvent('error', message, 100)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Complete the onboarding wizard.
   *
   * Calls the backend `v2_complete_onboarding` API which performs
   * final template application, feature flag setup, and marks
   * onboarding as completed.
   *
   * @param formData - Optional final form data from summary/launch step
   * @returns Completion response, or null on error
   */
  async function completeOnboarding(
    formData?: Record<string, unknown>,
  ): Promise<CompletionResponse | null> {
    loading.value = true
    status.value = 'applying'
    error.value = null

    addProgressEvent('init', 'Completing onboarding setup...', 0)

    try {
      addProgressEvent('applying', 'Applying final configuration...', 30)

      const result = await api.completeOnboarding(formData)

      if (result.success) {
        addProgressEvent('complete', 'Onboarding completed successfully', 100)
        status.value = 'applied'
        applicationResult.value = {
          success: result.success,
          status: result.status,
          entities_created: result.entities_created,
          demo_products_created: result.demo_products_created,
          errors: result.errors,
          messages: result.messages,
          applied_at: result.onboarding_completed_at ?? new Date().toISOString(),
        }
      } else {
        addProgressEvent('error', 'Completion encountered issues', 100)
        status.value = 'failed'
        error.value = result.errors?.join('; ') ?? 'Onboarding completion failed'
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete onboarding'
      error.value = message
      status.value = 'failed'
      addProgressEvent('error', message, 100)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Reset the template engine to its initial state.
   */
  function reset(): void {
    status.value = 'idle'
    selectedIndustry.value = null
    preview.value = null
    applicationResult.value = null
    loading.value = false
    error.value = null
    progressEvents.value = []
  }

  /**
   * Clear the current error message.
   */
  function clearError(): void {
    error.value = null
  }

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  /**
   * Add a progress event to the timeline.
   */
  function addProgressEvent(phase: string, message: string, percent: number): void {
    progressEvents.value = [
      ...progressEvents.value,
      {
        phase,
        message,
        percent,
        timestamp: new Date().toISOString(),
      },
    ]
  }

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // Reactive state
    status: readonly(status),
    selectedIndustry: readonly(selectedIndustry),
    preview: readonly(preview),
    applicationResult: readonly(applicationResult),
    loading: readonly(loading),
    error: readonly(error),
    progressEvents: readonly(progressEvents),

    // Computed
    hasPreview,
    isApplied,
    isBusy,
    attributeGroupCount,
    familyCount,
    attributeCount,
    demoProductCount,
    estimatedSetupMinutes,
    families,
    defaultChannels,
    complianceModules,
    qualityConfig,

    // Actions
    setIndustry,
    loadPreview,
    applyTemplate,
    completeOnboarding,
    reset,
    clearError,
  }
}
