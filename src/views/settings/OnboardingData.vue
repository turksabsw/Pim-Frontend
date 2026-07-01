<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFrappeAPI } from '@/composables/useFrappeAPI'

const { callMethod, loading } = useFrappeAPI()
const router = useRouter()

const data = ref<Record<string, any> | null>(null)
const error = ref<string | null>(null)

const STEP_LABELS: Record<string, string> = {
  company_info: 'Şirket Bilgileri',
  industry_selection: 'Sektör Seçimi',
  product_structure: 'Ürün Yapısı',
  attribute_config: 'Özellik Yapılandırması',
  taxonomy: 'Taksonomi',
  channel_setup: 'Kanallar',
  localization: 'Yerelleştirme',
  workflow_preferences: 'İş Akışı',
  quality_scoring: 'Kalite Puanlama',
  integrations: 'Entegrasyonlar',
  compliance: 'Uyumluluk',
  summary_launch: 'Özet',
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Başlanmadı',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
  skipped: 'Atlandı',
}

const stepData = computed(() => {
  if (!data.value?.step_data) return []
  return data.value.step_data as Array<{
    step_id: string
    step_number: number
    data: Record<string, any>
    saved_at: string
  }>
})

const statusColor = computed(() => {
  const status = data.value?.onboarding_status
  if (status === 'completed') return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
  if (status === 'in_progress') return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
  return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
})

function formatValue(val: any): string {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'boolean') return val ? 'Evet' : 'Hayır'
  if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '—'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('tr-TR')
}

function isEmptyData(d: Record<string, any>): boolean {
  return Object.keys(d).length === 0
}

async function fetchData() {
  error.value = null
  try {
    const res = await callMethod<Record<string, any>>(
      'frappe_pim.pim.api.onboarding.get_onboarding_status'
    )
    data.value = res
  } catch (e: any) {
    error.value = e?.message || 'Veriler yüklenemedi'
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <!-- Başlık -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Onboarding Verileri</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Kurulum sihirbazında girilen tüm bilgiler
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="btn-primary"
          @click="router.push('/settings/onboarding-configuration')"
        >
          Düzenle
        </button>
        <button
          class="btn-secondary"
          :disabled="loading"
          @click="fetchData"
        >
          {{ loading ? 'Yükleniyor...' : 'Yenile' }}
        </button>
      </div>
    </div>

    <!-- Hata -->
    <div
      v-if="error"
      class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
    >
      {{ error }}
    </div>

    <!-- Yükleniyor -->
    <div v-if="loading && !data" class="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
      Yükleniyor...
    </div>

    <template v-if="data">
      <!-- Genel Durum -->
      <div class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 class="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Genel Durum
        </h3>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Durum</p>
            <span
              class="mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="statusColor"
            >
              {{ STATUS_LABELS[data.onboarding_status] ?? data.onboarding_status }}
            </span>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Mevcut Adım</p>
            <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {{ data.current_step ?? '—' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">İlerleme</p>
            <div class="mt-2 flex items-center gap-2">
              <div class="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  class="h-2 rounded-full bg-blue-600 transition-all"
                  :style="{ width: (data.progress_percent ?? 0) + '%' }"
                />
              </div>
              <span class="text-xs text-gray-600 dark:text-gray-400">{{ data.progress_percent ?? 0 }}%</span>
            </div>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Başlangıç</p>
            <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDate(data.started_at) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Tamamlanma</p>
            <p class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDate(data.completed_at) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Sektör</p>
            <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {{ data.selected_industry ?? '—' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Adım Adım Veriler -->
      <div v-if="stepData.length > 0" class="space-y-3">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Adım Adım Veriler
        </h3>

        <div
          v-for="step in stepData"
          :key="step.step_id"
          class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        >
          <!-- Adım Başlığı -->
          <div
            class="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {{ step.step_number }}
              </span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {{ STEP_LABELS[step.step_id] ?? step.step_id }}
              </span>
            </div>
            <span class="text-xs text-gray-400">{{ formatDate(step.saved_at) }}</span>
          </div>

          <!-- Adım İçeriği -->
          <div v-if="!isEmptyData(step.data)" class="divide-y divide-gray-50 px-5 dark:divide-gray-700/50">
            <div
              v-for="(val, key) in step.data"
              :key="key"
              class="flex items-center justify-between gap-4 py-2.5"
            >
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ key }}</span>
              <span
                class="max-w-xs truncate text-right text-xs font-medium text-gray-900 dark:text-white"
                :title="formatValue(val)"
              >
                {{ formatValue(val) }}
              </span>
            </div>
          </div>
          <div v-else class="px-5 py-3 text-xs text-gray-400">Veri girilmedi</div>
        </div>
      </div>

      <div
        v-else
        class="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800"
      >
        Henüz adım verisi yok
      </div>
    </template>
  </div>
</template>
