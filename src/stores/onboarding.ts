/**
 * Pinia store for onboarding wizard state management.
 *
 * Manages the SaaS onboarding flow including:
 * - 12-step wizard navigation and persistence across sessions
 * - Tenant Config integration (per-site singleton)
 * - Per-step form data collection with partial save support
 * - Template preview state for the live preview panel
 * - Skip logic for optional steps (9-11)
 * - Industry archetype selection and template application
 * - Progress tracking and completion state
 *
 * Communicates with the backend via:
 * - frappe_pim.pim.api.onboarding (primary API — both legacy and new endpoints)
 * - PIM Onboarding State DocType controller APIs
 * - Tenant Config SingleType DocType
 *
 * The store maintains two layers:
 * 1. Legacy layer — backward-compatible with the original 10-step wizard
 * 2. New 12-step layer — Tenant Config + OnboardingService dual-write
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useFrappeAPI, PIM_API } from '@/composables/useFrappeAPI'
import {
  STEP_DATA_FIELDS,
  WIZARD_STEP_IDS,
  WIZARD_STEP_CONFIGS,
  SKIPPABLE_STEP_IDS,
  TOTAL_WIZARD_STEPS,
  isSkippableStep,
  getStepId,
  getStepConfig,
  type OnboardingStepName,
  type OnboardingStateSummary,
  type StepFormData,
  type ArchetypeInfo,
  type ArchetypePreviewResponse,
  type TemplateApplicationResult,
  type AvailableArchetypesResponse,
  type OnboardingWizardStep,
  type WizardStepId,
  type OnboardingStatus,
  type OnboardingStatusResponse,
  type StepSaveResponse,
  type StepSkipResponse,
  type CompletionResponse,
  type TemplatePreviewResponse,
  type WizardStepState,
  type StepStatus,
  type PreviewData,
  type StepFormDataMap,
  type IndustrySector,
  type PostOnboardingSection,
  type PostOnboardingUpdateResponse,
} from '@/types'

// ============================================================================
// New API Method Paths (Tenant Config + OnboardingService)
// ============================================================================

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
// Network Retry Utilities
// ============================================================================

/** Maximum automatic retry attempts for retriable network errors */
const MAX_RETRY_ATTEMPTS = 3

/** Base delay between retries in ms (exponential backoff: 1s, 2s, 4s) */
const RETRY_BASE_DELAY_MS = 1000

/**
 * Check if an error is retriable (network failure or 5xx server error).
 * Does NOT retry on 4xx client errors (validation, auth, permissions).
 */
function isRetriableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (
      msg.includes('network error') ||
      msg.includes('timeout') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('err_network')
    ) {
      return true
    }
  }
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const resp = (err as { response?: { status?: number } }).response
    if (resp?.status && resp.status >= 500) return true
  }
  return false
}

/** Promise-based sleep for retry backoff delays */
function retrySleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================================================
// Legacy Constants (backward compatibility)
// ============================================================================

/** Steps that are visible in the legacy UI wizard (excluding internal states) */
const LEGACY_WIZARD_STEPS: OnboardingStepName[] = [
  'company_info',
  'industry_selection',
  'product_structure',
  'channel_setup',
  'workflow_preferences',
  'compliance_setup',
  'template_applied',
  'customization_review',
  'first_data',
  'guided_tour',
]

/** Human-readable labels for each legacy wizard step */
const STEP_LABELS: Partial<Record<OnboardingStepName, { title: string; description: string }>> = {
  company_info: {
    title: 'Company Information',
    description: 'Tell us about your company',
  },
  industry_selection: {
    title: 'Industry Profile',
    description: 'Select your industry to get a tailored setup',
  },
  product_structure: {
    title: 'Product Structure',
    description: 'Configure how your products are organized',
  },
  channel_setup: {
    title: 'Sales Channels',
    description: 'Set up your distribution channels',
  },
  workflow_preferences: {
    title: 'Workflow Preferences',
    description: 'Configure approval and sync workflows',
  },
  compliance_setup: {
    title: 'Compliance',
    description: 'Set up regulatory compliance requirements',
  },
  template_applied: {
    title: 'Apply Template',
    description: 'Review and apply your industry template',
  },
  customization_review: {
    title: 'Customization',
    description: 'Review and customize your configuration',
  },
  first_data: {
    title: 'First Product',
    description: 'Create your first product to test the setup',
  },
  guided_tour: {
    title: 'Guided Tour',
    description: 'Quick tour of key features',
  },
}

// ============================================================================
// Store Definition
// ============================================================================

