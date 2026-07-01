/**
 * Onboarding-related type definitions for the SaaS onboarding wizard.
 *
 * Maps to backend:
 * - PIM Onboarding State DocType (12-step state machine)
 * - Tenant Config DocType (per-site configuration singleton)
 * - Onboarding API (frappe_pim.pim.api.onboarding)
 * - OnboardingService (frappe_pim.pim.services.onboarding_service)
 * - Template Engine service
 *
 * The wizard has 12 steps:
 *   1. company_info        — Company name, size, role, systems
 *   2. industry_selection   — Sector, sub-vertical, custom name
 *   3. product_structure    — SKUs, variants, families, import
 *   4. attribute_config     — Attribute groups, custom attrs
 *   5. taxonomy             — Categories, brands
 *   6. channel_setup        — Channels, primary, business model
 *   7. localization         — Languages, currency, UOM
 *   8. workflow_preferences — Workflow type, quality gate
 *   9. quality_scoring      — Threshold, weights (skippable)
 *  10. integrations         — ERP, AI, GS1, MDM (skippable)
 *  11. compliance           — Standards, certs (skippable)
 *  12. summary_launch       — Summary review, launch
 */

import type { FrappeEntity } from './index'

// ============================================================================
// Onboarding Steps — Legacy (PIM Onboarding State)
// ============================================================================

/** All valid onboarding step identifiers, matching backend ONBOARDING_STEPS */
export type OnboardingStepName =
  | 'pending'
  | 'company_info'
  | 'industry_selection'
  | 'product_structure'
  | 'channel_setup'
  | 'workflow_preferences'
  | 'compliance_setup'
  | 'template_applied'
  | 'customization_review'
  | 'first_data'
  | 'guided_tour'
  | 'completed'

/** Ordered list of onboarding steps (mirrors backend constant) */
export const ONBOARDING_STEPS: readonly OnboardingStepName[] = [
  'pending',
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
  'completed',
] as const

/** Steps that collect user form data (mirrors backend STEP_DATA_FIELDS) */
export const STEP_DATA_FIELDS: Partial<Record<OnboardingStepName, string>> = {
  company_info: 'company_info_data',
  industry_selection: 'industry_selection_data',
  product_structure: 'product_structure_data',
  channel_setup: 'channel_setup_data',
  workflow_preferences: 'workflow_preferences_data',
  compliance_setup: 'compliance_setup_data',
  customization_review: 'customization_review_data',
  first_data: 'first_data_data',
  guided_tour: 'guided_tour_data',
}

// ============================================================================
// Wizard Steps — New 12-Step Model (OnboardingService)
// ============================================================================

/** Wizard step identifiers matching backend STEP_IDS (1-12) */
export type WizardStepId =
  | 'company_info'
  | 'industry_selection'
  | 'product_structure'
  | 'attribute_config'
  | 'taxonomy'
  | 'channel_setup'
  | 'localization'
  | 'workflow_preferences'
  | 'quality_scoring'
  | 'integrations'
  | 'compliance'
  | 'summary_launch'

/** Total number of wizard steps */
export const TOTAL_WIZARD_STEPS = 12

/** Ordered list of wizard step IDs (1-indexed by position) */
export const WIZARD_STEP_IDS: readonly WizardStepId[] = [
  'company_info',
  'industry_selection',
  'product_structure',
  'attribute_config',
  'taxonomy',
  'channel_setup',
  'localization',
  'workflow_preferences',
  'quality_scoring',
  'integrations',
  'compliance',
  'summary_launch',
] as const

/** Step numbers that are skippable (available after step 8 is completed) */
export const SKIPPABLE_STEP_NUMBERS: readonly number[] = [9, 10, 11] as const

/** Skippable step IDs */
export const SKIPPABLE_STEP_IDS: readonly WizardStepId[] = [
  'quality_scoring',
  'integrations',
  'compliance',
] as const

/** Map wizard step_id to PIM Onboarding State step name (many-to-one) */
export const WIZARD_STEP_TO_STATE_STEP: Record<WizardStepId, OnboardingStepName> = {
  company_info: 'company_info',
  industry_selection: 'industry_selection',
  product_structure: 'product_structure',
  attribute_config: 'product_structure',
  taxonomy: 'product_structure',
  channel_setup: 'channel_setup',
  localization: 'channel_setup',
  workflow_preferences: 'workflow_preferences',
  quality_scoring: 'workflow_preferences',
  integrations: 'compliance_setup',
  compliance: 'compliance_setup',
  summary_launch: 'template_applied',
}

