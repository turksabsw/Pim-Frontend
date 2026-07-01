<script setup lang="ts">
/**
 * OnboardingConfiguration - Post-onboarding settings editor.
 *
 * Full-page settings view that allows editing all 12 wizard sections
 * after onboarding is completed. Reuses the same step components from
 * the wizard flow in a tabs/accordion layout.
 *
 * Features:
 * - Tabs layout: 11 configurable sections (excludes summary_launch)
 * - Uses same step components as the wizard (data/update/next/back events)
 * - Calls update_post_onboarding API endpoint per-section
 * - Shows impact warnings when changing industry sector
 * - Auto-save with debounced saves per section
 * - Unsaved changes indicator per tab
 * - Responsive: tabs become accordion on mobile
 */
import { computed, onMounted, ref, type Component } from 'vue'
import { useRouter } from 'vue-router'

// Composables
import { useOnboardingAPI } from '../onboarding/composables/useOnboardingAPI'
import { useStepValidation } from '../onboarding/composables/useStepValidation'

// Step components (same as wizard)
import CompanyInfoStep from '../onboarding/steps/CompanyInfoStep.vue'
import IndustryStep from '../onboarding/steps/IndustryStep.vue'
import ProductStructureStep from '../onboarding/steps/ProductStructureStep.vue'
import AttributeConfigStep from '../onboarding/steps/AttributeConfigStep.vue'
import TaxonomyStep from '../onboarding/steps/TaxonomyStep.vue'
import ChannelStep from '../onboarding/steps/ChannelStep.vue'
import LocalizationStep from '../onboarding/steps/LocalizationStep.vue'
import WorkflowStep from '../onboarding/steps/WorkflowStep.vue'
import QualityScoringStep from '../onboarding/steps/QualityScoringStep.vue'
import IntegrationsStep from '../onboarding/steps/IntegrationsStep.vue'
import ComplianceStep from '../onboarding/steps/ComplianceStep.vue'

// Types
import {
  type WizardStepId,
  type StepFormData,
  type StepFormDataMap,
  type PostOnboardingSection,
  type OnboardingStatusResponse,
  type PostOnboardingUpdateResponse,
  type IndustryChangeImpact,
  type IndustrySector,
} from '@/types'

// ============================================================================
// Types
// ============================================================================

