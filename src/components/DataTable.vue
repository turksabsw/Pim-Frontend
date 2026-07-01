<script setup lang="ts">
/**
 * DataTable - Flowbite-style data table with sorting, selection,
 * pagination, and custom cell rendering.
 */
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

export interface DataTableColumn {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  hideOnMobile?: boolean
}

export interface DataTablePagination {
  page: number
  pageSize: number
  total: number
}

const props = withDefaults(
  defineProps<{
    columns: DataTableColumn[]
    rows: Record<string, unknown>[]
    rowKey?: string
    selectable?: boolean
    selectedKeys?: Set<string>
    loading?: boolean
    pagination?: DataTablePagination
    sortKey?: string
    sortDirection?: 'asc' | 'desc'
    emptyMessage?: string
    striped?: boolean
    clickable?: boolean
  }>(),
  {
    rowKey: 'name',
    selectable: false,
    loading: false,
    sortDirection: 'desc',
    striped: false,
    clickable: false,
  },
)

const emit = defineEmits<{
  (e: 'sort', key: string, direction: 'asc' | 'desc'): void
  (e: 'select', key: string): void
  (e: 'select-all'): void
  (e: 'deselect-all'): void
  (e: 'page-change', page: number): void
  (e: 'page-size-change', size: number): void
  (e: 'row-click', row: Record<string, unknown>): void
}>()

const { t } = useI18n()

const pageSizeOptions = [10, 20, 50, 100]

// =========================================================================
// Computed
// =========================================================================

const allSelected = computed(() => {
  if (!props.selectable || !props.selectedKeys || props.rows.length === 0) return false
  return props.rows.every((row) => props.selectedKeys!.has(String(row[props.rowKey])))
})

const someSelected = computed(() => {
  if (!props.selectable || !props.selectedKeys || props.rows.length === 0) return false
  const hasAny = props.rows.some((row) => props.selectedKeys!.has(String(row[props.rowKey])))
  return hasAny && !allSelected.value
})

const totalPages = computed(() => {
  if (!props.pagination) return 1
  return Math.max(1, Math.ceil(props.pagination.total / props.pagination.pageSize))
})

const paginationStart = computed(() => {
  if (!props.pagination) return 0
  return (props.pagination.page - 1) * props.pagination.pageSize + 1
})

const paginationEnd = computed(() => {
  if (!props.pagination) return 0
  return Math.min(props.pagination.page * props.pagination.pageSize, props.pagination.total)
})

const visiblePages = computed(() => {
  if (!props.pagination) return []
  const total = totalPages.value
  const current = props.pagination.page
  const pages: number[] = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push(-1)
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push(-1)
    pages.push(total)
  }

  return pages
})

// =========================================================================
// Methods
// =========================================================================

function handleSort(column: DataTableColumn): void {
  if (!column.sortable) return
  let direction: 'asc' | 'desc' = 'asc'
  if (props.sortKey === column.key) {
    direction = props.sortDirection === 'asc' ? 'desc' : 'asc'
  }
  emit('sort', column.key, direction)
}

function handleSelectAll(): void {
  if (allSelected.value) {
    emit('deselect-all')
  } else {
    emit('select-all')
  }
}

function handleSelectRow(row: Record<string, unknown>): void {
  emit('select', String(row[props.rowKey]))
}

function handleRowClick(row: Record<string, unknown>): void {
  if (props.clickable) {
    emit('row-click', row)
  }
}

function handlePageChange(page: number): void {
  if (page >= 1 && page <= totalPages.value) {
    emit('page-change', page)
  }
}

function handlePageSizeChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  emit('page-size-change', Number(target.value))
}

function getRowKey(row: Record<string, unknown>): string {
  return String(row[props.rowKey])
}

function isRowSelected(row: Record<string, unknown>): boolean {
  if (!props.selectedKeys) return false
  return props.selectedKeys.has(getRowKey(row))
}

function getColumnAlign(column: DataTableColumn): string {
  if (column.align === 'center') return 'text-center'
  if (column.align === 'right') return 'text-right'
  return 'text-left'
}
</script>

