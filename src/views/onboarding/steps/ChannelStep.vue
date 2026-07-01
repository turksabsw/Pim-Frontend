<script setup lang="ts">
/**
 * ChannelStep - Configure sales and distribution channels.
 *
 * Collects:
 * - Active channels with implemented vs coming-soon distinction
 * - Primary channel selection
 * - Business model (B2C, B2B, B2B2C, marketplace, omnichannel)
 * - Marketplace integrations
 *
 * Channels are split into two groups:
 * - Implemented: Shopify, Amazon, Trendyol (fully supported)
 * - Coming Soon: HB, N11, Etsy, WooCommerce, Google Merchant
 */
import { reactive, computed, watch, onMounted } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import type { ChannelSetupData, StepFormData, BusinessModel } from '@/types'

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
// Channel Definitions
// ============================================================================

interface ChannelOption {
  value: string
  label: string
  description: string
  status: 'implemented' | 'coming_soon'
}

const AVAILABLE_CHANNELS: readonly ChannelOption[] = [
  // Implemented channels
  { value: 'shopify', label: 'Shopify', description: 'Full e-commerce storefront integration', status: 'implemented' },
  { value: 'amazon', label: 'Amazon', description: 'Amazon marketplace seller integration', status: 'implemented' },
  { value: 'trendyol', label: 'Trendyol', description: 'Trendyol marketplace integration', status: 'implemented' },
  { value: 'own_website', label: 'Own Website', description: 'Your own e-commerce website', status: 'implemented' },
  { value: 'retail', label: 'Retail / POS', description: 'Physical stores and point-of-sale', status: 'implemented' },
  { value: 'wholesale', label: 'Wholesale / B2B', description: 'Bulk sales to business customers', status: 'implemented' },
  // Coming soon channels
  { value: 'hepsiburada', label: 'Hepsiburada', description: 'Hepsiburada marketplace (coming soon)', status: 'coming_soon' },
  { value: 'n11', label: 'N11', description: 'N11 marketplace (coming soon)', status: 'coming_soon' },
  { value: 'etsy', label: 'Etsy', description: 'Etsy handmade marketplace (coming soon)', status: 'coming_soon' },
  { value: 'woocommerce', label: 'WooCommerce', description: 'WordPress e-commerce plugin (coming soon)', status: 'coming_soon' },
  { value: 'google_merchant', label: 'Google Merchant', description: 'Google Shopping product feed (coming soon)', status: 'coming_soon' },
] as const

const IMPLEMENTED_CHANNELS = AVAILABLE_CHANNELS.filter((c) => c.status === 'implemented')
const COMING_SOON_CHANNELS = AVAILABLE_CHANNELS.filter((c) => c.status === 'coming_soon')

// ============================================================================
// Business Model Options
// ============================================================================

const BUSINESS_MODELS: readonly { value: BusinessModel; label: string; description: string }[] = [
  { value: 'b2c', label: 'B2C', description: 'Direct to consumer sales' },
  { value: 'b2b', label: 'B2B', description: 'Business to business sales' },
  { value: 'b2b2c', label: 'B2B2C', description: 'Sell through business partners to consumers' },
  { value: 'marketplace', label: 'Marketplace', description: 'Multi-seller marketplace platform' },
  { value: 'omnichannel', label: 'Omnichannel', description: 'Unified experience across all channels' },
] as const

// ============================================================================
// Form State
// ============================================================================

/** Load initial data from store or props */
function getInitialData(): ChannelSetupData {
  const storeData = store.getWizardStepData('channel_setup')
  const source = storeData ?? props.data

  return {
    selected_channels: (source?.selected_channels as string[]) ?? (source?.channels as string[]) ?? [],
    primary_channel: (source?.primary_channel as string) ?? '',
    business_model: (source?.business_model as BusinessModel) ?? undefined,
    marketplace_integrations: (source?.marketplace_integrations as string[]) ?? [],
  }
}

const form = reactive<ChannelSetupData>(getInitialData())

/** Sync initial data to store on mount */
onMounted(() => {
  store.setWizardStepData('channel_setup', { ...form })
})

// ============================================================================
// Computed
// ============================================================================