// ============================================================================
// Wizard Step Configuration
// ============================================================================

/** Configuration for a single wizard step */
export interface WizardStepConfig {
  /** Step identifier */
  id: WizardStepId
  /** Step number (1-12) */
  number: number
  /** Human-readable title */
  title: string
  /** Short description */
  description: string
  /** Vue component name for the step form */
  component: string
  /** Vue component name for the live preview */
  previewComponent: string
  /** Whether this step is mandatory */
  required: boolean
  /** Whether this step can be skipped (steps 9-11) */
  skippable: boolean
  /** Required form fields for validation */
  requiredFields: string[]
  /** Tenant Config fields populated by this step */
  configFields: string[]
}

/** All 12 wizard step configurations */
export const WIZARD_STEP_CONFIGS: readonly WizardStepConfig[] = [
  {
    id: 'company_info',
    number: 1,
    title: 'Company Information',
    description: 'Tell us about your company',
    component: 'CompanyInfoStep',
    previewComponent: 'CompanyCardPreview',
    required: true,
    skippable: false,
    requiredFields: ['company_name', 'company_size', 'primary_role', 'existing_systems'],
    configFields: ['company_name', 'company_website', 'company_size', 'primary_role', 'existing_systems', 'pain_points'],
  },
  {
    id: 'industry_selection',
    number: 2,
    title: 'Industry Profile',
    description: 'Select your industry to get a tailored setup',
    component: 'IndustryStep',
    previewComponent: 'IndustryProfilePreview',
    required: true,
    skippable: false,
    requiredFields: ['selected_industry'],
    configFields: ['selected_industry', 'industry_sub_vertical', 'custom_industry_name'],
  },
  {
    id: 'product_structure',
    number: 3,
    title: 'Product Structure',
    description: 'Configure how your products are organized',
    component: 'ProductStructureStep',
    previewComponent: 'ProductDiagramPreview',
    required: true,
    skippable: false,
    requiredFields: ['estimated_sku_count', 'product_family_count', 'data_import_source'],
    configFields: ['estimated_sku_count', 'uses_variants', 'variant_axes', 'product_family_count', 'custom_families', 'data_import_source'],
  },
  {
    id: 'attribute_config',
    number: 4,
    title: 'Attribute Configuration',
    description: 'Review and customize product attributes',
    component: 'AttributeConfigStep',
    previewComponent: 'AttributeTreePreview',
    required: true,
    skippable: false,
    requiredFields: [],
    configFields: ['attribute_groups', 'removed_template_attrs', 'custom_attributes'],
  },
  {
    id: 'taxonomy',
    number: 5,
    title: 'Taxonomy',
    description: 'Set up categories and brands',
    component: 'TaxonomyStep',
    previewComponent: 'CategoryTreePreview',
    required: true,
    skippable: false,
    requiredFields: [],
    configFields: ['category_source', 'category_data', 'brand_names'],
  },
  {
    id: 'channel_setup',
    number: 6,
    title: 'Sales Channels',
    description: 'Set up your distribution channels',
    component: 'ChannelStep',
    previewComponent: 'ChannelDashPreview',
    required: true,
    skippable: false,
    requiredFields: [],
    configFields: ['selected_channels', 'primary_channel', 'business_model'],
  },
  {
    id: 'localization',
    number: 7,
    title: 'Localization',
    description: 'Configure languages, currency, and units',
    component: 'LocalizationStep',
    previewComponent: 'LocaleGridPreview',
    required: true,
    skippable: false,
    requiredFields: [],
    configFields: ['primary_language', 'additional_languages', 'enable_auto_translate', 'default_currency', 'default_uom'],
  },
  {
    id: 'workflow_preferences',
    number: 8,
    title: 'Workflow Preferences',
    description: 'Configure approval and sync workflows',
    component: 'WorkflowStep',
    previewComponent: 'WorkflowDiagramPreview',
    required: true,
    skippable: false,
    requiredFields: [],
    configFields: ['workflow_complexity', 'require_quality_check', 'auto_publish', 'notify_on_status_change'],
  },
  {
    id: 'quality_scoring',
    number: 9,
    title: 'Quality Scoring',
    description: 'Set quality thresholds and scoring weights',
    component: 'QualityScoringStep',
    previewComponent: 'QualityGaugePreview',
    required: false,
    skippable: true,
    requiredFields: [],
    configFields: ['quality_threshold', 'scoring_weights'],
  },
  {
    id: 'integrations',
    number: 10,
    title: 'Integrations',
    description: 'Connect ERP, AI, and external systems',
    component: 'IntegrationsStep',
    previewComponent: 'IntegrationBoardPreview',
    required: false,
    skippable: true,
    requiredFields: [],
    configFields: ['enable_erp_sync', 'erp_type', 'sync_direction', 'enable_ai_enrichment', 'ai_provider', 'ai_use_cases', 'enable_gs1', 'enable_mdm'],
  },
  {
    id: 'compliance',
    number: 11,
    title: 'Compliance',
    description: 'Set up regulatory standards and certifications',
    component: 'ComplianceStep',
    previewComponent: 'ComplianceListPreview',
    required: false,
    skippable: true,
    requiredFields: [],
    configFields: ['compliance_standards', 'certification_tracking'],
  },
  {
    id: 'summary_launch',
    number: 12,
    title: 'Summary & Launch',
    description: 'Review your configuration and launch PIM',
    component: 'SummaryLaunchStep',
    previewComponent: 'FullSummaryPreview',
    required: true,
    skippable: false,
    requiredFields: [],
    configFields: [],
  },
] as const

