<script setup lang="ts">
/**
 * TaxonomyStep - Category and brand configuration step (Step 5).
 *
 * Collects:
 * - Category source selection (template, custom, import, GPC)
 * - Category tree data (editable tree structure)
 * - Brand names (tag-style input)
 *
 * When "template" source is selected, categories are pre-populated from
 * the industry template preview. Users can then edit the tree by adding,
 * renaming, or removing nodes. The "custom" source starts with an empty
 * tree. "import" and "gpc" show informational messages about post-setup
 * options.
 *
 * Integrates with the onboarding store to:
 * - Read template preview for default categories
 * - Read/write step data via Pinia store
 * - Expose isValid for wizard navigation control
 */
import { reactive, ref, computed, watch, onMounted } from 'vue'
import { useOnboardingStore } from '@/stores/onboarding'
import type {
  TaxonomyData,
  CategoryNode,
  CategorySource,
  StepFormData,
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

/** Category source options */
const CATEGORY_SOURCES: readonly {
  value: CategorySource
  label: string
  description: string
  icon: string
}[] = [
  {
    value: 'template',
    label: 'Use Template Categories',
    description: 'Start with industry-specific categories from your template',
    icon: '&#128196;',
  },
  {
    value: 'custom',
    label: 'Build Custom Tree',
    description: 'Create your own category hierarchy from scratch',
    icon: '&#9998;',
  },
  {
    value: 'import',
    label: 'Import Later',
    description: 'Skip for now and import categories via CSV after setup',
    icon: '&#128229;',
  },
  {
    value: 'gpc',
    label: 'GS1 GPC Standard',
    description: 'Use Global Product Classification standard categories',
    icon: '&#127760;',
  },
] as const

/** New category input */
const newCategoryName = ref('')

/** New subcategory inputs per parent node (keyed by parent name) */
const newSubcategoryInputs = ref<Record<string, string>>({})

/** Expanded tree nodes (keyed by node name) */
const expandedNodes = ref<Set<string>>(new Set())

/** New brand name input */
const newBrandName = ref('')

/** Load initial data from store or props */
function getInitialData(): TaxonomyData {
  const storeData = store.getWizardStepData('taxonomy')
  const source = storeData ?? props.data

  return {
    category_source: (source?.category_source as CategorySource) ?? ('' as CategorySource),
    category_data: (source?.category_data as CategoryNode[]) ?? [],
    brand_names: (source?.brand_names as string[]) ?? [],
  }
}

const form = reactive<TaxonomyData>(getInitialData())

/** Sync initial data to store on mount */
onMounted(() => {
  store.setWizardStepData('taxonomy', { ...form })
})

/** Select a category source and handle template pre-population */
function selectSource(source: CategorySource): void {
  const previousSource = form.category_source
  form.category_source = source

  if (source === 'template' && (form.category_data ?? []).length === 0) {
    loadTemplateCategoriesIfAvailable()
  } else if (source === 'custom' && previousSource !== 'custom') {
    // Keep existing categories if switching from template to custom
    // They can edit what's already there
  } else if (source === 'import' || source === 'gpc') {
    // Clear categories for import/gpc — will be set up later
    if (previousSource !== source) {
      form.category_data = []
    }
  }
}

/** Load categories from template preview if available */
function loadTemplateCategoriesIfAvailable(): void {
  const preview = store.templatePreview
  if (!preview) return

  // The template preview may have product_families that can seed categories.
  // We build a basic category tree from industry template attribute_groups
  // or use a generic top-level structure based on the industry.
  const selectedIndustry = store.selectedIndustry
  if (selectedIndustry && selectedIndustry !== 'custom') {
    form.category_data = getDefaultCategoriesForIndustry(selectedIndustry)
  }
}

/** Default category trees per industry sector */
function getDefaultCategoriesForIndustry(industry: string): CategoryNode[] {
  const templates: Record<string, CategoryNode[]> = {
    fashion: [
      {
        name: 'clothing', label: 'Clothing', is_group: true, children: [
          { name: 'tops', label: 'Tops', is_group: true, children: [
            { name: 't_shirts', label: 'T-Shirts' },
            { name: 'shirts', label: 'Shirts' },
            { name: 'blouses', label: 'Blouses' },
          ]},
          { name: 'bottoms', label: 'Bottoms', is_group: true, children: [
            { name: 'jeans', label: 'Jeans' },
            { name: 'trousers', label: 'Trousers' },
            { name: 'skirts', label: 'Skirts' },
          ]},
          { name: 'outerwear', label: 'Outerwear' },
          { name: 'dresses', label: 'Dresses' },
        ],
      },
      {
        name: 'footwear', label: 'Footwear', is_group: true, children: [
          { name: 'sneakers', label: 'Sneakers' },
          { name: 'boots', label: 'Boots' },
          { name: 'sandals', label: 'Sandals' },
        ],
      },
      { name: 'accessories', label: 'Accessories', is_group: true, children: [
        { name: 'bags', label: 'Bags' },
        { name: 'jewelry', label: 'Jewelry' },
        { name: 'watches', label: 'Watches' },
      ]},
    ],
    electronics: [
      {
        name: 'computers', label: 'Computers', is_group: true, children: [
          { name: 'laptops', label: 'Laptops' },
          { name: 'desktops', label: 'Desktops' },
          { name: 'tablets', label: 'Tablets' },
        ],
      },
      {
        name: 'mobile', label: 'Mobile Devices', is_group: true, children: [
          { name: 'smartphones', label: 'Smartphones' },
          { name: 'smartwatches', label: 'Smartwatches' },
        ],
      },
      {
        name: 'components', label: 'Components', is_group: true, children: [
          { name: 'processors', label: 'Processors' },
          { name: 'memory', label: 'Memory' },
          { name: 'storage', label: 'Storage' },
        ],
      },
      { name: 'peripherals', label: 'Peripherals' },
    ],
    food: [
      {
        name: 'fresh', label: 'Fresh Products', is_group: true, children: [
          { name: 'fruits', label: 'Fruits' },
          { name: 'vegetables', label: 'Vegetables' },
          { name: 'dairy', label: 'Dairy' },
        ],
      },
      {
        name: 'packaged', label: 'Packaged Food', is_group: true, children: [
          { name: 'snacks', label: 'Snacks' },
          { name: 'canned', label: 'Canned Goods' },
          { name: 'frozen', label: 'Frozen Food' },
        ],
      },
      { name: 'beverages', label: 'Beverages', is_group: true, children: [
        { name: 'soft_drinks', label: 'Soft Drinks' },
        { name: 'juices', label: 'Juices' },
        { name: 'water', label: 'Water' },
      ]},
    ],
    industrial: [
      {
        name: 'raw_materials', label: 'Raw Materials', is_group: true, children: [
          { name: 'metals', label: 'Metals' },
          { name: 'plastics', label: 'Plastics' },
          { name: 'chemicals', label: 'Chemicals' },
        ],
      },
      {
        name: 'components', label: 'Components', is_group: true, children: [
          { name: 'fasteners', label: 'Fasteners' },
          { name: 'bearings', label: 'Bearings' },
          { name: 'seals', label: 'Seals & Gaskets' },
        ],
      },
      { name: 'tools', label: 'Tools & Equipment' },
      { name: 'machinery', label: 'Machinery' },
    ],
    health_beauty: [
      {
        name: 'skincare', label: 'Skincare', is_group: true, children: [
          { name: 'cleansers', label: 'Cleansers' },
          { name: 'moisturizers', label: 'Moisturizers' },
          { name: 'serums', label: 'Serums' },
        ],
      },
      {
        name: 'haircare', label: 'Haircare', is_group: true, children: [
          { name: 'shampoo', label: 'Shampoo' },
          { name: 'conditioner', label: 'Conditioner' },
          { name: 'styling', label: 'Styling Products' },
        ],
      },
      { name: 'makeup', label: 'Makeup' },
      { name: 'supplements', label: 'Supplements' },
    ],
    automotive: [
      {
        name: 'engine', label: 'Engine Parts', is_group: true, children: [
          { name: 'filters', label: 'Filters' },
          { name: 'belts', label: 'Belts & Hoses' },
          { name: 'ignition', label: 'Ignition' },
        ],
      },
      {
        name: 'brakes', label: 'Brakes', is_group: true, children: [
          { name: 'pads', label: 'Brake Pads' },
          { name: 'rotors', label: 'Rotors' },
          { name: 'calipers', label: 'Calipers' },
        ],
      },
      { name: 'suspension', label: 'Suspension' },
      { name: 'tyres', label: 'Tyres & Wheels' },
      { name: 'accessories', label: 'Accessories' },
    ],
  }

  return templates[industry] ?? []
}

/** Count total categories in the tree (recursive) */
function countCategories(nodes: CategoryNode[]): number {
  let count = 0
  for (const node of nodes) {
    count += 1
    if (node.children) {
      count += countCategories(node.children)
    }
  }
  return count
}

/** Get maximum tree depth (recursive) */
function getMaxDepth(nodes: CategoryNode[], depth = 1): number {
  let max = depth
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      max = Math.max(max, getMaxDepth(node.children, depth + 1))
    }
  }
  return max
}

