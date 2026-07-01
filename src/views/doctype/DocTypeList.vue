<script setup lang="ts">
/**
 * DocTypeList – generic list view for any PIM DocType.
 * Clean Flowbite table with Name, Modified, Owner columns + Actions.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFrappeAPI } from '@/composables/useFrappeAPI'

const route = useRoute()
const router = useRouter()
const api = useFrappeAPI()

const doctype = computed(() => (route.params.doctype as string) || '')
const decodedDoctype = computed(() => decodeURIComponent(doctype.value))

interface ListRow {
  name: string
  modified?: string
  owner?: string
  [key: string]: unknown
}

const rows = ref<ListRow[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(20)
const search = ref('')
const sortField = ref('modified')
const sortDir = ref<'asc' | 'desc'>('desc')

const LIST_FIELDS = ['name', 'modified', 'owner']

async function loadList(): Promise<void> {
  if (!decodedDoctype.value) return
  loading.value = true
  error.value = null
  try {
    const filters = search.value
      ? [['name', 'like', `%${search.value}%`] as [string, string, string]]
      : undefined
    const list = await api.getList<ListRow>({
      doctype: decodedDoctype.value,
      fields: LIST_FIELDS,
      filters,
      order_by: `${sortField.value} ${sortDir.value}`,
      limit_start: (page.value - 1) * pageSize.value,
      limit_page_length: pageSize.value,
    })
    rows.value = list || []
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Failed to load list'
    error.value = msg
    rows.value = []
  } finally {
    loading.value = false
  }
}

function openRow(row: ListRow): void {
  router.push(`/doc/${encodeURIComponent(decodedDoctype.value)}/${encodeURIComponent(row.name)}`)
}

function openInDesk(e: Event, name: string): void {
  e.stopPropagation()
  const base = typeof window !== 'undefined' && (window as unknown as { __frappe_base_url?: string }).__frappe_base_url
  const baseUrl = base || 'http://localhost:8000'
  const slug = decodedDoctype.value.replace(/\s+/g, '-').toLowerCase()
  window.open(`${baseUrl}/app/${slug}/${encodeURIComponent(name)}`, '_blank')
}

function handleSort(field: string): void {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'desc'
  }
  loadList()
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatOwner(owner?: string): string {
  if (!owner) return '—'
  return owner.replace(/@.*$/, '')
}

onMounted(() => loadList())
watch([doctype, page, pageSize], () => loadList())
</script>

<template>
  <div class="space-y-5">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ decodedDoctype }}</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ rows.length }} record{{ rows.length !== 1 ? 's' : '' }} on this page
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
          @click="router.push(`/doc/${encodeURIComponent(decodedDoctype)}/new`)"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          + Create
        </button>
        <button
          class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Open in Frappe Desk"
          @click="openInDesk($event, '')"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Desk
        </button>
      </div>
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
            v-model="search"
            type="text"
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 ps-10 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
            placeholder="Search by name..."
            @keyup.enter="loadList"
          />
        </div>

        <!-- Per page + Refresh -->
        <div class="flex items-center gap-2">
          <select
            :value="pageSize"
            class="rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            @change="pageSize = Number(($event.target as HTMLSelectElement).value); page = 1; loadList()"
          >
            <option :value="20">20 per page</option>
            <option :value="50">50 per page</option>
            <option :value="100">100 per page</option>
          </select>

          <button
            class="inline-flex items-center rounded-lg border border-gray-300 bg-white p-2.5 text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            title="Refresh"
            @click="loadList"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20" role="alert">
      <svg class="h-5 w-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-sm font-medium text-red-800 dark:text-red-300">{{ error }}</p>
      <button class="ml-auto text-sm font-medium text-red-700 underline dark:text-red-400" @click="loadList">Retry</button>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        <span class="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="rows.length === 0" class="rounded-lg border border-gray-200 bg-white py-16 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <svg class="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No records found</h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {{ search ? 'Try adjusting your search.' : `No ${decodedDoctype} records yet.` }}
      </p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead class="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" class="px-6 py-3">
                <button
                  class="inline-flex items-center gap-1 font-medium uppercase hover:text-gray-900 dark:hover:text-white"
                  @click="handleSort('name')"
                >
                  Name
                  <svg v-if="sortField === 'name'" class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                  </svg>
                </button>
              </th>
              <th scope="col" class="hidden px-6 py-3 sm:table-cell">
                <button
                  class="inline-flex items-center gap-1 font-medium uppercase hover:text-gray-900 dark:hover:text-white"
                  @click="handleSort('modified')"
                >
                  Modified
                  <svg v-if="sortField === 'modified'" class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                  </svg>
                </button>
              </th>
              <th scope="col" class="hidden px-6 py-3 md:table-cell">
                <button
                  class="inline-flex items-center gap-1 font-medium uppercase hover:text-gray-900 dark:hover:text-white"
                  @click="handleSort('owner')"
                >
                  Owner
                  <svg v-if="sortField === 'owner'" class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                  </svg>
                </button>
              </th>
              <th scope="col" class="w-16 px-6 py-3">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.name"
              class="cursor-pointer border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              @click="openRow(row)"
            >
              <!-- Name -->
              <td class="px-6 py-4">
                <span class="font-medium text-gray-900 dark:text-white">{{ row.name }}</span>
              </td>

              <!-- Modified -->
              <td class="hidden px-6 py-4 sm:table-cell">
                <span class="text-sm text-gray-500 dark:text-gray-400" :title="row.modified">
                  {{ formatDate(row.modified) }}
                </span>
              </td>

              <!-- Owner -->
              <td class="hidden px-6 py-4 md:table-cell">
                <div class="flex items-center gap-2">
                  <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                    {{ formatOwner(row.owner).charAt(0).toUpperCase() }}
                  </div>
                  <span class="text-sm text-gray-500 dark:text-gray-400">{{ formatOwner(row.owner) }}</span>
                </div>
              </td>

              <!-- Actions -->
              <td class="w-16 px-6 py-4" @click.stop>
                <button
                  class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
                  title="Open in Desk"
                  @click="openInDesk($event, row.name)"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="rows.length > 0" class="flex flex-col items-center justify-between gap-4 sm:flex-row">
      <span class="text-sm text-gray-700 dark:text-gray-400">
        Page <span class="font-semibold text-gray-900 dark:text-white">{{ page }}</span>
        &middot; {{ rows.length }} record{{ rows.length !== 1 ? 's' : '' }}
      </span>

      <nav>
        <ul class="inline-flex -space-x-px text-sm">
          <li>
            <button
              class="ms-0 flex h-8 items-center justify-center rounded-s-lg border border-gray-300 bg-white px-3 leading-tight text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              :disabled="page <= 1"
              @click="page--"
            >
              Previous
            </button>
          </li>
          <li>
            <span class="flex h-8 items-center justify-center border border-gray-300 bg-gray-50 px-3 leading-tight text-gray-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white">
              {{ page }}
            </span>
          </li>
          <li>
            <button
              class="flex h-8 items-center justify-center rounded-e-lg border border-gray-300 bg-white px-3 leading-tight text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              :disabled="rows.length < pageSize"
              @click="page++"
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>