// ============================================================================
// Onboarding State — PIM Onboarding State DocType
// ============================================================================

/** PIM Onboarding State - DocType entity */
export interface PIMOnboardingState extends FrappeEntity {
  user: string
  current_step: OnboardingStepName
  is_completed: boolean
  is_skipped: boolean
  started_at?: string
  completed_at?: string
  selected_archetype?: string
  template_applied: boolean
  template_applied_at?: string
  template_result?: string
  progress_percent: number
  steps_completed?: string
  last_step_completed_at?: string
  error_log?: string
  /** Step data JSON fields */
  company_info_data?: string
  industry_selection_data?: string
  product_structure_data?: string
  channel_setup_data?: string
  workflow_preferences_data?: string
  compliance_setup_data?: string
  customization_review_data?: string
  first_data_data?: string
  guided_tour_data?: string
}

// ============================================================================
// Tenant Config Types
// ============================================================================

/** Tenant Config — per-site singleton DocType storing aggregated config */
export interface TenantConfig {
  // Company Information
  company_name?: string
  company_website?: string
  company_size?: CompanySize
  primary_role?: PrimaryRole
  existing_systems?: string
  pain_points?: string

  // Industry & Template
  selected_industry?: IndustrySector
  industry_sub_vertical?: string
  industry_template_version?: string
  custom_industry_name?: string

  // Product Structure
  estimated_sku_count?: SkuRange
  uses_variants?: boolean
  variant_axes?: string
  product_family_count?: FamilyCountRange
  custom_families?: string
  data_import_source?: DataImportSource

  // Attribute Configuration
  attribute_groups?: string
  removed_template_attrs?: string
  custom_attributes?: string
  total_attribute_count?: number

  // Taxonomy
  category_source?: CategorySource
  category_data?: string
  brand_names?: string

  // Channels
  selected_channels?: string
  primary_channel?: string
  business_model?: BusinessModel

  // Localization
  primary_language?: string
  additional_languages?: string
  enable_auto_translate?: boolean
  default_currency?: string
  default_uom?: string

  // Workflow
  workflow_complexity?: WorkflowComplexity
  require_quality_check?: boolean
  auto_publish?: boolean
  notify_on_status_change?: boolean

  // Quality & Scoring
  quality_threshold?: number
  scoring_weights?: string

  // Integrations
  enable_erp_sync?: boolean
  erp_type?: ErpType
  sync_direction?: SyncDirection
  enable_ai_enrichment?: boolean
  ai_provider?: AiProvider
  ai_use_cases?: string
  enable_gs1?: boolean
  enable_mdm?: boolean

  // Compliance
  compliance_standards?: string
  certification_tracking?: boolean

  // Feature Flags
  enable_variants?: boolean
  enable_quality_scoring?: boolean
  enable_channels?: boolean
  enable_workflow?: boolean
  enable_translations?: boolean
  enable_ai?: boolean
  enable_bundling?: boolean
  enable_competitor_tracking?: boolean

  // Onboarding Status
  onboarding_status?: OnboardingStatus
  onboarding_current_step?: number
  onboarding_started_at?: string
  onboarding_completed_at?: string
  onboarding_step_data?: string
}

