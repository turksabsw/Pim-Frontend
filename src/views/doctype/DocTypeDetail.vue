<script setup lang="ts">
/**
 * DocTypeDetail – Clean Flowbite form for any PIM DocType using Desk meta.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFrappeAPI } from '@/composables/useFrappeAPI'

const LINK_DROPDOWN_LIMIT = 20

const route = useRoute()
const router = useRouter()
const api = useFrappeAPI()

const doctype = computed(() => decodeURIComponent((route.params.doctype as string) || ''))
const docName = computed(() => decodeURIComponent((route.params.name as string) || ''))
const isNew = computed(() => docName.value === 'new')

interface MetaField {
  fieldname: string
  label: string
  fieldtype: string
  options: string
  reqd: number
  read_only: number
  description?: string
}

interface ChildTableMeta {
  doctype: string
  fields: MetaField[]
}

interface DoctypeMeta {
  doctype: string
  fields: MetaField[]
  child_tables: Record<string, ChildTableMeta>
}

const meta = ref<DoctypeMeta | null>(null)
const doc = ref<Record<string, unknown> | null>(null)
const form = ref<Record<string, unknown>>({})
const loading = ref(true)
const error = ref<string | null>(null)
const saveLoading = ref(false)
const saveSuccess = ref(false)
const isDirty = ref(false)
const showDeleteConfirm = ref(false)
/** Fields made read-only at runtime (e.g. product_family after parent_product is chosen) */
const dynamicReadOnly = ref<Set<string>>(new Set())

const SYSTEM_KEYS = new Set(['doctype', 'name', 'owner', 'creation', 'modified', 'modified_by', '__last_sync', '__unsaved', '__islocal', '__onload', '__run_link_triggers'])

interface FormSection {
  label: string
  fields: MetaField[]
  tables: MetaField[]
  columnBreakIndex?: number
}
interface FormTab {
  label: string
  sections: FormSection[]
}

const formTabs = computed<FormTab[]>(() => {
  const m = meta.value
  if (!m?.fields) return []
  const tabs: FormTab[] = []
  let currentTab: FormTab | null = null
  let currentSection: FormSection | null = null
  for (const f of m.fields) {
    if (f.fieldtype === 'Tab Break') {
      if (currentTab) tabs.push(currentTab)
      currentTab = { label: (f.label || 'Tab').trim() || 'Details', sections: [] }
      currentSection = null
    } else if (f.fieldtype === 'Section Break') {
      if (!currentTab) currentTab = { label: 'Details', sections: [] }
      currentSection = { label: (f.label || '').trim(), fields: [], tables: [] }
      currentTab.sections.push(currentSection)
    } else if (f.fieldtype === 'Column Break') {
      if (currentSection) currentSection.columnBreakIndex = currentSection.fields.length
    } else if (f.fieldtype === 'Table' || f.fieldtype === 'Table MultiSelect') {
      if (!currentTab) {
        currentTab = { label: 'Details', sections: [] }
        currentSection = { label: '', fields: [], tables: [] }
        currentTab.sections.push(currentSection)
      }
      if (!currentSection) {
        currentSection = { label: (f.label || '').trim(), fields: [], tables: [] }
        currentTab.sections.push(currentSection)
      }
      currentSection.tables.push(f)
    } else {
      if (!currentTab) {
        currentTab = { label: 'Details', sections: [] }
        currentSection = { label: '', fields: [], tables: [] }
        currentTab.sections.push(currentSection)
      }
      if (!currentSection) {
        currentSection = { label: '', fields: [], tables: [] }
        currentTab.sections.push(currentSection)
      }
      currentSection.fields.push(f)
    }
  }
  if (currentTab) tabs.push(currentTab)
  const tableFallback = meta.value?.fields?.filter((x) => ['Table', 'Table MultiSelect'].includes(x.fieldtype)) ?? []
  return tabs.length ? tabs : [{ label: 'Details', sections: [{ label: '', fields: mainFieldsFallback.value, tables: tableFallback }] }]
})

const mainFieldsFallback = computed(() => meta.value?.fields?.filter((f) => !['Table', 'Table MultiSelect', 'Tab Break', 'Section Break', 'Column Break'].includes(f.fieldtype)) ?? [])

const activeTabIndex = ref(0)

// Link field dropdown
const linkDropdownOpen = ref<string | null>(null)

interface LinkOption { label: string; value: string }
const linkOptions = ref<Record<string, LinkOption[]>>({})
const linkSearchLoading = ref<Record<string, boolean>>({})
const linkSearchQuery = ref<Record<string, string>>({})
let linkSearchTimer: ReturnType<typeof setTimeout> | null = null

/** Fields that should display a human-readable label but store the name/id as value */
const LABEL_VALUE_FIELDS: Record<string, { labelField: string }> = {
  parent_product: { labelField: 'item_name' },
}

