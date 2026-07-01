/**
 * Onboarding wizard state machine composable.
 *
 * Manages the 12-step onboarding wizard lifecycle including:
 * - Step navigation (next, back, jump to completed step)
 * - Skip logic (steps 9-11 skippable after step 8)
 * - Per-step form data and validation tracking
 * - Template preview and application
 * - Completion flow with redirect
 * - Progress tracking and persistence via backend
 *
 * This composable sits between the UI components and the raw API layer
 * (useOnboardingAPI), providing reactive state and high-level actions.
 *
 * Usage:
 *   const wizard = useOnboardingWizard()
 *   await wizard.initialize()
 *   await wizard.goToNext(formData)
 *   await wizard.skipCurrentStep()
 */

import { ref, computed, readonly, type Ref, type DeepReadonly } from 'vue'
import { useOnboardingAPI } from './useOnboardingAPI'
import {
  WIZARD_STEP_IDS,
  WIZARD_STEP_CONFIGS,
  SKIPPABLE_STEP_IDS,
  TOTAL_WIZARD_STEPS,
  isSkippableStep,
  getStepNumber,
  getStepId,
  getStepConfig,
  type WizardStepId,
  type WizardStepConfig,
  type WizardStepState,
  type StepFormData,
  type StepFormDataMap,
  type PreviewData,
  type StepStatus,
  type OnboardingStatus,
  type OnboardingStatusResponse,
  type WizardStepMetadata,
  type TemplatePreviewResponse,
  type CompletionResponse,
  type StepSaveResponse,
  type StepSkipResponse,
  type IndustrySector,
} from '@/types'

// ============================================================================
// Types
// ============================================================================

/** Return type of useOnboardingWizard composable */
export interface UseOnboardingWizardReturn {
  // ── Reactive State ───────────────────────────────────────────────────

  /** Whether the wizard has been initialized (first load complete) */
  initialized: DeepReadonly<Ref<boolean>>

  /** Whether an API operation is in progress */
  loading: DeepReadonly<Ref<boolean>>

  /** Current error message, or null */
  error: DeepReadonly<Ref<string | null>>

  /** Tenant-level onboarding status */
  onboardingStatus: DeepReadonly<Ref<OnboardingStatus>>

  /** Current step number (1-12, 0 = not started) */
  currentStepNumber: DeepReadonly<Ref<number>>

  /** Current step ID, or null if not started */
  currentStepId: DeepReadonly<Ref<WizardStepId | null>>

  /** Per-step state map */
  steps: DeepReadonly<Ref<Record<WizardStepId, WizardStepState>>>

  /** Selected industry sector */
  selectedIndustry: DeepReadonly<Ref<IndustrySector | null>>

  /** Whether an industry template has been applied */
  templateApplied: DeepReadonly<Ref<boolean>>

  /** Template preview data for the selected industry */
  templatePreview: DeepReadonly<Ref<TemplatePreviewResponse | null>>

  /** Whether template application is in progress */
  isApplying: DeepReadonly<Ref<boolean>>

  // ── Computed ─────────────────────────────────────────────────────────

  /** Progress percentage (0-100) */
  progressPercent: Readonly<Ref<number>>

  /** IDs of completed steps */
  completedSteps: Readonly<Ref<WizardStepId[]>>

  /** IDs of skipped steps */
  skippedSteps: Readonly<Ref<WizardStepId[]>>

  /** Configuration for the current step */
  currentStepConfig: Readonly<Ref<WizardStepConfig | null>>

  /** State object for the current step */
  currentStepState: Readonly<Ref<WizardStepState | null>>

  /** Whether the wizard is on the first step */
  isFirstStep: Readonly<Ref<boolean>>

  /** Whether the wizard is on the last step */
  isLastStep: Readonly<Ref<boolean>>

  /** Whether the current step can be skipped */
  canSkipCurrentStep: Readonly<Ref<boolean>>

  /** Whether remaining steps (9-11) can be skipped (after step 8) */
  canSkipRemaining: Readonly<Ref<boolean>>

  /** Whether the wizard is fully completed */
  isCompleted: Readonly<Ref<boolean>>

  /** Whether the wizard is in progress (started but not completed) */
  isInProgress: Readonly<Ref<boolean>>

  /** Ordered list of step configs with current status */
  wizardSteps: Readonly<Ref<Array<WizardStepConfig & { status: StepStatus }>>>

  /** Total number of wizard steps */
  totalSteps: Readonly<Ref<number>>

  // ── Actions ──────────────────────────────────────────────────────────

  /** Initialize the wizard by loading state from backend */
  initialize: () => Promise<void>