/** Tenant-level onboarding status */
export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'error'

// ============================================================================
// Enum-Like Types (matching Tenant Config field options)
// ============================================================================

/** Company size options */
export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+'

/** Primary admin role */
export type PrimaryRole =
  | 'Product Manager'
  | 'Catalog Manager'
  | 'E-Commerce Manager'
  | 'IT Administrator'
  | 'Marketing Manager'
  | 'Operations Manager'
  | 'Business Owner'
  | 'Other'

/** Industry sector codes */
export type IndustrySector =
  | 'fashion'
  | 'industrial'
  | 'food'
  | 'electronics'
  | 'health_beauty'
  | 'automotive'
  | 'custom'

/** SKU range options */
export type SkuRange = '1-100' | '101-500' | '501-2000' | '2001-10000' | '10000+'

/** Product family count range options */
export type FamilyCountRange = '1-5' | '6-15' | '16-50' | '50+'

/** Data import source options */
export type DataImportSource =
  | 'manual_entry'
  | 'csv_import'
  | 'erp_sync'
  | 'api_import'
  | 'no_existing_data'

/** Category source options */
export type CategorySource = 'template' | 'custom' | 'import' | 'gpc'

/** Business model options */
export type BusinessModel = 'b2c' | 'b2b' | 'b2b2c' | 'marketplace' | 'omnichannel'

/** Workflow complexity options */
export type WorkflowComplexity = 'simple' | 'standard' | 'advanced'

/** ERP type options */
export type ErpType = 'erpnext' | 'sap' | 'oracle' | 'microsoft_dynamics' | 'other'

/** Sync direction options */
export type SyncDirection = 'pim_to_erp' | 'erp_to_pim' | 'bidirectional'

/** AI provider options */
export type AiProvider = 'openai' | 'anthropic' | 'google' | 'local'

// ============================================================================
// API Response Types — Legacy (PIM Onboarding State)
// ============================================================================

/** Step detail in the onboarding state summary */
export interface OnboardingStepDetail {
  name: OnboardingStepName
  index: number
  is_completed: boolean
  is_current: boolean
  has_data: boolean
}

/** Onboarding state summary returned by backend APIs */
export interface OnboardingStateSummary {
  user: string
  current_step: OnboardingStepName | 'not_started'
  is_completed: boolean
  is_skipped: boolean
  progress_percent: number
  selected_archetype?: string | null
  template_applied: boolean
  started_at?: string | null
  completed_at?: string | null
  completed_steps: string[]
  next_step?: OnboardingStepName | null
  previous_step?: OnboardingStepName | null
  total_steps: number
  steps: OnboardingStepDetail[]
  /** Included when resuming a step that has saved data */
  current_step_data?: Record<string, unknown>
}

/** Step metadata from get_onboarding_steps API */
export interface OnboardingStepMetadata {
  name: OnboardingStepName
  index: number
  has_data_field: boolean
  data_field?: string | null
}

// ============================================================================
// API Response Types — New (OnboardingService)
// ============================================================================

/** Per-step metadata in the new get_onboarding_status response */
export interface WizardStepMetadata {
  step_id: WizardStepId
  step_number: number
  title: string
  is_completed: boolean
  is_current: boolean
  is_skippable: boolean
  was_skipped: boolean
}

/** Combined onboarding status from get_onboarding_status API */
export interface OnboardingStatusResponse {
  status: OnboardingStatus
  current_step: number
  total_steps: number
  completed_steps: string[]
  can_skip_remaining: boolean
  started_at?: string | null
  completed_at?: string | null
  selected_industry?: string | null
  template_applied: boolean
  progress_percent: number
  steps: WizardStepMetadata[]
  /** Present when status is 'error' (e.g. backend exception) */
  message?: string
}

/** Result from save_step API */
export interface StepSaveResponse {
  success: boolean
  step_id: WizardStepId
  step_number: number
  next_step?: number | null
  validation_errors: string[]
  message: string
}

/** Result from skip_step API */
export interface StepSkipResponse {
  success: boolean
  step_id: WizardStepId
  step_number: number
  next_step?: number | null
  skipped: boolean
}

/** Step validation result (mirrors backend StepValidationResult) */
export interface StepValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/** Result from v2_complete_onboarding API */
export interface CompletionResponse {
  success: boolean
  status: 'completed' | 'failed' | 'pending'
  entities_created: Record<string, number>
  demo_products_created: number
  onboarding_completed_at?: string | null
  redirect_to: string
  errors: string[]
  messages: string[]
}

