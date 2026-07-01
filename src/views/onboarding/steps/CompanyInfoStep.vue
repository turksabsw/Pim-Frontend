<script setup lang="ts">
/**
 * CompanyInfoStep - Flowbite-style first onboarding step for company information.
 */
import { reactive, watch, onMounted } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import type { CompanyInfoData, StepFormData, CompanySize, PrimaryRole } from '@/types'

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

const COMPANY_SIZES: readonly { value: CompanySize; label: string }[] = [
  { value: '1-10', label: '1 - 10 employees' },
  { value: '11-50', label: '11 - 50 employees' },
  { value: '51-200', label: '51 - 200 employees' },
  { value: '201-500', label: '201 - 500 employees' },
  { value: '501-1000', label: '501 - 1,000 employees' },
  { value: '1000+', label: '1,000+ employees' },
] as const

const PRIMARY_ROLES: readonly { value: PrimaryRole; label: string }[] = [
  { value: 'Product Manager', label: 'Product Manager' },
  { value: 'Catalog Manager', label: 'Catalog Manager' },
  { value: 'E-Commerce Manager', label: 'E-Commerce Manager' },
  { value: 'IT Administrator', label: 'IT Administrator' },
  { value: 'Marketing Manager', label: 'Marketing Manager' },
  { value: 'Operations Manager', label: 'Operations Manager' },
  { value: 'Business Owner', label: 'Business Owner' },
  { value: 'Other', label: 'Other' },
] as const

const EXISTING_SYSTEMS = [
  { value: 'excel', label: 'Excel / Spreadsheets' },
  { value: 'erp', label: 'ERP System (SAP, Oracle, etc.)' },
  { value: 'erpnext', label: 'ERPNext' },
  { value: 'legacy_pim', label: 'Legacy PIM System' },
  { value: 'custom_db', label: 'Custom Database' },
  { value: 'ecommerce', label: 'E-Commerce Platform' },
  { value: 'none', label: 'No Existing System' },
] as const

const PAIN_POINTS = [
  { value: 'data_inconsistency', label: 'Data inconsistency across channels' },
  { value: 'slow_time_to_market', label: 'Slow time-to-market for products' },
  { value: 'manual_data_entry', label: 'Too much manual data entry' },
  { value: 'poor_data_quality', label: 'Poor product data quality' },
  { value: 'channel_sync', label: 'Difficulty syncing across channels' },
  { value: 'compliance', label: 'Compliance & regulatory challenges' },
  { value: 'scalability', label: 'Cannot scale current process' },
] as const

function getInitialData(): CompanyInfoData {
  const storeData = store.getWizardStepData('company_info')
  const source = storeData ?? props.data

  return {
    company_name: (source?.company_name as string) ?? '',
    company_website: (source?.company_website as string) ?? '',
    company_size: (source?.company_size as CompanySize) ?? ('' as CompanySize),
    primary_role: (source?.primary_role as PrimaryRole) ?? ('' as PrimaryRole),
    existing_systems: (source?.existing_systems as string[]) ?? [],
    pain_points: (source?.pain_points as string[]) ?? [],
  }
}

const form = reactive<CompanyInfoData>(getInitialData())

onMounted(() => {
  store.setWizardStepData('company_info', { ...form })
})

function toggleArrayItem(field: 'existing_systems' | 'pain_points', value: string): void {
  const arr = form[field] ?? []
  const index = arr.indexOf(value)
  if (index >= 0) {
    arr.splice(index, 1)
  } else {
    arr.push(value)
  }
  form[field] = [...arr]
}

watch(
  form,
  (newVal) => {
    const data = { ...newVal }
    store.setWizardStepData('company_info', data)
    emit('update', data)
  },
  { deep: true },
)

function isValidUrl(value: string): boolean {
  if (!value || !value.trim()) return true
  try {
    new URL(value.startsWith('http') ? value : `https://${value}`)
    return true
  } catch {
    return false
  }
}