/** Total category count */
const totalCategories = computed(() => countCategories(form.category_data ?? []))

/** Max tree depth */
const maxDepth = computed(() => getMaxDepth(form.category_data ?? []))

/** Toggle a tree node expansion */
function toggleNode(nodeName: string): void {
  if (expandedNodes.value.has(nodeName)) {
    expandedNodes.value.delete(nodeName)
  } else {
    expandedNodes.value.add(nodeName)
  }
}

/** Add a top-level category */
function addTopLevelCategory(): void {
  const name = newCategoryName.value.trim()
  if (!name) return

  const slug = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')
  const categories = form.category_data ?? []

  // Check for duplicate
  if (categories.some((c) => c.name === slug)) return

  categories.push({
    name: slug,
    label: name,
    is_group: true,
    children: [],
  })

  form.category_data = [...categories]
  newCategoryName.value = ''
}

/** Add a subcategory to a parent node */
function addSubcategory(parentName: string): void {
  const inputName = (newSubcategoryInputs.value[parentName] ?? '').trim()
  if (!inputName) return

  const slug = inputName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')

  function addToNode(nodes: CategoryNode[]): boolean {
    for (const node of nodes) {
      if (node.name === parentName) {
        if (!node.children) {
          node.children = []
        }
        if (node.children.some((c) => c.name === slug)) return true
        node.children.push({ name: slug, label: inputName })
        node.is_group = true
        return true
      }
      if (node.children && addToNode(node.children)) {
        return true
      }
    }
    return false
  }

  const categories = form.category_data ?? []
  addToNode(categories)
  form.category_data = [...categories]
  newSubcategoryInputs.value[parentName] = ''
}