async function fetchLinkOptions(fieldname: string, linkedDoctype: string, query: string): Promise<void> {
  if (!linkedDoctype?.trim()) return
  linkSearchLoading.value = { ...linkSearchLoading.value, [fieldname]: true }
  try {
    const search = query?.trim()
    const labelMeta = LABEL_VALUE_FIELDS[fieldname]
    const fields = labelMeta ? ['name', labelMeta.labelField] : ['name']
    type Row = Record<string, string>

    if (search && labelMeta) {
      // search by both name and label field — Frappe doesn't support OR, so two parallel calls
      const [byName, byLabel] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        api.getList<any>({ doctype: linkedDoctype, fields, limit_page_length: LINK_DROPDOWN_LIMIT, order_by: 'name asc', filters: { name: ['like', '%' + search + '%'] } }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        api.getList<any>({ doctype: linkedDoctype, fields, limit_page_length: LINK_DROPDOWN_LIMIT, order_by: 'name asc', filters: { [labelMeta.labelField]: ['like', '%' + search + '%'] } }),
      ])
      const seen = new Set<string>()
      const merged: LinkOption[] = []
      for (const r of [...(byName as Row[]), ...(byLabel as Row[])]) {
        if (!seen.has(r.name)) {
          seen.add(r.name)
          merged.push({ value: r.name, label: r[labelMeta.labelField] || r.name })
        }
      }
      linkOptions.value = { ...linkOptions.value, [fieldname]: merged }
      return
    }

    const filters = search ? { name: ['like', '%' + search + '%'] as [string, string] } : undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = (await api.getList<any>({
      doctype: linkedDoctype,
      fields,
      limit_page_length: LINK_DROPDOWN_LIMIT,
      order_by: 'name asc',
      filters,
    })) as Row[]
    const options: LinkOption[] = labelMeta
      ? list.map((r) => ({ value: r.name, label: r[labelMeta.labelField] || r.name }))
      : list.map((r) => ({ value: r.name, label: r.name }))
    linkOptions.value = { ...linkOptions.value, [fieldname]: options }
  } catch {
    linkOptions.value = { ...linkOptions.value, [fieldname]: [] }
  } finally {
    linkSearchLoading.value = { ...linkSearchLoading.value, [fieldname]: false }
  }
}

function openLinkDropdown(f: MetaField): void {
  if (f.fieldtype !== 'Link' || !f.options?.trim()) return
  linkDropdownOpen.value = f.fieldname
  const current = (form.value[f.fieldname] as string) ?? ''
  linkSearchQuery.value = { ...linkSearchQuery.value, [f.fieldname]: current }
  fetchLinkOptions(f.fieldname, f.options.trim(), current)
}

function getLinkSearchQuery(fieldname: string): string {
  return linkSearchQuery.value[fieldname] ?? (form.value[fieldname] as string) ?? ''
}

function setLinkSearchQuery(fieldname: string, value: string): void {
  linkSearchQuery.value = { ...linkSearchQuery.value, [fieldname]: value }
  if (linkSearchTimer) clearTimeout(linkSearchTimer)
  linkSearchTimer = setTimeout(() => {
    const f = meta.value?.fields?.find((x) => x.fieldname === fieldname)
    if (f?.fieldtype === 'Link' && f.options?.trim()) fetchLinkOptions(fieldname, f.options.trim(), value)
    linkSearchTimer = null
  }, 250)
}

function closeLinkDropdown(): void {
  linkDropdownOpen.value = null
}

function selectLinkOption(fieldname: string, value: string, label?: string): void {
  setFormValue(fieldname, value)
  // Show label in search box if available, otherwise show value
  linkSearchQuery.value = { ...linkSearchQuery.value, [fieldname]: label ?? value }
  closeLinkDropdown()

  // Product Variant: when parent_product is selected, auto-fill product_family (read-only)
  if (doctype.value === 'Product Variant' && fieldname === 'parent_product' && value) {
    // Use POST (callMethod) so Frappe correctly parses the filters dict.
    // Item.custom_pim_product_family stores the product_family value.
    api.callMethod<Record<string, string>>(
      'frappe.client.get_value',
      { doctype: 'Item', filters: { name: value }, fieldname: 'custom_pim_product_family' },
    ).then((res) => {
      const family = (res as unknown as Record<string, string>)?.custom_pim_product_family ?? ''
      if (family) {
        form.value['product_family'] = family
        linkSearchQuery.value = { ...linkSearchQuery.value, product_family: family }
      }
      dynamicReadOnly.value = new Set([...dynamicReadOnly.value, 'product_family'])
    }).catch(() => {
      dynamicReadOnly.value = new Set([...dynamicReadOnly.value, 'product_family'])
    })
  }
}

function openCreateNewDoc(linkedDoctype: string): void {
  const slug = linkedDoctype.replace(/\s+/g, '-').toLowerCase()
  window.open(`http://localhost:8000/app/${slug}/new`, '_blank')
  closeLinkDropdown()
}

function openAdvancedSearch(linkedDoctype: string): void {
  const slug = linkedDoctype.replace(/\s+/g, '-').toLowerCase()
  window.open(`http://localhost:8000/app/${slug}`, '_blank')
  closeLinkDropdown()
}

function getLinkOptions(fieldname: string): LinkOption[] {
  return linkOptions.value[fieldname] ?? []
}

function isLinkDropdownOpen(fieldname: string): boolean {
  return linkDropdownOpen.value === fieldname
}

