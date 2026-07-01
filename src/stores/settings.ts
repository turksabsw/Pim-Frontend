/**
 * Pinia store for PIM Settings management.
 *
 * Manages the PIM Settings singleton DocType which controls:
 * - ERP Integration (sync direction, auto-sync, variant creation)
 * - Channel Settings (default channel, export format)
 * - AI Enrichment (provider, model, approval workflow)
 * - Data Quality (scoring, minimum thresholds, auto-scan)
 * - GS1/GDSN Settings (validation, GLN, data pool)
 * - Media Settings (thumbnails, size limits, formats)
 *
 * Uses the Frappe Resource API to read/write the PIM Settings singleton.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useFrappeAPI } from '@/composables/useFrappeAPI'
import type { FrappeEntity } from '@/types'

// ============================================================================
// Settings Type Definition
// ============================================================================

/** Sync direction options */
export type SyncDirection = 'PIM to ERP' | 'ERP to PIM' | 'Bidirectional'

/** AI provider options */
export type AIProvider = '' | 'OpenAI' | 'Anthropic' | 'Google Gemini' | 'Azure OpenAI'

/** Export format options */
export type ExportFormat = 'JSON' | 'XML' | 'CSV' | 'XLSX' | 'BMEcat'

/** GS1 data pool options */
export type GS1DataPool = '' | '1WorldSync' | 'SA2 Worldsync' | 'EDITEUR' | 'GS1 Turkey'

/** PIM Settings - maps to the PIM Settings singleton DocType */
export interface PIMSettings extends FrappeEntity {
  // ERP Integration
  enable_erp_sync: boolean
  auto_create_variant_from_item: boolean
  sync_direction: SyncDirection
  sync_on_save: boolean

  // Channel Settings
  default_channel?: string
  auto_publish_to_default: boolean
  default_export_format: ExportFormat

  // AI Enrichment
  enable_ai_enrichment: boolean
  ai_provider: AIProvider
  ai_api_key?: string
  ai_model?: string
  ai_require_approval: boolean

  // Data Quality
  enable_quality_scoring: boolean
  minimum_quality_score: number
  block_publish_below_minimum: boolean
  auto_scan_on_save: boolean

  // GS1/GDSN Settings
  enable_gs1_validation: boolean
  gln?: string
  gs1_data_pool: GS1DataPool
  data_pool_api_key?: string

  // Media Settings
  auto_generate_thumbnails: boolean
  thumbnail_size: number
  max_image_size_mb: number
  allowed_image_formats: string
}

/** Settings section identifiers for UI grouping */
export type SettingsSection =
  | 'erp_integration'
  | 'channel'
  | 'ai_enrichment'
  | 'data_quality'
  | 'gs1_gdsn'
  | 'media'

/** Default settings values (matching DocType defaults) */
const DEFAULT_SETTINGS: Partial<PIMSettings> = {
  enable_erp_sync: true,
  auto_create_variant_from_item: false,
  sync_direction: 'Bidirectional',
  sync_on_save: true,
  auto_publish_to_default: false,
  default_export_format: 'JSON',
  enable_ai_enrichment: false,
  ai_provider: '',
  ai_require_approval: true,
  enable_quality_scoring: true,
  minimum_quality_score: 60,
  block_publish_below_minimum: false,
  auto_scan_on_save: true,
  enable_gs1_validation: false,
  gs1_data_pool: '',
  auto_generate_thumbnails: true,
  thumbnail_size: 150,
  max_image_size_mb: 10,
  allowed_image_formats: 'jpg,jpeg,png,webp,gif',
}