/** Result from update_post_onboarding API */
export interface PostOnboardingUpdateResponse {
  success: boolean
  updated_fields?: string[]
  validation_errors?: string[]
  impact_warning?: IndustryChangeImpact | null
  message?: string
}

/** Impact analysis when changing industry post-onboarding */
export interface IndustryChangeImpact {
  old_industry: string
  new_industry: string
  affected_entities: Record<string, number>
  warning_message: string
}

/** Post-onboarding section identifiers */
export type PostOnboardingSection =
  | 'company_info'
  | 'industry'
  | 'product_structure'
  | 'attributes'
  | 'taxonomy'
  | 'channels'
  | 'localization'
  | 'workflow'
  | 'quality'
  | 'integrations'
  | 'compliance'

// ============================================================================
// Step Form Data Types — All 12 Steps
// ============================================================================

/** Step 1: Company info step data */
export interface CompanyInfoData {
  company_name: string
  company_website?: string
  company_size: CompanySize
  primary_role: PrimaryRole
  existing_systems: string[]
  pain_points?: string[]
}

/** Step 2: Industry selection step data */
export interface IndustrySelectionData {
  selected_industry: IndustrySector
  industry_sub_vertical?: string
  custom_industry_name?: string
  /** Legacy alias for backward compatibility */
  archetype?: string
  sub_industry?: string
  product_count_estimate?: string
  has_variants?: boolean
}

/** Step 3: Product structure step data */
export interface ProductStructureData {
  estimated_sku_count: SkuRange
  uses_variants?: boolean
  variant_axes?: string[]
  product_family_count: FamilyCountRange
  custom_families?: string[]
  data_import_source: DataImportSource
  /** Legacy fields for backward compatibility */
  use_families?: boolean
  use_categories?: boolean
  variant_levels?: number
  use_sku_generation?: boolean
  sku_pattern?: string
}

/** Step 4: Attribute configuration step data */
export interface AttributeConfigData {
  attribute_groups?: AttributeGroupSelection[]
  removed_template_attrs?: string[]
  custom_attributes?: CustomAttributeDefinition[]
}

/** Attribute group selection for step 4 */
export interface AttributeGroupSelection {
  name: string
  label: string
  enabled: boolean
  attributes: AttributeSelection[]
}

/** Individual attribute selection within a group */
export interface AttributeSelection {
  name: string
  label: string
  type: string
  enabled: boolean
  from_template: boolean
}

/** Custom attribute definition for step 4 */
export interface CustomAttributeDefinition {
  name: string
  label: string
  type: string
  group?: string
  options?: string[]
  required?: boolean
}

/** Step 5: Taxonomy step data */
export interface TaxonomyData {
  category_source: CategorySource
  category_data?: CategoryNode[]
  brand_names?: string[]
}

/** Category tree node for taxonomy configuration */
export interface CategoryNode {
  name: string
  label: string
  children?: CategoryNode[]
  is_group?: boolean
}

/** Step 6: Channel setup step data */
export interface ChannelSetupData {
  selected_channels?: string[]
  primary_channel?: string
  business_model?: BusinessModel
  marketplace_integrations?: string[]
}

/** Step 7: Localization step data */
export interface LocalizationData {
  primary_language?: string
  additional_languages?: string[]
  enable_auto_translate?: boolean
  default_currency?: string
  default_uom?: string
}

/** Step 8: Workflow preferences step data */
export interface WorkflowPreferencesData {
  workflow_complexity?: WorkflowComplexity
  require_quality_check?: boolean
  auto_publish?: boolean
  notify_on_status_change?: boolean
  /** Legacy fields for backward compatibility */
  require_approval?: boolean
  auto_sync_to_erp?: boolean
  sync_direction?: 'PIM Master' | 'ERP Master' | 'Bidirectional'
  enable_quality_scoring?: boolean
}

/** Step 9: Quality scoring step data */
export interface QualityScoringData {
  quality_threshold?: number
  scoring_weights?: ScoringWeights
}

/** Quality scoring dimension weights */
export interface ScoringWeights {
  attribute_completeness?: number
  content_quality?: number
  media_coverage?: number
  seo_optimization?: number
  compliance?: number
}