  /** Navigate to the next step, saving current step data */
  goToNext: (formData?: StepFormData) => Promise<StepSaveResponse | CompletionResponse | null>

  /** Navigate to the previous step */
  goToPrev: () => Promise<void>

  /** Skip the current step (if skippable) */
  skipCurrentStep: () => Promise<StepSkipResponse | null>

  /** Jump to a specific completed step for editing */
  goToStep: (stepId: WizardStepId) => void

  /** Save form data for the current step without advancing */
  saveDraft: (formData: StepFormData) => Promise<StepSaveResponse | null>

  /** Update local form data for a step (no backend call) */
  setLocalFormData: <S extends WizardStepId>(stepId: S, data: StepFormDataMap[S]) => void

  /** Get local form data for a step */
  getLocalFormData: <S extends WizardStepId>(stepId: S) => StepFormDataMap[S] | null

  /** Update local preview data for a step */
  setPreviewData: (stepId: WizardStepId, data: PreviewData) => void

  /** Load template preview for the selected industry */
  loadTemplatePreview: (industry?: IndustrySector) => Promise<TemplatePreviewResponse | null>

  /** Apply the industry template */
  applyIndustryTemplate: (createDemoProducts?: boolean) => Promise<CompletionResponse | null>

  /** Complete the onboarding wizard (final action) */
  completeWizard: (formData?: StepFormData) => Promise<CompletionResponse | null>

  /** Skip the entire onboarding (legacy flow) */
  skipEntireOnboarding: () => Promise<void>

  /** Clear the current error */
  clearError: () => void

  /** Refresh status from backend */
  refreshStatus: () => Promise<void>
}

// ============================================================================
// Helper: Build Initial Step States
// ============================================================================

/** Create initial WizardStepState for all 12 steps */
function buildInitialStepStates(): Record<WizardStepId, WizardStepState> {
  const states = {} as Record<WizardStepId, WizardStepState>

  for (const config of WIZARD_STEP_CONFIGS) {
    states[config.id] = {
      id: config.id,
      number: config.number,
      status: 'pending',
      title: config.title,
      description: config.description,
      formData: null,
      previewData: null,
      validationResult: null,
      savedAt: null,
      skippedAt: null,
    }
  }

  return states
}

/**
 * Derive step status from backend metadata.
 *
 * @param meta - Backend step metadata
 * @param currentStepNumber - The current active step number
 */
function deriveStepStatus(meta: WizardStepMetadata, currentStepNumber: number): StepStatus {
  if (meta.is_current) return 'active'
  if (meta.was_skipped) return 'skipped'
  if (meta.is_completed) return 'completed'
  if (meta.step_number < currentStepNumber) return 'completed'
  return 'pending'
}

// ============================================================================
// Composable
// ============================================================================

/**
 * Vue 3 composable providing a wizard state machine for the 12-step
 * onboarding flow.
 *
 * Wraps `useOnboardingAPI` and maintains local reactive state that
 * mirrors the backend. All navigation actions call the backend first
 * and then update local state on success.
 *
 * @example
 * ```ts
 * const wizard = useOnboardingWizard()
 *
 * onMounted(async () => {
 *   await wizard.initialize()
 * })
 *
 * // Navigate forward with form data
 * async function handleNext(data: CompanyInfoData) {
 *   await wizard.goToNext(data)
 * }
 *
 * // Skip an optional step
 * async function handleSkip() {
 *   await wizard.skipCurrentStep()
 * }
 * ```
 */
