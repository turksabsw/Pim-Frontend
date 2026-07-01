/**
 * Live preview composable for the onboarding wizard right panel.
 *
 * Computes preview data from the current step's form state in real time.
 * Each wizard step has a dedicated preview data transformer that maps
 * form data (user input) → preview data (display-ready).
 *
 * The preview panel updates immediately as users type, without waiting
 * for backend saves. This provides instant visual feedback showing how
 * their selections will manifest in the PIM system.
 *
 * Usage:
 *   const { previewData, updatePreview, activeStepId } = useLivePreview()
 *   updatePreview('company_info', formData)
 *   // previewData.value is now a CompanyCardPreviewData
 */

import { ref, computed, readonly, type Ref, type DeepReadonly } from 'vue'
import type {
  WizardStepId,
  StepFormDataMap,
  PreviewData,
  PreviewDataMap,
  // Form data types
  CompanyInfoData,
  IndustrySelectionData,
  ProductStructureData,
  AttributeConfigData,
  TaxonomyData,
  ChannelSetupData,
  LocalizationData,
  WorkflowPreferencesData,
  QualityScoringData,
  IntegrationsData,
  ComplianceData,
  SummaryLaunchData,
  // Preview data types
  CompanyCardPreviewData,
  IndustryProfilePreviewData,
  ProductDiagramPreviewData,
  AttributeTreePreviewData,
  AttributeGroupPreview,
  CategoryTreePreviewData,
  CategoryNode,
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
  WorkflowComplexity,
  ScoringWeights,
} from '@/types'

// ============================================================================
// Types
// ============================================================================

/** Return type of useLivePreview composable */
export interface UseLivePreviewReturn {
  /** Current preview data (type depends on active step) */
  previewData: DeepReadonly<Ref<PreviewData | null>>

  /** The currently active step for preview */
  activeStepId: DeepReadonly<Ref<WizardStepId | null>>

  /** Whether the preview has data to display */
  hasPreview: DeepReadonly<Ref<boolean>>

  /** Compute and update preview data for a step from its form data */
  updatePreview: <S extends WizardStepId>(
    stepId: S,
    formData: StepFormDataMap[S] | null,
  ) => PreviewDataMap[S] | null

  /** Get preview data typed for a specific step */
  getPreviewForStep: <S extends WizardStepId>(stepId: S) => PreviewDataMap[S] | null

  /** Build the full summary preview from all steps' form data */
  buildSummaryPreview: (
    allStepData: Partial<StepFormDataMap>,
    completedSteps: WizardStepId[],
    skippedSteps: WizardStepId[],
  ) => FullSummaryPreviewData

  /** Clear preview state */
  clearPreview: () => void
}

// ============================================================================
// Industry Label Map
// ============================================================================

/** Human-readable labels for industry sectors */
const INDUSTRY_LABELS: Record<string, string> = {
  fashion: 'Fashion & Apparel',
  industrial: 'Industrial & Manufacturing',
  food: 'Food & Beverage',
  electronics: 'Electronics & Technology',
  health_beauty: 'Health & Beauty',
  automotive: 'Automotive & Parts',
  custom: 'Custom Industry',
}

/** Industry descriptions */
const INDUSTRY_DESCRIPTIONS: Record<string, string> = {
  fashion: 'Clothing, accessories, and textile products with size/color variants',
  industrial: 'Manufacturing parts, components, and industrial equipment',
  food: 'Food products, beverages, and consumable goods with expiry tracking',
  electronics: 'Consumer electronics, components, and tech accessories',
  health_beauty: 'Cosmetics, personal care, supplements, and wellness products',
  automotive: 'Vehicle parts, accessories, and aftermarket components',
  custom: 'Start with a blank slate and configure everything manually',
}

// ============================================================================
// Language Label Map
// ============================================================================

/** Common language code to label mapping */
const LANGUAGE_LABELS: Record<string, string> = {
  tr: 'Turkish',
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  ar: 'Arabic',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  pl: 'Polish',
}

/** Currency symbol map */
const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  KRW: '₩',
  INR: '₹',
  RUB: '₽',
  BRL: 'R$',
}

// ============================================================================
// Per-Step Preview Transformers
// ============================================================================

/**
 * Transform Step 1 form data → Company card preview.
 */
function transformCompanyInfo(data: CompanyInfoData | null): CompanyCardPreviewData {
  return {
    company_name: data?.company_name ?? '',
    company_website: data?.company_website,
    company_size: data?.company_size,
    primary_role: data?.primary_role,
    existing_systems: data?.existing_systems ?? [],
    pain_points: data?.pain_points ?? [],
  }
}

