import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'

import App from './App.vue'
import router from './router'

import './assets/css/main.css'
import 'flowbite'

// Dark mode init is in index.html <script> for instant apply (no flash).
// OS preference listener for when user hasn't chosen manually:
;(function () {
  if (!localStorage.getItem('pim-theme')) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('pim-theme')) {
        document.documentElement.classList.toggle('dark', e.matches)
        document.documentElement.style.colorScheme = e.matches ? 'only dark' : 'only light'
      }
    })
  }
})()

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: {
      app: {
        title: 'PIM',
        subtitle: 'Product Information Management',
      },
      nav: {
        dashboard: 'Dashboard',
        products: 'Products',
        categories: 'Categories',
        attributes: 'Attributes',
        families: 'Families',
        settings: 'Settings',
      },
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        search: 'Search',
        loading: 'Loading...',
        noResults: 'No results found',
        error: 'An error occurred',
        retry: 'Retry',
        confirm: 'Confirm',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        apply: 'Apply',
        clear: 'Clear',
        upload: 'Upload',
        remove: 'Remove',
      },
      products: {
        title: 'Products',
        createProduct: 'Create Product',
        editProduct: 'Edit Product',
        deleteProduct: 'Delete Product',
        productName: 'Product Name',
        productCode: 'Product Code',
        productType: 'Product Type',
        productFamily: 'Product Family',
        category: 'Category',
        brand: 'Brand',
        status: 'Status',
        completeness: 'Completeness',
        shortDescription: 'Short Description',
        longDescription: 'Long Description',
        hasVariants: 'This product has variants',
        attributes: 'Attributes',
        variants: 'Variants',
        media: 'Media',
        general: 'General',
        noProducts: 'No products found',
        noAttributes: 'No attribute values defined yet.',
        noVariants: 'No variants yet.',
        noMedia: 'No media uploaded yet.',
        generateVariants: 'Generate Variants',
        variantAxes: 'Variant Axes',
        axisValues: 'Axis Values',
        combinations: 'Combinations',
        syncStatus: 'Sync Status',
        erpItem: 'ERP Item',
        lastSynced: 'Last Synced',
        bulkActions: 'Bulk Actions',
        setActive: 'Set Active',
        setDraft: 'Set Draft',
        archive: 'Archive',
        deleteSelected: 'Delete Selected',
        clearSelection: 'Clear Selection',
        filters: 'Filters',
        applyFilters: 'Apply Filters',
        clearFilters: 'Clear All',
        allStatuses: 'All Statuses',
        allFamilies: 'All Families',
        minCompleteness: 'Min Completeness %',
        maxCompleteness: 'Max Completeness %',
        sortBy: 'Sort by',
        perPage: 'Per page',
        selected: 'selected',
        unsavedChanges: 'Unsaved changes',
        savedSuccessfully: 'Saved successfully',
      },
      onboarding: {
        welcome: 'Welcome to PIM',
        getStarted: 'Get Started',
        skip: 'Skip for now',
        next: 'Next',
        back: 'Back',
        finish: 'Finish Setup',
      },
    },
  },
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