/** Step 10: Integrations step data */
export interface IntegrationsData {
  enable_erp_sync?: boolean
  erp_type?: ErpType
  sync_direction?: SyncDirection
  enable_ai_enrichment?: boolean
  ai_provider?: AiProvider
  ai_use_cases?: string[]
  enable_gs1?: boolean
  enable_mdm?: boolean
}

/** Step 11: Compliance step data */
export interface ComplianceData {
  compliance_standards?: string[]
  certification_tracking?: boolean
  /** Legacy fields for backward compatibility */
  regulatory_standards?: string[]
  certifications_required?: string[]
  enable_safety_warnings?: boolean
}

/** Step 12: Summary & launch step data */
export interface SummaryLaunchData {
  confirm_launch?: boolean
  create_demo_products?: boolean
  acknowledged_summary?: boolean
}

/** Discriminated union of all 12 step form data types by step_id */
export type StepFormDataMap = {
  company_info: CompanyInfoData
  industry_selection: IndustrySelectionData
  product_structure: ProductStructureData
  attribute_config: AttributeConfigData
  taxonomy: TaxonomyData
  channel_setup: ChannelSetupData
  localization: LocalizationData
  workflow_preferences: WorkflowPreferencesData
  quality_scoring: QualityScoringData
  integrations: IntegrationsData
  compliance: ComplianceData
  summary_launch: SummaryLaunchData
}

/** Union of all step form data types */
export type StepFormData =
  | CompanyInfoData
  | IndustrySelectionData
  | ProductStructureData
  | AttributeConfigData
  | TaxonomyData
  | ChannelSetupData
  | LocalizationData
  | WorkflowPreferencesData
  | QualityScoringData
  | IntegrationsData
  | ComplianceData
  | SummaryLaunchData
  | Record<string, unknown>

// ============================================================================
// Preview Data Types — All 12 Steps
// ============================================================================

/** Step 1: Company card preview data */
export interface CompanyCardPreviewData {
  company_name: string
  company_website?: string
  company_size?: CompanySize
  primary_role?: PrimaryRole
  existing_systems: string[]
  pain_points: string[]
}

/** Step 2: Industry profile preview data */
export interface IndustryProfilePreviewData {
  selected_industry?: IndustrySector
  industry_label?: string
  industry_description?: string
  sub_vertical?: string
  template_version?: string
  attribute_count?: number
  family_count?: number
  category_count?: number
}

/** Step 3: Product hierarchy diagram preview data */
export interface ProductDiagramPreviewData {
  estimated_sku_count?: SkuRange
  uses_variants: boolean
  variant_axes: string[]
  product_family_count?: FamilyCountRange
  custom_families: string[]
  data_import_source?: DataImportSource
}

/** Step 4: Attribute tree preview data */
export interface AttributeTreePreviewData {
  groups: AttributeGroupPreview[]
  total_attributes: number
  custom_count: number
  template_count: number
  removed_count: number
}

/** Attribute group preview node */
export interface AttributeGroupPreview {
  name: string
  label: string
  attributes: Array<{
    name: string
    label: string
    type: string
    from_template: boolean
  }>
}

/** Step 5: Category tree preview data */
export interface CategoryTreePreviewData {
  source: CategorySource
  categories: CategoryNode[]
  total_categories: number
  max_depth: number
  brands: string[]
}

/** Step 6: Channel dashboard preview data */
export interface ChannelDashPreviewData {
  channels: ChannelPreview[]
  primary_channel?: string
  business_model?: BusinessModel
}

/** Channel preview item */
export interface ChannelPreview {
  id: string
  label: string
  is_primary: boolean
  is_active: boolean
  icon?: string
}

/** Step 7: Locale grid preview data */
export interface LocaleGridPreviewData {
  primary_language: string
  primary_language_label?: string
  additional_languages: Array<{
    code: string
    label: string
  }>
  enable_auto_translate: boolean
  default_currency?: string
  default_currency_symbol?: string
  default_uom?: string
}

/** Step 8: Workflow diagram preview data */
export interface WorkflowDiagramPreviewData {
  workflow_complexity: WorkflowComplexity
  states: WorkflowStatePreview[]
  require_quality_check: boolean
  auto_publish: boolean
  notify_on_status_change: boolean
}

/** Workflow state preview node */
export interface WorkflowStatePreview {
  name: string
  label: string
  color: string
  is_initial?: boolean
  is_final?: boolean
  transitions_to: string[]
}

/** Step 9: Quality gauge preview data */
export interface QualityGaugePreviewData {
  quality_threshold: number
  scoring_weights: ScoringWeights
  dimensions: QualityDimensionPreview[]
}