/**
 * Transform Step 2 form data → Industry profile preview.
 */
function transformIndustrySelection(data: IndustrySelectionData | null): IndustryProfilePreviewData {
  const industry = data?.selected_industry
  return {
    selected_industry: industry,
    industry_label: industry ? (INDUSTRY_LABELS[industry] ?? industry) : undefined,
    industry_description: industry ? (INDUSTRY_DESCRIPTIONS[industry] ?? undefined) : undefined,
    sub_vertical: data?.industry_sub_vertical,
  }
}

/**
 * Transform Step 3 form data → Product diagram preview.
 */
function transformProductStructure(data: ProductStructureData | null): ProductDiagramPreviewData {
  return {
    estimated_sku_count: data?.estimated_sku_count,
    uses_variants: data?.uses_variants ?? false,
    variant_axes: data?.variant_axes ?? [],
    product_family_count: data?.product_family_count,
    custom_families: data?.custom_families ?? [],
    data_import_source: data?.data_import_source,
  }
}

/**
 * Transform Step 4 form data → Attribute tree preview.
 */
function transformAttributeConfig(data: AttributeConfigData | null): AttributeTreePreviewData {
  const groups: AttributeGroupPreview[] = []
  let totalAttributes = 0
  let customCount = 0
  let templateCount = 0
  let removedCount = data?.removed_template_attrs?.length ?? 0

  if (data?.attribute_groups) {
    for (const group of data.attribute_groups) {
      if (!group.enabled) continue

      const attrs = group.attributes
        .filter((a) => a.enabled)
        .map((a) => ({
          name: a.name,
          label: a.label,
          type: a.type,
          from_template: a.from_template,
        }))

      if (attrs.length > 0) {
        groups.push({
          name: group.name,
          label: group.label,
          attributes: attrs,
        })
        totalAttributes += attrs.length
        templateCount += attrs.filter((a) => a.from_template).length
        customCount += attrs.filter((a) => !a.from_template).length
      }
    }
  }

  // Add custom attributes that aren't in groups
  if (data?.custom_attributes) {
    for (const attr of data.custom_attributes) {
      customCount++
      totalAttributes++

      // Find or create group for the attribute
      const groupName = attr.group ?? 'custom'
      let group = groups.find((g) => g.name === groupName)
      if (!group) {
        group = { name: groupName, label: attr.group ?? 'Custom Attributes', attributes: [] }
        groups.push(group)
      }
      group.attributes.push({
        name: attr.name,
        label: attr.label,
        type: attr.type,
        from_template: false,
      })
    }
  }

  return {
    groups,
    total_attributes: totalAttributes,
    custom_count: customCount,
    template_count: templateCount,
    removed_count: removedCount,
  }
}

/**
 * Transform Step 5 form data → Category tree preview.
 */
function transformTaxonomy(data: TaxonomyData | null): CategoryTreePreviewData {
  const categories = data?.category_data ?? []
  const totalCategories = countCategoryNodes(categories)
  const maxDepth = getMaxDepth(categories)

  return {
    source: data?.category_source ?? 'template',
    categories,
    total_categories: totalCategories,
    max_depth: maxDepth,
    brands: data?.brand_names ?? [],
  }
}

/** Count total nodes in a category tree */
function countCategoryNodes(nodes: CategoryNode[]): number {
  let count = nodes.length
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      count += countCategoryNodes(node.children)
    }
  }
  return count
}

/** Get max depth of a category tree */
function getMaxDepth(nodes: CategoryNode[], depth = 1): number {
  if (nodes.length === 0) return 0
  let max = depth
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      const childDepth = getMaxDepth(node.children, depth + 1)
      if (childDepth > max) max = childDepth
    }
  }
  return max
}

/**
 * Transform Step 6 form data → Channel dashboard preview.
 */
function transformChannelSetup(data: ChannelSetupData | null): ChannelDashPreviewData {
  const selectedChannels = data?.selected_channels ?? []
  const primaryChannel = data?.primary_channel

  const channels: ChannelPreview[] = selectedChannels.map((ch) => ({
    id: ch,
    label: formatChannelLabel(ch),
    is_primary: ch === primaryChannel,
    is_active: true,
  }))

  return {
    channels,
    primary_channel: primaryChannel,
    business_model: data?.business_model,
  }
}

