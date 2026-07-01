/**
 * Per-step form validation composable for the 12-step onboarding wizard.
 *
 * Provides:
 * - Per-step validation rules with required field checks
 * - Pattern validation (email, URL, JSON arrays)
 * - Real-time validation as form data changes
 * - Step-level and field-level error/warning messages
 * - Integration with WIZARD_STEP_CONFIGS for required field lists
 *
 * Each step has its own validation function that returns a
 * StepValidationResult with valid/errors/warnings.
 *
 * Usage:
 *   const { validateStep, validateField, isStepValid, validationResult } = useStepValidation()
 *   const result = validateStep('company_info', formData)
 *   const fieldError = validateField('company_info', 'company_name', '')
 */

import { ref, computed, readonly, type Ref, type DeepReadonly } from 'vue'
import {
  WIZARD_STEP_CONFIGS,
  WIZARD_STEP_IDS,
  type WizardStepId,
  type StepValidationResult,
  type StepFormData,
  type StepFormDataMap,
  type CompanyInfoData,
  type IndustrySelectionData,
  type ProductStructureData,
  type AttributeConfigData,
  type TaxonomyData,
  type ChannelSetupData,
  type LocalizationData,
  type WorkflowPreferencesData,
  type QualityScoringData,
  type IntegrationsData,
  type ComplianceData,
  type SummaryLaunchData,
} from '@/types'

// ============================================================================
// Types
// ============================================================================

/** Field-level validation error */
export interface FieldValidationError {
  field: string
  message: string
  type: 'error' | 'warning'
}

/** Return type of useStepValidation composable */
export interface UseStepValidationReturn {
  /** Current validation result for the active step */
  validationResult: DeepReadonly<Ref<StepValidationResult>>

  /** Per-field validation errors for the active step */
  fieldErrors: DeepReadonly<Ref<Record<string, string>>>

  /** Per-field validation warnings for the active step */
  fieldWarnings: DeepReadonly<Ref<Record<string, string>>>

  /** Whether the active step passes validation */
  isValid: DeepReadonly<Ref<boolean>>

  /** Validate all fields for a specific step */
  validateStep: <S extends WizardStepId>(
    stepId: S,
    formData: StepFormDataMap[S] | null,
  ) => StepValidationResult

  /** Validate a single field for a specific step */
  validateField: (
    stepId: WizardStepId,
    fieldName: string,
    value: unknown,
  ) => FieldValidationError | null

  /** Set the active step for reactive validation tracking */
  setActiveStep: (stepId: WizardStepId, formData: StepFormData | null) => void

  /** Clear all validation state */
  clearValidation: () => void

  /** Get required fields for a step */
  getRequiredFields: (stepId: WizardStepId) => string[]
}

// ============================================================================
// Validation Helpers
// ============================================================================

/** Check if a value is non-empty (string, array, or any truthy value) */
function isNonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'number') return true
  if (typeof value === 'boolean') return true
  return !!value
}

