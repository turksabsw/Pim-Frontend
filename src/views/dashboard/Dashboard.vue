<script setup lang="ts">
/**
 * Dashboard - Flowbite-style admin dashboard with product statistics,
 * quality overview, sync status, quick actions, and recent products.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useFrappeAPI, PIM_API } from '@/composables/useFrappeAPI'
import { useOnboardingStore } from '@/stores/onboarding'
import DataTable from '@/components/DataTable.vue'
import type { DataTableColumn } from '@/components/DataTable.vue'
import type { ProductMaster, ProductStatus, SyncStatusValue } from '@/types'

const router = useRouter()
const { t } = useI18n()
const api = useFrappeAPI()
const onboardingStore = useOnboardingStore()

const isOnboardingCompleted = computed(() =>
  onboardingStore.onboardingStatus === 'completed' || onboardingStore.onboardingStatus === 'skipped'
)

// =========================================================================
// Industry Configuration
// =========================================================================

interface IndustryConfig {
  label: string
  description: string
  color: string
  bgColor: string
  borderColor: string
  tips: string[]
}

const INDUSTRY_CONFIG: Record<string, IndustryConfig> = {
  food: {
    label: 'Food & Beverage',
    description: 'Manage nutritional data, expiry dates, certifications, and regulatory compliance.',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    tips: ['Add nutrition facts to your products', 'Set up expiry date tracking', 'Configure food safety certifications'],
  },
  fashion: {
    label: 'Fashion & Apparel',
    description: 'Manage size charts, color variants, seasonal collections, and style attributes.',
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    tips: ['Set up size and color variant axes', 'Create seasonal collections', 'Add style and fit attributes'],
  },
  electronics: {
    label: 'Electronics',
    description: 'Manage technical specifications, compatibility data, certifications, and warranties.',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    tips: ['Add technical specification attributes', 'Set up compatibility matrices', 'Configure warranty information'],
  },
  industrial: {
    label: 'Industrial',
    description: 'Manage part numbers, technical drawings, material specs, and compliance standards.',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-300 dark:border-gray-600',
    tips: ['Set up part number hierarchies', 'Add material and tolerance specs', 'Configure compliance certifications'],
  },
  health_beauty: {
    label: 'Health & Beauty',
    description: 'Manage ingredients, skin types, certifications, and safety data sheets.',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    tips: ['Add ingredient lists and INCI names', 'Configure skin type compatibility', 'Set up cruelty-free certifications'],
  },
  automotive: {
    label: 'Automotive',
    description: 'Manage OEM numbers, vehicle compatibility, technical specs, and fitment data.',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    tips: ['Set up vehicle compatibility (make/model/year)', 'Add OEM and aftermarket part numbers', 'Configure fitment attributes'],
  },
}

const industryConfig = computed<IndustryConfig | null>(() => {
  const industry = onboardingStore.selectedIndustry
  if (!industry || industry === 'custom') return null
  return INDUSTRY_CONFIG[industry] ?? null
})

// =========================================================================
// Role / Scale / Import Source Config (A, B, D)
// =========================================================================

const primaryRole = computed(() => onboardingStore.primaryRole)
const estimatedSkuCount = computed(() => onboardingStore.estimatedSkuCount)
const dataImportSource = computed(() => onboardingStore.dataImportSource)

/** Suggestion cards shown below the industry banner based on scale and import source (B, D) */
interface SuggestionCard {
  id: string
  title: string
  description: string
  actionLabel: string
  action: () => void
  color: string
}

