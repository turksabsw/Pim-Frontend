<script setup lang="ts">
/**
 * IndustryStep - Industry sector selection step (Step 2).
 *
 * Collects:
 * - Industry sector (7 options: fashion, industrial, food, electronics,
 *   health_beauty, automotive, custom) — required
 * - Industry sub-vertical (optional text)
 * - Custom industry name (shown when 'custom' is selected)
 *
 * Also maintains legacy fields for backward compatibility:
 * - archetype (mirrors selected_industry)
 * - product_count_estimate
 * - has_variants
 *
 * Integrates with the onboarding store to:
 * - Read/write step data via Pinia store
 * - Fetch template preview for selected sector
 * - Expose isValid for wizard navigation control
 */
import { reactive, onMounted, ref, watch } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import type { IndustrySelectionData, StepFormData, IndustrySector } from '@/types'

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
const showPreview = ref(false)

/** 7-sector industry display metadata with icons and colors */
const INDUSTRY_SECTORS: readonly {
  value: IndustrySector
  label: string
  description: string
  icon: string
  color: string
}[] = [
  {
    value: 'fashion',
    label: 'Fashion & Apparel',
    description: 'Clothing, footwear, accessories with size/color variants',
    icon: '&#128087;',
    color: 'bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800 hover:border-pink-400 dark:hover:border-pink-600',
  },
  {
    value: 'industrial',
    label: 'Industrial & Manufacturing',
    description: 'Parts, components, machinery with technical specifications',
    icon: '&#9881;',
    color: 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600',
  },
  {
    value: 'food',
    label: 'Food & Beverage',
    description: 'Food products with nutritional data, allergens, expiry tracking',
    icon: '&#127828;',
    color: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600',
  },
  {
    value: 'electronics',
    label: 'Electronics & Technology',
    description: 'Gadgets, components, devices with detailed tech specs',
    icon: '&#128187;',
    color: 'bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800 hover:border-cyan-400 dark:hover:border-cyan-600',
  },
  {
    value: 'health_beauty',
    label: 'Health & Beauty',
    description: 'Cosmetics, skincare, supplements with ingredient tracking',
    icon: '&#128142;',
    color: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600',
  },
  {
    value: 'automotive',
    label: 'Automotive & Spare Parts',
    description: 'Vehicle parts, accessories with fitment and OE numbers',
    icon: '&#128663;',
    color: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600',
  },
  {
    value: 'custom',
    label: 'Custom / Other',
    description: 'Start with a blank slate and configure everything manually',
    icon: '&#128295;',
    color: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
  },
] as const

/** Sub-vertical suggestions per sector */
const SUB_VERTICALS: Partial<Record<IndustrySector, string[]>> = {
  fashion: ['Luxury', 'Fast Fashion', 'Sportswear', 'Lingerie', 'Childrenswear', 'Footwear'],
  industrial: ['Automotive Parts', 'Electronics Components', 'Heavy Machinery', 'Fasteners', 'Tools'],
  food: ['Packaged Food', 'Fresh Produce', 'Beverages', 'Bakery', 'Dairy', 'Organic'],
  electronics: ['Consumer Electronics', 'Computer Hardware', 'Mobile Devices', 'IoT', 'Components'],
  health_beauty: ['Skincare', 'Haircare', 'Makeup', 'Supplements', 'Medical Devices'],
  automotive: ['OEM Parts', 'Aftermarket', 'Tyres', 'Accessories', 'Lubricants'],
}

/** Load initial data from store or props */
function getInitialData(): IndustrySelectionData {
  const storeData = store.getWizardStepData('industry_selection')
  const source = storeData ?? props.data

  return {
    selected_industry: (source?.selected_industry as IndustrySector) ??
      (source?.archetype as IndustrySector) ??
      (store.selectedIndustry as IndustrySector) ??
      ('' as IndustrySector),
    industry_sub_vertical: (source?.industry_sub_vertical as string) ?? '',
    custom_industry_name: (source?.custom_industry_name as string) ?? '',
    // Legacy fields
    archetype: (source?.archetype as string) ?? '',
    product_count_estimate: (source?.product_count_estimate as string) ?? '',
    has_variants: (source?.has_variants as boolean) ?? false,
  }
}

const form = reactive<IndustrySelectionData>(getInitialData())

/** Sync initial data to store on mount */
onMounted(async () => {
  store.setWizardStepData('industry_selection', { ...form })

  // Fetch archetypes for legacy compatibility
  if (store.archetypes.length === 0) {
    await store.fetchArchetypes()
  }

  // Show preview if sector is already selected
  if (form.selected_industry) {
    await previewSector(form.selected_industry, false)
  }
})

/** Get display style for a sector card */
function getSectorStyle(sector: IndustrySector): string {
  const sectorMeta = INDUSTRY_SECTORS.find((s) => s.value === sector)
  const baseColor = sectorMeta?.color ?? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
  const selected = form.selected_industry === sector
    ? 'ring-2 ring-primary-500 border-primary-500'
    : ''
  return `${baseColor} ${selected}`
}

/** Select a sector and fetch its template preview */
async function selectSector(sector: IndustrySector): Promise<void> {
  form.selected_industry = sector
  // Sync legacy archetype field
  form.archetype = sector
  form.industry_sub_vertical = ''
  form.custom_industry_name = ''

  await previewSector(sector, true)
}

/** Fetch template preview for a sector */
async function previewSector(sector: IndustrySector, animate: boolean): Promise<void> {
  if (animate) {
    showPreview.value = false
  }
  await store.fetchTemplatePreview(sector)
  showPreview.value = true
}