/** Quality scoring dimension preview */
export interface QualityDimensionPreview {
  key: string
  label: string
  weight: number
  color: string
}

/** Step 10: Integration board preview data */
export interface IntegrationBoardPreviewData {
  integrations: IntegrationPreview[]
  total_enabled: number
}

/** Integration preview item */
export interface IntegrationPreview {
  id: string
  label: string
  description: string
  icon?: string
  enabled: boolean
  config_summary?: string
}

/** Step 11: Compliance list preview data */
export interface ComplianceListPreviewData {
  standards: ComplianceStandardPreview[]
  certification_tracking: boolean
  total_standards: number
}

/** Compliance standard preview item */
export interface ComplianceStandardPreview {
  id: string
  label: string
  description: string
  enabled: boolean
}

/** Step 12: Full summary preview data */
export interface FullSummaryPreviewData {
  company: CompanyCardPreviewData
  industry: IndustryProfilePreviewData
  product_structure: ProductDiagramPreviewData
  attributes: AttributeTreePreviewData
  taxonomy: CategoryTreePreviewData
  channels: ChannelDashPreviewData
  localization: LocaleGridPreviewData
  workflow: WorkflowDiagramPreviewData
  quality: QualityGaugePreviewData
  integrations: IntegrationBoardPreviewData
  compliance: ComplianceListPreviewData
  /** Readiness indicators */
  total_steps_completed: number
  total_steps: number
  skipped_steps: WizardStepId[]
  ready_to_launch: boolean
}

/** Discriminated map of preview data types by step_id */
export type PreviewDataMap = {
  company_info: CompanyCardPreviewData
  industry_selection: IndustryProfilePreviewData
  product_structure: ProductDiagramPreviewData
  attribute_config: AttributeTreePreviewData
  taxonomy: CategoryTreePreviewData
  channel_setup: ChannelDashPreviewData
  localization: LocaleGridPreviewData
  workflow_preferences: WorkflowDiagramPreviewData
  quality_scoring: QualityGaugePreviewData
  integrations: IntegrationBoardPreviewData
  compliance: ComplianceListPreviewData
  summary_launch: FullSummaryPreviewData
}

/** Union of all preview data types */
export type PreviewData =
  | CompanyCardPreviewData
  | IndustryProfilePreviewData
  | ProductDiagramPreviewData
  | AttributeTreePreviewData
  | CategoryTreePreviewData
  | ChannelDashPreviewData
  | LocaleGridPreviewData
  | WorkflowDiagramPreviewData
  | QualityGaugePreviewData
  | IntegrationBoardPreviewData
  | ComplianceListPreviewData
  | FullSummaryPreviewData

// ============================================================================
// Industry Archetype Types — Legacy
// ============================================================================

/** Available archetype information */
export interface ArchetypeInfo {
  archetype: string
  label: string
  description: string
  version?: string
}

/** Response from get_available_archetypes API */
export interface AvailableArchetypesResponse {
  archetypes: ArchetypeInfo[]
  total: number
}

/** Section preview in archetype template */
export interface ArchetypeSectionPreview {
  count: number
  items: string[]
}

/** Response from preview_archetype API */
export interface ArchetypePreviewResponse {
  archetype: string
  label: string
  description: string
  version?: string
  extends?: string
  sections: Record<string, ArchetypeSectionPreview>
}

/** Template application result from apply_archetype_template API */
export interface TemplateApplicationResult {
  success: boolean
  archetype: string
  status: 'completed' | 'partial' | 'failed'
  entities_created: number
  entities_skipped: number
  entities_failed: number
  details: Record<string, TemplateEntityDetail>
  errors: string[]
  messages: string[]
  dry_run?: boolean
}

/** Per-entity-type details in template application result */
export interface TemplateEntityDetail {
  created: number
  skipped: number
  failed: number
  items: string[]
}

// ============================================================================
// Industry Template Types — New (Industry Template DocType)
// ============================================================================

/** Industry Template DocType entity */
export interface IndustryTemplate extends FrappeEntity {
  template_code: string
  template_name: string
  version: number
  description?: string
  is_active: boolean
  attribute_groups_data?: string
  attributes_data?: string
  product_families_data?: string
  categories_data?: string
  channels_data?: string
  compliance_data?: string
  quality_data?: string
  demo_products_data?: string
  workflow_data?: string
}

