<script setup lang="ts">
/**
 * LocalizationStep - Configure language, translation, currency, and UOM settings.
 *
 * Collects:
 * - Primary language (required)
 * - Additional languages (multi-select)
 * - Auto-translate toggle (AI-powered translation)
 * - Default currency
 * - Default unit of measure (UOM)
 */
import { reactive, computed, watch, onMounted } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import type { LocalizationData, StepFormData } from '@/types'

const props = defineProps<{
  data: Record<string, unknown>
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update', data: StepFormData): void
  (e: 'next', data: StepFormData): void
  (e: 'back'): void
}>()

const store = useOnboardingStore()

// ============================================================================
// Language Options
// ============================================================================

const LANGUAGES: readonly { value: string; label: string }[] = [
  { value: 'tr', label: 'Turkish' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ar', label: 'Arabic' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ru', label: 'Russian' },
  { value: 'pl', label: 'Polish' },
] as const

// ============================================================================
// Currency Options
// ============================================================================

const CURRENCIES: readonly { value: string; label: string; symbol: string }[] = [
  { value: 'TRY', label: 'Turkish Lira', symbol: '₺' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { value: 'CNY', label: 'Chinese Yuan', symbol: '¥' },
  { value: 'KRW', label: 'Korean Won', symbol: '₩' },
  { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { value: 'RUB', label: 'Russian Ruble', symbol: '₽' },
  { value: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
] as const

// ============================================================================
// UOM Options
// ============================================================================

const UOMS: readonly { value: string; label: string }[] = [
  { value: 'Unit', label: 'Unit (pcs)' },
  { value: 'Kg', label: 'Kilogram (kg)' },
  { value: 'Gram', label: 'Gram (g)' },
  { value: 'Litre', label: 'Litre (L)' },
  { value: 'Metre', label: 'Metre (m)' },
  { value: 'Box', label: 'Box' },
  { value: 'Pack', label: 'Pack' },
  { value: 'Set', label: 'Set' },
  { value: 'Pair', label: 'Pair' },
  { value: 'Dozen', label: 'Dozen' },
] as const

// ============================================================================
// Form State
// ============================================================================

/** Load initial data from store or props */
function getInitialData(): LocalizationData {
  const storeData = store.getWizardStepData('localization')
  const source = storeData ?? props.data

  return {
    primary_language: (source?.primary_language as string) ?? 'tr',
    additional_languages: (source?.additional_languages as string[]) ?? [],
    enable_auto_translate: (source?.enable_auto_translate as boolean) ?? false,
    default_currency: (source?.default_currency as string) ?? 'TRY',
    default_uom: (source?.default_uom as string) ?? 'Unit',
  }
}

const form = reactive<LocalizationData>(getInitialData())

/** Sync initial data to store on mount */
onMounted(() => {
  store.setWizardStepData('localization', { ...form })
})

// ============================================================================
// Computed
// ============================================================================

/** Languages available for additional selection (excludes primary) */
const availableAdditionalLanguages = computed(() => {
  return LANGUAGES.filter((lang) => lang.value !== form.primary_language)
})

/** Whether additional languages are selected */
const hasAdditionalLanguages = computed(() => {
  return (form.additional_languages?.length ?? 0) > 0
})

// ============================================================================
// Language Toggle
// ============================================================================

/** Toggle an additional language on/off */
function toggleAdditionalLanguage(langCode: string): void {
  if (!form.additional_languages) {
    form.additional_languages = []
  }
  const idx = form.additional_languages.indexOf(langCode)
  if (idx >= 0) {
    form.additional_languages.splice(idx, 1)
  } else {
    form.additional_languages.push(langCode)
  }
  // Disable auto-translate if no additional languages
  if (form.additional_languages.length === 0) {
    form.enable_auto_translate = false
  }
}

/** Check if an additional language is selected */
function isLanguageSelected(langCode: string): boolean {
  return form.additional_languages?.includes(langCode) ?? false
}

// ============================================================================
// Watchers & Submit
// ============================================================================

/** When primary language changes, remove it from additional languages */
watch(
  () => form.primary_language,
  (newPrimary) => {
    if (form.additional_languages?.includes(newPrimary ?? '')) {
      form.additional_languages = form.additional_languages.filter((l) => l !== newPrimary)
    }
  },
)

/** Emit form data changes to parent and sync to store */
watch(
  form,
  (newVal) => {
    const data = { ...newVal }
    store.setWizardStepData('localization', data)
    emit('update', data)
  },
  { deep: true },
)

function handleSubmit(): void {
  emit('next', { ...form })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Primary Language -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white" for="primary_language">
        Primary Language
      </label>
      <select
        id="primary_language"
        v-model="form.primary_language"
        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      >
        <option
          v-for="lang in LANGUAGES"
          :key="lang.value"
          :value="lang.value"
        >
          {{ lang.label }}
        </option>
      </select>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        The default language for product content and interface.
      </p>
    </div>

    <!-- Additional Languages -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        Additional Languages
      </label>
      <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Select additional languages for translated product content.
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="lang in availableAdditionalLanguages"
          :key="lang.value"
          class="rounded-full border px-3 py-1.5 text-sm transition-all duration-200"
          :class="
            isLanguageSelected(lang.value)
              ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-400'
              : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
          "
          @click="toggleAdditionalLanguage(lang.value)"
        >
          {{ lang.label }}
        </button>
      </div>
    </div>

    <!-- Auto-Translate Toggle -->
    <div v-if="hasAdditionalLanguages" class="rounded-lg border border-gray-300 dark:border-gray-600 p-4">
      <div class="flex items-start gap-3">
        <input
          id="enable_auto_translate"
          v-model="form.enable_auto_translate"
          type="checkbox"
          class="mt-0.5 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
        />
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-900 dark:text-white" for="enable_auto_translate">
            Enable AI Auto-Translation
          </label>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Automatically translate product titles, descriptions, and attributes
            to selected languages using AI. Translations can be reviewed and edited.
          </p>
        </div>
      </div>
    </div>

    <!-- Currency & UOM Row -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Default Currency -->
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white" for="default_currency">
          Default Currency
        </label>
        <select
          id="default_currency"
          v-model="form.default_currency"
          class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        >
          <option
            v-for="currency in CURRENCIES"
            :key="currency.value"
            :value="currency.value"
          >
            {{ currency.symbol }} {{ currency.label }} ({{ currency.value }})
          </option>
        </select>
      </div>

      <!-- Default UOM -->
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white" for="default_uom">
          Default Unit of Measure
        </label>
        <select
          id="default_uom"
          v-model="form.default_uom"
          class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        >
          <option
            v-for="uom in UOMS"
            :key="uom.value"
            :value="uom.value"
          >
            {{ uom.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Info callout -->
    <div class="flex items-start gap-2 rounded-lg bg-white dark:bg-gray-800 p-3">
      <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Language and currency settings can be updated anytime in PIM Settings.
        Additional languages enable multi-language product content for different markets.
      </p>
    </div>
  </div>
</template>