const suggestionCards = computed<SuggestionCard[]>(() => {
  if (!isOnboardingCompleted.value) return []
  const cards: SuggestionCard[] = []

  // B) data_import_source suggestions
  const importSource = dataImportSource.value
  if (importSource === 'erp_sync') {
    cards.push({
      id: 'erp_sync',
      title: 'ERPNext Sync Ready',
      description: 'Your setup is configured for ERPNext sync. Check sync status and resolve any conflicts.',
      actionLabel: 'View Sync Queue',
      action: () => router.push('/list/PIM Sync Queue'),
      color: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
    })
  } else if (importSource === 'csv_import') {
    cards.push({
      id: 'csv_import',
      title: 'Import Products from CSV',
      description: 'You chose CSV import. Use the Import Configuration to upload your product data.',
      actionLabel: 'Go to Import',
      action: () => router.push('/list/Import Configuration'),
      color: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
    })
  } else if (importSource === 'api_import') {
    cards.push({
      id: 'api_import',
      title: 'API Integration Active',
      description: 'Your setup uses API-based import. Configure your webhook endpoints.',
      actionLabel: 'Webhook Config',
      action: () => router.push('/list/Webhook Configuration'),
      color: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20',
    })
  }

  // D) Large catalog (2000+ SKU) suggestions
  const skuCount = estimatedSkuCount.value
  if (skuCount === '2001-10000' || skuCount === '10000+') {
    cards.push({
      id: 'bulk_catalog',
      title: 'Large Catalog Tools',
      description: `For ${skuCount} SKUs: use bulk editing, export profiles, and data quality policies for efficiency.`,
      actionLabel: 'Quality Policies',
      action: () => router.push('/list/Data Quality Policy'),
      color: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20',
    })
  }

  return cards
})

// A) Role-specific extra quick action appended when onboarding is complete
const ROLE_EXTRA_ACTIONS: Record<string, QuickAction> = {
  'Product Manager': {
    label: 'Quality Review',
    description: 'Review incomplete and low-score products',
    icon: 'quality',
    action: () => router.push('/list/Data Quality Policy'),
    color: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    iconBg: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300',
  },
  'E-Commerce Manager': {
    label: 'Manage Channels',
    description: 'Configure sales channels and listings',
    icon: 'channel',
    action: () => router.push('/list/Channel'),
    color: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  },
  'IT Administrator': {
    label: 'Sync Queue',
    description: 'Monitor and manage data sync operations',
    icon: 'sync',
    action: () => router.push('/list/PIM Sync Queue'),
    color: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    iconBg: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
  },
  'Marketing Manager': {
    label: 'Brand Management',
    description: 'Manage brands and market insights',
    icon: 'brand',
    action: () => router.push('/list/Brand'),
    color: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    iconBg: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300',
  },
  'Catalog Manager': {
    label: 'Attributes',
    description: 'Manage product attribute templates',
    icon: 'attributes',
    action: () => router.push('/list/PIM Attribute Template'),
    color: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    iconBg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300',
  },
  'Business Owner': {
    label: 'Export Products',
    description: 'Export catalog data for reporting',
    icon: 'export',
    action: () => router.push('/list/Export Profile'),
    color: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    iconBg: 'bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-300',
  },
}

// =========================================================================
// State
// =========================================================================

interface DashboardStats {
  totalProducts: number
  activeProducts: number
  draftProducts: number
  discontinuedProducts: number
  archivedProducts: number
  totalVariants: number
}

interface QualityOverview {
  avgCompleteness: number
  excellent: number
  good: number
  fair: number
  poor: number
}

interface SyncOverview {
  synced: number
  pending: number
  errors: number
  conflicts: number
  notSynced: number
}

const isLoading = ref(true)
const error = ref<string | null>(null)

const stats = ref<DashboardStats>({
  totalProducts: 0,
  activeProducts: 0,
  draftProducts: 0,
  discontinuedProducts: 0,
  archivedProducts: 0,
  totalVariants: 0,
})

const quality = ref<QualityOverview>({
  avgCompleteness: 0,
  excellent: 0,
  good: 0,
  fair: 0,
  poor: 0,
})

const syncStatus = ref<SyncOverview>({
  synced: 0,
  pending: 0,
  errors: 0,
  conflicts: 0,
  notSynced: 0,
})

const recentProducts = ref<ProductMaster[]>([])

// =========================================================================
// Computed
// =========================================================================

