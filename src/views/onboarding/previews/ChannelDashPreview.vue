<script setup lang="ts">
/**
 * ChannelDashPreview - Live preview for Step 6 (Channel Setup).
 *
 * Renders a channel dashboard grid showing:
 * - Active channels as grid cards with status badges
 * - Primary channel highlight
 * - Business model indicator
 * - Channel count summary
 *
 * Updates in real time as the user configures channels.
 * Receives transformed preview data from useLivePreview composable.
 */
import { computed } from 'vue'
import type { ChannelDashPreviewData, ChannelPreview, BusinessModel } from '@/types'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  data: ChannelDashPreviewData
}>()

// ============================================================================
// Display Helpers
// ============================================================================

/** Channel visual metadata: icon SVG path and Tailwind color classes */
const CHANNEL_META: Record<string, {
  icon: string
  bgColor: string
  textColor: string
}> = {
  web_store: {
    icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  marketplace: {
    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
    bgColor: 'bg-purple-100 dark:bg-purple-900/40',
    textColor: 'text-purple-600 dark:text-purple-400',
  },
  retail_pos: {
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    bgColor: 'bg-green-100 dark:bg-green-900/40',
    textColor: 'text-green-600 dark:text-green-400',
  },
  social_commerce: {
    icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z',
    bgColor: 'bg-pink-100 dark:bg-pink-900/40',
    textColor: 'text-pink-600 dark:text-pink-400',
  },
  wholesale: {
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  mobile_app: {
    icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/40',
    textColor: 'text-cyan-600 dark:text-cyan-400',
  },
  print_catalog: {
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    bgColor: 'bg-orange-100 dark:bg-orange-900/40',
    textColor: 'text-orange-600 dark:text-orange-400',
  },
}

/** Default channel metadata for unknown channels */
const DEFAULT_CHANNEL_META = {
  icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  bgColor: 'bg-gray-100 dark:bg-gray-700',
  textColor: 'text-gray-600 dark:text-gray-400',
}

/** Business model labels */
const BUSINESS_MODEL_LABELS: Record<string, string> = {
  b2c: 'B2C — Direct to Consumer',
  b2b: 'B2B — Business to Business',
  b2b2c: 'B2B2C — Hybrid Model',
  marketplace: 'Marketplace',
  omnichannel: 'Omnichannel',
}

/** Whether there are any channels to display */
const hasContent = computed(() => {
  return props.data.channels.length > 0
})

/** Active channels count */
const activeCount = computed(() => {
  return props.data.channels.filter((ch) => ch.is_active).length
})

/** Get visual metadata for a channel */
function getChannelMeta(id: string): { icon: string; bgColor: string; textColor: string } {
  return CHANNEL_META[id] ?? DEFAULT_CHANNEL_META
}
</script>

<template>
  <div class="space-y-4">
    <!-- Channel Summary Header -->
    <div v-if="hasContent" class="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-5 shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Sales Channels
          </h4>
          <p class="mt-1 text-sm text-gray-900 dark:text-white">
            <span class="font-semibold text-primary-600">{{ activeCount }}</span>
            {{ activeCount === 1 ? 'channel' : 'channels' }} active
          </p>
        </div>

        <!-- Business Model Badge -->
        <span
          v-if="data.business_model"
          class="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400"
        >
          {{ BUSINESS_MODEL_LABELS[data.business_model] ?? data.business_model }}
        </span>
      </div>
    </div>

    <!-- Channel Grid -->
    <div v-if="hasContent" class="grid grid-cols-2 gap-2">
      <div
        v-for="channel in data.channels"
        :key="channel.id"
        class="relative overflow-hidden rounded-lg border bg-white dark:bg-gray-700 p-3 transition-shadow hover:shadow-sm"
        :class="channel.is_primary ? 'border-primary-300 dark:border-primary-700 ring-1 ring-primary-100 dark:ring-primary-900' : 'border-gray-100 dark:border-gray-600'"
      >
        <!-- Primary Badge -->
        <span
          v-if="channel.is_primary"
          class="absolute right-1.5 top-1.5 rounded-full bg-primary-100 dark:bg-primary-900/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300"
        >
          Primary
        </span>

        <!-- Channel Icon -->
        <div
          class="mb-2 flex h-8 w-8 items-center justify-center rounded-lg"
          :class="getChannelMeta(channel.id).bgColor"
        >
          <svg
            class="h-4 w-4"
            :class="getChannelMeta(channel.id).textColor"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="getChannelMeta(channel.id).icon"
            />
          </svg>
        </div>

        <!-- Channel Label -->
        <p class="truncate text-xs font-medium text-gray-900 dark:text-white">
          {{ channel.label }}
        </p>

        <!-- Active Status -->
        <div class="mt-1 flex items-center gap-1">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
          <span class="text-[10px] text-gray-500 dark:text-gray-400">Active</span>
        </div>
      </div>
    </div>

    <!-- Primary Channel Indicator -->
    <div
      v-if="data.primary_channel && hasContent"
      class="rounded-lg border border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-700 dark:bg-gray-700 p-4"
    >
      <h4 class="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Primary Channel
      </h4>
      <div class="flex items-center gap-2">
        <div
          class="flex h-6 w-6 items-center justify-center rounded"
          :class="getChannelMeta(data.primary_channel).bgColor"
        >
          <svg
            class="h-3.5 w-3.5"
            :class="getChannelMeta(data.primary_channel).textColor"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="getChannelMeta(data.primary_channel).icon"
            />
          </svg>
        </div>
        <span class="text-sm font-medium text-gray-900 dark:text-white">
          {{ data.channels.find(ch => ch.is_primary)?.label ?? data.primary_channel }}
        </span>
      </div>
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
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
        />
      </svg>
      <p class="text-sm text-gray-500 dark:text-gray-400">Select your sales channels to see the dashboard</p>
    </div>
  </div>
</template>
