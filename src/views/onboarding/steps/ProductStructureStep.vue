<script setup lang="ts">
/**
 * ProductStructureStep - Configure product organization preferences (Step 3).
 *
 * Collects:
 * - Estimated SKU count (required)
 * - Whether products use variants
 * - Variant axes (e.g., size, color, material)
 * - Product family count (required)
 * - Custom family names
 * - Data import source (required)
 *
 * Integrates with the onboarding store to:
 * - Read/write step data via Pinia store
 * - Expose isValid for wizard navigation control
 */
import { reactive, ref, watch, onMounted } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import type {
  ProductStructureData,
  StepFormData,
  SkuRange,
  FamilyCountRange,
  DataImportSource,
} from '@/types'

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

const SKU_COUNT_OPTIONS: readonly { value: SkuRange; label: string; description: string }[] = [
  { value: '1-100', label: '1 - 100 SKUs', description: 'Small catalog, getting started' },
  { value: '101-500', label: '101 - 500 SKUs', description: 'Growing catalog' },
  { value: '501-2000', label: '501 - 2,000 SKUs', description: 'Medium catalog' },
  { value: '2001-10000', label: '2,001 - 10,000 SKUs', description: 'Large catalog' },
  { value: '10000+', label: '10,000+ SKUs', description: 'Enterprise catalog' },
] as const

const FAMILY_COUNT_OPTIONS: readonly { value: FamilyCountRange; label: string }[] = [
  { value: '1-5', label: '1 - 5 families' },
  { value: '6-15', label: '6 - 15 families' },
  { value: '16-50', label: '16 - 50 families' },
  { value: '50+', label: '50+ families' },
] as const

const VARIANT_AXES_OPTIONS = [
  { value: 'size', label: 'Size' },
  { value: 'color', label: 'Color' },
  { value: 'material', label: 'Material' },
  { value: 'weight', label: 'Weight' },
  { value: 'length', label: 'Length' },
  { value: 'flavor', label: 'Flavor' },
  { value: 'voltage', label: 'Voltage' },
  { value: 'capacity', label: 'Capacity' },
] as const

const DATA_IMPORT_OPTIONS: readonly { value: DataImportSource; label: string; description: string }[] = [
  { value: 'no_existing_data', label: 'Starting fresh', description: 'No existing product data to import' },
  { value: 'csv_import', label: 'CSV / Excel import', description: 'Import from spreadsheet files' },
  { value: 'erp_sync', label: 'ERP sync', description: 'Sync from ERPNext or another ERP system' },
  { value: 'api_import', label: 'API import', description: 'Import via API from another system' },
  { value: 'manual_entry', label: 'Manual entry', description: 'Enter products one-by-one' },
] as const

/** Custom family name input */
const newFamilyName = ref('')

/** Load initial data from store or props */
function getInitialData(): ProductStructureData {
  const storeData = store.getWizardStepData('product_structure')
  const source = storeData ?? props.data

  return {
    estimated_sku_count: (source?.estimated_sku_count as SkuRange) ?? ('' as SkuRange),
    uses_variants: (source?.uses_variants as boolean) ?? false,
    variant_axes: (source?.variant_axes as string[]) ?? [],
    product_family_count: (source?.product_family_count as FamilyCountRange) ?? ('' as FamilyCountRange),
    custom_families: (source?.custom_families as string[]) ?? [],
    data_import_source: (source?.data_import_source as DataImportSource) ?? ('' as DataImportSource),
    // Legacy fields for backward compatibility
    use_families: (source?.use_families as boolean) ?? true,
    use_categories: (source?.use_categories as boolean) ?? true,
    variant_levels: (source?.variant_levels as number) ?? 0,
  }
}

const form = reactive<ProductStructureData>(getInitialData())

/** Sync initial data to store on mount */
onMounted(() => {
  store.setWizardStepData('product_structure', { ...form })
})

/** Toggle a variant axis */
function toggleVariantAxis(axis: string): void {
  const axes = form.variant_axes ?? []
  const index = axes.indexOf(axis)
  if (index >= 0) {
    axes.splice(index, 1)
  } else {
    axes.push(axis)
  }
  form.variant_axes = [...axes]

  // Sync legacy variant_levels from axes count
  form.variant_levels = form.variant_axes?.length ?? 0
}

/** Add a custom family name */
function addCustomFamily(): void {
  const name = newFamilyName.value.trim()
  if (!name) return

  const families = form.custom_families ?? []
  if (!families.includes(name)) {
    families.push(name)
    form.custom_families = [...families]
  }
  newFamilyName.value = ''
}