function isValid(): boolean {
  return (
    form.company_name.trim().length > 0 &&
    !!form.company_size &&
    !!form.primary_role &&
    form.existing_systems.length > 0 &&
    isValidUrl(form.company_website)
  )
}

function handleSubmit(): void {
  if (form.company_website && !form.company_website.startsWith('http')) {
    form.company_website = `https://${form.company_website}`
  }
  if (isValid()) {
    emit('next', { ...form })
  }
}

defineExpose({ isValid })
</script>

<template>
  <div class="space-y-5">
    <!-- Company Name -->
    <div>
      <label for="company_name" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        Company Name <span class="text-red-500">*</span>
      </label>
      <input
        id="company_name"
        v-model="form.company_name"
        type="text"
        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        placeholder="Enter your company name"
      />
    </div>

    <!-- Company Website -->
    <div>
      <label for="company_website" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        Website
      </label>
      <input
        id="company_website"
        v-model="form.company_website"
        type="text"
        class="block w-full rounded-lg border bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        :class="form.company_website && !isValidUrl(form.company_website) ? 'border-red-500 dark:border-red-500' : 'border-gray-300'"
        placeholder="https://www.example.com"
      />
      <p v-if="form.company_website && !isValidUrl(form.company_website)" class="mt-2 text-sm text-red-600 dark:text-red-500">
        Please enter a valid website (e.g. example.com or https://example.com)
      </p>
    </div>

    <!-- Company Size -->
    <div>
      <label for="company_size" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        Company Size <span class="text-red-500">*</span>
      </label>
      <select
        id="company_size"
        v-model="form.company_size"
        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      >
        <option value="">Select company size</option>
        <option v-for="size in COMPANY_SIZES" :key="size.value" :value="size.value">
          {{ size.label }}
        </option>
      </select>
    </div>

    <!-- Primary Role -->
    <div>
      <label for="primary_role" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        Your Primary Role <span class="text-red-500">*</span>
      </label>
      <select
        id="primary_role"
        v-model="form.primary_role"
        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      >
        <option value="">Select your role</option>
        <option v-for="role in PRIMARY_ROLES" :key="role.value" :value="role.value">
          {{ role.label }}
        </option>
      </select>
    </div>

    <!-- Existing Systems -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        Current Systems <span class="text-red-500">*</span>
      </label>
      <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
        What systems do you currently use to manage product data?
      </p>
      <div class="space-y-2">
        <label
          v-for="system in EXISTING_SYSTEMS"
          :key="system.value"
          class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
          :class="form.existing_systems.includes(system.value)
            ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
            : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700'"
        >
          <input
            type="checkbox"
            :checked="form.existing_systems.includes(system.value)"
            class="h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
            @change="toggleArrayItem('existing_systems', system.value)"
          />
          <span class="text-sm text-gray-900 dark:text-gray-300">{{ system.label }}</span>
        </label>
      </div>
    </div>

    <!-- Pain Points -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        Key Challenges
      </label>
      <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
        What are your biggest product data management challenges? (optional)
      </p>
      <div class="space-y-2">
        <label
          v-for="point in PAIN_POINTS"
          :key="point.value"
          class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
          :class="(form.pain_points ?? []).includes(point.value)
            ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
            : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700'"
        >
          <input
            type="checkbox"
            :checked="(form.pain_points ?? []).includes(point.value)"
            class="h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
            @change="toggleArrayItem('pain_points', point.value)"
          />
          <span class="text-sm text-gray-900 dark:text-gray-300">{{ point.label }}</span>
        </label>
      </div>
    </div>

    <!-- Validation hint -->
    <div v-if="!isValid()" class="flex items-center rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-gray-800 dark:text-yellow-300" role="alert">
      <svg class="me-3 h-4 w-4 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm-1 5a1 1 0 0 1 2 0v5a1 1 0 0 1-2 0V7Zm1 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
      </svg>
      Please fill in company name, size, role, and select at least one existing system.
    </div>
  </div>
</template>