<template>
  <div class="relative overflow-hidden">
    <!-- Table container -->
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm text-gray-500 dark:text-gray-400">
        <!-- Header -->
        <thead class="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <!-- Selection checkbox header -->
            <th v-if="selectable" scope="col" class="w-4 p-4">
              <div class="flex items-center">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  :indeterminate="someSelected"
                  class="h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
                  @change="handleSelectAll"
                />
              </div>
            </th>

            <!-- Column headers -->
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              :class="[
                'px-4 py-3',
                getColumnAlign(column),
                column.sortable ? 'cursor-pointer select-none' : '',
                column.hideOnMobile ? 'hidden md:table-cell' : '',
              ]"
              :style="column.width ? { width: column.width } : undefined"
              @click="handleSort(column)"
            >
              <div class="flex items-center gap-1" :class="column.align === 'right' ? 'justify-end' : ''">
                {{ column.label }}
                <svg
                  v-if="column.sortable"
                  class="ms-1 h-3 w-3"
                  :class="sortKey === column.key ? 'text-gray-900 dark:text-white' : ''"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path v-if="sortKey === column.key && sortDirection === 'asc'" d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Z" />
                  <path v-else-if="sortKey === column.key && sortDirection === 'desc'" d="M15.426 12.976H8.574a2.075 2.075 0 0 0-1.847 1.086 1.9 1.9 0 0 0 .11 1.986l3.426 5.052a2.123 2.123 0 0 0 3.472 0l3.427-5.052a1.9 1.9 0 0 0 .11-1.986 2.074 2.074 0 0 0-1.846-1.086Z" />
                  <path v-else d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.052a2.123 2.123 0 0 0 3.472 0l3.427-5.052a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z" />
                </svg>
              </div>
            </th>
          </tr>
        </thead>

        <!-- Body -->
        <tbody>
          <!-- Loading state -->
          <tr v-if="loading">
            <td
              :colspan="(selectable ? 1 : 0) + columns.length"
              class="px-4 py-12 text-center"
            >
              <div class="flex flex-col items-center gap-2">
                <div role="status">
                  <svg class="h-6 w-6 animate-spin fill-primary-600 text-gray-200 dark:text-gray-600" viewBox="0 0 100 101" fill="none">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                  </svg>
                </div>
                <span class="text-sm text-gray-500 dark:text-gray-400">{{ t('common.loading') }}</span>
              </div>
            </td>
          </tr>

          <!-- Empty state -->
          <tr v-else-if="rows.length === 0">
            <td
              :colspan="(selectable ? 1 : 0) + columns.length"
              class="px-4 py-12 text-center"
            >
              <div class="flex flex-col items-center gap-2">
                <svg class="h-12 w-12 text-gray-300 dark:text-gray-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 12h14M5 12l4-4m-4 4 4 4" />
                </svg>
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  {{ emptyMessage || t('common.noResults') }}
                </span>
              </div>
            </td>
          </tr>

          <!-- Data rows -->
          <template v-else>
            <tr
              v-for="row in rows"
              :key="getRowKey(row)"
              :class="[
                'border-b bg-white dark:border-gray-700 dark:bg-gray-800',
                striped ? 'even:bg-gray-50 dark:even:bg-gray-900' : '',
                clickable ? 'cursor-pointer' : '',
                isRowSelected(row) ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-600',
              ]"
              @click="handleRowClick(row)"
            >
              <!-- Selection checkbox -->
              <td v-if="selectable" class="w-4 p-4" @click.stop>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    :checked="isRowSelected(row)"
                    class="h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
                    @change="handleSelectRow(row)"
                  />
                </div>
              </td>

              <!-- Data cells -->
              <td
                v-for="column in columns"
                :key="column.key"
                :class="[
                  'px-4 py-3',
                  getColumnAlign(column),
                  column.hideOnMobile ? 'hidden md:table-cell' : '',
                ]"
              >
                <slot
                  :name="`cell-${column.key}`"
                  :row="row"
                  :value="row[column.key]"
                  :column="column"
                >
                  <span class="text-gray-900 dark:text-white">
                    {{ row[column.key] ?? '—' }}
                  </span>
                </slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <nav
      v-if="pagination && !loading && rows.length > 0"
      class="flex flex-col items-start justify-between space-y-3 border-t border-gray-200 p-4 dark:border-gray-700 md:flex-row md:items-center md:space-y-0"
      aria-label="Table navigation"
    >
      <!-- Showing X to Y of Z -->
      <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span>
          Showing
          <span class="font-semibold text-gray-900 dark:text-white">{{ paginationStart }}-{{ paginationEnd }}</span>
          of
          <span class="font-semibold text-gray-900 dark:text-white">{{ pagination.total }}</span>
        </span>

        <!-- Page size selector -->
        <select
          :value="pagination.pageSize"
          class="block rounded-lg border border-gray-300 bg-gray-50 p-1.5 text-xs text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
          @change="handlePageSizeChange"
        >
          <option v-for="size in pageSizeOptions" :key="size" :value="size">
            {{ size }} / page
          </option>
        </select>
      </div>

      <!-- Page navigation -->
      <ul class="inline-flex items-stretch -space-x-px">
        <!-- Previous -->
        <li>
          <button
            class="ms-0 flex h-full items-center justify-center rounded-s-lg border border-gray-300 bg-white px-3 py-1.5 text-sm leading-tight text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            :disabled="pagination.page <= 1"
            :class="pagination.page <= 1 ? 'cursor-not-allowed opacity-50' : ''"
            @click="handlePageChange(pagination.page - 1)"
          >
            <svg class="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
        </li>

        <!-- Page numbers -->
        <li v-for="(page, idx) in visiblePages" :key="idx">
          <span
            v-if="page === -1"
            class="flex items-center justify-center border border-gray-300 bg-white px-3 py-1.5 text-sm leading-tight text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          >
            &hellip;
          </span>
          <button
            v-else
            :class="[
              'flex items-center justify-center border px-3 py-1.5 text-sm leading-tight',
              page === pagination.page
                ? 'z-10 border-primary-300 bg-primary-50 text-primary-600 hover:bg-primary-100 hover:text-primary-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white'
                : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white',
            ]"
            @click="handlePageChange(page)"
          >
            {{ page }}
          </button>
        </li>

        <!-- Next -->
        <li>
          <button
            class="flex h-full items-center justify-center rounded-e-lg border border-gray-300 bg-white px-3 py-1.5 text-sm leading-tight text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            :disabled="pagination.page >= totalPages"
            :class="pagination.page >= totalPages ? 'cursor-not-allowed opacity-50' : ''"
            @click="handlePageChange(pagination.page + 1)"
          >
            <svg class="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
        </li>
      </ul>
    </nav>
  </div>
</template>