/** Whether any implemented channels are selected */
const hasSelectedChannels = computed(() => {
  return (form.selected_channels?.length ?? 0) > 0
})

/** Implemented channels that are selected (for primary channel dropdown) */
const selectedImplementedChannels = computed(() => {
  return IMPLEMENTED_CHANNELS.filter((c) => isChannelSelected(c.value))
})

// ============================================================================
// Channel Toggle
// ============================================================================

/** Toggle a channel on/off (only implemented channels can be toggled) */
function toggleChannel(channel: ChannelOption): void {
  if (channel.status === 'coming_soon') return

  if (!form.selected_channels) {
    form.selected_channels = []
  }
  const idx = form.selected_channels.indexOf(channel.value)
  if (idx >= 0) {
    form.selected_channels.splice(idx, 1)
    // Clear primary if removed
    if (form.primary_channel === channel.value) {
      form.primary_channel = form.selected_channels[0] ?? ''
    }
  } else {
    form.selected_channels.push(channel.value)
    // Set as primary if first channel
    if (form.selected_channels.length === 1) {
      form.primary_channel = channel.value
    }
  }
}

/** Check if a channel is selected */
function isChannelSelected(channel: string): boolean {
  return form.selected_channels?.includes(channel) ?? false
}

// ============================================================================
// Watchers & Submit
// ============================================================================

/** Emit form data changes to parent and sync to store */
watch(
  form,
  (newVal) => {
    const data = { ...newVal }
    store.setWizardStepData('channel_setup', data)
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
    <!-- Implemented Channels -->
    <div>
      <label class="mb-3 block text-sm font-medium text-gray-900 dark:text-white">
        Active Sales Channels
      </label>
      <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Select the channels you currently sell through.
      </p>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          v-for="channel in IMPLEMENTED_CHANNELS"
          :key="channel.value"
          class="flex items-start gap-3 rounded-lg border p-3 text-left transition-all duration-200"
          :class="
            isChannelSelected(channel.value)
              ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-300'
          "
          @click="toggleChannel(channel)"
        >
          <div
            class="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border"
            :class="
              isChannelSelected(channel.value)
                ? 'border-primary-600 bg-primary-600'
                : 'border-gray-300 dark:border-gray-600'
            "
          >
            <svg
              v-if="isChannelSelected(channel.value)"
              class="h-3 w-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ channel.label }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ channel.description }}</p>
          </div>
        </button>
      </div>
    </div>

    <!-- Coming Soon Channels -->
    <div>
      <label class="mb-3 block text-sm font-medium text-gray-900 dark:text-white">
        Coming Soon
      </label>
      <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
        These integrations are under development and will be available soon.
      </p>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="channel in COMING_SOON_CHANNELS"
          :key="channel.value"
          class="flex items-start gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800 p-3 opacity-60"
        >
          <div
            class="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-gray-300"
          >
            <svg
              class="h-3 w-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">{{ channel.label }}</p>
            <p class="text-xs text-gray-400">{{ channel.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Primary Channel -->
    <div v-if="selectedImplementedChannels.length > 1">
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white" for="primary_channel">
        Primary Channel
      </label>
      <select
        id="primary_channel"
        v-model="form.primary_channel"
        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      >
        <option
          v-for="channel in selectedImplementedChannels"
          :key="channel.value"
          :value="channel.value"
        >
          {{ channel.label }}
        </option>
      </select>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Product data will be optimized for this channel by default.
      </p>
    </div>

    <!-- Business Model -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        Business Model
      </label>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="model in BUSINESS_MODELS"
          :key="model.value"
          class="rounded-lg border p-3 text-left transition-all duration-200"
          :class="
            form.business_model === model.value
              ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-300'
          "
          @click="form.business_model = model.value"
        >
          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ model.label }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ model.description }}</p>
        </button>
      </div>
    </div>

    <!-- Info callout -->
    <div class="flex items-start gap-2 rounded-lg bg-white dark:bg-gray-800 p-3">
      <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        You can add or modify channels later in Settings. This helps us configure
        the right attribute sets and data quality rules for your needs.
      </p>
    </div>
  </div>
</template>