/** Remove a category node from the tree */
function removeCategory(nodeName: string): void {
  function removeFromNodes(nodes: CategoryNode[]): CategoryNode[] {
    return nodes.filter((node) => {
      if (node.name === nodeName) return false
      if (node.children) {
        node.children = removeFromNodes(node.children)
      }
      return true
    })
  }

  form.category_data = removeFromNodes(form.category_data ?? [])
}

/** Handle Enter key in category input */
function handleCategoryKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    addTopLevelCategory()
  }
}

/** Handle Enter key in subcategory input */
function handleSubcategoryKeydown(event: KeyboardEvent, parentName: string): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    addSubcategory(parentName)
  }
}

/** Add a brand name */
function addBrand(): void {
  const name = newBrandName.value.trim()
  if (!name) return

  const brands = form.brand_names ?? []
  if (!brands.includes(name)) {
    brands.push(name)
    form.brand_names = [...brands]
  }
  newBrandName.value = ''
}

/** Remove a brand name */
function removeBrand(name: string): void {
  const brands = form.brand_names ?? []
  const index = brands.indexOf(name)
  if (index >= 0) {
    brands.splice(index, 1)
    form.brand_names = [...brands]
  }
}

/** Handle Enter key in brand input */
function handleBrandKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    addBrand()
  }
}

/** Whether the category tree should be shown/editable */
const showCategoryTree = computed(() => {
  return form.category_source === 'template' || form.category_source === 'custom'
})

/** Emit form data changes to parent and sync to store */
watch(
  form,
  (newVal) => {
    const data = { ...newVal }
    store.setWizardStepData('taxonomy', data)
    emit('update', data)
  },
  { deep: true },
)