/** Valid industry template codes */
export type IndustryTemplateCode =
  | 'fashion'
  | 'industrial'
  | 'food'
  | 'electronics'
  | 'health_beauty'
  | 'automotive'
  | 'custom'

/** Template preview response from get_template_preview API */
export interface TemplatePreviewResponse {
  display_name: string
  attribute_count: number
  attribute_groups: string[]
  product_families: TemplateFamilyPreview[]
  default_channels: string[]
  coming_soon_channels: string[]
  compliance_modules: string[]
  quality_threshold: number
  scoring_weights: ScoringWeights
  default_languages: string[]
  estimated_setup_minutes: number
  demo_products: number
}

/** Product family preview in template */
export interface TemplateFamilyPreview {
  name: string
  label: string
  attribute_count: number
  has_variants: boolean
}

// ============================================================================
// Wizard State Types — Pinia Store / Composable
// ============================================================================

/** Wizard navigation direction */
export type WizardDirection = 'forward' | 'backward'

/** Step completion status */
export type StepStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'error'

/** Wizard step state (UI-level tracking) */
export interface WizardStepState {
  id: WizardStepId
  number: number
  status: StepStatus
  title: string
  description: string
  formData: StepFormData | null
  previewData: PreviewData | null
  validationResult: StepValidationResult | null
  savedAt?: string | null
  skippedAt?: string | null
}

/** Overall wizard state managed by Pinia store */
export interface WizardState {
  /** Tenant-level onboarding status */
  onboardingStatus: OnboardingStatus
  /** Current step number (1-12, 0 = not started) */
  currentStep: number
  /** Current step ID */
  currentStepId: WizardStepId | null
  /** Total steps */
  totalSteps: number
  /** Per-step state */
  steps: Record<WizardStepId, WizardStepState>
  /** Selected industry sector */
  selectedIndustry: IndustrySector | null
  /** Whether template has been applied */
  templateApplied: boolean
  /** Whether remaining steps can be skipped (after step 8) */
  canSkipRemaining: boolean
  /** Progress percentage (0-100) */
  progressPercent: number
  /** IDs of completed steps */
  completedSteps: WizardStepId[]
  /** IDs of skipped steps */
  skippedSteps: WizardStepId[]
  /** Whether the wizard is loading (API call in progress) */
  isLoading: boolean
  /** Whether template application is in progress */
  isApplying: boolean
  /** Current error message, if any */
  error: string | null
  /** Whether the store has been initialized */
  initialized: boolean
}

/** Wizard navigation action payload */
export interface WizardNavigationPayload {
  direction: WizardDirection
  fromStep: WizardStepId
  toStep: WizardStepId
  formData?: StepFormData
  skip?: boolean
}

/** Wizard save action payload */
export interface WizardSavePayload {
  stepId: WizardStepId
  stepNumber: number
  formData: StepFormData
  advance: boolean
}

// ============================================================================
// UI Step Types — Legacy (for OnboardingWizard.vue compatibility)
// ============================================================================

/** Onboarding step definition for the UI wizard */
export interface OnboardingWizardStep {
  id: string
  title: string
  description: string
  component: string
  isCompleted: boolean
  isActive: boolean
  isFutureStep: boolean
  hasDataField?: boolean
}

// ============================================================================
// Utility Types
// ============================================================================

/** Type-safe step data getter: get form data type for a specific step */
export type StepFormDataFor<S extends WizardStepId> = StepFormDataMap[S]

/** Type-safe preview data getter: get preview data type for a specific step */
export type PreviewDataFor<S extends WizardStepId> = PreviewDataMap[S]

/** Check if a step ID is skippable */
export function isSkippableStep(stepId: WizardStepId): boolean {
  return (SKIPPABLE_STEP_IDS as readonly string[]).includes(stepId)
}

/** Get step number from step ID (1-based) */
export function getStepNumber(stepId: WizardStepId): number {
  const index = WIZARD_STEP_IDS.indexOf(stepId)
  return index >= 0 ? index + 1 : -1
}

/** Get step ID from step number (1-based) */
export function getStepId(stepNumber: number): WizardStepId | null {
  const index = stepNumber - 1
  return index >= 0 && index < WIZARD_STEP_IDS.length
    ? WIZARD_STEP_IDS[index]
    : null
}

/** Get step config for a given step ID */
export function getStepConfig(stepId: WizardStepId): WizardStepConfig | undefined {
  return WIZARD_STEP_CONFIGS.find((c) => c.id === stepId)
}