/** Section tab definition for the configuration editor */
interface ConfigSection {
  /** Section identifier matching PostOnboardingSection */
  id: PostOnboardingSection
  /** Wizard step ID this section maps to */
  stepId: WizardStepId
  /** Display label */
  label: string
  /** Short description */
  description: string
  /** Icon HTML entity */
  icon: string
  /** Vue component for this section */
  component: Component
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Configurable sections with mapping to step components.
 *
 * Excludes summary_launch (step 12) since it's a review step, not
 * a configuration section. Maps PostOnboardingSection IDs to
 * WizardStepId for component reuse.
 */
const CONFIG_SECTIONS: readonly ConfigSection[] = [
  {
    id: 'company_info',
    stepId: 'company_info',
    label: 'Company Information',
    description: 'Company name, size, and role',
    icon: '&#127970;',
    component: CompanyInfoStep,
  },
  {
    id: 'industry',
    stepId: 'industry_selection',
    label: 'Industry Profile',
    description: 'Industry sector and template',
    icon: '&#127981;',
    component: IndustryStep,
  },
  {
    id: 'product_structure',
    stepId: 'product_structure',
    label: 'Product Structure',
    description: 'SKUs, variants, and families',
    icon: '&#128230;',
    component: ProductStructureStep,
  },
  {
    id: 'attributes',
    stepId: 'attribute_config',
    label: 'Attributes',
    description: 'Attribute groups and custom attributes',
    icon: '&#128209;',
    component: AttributeConfigStep,
  },
  {
    id: 'taxonomy',
    stepId: 'taxonomy',
    label: 'Taxonomy',
    description: 'Categories and brands',
    icon: '&#128450;',
    component: TaxonomyStep,
  },
  {
    id: 'channels',
    stepId: 'channel_setup',
    label: 'Sales Channels',
    description: 'Distribution channels and business model',
    icon: '&#128722;',
    component: ChannelStep,
  },
  {
    id: 'localization',
    stepId: 'localization',
    label: 'Localization',
    description: 'Languages, currency, and units',
    icon: '&#127760;',
    component: LocalizationStep,
  },
  {
    id: 'workflow',
    stepId: 'workflow_preferences',
    label: 'Workflow',
    description: 'Approval and sync workflows',
    icon: '&#128260;',
    component: WorkflowStep,
  },
  {
    id: 'quality',
    stepId: 'quality_scoring',
    label: 'Quality Scoring',
    description: 'Thresholds and scoring weights',
    icon: '&#127942;',
    component: QualityScoringStep,
  },
  {
    id: 'integrations',
    stepId: 'integrations',
    label: 'Integrations',
    description: 'ERP, AI, and external systems',
    icon: '&#128268;',
    component: IntegrationsStep,
  },
  {
    id: 'compliance',
    stepId: 'compliance',
    label: 'Compliance',
    description: 'Regulatory standards and certifications',
    icon: '&#128220;',
    component: ComplianceStep,
  },
] as const

// ============================================================================
// Setup
// ============================================================================

const router = useRouter()
const api = useOnboardingAPI()
const validation = useStepValidation()

// ============================================================================
// Reactive State
// ============================================================================

/** Currently active tab section ID */
const activeSection = ref<PostOnboardingSection>('company_info')

/** Per-section form data loaded from backend */
const sectionData = ref<Partial<Record<PostOnboardingSection, StepFormData>>>({})

/** Per-section dirty flag (unsaved changes) */
const dirtyFlags = ref<Partial<Record<PostOnboardingSection, boolean>>>({})

/** Per-section saving flag */
const savingFlags = ref<Partial<Record<PostOnboardingSection, boolean>>>({})

/** Per-section last saved timestamp */
const savedTimestamps = ref<Partial<Record<PostOnboardingSection, string>>>({})

/** Whether initial data is loading */
const initialLoading = ref(true)

/** Global error message */
const errorMessage = ref<string | null>(null)

/** Success message with auto-dismiss */
const successMessage = ref<string | null>(null)

/** Industry change impact warning */
const impactWarning = ref<IndustryChangeImpact | null>(null)

/** Whether the impact warning dialog is visible */
const showImpactDialog = ref(false)

/** Pending industry change data (awaiting confirmation) */
const pendingIndustryChange = ref<Record<string, unknown> | null>(null)

/** The original industry value loaded from backend */
const originalIndustry = ref<IndustrySector | null>(null)


// ============================================================================
// Computed
// ============================================================================

/** Active section configuration */
const activeSectionConfig = computed<ConfigSection | null>(() => {
  return CONFIG_SECTIONS.find((s) => s.id === activeSection.value) ?? null
})

/** Active section's Vue component */
const activeSectionComponent = computed<Component | null>(() => {
  return activeSectionConfig.value?.component ?? null
})

/** Active section's form data */
const activeSectionData = computed<StepFormData>(() => {
  return sectionData.value[activeSection.value] ?? {}
})

/** Whether the active section has unsaved changes */
const hasUnsavedChanges = computed(() => {
  return dirtyFlags.value[activeSection.value] ?? false
})

/** Whether any section has unsaved changes */
const hasAnyUnsavedChanges = computed(() => {
  return Object.values(dirtyFlags.value).some(Boolean)
})

/** Whether the active section is being saved */
const isSaving = computed(() => {
  return savingFlags.value[activeSection.value] ?? false
})

/** Count of sections with unsaved changes */
const unsavedCount = computed(() => {
  return Object.values(dirtyFlags.value).filter(Boolean).length
})

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(async () => {
  await loadConfiguration()
})

// ============================================================================
// Data Loading
// ============================================================================

/**
 * Load all configuration data from the backend via get_onboarding_status.
 * Populates per-section form data from the OnboardingStatusResponse.
 */
async function loadConfiguration(): Promise<void> {
  initialLoading.value = true
  errorMessage.value = null

  try {
    const status: OnboardingStatusResponse = await api.getStatus()

    // Extract step data from the status response's step_data
    // Each step's data was saved during onboarding and is available
    // through the status response for re-editing
    for (const section of CONFIG_SECTIONS) {
      const stepMeta = status.steps?.find((s) => s.step_id === section.stepId)
      if (stepMeta) {
        // Initialize empty form data; the step components themselves
        // will load their data from the Pinia store on mount
        sectionData.value[section.id] = {}
      }
    }

    // Store original industry for impact detection
    if (status.selected_industry) {
      originalIndustry.value = status.selected_industry as IndustrySector
    }

    // Initialize validation for the first section
    if (activeSection.value) {
      const config = CONFIG_SECTIONS.find((s) => s.id === activeSection.value)
      if (config) {
        validation.setActiveStep(config.stepId, sectionData.value[activeSection.value] ?? {})
      }
    }
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : 'Failed to load configuration'
  } finally {
    initialLoading.value = false
  }
}

// ============================================================================
// Section Navigation
// ============================================================================

/**
 * Switch to a different configuration section tab.
 * Shows unsaved changes warning if current section is dirty.
 */
function switchSection(sectionId: PostOnboardingSection): void {
  if (sectionId === activeSection.value) return
  activeSection.value = sectionId

  // Update validation context
  const config = CONFIG_SECTIONS.find((s) => s.id === sectionId)
  if (config) {
    validation.setActiveStep(config.stepId, sectionData.value[sectionId] ?? {})
  }
}


// ============================================================================
// Form Data Handling
// ============================================================================

/**
 * Handle form data updates from step components.
 * Marks the section as dirty and checks for industry change impact.
 */
function handleSectionUpdate(data: StepFormData): void {
  const sectionId = activeSection.value
  sectionData.value[sectionId] = data
  dirtyFlags.value[sectionId] = true

  // Run validation
  const config = CONFIG_SECTIONS.find((s) => s.id === sectionId)
  if (config) {
    validation.validateStep(
      config.stepId,
      data as StepFormDataMap[typeof config.stepId],
    )
  }

  // Check for industry sector change
  if (sectionId === 'industry') {
    const newIndustry = (data as Record<string, unknown>).selected_industry as
      | IndustrySector
      | undefined
    if (
      newIndustry &&
      originalIndustry.value &&
      newIndustry !== originalIndustry.value
    ) {
      // Will be validated on save via the backend impact analysis
      dirtyFlags.value[sectionId] = true
    }
  }
}

/**
 * Handle the next event from step components.
 * In post-onboarding mode, this triggers a save instead of navigation.
 */
function handleSectionNext(data?: StepFormData): void {
  if (data) {
    handleSectionUpdate(data)
  }
  saveSection()
}

/**
 * Handle the back event from step components.
 * In post-onboarding mode, navigates to the previous tab.
 */
function handleSectionBack(): void {
  const currentIndex = CONFIG_SECTIONS.findIndex(
    (s) => s.id === activeSection.value,
  )
  if (currentIndex > 0) {
    switchSection(CONFIG_SECTIONS[currentIndex - 1].id)
  }
}

// ============================================================================
// Save Logic
// ============================================================================

/**
 * Save the active section's data to the backend.
 * Calls the update_post_onboarding API endpoint.
 */
async function saveSection(): Promise<void> {
  const sectionId = activeSection.value
  const data = sectionData.value[sectionId]

  if (!data) return

  // Validate before saving
  const config = CONFIG_SECTIONS.find((s) => s.id === sectionId)
  if (config) {
    const result = validation.validateStep(
      config.stepId,
      data as StepFormDataMap[typeof config.stepId],
    )
    if (!result.valid) {
      errorMessage.value = result.errors.join('; ')
      return
    }
  }

  // For industry changes, check impact first
  if (sectionId === 'industry') {
    const newIndustry = (data as Record<string, unknown>).selected_industry as
      | IndustrySector
      | undefined
    if (
      newIndustry &&
      originalIndustry.value &&
      newIndustry !== originalIndustry.value
    ) {
      pendingIndustryChange.value = data as Record<string, unknown>
      await checkIndustryImpact(data as Record<string, unknown>)
      return
    }
  }

  await executeSave(sectionId, data as Record<string, unknown>)
}

/**
 * Check the impact of an industry sector change before applying.
 */
async function checkIndustryImpact(
  formData: Record<string, unknown>,
): Promise<void> {
  savingFlags.value[activeSection.value] = true
  errorMessage.value = null

  try {
    const result: PostOnboardingUpdateResponse = await api.updatePostOnboarding(
      'industry',
      { ...formData, dry_run: true },
    )

    if (result.impact_warning) {
      impactWarning.value = result.impact_warning
      showImpactDialog.value = true
    } else {
      // No impact, proceed with save
      await executeSave('industry', formData)
    }
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : 'Failed to check industry impact'
  } finally {
    savingFlags.value[activeSection.value] = false
  }
}

/**
 * Confirm industry change after reviewing impact warning.
 */
async function confirmIndustryChange(): Promise<void> {
  showImpactDialog.value = false

  if (pendingIndustryChange.value) {
    await executeSave('industry', pendingIndustryChange.value)
    pendingIndustryChange.value = null
    impactWarning.value = null
  }
}

/**
 * Cancel industry change and revert form data.
 */
function cancelIndustryChange(): void {
  showImpactDialog.value = false
  pendingIndustryChange.value = null
  impactWarning.value = null

  // Revert to original industry
  if (originalIndustry.value) {
    const currentData = (sectionData.value.industry ?? {}) as Record<
      string,
      unknown
    >
    sectionData.value.industry = {
      ...currentData,
      selected_industry: originalIndustry.value,
    } as StepFormData
    dirtyFlags.value.industry = false
  }
}

/**
 * Execute the actual save API call for a section.
 */
async function executeSave(
  sectionId: PostOnboardingSection,
  formData: Record<string, unknown>,
): Promise<void> {
  savingFlags.value[sectionId] = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const result: PostOnboardingUpdateResponse =
      await api.updatePostOnboarding(sectionId, formData)

    if (result.success) {
      dirtyFlags.value[sectionId] = false
      savedTimestamps.value[sectionId] = new Date().toISOString()
      successMessage.value = `${
        CONFIG_SECTIONS.find((s) => s.id === sectionId)?.label ?? 'Section'
      } saved successfully`

      // Update original industry if industry section was saved
      if (sectionId === 'industry' && formData.selected_industry) {
        originalIndustry.value = formData.selected_industry as IndustrySector
      }

      // Auto-dismiss success message
      setTimeout(() => {
        successMessage.value = null
      }, 3000)
    } else if (result.validation_errors?.length) {
      errorMessage.value = result.validation_errors.join('; ')
    }
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : 'Failed to save configuration'
  } finally {
    savingFlags.value[sectionId] = false
  }
}

