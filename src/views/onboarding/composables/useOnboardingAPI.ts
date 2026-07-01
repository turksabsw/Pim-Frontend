/**
 * Onboarding API composable — typed wrappers for all onboarding backend calls.
 *
 * Provides two sets of API methods:
 *
 * 1. **Legacy API** (PIM Onboarding State only):
 *    Uses `frappe_pim.pim.api.onboarding.*` with archetype-based patterns.
 *    Backward compatible with the original 10-step wizard.
 *
 * 2. **New API** (Tenant Config + OnboardingService dual-write):
 *    Uses `frappe_pim.pim.api.onboarding.*` with 12-step wizard model.
 *    Writes to both PIM Onboarding State and Tenant Config.
 *
 * Usage:
 *   const api = useOnboardingAPI()
 *   const status = await api.getStatus()
 *   await api.saveStep('company_info', 1, formData, true)
 */

import { useFrappeAPI, PIM_API } from '@/composables/useFrappeAPI'
import type {
  // Legacy response types
  OnboardingStateSummary,
  AvailableArchetypesResponse,
  ArchetypePreviewResponse,
  TemplateApplicationResult,
  StepFormData,

  // New 12-step response types
  OnboardingStatusResponse,
  StepSaveResponse,
  StepSkipResponse,
  CompletionResponse,
  PostOnboardingUpdateResponse,
  TemplatePreviewResponse,
  WizardStepId,
  PostOnboardingSection,
  IndustrySector,
} from '@/types'

// ============================================================================
// New API Method Paths (not yet in PIM_API constant)
// ============================================================================

/** New onboarding API method paths (Tenant Config + OnboardingService) */
const ONBOARDING_V2_API = {
  getStatus: 'frappe_pim.pim.api.onboarding.get_onboarding_status',
  saveStep: 'frappe_pim.pim.api.onboarding.save_step',
  skipStep: 'frappe_pim.pim.api.onboarding.skip_step',
  getTemplatePreview: 'frappe_pim.pim.api.onboarding.get_template_preview',
  applyTemplate: 'frappe_pim.pim.api.onboarding.apply_template',
  complete: 'frappe_pim.pim.api.onboarding.v2_complete_onboarding',
  updatePostOnboarding: 'frappe_pim.pim.api.onboarding.update_post_onboarding',
} as const

// ============================================================================
// Return Type
// ============================================================================

/** Return type of useOnboardingAPI composable */
export interface UseOnboardingAPIReturn {
  // ── New 12-step API (preferred) ──────────────────────────────────────

  /** Get combined onboarding status from Tenant Config + state */
  getStatus: () => Promise<OnboardingStatusResponse>

  /** Save step form data with optional advance to next step */
  saveStep: (
    stepId: WizardStepId,
    stepNumber: number,
    formData: StepFormData,
    advance?: boolean,
  ) => Promise<StepSaveResponse>

  /** Skip a skippable step (9-11 only, after step 8) */
  skipStep: (stepId: WizardStepId, stepNumber: number) => Promise<StepSkipResponse>

  /** Preview what an industry template will create */
  getTemplatePreview: (industry?: IndustrySector) => Promise<TemplatePreviewResponse>

  /** Apply industry template based on Tenant Config selection */
  applyTemplate: (createDemoProducts?: boolean) => Promise<CompletionResponse>

  /** Complete the onboarding wizard (final step) */
  completeOnboarding: (formData?: StepFormData) => Promise<CompletionResponse>

  /** Update tenant config section after onboarding completion */
  updatePostOnboarding: (
    section: PostOnboardingSection,
    formData: Record<string, unknown>,
  ) => Promise<PostOnboardingUpdateResponse>

  // ── Legacy API (backward compatible) ─────────────────────────────────

  /** Start or resume onboarding (legacy PIM Onboarding State) */
  legacyStart: () => Promise<OnboardingStateSummary>

  /** Get current onboarding state (legacy) */
  legacyGetState: () => Promise<OnboardingStateSummary>

  /** Save step data for the legacy wizard */
  legacySaveStepData: (
    step: string,
    formData: StepFormData,
    advance?: boolean,
  ) => Promise<OnboardingStateSummary>

  /** Advance to next step or complete (legacy) */
  legacyComplete: (formData?: StepFormData) => Promise<OnboardingStateSummary>

  /** Get available industry archetypes (legacy) */
  legacyGetArchetypes: () => Promise<AvailableArchetypesResponse>

  /** Preview an archetype template (legacy) */
  legacyPreviewArchetype: (archetype: string) => Promise<ArchetypePreviewResponse>