/** Step 5 has no hard required fields — always valid */
function isValid(): boolean {
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
    <!-- Category Source Selection -->
    <div>
      <label class="mb-3 block text-sm font-medium text-gray-900 dark:text-white">
        Category Source
      </label>
      <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
        How would you like to set up your product categories?
      </p>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          v-for="source in CATEGORY_SOURCES"
          :key="source.value"
          class="flex items-start gap-3 rounded-lg border p-3 text-left transition-all duration-200"
          :class="
            form.category_source === source.value
              ? 'ring-2 ring-primary-500 border-primary-500 bg-primary-50/30 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-300'
          "
          @click="selectSource(source.value)"
        >
          <span class="text-xl" v-html="source.icon" />
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ source.label }}</p>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ source.description }}</p>
          </div>
          <div v-if="form.category_source === source.value" class="flex-shrink-0">
            <svg class="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </button>
      </div>
    </div>

    <!-- Category Tree Stats -->
    <div
      v-if="showCategoryTree && totalCategories > 0"
      class="grid grid-cols-2 gap-3"
    >
      <div class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 text-center">
        <p class="text-lg font-semibold text-primary-600">{{ totalCategories }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">Categories</p>
      </div>
      <div class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 text-center">
        <p class="text-lg font-semibold text-primary-600">{{ maxDepth }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">Max Depth</p>
      </div>
    </div>

    <!-- Category Tree Editor -->
    <div v-if="showCategoryTree">
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        Category Tree
      </label>
      <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Build or modify your product category hierarchy. Click a category to expand and add subcategories.
      </p>

      <!-- Tree Display -->
      <div
        v-if="(form.category_data ?? []).length > 0"
        class="mb-3 rounded-lg border border-gray-300 dark:border-gray-600"
      >
        <template v-for="node in form.category_data" :key="node.name">
          <!-- Level 0 Node -->
          <div class="border-b border-gray-300 dark:border-gray-600 last:border-b-0">
            <div
              class="flex items-center justify-between px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div class="flex items-center gap-2">
                <button
                  v-if="node.children && node.children.length > 0"
                  type="button"
                  class="text-gray-500 dark:text-gray-400 transition-transform"
                  :class="{ 'rotate-90': expandedNodes.has(node.name) }"
                  @click="toggleNode(node.name)"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <span v-else class="w-4" />
                <span
                  class="cursor-pointer text-sm font-medium text-gray-900 dark:text-white"
                  @click="toggleNode(node.name)"
                >
                  {{ node.label }}
                </span>
                <span
                  v-if="node.is_group"
                  class="text-[10px] text-gray-500 dark:text-gray-400"
                >
                  ({{ (node.children ?? []).length }})
                </span>
              </div>
              <button
                type="button"
                class="text-gray-500 dark:text-gray-400 transition-colors hover:text-red-500"
                @click="removeCategory(node.name)"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Level 1 Children -->
            <div v-if="expandedNodes.has(node.name)" class="border-t border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50">
              <template v-for="child in (node.children ?? [])" :key="child.name">
                <div class="border-b border-gray-300 dark:border-gray-600/50 last:border-b-0">
                  <div class="flex items-center justify-between px-3 py-1.5 pl-9">
                    <div class="flex items-center gap-2">
                      <button
                        v-if="child.children && child.children.length > 0"
                        type="button"
                        class="text-gray-500 dark:text-gray-400 transition-transform"
                        :class="{ 'rotate-90': expandedNodes.has(child.name) }"
                        @click="toggleNode(child.name)"
                      >
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <span v-else class="w-3.5" />
                      <span
                        class="cursor-pointer text-xs text-gray-900 dark:text-white"
                        @click="toggleNode(child.name)"
                      >
                        {{ child.label }}
                      </span>
                      <span
                        v-if="child.children && child.children.length > 0"
                        class="text-[10px] text-gray-500 dark:text-gray-400"
                      >
                        ({{ child.children.length }})
                      </span>
                    </div>
                    <button
                      type="button"
                      class="text-gray-500 dark:text-gray-400 transition-colors hover:text-red-500"
                      @click="removeCategory(child.name)"
                    >
                      <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <!-- Level 2 Children -->
                  <div
                    v-if="expandedNodes.has(child.name) && child.children && child.children.length > 0"
                    class="border-t border-gray-300 dark:border-gray-600/30 bg-white/50 dark:bg-gray-800/30"
                  >
                    <div
                      v-for="grandchild in child.children"
                      :key="grandchild.name"
                      class="flex items-center justify-between border-b border-gray-300 dark:border-gray-600/30 px-3 py-1 pl-16 last:border-b-0"
                    >
                      <span class="text-xs text-gray-500 dark:text-gray-400">{{ grandchild.label }}</span>
                      <button
                        type="button"
                        class="text-gray-500 dark:text-gray-400 transition-colors hover:text-red-500"
                        @click="removeCategory(grandchild.name)"
                      >
                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Add Subcategory (Level 2) -->
                  <div
                    v-if="expandedNodes.has(child.name)"
                    class="px-3 py-1.5 pl-16"
                  >
                    <div class="flex gap-1.5">
                      <input
                        v-model="newSubcategoryInputs[child.name]"
                        type="text"
                        class="block flex-1 rounded-lg border border-gray-300 bg-gray-50 p-2 text-xs text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
                        placeholder="Add subcategory..."
                        @keydown="handleSubcategoryKeydown($event, child.name)"
                      />
                      <button
                        type="button"
                        class="rounded border border-primary-500 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 text-xs text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50"
                        @click="addSubcategory(child.name)"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Add Subcategory (Level 1) -->
              <div class="px-3 py-2 pl-9">
                <div class="flex gap-1.5">
                  <input
                    v-model="newSubcategoryInputs[node.name]"
                    type="text"
                    class="block flex-1 rounded-lg border border-gray-300 bg-gray-50 p-2 text-xs text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
                    placeholder="Add subcategory..."
                    @keydown="handleSubcategoryKeydown($event, node.name)"
                  />
                  <button
                    type="button"
                    class="rounded border border-primary-500 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 text-xs text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50"
                    @click="addSubcategory(node.name)"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Empty Tree State -->
      <div
        v-else
        class="mb-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 text-center"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">
          No categories yet. Add your first category below.
        </p>
      </div>

      <!-- Add Top-Level Category -->
      <div class="flex gap-2">
        <input
          v-model="newCategoryName"
          type="text"
          class="block flex-1 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
          placeholder="New top-level category name..."
          @keydown="handleCategoryKeydown"
        />
        <button
          type="button"
          class="rounded-lg border border-primary-500 bg-primary-50 dark:bg-primary-900/30 px-3 py-2 text-sm font-medium text-primary-700 dark:text-primary-400 transition-colors hover:bg-primary-100 dark:hover:bg-primary-900/50"
          @click="addTopLevelCategory"
        >
          Add
        </button>
      </div>
    </div>

    <!-- Import / GPC Info Messages -->
    <div
      v-if="form.category_source === 'import'"
      class="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4"
    >
      <div class="flex items-start gap-2">
        <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-blue-800 dark:text-blue-300">Import categories later</p>
          <p class="mt-1 text-xs text-blue-700 dark:text-blue-400">
            After completing the onboarding wizard, you can import categories from a CSV file
            via Settings &gt; Taxonomy &gt; Import Categories. Your categories will be
            created as a hierarchical tree structure.
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="form.category_source === 'gpc'"
      class="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4"
    >
      <div class="flex items-start gap-2">
        <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-blue-800 dark:text-blue-300">GS1 Global Product Classification</p>
          <p class="mt-1 text-xs text-blue-700 dark:text-blue-400">
            GPC categories will be loaded from the GS1 standard after onboarding.
            This provides a standardized, globally recognized category hierarchy
            ideal for retail and e-commerce products.
          </p>
        </div>
      </div>
    </div>

    <!-- Brand Names -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        Brand Names
      </label>
      <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Add brands that you carry or manufacture. These will be available for product assignment.
      </p>
      <div class="flex gap-2">
        <input
          v-model="newBrandName"
          type="text"
          class="block flex-1 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
          placeholder="e.g., Nike, Apple, Samsung"
          @keydown="handleBrandKeydown"
        />
        <button
          type="button"
          class="rounded-lg border border-primary-500 bg-primary-50 dark:bg-primary-900/30 px-3 py-2 text-sm font-medium text-primary-700 dark:text-primary-400 transition-colors hover:bg-primary-100 dark:hover:bg-primary-900/50"
          @click="addBrand"
        >
          Add
        </button>
      </div>
      <!-- Brand tags -->
      <div v-if="(form.brand_names ?? []).length > 0" class="mt-2 flex flex-wrap gap-1.5">
        <span
          v-for="brand in form.brand_names"
          :key="brand"
          class="inline-flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-900/30 px-2.5 py-1 text-xs font-medium text-primary-700 dark:text-primary-400"
        >
          {{ brand }}
          <button
            type="button"
            class="ml-0.5 text-primary-400 transition-colors hover:text-primary-700"
            @click="removeBrand(brand)"
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      </div>
    </div>

    <!-- Info callout -->
    <div class="flex items-start gap-2 rounded-lg bg-white dark:bg-gray-800 p-3">
      <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Categories organize your products into a navigable hierarchy. Brands identify
        product manufacturers or labels. Both can be modified at any time after setup
        via Settings.
      </p>
    </div>
  </div>
</template>