const qualityDistribution = computed(() => {
  const total = quality.value.excellent + quality.value.good + quality.value.fair + quality.value.poor
  if (total === 0) return { excellent: 0, good: 0, fair: 0, poor: 0 }
  return {
    excellent: Math.round((quality.value.excellent / total) * 100),
    good: Math.round((quality.value.good / total) * 100),
    fair: Math.round((quality.value.fair / total) * 100),
    poor: Math.round((quality.value.poor / total) * 100),
  }
})

const completenessColor = computed(() => {
  const avg = quality.value.avgCompleteness
  if (avg >= 80) return 'text-green-500 dark:text-green-400'
  if (avg >= 60) return 'text-yellow-500 dark:text-yellow-400'
  if (avg >= 40) return 'text-orange-500 dark:text-orange-400'
  return 'text-red-500 dark:text-red-400'
})

const completenessBarColor = computed(() => {
  const avg = quality.value.avgCompleteness
  if (avg >= 80) return 'bg-green-500'
  if (avg >= 60) return 'bg-yellow-500'
  if (avg >= 40) return 'bg-orange-500'
  return 'bg-red-500'
})

const syncTotal = computed(() =>
  syncStatus.value.synced + syncStatus.value.pending +
  syncStatus.value.errors + syncStatus.value.conflicts +
  syncStatus.value.notSynced
)

const hasSyncIssues = computed(() =>
  syncStatus.value.errors > 0 || syncStatus.value.conflicts > 0
)

const recentProductColumns: DataTableColumn[] = [
  { key: 'product_name', label: 'Product', sortable: false },
  { key: 'product_code', label: 'Code', sortable: false, hideOnMobile: true },
  { key: 'status', label: 'Status', sortable: false },
  { key: 'completeness_score', label: 'Completeness', sortable: false, align: 'right', hideOnMobile: true },
  { key: 'modified', label: 'Modified', sortable: false, hideOnMobile: true },
]

// =========================================================================
// Quick Actions
// =========================================================================

interface QuickAction {
  label: string
  description: string
  icon: string
  action: () => void
  color: string
  iconBg: string
}

const allQuickActions: QuickAction[] = [
  {
    label: 'Create Product',
    description: 'Add a new product to your catalog',
    icon: 'plus',
    action: () => router.push(`/doc/${encodeURIComponent('Product Master')}/new`),
    color: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    iconBg: 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300',
  },
  {
    label: 'View Products',
    description: 'Browse and manage all products',
    icon: 'list',
    action: () => router.push('/products'),
    color: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    iconBg: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
  },
  {
    label: 'Run Setup Wizard',
    description: 'Configure your PIM environment',
    icon: 'wizard',
    action: () => router.push('/onboarding'),
    color: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
  },
  {
    label: 'Settings',
    description: 'Manage PIM configuration',
    icon: 'settings',
    action: () => router.push('/settings'),
    color: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    iconBg: 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300',
  },
]

const quickActions = computed(() => {
  const base = isOnboardingCompleted.value
    ? allQuickActions.filter((a) => a.label !== 'Run Setup Wizard')
    : allQuickActions

  // A) Append role-specific action if onboarding complete and role is known
  if (isOnboardingCompleted.value && primaryRole.value) {
    const extra = ROLE_EXTRA_ACTIONS[primaryRole.value]
    if (extra) return [...base, extra]
  }

  return base
})

// =========================================================================
// Data Fetching
// =========================================================================

async function loadDashboardData(): Promise<void> {
  isLoading.value = true
  error.value = null

  try {
    await Promise.all([
      loadProductStats(),
      loadRecentProducts(),
    ])
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load dashboard data'
  } finally {
    isLoading.value = false
  }
}