/** Available sub-verticals for the selected sector */
function getSubVerticals(): string[] {
  if (!form.selected_industry || form.selected_industry === 'custom') return []
  return SUB_VERTICALS[form.selected_industry] ?? []
}

/** Emit form data changes to parent and sync to store */
watch(
  form,
  (newVal) => {
    const data = { ...newVal }
    store.setWizardStepData('industry_selection', data)
    emit('update', data)
  },
  { deep: true },
)

function isValid(): boolean {
  if (!form.selected_industry) return false
  // If custom is selected, require a custom industry name
  if (form.selected_industry === 'custom') {
    return (form.custom_industry_name ?? '').trim().length > 0
  }
  return true
}

function handleSubmit(): void {
  if (isValid()) {
    emit('next', { ...form })
  }
}

defineExpose({ isValid })
</script>

<template>
  <div class="space-y-6">
    <!-- Sector Selection Grid (7 cards) -->
    <div>
      <label class="mb-3 block text-sm font-medium text-gray-900 dark:text-white">
        Select your industry profile <span class="text-red-500">*</span>
      </label>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          v-for="sector in INDUSTRY_SECTORS"
          :key="sector.value"
          class="flex items-start gap-3 rounded-lg border p-4 text-left transition-all duration-200"
          :class="getSectorStyle(sector.value)"
          @click="selectSector(sector.value)"
        >
          <span class="text-2xl" v-html="sector.icon" />
          <div class="flex-1">
            <p class="font-medium text-gray-900 dark:text-white">{{ sector.label }}</p>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ sector.description }}</p>
          </div>
          <div v-if="form.selected_industry === sector.value" class="flex-shrink-0">
            <svg class="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </button>
      </div>
    </div>

    <!-- Custom Industry Name (shown when 'custom' selected) -->
    <div v-if="form.selected_industry === 'custom'">
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white" for="custom_industry_name">
        Industry Name <span class="text-red-500">*</span>
      </label>
      <input
        id="custom_industry_name"
        v-model="form.custom_industry_name"
        type="text"
        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        placeholder="Describe your industry"
      />
    </div>

    <!-- Sub-Vertical (shown when sector has sub-verticals) -->
    <div v-if="getSubVerticals().length > 0">
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white" for="industry_sub_vertical">
        Sub-Vertical
      </label>
      <select
        id="industry_sub_vertical"
        v-model="form.industry_sub_vertical"
        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      >
        <option value="">Select a sub-vertical (optional)</option>
        <option
          v-for="sub in getSubVerticals()"
          :key="sub"
          :value="sub"
        >
          {{ sub }}
        </option>
      </select>
    </div>

    <!-- Template Preview -->
    <div
      v-if="showPreview && store.templatePreview"
      class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-4"
    >
      <h3 class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
        What this template creates:
      </h3>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div class="rounded-md bg-white dark:bg-gray-700 p-2.5 text-center">
          <p class="text-lg font-semibold text-primary-600">{{ store.templatePreview.attribute_count }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Attributes</p>
        </div>
        <div class="rounded-md bg-white dark:bg-gray-700 p-2.5 text-center">
          <p class="text-lg font-semibold text-primary-600">{{ store.templatePreview.product_families.length }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Families</p>
        </div>
        <div class="rounded-md bg-white dark:bg-gray-700 p-2.5 text-center">
          <p class="text-lg font-semibold text-primary-600">{{ store.templatePreview.attribute_groups.length }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Attribute Groups</p>
        </div>
        <div class="rounded-md bg-white dark:bg-gray-700 p-2.5 text-center">
          <p class="text-lg font-semibold text-primary-600">{{ store.templatePreview.default_channels.length }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Channels</p>
        </div>
        <div class="rounded-md bg-white dark:bg-gray-700 p-2.5 text-center">
          <p class="text-lg font-semibold text-primary-600">{{ store.templatePreview.demo_products }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Demo Products</p>
        </div>
        <div class="rounded-md bg-white dark:bg-gray-700 p-2.5 text-center">
          <p class="text-lg font-semibold text-primary-600">~{{ store.templatePreview.estimated_setup_minutes }}m</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Setup Time</p>
        </div>
      </div>

      <!-- Product Families Preview -->
      <div v-if="store.templatePreview.product_families.length > 0" class="mt-3">
        <p class="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">Product Families:</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="family in store.templatePreview.product_families"
            :key="family.name"
            class="inline-flex items-center gap-1 rounded-full bg-white dark:bg-gray-700 px-2.5 py-1 text-xs text-gray-900 dark:text-white"
          >
            {{ family.label }}
            <span v-if="family.has_variants" class="text-primary-500" title="Has variants">&#8226;</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Legacy Archetype Preview (fallback when new preview is unavailable) -->
    <div
      v-else-if="showPreview && store.archetypePreview"
      class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-4"
    >
      <h3 class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
        What this template creates:
      </h3>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div
          v-for="(section, key) in store.archetypePreview.sections"
          :key="key"
          class="rounded-md bg-white dark:bg-gray-700 p-2.5 text-center"
        >
          <p class="text-lg font-semibold text-primary-600">{{ section.count }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">{{ String(key).replace(/_/g, ' ') }}</p>
        </div>
      </div>
    </div>

    <!-- Validation hint -->
    <p v-if="!isValid()" class="text-xs text-amber-600">
      <template v-if="form.selected_industry === 'custom'">
        Please enter a name for your custom industry.
      </template>
      <template v-else>
        Please select an industry profile to continue.
      </template>
    </p>
  </div>
</template>
