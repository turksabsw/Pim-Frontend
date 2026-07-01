/**
 * Core PIM type definitions and barrel exports.
 *
 * This module contains Frappe framework types and re-exports
 * all domain-specific types from their respective modules.
 */

// ============================================================================
// Frappe Framework Types
// ============================================================================

/** Frappe API response wrapper for method calls */
export interface FrappeResponse<T = unknown> {
  message: T
  exc?: string
  exc_type?: string
  _server_messages?: string
}

/** Frappe list response with pagination from resource API */
export interface FrappeListResponse<T> {
  data: T[]
  total_count: number
}

/** Frappe document resource API response */
export interface FrappeDocResponse<T> {
  data: T
}

/** Base entity with Frappe standard fields */
export interface FrappeEntity {
  name: string
  owner: string
  creation: string
  modified: string
  modified_by: string
  docstatus: number
  idx: number
}

/** Frappe field filter for get_list calls */
export type FrappeFilter = string | [string, string] | [string, string, string | number]

/** Frappe filters object */
export type FrappeFilters = Record<string, FrappeFilter | string | number | boolean>

/** Frappe or_filters (array of filter arrays) */
export type FrappeOrFilters = Array<[string, string, string | number]>

/** Options for Frappe get_list API */
export interface FrappeListParams {
  doctype: string
  fields?: string[]
  filters?: FrappeFilters
  or_filters?: FrappeOrFilters
  order_by?: string
  limit_start?: number
  limit_page_length?: number
  parent?: string
  group_by?: string
}

/** Options for Frappe get_count API */
export interface FrappeCountParams {
  doctype: string
  filters?: FrappeFilters
}

// ============================================================================
// API Error Types
// ============================================================================

/** API error response */
export interface APIError {
  message: string
  exc_type?: string
  status_code?: number
  indicator?: 'red' | 'orange' | 'yellow'
  server_messages?: string[]
}

/** Validation error detail */
export interface ValidationError {
  field: string
  message: string
}

// ============================================================================
// Re-exports from Domain Modules
// ============================================================================

// Product types
export type {
  PIMProductType,
  ProductTypeField,
  ProductTypeAllowedFamily,
  PIMAttributeType,
  AttributeBaseType,
  PIMAttributeGroup,
  PIMAttributeTemplate,
  TemplateAttribute,
  PIMAttribute,
  PIMAttributeOption,
  ProductFamily,
  FamilyAttribute,
  FamilyVariantAttribute,
  PIMCategory,
  PIMBrand,
  ProductStatus,
  VariantStatus,
  ProductMaster,
  ProductVariant,
  ProductAttributeValue,
  ProductVariantAxisValue,
  ProductMedia,
  MediaType,
  SyncStatusValue,
  SyncStatus,
  CompletenessScore,
  QualityRule,
  QualityScoreResult,
  ProductListResponse,
  ProductListParams,
  CategoryTreeNode,
  FamilyTreeNode,
  VariantGenerationRequest,
  VariantAxisDefinition,
  VariantGenerationResult,
} from './product'

// Onboarding types — Legacy (PIM Onboarding State)
export type {
  OnboardingStepName,
  PIMOnboardingState,
  OnboardingStepDetail,
  OnboardingStateSummary,
  OnboardingStepMetadata,
  CompanyInfoData,
  IndustrySelectionData,
  ProductStructureData,
  ChannelSetupData,
  WorkflowPreferencesData,
  StepFormData,
  ArchetypeInfo,
  AvailableArchetypesResponse,
  ArchetypeSectionPreview,
  ArchetypePreviewResponse,
  TemplateApplicationResult,
  TemplateEntityDetail,
  OnboardingWizardStep,
} from './onboarding'

// Onboarding types — New 12-step wizard
export type {
  WizardStepId,
  WizardStepConfig,
  TenantConfig,
  OnboardingStatus,
  CompanySize,
  PrimaryRole,
  IndustrySector,
  SkuRange,
  FamilyCountRange,
  DataImportSource,
  CategorySource,
  BusinessModel,
  WorkflowComplexity,
  ErpType,
  SyncDirection,
  AiProvider,
  WizardStepMetadata,
  OnboardingStatusResponse,
  StepSaveResponse,
  StepSkipResponse,
  StepValidationResult,
  CompletionResponse,
  PostOnboardingUpdateResponse,
  IndustryChangeImpact,
  PostOnboardingSection,
  AttributeConfigData,
  AttributeGroupSelection,
  AttributeSelection,
  CustomAttributeDefinition,
  TaxonomyData,
  CategoryNode,
  LocalizationData,
  QualityScoringData,
  ScoringWeights,
  IntegrationsData,
  ComplianceData,
  SummaryLaunchData,
  StepFormDataMap,
  CompanyCardPreviewData,
  IndustryProfilePreviewData,
  ProductDiagramPreviewData,
  AttributeTreePreviewData,
  AttributeGroupPreview,
  CategoryTreePreviewData,
  ChannelDashPreviewData,
  ChannelPreview,
  LocaleGridPreviewData,
  WorkflowDiagramPreviewData,
  WorkflowStatePreview,
  QualityGaugePreviewData,
  QualityDimensionPreview,
  IntegrationBoardPreviewData,
  IntegrationPreview,
  ComplianceListPreviewData,
  ComplianceStandardPreview,
  FullSummaryPreviewData,
  PreviewDataMap,
  PreviewData,
  IndustryTemplate,
  IndustryTemplateCode,
  TemplatePreviewResponse,
  TemplateFamilyPreview,
  WizardDirection,
  StepStatus,
  WizardStepState,
  WizardState,
  WizardNavigationPayload,
  WizardSavePayload,
  StepFormDataFor,
  PreviewDataFor,
} from './onboarding'

// Re-export onboarding constants
export {
  ONBOARDING_STEPS,
  STEP_DATA_FIELDS,
  TOTAL_WIZARD_STEPS,
  WIZARD_STEP_IDS,
  SKIPPABLE_STEP_NUMBERS,
  SKIPPABLE_STEP_IDS,
  WIZARD_STEP_TO_STATE_STEP,
  WIZARD_STEP_CONFIGS,
} from './onboarding'

// Re-export onboarding utility functions
export {
  isSkippableStep,
  getStepNumber,
  getStepId,
  getStepConfig,
} from './onboarding'

// Legacy compatibility: OnboardingStep (used by OnboardingWizard.vue)
export type { OnboardingWizardStep as OnboardingStep } from './onboarding'
