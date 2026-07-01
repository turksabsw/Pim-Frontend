<script setup lang="ts">
/**
 * LocaleGridPreview - Live preview for Step 7 (Localization).
 *
 * Renders a language/locale grid showing:
 * - Primary language with flag indicator
 * - Additional language cards in a grid
 * - Auto-translate toggle status
 * - Default currency and UOM settings
 *
 * Updates in real time as the user configures localization.
 * Receives transformed preview data from useLivePreview composable.
 */
import { computed } from 'vue'
import type { LocaleGridPreviewData } from '@/types'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  data: LocaleGridPreviewData
}>()

// ============================================================================
// Display Helpers
// ============================================================================

/** Language flag emojis (ISO 639-1 to country flag) */
const LANGUAGE_FLAGS: Record<string, string> = {
  en: '&#127468;&#127463;',
  tr: '&#127481;&#127479;',
  de: '&#127465;&#127466;',
  fr: '&#127467;&#127479;',
  es: '&#127466;&#127480;',
  it: '&#127470;&#127481;',
  pt: '&#127463;&#127479;',
  nl: '&#127475;&#127473;',
  ja: '&#127471;&#127477;',
  zh: '&#127464;&#127475;',
  ko: '&#127472;&#127479;',
  ar: '&#127480;&#127462;',
  hi: '&#127470;&#127475;',
  ru: '&#127479;&#127482;',
  pl: '&#127477;&#127473;',
  sv: '&#127480;&#127466;',
  da: '&#127465;&#127472;',
  no: '&#127475;&#127476;',
  fi: '&#127467;&#127470;',
}

/** Default flag for unknown languages */
const DEFAULT_FLAG = '&#127760;'

/** Whether there is any locale data to display */
const hasContent = computed(() => {
  return !!(
    props.data.primary_language ||
    props.data.additional_languages.length > 0 ||
    props.data.default_currency
  )
})

/** Total language count (primary + additional) */
const totalLanguages = computed(() => {
  return 1 + props.data.additional_languages.length
})

/** Get flag HTML for a language code */
function getFlag(code: string): string {
  return LANGUAGE_FLAGS[code] ?? DEFAULT_FLAG
}
</script>

<template>
  <div class="space-y-4">
    <!-- Summary Stats -->
    <div v-if="hasContent" class="grid grid-cols-3 gap-2">
      <div class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-3 text-center">
        <p class="text-lg font-semibold text-primary-600">{{ totalLanguages }}</p>
        <p class="text-[10px] text-gray-500 dark:text-gray-400">Languages</p>
      </div>
      <div class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-3 text-center">
        <p class="text-lg font-semibold" :class="data.enable_auto_translate ? 'text-green-600' : 'text-gray-400'">
          {{ data.enable_auto_translate ? 'On' : 'Off' }}
        </p>
        <p class="text-[10px] text-gray-500 dark:text-gray-400">Auto-Translate</p>
      </div>
      <div class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-3 text-center">
        <p class="text-lg font-semibold text-amber-600">
          {{ data.default_currency_symbol ?? '—' }}
        </p>
        <p class="text-[10px] text-gray-500 dark:text-gray-400">Currency</p>
      </div>
    </div>

    <!-- Primary Language Card -->
    <div v-if="data.primary_language" class="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/50 p-4 shadow-sm">
      <div class="flex items-center gap-3">
        <!-- Flag -->
        <div
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-700 text-xl shadow-sm"
          v-html="getFlag(data.primary_language)"
        />

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ data.primary_language_label ?? data.primary_language }}
            </h3>
            <span class="rounded-full bg-primary-100 dark:bg-primary-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-400">
              Primary
            </span>
          </div>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Default language for all product content
          </p>
        </div>
      </div>
    </div>

    <!-- Additional Languages Grid -->
    <div v-if="data.additional_languages.length > 0" class="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 shadow-sm">
      <div class="border-b border-gray-100 dark:border-gray-600 px-4 py-3">
        <h4 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Additional Languages
        </h4>
      </div>

      <div class="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-600 p-px">
        <div
          v-for="lang in data.additional_languages"
          :key="lang.code"
          class="flex items-center gap-2.5 bg-white dark:bg-gray-700 p-3"
        >
          <!-- Flag -->
          <span class="text-base" v-html="getFlag(lang.code)" />

          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-medium text-gray-900 dark:text-white">
              {{ lang.label }}
            </p>
            <p class="text-[10px] uppercase text-gray-500 dark:text-gray-400">
              {{ lang.code }}
            </p>
          </div>

          <!-- Status Dot -->
          <span class="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
        </div>
      </div>
    </div>

    <!-- Regional Settings -->
    <div
      v-if="data.default_currency || data.default_uom"
      class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-4"
    >
      <h4 class="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Regional Settings
      </h4>

      <div class="space-y-2.5">
        <!-- Currency -->
        <div v-if="data.default_currency" class="flex items-center gap-2">
          <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-amber-100 dark:bg-amber-900/40">
            <svg class="h-3.5 w-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-medium text-gray-900 dark:text-white">
              {{ data.default_currency }}
            </p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">Default Currency</p>
          </div>
        </div>

        <!-- UOM -->
        <div v-if="data.default_uom" class="flex items-center gap-2">
          <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-slate-100 dark:bg-slate-900/40">
            <svg class="h-3.5 w-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-medium text-gray-900 dark:text-white">
              {{ data.default_uom }}
            </p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">Default Unit of Measure</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Auto-Translate Feature -->
    <div
      v-if="data.enable_auto_translate && data.additional_languages.length > 0"
      class="flex items-center gap-2 rounded-lg border border-green-100 dark:border-green-800 bg-green-50 dark:bg-green-900/30 p-3"
    >
      <svg class="h-4 w-4 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      <p class="text-xs text-green-700 dark:text-green-400">
        Auto-translate enabled for <strong>{{ data.additional_languages.length }}</strong>
        additional {{ data.additional_languages.length === 1 ? 'language' : 'languages' }}
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-if="!hasContent"
      class="flex flex-col items-center justify-center py-8 text-center"
    >
      <svg
        class="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
      <p class="text-sm text-gray-500 dark:text-gray-400">Configure localization to see language settings</p>
    </div>
  </div>
</template>
