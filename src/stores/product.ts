/**
 * Pinia store for product management.
 *
 * Provides reactive state and actions for:
 * - Product listing with filtering, searching, and pagination
 * - Product CRUD operations (create, read, update, delete)
 * - Bulk operations (multi-select, bulk update)
 * - Product variant management
 * - Product family and category tree data
 *
 * Uses the Product Master Virtual DocType via:
 * - frappe_pim.pim.api.product (whitelisted API)
 * - Frappe Resource API for direct DocType operations
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useFrappeAPI, PIM_API } from '@/composables/useFrappeAPI'
import type {
  ProductMaster,
  ProductVariant,
  ProductListResponse,
  ProductListParams,
  ProductFamily,
  CategoryTreeNode,
  FamilyTreeNode,
  VariantGenerationRequest,
  VariantGenerationResult,
  QualityScoreResult,
} from '@/types'

/** Default page size for product lists */
const DEFAULT_PAGE_SIZE = 20

/** Maximum page size allowed by the API */
const MAX_PAGE_SIZE = 200

export const useProductStore = defineStore('product', () => {
  // =========================================================================
  // State
  // =========================================================================

  /** List of products from the current query */
  const products = ref<ProductMaster[]>([])

  /** Total count of products matching current filters */
  const totalCount = ref(0)

  /** Current page number (1-based) */
  const currentPage = ref(1)

  /** Number of products per page */
  const pageSize = ref(DEFAULT_PAGE_SIZE)

  /** Active filters for product listing */
  const filters = ref<ProductListParams>({})

  /** Currently loaded product detail */
  const currentProduct = ref<ProductMaster | null>(null)

  /** Variants of the currently loaded product */
  const currentVariants = ref<ProductVariant[]>([])

  /** Quality score for the currently loaded product */
  const currentQualityScore = ref<QualityScoreResult | null>(null)

  /** Selected product names for bulk operations */
  const selectedProducts = ref<Set<string>>(new Set())

  /** Loading state for list operations */
  const listLoading = ref(false)

  /** Loading state for detail operations */
  const detailLoading = ref(false)

  /** Loading state for save operations */
  const saveLoading = ref(false)

  /** Error from the last API operation */
  const error = ref<string | null>(null)

  /** Product families for filter dropdowns */
  const families = ref<ProductFamily[]>([])

  /** Family tree for hierarchical selection */
  const familyTree = ref<FamilyTreeNode[]>([])

  /** Category tree for hierarchical selection */
  const categoryTree = ref<CategoryTreeNode[]>([])

  // =========================================================================
  // Computed
  // =========================================================================

  /** Total number of pages based on current page size */
  const totalPages = computed(() => {
    if (totalCount.value === 0) return 1
    return Math.ceil(totalCount.value / pageSize.value)
  })

  /** Whether there is a next page */
  const hasNextPage = computed(() => currentPage.value < totalPages.value)

  /** Whether there is a previous page */
  const hasPrevPage = computed(() => currentPage.value > 1)

  /** Whether products are currently loading */
  const isLoading = computed(() => listLoading.value || detailLoading.value || saveLoading.value)

  /** Number of selected products */
  const selectedCount = computed(() => selectedProducts.value.size)

  /** Whether all products on the current page are selected */
  const allPageSelected = computed(() => {
    if (products.value.length === 0) return false
    return products.value.every((p) => selectedProducts.value.has(p.name))
  })

  /** Whether any product is selected */
  const hasSelection = computed(() => selectedProducts.value.size > 0)

  /** Active filter count (non-empty filter parameters) */
  const activeFilterCount = computed(() => {
    let count = 0
    if (filters.value.product_family) count++
    if (filters.value.status) count++
    if (filters.value.search) count++
    if (filters.value.completeness_min !== undefined) count++
    if (filters.value.completeness_max !== undefined) count++
    return count
  })

  // =========================================================================
  // Actions - Product Listing
  // =========================================================================

  const api = useFrappeAPI()

  /**
   * Fetch products with current filters and pagination.
   * This is the primary method for loading the product list.
   */
  async function fetchProducts(params?: Partial<ProductListParams>): Promise<void> {
    listLoading.value = true
    error.value = null

    // Merge provided params with current filters
    const mergedParams: ProductListParams = {
      ...filters.value,
      ...params,
      page: params?.page ?? currentPage.value,
      page_size: params?.page_size ?? pageSize.value,
    }

    try {
      const result = await api.callMethod<ProductListResponse>(
        PIM_API.products.list,
        mergedParams as Record<string, unknown>,
      )
      products.value = result.products
      totalCount.value = result.total
      currentPage.value = result.page
      pageSize.value = result.page_size
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch products'
      products.value = []
      totalCount.value = 0
    } finally {
      listLoading.value = false
    }
  }

  /**
   * Apply filters and reload the product list from page 1.
   */
  async function applyFilters(newFilters: Partial<ProductListParams>): Promise<void> {
    filters.value = { ...filters.value, ...newFilters }
    currentPage.value = 1
    selectedProducts.value.clear()
    await fetchProducts()
  }

  /**
   * Set the search term and reload products.
   */
  async function search(term: string): Promise<void> {
    filters.value.search = term || undefined
    currentPage.value = 1
    await fetchProducts()
  }

  /**
   * Clear all filters and reload.
   */
  async function clearFilters(): Promise<void> {
    filters.value = {}
    currentPage.value = 1
    selectedProducts.value.clear()
    await fetchProducts()
  }

  /**
   * Navigate to a specific page.
   */
  async function goToPage(page: number): Promise<void> {
    const targetPage = Math.max(1, Math.min(page, totalPages.value))
    currentPage.value = targetPage
    await fetchProducts()
  }

  /**
   * Go to the next page.
   */
  async function nextPage(): Promise<void> {
    if (hasNextPage.value) {
      await goToPage(currentPage.value + 1)
    }
  }

  /**
   * Go to the previous page.
   */
  async function prevPage(): Promise<void> {
    if (hasPrevPage.value) {
      await goToPage(currentPage.value - 1)
    }
  }

  /**
   * Change the page size and reload from page 1.
   */
  async function setPageSize(size: number): Promise<void> {
    pageSize.value = Math.max(1, Math.min(size, MAX_PAGE_SIZE))
    currentPage.value = 1
    await fetchProducts()
  }

  /**
   * Sort products by a field.
   */
  async function sortBy(field: string, direction: 'asc' | 'desc' = 'desc'): Promise<void> {
    filters.value.order_by = field
    filters.value.order_dir = direction
    currentPage.value = 1
    await fetchProducts()
  }

  // =========================================================================
  // Actions - Product CRUD
  // =========================================================================

  /**
   * Fetch a single product by name/ID with full details.
   */
  async function fetchProduct(name: string): Promise<ProductMaster | null> {
    detailLoading.value = true
    error.value = null

    try {
      const result = await api.callMethod<ProductMaster>(
        PIM_API.products.detail,
        { name },
      )
      currentProduct.value = result
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch product'
      currentProduct.value = null
      return null
    } finally {
      detailLoading.value = false
    }
  }

  /**
   * Create a new product.
   */
  async function createProduct(data: Partial<ProductMaster>): Promise<ProductMaster | null> {
    saveLoading.value = true
    error.value = null

    try {
      const result = await api.callMethod<ProductMaster>(
        PIM_API.products.create,
        data as Record<string, unknown>,
      )
      // Refresh the product list to include the new product
      await fetchProducts()
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create product'
      return null
    } finally {
      saveLoading.value = false
    }
  }

  /**
   * Update an existing product.
   */
  async function updateProduct(
    name: string,
    data: Partial<ProductMaster>,
  ): Promise<ProductMaster | null> {
    saveLoading.value = true
    error.value = null

    try {
      const result = await api.callMethod<ProductMaster>(
        PIM_API.products.update,
        { name, ...data } as Record<string, unknown>,
      )

      // Update current product if it's the one being edited
      if (currentProduct.value?.name === name) {
        currentProduct.value = result
      }

      // Update the product in the list if present
      const index = products.value.findIndex((p) => p.name === name)
      if (index >= 0) {
        products.value[index] = result
      }

      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update product'
      return null
    } finally {
      saveLoading.value = false
    }
  }

  /**
   * Delete a product.
   */
  async function deleteProduct(name: string): Promise<boolean> {
    saveLoading.value = true
    error.value = null

    try {
      await api.callMethod(PIM_API.products.delete, { name })

      // Remove from current list
      products.value = products.value.filter((p) => p.name !== name)
      totalCount.value = Math.max(0, totalCount.value - 1)

      // Clear current product if it's the one being deleted
      if (currentProduct.value?.name === name) {
        currentProduct.value = null
      }

      // Remove from selection
      selectedProducts.value.delete(name)

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete product'
      return false
    } finally {
      saveLoading.value = false
    }
  }

  /**
   * Bulk update a field across multiple products.
   */
  async function bulkUpdate(
    productNames: string[],
    field: string,
    value: unknown,
  ): Promise<boolean> {
    saveLoading.value = true
    error.value = null

    try {
      await api.callMethod(PIM_API.products.bulkUpdate, {
        names: productNames,
        field,
        value,
      })

      // Refresh the list to reflect changes
      await fetchProducts()
      selectedProducts.value.clear()
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to bulk update products'
      return false
    } finally {
      saveLoading.value = false
    }
  }

  // =========================================================================
  // Actions - Variant Management
  // =========================================================================

  /**
   * Fetch variants for a product.
   */
  async function fetchVariants(parentProduct: string): Promise<ProductVariant[]> {
    detailLoading.value = true
    error.value = null

    try {
      const variants = await api.getList<ProductVariant>({
        doctype: 'Product Variant',
        filters: { parent_product: parentProduct },
        fields: [
          'name', 'variant_code', 'variant_name', 'variant_level',
          'sku', 'status', 'erp_item', 'sync_status', 'completeness_score',
        ],
        order_by: 'variant_code asc',
        limit_page_length: 100,
      })
      currentVariants.value = variants
      return variants
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch variants'
      currentVariants.value = []
      return []
    } finally {
      detailLoading.value = false
    }
  }

  /**
   * Generate variant combinations for a product.
   */
  async function generateVariants(
    request: VariantGenerationRequest,
  ): Promise<VariantGenerationResult | null> {
    saveLoading.value = true
    error.value = null

    try {
      const result = await api.callMethod<VariantGenerationResult>(
        'frappe_pim.pim.api.product.generate_variants',
        request as unknown as Record<string, unknown>,
      )
      // Refresh variants list after generation
      await fetchVariants(request.parent_product)
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to generate variants'
      return null
    } finally {
      saveLoading.value = false
    }
  }

  // =========================================================================
  // Actions - Selection Management
  // =========================================================================

  /** Toggle selection of a single product */
  function toggleSelection(name: string): void {
    if (selectedProducts.value.has(name)) {
      selectedProducts.value.delete(name)
    } else {
      selectedProducts.value.add(name)
    }
  }

  /** Select all products on the current page */
  function selectAll(): void {
    for (const product of products.value) {
      selectedProducts.value.add(product.name)
    }
  }

  /** Deselect all products */
  function deselectAll(): void {
    selectedProducts.value.clear()
  }

  /** Toggle select all on the current page */
  function toggleSelectAll(): void {
    if (allPageSelected.value) {
      deselectAll()
    } else {
      selectAll()
    }
  }

  // =========================================================================
  // Actions - Reference Data
  // =========================================================================

  /**
   * Fetch product families for dropdown/filter options.
   */
  async function fetchFamilies(): Promise<void> {
    try {
      const result = await api.callMethod<ProductFamily[]>(
        PIM_API.products.families,
      )
      families.value = result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch families'
    }
  }

  /**
   * Fetch category tree for hierarchical selection.
   */
  async function fetchCategoryTree(): Promise<void> {
    try {
      const result = await api.callMethod<CategoryTreeNode[]>(
        PIM_API.taxonomy.categoryTree,
      )
      categoryTree.value = result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch category tree'
    }
  }

  /**
   * Fetch family tree for hierarchical selection.
   */
  async function fetchFamilyTree(): Promise<void> {
    try {
      const result = await api.callMethod<FamilyTreeNode[]>(
        PIM_API.taxonomy.familyTree,
      )
      familyTree.value = result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch family tree'
    }
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  /**
   * Clear the current product detail and variants.
   */
  function clearCurrentProduct(): void {
    currentProduct.value = null
    currentVariants.value = []
    currentQualityScore.value = null
  }

  /**
   * Clear the error state.
   */
  function clearError(): void {
    error.value = null
  }

  /**
   * Reset the entire store to initial state.
   */
  function $reset(): void {
    products.value = []
    totalCount.value = 0
    currentPage.value = 1
    pageSize.value = DEFAULT_PAGE_SIZE
    filters.value = {}
    currentProduct.value = null
    currentVariants.value = []
    currentQualityScore.value = null
    selectedProducts.value.clear()
    listLoading.value = false
    detailLoading.value = false
    saveLoading.value = false
    error.value = null
    families.value = []
    familyTree.value = []
    categoryTree.value = []
  }

  return {
    // State
    products,
    totalCount,
    currentPage,
    pageSize,
    filters,
    currentProduct,
    currentVariants,
    currentQualityScore,
    selectedProducts,
    listLoading,
    detailLoading,
    saveLoading,
    error,
    families,
    familyTree,
    categoryTree,

    // Computed
    totalPages,
    hasNextPage,
    hasPrevPage,
    isLoading,
    selectedCount,
    allPageSelected,
    hasSelection,
    activeFilterCount,

    // Actions - Listing
    fetchProducts,
    applyFilters,
    search,
    clearFilters,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    sortBy,

    // Actions - CRUD
    fetchProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkUpdate,

    // Actions - Variants
    fetchVariants,
    generateVariants,

    // Actions - Selection
    toggleSelection,
    selectAll,
    deselectAll,
    toggleSelectAll,

    // Actions - Reference Data
    fetchFamilies,
    fetchCategoryTree,
    fetchFamilyTree,

    // Utilities
    clearCurrentProduct,
    clearError,
    $reset,
  }
})
