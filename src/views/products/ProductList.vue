<script setup lang="ts">
/**
 * ProductList.vue - Clean Flowbite product list with table, grid, search, filters.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useProductStore } from '@/stores/product'
import type { ProductStatus } from '@/types'

const router = useRouter()
const { t } = useI18n()
const store = useProductStore()

// =========================================================================
// Local State
// =========================================================================

const viewMode = ref<'grid' | 'list'>('list')
const searchInput = ref('')
const showFilters = ref(false)
const filterStatus = ref<ProductStatus | ''>('')
const filterFamily = ref('')
const filterCompletenessMin = ref<number | undefined>(undefined)
const filterCompletenessMax = ref<number | undefined>(undefined)
const sortField = ref('modified')
const sortDirection = ref<'asc' | 'desc'>('desc')
const showDeleteConfirm = ref(false)
const deleteTargetName = ref('')
const showBulkActions = ref(false)

const sortOptions = [
  { label: 'Last Modified', value: 'modified' },
  { label: 'Created', value: 'creation' },
  { label: 'Product Name', value: 'product_name' },
  { label: 'Completeness', value: 'completeness_score' },
  { label: 'Status', value: 'status' },
]

const statusOptions: { label: string; value: ProductStatus | '' }[] = [
  { label: 'All Statuses', value: '' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Active', value: 'Active' },
  { label: 'Discontinued', value: 'Discontinued' },
  { label: 'Archived', value: 'Archived' },
]

// =========================================================================
// Computed
// =========================================================================

const paginationInfo = computed(() => {
  const start = (store.currentPage - 1) * store.pageSize + 1
  const end = Math.min(store.currentPage * store.pageSize, store.totalCount)
  return { start, end }
})

const completenessColor = (score: number): string => {
  if (score >= 80) return 'bg-green-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

const completenessTextColor = (score: number): string => {
  if (score >= 80) return 'text-green-700 dark:text-green-400'
  if (score >= 50) return 'text-amber-700 dark:text-amber-400'
  return 'text-red-700 dark:text-red-400'
}

const statusBadgeClass = (status: string): string => {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'Draft':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case 'Discontinued':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    case 'Archived':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

// =========================================================================
// Search Debounce
// =========================================================================

let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(searchInput, (value: string) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    store.search(value)
  }, 300)
})

// =========================================================================
// Actions
// =========================================================================

function viewProduct(name: string): void {
  router.push(`/doc/${encodeURIComponent('Product Master')}/${encodeURIComponent(name)}`)
}

function createProduct(): void {
  router.push(`/doc/${encodeURIComponent('Product Master')}/new`)
}

function applyFilters(): void {
  store.applyFilters({
    status: filterStatus.value || undefined,
    product_family: filterFamily.value || undefined,
    completeness_min: filterCompletenessMin.value,
    completeness_max: filterCompletenessMax.value,
  })
  showFilters.value = false
}

function clearFilters(): void {
  filterStatus.value = ''
  filterFamily.value = ''
  filterCompletenessMin.value = undefined
  filterCompletenessMax.value = undefined
  store.clearFilters()
  showFilters.value = false
}

function handleSort(field: string): void {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'desc'
  }
  store.sortBy(sortField.value, sortDirection.value)
}

function handleSortSelect(event: Event): void {
  const target = event.target as HTMLSelectElement
  sortField.value = target.value
  store.sortBy(sortField.value, sortDirection.value)
}

function toggleSortDirection(): void {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  store.sortBy(sortField.value, sortDirection.value)
}

function handlePageSizeChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  store.setPageSize(Number(target.value))
}

function confirmDelete(name: string): void {
  deleteTargetName.value = name
  showDeleteConfirm.value = true
}

async function executeDelete(): Promise<void> {
  if (deleteTargetName.value) {
    await store.deleteProduct(deleteTargetName.value)
    showDeleteConfirm.value = false
    deleteTargetName.value = ''
  }
}

function cancelDelete(): void {
  showDeleteConfirm.value = false
  deleteTargetName.value = ''
}

async function bulkSetStatus(status: ProductStatus): Promise<void> {
  const names = Array.from(store.selectedProducts)
  if (names.length > 0) {
    await store.bulkUpdate(names, 'status', status)
  }
  showBulkActions.value = false
}

async function bulkDelete(): Promise<void> {
  const names = Array.from(store.selectedProducts)
  for (const name of names) {
    await store.deleteProduct(name)
  }
  store.deselectAll()
  showBulkActions.value = false
}

// =========================================================================
// Lifecycle
// =========================================================================

onMounted(async () => {
  await Promise.all([
    store.fetchProducts(),
    store.fetchFamilies(),
  ])
})
</script>

<template>
  <div class="space-y-5">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('nav.products') }}</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ store.totalCount }} product{{ store.totalCount !== 1 ? 's' : '' }} total
        </p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
        @click="createProduct"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        {{ t('common.create') }}
      </button>
    </div>

    <!-- Toolbar Card -->
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <!-- Search -->
        <div class="relative flex-1 max-w-lg">
          <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
            <svg class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            v-model="searchInput"
            type="text"
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 ps-10 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
            :placeholder="t('common.search') + ' products...'"
          />
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <!-- Filter toggle -->
          <button
            class="relative inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
            :class="showFilters || store.activeFilterCount > 0 ? 'text-primary-600 border-primary-300 dark:text-primary-400 dark:border-primary-700' : 'text-gray-700 dark:text-gray-300'"
            @click="showFilters = !showFilters"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            <span
              v-if="store.activeFilterCount > 0"
              class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white"
            >
              {{ store.activeFilterCount }}
            </span>
          </button>

          <!-- Sort -->
          <select
            :value="sortField"
            class="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            @change="handleSortSelect"
          >
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>

          <button
            class="rounded-lg border border-gray-300 bg-white p-2.5 text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            :title="sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'"
            @click="toggleSortDirection"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="sortDirection === 'asc'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
            </svg>
          </button>

          <!-- View toggle -->
          <div class="inline-flex rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              class="rounded-s-lg p-2.5"
              :class="viewMode === 'list' ? 'bg-gray-100 text-gray-900 dark:bg-gray-600 dark:text-white' : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'"
              @click="viewMode = 'list'"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              class="rounded-e-lg p-2.5"
              :class="viewMode === 'grid' ? 'bg-gray-100 text-gray-900 dark:bg-gray-600 dark:text-white' : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'"
              @click="viewMode = 'grid'"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Filter Panel -->
      <div v-if="showFilters" class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Status</label>
            <select v-model="filterStatus" class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Family</label>
            <select v-model="filterFamily" class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              <option value="">All Families</option>
              <option v-for="family in store.families" :key="family.name" :value="family.name">{{ family.family_name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Min Completeness</label>
            <input v-model.number="filterCompletenessMin" type="number" class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="0" min="0" max="100" />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Max Completeness</label>
            <input v-model.number="filterCompletenessMax" type="number" class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="100" min="0" max="100" />
          </div>
        </div>
        <div class="mt-4 flex items-center gap-3">
          <button class="inline-flex items-center rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800" @click="applyFilters">
            Apply
          </button>
          <button class="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" @click="clearFilters">
            Clear all
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Actions Bar -->
    <div
      v-if="store.hasSelection"
      class="flex items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 dark:border-primary-800 dark:bg-primary-900/20"
    >
      <span class="text-sm font-medium text-primary-700 dark:text-primary-300">
        {{ store.selectedCount }} selected
      </span>
      <div class="relative">
        <button
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          @click="showBulkActions = !showBulkActions"
        >
          Actions
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div
          v-if="showBulkActions"
          class="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700"
        >
          <button class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600" @click="bulkSetStatus('Active')">Set Active</button>
          <button class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600" @click="bulkSetStatus('Draft')">Set Draft</button>
          <button class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600" @click="bulkSetStatus('Archived')">Archive</button>
          <hr class="my-1 border-gray-200 dark:border-gray-600" />
          <button class="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" @click="bulkDelete">Delete Selected</button>
        </div>
      </div>
      <button class="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" @click="store.deselectAll">
        Clear
      </button>
    </div>

    <!-- Error State -->
    <div v-if="store.error" class="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20" role="alert">
      <svg class="h-5 w-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-sm font-medium text-red-800 dark:text-red-300">{{ store.error }}</p>
      <button class="ml-auto text-sm font-medium text-red-700 underline dark:text-red-400" @click="store.fetchProducts()">Retry</button>
    </div>

    <!-- Loading -->
    <div v-if="store.listLoading" class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        <span class="text-sm text-gray-500 dark:text-gray-400">Loading products...</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="store.products.length === 0 && !store.error" class="rounded-lg border border-gray-200 bg-white py-16 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <svg class="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No products found</h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {{ store.activeFilterCount > 0 ? 'Try adjusting your filters.' : 'Get started by creating your first product.' }}
      </p>
      <div class="mt-6 flex justify-center gap-3">
        <button
          v-if="store.activeFilterCount > 0"
          class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          @click="clearFilters"
        >
          Clear Filters
        </button>
        <button class="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-700" @click="createProduct">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Product
        </button>
      </div>
    </div>

    <!-- List View (Proper Table) -->
    <div v-else-if="viewMode === 'list'" class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead class="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" class="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                  :checked="store.allPageSelected"
                  @change="store.toggleSelectAll()"
                />
              </th>
              <th scope="col" class="px-4 py-3">
                <button class="inline-flex items-center gap-1 font-medium uppercase hover:text-gray-900 dark:hover:text-white" @click="handleSort('product_name')">
                  Product
                  <svg v-if="sortField === 'product_name'" class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                  </svg>
                </button>
              </th>
              <th scope="col" class="px-4 py-3">
                <button class="inline-flex items-center gap-1 font-medium uppercase hover:text-gray-900 dark:hover:text-white" @click="handleSort('status')">
                  Status
                  <svg v-if="sortField === 'status'" class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                  </svg>
                </button>
              </th>
              <th scope="col" class="hidden px-4 py-3 lg:table-cell">Family</th>
              <th scope="col" class="px-4 py-3">
                <button class="inline-flex items-center gap-1 font-medium uppercase hover:text-gray-900 dark:hover:text-white" @click="handleSort('completeness_score')">
                  Completeness
                  <svg v-if="sortField === 'completeness_score'" class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                  </svg>
                </button>
              </th>
              <th scope="col" class="w-16 px-4 py-3">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="product in store.products"
              :key="product.name"
              class="cursor-pointer border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              @click="viewProduct(product.name)"
            >
              <!-- Checkbox -->
              <td class="w-12 px-4 py-3" @click.stop>
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                  :checked="store.selectedProducts.has(product.name)"
                  @change="store.toggleSelection(product.name)"
                />
              </td>

              <!-- Product -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <!-- Thumbnail -->
                  <div class="shrink-0">
                    <img
                      v-if="product.main_image"
                      :src="product.main_image"
                      :alt="product.product_name"
                      class="h-9 w-9 rounded-lg border border-gray-200 object-cover dark:border-gray-600"
                    />
                    <div
                      v-else
                      class="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-700"
                    >
                      <svg class="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <!-- Name & code -->
                  <div class="min-w-0">
                    <div class="font-medium text-gray-900 dark:text-white">{{ product.product_name }}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">{{ product.product_code }}</div>
                  </div>
                </div>
              </td>

              <!-- Status -->
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusBadgeClass(product.status)">
                  {{ product.status }}
                </span>
              </td>

              <!-- Family -->
              <td class="hidden px-4 py-3 lg:table-cell">
                <span class="text-sm text-gray-500 dark:text-gray-400">{{ product.product_family || '—' }}</span>
              </td>

              <!-- Completeness -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      class="h-2 rounded-full transition-all"
                      :class="completenessColor(product.completeness_score)"
                      :style="{ width: `${product.completeness_score}%` }"
                    />
                  </div>
                  <span class="text-xs font-medium" :class="completenessTextColor(product.completeness_score)">
                    {{ product.completeness_score }}%
                  </span>
                </div>
              </td>

              <!-- Actions -->
              <td class="w-16 px-4 py-3" @click.stop>
                <button
                  class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  title="Delete"
                  @click="confirmDelete(product.name)"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Grid View -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div
        v-for="product in store.products"
        :key="product.name"
        class="cursor-pointer rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
        @click="viewProduct(product.name)"
      >
        <!-- Top row: checkbox + status -->
        <div class="mb-4 flex items-center justify-between">
          <div @click.stop>
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
              :checked="store.selectedProducts.has(product.name)"
              @change="store.toggleSelection(product.name)"
            />
          </div>
          <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusBadgeClass(product.status)">
            {{ product.status }}
          </span>
        </div>

        <!-- Image placeholder -->
        <div class="mb-4 flex h-32 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-700">
          <svg class="h-10 w-10 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>

        <!-- Info -->
        <h4 class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ product.product_name }}</h4>
        <p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{{ product.product_code }}</p>
        <p v-if="product.product_family" class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ product.product_family }}</p>

        <!-- Completeness -->
        <div class="mt-4 flex items-center gap-2">
          <div class="h-1.5 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
            <div class="h-1.5 rounded-full transition-all" :class="completenessColor(product.completeness_score)" :style="{ width: `${product.completeness_score}%` }" />
          </div>
          <span class="text-xs font-medium" :class="completenessTextColor(product.completeness_score)">{{ product.completeness_score }}%</span>
        </div>

        <!-- Delete -->
        <div class="mt-3 flex justify-end" @click.stop>
          <button
            class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            title="Delete"
            @click="confirmDelete(product.name)"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="store.totalCount > 0" class="flex flex-col items-center justify-between gap-4 sm:flex-row">
      <span class="text-sm text-gray-700 dark:text-gray-400">
        Showing <span class="font-semibold text-gray-900 dark:text-white">{{ paginationInfo.start }}</span> to <span class="font-semibold text-gray-900 dark:text-white">{{ paginationInfo.end }}</span> of <span class="font-semibold text-gray-900 dark:text-white">{{ store.totalCount }}</span>
      </span>

      <div class="flex items-center gap-4">
        <!-- Per page -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-700 dark:text-gray-400">Per page</span>
          <select
            :value="store.pageSize"
            class="rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            @change="handlePageSizeChange"
          >
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>

        <!-- Page buttons -->
        <nav>
          <ul class="inline-flex -space-x-px text-sm">
            <li>
              <button
                class="ms-0 flex h-8 items-center justify-center rounded-s-lg border border-gray-300 bg-white px-3 leading-tight text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                :disabled="!store.hasPrevPage"
                @click="store.prevPage()"
              >
                Previous
              </button>
            </li>
            <li>
              <span class="flex h-8 items-center justify-center border border-gray-300 bg-gray-50 px-3 leading-tight text-gray-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white">
                {{ store.currentPage }} / {{ store.totalPages }}
              </span>
            </li>
            <li>
              <button
                class="flex h-8 items-center justify-center rounded-e-lg border border-gray-300 bg-white px-3 leading-tight text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                :disabled="!store.hasNextPage"
                @click="store.nextPage()"
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- Delete Modal -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50" @click.self="cancelDelete">
        <div class="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <svg class="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Delete Product</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700" @click="cancelDelete">Cancel</button>
            <button class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 dark:bg-red-500 dark:hover:bg-red-600" @click="executeDelete">Delete</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