async function loadProductStats(): Promise<void> {
  try {
    const [totalCount, activeCount, draftCount, discontinuedCount] = await Promise.all([
      api.getCount('Item', { custom_pim_product_id: ['is', 'set'] }).catch(() => 0),
      api.getCount('Item', { custom_pim_product_id: ['is', 'set'], custom_pim_status: 'Active' }).catch(() => 0),
      api.getCount('Item', { custom_pim_product_id: ['is', 'set'], custom_pim_status: 'Draft' }).catch(() => 0),
      api.getCount('Item', { custom_pim_product_id: ['is', 'set'], custom_pim_status: 'Discontinued' }).catch(() => 0),
    ])

    stats.value = {
      totalProducts: totalCount,
      activeProducts: activeCount,
      draftProducts: draftCount,
      discontinuedProducts: discontinuedCount,
      archivedProducts: Math.max(0, totalCount - activeCount - draftCount - discontinuedCount),
      totalVariants: 0,
    }

    const variantCount = await api.getCount('Product Variant').catch(() => 0)
    stats.value.totalVariants = variantCount

    await loadQualityOverview()
    await loadSyncOverview()
  } catch {
    // Stats loading failed - show zeros
  }
}

async function loadQualityOverview(): Promise<void> {
  try {
    const products = await api.getList<{ name: string; custom_pim_completeness: number }>({
      doctype: 'Item',
      fields: ['name', 'custom_pim_completeness'],
      filters: { custom_pim_product_id: ['is', 'set'] },
      limit_page_length: 0,
    })

    if (products.length === 0) {
      quality.value = { avgCompleteness: 0, excellent: 0, good: 0, fair: 0, poor: 0 }
      return
    }

    let totalCompleteness = 0
    let excellent = 0
    let good = 0
    let fair = 0
    let poor = 0

    for (const product of products) {
      const score = product.custom_pim_completeness || 0
      totalCompleteness += score
      if (score >= 80) excellent++
      else if (score >= 60) good++
      else if (score >= 40) fair++
      else poor++
    }

    quality.value = {
      avgCompleteness: Math.round(totalCompleteness / products.length),
      excellent,
      good,
      fair,
      poor,
    }
  } catch {
    // Quality loading failed - show zeros
  }
}

async function loadSyncOverview(): Promise<void> {
  try {
    const [syncedCount, pendingCount, errorCount, conflictCount, notSyncedCount] = await Promise.all([
      api.getCount('Item', { custom_pim_product_id: ['is', 'set'], custom_pim_sync_status: 'Synced' }).catch(() => 0),
      api.getCount('Item', { custom_pim_product_id: ['is', 'set'], custom_pim_sync_status: 'Pending' }).catch(() => 0),
      api.getCount('Item', { custom_pim_product_id: ['is', 'set'], custom_pim_sync_status: 'Error' }).catch(() => 0),
      api.getCount('Item', { custom_pim_product_id: ['is', 'set'], custom_pim_sync_status: 'Conflict' }).catch(() => 0),
      api.getCount('Item', { custom_pim_product_id: ['is', 'set'], custom_pim_sync_status: 'Not Synced' }).catch(() => 0),
    ])

    syncStatus.value = {
      synced: syncedCount,
      pending: pendingCount,
      errors: errorCount,
      conflicts: conflictCount,
      notSynced: notSyncedCount,
    }
  } catch {
    // Sync loading failed - show zeros
  }
}

async function loadRecentProducts(): Promise<void> {
  try {
    const result = await api.callMethod<{
      products: ProductMaster[]
      total: number
      page: number
      page_size: number
    }>(PIM_API.products.list, {
      page: 1,
      page_size: 5,
      order_by: 'modified',
      order_dir: 'desc',
    })
    recentProducts.value = result.products || []
  } catch {
    recentProducts.value = []
  }
}

// =========================================================================
// Helpers
// =========================================================================