/** Remove a custom family */
function removeCustomFamily(name: string): void {
  const families = form.custom_families ?? []
  const index = families.indexOf(name)
  if (index >= 0) {
    families.splice(index, 1)
    form.custom_families = [...families]
  }
}

/** Handle Enter key in custom family input */
function handleFamilyKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    addCustomFamily()
  }
}

/** Emit form data changes to parent and sync to store */
watch(
  form,
  (newVal) => {
    const data = { ...newVal }
    store.setWizardStepData('product_structure', data)
    emit('update', data)
  },
  { deep: true },
)

/** Whether the form has the minimum required data */
function isValid(): boolean {
  return (
    !!form.estimated_sku_count &&
    !!form.product_family_count &&
    !!form.data_import_source
  )
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
    <!-- Estimated SKU Count -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        Estimated SKU Count <span class="text-red-500">*</span>
      </label>
      <div class="space-y-2">
        <label
          v-for="option in SKU_COUNT_OPTIONS"
          :key="option.value"
          class="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
          :class="{
            'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20': form.estimated_sku_count === option.value,
          }"
        >
          <input
            v-model="form.estimated_sku_count"
            type="radio"
            :value="option.value"
            class="h-4 w-4 border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
          />
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ option.label }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ option.description }}</p>
          </div>
        </label>
      </div>
    </div>

    <!-- Uses Variants Toggle -->
    <div class="rounded-lg border border-gray-300 dark:border-gray-600 p-4">
      <div class="flex items-start gap-3">
        <input
          id="uses_variants"
          v-model="form.uses_variants"
          type="checkbox"
          class="mt-0.5 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
        />
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-900 dark:text-white" for="uses_variants">
            My products have variants
          </label>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Products come in different sizes, colors, materials, or other variations.
          </p>
        </div>
      </div>

      <!-- Variant Axes (shown when variants enabled) -->
      <div v-if="form.uses_variants" class="mt-3 pl-7">
        <label class="mb-2 block text-xs font-medium text-gray-900 dark:text-white">
          Select variant axes:
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="axis in VARIANT_AXES_OPTIONS"
            :key="axis.value"
            type="button"
            class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
            :class="
              (form.variant_axes ?? []).includes(axis.value)
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-400'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
            "
            @click="toggleVariantAxis(axis.value)"
          >
            {{ axis.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Product Family Count -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white" for="product_family_count">
        Product Family Count <span class="text-red-500">*</span>
      </label>
      <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Families group products by shared attributes (e.g., Apparel, Electronics, Accessories).
      </p>
      <select
        id="product_family_count"
        v-model="form.product_family_count"
        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      >
        <option value="">Select a range</option>
        <option
          v-for="option in FAMILY_COUNT_OPTIONS"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>

    <!-- Custom Families (tag input) -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        Custom Family Names
      </label>
      <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Optionally name your product families now. You can always add or change these later.
      </p>
      <div class="flex gap-2">
        <input
          v-model="newFamilyName"
          type="text"
          class="block flex-1 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
          placeholder="e.g., T-Shirts, Accessories"
          @keydown="handleFamilyKeydown"
        />
        <button
          type="button"
          class="rounded-lg border border-primary-500 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50"
          @click="addCustomFamily"
        >
          Add
        </button>
      </div>
      <!-- Custom family tags -->
      <div v-if="(form.custom_families ?? []).length > 0" class="mt-2 flex flex-wrap gap-1.5">
        <span
          v-for="family in form.custom_families"
          :key="family"
          class="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
        >
          {{ family }}
          <button
            type="button"
            class="ml-0.5 text-primary-400 transition-colors hover:text-primary-700"
            @click="removeCustomFamily(family)"
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      </div>
    </div>

    <!-- Data Import Source -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        Data Import Source <span class="text-red-500">*</span>
      </label>
      <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
        How will you initially populate your product catalog?
      </p>
      <div class="space-y-2">
        <label
          v-for="option in DATA_IMPORT_OPTIONS"
          :key="option.value"
          class="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
          :class="{
            'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20': form.data_import_source === option.value,
          }"
        >
          <input
            v-model="form.data_import_source"
            type="radio"
            :value="option.value"
            class="h-4 w-4 border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
          />
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ option.label }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ option.description }}</p>
          </div>
        </label>
      </div>
    </div>

    <!-- Validation hint -->
    <p v-if="!isValid()" class="text-xs text-amber-600">
      Please select SKU count, family count, and data import source to continue.
    </p>
  </div>
</template>