export const useSettingsStore = defineStore('settings', () => {
  // =========================================================================
  // State
  // =========================================================================

  /** The current PIM settings from the backend */
  const settings = ref<PIMSettings | null>(null)

  /** Whether settings have been loaded from the backend */
  const initialized = ref(false)

  /** Loading state for fetch operations */
  const loading = ref(false)

  /** Loading state for save operations */
  const saving = ref(false)

  /** Error from the last API operation */
  const error = ref<string | null>(null)

  /** Success message after save */
  const successMessage = ref<string | null>(null)

  /** Whether there are unsaved changes */
  const isDirty = ref(false)

  /** Snapshot of settings before editing (for dirty tracking) */
  const originalSettings = ref<string>('')

  // =========================================================================
  // Computed
  // =========================================================================

  /** Whether ERP sync is enabled */
  const erpSyncEnabled = computed(() => settings.value?.enable_erp_sync ?? true)

  /** Whether AI enrichment is enabled */
  const aiEnrichmentEnabled = computed(() => settings.value?.enable_ai_enrichment ?? false)

  /** Whether quality scoring is enabled */
  const qualityScoringEnabled = computed(() => settings.value?.enable_quality_scoring ?? true)

  /** Whether GS1 validation is enabled */
  const gs1ValidationEnabled = computed(() => settings.value?.enable_gs1_validation ?? false)

  /** Current sync direction */
  const syncDirection = computed(() => settings.value?.sync_direction ?? 'Bidirectional')

  /** Allowed image format list as an array */
  const allowedImageFormatsList = computed<string[]>(() => {
    const formats = settings.value?.allowed_image_formats ?? 'jpg,jpeg,png,webp,gif'
    return formats.split(',').map((f) => f.trim()).filter(Boolean)
  })

  /** Whether the settings are in a loading or saving state */
  const isBusy = computed(() => loading.value || saving.value)

  // =========================================================================
  // Actions
  // =========================================================================

  const api = useFrappeAPI()

  /**
   * Fetch PIM Settings from the backend.
   * PIM Settings is a singleton DocType, so we fetch it by its fixed name.
   */
  async function fetchSettings(): Promise<void> {
    loading.value = true
    error.value = null
    successMessage.value = null

    try {
      const result = await api.getDoc<PIMSettings>('PIM Settings', 'PIM Settings')
      settings.value = result
      originalSettings.value = JSON.stringify(result)
      isDirty.value = false
      initialized.value = true
    } catch (err) {
      // If settings don't exist yet, use defaults
      const errMsg = err instanceof Error ? err.message : String(err)
      if (errMsg.includes('not found') || errMsg.includes('DoesNotExistError')) {
        settings.value = { ...DEFAULT_SETTINGS } as PIMSettings
        originalSettings.value = JSON.stringify(settings.value)
        isDirty.value = false
        initialized.value = true
      } else {
        error.value = errMsg
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Save the current settings to the backend.
   */
  async function saveSettings(): Promise<boolean> {
    if (!settings.value) return false

    saving.value = true
    error.value = null
    successMessage.value = null

    try {
      const result = await api.updateDoc<PIMSettings>(
        'PIM Settings',
        'PIM Settings',
        settings.value,
      )
      settings.value = result
      originalSettings.value = JSON.stringify(result)
      isDirty.value = false
      successMessage.value = 'Settings saved successfully'
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save settings'
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Update a single setting field and mark as dirty.
   */
  function updateSetting<K extends keyof PIMSettings>(
    field: K,
    value: PIMSettings[K],
  ): void {
    if (!settings.value) return
    settings.value[field] = value
    isDirty.value = JSON.stringify(settings.value) !== originalSettings.value
  }

  /**
   * Update multiple settings fields at once.
   */
  function updateSettings(updates: Partial<PIMSettings>): void {
    if (!settings.value) return
    Object.assign(settings.value, updates)
    isDirty.value = JSON.stringify(settings.value) !== originalSettings.value
  }

  /**
   * Revert settings to the last saved state.
   */
  function revertSettings(): void {
    if (originalSettings.value) {
      try {
        settings.value = JSON.parse(originalSettings.value) as PIMSettings
        isDirty.value = false
      } catch {
        // If parsing fails, re-fetch
        fetchSettings()
      }
    }
  }

  /**
   * Reset settings to defaults.
   * Note: This only updates local state. Call saveSettings() to persist.
   */
  function resetToDefaults(): void {
    if (!settings.value) return
    Object.assign(settings.value, DEFAULT_SETTINGS)
    isDirty.value = JSON.stringify(settings.value) !== originalSettings.value
  }

  /**
   * Get a single setting value with a type-safe default.
   */
  function getSetting<K extends keyof PIMSettings>(
    field: K,
    defaultValue?: PIMSettings[K],
  ): PIMSettings[K] | undefined {
    if (!settings.value) return defaultValue
    return settings.value[field] ?? defaultValue
  }

  /**
   * Clear error and success messages.
   */
  function clearMessages(): void {
    error.value = null
    successMessage.value = null
  }

  /**
   * Clear the error state.
   */
  function clearError(): void {
    error.value = null
  }

  /**
   * Reset the store to initial state.
   */
  function $reset(): void {
    settings.value = null
    initialized.value = false
    loading.value = false
    saving.value = false
    error.value = null
    successMessage.value = null
    isDirty.value = false
    originalSettings.value = ''
  }

  return {
    // State
    settings,
    initialized,
    loading,
    saving,
    error,
    successMessage,
    isDirty,

    // Computed
    erpSyncEnabled,
    aiEnrichmentEnabled,
    qualityScoringEnabled,
    gs1ValidationEnabled,
    syncDirection,
    allowedImageFormatsList,
    isBusy,

    // Actions
    fetchSettings,
    saveSettings,
    updateSetting,
    updateSettings,
    revertSettings,
    resetToDefaults,
    getSetting,
    clearMessages,
    clearError,
    $reset,
  }
})
