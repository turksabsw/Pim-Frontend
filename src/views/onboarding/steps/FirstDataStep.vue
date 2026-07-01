<script setup lang="ts">
/**
 * FirstDataStep - Create the first product to test the setup.
 *
 * Collects:
 * - Product name
 * - Product type selection
 * - Product family selection
 * - Basic description
 *
 * This is a simplified product creation form that validates the
 * template configuration works correctly.
 */
import { reactive, onMounted, ref, watch } from 'vue'
import { useFrappeAPI } from '@/composables/useFrappeAPI'
import type { StepFormData, FrappeEntity } from '@/types'

interface FirstProductData {
  product_name: string
  product_type: string
  product_family: string
  short_description: string
}

const props = defineProps<{
  data: Record<string, unknown>
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update', data: StepFormData): void
  (e: 'next', data: StepFormData): void
  (e: 'back'): void
}>()

const api = useFrappeAPI()
const productTypes = ref<Array<{ name: string; type_name: string }>>([])
const productFamilies = ref<Array<{ name: string; family_name: string }>>([])
const loadingOptions = ref(false)

const form = reactive<FirstProductData>({
  product_name: (props.data.product_name as string) ?? '',
  product_type: (props.data.product_type as string) ?? '',
  product_family: (props.data.product_family as string) ?? '',
  short_description: (props.data.short_description as string) ?? '',
})

/** Load available product types and families */
onMounted(async () => {
  loadingOptions.value = true
  try {
    const [types, families] = await Promise.all([
      api.getList<FrappeEntity & { type_name: string }>({
        doctype: 'PIM Product Type',
        fields: ['name', 'type_name'],
        limit_page_length: 100,
        order_by: 'type_name asc',
      }),
      api.getList<FrappeEntity & { family_name: string }>({
        doctype: 'Product Family',
        fields: ['name', 'family_name'],
        filters: { is_group: 0 },
        limit_page_length: 100,
        order_by: 'family_name asc',
      }),
    ])
    productTypes.value = types.map((t) => ({ name: t.name, type_name: t.type_name ?? t.name }))
    productFamilies.value = families.map((f) => ({ name: f.name, family_name: f.family_name ?? f.name }))
  } catch {
    // Silently handle - user can still fill in text fields
  } finally {
    loadingOptions.value = false
  }
})

/** Emit form data changes */
watch(
  form,
  (newVal) => {
    emit('update', { ...newVal } as unknown as StepFormData)
  },
  { deep: true },
)

function isValid(): boolean {
  return form.product_name.trim().length > 0
}

function handleSubmit(): void {
  if (isValid()) {
    emit('next', { ...form } as unknown as StepFormData)
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Intro -->
    <div class="rounded-lg border border-primary-200 bg-primary-50 p-4">
      <p class="text-sm text-primary-800">
        Create your first product to verify your configuration works correctly.
        This is optional &mdash; you can skip this step and create products later.
      </p>
    </div>

    <!-- Product Name -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white" for="product_name">
        Product Name <span class="text-red-500">*</span>
      </label>
      <input
        id="product_name"
        v-model="form.product_name"
        type="text"
        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        placeholder="e.g., Classic Cotton T-Shirt"
      />
    </div>

    <!-- Product Type & Family (side by side) -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white" for="product_type">
          Product Type
        </label>
        <select
          v-if="!loadingOptions && productTypes.length > 0"
          id="product_type"
          v-model="form.product_type"
          class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        >
          <option value="">Select type</option>
          <option
            v-for="type in productTypes"
            :key="type.name"
            :value="type.name"
          >
            {{ type.type_name }}
          </option>
        </select>
        <input
          v-else
          id="product_type"
          v-model="form.product_type"
          type="text"
          class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
          :placeholder="loadingOptions ? 'Loading...' : 'Enter product type'"
        />
      </div>
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white" for="product_family">
          Product Family
        </label>
        <select
          v-if="!loadingOptions && productFamilies.length > 0"
          id="product_family"
          v-model="form.product_family"
          class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        >
          <option value="">Select family</option>
          <option
            v-for="family in productFamilies"
            :key="family.name"
            :value="family.name"
          >
            {{ family.family_name }}
          </option>
        </select>
        <input
          v-else
          id="product_family"
          v-model="form.product_family"
          type="text"
          class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
          :placeholder="loadingOptions ? 'Loading...' : 'Enter product family'"
        />
      </div>
    </div>

    <!-- Short Description -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white" for="short_description">
        Short Description
      </label>
      <textarea
        id="short_description"
        v-model="form.short_description"
        rows="3"
        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        placeholder="Brief product description..."
      />
    </div>

    <!-- Validation hint -->
    <p v-if="!isValid()" class="text-xs text-amber-600">
      Enter a product name to create your first product, or skip this step.
    </p>
  </div>
</template>