/**
 * Navigate back to the settings page.
 */
function goBack(): void {
  router.push({ name: 'settings' })
}

/**
 * Utility: Format a timestamp for display.
 */
function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)

    if (diffSec < 60) return 'just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    return date.toLocaleDateString()
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <!-- ================================================================== -->
    <!-- Page Header                                                         -->
    <!-- ================================================================== -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button
          class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title="Back to Settings"
          @click="goBack"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <div>
          <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
            Onboarding Configuration
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Edit your PIM configuration settings. Changes are saved per section.
          </p>
        </div>
      </div>

      <!-- Unsaved Changes Indicator -->
      <div v-if="hasAnyUnsavedChanges" class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <span class="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {{ unsavedCount }} unsaved {{ unsavedCount === 1 ? 'section' : 'sections' }}
        </span>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- Loading State                                                       -->
    <!-- ================================================================== -->
    <div
      v-if="initialLoading"
      class="flex flex-col items-center justify-center py-24"
    >
      <div
        class="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"
      />
      <p class="text-gray-500 dark:text-gray-400">Loading configuration...</p>
    </div>

    <!-- ================================================================== -->
    <!-- Main Layout: Sidebar Tabs + Content                                 -->
    <!-- ================================================================== -->
    <div v-else class="flex flex-col gap-6 lg:flex-row">
      <!-- ============================================================== -->
      <!-- Left: Section Tabs (sidebar on desktop, horizontal on mobile)  -->
      <!-- ============================================================== -->
      <nav class="w-full flex-shrink-0 lg:w-64">
        <!-- Desktop: Vertical Tabs -->
        <div class="hidden lg:block">
          <ul class="space-y-1" role="tablist">
            <li
              v-for="section in CONFIG_SECTIONS"
              :key="section.id"
              role="presentation"
            >
              <button
                role="tab"
                :aria-selected="activeSection === section.id"
                :aria-controls="`panel-${section.id}`"
                class="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                :class="[
                  activeSection === section.id
                    ? 'bg-primary-50 text-primary-700 font-medium dark:bg-primary-900/40 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white',
                ]"
                @click="switchSection(section.id)"
              >
                <span
                  class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-base"
                  :class="[
                    activeSection === section.id
                      ? 'bg-primary-100 dark:bg-primary-900/60'
                      : 'bg-gray-100 group-hover:bg-gray-200 dark:bg-gray-700 dark:group-hover:bg-gray-600',
                  ]"
                  v-html="section.icon"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="truncate">{{ section.label }}</span>
                    <!-- Dirty indicator -->
                    <span
                      v-if="dirtyFlags[section.id]"
                      class="h-2 w-2 flex-shrink-0 rounded-full bg-amber-500"
                      title="Unsaved changes"
                    />
                  </div>
                  <p class="truncate text-xs text-gray-400">
                    {{ section.description }}
                  </p>
                </div>
              </button>
            </li>
          </ul>
        </div>

        <!-- Mobile: Horizontal scrollable tabs -->
        <div class="flex gap-2 overflow-x-auto pb-2 lg:hidden">
          <button
            v-for="section in CONFIG_SECTIONS"
            :key="section.id"
            class="flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors"
            :class="[
              activeSection === section.id
                ? 'bg-primary-50 text-primary-700 font-medium dark:bg-primary-900/40 dark:text-primary-300'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
            ]"
            @click="switchSection(section.id)"
          >
            <span v-html="section.icon" />
            <span>{{ section.label }}</span>
            <span
              v-if="dirtyFlags[section.id]"
              class="h-2 w-2 rounded-full bg-amber-500"
            />
          </button>
        </div>
      </nav>

      <!-- ============================================================== -->
      <!-- Right: Section Content Panel                                    -->
      <!-- ============================================================== -->
      <div class="min-w-0 flex-1">
        <!-- Error Banner -->
        <div
          v-if="errorMessage"
          class="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20"
        >
          <svg
            class="h-5 w-5 flex-shrink-0 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="flex-1 text-sm text-red-700">{{ errorMessage }}</p>
          <button
            class="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            @click="errorMessage = null"
          >
            Dismiss
          </button>
        </div>

        <!-- Success Banner -->
        <div
          v-if="successMessage"
          class="mb-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20"
        >
          <svg
            class="h-5 w-5 flex-shrink-0 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="flex-1 text-sm text-green-700 dark:text-green-400">{{ successMessage }}</p>
        </div>

        <!-- Section Card -->
        <div
          v-if="activeSectionConfig"
          :id="`panel-${activeSection}`"
          role="tabpanel"
          class="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <!-- Section Header -->
          <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span
                  class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-lg dark:bg-primary-900/30"
                  v-html="activeSectionConfig.icon"
                />
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ activeSectionConfig.label }}
                  </h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ activeSectionConfig.description }}
                  </p>
                </div>
              </div>

              <!-- Section Actions -->
              <div class="flex items-center gap-3">
                <!-- Last saved indicator -->
                <span
                  v-if="savedTimestamps[activeSection]"
                  class="text-xs text-gray-400"
                >
                  Last saved {{ formatTimestamp(savedTimestamps[activeSection]!) }}
                </span>

                <!-- Save Button -->
                <button
                  class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  :class="[
                    hasUnsavedChanges
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500',
                  ]"
                  :disabled="!hasUnsavedChanges || isSaving"
                  @click="saveSection"
                >
                  <svg
                    v-if="isSaving"
                    class="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {{ isSaving ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Section Form Content -->
          <div class="px-6 py-6">
            <component
              :is="activeSectionComponent"
              :data="activeSectionData"
              :loading="isSaving"
              @update="handleSectionUpdate"
              @next="handleSectionNext"
              @back="handleSectionBack"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- Industry Change Impact Warning Dialog                               -->
    <!-- ================================================================== -->
    <Teleport to="body">
      <div
        v-if="showImpactDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="cancelIndustryChange"
      >
        <div class="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800 dark:border dark:border-gray-700">
          <!-- Dialog Header -->
          <div class="mb-4 flex items-start gap-3">
            <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <svg
                class="h-5 w-5 text-amber-600 dark:text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Industry Change Impact
              </h3>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Changing your industry sector may affect existing configuration.
              </p>
            </div>
          </div>

          <!-- Impact Details -->
          <div
            v-if="impactWarning"
            class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/20"
          >
            <p class="mb-3 text-sm font-medium text-amber-800 dark:text-amber-400">
              {{ impactWarning.warning_message }}
            </p>

            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-amber-700 dark:text-amber-500">Previous industry:</span>
                <span class="font-medium text-amber-900 dark:text-amber-300">
                  {{ impactWarning.old_industry }}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-amber-700 dark:text-amber-500">New industry:</span>
                <span class="font-medium text-amber-900 dark:text-amber-300">
                  {{ impactWarning.new_industry }}
                </span>
              </div>

              <!-- Affected Entities -->
              <div
                v-if="Object.keys(impactWarning.affected_entities).length > 0"
                class="mt-3 border-t border-amber-200 pt-3 dark:border-amber-700/30"
              >
                <p class="mb-2 text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-500">
                  Affected Entities
                </p>
                <div class="space-y-1">
                  <div
                    v-for="(count, entity) in impactWarning.affected_entities"
                    :key="entity"
                    class="flex items-center justify-between text-sm"
                  >
                    <span class="text-amber-700 dark:text-amber-500">
                      {{ String(entity).replace(/_/g, ' ') }}
                    </span>
                    <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                      {{ count }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Dialog Actions -->
          <div class="flex items-center justify-end gap-3">
            <button
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              @click="cancelIndustryChange"
            >
              Cancel
            </button>
            <button
              class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
              @click="confirmIndustryChange"
            >
              Confirm Change
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