export const useOnboardingStore = defineStore('onboarding', () => {
  // =========================================================================
  // State — Legacy (PIM Onboarding State)
  // =========================================================================

  /** Backend onboarding state summary (legacy) */
  const state = ref<OnboardingStateSummary | null>(null)

  /** Available industry archetypes (legacy) */
  const archetypes = ref<ArchetypeInfo[]>([])

  /** Currently selected archetype identifier (legacy) */
  const selectedArchetype = ref<string | null>(null)

  /** Preview data for the selected archetype (legacy) */
  const archetypePreview = ref<ArchetypePreviewResponse | null>(null)

  /** Template application result (legacy) */
  const templateResult = ref<TemplateApplicationResult | null>(null)

  /** Form data collected per legacy step (local draft before save) */
  const stepFormData = ref<Partial<Record<OnboardingStepName, StepFormData>>>({})

  // =========================================================================
  // State — New 12-Step Wizard (Tenant Config)
  // =========================================================================

  /** Whether the store has been initialized (first load) */
  const initialized = ref(false)

  /** Loading state for API operations */
  const loading = ref(false)

  /** Whether template application is in progress */
  const isApplying = ref(false)

  /** Error from the last API operation */
  const error = ref<string | null>(null)

  /** Onboarding status from Tenant Config (new API) */
  const onboardingStatus = ref<OnboardingStatus>('not_started')

  /** Current wizard step number (1-12, 0 = not started) */
  const currentWizardStep = ref(0)

  /** Backend status response (full payload from get_onboarding_status) */
  const statusResponse = ref<OnboardingStatusResponse | null>(null)

  /** Selected industry sector from step 2 */
  const selectedIndustry = ref<IndustrySector | null>(null)

  /** Whether a template has been applied via the new API */
  const isTemplateApplied = ref(false)

  /** Whether remaining optional steps can be skipped (after step 8) */
  const canSkipRemaining = ref(false)

  /** IDs of completed wizard steps */
  const completedSteps = ref<WizardStepId[]>([])

  /** IDs of skipped wizard steps */
  const skippedSteps = ref<WizardStepId[]>([])

  /** Per-step form data for the 12-step wizard (local draft) */
  const wizardFormData = ref<Partial<StepFormDataMap>>({})

  /** Per-step preview data for the live preview panel */
  const previewData = ref<Partial<Record<WizardStepId, PreviewData>>>({})

  /** Per-step state tracking (status, validation, timestamps) */
  const stepStates = ref<Partial<Record<WizardStepId, WizardStepState>>>({})

  /** Template preview response for the live preview panel */
  const templatePreview = ref<TemplatePreviewResponse | null>(null)

  /** Completion response after finishing the wizard */
  const completionResult = ref<CompletionResponse | null>(null)

  /** Whether a network retry is in progress */
  const retrying = ref(false)

  /** Last failed action descriptor for manual retry */
  const lastFailedAction = ref<{
    type: 'save_step' | 'skip_step' | 'apply_template' | 'complete_onboarding'
    args: unknown[]
  } | null>(null)

  // =========================================================================
  // Computed — Legacy (backward compatible)
  // =========================================================================

  /** Current step name from backend state (legacy) */
  const currentStep = computed<OnboardingStepName | 'not_started'>(() => {
    return state.value?.current_step ?? 'not_started'
  })

  /** Whether onboarding is completed (legacy) */
  const isCompleted = computed(() => {
    // Check new API first, fall back to legacy
    if (onboardingStatus.value === 'completed') return true
    return state.value?.is_completed ?? false
  })

  /** Whether onboarding was skipped (legacy) */
  const isSkipped = computed(() => {
    if (onboardingStatus.value === 'skipped') return true
    return state.value?.is_skipped ?? false
  })

  /** Whether onboarding needs to be shown (not completed and not skipped) */
  const needsOnboarding = computed(() => {
    if (!initialized.value) return false
    return !isCompleted.value && !isSkipped.value
  })

  /** Progress percentage (0-100) */
  const progressPercent = computed(() => {
    // Prefer new API response
    if (statusResponse.value) {
      return statusResponse.value.progress_percent
    }
    return state.value?.progress_percent ?? 0
  })

  /** Whether a template has been applied (either API) */
  const templateApplied = computed(() => {
    return isTemplateApplied.value || (state.value?.template_applied ?? false)
  })

  /** Current step index within LEGACY_WIZARD_STEPS (0-based) */
  const currentStepIndex = computed(() => {
    const step = currentStep.value
    if (step === 'not_started' || step === 'pending' || step === 'completed') return -1
    return LEGACY_WIZARD_STEPS.indexOf(step)
  })

  /** Whether the user is on the first wizard step */
  const isFirstStep = computed(() => currentStepIndex.value <= 0)

  /** Whether the user is on the last wizard step */
  const isLastStep = computed(() => currentStepIndex.value >= LEGACY_WIZARD_STEPS.length - 1)

  /** Total number of wizard steps (legacy) */
  const totalSteps = computed(() => LEGACY_WIZARD_STEPS.length)

  /** UI-ready wizard steps with completion status (legacy) */
  const wizardSteps = computed<OnboardingWizardStep[]>(() => {
    const stepDetails = state.value?.steps ?? []
    const activeIndex = currentStepIndex.value

    return LEGACY_WIZARD_STEPS.map((stepName, index) => {
      const detail = stepDetails.find((s) => s.name === stepName)
      const meta = STEP_LABELS[stepName]

      return {
        id: stepName,
        title: meta?.title ?? stepName,
        description: meta?.description ?? '',
        component: stepNameToComponent(stepName),
        isCompleted: detail?.is_completed ?? false,
        isActive: index === activeIndex,
        isFutureStep: index > activeIndex,
        hasDataField: !!STEP_DATA_FIELDS[stepName],
      }
    })
  })

  /** The currently active wizard step object (legacy) */
  const activeWizardStep = computed<OnboardingWizardStep | null>(() => {
    if (currentStepIndex.value < 0) return null
    return wizardSteps.value[currentStepIndex.value] ?? null
  })

  /** Form data for the current step (from local draft or backend state) (legacy) */
  const currentStepData = computed<StepFormData | null>(() => {
    const step = currentStep.value as OnboardingStepName
    return stepFormData.value[step] ?? state.value?.current_step_data ?? null
  })

  // =========================================================================
  // Computed — New 12-Step Wizard
  // =========================================================================

  /** Current wizard step ID derived from step number */
  const currentStepId = computed<WizardStepId | null>(() => {
    return getStepId(currentWizardStep.value)
  })

  /** Total number of 12-step wizard steps */
  const totalWizardSteps = computed(() => TOTAL_WIZARD_STEPS)

  /** Current wizard step config (title, description, component, etc.) */
  const currentStepConfig = computed(() => {
    const stepId = currentStepId.value
    return stepId ? getStepConfig(stepId) ?? null : null
  })

  /** Whether the current step is skippable */
  const isCurrentStepSkippable = computed(() => {
    const stepId = currentStepId.value
    if (!stepId) return false
    return isSkippableStep(stepId) && canSkipRemaining.value
  })

  /** Whether the current step is the first wizard step */
  const isFirstWizardStep = computed(() => currentWizardStep.value <= 1)

  /** Whether the current step is the last wizard step */
  const isLastWizardStep = computed(() => currentWizardStep.value >= TOTAL_WIZARD_STEPS)

  /** Form data for the current 12-step wizard step */
  const currentWizardStepData = computed<StepFormData | null>(() => {
    const stepId = currentStepId.value
    if (!stepId) return null
    return (wizardFormData.value as Record<string, StepFormData | undefined>)[stepId] ?? null
  })

  /** Preview data for the current 12-step wizard step */
  const currentPreviewData = computed<PreviewData | null>(() => {
    const stepId = currentStepId.value
    if (!stepId) return null
    return previewData.value[stepId] ?? null
  })

  /** All 12 wizard step states with completion/status information */
  const allWizardStepStates = computed<WizardStepState[]>(() => {
    return WIZARD_STEP_IDS.map((stepId, index) => {
      const stepNumber = index + 1
      const config = WIZARD_STEP_CONFIGS[index]
      const existing = stepStates.value[stepId]

      if (existing) return existing

      // Derive status from backend response
      let status: StepStatus = 'pending'
      if (completedSteps.value.includes(stepId)) {
        status = 'completed'
      } else if (skippedSteps.value.includes(stepId)) {
        status = 'skipped'
      } else if (stepNumber === currentWizardStep.value) {
        status = 'active'
      }

      return {
        id: stepId,
        number: stepNumber,
        status,
        title: config.title,
        description: config.description,
        formData: (wizardFormData.value as Record<string, StepFormData | undefined>)[stepId] ?? null,
        previewData: previewData.value[stepId] ?? null,
        validationResult: null,
        savedAt: null,
        skippedAt: null,
      }
    })
  })

  /** Number of completed steps */
  const completedStepCount = computed(() => completedSteps.value.length)

  /** Whether all required steps (1-8, 12) are completed */
  const allRequiredStepsCompleted = computed(() => {
    const requiredStepIds = WIZARD_STEP_IDS.filter(
      (id) => !isSkippableStep(id),
    )
    return requiredStepIds.every((id) => completedSteps.value.includes(id))
  })

  /** Helper: get a specific step's saved data from the status response payload */
  function getStatusStepData(stepId: string): Record<string, unknown> | null {
    const entries = (statusResponse.value as unknown as { step_data?: Array<{ step_id: string; data: Record<string, unknown> }> })?.step_data
    return entries?.find((s) => s.step_id === stepId)?.data ?? null
  }

  /** Primary role from company_info step (e.g. "Product Manager") */
  const primaryRole = computed<string | null>(() => {
    return (getStatusStepData('company_info')?.primary_role as string) ?? null
  })

  /** Company size range from company_info step (e.g. "201-500") */
  const companySize = computed<string | null>(() => {
    return (getStatusStepData('company_info')?.company_size as string) ?? null
  })

  /** Estimated SKU count range from product_structure step (e.g. "2001-10000") */
  const estimatedSkuCount = computed<string | null>(() => {
    return (getStatusStepData('product_structure')?.estimated_sku_count as string) ?? null
  })

  /** Data import source from product_structure step (e.g. "erp_sync") */
  const dataImportSource = computed<string | null>(() => {
    return (getStatusStepData('product_structure')?.data_import_source as string) ?? null
  })

  // =========================================================================
  // Actions — New 12-Step Wizard (Tenant Config)
  // =========================================================================

  const api = useFrappeAPI()

  /**
   * Fetch the current onboarding status from the backend.
   * Uses the new get_onboarding_status endpoint that reads from Tenant Config.
   * This is the primary way to sync frontend state with the backend.
   */
  async function fetchStatus(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await api.callGetMethod<OnboardingStatusResponse>(
        ONBOARDING_V2_API.getStatus,
      )
      applyStatusResponse(result)
      initialized.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch onboarding status'
    } finally {
      loading.value = false
    }
  }

  /**
   * Apply a status response to the store state.
   * Shared by fetchStatus() and other actions that return status data.
   */
  function applyStatusResponse(result: OnboardingStatusResponse): void {
    statusResponse.value = result
    onboardingStatus.value = result.status
    currentWizardStep.value = result.current_step
    if (result.status === 'error' && result.message) {
      error.value = result.message
    }
    isTemplateApplied.value = result.template_applied
    canSkipRemaining.value = result.can_skip_remaining

    // Extract selected industry from status
    if (result.selected_industry) {
      selectedIndustry.value = result.selected_industry as IndustrySector
    }

    // Build completed/skipped step lists from per-step metadata
    const newCompleted: WizardStepId[] = []
    const newSkipped: WizardStepId[] = []

    for (const stepMeta of result.steps) {
      if (stepMeta.is_completed) {
        newCompleted.push(stepMeta.step_id)
      }
      if (stepMeta.was_skipped) {
        newSkipped.push(stepMeta.step_id)
      }

      // Update step states from backend metadata
      const config = getStepConfig(stepMeta.step_id)
      let status: StepStatus = 'pending'
      if (stepMeta.is_completed) {
        status = 'completed'
      } else if (stepMeta.was_skipped) {
        status = 'skipped'
      } else if (stepMeta.is_current) {
        status = 'active'
      }

      stepStates.value[stepMeta.step_id] = {
        id: stepMeta.step_id,
        number: stepMeta.step_number,
        status,
        title: config?.title ?? stepMeta.step_id,
        description: config?.description ?? '',
        formData: (wizardFormData.value as Record<string, StepFormData | undefined>)[stepMeta.step_id] ?? null,
        previewData: previewData.value[stepMeta.step_id] ?? null,
        validationResult: null,
        savedAt: null,
        skippedAt: null,
      }
    }

    completedSteps.value = newCompleted
    skippedSteps.value = newSkipped
  }

  /**
   * Execute an async API call with automatic retry on retriable errors.
   * Uses exponential backoff: 1s, 2s, 4s between attempts.
   * Non-retriable errors (4xx, validation) are thrown immediately.
   */
  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown

    for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        if (attempt > 0) {
          retrying.value = true
          await retrySleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1))
        }
        const result = await fn()
        retrying.value = false
        return result
      } catch (err) {
        lastError = err
        if (!isRetriableError(err) || attempt === MAX_RETRY_ATTEMPTS) {
          retrying.value = false
          throw err
        }
      }
    }

    retrying.value = false
    throw lastError
  }

  /**
   * Save form data for a specific wizard step via the new API.
   * Performs dual-write to PIM Onboarding State and Tenant Config.
   *
   * @param stepId - Step identifier (e.g., "company_info")
   * @param formData - Form data to save
   * @param advance - Whether to advance to the next step after saving
   */
  async function saveWizardStep(
    stepId: WizardStepId,
    formData: StepFormData,
    advance = false,
  ): Promise<StepSaveResponse | null> {
    const stepNumber = WIZARD_STEP_IDS.indexOf(stepId) + 1
    if (stepNumber < 1) return null

    // Update local draft immediately for responsive UI
    ;(wizardFormData.value as Record<string, StepFormData>)[stepId] = formData

    loading.value = true
    error.value = null

    // Record action for retry on network failure
    lastFailedAction.value = {
      type: 'save_step',
      args: [stepId, formData, advance],
    }

    try {
      const result = await withRetry(() =>
        api.callMethod<StepSaveResponse>(
          ONBOARDING_V2_API.saveStep,
          {
            step_id: stepId,
            step_number: stepNumber,
            form_data: JSON.stringify(formData),
            advance,
          },
        ),
      )

      lastFailedAction.value = null

      if (result.success) {
        // Mark step as completed if advancing
        if (advance && !completedSteps.value.includes(stepId)) {
          completedSteps.value.push(stepId)
        }

        // Advance to next step
        if (advance && result.next_step) {
          currentWizardStep.value = result.next_step
        }

        // Update step state
        if (stepStates.value[stepId]) {
          stepStates.value[stepId]!.status = advance ? 'completed' : 'active'
          stepStates.value[stepId]!.formData = formData
          stepStates.value[stepId]!.savedAt = new Date().toISOString()
        }
      }

      if (result.validation_errors.length > 0) {
        error.value = result.validation_errors.join('; ')
      }

      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save step data'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Skip a skippable wizard step (9-11 only, after step 8).
   *
   * @param stepId - Step identifier to skip
   */
  async function skipWizardStep(stepId: WizardStepId): Promise<StepSkipResponse | null> {
    if (!isSkippableStep(stepId)) {
      error.value = `Step "${stepId}" is not skippable`
      return null
    }

    if (!canSkipRemaining.value) {
      error.value = 'Cannot skip steps until step 8 is completed'
      return null
    }

    const stepNumber = WIZARD_STEP_IDS.indexOf(stepId) + 1
    if (stepNumber < 1) return null

    loading.value = true
    error.value = null

    // Record action for retry on network failure
    lastFailedAction.value = {
      type: 'skip_step',
      args: [stepId],
    }

    try {
      const result = await withRetry(() =>
        api.callMethod<StepSkipResponse>(
          ONBOARDING_V2_API.skipStep,
          {
            step_id: stepId,
            step_number: stepNumber,
          },
        ),
      )

      lastFailedAction.value = null

      if (result.skipped) {
        // Add to skipped list
        if (!skippedSteps.value.includes(stepId)) {
          skippedSteps.value.push(stepId)
        }

        // Update step state
        if (stepStates.value[stepId]) {
          stepStates.value[stepId]!.status = 'skipped'
          stepStates.value[stepId]!.skippedAt = new Date().toISOString()
        }

        // Advance to next step
        if (result.next_step) {
          currentWizardStep.value = result.next_step
        }
      }

      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to skip step'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Navigate to the next wizard step, saving current form data.
   *
   * @param formData - Optional form data for the current step
   */
  async function nextWizardStep(formData?: StepFormData): Promise<void> {
    const stepId = currentStepId.value
    if (!stepId) return

    if (formData) {
      await saveWizardStep(stepId, formData, true)
    } else {
      // Just advance without new data
      await saveWizardStep(
        stepId,
        (wizardFormData.value as Record<string, StepFormData>)[stepId] ?? {},
        true,
      )
    }
  }

  /**
   * Navigate to the previous wizard step.
   */
  function prevWizardStep(): void {
    if (currentWizardStep.value > 1) {
      currentWizardStep.value -= 1
    }
  }

  /**
   * Navigate to a specific wizard step by number.
   * Only allows navigating to completed or current steps (no jumping ahead).
   *
   * @param stepNumber - Target step number (1-12)
   */
  function goToWizardStep(stepNumber: number): void {
    if (stepNumber < 1 || stepNumber > TOTAL_WIZARD_STEPS) return

    const targetStepId = getStepId(stepNumber)
    if (!targetStepId) return

    // Allow navigating to completed steps, current step, or adjacent step
    const isCompleted = completedSteps.value.includes(targetStepId)
    const isSkippedStep = skippedSteps.value.includes(targetStepId)
    const isCurrent = stepNumber === currentWizardStep.value
    const isAdjacentNext = stepNumber === currentWizardStep.value + 1

    if (isCompleted || isSkippedStep || isCurrent || isAdjacentNext) {
      currentWizardStep.value = stepNumber
    }
  }

  /**
   * Fetch a template preview for the selected or specified industry.
   *
   * @param industry - Optional industry sector code. Uses selectedIndustry if omitted.
   */
  async function fetchTemplatePreview(industry?: IndustrySector): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const params: Record<string, unknown> = {}
      if (industry) {
        params.industry = industry
      }
      const result = await api.callGetMethod<TemplatePreviewResponse>(
        ONBOARDING_V2_API.getTemplatePreview,
        params,
      )
      templatePreview.value = result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch template preview'
    } finally {
      loading.value = false
    }
  }

  /**
   * Complete the onboarding wizard (final step — step 12).
   * Applies the template, creates entities, and marks onboarding as completed.
   *
   * @param formData - Optional form data from the summary/launch step
   */
  async function completeWizard(formData?: StepFormData): Promise<CompletionResponse | null> {
    isApplying.value = true
    loading.value = true
    error.value = null

    // Record action for retry on network failure
    lastFailedAction.value = {
      type: 'complete_onboarding',
      args: [formData],
    }

    try {
      const params: Record<string, unknown> = {}
      if (formData) {
        params.form_data = JSON.stringify(formData)
      }

      const result = await withRetry(() =>
        api.callMethod<CompletionResponse>(
          ONBOARDING_V2_API.complete,
          params,
        ),
      )

      lastFailedAction.value = null
      completionResult.value = result

      if (result.success) {
        onboardingStatus.value = 'completed'

        // Mark summary_launch as completed
        if (!completedSteps.value.includes('summary_launch')) {
          completedSteps.value.push('summary_launch')
        }
      }

      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to complete onboarding'
      return null
    } finally {
      isApplying.value = false
      loading.value = false
    }
  }

  /**
   * Apply the industry template based on Tenant Config selection.
   *
   * @param createDemoProducts - Whether to create demo products
   */
  async function applyWizardTemplate(createDemoProducts = false): Promise<CompletionResponse | null> {
    isApplying.value = true
    loading.value = true
    error.value = null

    // Record action for retry on network failure
    lastFailedAction.value = {
      type: 'apply_template',
      args: [createDemoProducts],
    }

    try {
      const result = await withRetry(() =>
        api.callMethod<CompletionResponse>(
          ONBOARDING_V2_API.applyTemplate,
          { create_demo_products: createDemoProducts },
        ),
      )

      lastFailedAction.value = null

      if (result.success) {
        isTemplateApplied.value = true
      }

      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to apply template'
      return null
    } finally {
      isApplying.value = false
      loading.value = false
    }
  }

  /**
   * Update a specific section of Tenant Config after onboarding completion.
   * Used by the post-onboarding settings editor.
   *
   * @param section - Configuration section to update
   * @param formData - Field values to update
   */
  async function updatePostOnboarding(
    section: PostOnboardingSection,
    formData: Record<string, unknown>,
  ): Promise<PostOnboardingUpdateResponse | null> {
    loading.value = true
    error.value = null

    try {
      const result = await api.callMethod<PostOnboardingUpdateResponse>(
        ONBOARDING_V2_API.updatePostOnboarding,
        {
          section,
          form_data: JSON.stringify(formData),
        },
      )

      if (result.validation_errors && result.validation_errors.length > 0) {
        error.value = result.validation_errors.join('; ')
      }

      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update configuration'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Update local form data for a specific 12-step wizard step.
   * Does not persist to backend — useful for tracking field changes in real-time.
   */
  function setWizardStepData<S extends WizardStepId>(
    stepId: S,
    data: StepFormDataMap[S],
  ): void {
    ;(wizardFormData.value as Record<string, StepFormData>)[stepId] = data as StepFormData
  }

  /**
   * Get the local form data for a specific 12-step wizard step.
   */
  function getWizardStepData<S extends WizardStepId>(stepId: S): StepFormDataMap[S] | null {
    return ((wizardFormData.value as Record<string, StepFormData | undefined>)[stepId] ?? null) as StepFormDataMap[S] | null
  }

  /**
   * Update the live preview data for a specific step.
   * Called by the preview transformer composable.
   */
  function setPreviewData(stepId: WizardStepId, data: PreviewData): void {
    previewData.value[stepId] = data
  }

  /**
   * Get preview data for a specific step.
   */
  function getPreviewData(stepId: WizardStepId): PreviewData | null {
    return previewData.value[stepId] ?? null
  }

  /**
   * Retry the last failed save_step/skip_step/apply_template/complete_onboarding
   * action with the same parameters. Intended for manual retry from the UI
   * after a network error.
   *
   * @returns The action result, or null if no action to retry
   */
  async function retryLastAction(): Promise<unknown> {
    const action = lastFailedAction.value
    if (!action) return null

    switch (action.type) {
      case 'save_step': {
        const [stepId, formData, advance] = action.args as [WizardStepId, StepFormData, boolean]
        return saveWizardStep(stepId, formData, advance)
      }
      case 'skip_step': {
        const [stepId] = action.args as [WizardStepId]
        return skipWizardStep(stepId)
      }
      case 'apply_template': {
        const [createDemoProducts] = action.args as [boolean]
        return applyWizardTemplate(createDemoProducts)
      }
      case 'complete_onboarding': {
        const [formData] = action.args as [StepFormData | undefined]
        return completeWizard(formData)
      }
      default:
        return null
    }
  }

  /**
   * Check if the last error is a retriable network error.
   * Returns true for network failures and server errors (5xx),
   * false for validation or client errors (4xx).
   */
  function isLastErrorRetriable(): boolean {
    if (!error.value) return false
    const msg = error.value.toLowerCase()
    return (
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('server error') ||
      msg.includes('500') ||
      msg.includes('502') ||
      msg.includes('503')
    )
  }

  // =========================================================================
  // Actions — Legacy (PIM Onboarding State)
  // =========================================================================

  /**
   * Initialize the onboarding store by loading state from the backend.
   * Uses the new API (fetchStatus) as primary, with legacy fallback.
   * Should be called once on app startup.
   */
  async function initialize(): Promise<void> {
    if (initialized.value) return
    loading.value = true
    error.value = null

    try {
      // Try new API first
      const result = await api.callGetMethod<OnboardingStatusResponse>(
        ONBOARDING_V2_API.getStatus,
      )
      applyStatusResponse(result)
      initialized.value = true
    } catch {
      // Fallback to legacy API
      try {
        const result = await api.callMethod<OnboardingStateSummary>(
          PIM_API.onboarding.getState,
        )
        state.value = result
        selectedArchetype.value = result.selected_archetype ?? null

        // Derive new-style status from legacy state
        if (result.is_completed) {
          onboardingStatus.value = 'completed'
        } else if (result.is_skipped) {
          onboardingStatus.value = 'skipped'
        } else if (result.current_step !== 'not_started') {
          onboardingStatus.value = 'in_progress'
        }

        // Populate step form data from backend if resuming
        if (result.current_step_data) {
          const step = result.current_step as OnboardingStepName
          stepFormData.value[step] = result.current_step_data as StepFormData
        }

        initialized.value = true
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load onboarding state'
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Start or resume the onboarding wizard (legacy).
   * Creates a new onboarding state if none exists.
   */
  async function startOnboarding(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await api.callMethod<OnboardingStateSummary>(
        PIM_API.onboarding.start,
      )
      state.value = result
      selectedArchetype.value = result.selected_archetype ?? null
      onboardingStatus.value = 'in_progress'
      initialized.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start onboarding'
    } finally {
      loading.value = false
    }
  }

  /**
   * Save form data for the current legacy step (partial save / draft).
   * Does not advance to the next step.
   */
  async function saveCurrentStepData(formData: StepFormData): Promise<void> {
    const step = currentStep.value
    if (step === 'not_started' || step === 'pending' || step === 'completed') return

    // Update local draft immediately for responsive UI
    stepFormData.value[step] = formData

    loading.value = true
    error.value = null

    try {
      const result = await api.callMethod<OnboardingStateSummary>(
        PIM_API.onboarding.saveStepData,
        {
          step,
          form_data: JSON.stringify(formData),
          advance: false,
        },
      )
      state.value = result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save step data'
    } finally {
      loading.value = false
    }
  }

  /**
   * Advance to the next step, optionally saving form data first (legacy).
   */
  async function nextStep(formData?: StepFormData): Promise<void> {
    const step = currentStep.value
    if (step === 'not_started' || step === 'completed') return

    // Save local draft if provided
    if (formData && step !== 'pending') {
      stepFormData.value[step] = formData
    }

    loading.value = true
    error.value = null

    try {
      const params: Record<string, unknown> = {}
      if (formData) {
        params.form_data = JSON.stringify(formData)
      }

      const result = await api.callMethod<OnboardingStateSummary>(
        PIM_API.onboarding.complete,
        params,
      )
      state.value = result
      selectedArchetype.value = result.selected_archetype ?? null

      // Load step data for the new current step if resuming
      if (result.current_step_data) {
        const newStep = result.current_step as OnboardingStepName
        stepFormData.value[newStep] = result.current_step_data as StepFormData
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to advance step'
    } finally {
      loading.value = false
    }
  }

  /**
   * Go back to the previous step (legacy).
   */
  async function prevStep(): Promise<void> {
    const idx = currentStepIndex.value
    if (idx <= 0) return

    const prevStepName = LEGACY_WIZARD_STEPS[idx - 1]

    loading.value = true
    error.value = null

    try {
      const result = await api.callMethod<OnboardingStateSummary>(
        PIM_API.onboarding.saveStepData,
        {
          step: prevStepName,
          form_data: JSON.stringify(stepFormData.value[prevStepName] ?? {}),
          advance: false,
        },
      )
      state.value = result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to navigate back'
    } finally {
      loading.value = false
    }
  }

  /**
   * Skip the onboarding wizard entirely (legacy).
   */
  async function skipOnboarding(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await api.callMethod<OnboardingStateSummary>(
        PIM_API.onboarding.skip,
      )
      state.value = result
      onboardingStatus.value = 'skipped'
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to skip onboarding'
    } finally {
      loading.value = false
    }
  }

  /**
   * Reset the onboarding to initial state (legacy).
   */
  async function resetOnboarding(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await api.callMethod<OnboardingStateSummary>(
        PIM_API.onboarding.reset,
      )
      state.value = result
      selectedArchetype.value = null
      archetypePreview.value = null
      templateResult.value = null
      stepFormData.value = {}

      // Reset new 12-step state
      onboardingStatus.value = 'not_started'
      currentWizardStep.value = 0
      statusResponse.value = null
      selectedIndustry.value = null
      isTemplateApplied.value = false
      canSkipRemaining.value = false
      completedSteps.value = []
      skippedSteps.value = []
      wizardFormData.value = {}
      previewData.value = {}
      stepStates.value = {}
      templatePreview.value = null
      completionResult.value = null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to reset onboarding'
    } finally {
      loading.value = false
    }
  }

  /**
   * Load available industry archetypes from the backend (legacy).
   */
  async function fetchArchetypes(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await api.callMethod<AvailableArchetypesResponse>(
        PIM_API.onboarding.getArchetypes,
      )
      archetypes.value = result.archetypes
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load archetypes'
    } finally {
      loading.value = false
    }
  }

  /**
   * Preview what an archetype template will create (legacy).
   */
  async function previewArchetype(archetype: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await api.callMethod<ArchetypePreviewResponse>(
        PIM_API.onboarding.preview,
        { archetype },
      )
      archetypePreview.value = result
      selectedArchetype.value = archetype
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to preview archetype'
    } finally {
      loading.value = false
    }
  }

  /**
   * Apply the selected archetype template (legacy).
   */
  async function applyArchetypeTemplate(
    archetype: string,
    dryRun = false,
  ): Promise<TemplateApplicationResult | null> {
    loading.value = true
    error.value = null

    try {
      const result = await api.callMethod<TemplateApplicationResult>(
        PIM_API.onboarding.applyTemplate,
        { archetype, dry_run: dryRun },
      )
      templateResult.value = result

      // Refresh onboarding state after template application
      if (!dryRun && result.success) {
        const updatedState = await api.callMethod<OnboardingStateSummary>(
          PIM_API.onboarding.getState,
        )
        state.value = updatedState
      }

      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to apply template'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Update local form data for a specific legacy step without persisting.
   */
  function setLocalStepData(step: OnboardingStepName, data: StepFormData): void {
    stepFormData.value[step] = data
  }

  /**
   * Get the local form data for a specific legacy step.
   */
  function getLocalStepData(step: OnboardingStepName): StepFormData | null {
    return stepFormData.value[step] ?? null
  }

  /**
   * Clear the current error.
   */
  function clearError(): void {
    error.value = null
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  /** Convert a step name to its Vue component name (legacy) */
  function stepNameToComponent(step: OnboardingStepName): string {
    return step
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('') + 'Step'
  }

  return {
    // State — Legacy
    state,
    archetypes,
    selectedArchetype,
    archetypePreview,
    templateResult,
    stepFormData,

    // State — New 12-step
    initialized,
    loading,
    isApplying,
    error,
    retrying,
    lastFailedAction,
    onboardingStatus,
    currentWizardStep,
    statusResponse,
    selectedIndustry,
    isTemplateApplied,
    canSkipRemaining,
    completedSteps,
    skippedSteps,
    wizardFormData,
    previewData,
    stepStates,
    templatePreview,
    completionResult,

    // Computed — Legacy
    currentStep,
    isCompleted,
    isSkipped,
    needsOnboarding,
    progressPercent,
    templateApplied,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    totalSteps,
    wizardSteps,
    activeWizardStep,
    currentStepData,

    // Computed — New 12-step
    currentStepId,
    totalWizardSteps,
    currentStepConfig,
    isCurrentStepSkippable,
    isFirstWizardStep,
    isLastWizardStep,
    currentWizardStepData,
    currentPreviewData,
    allWizardStepStates,
    completedStepCount,
    allRequiredStepsCompleted,
    primaryRole,
    companySize,
    estimatedSkuCount,
    dataImportSource,

    // Actions — New 12-step
    fetchStatus,
    saveWizardStep,
    skipWizardStep,
    nextWizardStep,
    prevWizardStep,
    goToWizardStep,
    fetchTemplatePreview,
    completeWizard,
    applyWizardTemplate,
    updatePostOnboarding,
    setWizardStepData,
    getWizardStepData,
    setPreviewData,
    getPreviewData,
    retryLastAction,
    isLastErrorRetriable,

    // Actions — Legacy
    initialize,
    startOnboarding,
    saveCurrentStepData,
    nextStep,
    prevStep,
    skipOnboarding,
    resetOnboarding,
    fetchArchetypes,
    previewArchetype,
    applyArchetypeTemplate,
    setLocalStepData,
    getLocalStepData,
    clearError,
  }
})