/** Validate a URL string */
function isValidURL(value: string): boolean {
  if (!value) return true // Empty is valid (field is optional)
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/** Validate a URL-like string (allows missing protocol) */
function isValidWebsite(value: string): boolean {
  if (!value) return true
  // Accept with or without protocol
  const withProtocol = value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `https://${value}`
  return isValidURL(withProtocol)
}

/** Validate a number is within a range */
function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

// ============================================================================
// Per-Step Validation Functions
// ============================================================================

/**
 * Validate Step 1: Company Information.
 *
 * Required: company_name, company_size, primary_role, existing_systems
 */
function validateCompanyInfo(data: CompanyInfoData | null): StepValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data) {
    return { valid: false, errors: ['Company information is required'], warnings }
  }

  if (!isNonEmpty(data.company_name)) {
    errors.push('Company name is required')
  } else if (data.company_name.length < 2) {
    errors.push('Company name must be at least 2 characters')
  }

  if (!isNonEmpty(data.company_size)) {
    errors.push('Company size is required')
  }

  if (!isNonEmpty(data.primary_role)) {
    errors.push('Primary role is required')
  }

  if (!data.existing_systems || data.existing_systems.length === 0) {
    errors.push('Please select at least one existing system')
  }

  if (data.company_website && !isValidWebsite(data.company_website)) {
    warnings.push('Company website URL appears invalid')
  }

  if (!data.pain_points || data.pain_points.length === 0) {
    warnings.push('Consider adding pain points to help us customize your experience')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate Step 2: Industry Selection.
 *
 * Required: selected_industry
 */
function validateIndustrySelection(data: IndustrySelectionData | null): StepValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data) {
    return { valid: false, errors: ['Industry selection is required'], warnings }
  }

  if (!isNonEmpty(data.selected_industry)) {
    errors.push('Please select an industry sector')
  }

  if (data.selected_industry === 'custom' && !isNonEmpty(data.custom_industry_name)) {
    errors.push('Custom industry name is required when selecting "Custom"')
  }

  if (data.selected_industry !== 'custom' && !isNonEmpty(data.industry_sub_vertical)) {
    warnings.push('Consider specifying a sub-vertical for more tailored defaults')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate Step 3: Product Structure.
 *
 * Required: estimated_sku_count, product_family_count, data_import_source
 */
function validateProductStructure(data: ProductStructureData | null): StepValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data) {
    return { valid: false, errors: ['Product structure configuration is required'], warnings }
  }

  if (!isNonEmpty(data.estimated_sku_count)) {
    errors.push('Estimated SKU count is required')
  }

  if (!isNonEmpty(data.product_family_count)) {
    errors.push('Product family count is required')
  }

  if (!isNonEmpty(data.data_import_source)) {
    errors.push('Data import source is required')
  }

  if (data.uses_variants && (!data.variant_axes || data.variant_axes.length === 0)) {
    errors.push('Please specify at least one variant axis when using variants')
  }

  if (data.custom_families && data.custom_families.length > 50) {
    warnings.push('Large number of custom families may impact performance')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate Step 4: Attribute Configuration.
 *
 * No strictly required fields, but warn if no groups are enabled.
 */
function validateAttributeConfig(data: AttributeConfigData | null): StepValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data) {
    // Attribute config can proceed with template defaults
    return { valid: true, errors, warnings: ['Using template defaults for attribute configuration'] }
  }

  if (data.attribute_groups) {
    const enabledGroups = data.attribute_groups.filter((g) => g.enabled)
    if (enabledGroups.length === 0) {
      warnings.push('No attribute groups are enabled. Products will have no structured attributes.')
    }

    // Check for groups with no enabled attributes
    for (const group of enabledGroups) {
      const enabledAttrs = group.attributes.filter((a) => a.enabled)
      if (enabledAttrs.length === 0) {
        warnings.push(`Group "${group.label}" is enabled but has no active attributes`)
      }
    }
  }

  if (data.custom_attributes) {
    for (const attr of data.custom_attributes) {
      if (!isNonEmpty(attr.name)) {
        errors.push('Custom attribute name is required')
      }
      if (!isNonEmpty(attr.label)) {
        errors.push('Custom attribute label is required')
      }
      if (!isNonEmpty(attr.type)) {
        errors.push('Custom attribute type is required')
      }
      if (attr.type === 'select' && (!attr.options || attr.options.length === 0)) {
        errors.push(`Custom attribute "${attr.label}" of type "select" requires options`)
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate Step 5: Taxonomy.
 *
 * No strictly required fields, but warn if empty.
 */
function validateTaxonomy(data: TaxonomyData | null): StepValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data) {
    return { valid: true, errors, warnings: ['Using template defaults for taxonomy'] }
  }

  if (data.category_source === 'custom' && (!data.category_data || data.category_data.length === 0)) {
    warnings.push('No custom categories defined. Consider adding at least one category.')
  }

  if (data.category_data && data.category_data.length > 0) {
    // Validate category tree depth (max 5 levels recommended)
    const maxDepth = getMaxCategoryDepth(data.category_data)
    if (maxDepth > 5) {
      warnings.push(`Category tree is ${maxDepth} levels deep. Consider flattening for better usability.`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/** Calculate max depth of a category tree */
function getMaxCategoryDepth(nodes: Array<{ children?: unknown[] }>, depth = 1): number {
  let max = depth
  for (const node of nodes) {
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      const childDepth = getMaxCategoryDepth(node.children as Array<{ children?: unknown[] }>, depth + 1)
      if (childDepth > max) {
        max = childDepth
      }
    }
  }
  return max
}

/**
 * Validate Step 6: Channel Setup.
 *
 * No strictly required fields, but warn if no channels selected.
 */
function validateChannelSetup(data: ChannelSetupData | null): StepValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data) {
    return { valid: true, errors, warnings: ['Using template defaults for channels'] }
  }

  if (!data.selected_channels || data.selected_channels.length === 0) {
    warnings.push('No sales channels selected. You can add channels later.')
  }

  if (data.selected_channels && data.selected_channels.length > 0 && !data.primary_channel) {
    warnings.push('Consider selecting a primary channel for default configurations')
  }

  if (data.primary_channel && data.selected_channels && !data.selected_channels.includes(data.primary_channel)) {
    errors.push('Primary channel must be one of the selected channels')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate Step 7: Localization.
 *
 * No strictly required fields.
 */
function validateLocalization(data: LocalizationData | null): StepValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data) {
    return { valid: true, errors, warnings: ['Using default localization settings'] }
  }

  if (data.additional_languages && data.additional_languages.length > 0 && !data.primary_language) {
    warnings.push('Primary language should be set when using multiple languages')
  }

  if (data.enable_auto_translate && (!data.additional_languages || data.additional_languages.length === 0)) {
    warnings.push('Auto-translate is enabled but no additional languages are configured')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate Step 8: Workflow Preferences.
 *
 * No strictly required fields.
 */
function validateWorkflowPreferences(data: WorkflowPreferencesData | null): StepValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data) {
    return { valid: true, errors, warnings: ['Using default workflow settings'] }
  }

  if (data.workflow_complexity === 'advanced' && !data.require_quality_check) {
    warnings.push('Advanced workflow without quality check may allow low-quality products to be published')
  }

  if (data.auto_publish && data.require_quality_check) {
    warnings.push('Auto-publish with quality check means products only auto-publish after passing quality gate')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate Step 9: Quality Scoring (skippable).
 *
 * No required fields. Validates ranges if provided.
 */
function validateQualityScoring(data: QualityScoringData | null): StepValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data) {
    return { valid: true, errors, warnings: ['Using default quality scoring settings'] }
  }

  if (data.quality_threshold !== undefined && data.quality_threshold !== null) {
    if (!isInRange(data.quality_threshold, 0, 100)) {
      errors.push('Quality threshold must be between 0 and 100')
    }
  }

  if (data.scoring_weights) {
    const weights = data.scoring_weights
    const totalWeight =
      (weights.attribute_completeness ?? 0) +
      (weights.content_quality ?? 0) +
      (weights.media_coverage ?? 0) +
      (weights.seo_optimization ?? 0) +
      (weights.compliance ?? 0)

    if (totalWeight > 0 && totalWeight !== 100) {
      warnings.push(`Scoring weights sum to ${totalWeight}%. Consider adjusting to total 100%.`)
    }

    // Validate individual weights are non-negative
    for (const [key, weight] of Object.entries(weights)) {
      if (typeof weight === 'number' && weight < 0) {
        errors.push(`Scoring weight "${key}" cannot be negative`)
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate Step 10: Integrations (skippable).
 *
 * No required fields. Validates dependent fields.
 */
function validateIntegrations(data: IntegrationsData | null): StepValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data) {
    return { valid: true, errors, warnings: ['No integrations configured'] }
  }

  if (data.enable_erp_sync && !data.erp_type) {
    errors.push('ERP type is required when ERP sync is enabled')
  }

  if (data.enable_erp_sync && !data.sync_direction) {
    errors.push('Sync direction is required when ERP sync is enabled')
  }

  if (data.enable_ai_enrichment && !data.ai_provider) {
    errors.push('AI provider is required when AI enrichment is enabled')
  }

  if (data.enable_ai_enrichment && (!data.ai_use_cases || data.ai_use_cases.length === 0)) {
    warnings.push('Consider selecting AI use cases to configure enrichment features')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate Step 11: Compliance (skippable).
 *
 * No required fields.
 */
function validateCompliance(data: ComplianceData | null): StepValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data) {
    return { valid: true, errors, warnings: ['No compliance standards configured'] }
  }

  if (data.certification_tracking && (!data.compliance_standards || data.compliance_standards.length === 0)) {
    warnings.push('Certification tracking is enabled but no compliance standards are selected')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate Step 12: Summary & Launch.
 *
 * No required fields — this step is informational.
 */
function validateSummaryLaunch(data: SummaryLaunchData | null): StepValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data) {
    return { valid: true, errors, warnings }
  }

  if (!data.confirm_launch && !data.acknowledged_summary) {
    warnings.push('Please review the configuration summary before launching')
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ============================================================================
// Validation Dispatcher
// ============================================================================

/** Map of step ID to its validation function */
const STEP_VALIDATORS: Record<WizardStepId, (data: unknown) => StepValidationResult> = {
  company_info: (d) => validateCompanyInfo(d as CompanyInfoData | null),
  industry_selection: (d) => validateIndustrySelection(d as IndustrySelectionData | null),
  product_structure: (d) => validateProductStructure(d as ProductStructureData | null),
  attribute_config: (d) => validateAttributeConfig(d as AttributeConfigData | null),
  taxonomy: (d) => validateTaxonomy(d as TaxonomyData | null),
  channel_setup: (d) => validateChannelSetup(d as ChannelSetupData | null),
  localization: (d) => validateLocalization(d as LocalizationData | null),
  workflow_preferences: (d) => validateWorkflowPreferences(d as WorkflowPreferencesData | null),
  quality_scoring: (d) => validateQualityScoring(d as QualityScoringData | null),
  integrations: (d) => validateIntegrations(d as IntegrationsData | null),
  compliance: (d) => validateCompliance(d as ComplianceData | null),
  summary_launch: (d) => validateSummaryLaunch(d as SummaryLaunchData | null),
}

// ============================================================================
// Field-Level Validation
// ============================================================================

/** Field-level validation rules per step */
const FIELD_VALIDATORS: Partial<
  Record<WizardStepId, Record<string, (value: unknown) => FieldValidationError | null>>
> = {
  company_info: {
    company_name: (v) => {
      if (!isNonEmpty(v)) return { field: 'company_name', message: 'Company name is required', type: 'error' }
      if (typeof v === 'string' && v.length < 2) return { field: 'company_name', message: 'Must be at least 2 characters', type: 'error' }
      return null
    },
    company_website: (v) => {
      if (typeof v === 'string' && v && !isValidWebsite(v)) return { field: 'company_website', message: 'Invalid website URL', type: 'warning' }
      return null
    },
    company_size: (v) => {
      if (!isNonEmpty(v)) return { field: 'company_size', message: 'Company size is required', type: 'error' }
      return null
    },
    primary_role: (v) => {
      if (!isNonEmpty(v)) return { field: 'primary_role', message: 'Primary role is required', type: 'error' }
      return null
    },
    existing_systems: (v) => {
      if (!Array.isArray(v) || v.length === 0) return { field: 'existing_systems', message: 'Select at least one system', type: 'error' }
      return null
    },
  },
  industry_selection: {
    selected_industry: (v) => {
      if (!isNonEmpty(v)) return { field: 'selected_industry', message: 'Industry selection is required', type: 'error' }
      return null
    },
    custom_industry_name: (v) => {
      // Validated contextually in step-level validator
      return null
    },
  },
  product_structure: {
    estimated_sku_count: (v) => {
      if (!isNonEmpty(v)) return { field: 'estimated_sku_count', message: 'SKU estimate is required', type: 'error' }
      return null
    },
    product_family_count: (v) => {
      if (!isNonEmpty(v)) return { field: 'product_family_count', message: 'Family count is required', type: 'error' }
      return null
    },
    data_import_source: (v) => {
      if (!isNonEmpty(v)) return { field: 'data_import_source', message: 'Import source is required', type: 'error' }
      return null
    },
  },
  quality_scoring: {
    quality_threshold: (v) => {
      if (typeof v === 'number' && !isInRange(v, 0, 100)) {
        return { field: 'quality_threshold', message: 'Must be between 0 and 100', type: 'error' }
      }
      return null
    },
  },
  integrations: {
    erp_type: (v) => {
      // Contextual — only required when erp_sync is enabled
      return null
    },
    sync_direction: (v) => {
      return null
    },
    ai_provider: (v) => {
      return null
    },
  },
}

// ============================================================================
// Composable
// ============================================================================

/**
 * Vue 3 composable for per-step form validation in the onboarding wizard.
 *
 * Provides both step-level and field-level validation with reactive state
 * tracking. Validation rules are defined per step and match the backend
 * validation in OnboardingService.
 *
 * @example
 * ```ts
 * const { validateStep, validateField, isValid, setActiveStep } = useStepValidation()
 *
 * // Validate entire step
 * const result = validateStep('company_info', formData)
 * if (!result.valid) {
 *   // Show errors
 * }
 *
 * // Validate single field (for real-time feedback)
 * const fieldError = validateField('company_info', 'company_name', value)
 *
 * // Track active step for reactive isValid computed
 * setActiveStep('company_info', formData)
 * watch(isValid, (valid) => { /* enable/disable Next button *\/ })
 * ```
 */
export function useStepValidation(): UseStepValidationReturn {
  // ==========================================================================
  // Reactive State
  // ==========================================================================

  const validationResult = ref<StepValidationResult>({
    valid: true,
    errors: [],
    warnings: [],
  })

  const fieldErrors = ref<Record<string, string>>({})
  const fieldWarnings = ref<Record<string, string>>({})

  const isValid = computed(() => validationResult.value.valid)

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Validate all fields for a specific wizard step.
   *
   * Returns a StepValidationResult and updates the reactive state.
   *
   * @param stepId - The wizard step to validate
   * @param formData - The form data to validate
   * @returns Validation result with valid flag, errors, and warnings
   */
  function validateStep<S extends WizardStepId>(
    stepId: S,
    formData: StepFormDataMap[S] | null,
  ): StepValidationResult {
    const validator = STEP_VALIDATORS[stepId]
    if (!validator) {
      return { valid: true, errors: [], warnings: [] }
    }

    const result = validator(formData)

    // Update reactive state
    validationResult.value = result
    updateFieldState(stepId, formData)

    return result
  }

  /**
   * Validate a single field for real-time feedback.
   *
   * @param stepId - The wizard step the field belongs to
   * @param fieldName - The field name to validate
   * @param value - The current field value
   * @returns A FieldValidationError or null if valid
   */
  function validateField(
    stepId: WizardStepId,
    fieldName: string,
    value: unknown,
  ): FieldValidationError | null {
    const stepFieldValidators = FIELD_VALIDATORS[stepId]
    if (!stepFieldValidators) return null

    const fieldValidator = stepFieldValidators[fieldName]
    if (!fieldValidator) return null

    const result = fieldValidator(value)

    // Update per-field reactive state
    if (result) {
      if (result.type === 'error') {
        fieldErrors.value = { ...fieldErrors.value, [fieldName]: result.message }
        // Clear warning for this field if there's an error
        const { [fieldName]: _, ...rest } = fieldWarnings.value
        fieldWarnings.value = rest
      } else {
        fieldWarnings.value = { ...fieldWarnings.value, [fieldName]: result.message }
        // Clear error for this field if there's only a warning
        const { [fieldName]: _, ...rest } = fieldErrors.value
        fieldErrors.value = rest
      }
    } else {
      // Clear both error and warning for this field
      const { [fieldName]: _e, ...restErrors } = fieldErrors.value
      fieldErrors.value = restErrors
      const { [fieldName]: _w, ...restWarnings } = fieldWarnings.value
      fieldWarnings.value = restWarnings
    }

    return result
  }

  /**
   * Set the active step and run initial validation.
   *
   * Call this when the wizard navigates to a new step to set up
   * reactive validation tracking.
   *
   * @param stepId - The step to activate
   * @param formData - Current form data for the step
   */
  function setActiveStep(
    stepId: WizardStepId,
    formData: StepFormData | null,
  ): void {
    clearValidation()
    validateStep(stepId, formData as StepFormDataMap[typeof stepId] | null)
  }

  /**
   * Clear all validation state.
   */
  function clearValidation(): void {
    validationResult.value = { valid: true, errors: [], warnings: [] }
    fieldErrors.value = {}
    fieldWarnings.value = {}
  }

  /**
   * Get the list of required fields for a step.
   *
   * @param stepId - The wizard step
   * @returns Array of required field names
   */
  function getRequiredFields(stepId: WizardStepId): string[] {
    const config = WIZARD_STEP_CONFIGS.find((c) => c.id === stepId)
    return config?.requiredFields ?? []
  }

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  /**
   * Update per-field error/warning state from form data.
   */
  function updateFieldState(
    stepId: WizardStepId,
    formData: unknown,
  ): void {
    const newErrors: Record<string, string> = {}
    const newWarnings: Record<string, string> = {}

    const stepFieldValidators = FIELD_VALIDATORS[stepId]
    if (!stepFieldValidators || !formData || typeof formData !== 'object') {
      fieldErrors.value = newErrors
      fieldWarnings.value = newWarnings
      return
    }

    const data = formData as Record<string, unknown>

    for (const [fieldName, validator] of Object.entries(stepFieldValidators)) {
      const result = validator(data[fieldName])
      if (result) {
        if (result.type === 'error') {
          newErrors[fieldName] = result.message
        } else {
          newWarnings[fieldName] = result.message
        }
      }
    }

    fieldErrors.value = newErrors
    fieldWarnings.value = newWarnings
  }

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    validationResult: readonly(validationResult),
    fieldErrors: readonly(fieldErrors),
    fieldWarnings: readonly(fieldWarnings),
    isValid: readonly(isValid) as DeepReadonly<Ref<boolean>>,
    validateStep,
    validateField,
    setActiveStep,
    clearValidation,
    getRequiredFields,
  }
}