function getStatusBadgeClass(status: ProductStatus): string {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'Draft':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case 'Discontinued':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    case 'Archived':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

function getCompletenessBarClass(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function handleRecentProductClick(row: Record<string, unknown>): void {
  if (row.name) {
    router.push(`/doc/${encodeURIComponent('Product Master')}/${encodeURIComponent(String(row.name))}`)
  }
}

// =========================================================================
// Lifecycle
// =========================================================================

onMounted(() => {
  loadDashboardData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
          {{ t('nav.dashboard') }}
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ t('app.subtitle') }}
        </p>
      </div>
      <div class="flex gap-3">
        <button
          type="button"
          class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
          @click="loadDashboardData"
        >
          <svg class="me-1.5 h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4" />
          </svg>
          Refresh
        </button>
        <button
          type="button"
          class="inline-flex items-center rounded-lg bg-primary-700 px-3 py-2 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
          @click="router.push(`/doc/${encodeURIComponent('Product Master')}/new`)"
        >
          <svg class="me-1.5 h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7 7V5" />
          </svg>
          {{ t('products.createProduct') }}
        </button>
      </div>
    </div>

    <!-- Industry Banner -->
    <div
      v-if="industryConfig"
      :class="[
        'rounded-lg border p-4',
        industryConfig.bgColor,
        industryConfig.borderColor,
      ]"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3">
          <div :class="['mt-0.5 flex-shrink-0', industryConfig.color]">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p :class="['text-sm font-semibold', industryConfig.color]">
              {{ industryConfig.label }} Industry Profile Active
            </p>
            <p class="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{{ industryConfig.description }}</p>
            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <span
                v-for="tip in industryConfig.tips"
                :key="tip"
                class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                <svg class="h-3 w-3 flex-shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                {{ tip }}
              </span>
            </div>
          </div>
        </div>
        <button
          class="shrink-0 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
          @click="router.push('/settings')"
        >
          View Settings →
        </button>
      </div>
    </div>

    <!-- Suggestion Cards (B + D): import source and scale recommendations -->
    <div v-if="suggestionCards.length > 0" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="card in suggestionCards"
        :key="card.id"
        :class="['rounded-lg border p-4', card.color]"
      >
        <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ card.title }}</p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ card.description }}</p>
        <button
          class="mt-2 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
          @click="card.action()"
        >
          {{ card.actionLabel }} →
        </button>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="error"
      class="flex items-center rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-gray-800 dark:text-red-400"
      role="alert"
    >
      <svg class="me-3 h-5 w-5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm-1 5a1 1 0 0 1 2 0v5a1 1 0 0 1-2 0V7Zm1 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
      </svg>
      <span class="flex-1">{{ error }}</span>
      <button
        type="button"
        class="ms-3 font-medium underline hover:no-underline"
        @click="loadDashboardData"
      >
        {{ t('common.retry') }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div role="status">
          <svg class="h-8 w-8 animate-spin fill-primary-600 text-gray-200 dark:text-gray-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
          </svg>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('common.loading') }}</p>
      </div>
    </div>

    <template v-else>
      <!-- Product Statistics Cards -->
      <section>
        <h3 class="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Product Statistics
        </h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <!-- Total Products -->
          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Products</p>
              <div class="rounded-lg bg-primary-100 p-2 dark:bg-primary-900">
                <svg class="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <p class="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{{ stats.totalProducts }}</p>
          </div>

          <!-- Active -->
          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Active</p>
              <div class="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <svg class="h-5 w-5 text-green-600 dark:text-green-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.5 11.5 11 14l4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
            </div>
            <p class="mt-3 text-3xl font-bold text-green-600 dark:text-green-400">{{ stats.activeProducts }}</p>
          </div>

          <!-- Draft -->
          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Draft</p>
              <div class="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900">
                <svg class="h-5 w-5 text-yellow-600 dark:text-yellow-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14.304 4.844 2.852 2.852M7 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4.5m2.409-9.91a2.017 2.017 0 0 1 0 2.853l-6.844 6.844L8 14l.713-3.565 6.844-6.844a2.015 2.015 0 0 1 2.852 0Z" />
                </svg>
              </div>
            </div>
            <p class="mt-3 text-3xl font-bold text-yellow-600 dark:text-yellow-400">{{ stats.draftProducts }}</p>
          </div>

          <!-- Discontinued -->
          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Discontinued</p>
              <div class="rounded-lg bg-red-100 p-2 dark:bg-red-900">
                <svg class="h-5 w-5 text-red-600 dark:text-red-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 9-6 6m0-6 6 6m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
            </div>
            <p class="mt-3 text-3xl font-bold text-red-600 dark:text-red-400">{{ stats.discontinuedProducts }}</p>
          </div>

          <!-- Archived -->
          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Archived</p>
              <div class="rounded-lg bg-gray-100 p-2 dark:bg-gray-600">
                <svg class="h-5 w-5 text-gray-500 dark:text-gray-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm0 0V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2M10 12h4" />
                </svg>
              </div>
            </div>
            <p class="mt-3 text-3xl font-bold text-gray-500 dark:text-gray-400">{{ stats.archivedProducts }}</p>
          </div>

          <!-- Variants -->
          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Variants</p>
              <div class="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
                <svg class="h-5 w-5 text-purple-600 dark:text-purple-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 8v3a1 1 0 0 1-1 1H5m11 4h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-7a1 1 0 0 0-1 1v1m4 3v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h2" />
                </svg>
              </div>
            </div>
            <p class="mt-3 text-3xl font-bold text-purple-600 dark:text-purple-400">{{ stats.totalVariants }}</p>
          </div>
        </div>
      </section>

      <!-- Quality Overview + Sync Status (side by side) -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Quality Overview -->
        <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Quality Overview</h3>
            <span :class="['text-2xl font-bold', completenessColor]">
              {{ quality.avgCompleteness }}%
            </span>
          </div>

          <!-- Average Completeness Bar -->
          <div class="mb-6">
            <div class="mb-1 flex justify-between text-sm">
              <span class="text-gray-500 dark:text-gray-400">Average Completeness</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ quality.avgCompleteness }}%</span>
            </div>
            <div class="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                :class="['h-2.5 rounded-full transition-all duration-500', completenessBarColor]"
                :style="{ width: `${quality.avgCompleteness}%` }"
              />
            </div>
          </div>

          <!-- Quality Distribution -->
          <div class="space-y-3">
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <span class="h-3 w-3 rounded-full bg-green-500" />
                <span class="text-gray-700 dark:text-gray-300">Excellent (80-100%)</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900 dark:text-white">{{ quality.excellent }}</span>
                <span class="w-12 text-right text-xs text-gray-500 dark:text-gray-400">{{ qualityDistribution.excellent }}%</span>
              </div>
            </div>
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <span class="h-3 w-3 rounded-full bg-yellow-500" />
                <span class="text-gray-700 dark:text-gray-300">Good (60-79%)</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900 dark:text-white">{{ quality.good }}</span>
                <span class="w-12 text-right text-xs text-gray-500 dark:text-gray-400">{{ qualityDistribution.good }}%</span>
              </div>
            </div>
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <span class="h-3 w-3 rounded-full bg-orange-500" />
                <span class="text-gray-700 dark:text-gray-300">Fair (40-59%)</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900 dark:text-white">{{ quality.fair }}</span>
                <span class="w-12 text-right text-xs text-gray-500 dark:text-gray-400">{{ qualityDistribution.fair }}%</span>
              </div>
            </div>
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <span class="h-3 w-3 rounded-full bg-red-500" />
                <span class="text-gray-700 dark:text-gray-300">Poor (0-39%)</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900 dark:text-white">{{ quality.poor }}</span>
                <span class="w-12 text-right text-xs text-gray-500 dark:text-gray-400">{{ qualityDistribution.poor }}%</span>
              </div>
            </div>
          </div>

          <!-- Distribution bar (horizontal stacked) -->
          <div
            v-if="stats.totalProducts > 0"
            class="mt-4 flex h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
          >
            <div class="bg-green-500" :style="{ width: `${qualityDistribution.excellent}%` }" />
            <div class="bg-yellow-500" :style="{ width: `${qualityDistribution.good}%` }" />
            <div class="bg-orange-500" :style="{ width: `${qualityDistribution.fair}%` }" />
            <div class="bg-red-500" :style="{ width: `${qualityDistribution.poor}%` }" />
          </div>
        </section>

        <!-- Sync Status -->
        <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">ERPNext Sync Status</h3>
            <span
              v-if="hasSyncIssues"
              class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-300"
            >
              <svg class="h-3 w-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm-1 5a1 1 0 0 1 2 0v5a1 1 0 0 1-2 0V7Zm1 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
              </svg>
              Issues detected
            </span>
            <span
              v-else-if="syncTotal > 0"
              class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300"
            >
              <svg class="h-3 w-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 11.917 9.724 16.5 19 7.5" />
              </svg>
              All synced
            </span>
          </div>

          <div class="space-y-4">
            <!-- Synced -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <svg class="h-5 w-5 text-green-600 dark:text-green-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 11.917 9.724 16.5 19 7.5" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">Synced</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Up to date with ERPNext</p>
                </div>
              </div>
              <span class="text-lg font-semibold text-green-600 dark:text-green-400">{{ syncStatus.synced }}</span>
            </div>

            <!-- Pending -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <svg class="h-5 w-5 text-blue-600 dark:text-blue-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">Pending</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Waiting to be synced</p>
                </div>
              </div>
              <span class="text-lg font-semibold text-blue-600 dark:text-blue-400">{{ syncStatus.pending }}</span>
            </div>

            <!-- Errors -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900">
                  <svg class="h-5 w-5 text-red-600 dark:text-red-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 9-6 6m0-6 6 6m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">Errors</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Failed to sync</p>
                </div>
              </div>
              <span :class="['text-lg font-semibold', syncStatus.errors > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400']">
                {{ syncStatus.errors }}
              </span>
            </div>

            <!-- Conflicts -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900">
                  <svg class="h-5 w-5 text-yellow-600 dark:text-yellow-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">Conflicts</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Requires manual review</p>
                </div>
              </div>
              <span :class="['text-lg font-semibold', syncStatus.conflicts > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400']">
                {{ syncStatus.conflicts }}
              </span>
            </div>

            <!-- Not Synced -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-600">
                  <svg class="h-5 w-5 text-gray-500 dark:text-gray-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-3-3v6m-8-3a9 9 0 1 1 18 0 9 9 0 0 1-18 0Z" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">Not Synced</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">PIM-only products</p>
                </div>
              </div>
              <span class="text-lg font-semibold text-gray-500 dark:text-gray-400">{{ syncStatus.notSynced }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- Quick Actions -->
      <section>
        <h3 class="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Quick Actions
        </h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            v-for="action in quickActions"
            :key="action.label"
            :class="[
              'flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800',
              action.color,
            ]"
            @click="action.action()"
          >
            <div :class="['rounded-lg p-2.5', action.iconBg]">
              <!-- Plus icon -->
              <svg v-if="action.icon === 'plus'" class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7 7V5" />
              </svg>
              <!-- List icon -->
              <svg v-else-if="action.icon === 'list'" class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 9h6m-6 3h6m-6 3h6M6.996 9h.01m-.01 3h.01m-.01 3h.01M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
              </svg>
              <!-- Wizard icon -->
              <svg v-else-if="action.icon === 'wizard'" class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18.5A2.493 2.493 0 0 1 7.51 20H7.5a2.468 2.468 0 0 1-2.4-3.154 2.98 2.98 0 0 1-.85-5.274 2.468 2.468 0 0 1 .921-3.182 2.477 2.477 0 0 1 1.875-3.344 2.5 2.5 0 0 1 3.41-1.856A2.5 2.5 0 0 1 12 5.5m0 13v-13m0 13a2.493 2.493 0 0 0 4.49 1.5h.01a2.468 2.468 0 0 0 2.4-3.154 2.98 2.98 0 0 0 .85-5.274 2.468 2.468 0 0 0-.922-3.182 2.477 2.477 0 0 0-1.875-3.344A2.5 2.5 0 0 0 13.5 3.19 2.5 2.5 0 0 0 12 5.5" />
              </svg>
              <!-- Quality icon -->
              <svg v-else-if="action.icon === 'quality'" class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.083 5.104c.35-.8 1.485-.8 1.834 0l1.752 4.022 4.399.32c.86.063 1.205 1.13.567 1.678l-3.33 2.898 1.002 4.286c.194.829-.657 1.486-1.379 1.056L12 17.01l-3.928 2.354c-.722.43-1.573-.227-1.379-1.056l1.002-4.286-3.33-2.898c-.638-.548-.292-1.615.567-1.678l4.399-.32 1.752-4.022Z" />
              </svg>
              <!-- Channel icon -->
              <svg v-else-if="action.icon === 'channel'" class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15v4m6-6v6m6-4v4m6-6v6M3 11l6-5 6 5 5.5-5.5" />
              </svg>
              <!-- Sync icon -->
              <svg v-else-if="action.icon === 'sync'" class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4" />
              </svg>
              <!-- Brand icon -->
              <svg v-else-if="action.icon === 'brand'" class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10V6a3 3 0 0 1 3-3v0a3 3 0 0 1 3 3v4m3-2 .917 11.923A1 1 0 0 1 17.92 21H6.08a1 1 0 0 1-.997-1.077L6 8h12Z" />
              </svg>
              <!-- Attributes icon -->
              <svg v-else-if="action.icon === 'attributes'" class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              <!-- Export icon -->
              <svg v-else-if="action.icon === 'export'" class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2m-8 1V4m0 12-4-4m4 4 4-4" />
              </svg>
              <!-- Settings icon -->
              <svg v-else class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13v-2a1 1 0 0 0-1-1h-.757l-.707-1.707.535-.536a1 1 0 0 0 0-1.414l-1.414-1.414a1 1 0 0 0-1.414 0l-.536.535L14 4.757V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v.757l-1.707.707-.536-.535a1 1 0 0 0-1.414 0L4.929 6.343a1 1 0 0 0 0 1.414l.536.536L4.757 10H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h.757l.707 1.707-.535.536a1 1 0 0 0 0 1.414l1.414 1.414a1 1 0 0 0 1.414 0l.536-.535L10 19.243V20a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-.757l1.707-.708.536.536a1 1 0 0 0 1.414 0l1.414-1.414a1 1 0 0 0 0-1.414l-.535-.536.707-1.707H20a1 1 0 0 0 1-1Z" />
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ action.label }}</p>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ action.description }}</p>
            </div>
          </button>
        </div>
      </section>

      <!-- Recent Products -->
      <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Products</h3>
          <button
            type="button"
            class="text-sm font-medium text-primary-700 hover:underline dark:text-primary-500"
            @click="router.push('/products')"
          >
            View all &rarr;
          </button>
        </div>

        <DataTable
          :columns="recentProductColumns"
          :rows="(recentProducts as unknown as Record<string, unknown>[])"
          row-key="name"
          :loading="false"
          :clickable="true"
          empty-message="No products yet. Create your first product to get started."
          @row-click="handleRecentProductClick"
        >
          <template #cell-product_name="{ row }">
            <span class="font-medium text-gray-900 dark:text-white">{{ row.product_name }}</span>
          </template>

          <template #cell-product_code="{ row }">
            <code class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              {{ row.product_code }}
            </code>
          </template>

          <template #cell-status="{ row }">
            <span
              :class="[
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                getStatusBadgeClass(row.status as ProductStatus),
              ]"
            >
              {{ row.status }}
            </span>
          </template>

          <template #cell-completeness_score="{ row }">
            <div class="flex items-center gap-2">
              <div class="h-1.5 w-16 rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  :class="['h-1.5 rounded-full', getCompletenessBarClass(Number(row.completeness_score || 0))]"
                  :style="{ width: `${row.completeness_score || 0}%` }"
                />
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ row.completeness_score || 0 }}%</span>
            </div>
          </template>

          <template #cell-modified="{ row }">
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(row.modified as string) }}</span>
          </template>
        </DataTable>
      </section>
    </template>
  </div>
</template>