function listPath(): string {
  if (doctype.value === 'Product Master') return '/products'
  return `/list/${encodeURIComponent(doctype.value)}`
}

function openInDesk(): void {
  const baseUrl = 'http://localhost:8000'
  const slug = doctype.value.replace(/\s+/g, '-').toLowerCase()
  window.open(`${baseUrl}/app/${slug}/${encodeURIComponent(docName.value)}`, '_blank')
}

function setFormValue(key: string, value: unknown): void {
  form.value[key] = value
  isDirty.value = true
}

function getChildRows(fieldname: string): Record<string, unknown>[] {
  const v = form.value[fieldname]
  if (Array.isArray(v)) return v as Record<string, unknown>[]
  return []
}

function setChildRow(fieldname: string, index: number, row: Record<string, unknown>): void {
  const arr = [...getChildRows(fieldname)]
  arr[index] = row
  form.value[fieldname] = arr
  isDirty.value = true
}

function addChildRow(fieldname: string): void {
  const childMeta = meta.value?.child_tables?.[fieldname]
  if (!childMeta) return
  const row: Record<string, unknown> = { doctype: childMeta.doctype }
  for (const f of childMeta.fields) row[f.fieldname] = f.fieldtype === 'Check' ? 0 : ''
  const arr = [...getChildRows(fieldname), row]
  form.value[fieldname] = arr
  isDirty.value = true
}

function removeChildRow(fieldname: string, index: number): void {
  const arr = getChildRows(fieldname).filter((_, i) => i !== index)
  form.value[fieldname] = arr
  isDirty.value = true
}

function setChildCell(fieldname: string, rowIndex: number, col: string, value: unknown): void {
  const arr = getChildRows(fieldname)
  const row = { ...arr[rowIndex], [col]: value }
  setChildRow(fieldname, rowIndex, row)
}

function selectOptions(f: MetaField): string[] {
  if (f.fieldtype !== 'Select' || !f.options) return []
  return f.options.split('\n').map((s) => s.trim()).filter(Boolean)
}

