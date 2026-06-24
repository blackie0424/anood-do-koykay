<template>
  <div class="space-y-6">
    <!-- 全域載入過場（點擊卡片後顯示） -->
    <div
      v-if="isNavigating"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      aria-hidden="true"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-3">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div class="text-sm">載入中...</div>
      </div>
    </div>

    <!-- 搜尋結果統計 -->
    <div
      class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
    >
      <div class="flex items-center justify-between">
        <div class="text-sm text-blue-900 dark:text-red-800 font-medium">
          找到 <span class="font-bold">{{ results.length }}</span> 筆魚類資料
          <span
            v-if="activeFiltersCount > 0"
            class="ml-2 text-blue-700 dark:text-red-800 font-normal"
          >
            (已套用 {{ activeFiltersCount }} 個篩選條件)
          </span>
        </div>
        <div v-if="loading" class="text-sm text-blue-700 dark:text-red-800">搜尋中...</div>
      </div>
    </div>

    <!-- 無結果狀態 -->
    <div v-if="!loading && results.length === 0" class="text-center py-12">
      <div class="text-gray-400 dark:text-gray-500 mb-4">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        沒有找到符合條件的魚類
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">請嘗試調整搜尋條件或清除部分篩選</p>
      <button
        @click="$emit('clear-filters')"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        清除所有篩選
      </button>
    </div>

    <!-- 搜尋結果列表 -->
    <div v-else-if="!loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="fish in results" :key="fish.id">
        <!-- 將整張卡片改為可點擊區塊，增大點擊面積 -->
        <a
          :href="`/fish/${fish.id}`"
          class="block bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          @click.prevent="handleCardClick($event, `/fish/${fish.id}`)"
        >
          <!-- 魚類圖片 -->
          <div class="aspect-w-16 aspect-h-9">
            <LazyImage
              :src="fish.image_url"
              :alt="fish.name"
              wrapperClass="w-full h-48 overflow-hidden rounded-t-lg bg-gray-100 dark:bg-gray-700"
              imgClass="w-full h-full object-cover"
            />
          </div>

          <!-- 魚類資訊 -->
          <div class="p-4">
            <!-- 魚類名稱：改為可見且不單獨包成 link（整卡為連結） -->
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              <span
                class="inline-block hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                v-html="highlightText(fish.name, filters.name)"
              ></span>
            </h3>

            <!-- 部落分類資訊 -->
            <div
              v-if="fish.tribal_classifications && fish.tribal_classifications.length > 0"
              class="hidden"
            >
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">部落分類資訊：</h4>
              <div class="space-y-1">
                <div
                  v-for="classification in getFilteredClassifications(fish.tribal_classifications)"
                  :key="`${classification.tribe}-${classification.id}`"
                  class="text-xs bg-gray-50 dark:bg-gray-700 rounded-md p-2"
                >
                  <div class="flex items-center justify-between">
                    <span
                      class="font-medium"
                      :class="
                        isHighlighted('tribe', classification.tribe)
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1 rounded'
                          : 'text-gray-700 dark:text-gray-300'
                      "
                    >
                      {{ classification.tribe }}
                    </span>
                  </div>
                  <div class="mt-1 space-y-1">
                    <div
                      v-if="classification.food_category"
                      class="flex items-center text-gray-600 dark:text-gray-400"
                    >
                      <span class="mr-2">飲食：</span>
                      <span
                        :class="
                          isHighlighted('food_category', classification.food_category)
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1 rounded font-medium'
                            : ''
                        "
                      >
                        {{
                          classification.food_category === ''
                            ? '尚未紀錄'
                            : classification.food_category
                        }}
                      </span>
                    </div>
                    <div
                      v-if="classification.processing_method"
                      class="flex items-center text-gray-600 dark:text-gray-400"
                    >
                      <span class="mr-2">處理：</span>
                      <span
                        :class="
                          isHighlighted('processing_method', classification.processing_method)
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1 rounded font-medium'
                            : ''
                        "
                      >
                        {{
                          classification.processing_method === ''
                            ? '尚未紀錄'
                            : classification.processing_method
                        }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 捕獲紀錄資訊 -->
            <div v-if="fish.capture_records && fish.capture_records.length > 0" class="hidden">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">捕獲紀錄：</h4>
              <div class="space-y-1">
                <div
                  v-for="record in getFilteredCaptureRecords(fish.capture_records)"
                  :key="record.id"
                  class="text-xs bg-gray-50 dark:bg-gray-700 rounded-md p-2"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-gray-700 dark:text-gray-300">
                      {{ record.tribe }}
                    </span>
                    <span class="text-gray-500 dark:text-gray-400">
                      {{ formatDate(record.capture_date) }}
                    </span>
                  </div>
                  <div v-if="record.location" class="mt-1 text-gray-600 dark:text-gray-400">
                    地點：
                    <span
                      :class="
                        isLocationHighlighted(record.location)
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1 rounded font-medium'
                          : ''
                      "
                      v-html="highlightText(record.location, filters.location)"
                    ></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </a>
      </div>
    </div>

    <!-- 載入狀態 -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import LazyImage from '@/Components/UI/LazyImage.vue'
import { formatDate } from '@/utils/formatDate'

const props = defineProps({
  results: {
    type: Array,
    default: () => [],
  },
  filters: {
    type: Object,
    default: () => ({}),
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['clear-filters'])

// 計算活躍的篩選條件數量
const activeFiltersCount = computed(() => {
  return Object.values(props.filters).filter((value) => value && value.toString().trim() !== '')
    .length
})

// 檢查是否需要高亮顯示
const isHighlighted = (filterKey, value) => {
  return props.filters[filterKey] && props.filters[filterKey] === value
}

// 檢查地點是否需要高亮顯示
const isLocationHighlighted = (location) => {
  return (
    props.filters.location && location.toLowerCase().includes(props.filters.location.toLowerCase())
  )
}

// 高亮顯示文字
const highlightText = (text, searchTerm) => {
  if (!searchTerm || !text) return text

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(
    regex,
    '<span class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</span>'
  )
}

// 取得符合篩選條件的部落分類
const getFilteredClassifications = (classifications) => {
  if (!classifications) return []

  return classifications.filter((classification) => {
    // 如果有部落篩選，只顯示符合的部落
    if (props.filters.tribe && classification.tribe !== props.filters.tribe) {
      return false
    }

    // 如果有飲食分類篩選，只顯示符合的分類
    if (
      props.filters.food_category &&
      classification.food_category !== props.filters.food_category
    ) {
      return false
    }

    // 如果有處理方式篩選，只顯示符合的處理方式
    if (
      props.filters.processing_method &&
      classification.processing_method !== props.filters.processing_method
    ) {
      return false
    }

    return true
  })
}

// 取得符合篩選條件的捕獲紀錄
const getFilteredCaptureRecords = (records) => {
  if (!records) return []

  return records
    .filter((record) => {
      // 如果有地點篩選，只顯示符合的地點
      if (
        props.filters.location &&
        !record.location.toLowerCase().includes(props.filters.location.toLowerCase())
      ) {
        return false
      }

      return true
    })
    .slice(0, 3) // 最多顯示3筆捕獲紀錄
}

// 導航狀態（點擊卡片後顯示過場）
const isNavigating = ref(false)

// 當從原生返回（如手機右滑返回或 BFCache 恢復）時，清除過場狀態
function clearNavigating() {
  isNavigating.value = false
}

const visibilityHandler = () => {
  if (document.visibilityState === 'visible') {
    clearNavigating()
  }
}

onMounted(() => {
  // 初始確保為 false（避免從 bfcache 恢復時持續顯示）
  isNavigating.value = false
  window.addEventListener('pageshow', clearNavigating)
  window.addEventListener('popstate', clearNavigating)
  document.addEventListener('visibilitychange', visibilityHandler)
})

onBeforeUnmount(() => {
  window.removeEventListener('pageshow', clearNavigating)
  window.removeEventListener('popstate', clearNavigating)
  document.removeEventListener('visibilitychange', visibilityHandler)
})

// 使用 Web Audio API 播放短促音效（不需外部音檔）
function playClickSound(duration = 120, frequency = 880) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = frequency
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000)
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + duration / 1000 + 0.02)
  } catch (e) {
    console.warn('Audio not supported', e)
  }
}

// 點擊卡片時：先顯示過場並播放音效，短延遲後導頁
async function handleCardClick(event, href) {
  // 若使用者要求開新分頁（meta/ctrl/middle）保留行為
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) {
    window.open(href, '_blank')
    return
  }

  isNavigating.value = true
  playClickSound()
  // 等待短暫時間讓使用者感受到反饋
  await new Promise((r) => setTimeout(r, 300))
  window.location.href = href
}
</script>