/** Format a channel ID into a human-readable label */
function formatChannelLabel(channelId: string): string {
  return channelId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Transform Step 7 form data → Locale grid preview.
 */
function transformLocalization(data: LocalizationData | null): LocaleGridPreviewData {
  const primaryLang = data?.primary_language ?? 'en'
  const additionalLangs = (data?.additional_languages ?? []).map((code) => ({
    code,
    label: LANGUAGE_LABELS[code] ?? code,
  }))

  return {
    primary_language: primaryLang,
    primary_language_label: LANGUAGE_LABELS[primaryLang] ?? primaryLang,
    additional_languages: additionalLangs,
    enable_auto_translate: data?.enable_auto_translate ?? false,
    default_currency: data?.default_currency,
    default_currency_symbol: data?.default_currency
      ? (CURRENCY_SYMBOLS[data.default_currency] ?? data.default_currency)
      : undefined,
    default_uom: data?.default_uom,
  }
}

/**
 * Transform Step 8 form data → Workflow diagram preview.
 */
function transformWorkflowPreferences(data: WorkflowPreferencesData | null): WorkflowDiagramPreviewData {
  const complexity: WorkflowComplexity = data?.workflow_complexity ?? 'simple'
  const states = buildWorkflowStates(complexity)

  return {
    workflow_complexity: complexity,
    states,
    require_quality_check: data?.require_quality_check ?? false,
    auto_publish: data?.auto_publish ?? false,
    notify_on_status_change: data?.notify_on_status_change ?? false,
  }
}

/** Build workflow state diagram based on complexity level */
function buildWorkflowStates(complexity: WorkflowComplexity): WorkflowStatePreview[] {
  switch (complexity) {
    case 'simple':
      return [
        { name: 'draft', label: 'Draft', color: '#94a3b8', is_initial: true, transitions_to: ['published'] },
        { name: 'published', label: 'Published', color: '#22c55e', is_final: true, transitions_to: [] },
      ]
    case 'standard':
      return [
        { name: 'draft', label: 'Draft', color: '#94a3b8', is_initial: true, transitions_to: ['review'] },
        { name: 'review', label: 'In Review', color: '#f59e0b', transitions_to: ['draft', 'published'] },
        { name: 'published', label: 'Published', color: '#22c55e', is_final: true, transitions_to: ['draft'] },
      ]
    case 'advanced':
      return [
        { name: 'draft', label: 'Draft', color: '#94a3b8', is_initial: true, transitions_to: ['enrichment'] },
        { name: 'enrichment', label: 'Enrichment', color: '#3b82f6', transitions_to: ['draft', 'review'] },
        { name: 'review', label: 'Review', color: '#f59e0b', transitions_to: ['enrichment', 'approved'] },
        { name: 'approved', label: 'Approved', color: '#8b5cf6', transitions_to: ['review', 'published'] },
        { name: 'published', label: 'Published', color: '#22c55e', is_final: true, transitions_to: ['draft'] },
      ]
    default:
      return [
        { name: 'draft', label: 'Draft', color: '#94a3b8', is_initial: true, transitions_to: ['published'] },
        { name: 'published', label: 'Published', color: '#22c55e', is_final: true, transitions_to: [] },
      ]
  }
}

/**
 * Transform Step 9 form data → Quality gauge preview.
 */
function transformQualityScoring(data: QualityScoringData | null): QualityGaugePreviewData {
  const weights: ScoringWeights = data?.scoring_weights ?? {
    attribute_completeness: 25,
    content_quality: 20,
    media_coverage: 25,
    seo_optimization: 15,
    compliance: 15,
  }

  const dimensions: QualityDimensionPreview[] = [
    { key: 'attribute_completeness', label: 'Attributes', weight: weights.attribute_completeness ?? 25, color: '#3b82f6' },
    { key: 'content_quality', label: 'Content', weight: weights.content_quality ?? 20, color: '#8b5cf6' },
    { key: 'media_coverage', label: 'Media', weight: weights.media_coverage ?? 25, color: '#f59e0b' },
    { key: 'seo_optimization', label: 'SEO', weight: weights.seo_optimization ?? 15, color: '#22c55e' },
    { key: 'compliance', label: 'Compliance', weight: weights.compliance ?? 15, color: '#ef4444' },
  ]

  return {
    quality_threshold: data?.quality_threshold ?? 75,
    scoring_weights: weights,
    dimensions,
  }
}

/**
 * Transform Step 10 form data → Integration board preview.
 */
function transformIntegrations(data: IntegrationsData | null): IntegrationBoardPreviewData {
  const integrations: IntegrationPreview[] = [
    {
      id: 'erp_sync',
      label: 'ERP Sync',
      description: 'Synchronize products with your ERP system',
      icon: 'refresh-cw',
      enabled: data?.enable_erp_sync ?? false,
      config_summary: data?.enable_erp_sync
        ? `${data.erp_type ?? 'ERPNext'} — ${formatSyncDirection(data.sync_direction)}`
        : undefined,
    },
    {
      id: 'ai_enrichment',
      label: 'AI Enrichment',
      description: 'Enhance product data with AI-generated content',
      icon: 'sparkles',
      enabled: data?.enable_ai_enrichment ?? false,
      config_summary: data?.enable_ai_enrichment
        ? `${data.ai_provider ?? 'Not configured'} — ${data.ai_use_cases?.length ?? 0} use cases`
        : undefined,
    },
    {
      id: 'gs1',
      label: 'GS1/GTIN',
      description: 'GS1 barcode and GTIN management',
      icon: 'barcode',
      enabled: data?.enable_gs1 ?? false,
    },
    {
      id: 'mdm',
      label: 'MDM',
      description: 'Master Data Management integration',
      icon: 'database',
      enabled: data?.enable_mdm ?? false,
    },
  ]

  const totalEnabled = integrations.filter((i) => i.enabled).length

  return {
    integrations,
    total_enabled: totalEnabled,
  }
}

/** Format sync direction for display */
function formatSyncDirection(direction?: string): string {
  switch (direction) {
    case 'pim_to_erp': return 'PIM → ERP'
    case 'erp_to_pim': return 'ERP → PIM'
    case 'bidirectional': return 'Bidirectional'
    default: return 'Not configured'
  }
}

/**
 * Transform Step 11 form data → Compliance list preview.
 */
function transformCompliance(data: ComplianceData | null): ComplianceListPreviewData {
  const standardDefs: Record<string, { label: string; description: string }> = {
    iso_9001: { label: 'ISO 9001', description: 'Quality management systems' },
    iso_14001: { label: 'ISO 14001', description: 'Environmental management' },
    gdpr: { label: 'GDPR', description: 'EU General Data Protection Regulation' },
    reach: { label: 'REACH', description: 'EU chemical substances regulation' },
    rohs: { label: 'RoHS', description: 'Restriction of hazardous substances' },
    ce_marking: { label: 'CE Marking', description: 'European conformity' },
    fda: { label: 'FDA', description: 'US Food and Drug Administration' },
    textile_labeling: { label: 'Textile Labeling', description: 'Fiber content and care labeling' },
    cpsia: { label: 'CPSIA', description: 'Consumer Product Safety Improvement Act' },
    prop65: { label: 'Prop 65', description: 'California Proposition 65 warning' },
  }

  const selectedStandards = data?.compliance_standards ?? []
  const standards: ComplianceStandardPreview[] = selectedStandards.map((id) => {
    const def = standardDefs[id]
    return {
      id,
      label: def?.label ?? id,
      description: def?.description ?? '',
      enabled: true,
    }
  })

  return {
    standards,
    certification_tracking: data?.certification_tracking ?? false,
    total_standards: standards.length,
  }
}

/**
 * Transform Step 12 form data → Full summary preview.
 *
 * Aggregates preview data from all 12 steps into a single summary view.
 */
function transformSummaryLaunch(
  allStepData: Partial<StepFormDataMap>,
  completedSteps: WizardStepId[],
  skippedSteps: WizardStepId[],
): FullSummaryPreviewData {
  return {
    company: transformCompanyInfo(allStepData.company_info ?? null),
    industry: transformIndustrySelection(allStepData.industry_selection ?? null),
    product_structure: transformProductStructure(allStepData.product_structure ?? null),
    attributes: transformAttributeConfig(allStepData.attribute_config ?? null),
    taxonomy: transformTaxonomy(allStepData.taxonomy ?? null),
    channels: transformChannelSetup(allStepData.channel_setup ?? null),
    localization: transformLocalization(allStepData.localization ?? null),
    workflow: transformWorkflowPreferences(allStepData.workflow_preferences ?? null),
    quality: transformQualityScoring(allStepData.quality_scoring ?? null),
    integrations: transformIntegrations(allStepData.integrations ?? null),
    compliance: transformCompliance(allStepData.compliance ?? null),
    total_steps_completed: completedSteps.length,
    total_steps: 12,
    skipped_steps: skippedSteps,
    ready_to_launch: completedSteps.length + skippedSteps.length >= 11,
  }
}

// ============================================================================
// Preview Transformer Dispatcher
// ============================================================================

/** Map of step ID to its preview transformer function */
const PREVIEW_TRANSFORMERS: Record<
  WizardStepId,
  (data: unknown) => PreviewData
> = {
  company_info: (d) => transformCompanyInfo(d as CompanyInfoData | null),
  industry_selection: (d) => transformIndustrySelection(d as IndustrySelectionData | null),
  product_structure: (d) => transformProductStructure(d as ProductStructureData | null),
  attribute_config: (d) => transformAttributeConfig(d as AttributeConfigData | null),
  taxonomy: (d) => transformTaxonomy(d as TaxonomyData | null),
  channel_setup: (d) => transformChannelSetup(d as ChannelSetupData | null),
  localization: (d) => transformLocalization(d as LocalizationData | null),
  workflow_preferences: (d) => transformWorkflowPreferences(d as WorkflowPreferencesData | null),
  quality_scoring: (d) => transformQualityScoring(d as QualityScoringData | null),
  integrations: (d) => transformIntegrations(d as IntegrationsData | null),
  compliance: (d) => transformCompliance(d as ComplianceData | null),
  summary_launch: (d) => transformSummaryLaunch(
    (d as { allStepData: Partial<StepFormDataMap> })?.allStepData ?? {},
    (d as { completedSteps: WizardStepId[] })?.completedSteps ?? [],
    (d as { skippedSteps: WizardStepId[] })?.skippedSteps ?? [],
  ),
}

// ============================================================================
// Composable
// ============================================================================

/**
 * Vue 3 composable for computing live preview data from wizard form state.
 *
 * Transforms raw form data into display-ready preview data for the
 * right panel of the split-panel wizard layout. Updates happen in real
 * time as users fill out form fields — no backend call required.
 *
 * Each step has a dedicated transformer that knows how to convert
 * that step's StepFormData into its PreviewData type.
 *
 * @example
 * ```ts
 * const { previewData, updatePreview, buildSummaryPreview } = useLivePreview()
 *
 * // Update preview as user types
 * watch(formData, (data) => {
 *   updatePreview('company_info', data)
 * }, { deep: true })
 *
 * // Build summary for final step
 * const summary = buildSummaryPreview(allStepData, completed, skipped)
 * ```
 */
export function useLivePreview(): UseLivePreviewReturn {
  // ==========================================================================
  // Reactive State
  // ==========================================================================

  const previewData = ref<PreviewData | null>(null)
  const activeStepId = ref<WizardStepId | null>(null)
  const hasPreview = computed(() => previewData.value !== null)

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Compute and update preview data for a specific step.
   *
   * Transforms the form data through the step's preview transformer
   * and stores the result in reactive state.
   *
   * @param stepId - The wizard step to generate preview for
   * @param formData - Current form data for the step
   * @returns The computed preview data, or null if no transformer exists
   */
  function updatePreview<S extends WizardStepId>(
    stepId: S,
    formData: StepFormDataMap[S] | null,
  ): PreviewDataMap[S] | null {
    activeStepId.value = stepId

    const transformer = PREVIEW_TRANSFORMERS[stepId]
    if (!transformer) {
      previewData.value = null
      return null
    }

    const result = transformer(formData) as PreviewDataMap[S]
    previewData.value = result
    return result
  }

  /**
   * Get preview data typed for a specific step.
   *
   * @param stepId - The step to get preview for
   * @returns Typed preview data or null
   */
  function getPreviewForStep<S extends WizardStepId>(
    stepId: S,
  ): PreviewDataMap[S] | null {
    if (activeStepId.value !== stepId || !previewData.value) {
      return null
    }
    return previewData.value as PreviewDataMap[S]
  }

  /**
   * Build the full summary preview from all steps' form data.
   *
   * Used by Step 12 (Summary & Launch) to aggregate all wizard
   * selections into a single comprehensive preview.
   *
   * @param allStepData - Form data from all completed steps
   * @param completedSteps - IDs of completed steps
   * @param skippedSteps - IDs of skipped steps
   * @returns Complete summary preview data
   */
  function buildSummaryPreview(
    allStepData: Partial<StepFormDataMap>,
    completedSteps: WizardStepId[],
    skippedSteps: WizardStepId[],
  ): FullSummaryPreviewData {
    const summary = transformSummaryLaunch(allStepData, completedSteps, skippedSteps)
    activeStepId.value = 'summary_launch'
    previewData.value = summary
    return summary
  }

  /**
   * Clear all preview state.
   */
  function clearPreview(): void {
    previewData.value = null
    activeStepId.value = null
  }

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    previewData: readonly(previewData),
    activeStepId: readonly(activeStepId),
    hasPreview: readonly(hasPreview) as DeepReadonly<Ref<boolean>>,
    updatePreview,
    getPreviewForStep,
    buildSummaryPreview,
    clearPreview,
  }
}