function datetimeLocalValue(val: unknown): string {
  if (typeof val !== 'string') return ''
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Check if a section has any visible content */
function sectionHasContent(section: FormSection): boolean {
  return section.fields.length > 0 || section.tables.length > 0
}

async function load(): Promise<void> {
  if (!doctype.value || !docName.value) return
  loading.value = true
  error.value = null
  try {
    if (isNew.value) {
      // New document mode: only load meta, form starts empty
      const metaRes = await api.callMethod<DoctypeMeta>('frappe_pim.pim.api.doctype_meta.get_doctype_meta', { doctype: doctype.value })
      meta.value = metaRes
      doc.value = null
      // Build empty form from meta fields with defaults
      const empty: Record<string, unknown> = {}
      for (const f of metaRes.fields ?? []) {
        if (['Section Break', 'Column Break', 'Tab Break', 'HTML'].includes(f.fieldtype)) continue
        empty[f.fieldname] = f.fieldtype === 'Check' ? 0 : ''
      }
      form.value = empty
      isDirty.value = false
    } else {
      const [metaRes, docData] = await Promise.all([
        api.callMethod<DoctypeMeta>('frappe_pim.pim.api.doctype_meta.get_doctype_meta', { doctype: doctype.value }),
        api.getDoc<Record<string, unknown>>(doctype.value, docName.value),
      ])
      meta.value = metaRes
      doc.value = docData
      form.value = JSON.parse(JSON.stringify(docData))
      isDirty.value = false
    }
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Failed to load'
    error.value = msg
    meta.value = null
    doc.value = null
    form.value = {}
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!doctype.value || !meta.value) return
  saveLoading.value = true
  error.value = null
  try {
    const payload: Record<string, unknown> = { doctype: doctype.value }
    for (const [k, v] of Object.entries(form.value)) {
      if (SYSTEM_KEYS.has(k)) continue
      if (meta.value.child_tables?.[k] && Array.isArray(v)) {
        const childDoctype = meta.value.child_tables[k].doctype
        payload[k] = (v as Record<string, unknown>[]).map((row) => ({ ...row, doctype: row.doctype ?? childDoctype }))
      } else {
        payload[k] = v
      }
    }

    if (isNew.value) {
      // Create new document
      const created = await api.createDoc<Record<string, unknown>>(doctype.value, payload)
      doc.value = created
      isDirty.value = false
      saveSuccess.value = true
      setTimeout(() => { saveSuccess.value = false }, 3000)
      // Navigate to the saved document
      router.replace(`/doc/${encodeURIComponent(doctype.value)}/${encodeURIComponent(created.name as string)}`)
    } else {
      await api.updateDoc(doctype.value, docName.value, payload)
      doc.value = { ...doc.value, ...payload } as Record<string, unknown>
      isDirty.value = false
      saveSuccess.value = true
      setTimeout(() => { saveSuccess.value = false }, 3000)
    }
  } catch (e: unknown) {
    // api.error.value contains the parsed server message (e.g. "Could not find X: Y")
    // Fall back to the raw axios message only if parsing failed
    error.value = api.error.value?.message || (e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Save failed')
  } finally {
    saveLoading.value = false
  }
}

function confirmDelete(): void { showDeleteConfirm.value = true }

async function deleteDoc(): Promise<void> {
  if (!doctype.value || !docName.value) return
  saveLoading.value = true
  error.value = null
  try {
    await api.deleteDoc(doctype.value, docName.value)
    router.push(listPath())
  } catch (e: unknown) {
    error.value = api.error.value?.message || (e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Delete failed')
  } finally {
    saveLoading.value = false
    showDeleteConfirm.value = false
  }
}

function goBack(): void {
  if (isDirty.value && !confirm('Unsaved changes. Leave anyway?')) return
  router.push(listPath())
}

// ============================================================================
// File upload
// ============================================================================
const uploadingField = ref<string>('')

async function uploadFile(fieldname: string, file: File): Promise<string | null> {
  const fd = new FormData()
  fd.append('file', file, file.name)
  fd.append('is_private', '0')
  // Do NOT pass doctype/docname — Frappe would try to save the parent doc which
  // triggers global_search update and crashes on Virtual DocTypes.
  uploadingField.value = fieldname
  try {
    const res = await fetch('/api/method/upload_file', { method: 'POST', body: fd, credentials: 'include' })
    const data = await res.json()
    return data?.message?.file_url ?? null
  } catch {
    return null
  } finally {
    uploadingField.value = ''
  }
}

async function uploadFileForField(fieldname: string, file: File): Promise<void> {
  const url = await uploadFile(fieldname, file)
  if (url) setFormValue(fieldname, url)
}

async function uploadChildFile(tableName: string, rowIndex: number, colName: string, file: File): Promise<void> {
  const key = `${tableName}__${rowIndex}__${colName}`
  const fd = new FormData()
  fd.append('file', file, file.name)
  fd.append('is_private', '0')
  // No doctype/docname — avoid triggering parent doc save/global_search on Virtual DocTypes
  uploadingField.value = key
  try {
    const res = await fetch('/api/method/upload_file', { method: 'POST', body: fd, credentials: 'include' })
    const data = await res.json()
    const url = data?.message?.file_url
    if (url) setChildCell(tableName, rowIndex, colName, url)
  } catch {
    // ignore
  } finally {
    uploadingField.value = ''
  }
}

function getImageSrc(val: unknown): string {
  if (typeof val === 'string' && val) return val
  return ''
}

function isImageRow(row: Record<string, unknown>): boolean {
  const t = (row['media_type'] as string) || ''
  const f = getImageSrc(row['file'])
  if (t === 'Image') return true
  if (!t && f && /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(f)) return true
  return false
}

onMounted(() => load())
watch([doctype, docName], () => {
  activeTabIndex.value = 0
  load()
})
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <!-- Page Header -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="inline-flex items-center rounded-lg border border-gray-300 bg-white p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          @click="goBack"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ doctype }}</p>
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ isNew ? 'New ' + doctype : docName }}
          </h1>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Save flash -->
        <Transition name="fade">
          <span v-if="saveSuccess" class="inline-flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        </Transition>

        <!-- Dirty indicator -->
        <span v-if="isDirty" class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-300">
          Unsaved
        </span>

        <!-- Open in Desk (only for existing docs) -->
        <button
          v-if="!isNew"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          @click="openInDesk"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Desk
        </button>

        <!-- Delete (only for existing docs) -->
        <button
          v-if="!isNew"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
          @click="confirmDelete"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>

        <!-- Save -->
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
          :disabled="saveLoading || (!isNew && !isDirty)"
          @click="save"
        >
          <svg v-if="saveLoading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Save
        </button>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="error" class="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20" role="alert">
      <svg class="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-sm font-medium text-red-800 dark:text-red-300">{{ error }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        <span class="text-sm text-gray-500 dark:text-gray-400">Loading document...</span>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="meta && (doc || isNew)" class="space-y-6">
      <!-- Tab Navigation -->
      <div v-if="formTabs.length > 1" class="border-b border-gray-200 dark:border-gray-700">
        <nav class="-mb-px flex gap-1">
          <button
            v-for="(tab, ti) in formTabs"
            :key="ti"
            type="button"
            class="rounded-t-lg px-4 py-3 text-sm font-medium transition-colors"
            :class="
              activeTabIndex === ti
                ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            "
            @click="activeTabIndex = ti"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Sections -->
      <template v-for="(section, si) in (formTabs[activeTabIndex]?.sections ?? [])" :key="si">
        <div v-if="sectionHasContent(section)" class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <!-- Section Header -->
          <div v-if="section.label" class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ section.label }}</h3>
          </div>

          <!-- Section Fields -->
          <div v-if="section.fields.length > 0" class="p-6">
            <div :class="section.columnBreakIndex != null ? 'grid grid-cols-1 gap-5 md:grid-cols-2' : 'grid grid-cols-1 gap-5 sm:grid-cols-2'">
              <template v-for="f in section.fields" :key="f.fieldname">
                <!-- Read only (static from meta OR dynamically locked at runtime) -->
                <div v-if="f.read_only || dynamicReadOnly.has(f.fieldname)" class="sm:col-span-1">
                  <label class="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-400">{{ f.label }}</label>
                  <p class="text-sm text-gray-900 dark:text-white">{{ form[f.fieldname] ?? '–' }}</p>
                </div>

                <!-- Check -->
                <div v-else-if="f.fieldtype === 'Check'" class="flex items-center gap-3 sm:col-span-2">
                  <input
                    :id="'f-' + f.fieldname"
                    type="checkbox"
                    :checked="form[f.fieldname] === true || form[f.fieldname] === 1"
                    class="h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
                    @change="setFormValue(f.fieldname, ($event.target as HTMLInputElement).checked)"
                  >
                  <label :for="'f-' + f.fieldname" class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ f.label }}
                    <span v-if="f.reqd" class="text-red-500">*</span>
                  </label>
                </div>

                <!-- Text / Small Text / Text Editor -->
                <div v-else-if="['Text', 'Small Text', 'Text Editor'].includes(f.fieldtype)" class="sm:col-span-2">
                  <label :for="'f-' + f.fieldname" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                    {{ f.label }}
                    <span v-if="f.reqd" class="text-red-500">*</span>
                  </label>
                  <textarea
                    :id="'f-' + f.fieldname"
                    :value="form[f.fieldname]"
                    class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
                    rows="4"
                    :placeholder="f.description || `Enter ${f.label.toLowerCase()}`"
                    @input="setFormValue(f.fieldname, ($event.target as HTMLTextAreaElement).value)"
                  />
                </div>

                <!-- Select -->
                <div v-else-if="f.fieldtype === 'Select'">
                  <label :for="'f-' + f.fieldname" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                    {{ f.label }}
                    <span v-if="f.reqd" class="text-red-500">*</span>
                  </label>
                  <select
                    :id="'f-' + f.fieldname"
                    :value="form[f.fieldname]"
                    class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-500"
                    @change="setFormValue(f.fieldname, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">Select {{ f.label.toLowerCase() }}</option>
                    <option v-for="opt in selectOptions(f)" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </div>

                <!-- Date -->
                <div v-else-if="f.fieldtype === 'Date'">
                  <label :for="'f-' + f.fieldname" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                    {{ f.label }}
                    <span v-if="f.reqd" class="text-red-500">*</span>
                  </label>
                  <input
                    :id="'f-' + f.fieldname"
                    :value="typeof form[f.fieldname] === 'string' ? (form[f.fieldname] as string).slice(0, 10) : ''"
                    type="date"
                    class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-500"
                    @input="setFormValue(f.fieldname, ($event.target as HTMLInputElement).value)"
                  >
                </div>

                <!-- Datetime -->
                <div v-else-if="f.fieldtype === 'Datetime'">
                  <label :for="'f-' + f.fieldname" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                    {{ f.label }}
                    <span v-if="f.reqd" class="text-red-500">*</span>
                  </label>
                  <input
                    :id="'f-' + f.fieldname"
                    :value="datetimeLocalValue(form[f.fieldname])"
                    type="datetime-local"
                    class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-500"
                    @input="setFormValue(f.fieldname, ($event.target as HTMLInputElement).value)"
                  >
                </div>

                <!-- Link (searchable dropdown) -->
                <div v-else-if="f.fieldtype === 'Link' && f.options" class="relative">
                  <label :for="'f-' + f.fieldname" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                    {{ f.label }}
                    <span v-if="f.reqd" class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <input
                      :id="'f-' + f.fieldname"
                      type="text"
                      :value="isLinkDropdownOpen(f.fieldname) ? getLinkSearchQuery(f.fieldname) : (form[f.fieldname] ?? '')"
                      class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pe-10 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
                      :placeholder="`Search ${f.label.toLowerCase()}...`"
                      autocomplete="off"
                      @focus="openLinkDropdown(f)"
                      @input="setLinkSearchQuery(f.fieldname, ($event.target as HTMLInputElement).value)"
                      @blur="setTimeout(closeLinkDropdown, 180)"
                    />
                    <!-- Link icon -->
                    <div class="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
                      <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  <!-- Dropdown -->
                  <div
                    v-if="isLinkDropdownOpen(f.fieldname)"
                    class="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700"
                  >
                    <!-- Loading -->
                    <div v-if="linkSearchLoading[f.fieldname]" class="flex items-center justify-center px-4 py-6">
                      <div class="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                    </div>

                    <template v-else>
                      <!-- Options -->
                      <ul class="py-1">
                        <li v-for="opt in getLinkOptions(f.fieldname)" :key="opt.value">
                          <button
                            type="button"
                            class="block w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600"
                            @mousedown.prevent="selectLinkOption(f.fieldname, opt.value, opt.label !== opt.value ? opt.label : undefined)"
                          >
                            {{ opt.label }}
                          </button>
                        </li>
                        <li v-if="getLinkOptions(f.fieldname).length === 0" class="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                          No results found
                        </li>
                      </ul>

                      <!-- Actions -->
                      <div class="border-t border-gray-200 p-2 dark:border-gray-600">
                        <button
                          type="button"
                          class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-primary-600 hover:bg-gray-100 dark:text-primary-400 dark:hover:bg-gray-600"
                          @mousedown.prevent="openCreateNewDoc(f.options)"
                        >
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                          </svg>
                          Create new {{ f.options }}
                        </button>
                      </div>
                    </template>
                  </div>
                </div>

                <!-- Attach / Attach Image -->
                <div v-else-if="['Attach Image', 'Attach'].includes(f.fieldtype)" class="sm:col-span-1">
                  <label class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                    {{ f.label }}
                    <span v-if="f.reqd" class="text-red-500">*</span>
                  </label>
                  <div class="flex flex-wrap items-start gap-3">
                    <!-- Current image preview -->
                    <div v-if="getImageSrc(form[f.fieldname])" class="relative">
                      <img
                        v-if="f.fieldtype === 'Attach Image'"
                        :src="getImageSrc(form[f.fieldname])"
                        class="h-24 w-24 rounded-lg border border-gray-200 object-cover shadow-sm dark:border-gray-600"
                        :alt="f.label"
                      />
                      <a
                        v-else
                        :href="getImageSrc(form[f.fieldname])"
                        target="_blank"
                        class="flex h-14 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-primary-600 dark:border-gray-600 dark:text-primary-400"
                      >
                        <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span class="max-w-[120px] truncate text-xs">{{ (form[f.fieldname] as string).split('/').pop() }}</span>
                      </a>
                      <button
                        type="button"
                        class="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white shadow hover:bg-red-600"
                        @click="setFormValue(f.fieldname, '')"
                      >
                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <!-- Upload label -->
                    <label class="inline-flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 px-5 py-4 text-sm text-gray-500 transition hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:bg-primary-900/20 dark:hover:text-primary-400">
                      <svg v-if="uploadingField !== f.fieldname" class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <svg v-else class="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span class="text-xs font-medium">{{ uploadingField === f.fieldname ? 'Uploading...' : (getImageSrc(form[f.fieldname]) ? 'Replace' : 'Upload file') }}</span>
                      <input
                        type="file"
                        class="sr-only"
                        :accept="f.fieldtype === 'Attach Image' ? 'image/*' : undefined"
                        :disabled="uploadingField === f.fieldname"
                        @change="(e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) uploadFileForField(f.fieldname, file) }"
                      />
                    </label>
                  </div>
                </div>

                <!-- Data / Int / Float / default -->
                <div v-else>
                  <label :for="'f-' + f.fieldname" class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                    {{ f.label }}
                    <span v-if="f.reqd" class="text-red-500">*</span>
                  </label>
                  <input
                    :id="'f-' + f.fieldname"
                    :value="form[f.fieldname]"
                    :type="f.fieldtype === 'Int' ? 'number' : f.fieldtype === 'Float' || f.fieldtype === 'Currency' || f.fieldtype === 'Percent' ? 'number' : 'text'"
                    :step="f.fieldtype === 'Float' || f.fieldtype === 'Currency' || f.fieldtype === 'Percent' ? '0.01' : undefined"
                    class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
                    :placeholder="f.description || `Enter ${f.label.toLowerCase()}`"
                    @input="setFormValue(f.fieldname, ($event.target as HTMLInputElement).value)"
                  >
                </div>
              </template>
            </div>
          </div>

          <!-- Child Tables in this section -->
          <template v-for="tf in section.tables" :key="tf.fieldname">
            <div class="border-t border-gray-200 dark:border-gray-700">

              <!-- ===== product_media: Card Gallery ===== -->
              <template v-if="tf.fieldname === 'product_media'">
                <div class="px-6 py-4">
                  <h4 class="text-sm font-semibold text-gray-900 dark:text-white">{{ tf.label }}</h4>
                </div>
                <div class="px-6 pb-6">
                  <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    <!-- Media cards -->
                    <div
                      v-for="(row, ri) in getChildRows(tf.fieldname)"
                      :key="ri"
                      class="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                      <!-- Image/file area -->
                      <div class="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <!-- Image preview -->
                        <img
                          v-if="getImageSrc(row['file']) && isImageRow(row)"
                          :src="getImageSrc(row['file'])"
                          class="h-full w-full object-cover"
                          :alt="(row['title'] as string) || 'media'"
                        />
                        <!-- Non-image file icon -->
                        <div v-else-if="getImageSrc(row['file'])" class="flex h-full flex-col items-center justify-center gap-1 text-gray-400">
                          <svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span class="max-w-full truncate px-2 text-xs">{{ getImageSrc(row['file']).split('/').pop() }}</span>
                        </div>
                        <!-- Empty upload placeholder -->
                        <label v-else class="flex h-full cursor-pointer flex-col items-center justify-center gap-2 text-gray-400 hover:bg-gray-50 hover:text-primary-500 dark:hover:bg-gray-600/40 dark:hover:text-primary-400">
                          <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span class="text-xs font-medium">Upload file</span>
                          <input
                            type="file"
                            class="sr-only"
                            accept="image/*,video/*,.pdf,.doc,.docx"
                            :disabled="uploadingField === `${tf.fieldname}__${ri}__file`"
                            @change="(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadChildFile(tf.fieldname, ri, 'file', f) }"
                          />
                        </label>
                        <!-- Primary badge -->
                        <span
                          v-if="row['is_primary'] === true || row['is_primary'] === 1"
                          class="absolute left-2 top-2 rounded-full bg-primary-600 px-2 py-0.5 text-xs font-medium text-white shadow"
                        >Main</span>
                        <!-- Hover overlay to replace existing file -->
                        <label
                          v-if="getImageSrc(row['file'])"
                          class="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100"
                        >
                          <div class="flex flex-col items-center gap-1 text-white">
                            <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span class="text-xs font-medium">Replace</span>
                          </div>
                          <input
                            type="file"
                            class="sr-only"
                            accept="image/*,video/*,.pdf,.doc,.docx"
                            :disabled="uploadingField === `${tf.fieldname}__${ri}__file`"
                            @change="(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadChildFile(tf.fieldname, ri, 'file', f) }"
                          />
                        </label>
                        <!-- Upload spinner -->
                        <div v-if="uploadingField === `${tf.fieldname}__${ri}__file`" class="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-800/70">
                          <div class="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                        </div>
                      </div>

                      <!-- Card meta fields -->
                      <div class="flex flex-col gap-2 p-3">
                        <input
                          :value="row['title']"
                          type="text"
                          placeholder="Title..."
                          class="block w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                          @input="setChildCell(tf.fieldname, ri, 'title', ($event.target as HTMLInputElement).value)"
                        />
                        <select
                          :value="row['media_type']"
                          class="block w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                          @change="setChildCell(tf.fieldname, ri, 'media_type', ($event.target as HTMLSelectElement).value)"
                        >
                          <option value="">Type...</option>
                          <option value="Image">Image</option>
                          <option value="Video">Video</option>
                          <option value="Document">Document</option>
                          <option value="3D Model">3D Model</option>
                          <option value="Audio">Audio</option>
                        </select>
                        <div class="flex items-center justify-between">
                          <label class="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <input
                              type="checkbox"
                              :checked="row['is_primary'] === true || row['is_primary'] === 1"
                              class="h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600"
                              @change="setChildCell(tf.fieldname, ri, 'is_primary', ($event.target as HTMLInputElement).checked)"
                            />
                            Primary
                          </label>
                          <button
                            type="button"
                            class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            title="Remove"
                            @click="removeChildRow(tf.fieldname, ri)"
                          >
                            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Add media button -->
                    <button
                      type="button"
                      class="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-primary-400 hover:bg-primary-50 hover:text-primary-500 dark:border-gray-600 dark:hover:border-primary-500 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
                      @click="addChildRow(tf.fieldname)"
                    >
                      <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
                      </svg>
                      <span class="text-xs font-medium">Add Media</span>
                    </button>
                  </div>
                </div>
              </template>

              <!-- ===== attribute_values: Simplified attribute table ===== -->
              <template v-else-if="tf.fieldname === 'attribute_values'">
                <div class="flex items-center justify-between px-6 py-4">
                  <h4 class="text-sm font-semibold text-gray-900 dark:text-white">{{ tf.label }}</h4>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    @click="addChildRow(tf.fieldname)"
                  >
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Attribute
                  </button>
                </div>
                <div v-if="getChildRows(tf.fieldname).length > 0" class="px-6 pb-6">
                  <div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <table class="w-full text-left text-sm">
                      <thead class="bg-gray-50 text-xs text-gray-600 dark:bg-gray-700/60 dark:text-gray-400">
                        <tr>
                          <th class="px-4 py-3 font-medium">Attribute</th>
                          <th class="px-4 py-3 font-medium">Value</th>
                          <th class="px-4 py-3 font-medium">Unit</th>
                          <th class="px-4 py-3 font-medium">Source</th>
                          <th class="w-12 px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                        <tr v-for="(row, ri) in getChildRows(tf.fieldname)" :key="ri" class="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700/40">
                          <td class="px-4 py-2.5">
                            <input
                              :value="row['attribute']"
                              type="text"
                              placeholder="Attribute..."
                              class="block w-full rounded border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              @input="setChildCell(tf.fieldname, ri, 'attribute', ($event.target as HTMLInputElement).value)"
                            />
                          </td>
                          <td class="px-4 py-2.5">
                            <input
                              :value="row['display_value'] || row['value_text'] || row['value_int'] || row['value_float'] || ''"
                              type="text"
                              placeholder="Value..."
                              class="block w-full rounded border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              @input="(e) => { const v = (e.target as HTMLInputElement).value; setChildCell(tf.fieldname, ri, 'display_value', v); setChildCell(tf.fieldname, ri, 'value_text', v) }"
                            />
                          </td>
                          <td class="px-4 py-2.5">
                            <input
                              :value="row['unit']"
                              type="text"
                              placeholder="Unit..."
                              class="block w-20 rounded border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              @input="setChildCell(tf.fieldname, ri, 'unit', ($event.target as HTMLInputElement).value)"
                            />
                          </td>
                          <td class="px-4 py-2.5">
                            <select
                              :value="(row['source'] as string) || 'Manual'"
                              class="block rounded border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                              @change="setChildCell(tf.fieldname, ri, 'source', ($event.target as HTMLSelectElement).value)"
                            >
                              <option value="Manual">Manual</option>
                              <option value="Inherited">Inherited</option>
                              <option value="Calculated">Calculated</option>
                              <option value="Imported">Imported</option>
                              <option value="API">API</option>
                            </select>
                          </td>
                          <td class="px-4 py-2.5 text-center">
                            <button
                              type="button"
                              class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                              @click="removeChildRow(tf.fieldname, ri)"
                            >
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div v-else class="px-6 pb-8 text-center">
                  <svg class="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No attributes yet</p>
                </div>
              </template>

              <!-- ===== Generic table (default) ===== -->
              <template v-else>
                <div class="flex items-center justify-between px-6 py-4">
                  <h4 class="text-sm font-semibold text-gray-900 dark:text-white">{{ tf.label }}</h4>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    @click="addChildRow(tf.fieldname)"
                  >
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Row
                  </button>
                </div>

                <!-- Table -->
                <div class="overflow-x-auto">
                  <table v-if="getChildRows(tf.fieldname).length > 0" class="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                    <thead class="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                        <th class="w-10 px-4 py-3 text-center">#</th>
                        <th v-for="cf in (meta?.child_tables?.[tf.fieldname]?.fields ?? [])" :key="cf.fieldname" class="px-4 py-3">
                          {{ cf.label }}
                        </th>
                        <th class="w-16 px-4 py-3 text-center">
                          <span class="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                      <tr v-for="(row, ri) in getChildRows(tf.fieldname)" :key="ri" class="bg-white dark:bg-gray-800">
                        <td class="px-4 py-2.5 text-center text-xs text-gray-400">{{ ri + 1 }}</td>
                        <td v-for="cf in (meta?.child_tables?.[tf.fieldname]?.fields ?? [])" :key="cf.fieldname" class="px-4 py-2">
                          <!-- Attach / Attach Image cell -->
                          <div v-if="['Attach', 'Attach Image'].includes(cf.fieldtype)" class="flex items-center gap-2">
                            <img
                              v-if="getImageSrc(row[cf.fieldname]) && cf.fieldtype === 'Attach Image'"
                              :src="getImageSrc(row[cf.fieldname])"
                              class="h-8 w-8 rounded object-cover"
                              :alt="cf.label"
                            />
                            <span v-else-if="getImageSrc(row[cf.fieldname])" class="max-w-[80px] truncate text-xs text-primary-600 dark:text-primary-400">
                              {{ getImageSrc(row[cf.fieldname]).split('/').pop() }}
                            </span>
                            <label class="cursor-pointer rounded border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-primary-400 hover:text-primary-500 dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-500">
                              <span v-if="uploadingField === `${tf.fieldname}__${ri}__${cf.fieldname}`">
                                <svg class="inline h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                              </span>
                              <span v-else>{{ getImageSrc(row[cf.fieldname]) ? 'Replace' : 'Upload' }}</span>
                              <input
                                type="file"
                                class="sr-only"
                                :accept="cf.fieldtype === 'Attach Image' ? 'image/*' : undefined"
                                :disabled="uploadingField === `${tf.fieldname}__${ri}__${cf.fieldname}`"
                                @change="(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadChildFile(tf.fieldname, ri, cf.fieldname, f) }"
                              />
                            </label>
                          </div>
                          <!-- Check cell -->
                          <input
                            v-else-if="cf.fieldtype === 'Check'"
                            type="checkbox"
                            :checked="row[cf.fieldname] === true || row[cf.fieldname] === 1"
                            class="h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                            @change="setChildCell(tf.fieldname, ri, cf.fieldname, ($event.target as HTMLInputElement).checked)"
                          >
                          <!-- Select cell -->
                          <select
                            v-else-if="cf.fieldtype === 'Select'"
                            :value="row[cf.fieldname]"
                            class="block w-full rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            @change="setChildCell(tf.fieldname, ri, cf.fieldname, ($event.target as HTMLSelectElement).value)"
                          >
                            <option value="">–</option>
                            <option v-for="opt in selectOptions(cf)" :key="opt" :value="opt">{{ opt }}</option>
                          </select>
                          <!-- Default text input -->
                          <input
                            v-else
                            :value="row[cf.fieldname]"
                            type="text"
                            class="block w-full rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            @input="setChildCell(tf.fieldname, ri, cf.fieldname, ($event.target as HTMLInputElement).value)"
                          >
                        </td>
                        <td class="px-4 py-2 text-center">
                          <button
                            type="button"
                            class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            title="Remove row"
                            @click="removeChildRow(tf.fieldname, ri)"
                          >
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- Empty table state -->
                  <div v-else class="px-6 py-8 text-center">
                    <svg class="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No rows yet</p>
                  </div>
                </div>
              </template>

            </div>
          </template>
        </div>
      </template>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50"
        @click.self="showDeleteConfirm = false"
      >
        <div class="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <svg class="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Delete Document</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete <span class="font-medium text-gray-900 dark:text-white">{{ docName }}</span>? This action cannot be undone.
              </p>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              @click="showDeleteConfirm = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-800"
              :disabled="saveLoading"
              @click="deleteDoc"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