export function useOnboardingWizard(): UseOnboardingWizardReturn {
  const api = useOnboardingAPI()

  // ==========================================================================
  // Reactive State
  // ==========================================================================

  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const onboardingStatus = ref<OnboardingStatus>('not_started')
  const currentStepNumber = ref(0)
  const currentStepId = ref<WizardStepId | null>(null)
  const steps = ref<Record<WizardStepId, WizardStepState>>(buildInitialStepStates())

  const selectedIndustry = ref<IndustrySector | null>(null)
  const templateApplied = ref(false)
  const templatePreview = ref<TemplatePreviewResponse | null>(null)
  const isApplying = ref(false)

  // ==========================================================================
  // Computed
  // ==========================================================================

  const progressPercent = computed(() => {
    const completed = completedSteps.value.length + skippedSteps.value.length
    return TOTAL_WIZARD_STEPS > 0
      ? Math.round((completed / TOTAL_WIZARD_STEPS) * 100)
      : 0
  })

  const completedSteps = computed<WizardStepId[]>(() => {
    return WIZARD_STEP_IDS.filter((id) => steps.value[id]?.status === 'completed')
  })

  const skippedSteps = computed<WizardStepId[]>(() => {
    return WIZARD_STEP_IDS.filter((id) => steps.value[id]?.status === 'skipped')
  })

  const currentStepConfig = computed<WizardStepConfig | null>(() => {
    if (!currentStepId.value) return null
    return getStepConfig(currentStepId.value) ?? null
  })

  const currentStepState = computed<WizardStepState | null>(() => {
    if (!currentStepId.value) return null
    return steps.value[currentStepId.value] ?? null
  })

  const isFirstStep = computed(() => currentStepNumber.value <= 1)

  const isLastStep = computed(() => currentStepNumber.value >= TOTAL_WIZARD_STEPS)

  const canSkipRemaining = computed(() => {
    // Steps 9-11 are skippable after step 8 (workflow_preferences) is completed
    const workflowStep = steps.value.workflow_preferences
    return workflowStep?.status === 'completed'
  })

  const canSkipCurrentStep = computed(() => {
    if (!currentStepId.value) return false
    return isSkippableStep(currentStepId.value) && canSkipRemaining.value
  })

  const isCompleted = computed(() => onboardingStatus.value === 'completed')

  const isInProgress = computed(() => onboardingStatus.value === 'in_progress')

  const totalSteps = computed(() => TOTAL_WIZARD_STEPS)

  const wizardSteps = computed(() => {
    return WIZARD_STEP_CONFIGS.map((config) => ({
      ...config,
      status: steps.value[config.id]?.status ?? ('pending' as StepStatus),
    }))
  })

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  /**
   * Execute an async operation with loading/error tracking.
   */
  async function withTracking<T>(fn: () => Promise<T>): Promise<T> {
    loading.value = true
    error.value = null
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Apply backend status response to local state.
   */
  function applyStatusResponse(response: OnboardingStatusResponse): void {
    onboardingStatus.value = response.status
    currentStepNumber.value = response.current_step
    selectedIndustry.value = (response.selected_industry as IndustrySector) ?? null
    templateApplied.value = response.template_applied

    // Derive current step ID from step number
    currentStepId.value = getStepId(response.current_step)

    // Update per-step states from backend metadata
    if (response.steps && response.steps.length > 0) {
      for (const meta of response.steps) {
        const stepState = steps.value[meta.step_id]
        if (stepState) {
          stepState.status = deriveStepStatus(meta, response.current_step)
        }
      }
    }
  }

  /**
   * Update a single step's status after a save/skip action.
   */
  function updateStepAfterSave(
    stepId: WizardStepId,
    nextStepNumber: number | null | undefined,
    completed: boolean,
  ): void {
    const stepState = steps.value[stepId]
    if (stepState && completed) {
      stepState.status = 'completed'
      stepState.savedAt = new Date().toISOString()
    }

    if (nextStepNumber) {
      currentStepNumber.value = nextStepNumber
      currentStepId.value = getStepId(nextStepNumber)

      // Mark the new step as active
      const nextId = getStepId(nextStepNumber)
      if (nextId && steps.value[nextId]) {
        steps.value[nextId].status = 'active'
      }
    }
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Initialize the wizard by loading the current state from the backend.
   * Should be called once on component mount.
   */
  async function initialize(): Promise<void> {
    if (initialized.value) return

    try {
      const response = await withTracking(() => api.getStatus())
      applyStatusResponse(response)
      initialized.value = true
    } catch {
      // Error already set by withTracking
    }
  }

  /**
   * Navigate to the next step, saving the current step's form data.
   *
   * If on the last step (summary_launch), triggers the completion flow.
   *
   * @param formData - Form data to save for the current step
   * @returns The save or completion response, or null on error
   */
  async function goToNext(
    formData?: StepFormData,
  ): Promise<StepSaveResponse | CompletionResponse | null> {
    const stepId = currentStepId.value
    const stepNum = currentStepNumber.value

    if (!stepId || stepNum <= 0) return null

    // If on the last step, trigger completion
    if (isLastStep.value) {
      return completeWizard(formData)
    }

    try {
      const result = await withTracking(() =>
        api.saveStep(stepId, stepNum, formData ?? {}, true),
      )

      if (result.success) {
        // Update local step state
        const stepState = steps.value[stepId]
        if (stepState && formData) {
          stepState.formData = formData
        }

        updateStepAfterSave(stepId, result.next_step, true)
      } else if (result.validation_errors?.length) {
        error.value = result.validation_errors.join('; ')
      }

      return result
    } catch {
      return null
    }
  }

  /**
   * Navigate to the previous step.
   *
   * Moves the current step pointer backward without saving. The previous
   * step retains its completed status so the user can review/edit.
   */
  async function goToPrev(): Promise<void> {
    if (isFirstStep.value || currentStepNumber.value <= 1) return

    const prevNum = currentStepNumber.value - 1
    const prevId = getStepId(prevNum)

    if (!prevId) return

    // Move the active pointer locally
    if (currentStepId.value && steps.value[currentStepId.value]) {
      // Revert current step from 'active' to 'pending' only if not completed
      const currentState = steps.value[currentStepId.value]
      if (currentState.status === 'active') {
        currentState.status = 'pending'
      }
    }

    currentStepNumber.value = prevNum
    currentStepId.value = prevId

    // Mark previous step as active
    if (steps.value[prevId]) {
      steps.value[prevId].status = 'active'
    }

    // Optionally sync with backend by saving a draft at the new position
    try {
      const existingData = steps.value[prevId]?.formData ?? {}
      await api.saveStep(prevId, prevNum, existingData, false)
    } catch {
      // Navigation still works locally even if backend sync fails
    }
  }

  /**
   * Skip the current step (only if it's skippable).
   *
   * Steps 9-11 (quality_scoring, integrations, compliance) can be
   * skipped after step 8 (workflow_preferences) is completed.
   *
   * @returns The skip response, or null if step is not skippable
   */
  async function skipCurrentStep(): Promise<StepSkipResponse | null> {
    const stepId = currentStepId.value
    const stepNum = currentStepNumber.value

    if (!stepId || !canSkipCurrentStep.value) return null

    try {
      const result = await withTracking(() => api.skipStep(stepId, stepNum))

      if (result.success && result.skipped) {
        // Mark step as skipped locally
        const stepState = steps.value[stepId]
        if (stepState) {
          stepState.status = 'skipped'
          stepState.skippedAt = new Date().toISOString()
        }

        // Advance to next step
        if (result.next_step) {
          currentStepNumber.value = result.next_step
          currentStepId.value = getStepId(result.next_step)

          const nextId = getStepId(result.next_step)
          if (nextId && steps.value[nextId]) {
            steps.value[nextId].status = 'active'
          }
        }
      }

      return result
    } catch {
      return null
    }
  }

  /**
   * Jump to a specific completed step for review/editing.
   *
   * Only allows jumping to steps that have already been completed.
   * Does not modify backend state — just moves the UI pointer.
   *
   * @param stepId - The step to jump to
   */
  function goToStep(stepId: WizardStepId): void {
    const stepState = steps.value[stepId]
    if (!stepState) return

    // Only allow jumping to completed or skipped steps, or the current active step
    if (
      stepState.status !== 'completed' &&
      stepState.status !== 'skipped' &&
      stepState.status !== 'active'
    ) {
      return
    }

    const stepNum = getStepNumber(stepId)
    if (stepNum <= 0) return

    // Update active pointer
    if (currentStepId.value && steps.value[currentStepId.value]) {
      const currentState = steps.value[currentStepId.value]
      // Restore previous status (completed or pending) when leaving
      if (currentState.status === 'active' && currentState.savedAt) {
        currentState.status = 'completed'
      } else if (currentState.status === 'active') {
        currentState.status = 'pending'
      }
    }

    currentStepNumber.value = stepNum
    currentStepId.value = stepId
    steps.value[stepId].status = 'active'
  }

  /**
   * Save form data for the current step as a draft (no advance).
   *
   * @param formData - Form data to save
   * @returns The save response, or null on error
   */
  async function saveDraft(formData: StepFormData): Promise<StepSaveResponse | null> {
    const stepId = currentStepId.value
    const stepNum = currentStepNumber.value

    if (!stepId || stepNum <= 0) return null

    // Update local state immediately for responsive UI
    const stepState = steps.value[stepId]
    if (stepState) {
      stepState.formData = formData
    }

    try {
      const result = await withTracking(() =>
        api.saveStep(stepId, stepNum, formData, false),
      )

      if (result.success && stepState) {
        stepState.savedAt = new Date().toISOString()
      }

      return result
    } catch {
      return null
    }
  }

  /**
   * Update local form data for a specific step without calling the backend.
   * Used for real-time form tracking as the user types.
   *
   * @param stepId - The step to update
   * @param data - Form data
   */
  function setLocalFormData<S extends WizardStepId>(
    stepId: S,
    data: StepFormDataMap[S],
  ): void {
    const stepState = steps.value[stepId]
    if (stepState) {
      stepState.formData = data
    }
  }

  /**
   * Get local form data for a specific step.
   *
   * @param stepId - The step to query
   * @returns The form data, or null if none saved
   */
  function getLocalFormData<S extends WizardStepId>(
    stepId: S,
  ): StepFormDataMap[S] | null {
    const stepState = steps.value[stepId]
    return (stepState?.formData as StepFormDataMap[S]) ?? null
  }

  /**
   * Update local preview data for a specific step.
   * Called by preview components after computing preview state.
   *
   * @param stepId - The step to update
   * @param data - Preview data
   */
  function setPreviewData(stepId: WizardStepId, data: PreviewData): void {
    const stepState = steps.value[stepId]
    if (stepState) {
      stepState.previewData = data
    }
  }

  /**
   * Load a template preview for the selected (or specified) industry.
   *
   * @param industry - Industry sector code. Uses selectedIndustry if omitted.
   * @returns Template preview data, or null on error
   */
  async function loadTemplatePreview(
    industry?: IndustrySector,
  ): Promise<TemplatePreviewResponse | null> {
    const target = industry ?? selectedIndustry.value ?? undefined
    if (!target) {
      error.value = 'No industry selected for template preview'
      return null
    }

    try {
      const result = await withTracking(() => api.getTemplatePreview(target))
      templatePreview.value = result
      return result
    } catch {
      return null
    }
  }

  /**
   * Apply the industry template based on the current Tenant Config selection.
   *
   * @param createDemoProducts - Whether to create demo products
   * @returns Completion response, or null on error
   */
  async function applyIndustryTemplate(
    createDemoProducts = false,
  ): Promise<CompletionResponse | null> {
    isApplying.value = true

    try {
      const result = await withTracking(() => api.applyTemplate(createDemoProducts))

      if (result.success) {
        templateApplied.value = true
      }

      return result
    } catch {
      return null
    } finally {
      isApplying.value = false
    }
  }

  /**
   * Complete the onboarding wizard.
   *
   * Called from the summary/launch step. Triggers template application,
   * feature flag setup, and marks onboarding as completed.
   *
   * @param formData - Optional final form data from summary step
   * @returns Completion response, or null on error
   */
  async function completeWizard(
    formData?: StepFormData,
  ): Promise<CompletionResponse | null> {
    isApplying.value = true

    try {
      const result = await withTracking(() => api.completeOnboarding(formData))

      if (result.success) {
        onboardingStatus.value = 'completed'

        // Mark the final step as completed
        if (currentStepId.value && steps.value[currentStepId.value]) {
          steps.value[currentStepId.value].status = 'completed'
        }
      }

      return result
    } catch {
      return null
    } finally {
      isApplying.value = false
    }
  }

  /**
   * Skip the entire onboarding wizard (legacy flow).
   *
   * Marks onboarding as skipped in both PIM Onboarding State and
   * sets the status locally for immediate UI response.
   */
  async function skipEntireOnboarding(): Promise<void> {
    try {
      await withTracking(() => api.legacySkip())
      onboardingStatus.value = 'skipped'
    } catch {
      // Error already set by withTracking
    }
  }

  /**
   * Clear the current error message.
   */
  function clearError(): void {
    error.value = null
    api.clearError()
  }

  /**
   * Refresh the wizard status from the backend.
   * Useful after external changes or to sync state.
   */
  async function refreshStatus(): Promise<void> {
    try {
      const response = await withTracking(() => api.getStatus())
      applyStatusResponse(response)
    } catch {
      // Error already set by withTracking
    }
  }

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // Reactive state
    initialized: readonly(initialized),
    loading: readonly(loading),
    error: readonly(error),
    onboardingStatus: readonly(onboardingStatus),
    currentStepNumber: readonly(currentStepNumber),
    currentStepId: readonly(currentStepId),
    steps: readonly(steps),
    selectedIndustry: readonly(selectedIndustry),
    templateApplied: readonly(templateApplied),
    templatePreview: readonly(templatePreview),
    isApplying: readonly(isApplying),

    // Computed
    progressPercent,
    completedSteps,
    skippedSteps,
    currentStepConfig,
    currentStepState,
    isFirstStep,
    isLastStep,
    canSkipCurrentStep,
    canSkipRemaining,
    isCompleted,
    isInProgress,
    wizardSteps,
    totalSteps,

    // Actions
    initialize,
    goToNext,
    goToPrev,
    skipCurrentStep,
    goToStep,
    saveDraft,
    setLocalFormData,
    getLocalFormData,
    setPreviewData,
    loadTemplatePreview,
    applyIndustryTemplate,
    completeWizard,
    skipEntireOnboarding,
    clearError,
    refreshStatus,
  }
}