  /** Apply an archetype template (legacy) */
  legacyApplyTemplate: (
    archetype: string,
    dryRun?: boolean,
  ) => Promise<TemplateApplicationResult>

  /** Skip the entire onboarding (legacy) */
  legacySkip: () => Promise<OnboardingStateSummary>

  /** Reset onboarding to initial state (legacy) */
  legacyReset: () => Promise<OnboardingStateSummary>

  // ── Shared state ─────────────────────────────────────────────────────

  /** Whether an API call is in progress (from useFrappeAPI) */
  loading: ReturnType<typeof useFrappeAPI>['loading']

  /** The last error that occurred (from useFrappeAPI) */
  error: ReturnType<typeof useFrappeAPI>['error']

  /** Clear the current error */
  clearError: () => void
}

// ============================================================================
// Composable
// ============================================================================

/**
 * Vue 3 composable wrapping all onboarding backend API calls.
 *
 * Delegates to `useFrappeAPI().callMethod` for actual HTTP communication.
 * Each method is typed with the corresponding backend response type.
 *
 * @example
 * ```ts
 * const api = useOnboardingAPI()
 *
 * // New 12-step API
 * const status = await api.getStatus()
 * const result = await api.saveStep('company_info', 1, formData, true)
 *
 * // Legacy API
 * const state = await api.legacyStart()
 * ```
 */
export function useOnboardingAPI(): UseOnboardingAPIReturn {
  const { callMethod, callGetMethod, loading, error, clearError } = useFrappeAPI()

  // ==========================================================================
  // New 12-step API (Tenant Config + OnboardingService)
  // ==========================================================================

  /**
   * Get the combined onboarding status from Tenant Config and state.
   *
   * Returns step-level progress, completion status, template application,
   * and per-step metadata for all 12 wizard steps.
   */
  async function getStatus(): Promise<OnboardingStatusResponse> {
    return callGetMethod<OnboardingStatusResponse>(ONBOARDING_V2_API.getStatus)
  }

  /**
   * Save form data for a specific wizard step with dual-write.
   *
   * Writes to both PIM Onboarding State (per-user) and Tenant Config
   * (per-site). Optionally advances to the next step.
   *
   * @param stepId - Step identifier (e.g., "company_info")
   * @param stepNumber - Step number (1-12)
   * @param formData - Form data collected during the step
   * @param advance - If true, advance to the next step after saving
   */
  async function saveStep(
    stepId: WizardStepId,
    stepNumber: number,
    formData: StepFormData,
    advance = false,
  ): Promise<StepSaveResponse> {
    return callMethod<StepSaveResponse>(ONBOARDING_V2_API.saveStep, {
      step_id: stepId,
      step_number: stepNumber,
      form_data: JSON.stringify(formData),
      advance,
    })
  }

  /**
   * Skip an individual onboarding step.
   *
   * Only steps 9-11 (quality_scoring, integrations, compliance) are
   * skippable, and only after step 8 (workflow_preferences) is completed.
   *
   * @param stepId - Step identifier to skip
   * @param stepNumber - Step number to skip (9, 10, or 11)
   */
  async function skipStep(
    stepId: WizardStepId,
    stepNumber: number,
  ): Promise<StepSkipResponse> {
    return callMethod<StepSkipResponse>(ONBOARDING_V2_API.skipStep, {
      step_id: stepId,
      step_number: stepNumber,
    })
  }

  /**
   * Preview what an industry template will create.
   *
   * Returns attribute counts, product families, channels, compliance
   * modules, and quality scoring configuration for the template.
   *
   * @param industry - Industry sector code. If omitted, uses Tenant Config.
   */
  async function getTemplatePreview(
    industry?: IndustrySector,
  ): Promise<TemplatePreviewResponse> {
    const params: Record<string, unknown> = {}
    if (industry) {
      params.industry = industry
    }
    return callGetMethod<TemplatePreviewResponse>(
      ONBOARDING_V2_API.getTemplatePreview,
      params,
    )
  }

  /**
   * Apply the industry template based on Tenant Config selection.
   *
   * Creates attribute groups, product families, categories, and optionally
   * demo products from the selected industry template.
   *
   * @param createDemoProducts - Whether to create demo products
   */
  async function applyTemplate(
    createDemoProducts = false,
  ): Promise<CompletionResponse> {
    return callMethod<CompletionResponse>(ONBOARDING_V2_API.applyTemplate, {
      create_demo_products: createDemoProducts,
    })
  }

  /**
   * Complete the onboarding wizard.
   *
   * Aggregates all step data, applies templates, updates feature flags,
   * and marks both PIM Onboarding State and Tenant Config as completed.
   *
   * @param formData - Optional final form data from summary/launch step
   */
  async function completeOnboarding(
    formData?: StepFormData,
  ): Promise<CompletionResponse> {
    const params: Record<string, unknown> = {}
    if (formData) {
      params.form_data = JSON.stringify(formData)
    }
    return callMethod<CompletionResponse>(ONBOARDING_V2_API.complete, params)
  }

  /**
   * Update tenant configuration after onboarding completion.
   *
   * Used by the post-onboarding settings editor to modify individual
   * configuration sections.
   *
   * @param section - Configuration section to update
   * @param formData - Field values to update
   */
  async function updatePostOnboarding(
    section: PostOnboardingSection,
    formData: Record<string, unknown>,
  ): Promise<PostOnboardingUpdateResponse> {
    return callMethod<PostOnboardingUpdateResponse>(
      ONBOARDING_V2_API.updatePostOnboarding,
      {
        section,
        form_data: JSON.stringify(formData),
      },
    )
  }

  // ==========================================================================
  // Legacy API (PIM Onboarding State only)
  // ==========================================================================

  /**
   * Start or resume onboarding for the current user (legacy).
   * Creates a new PIM Onboarding State if none exists.
   */
  async function legacyStart(): Promise<OnboardingStateSummary> {
    return callMethod<OnboardingStateSummary>(PIM_API.onboarding.start)
  }

  /**
   * Get the current onboarding state (legacy).
   * Returns a "not_started" state if no onboarding exists.
   */
  async function legacyGetState(): Promise<OnboardingStateSummary> {
    return callGetMethod<OnboardingStateSummary>(PIM_API.onboarding.getState)
  }

  /**
   * Save form data for a step in the legacy wizard.
   *
   * @param step - Step name (e.g., "company_info")
   * @param formData - Form data to save
   * @param advance - Whether to advance to the next step
   */
  async function legacySaveStepData(
    step: string,
    formData: StepFormData,
    advance = false,
  ): Promise<OnboardingStateSummary> {
    return callMethod<OnboardingStateSummary>(PIM_API.onboarding.saveStepData, {
      step,
      form_data: JSON.stringify(formData),
      advance,
    })
  }

  /**
   * Advance to the next step or complete onboarding (legacy).
   *
   * @param formData - Optional form data for the current step
   */
  async function legacyComplete(
    formData?: StepFormData,
  ): Promise<OnboardingStateSummary> {
    const params: Record<string, unknown> = {}
    if (formData) {
      params.form_data = JSON.stringify(formData)
    }
    return callMethod<OnboardingStateSummary>(PIM_API.onboarding.complete, params)
  }

  /**
   * Get available industry archetype templates (legacy).
   */
  async function legacyGetArchetypes(): Promise<AvailableArchetypesResponse> {
    return callGetMethod<AvailableArchetypesResponse>(PIM_API.onboarding.getArchetypes)
  }

  /**
   * Preview an archetype template (legacy).
   *
   * @param archetype - Archetype identifier (e.g., "fashion")
   */
  async function legacyPreviewArchetype(
    archetype: string,
  ): Promise<ArchetypePreviewResponse> {
    return callGetMethod<ArchetypePreviewResponse>(PIM_API.onboarding.preview, {
      archetype,
    })
  }

  /**
   * Apply an archetype template (legacy).
   *
   * @param archetype - Archetype identifier to apply
   * @param dryRun - If true, preview without creating entities
   */
  async function legacyApplyTemplate(
    archetype: string,
    dryRun = false,
  ): Promise<TemplateApplicationResult> {
    return callMethod<TemplateApplicationResult>(PIM_API.onboarding.applyTemplate, {
      archetype,
      dry_run: dryRun,
    })
  }

  /**
   * Skip the entire onboarding wizard (legacy).
   */
  async function legacySkip(): Promise<OnboardingStateSummary> {
    return callMethod<OnboardingStateSummary>(PIM_API.onboarding.skip)
  }

  /**
   * Reset onboarding to initial state (legacy).
   */
  async function legacyReset(): Promise<OnboardingStateSummary> {
    return callMethod<OnboardingStateSummary>(PIM_API.onboarding.reset)
  }

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // New 12-step API
    getStatus,
    saveStep,
    skipStep,
    getTemplatePreview,
    applyTemplate,
    completeOnboarding,
    updatePostOnboarding,

    // Legacy API
    legacyStart,
    legacyGetState,
    legacySaveStepData,
    legacyComplete,
    legacyGetArchetypes,
    legacyPreviewArchetype,
    legacyApplyTemplate,
    legacySkip,
    legacyReset,

    // Shared state
    loading,
    error,
    clearError,
  }
}
