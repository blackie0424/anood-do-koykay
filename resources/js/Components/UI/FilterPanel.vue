<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">搜尋篩選</h3>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <!-- 部落篩選 -->
      <div class="space-y-2">
        <label
          for="tribe-filter"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          部落
        </label>
        <select
          id="tribe-filter"
          v-model="localFilters.tribe"
          @change="emitFiltersChange"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">所有部落</option>
          <option v-for="tribe in tribes" :key="tribe" :value="tribe">
            {{ tribe }}
          </option>
        </select>
      </div>

      <!-- 飲食分類篩選 -->
      <div class="space-y-2">
        <label
          for="food-category-filter"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          飲食分類
        </label>
        <select
          id="food-category-filter"
          v-model="localFilters.food_category"
          @change="emitFiltersChange"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">所有分類</option>
          <option v-for="category in foodCategories" :key="category" :value="category">
            {{ category === '' ? '尚未紀錄' : category === '?' ? '不確定' : category }}
          </option>
        </select>
      </div>

      <!-- 處理方式篩選 -->
      <div class="space-y-2">
        <label
          for="processing-method-filter"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          處理方式
        </label>
        <select
          id="processing-method-filter"
          v-model="localFilters.processing_method"
          @change="emitFiltersChange"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">所有處理方式</option>
          <option v-for="method in processingMethods" :key="method" :value="method">
            {{ method === '' ? '尚未紀錄' : method === '?' ? '不確定' : method }}
          </option>
        </select>
      </div>
      <!-- 捕獲方式篩選 -->
      <div class="space-y-2">
        <label
          for="capture-method-filter"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          捕獲方式
        </label>
        <select
          id="capture-method-filter"
          v-model="localFilters.capture_method"
          @change="emitFiltersChange"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">所有捕獲方式</option>
          <option v-for="m in captureMethods" :key="m" :value="m">{{ m === '' ? '尚未紀錄' : m }}</option>
        </select>
      </div>
    </div>

    <!-- 地點搜尋：獨立一行（全寬） -->
    <div class="mt-4">
      <label
        for="capture-location-search"
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        捕獲地點
      </label>
      <input
        id="capture-location-search"
        v-model="localFilters.capture_location"
        @input="debounceEmitFiltersChange"
        type="text"
        placeholder="輸入地點關鍵字..."
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
      />
    </div>

    <!-- 魚類名稱搜尋 -->
    <div class="mt-4">
      <label
        for="fish-name-search"
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        魚類名稱
      </label>
      <input
        id="fish-name-search"
        v-model="localFilters.name"
        @input="debounceEmitFiltersChange"
        type="text"
        placeholder="輸入魚類名稱..."
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
      />
    </div>

    <!-- 清除篩選按鈕 -->
    <div class="mt-4 flex justify-end">
      <button
        @click="clearFilters"
        class="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        清除篩選
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  filters: {
    type: Object,
    default: () => ({}),
  },
  tribes: {
    type: Array,
    default: () => ['ivalino', 'iranmeilek', 'imowrod', 'iratay', 'yayo', 'iraraley'],
  },
  foodCategories: {
    type: Array,
    default: () => ['oyod', 'rahet', '不分類', '不食用', '?', ''],
  },
  processingMethods: {
    type: Array,
    default: () => ['去魚鱗', '不去魚鱗', '剝皮', '不食用', '?', ''],
  },
  captureMethods: {
    type: Array,
    default: () => ['網捕', '釣魚', '陷阱', '徒手捕捉', '魚叉', ''],
  },
})

const emit = defineEmits(['filters-change'])

// 本地篩選狀態
const localFilters = ref({
  tribe: '',
  food_category: '',
  processing_method: '',
  capture_location: '',
  capture_method: '',
  name: '',
  ...props.filters,
})

// 防抖動計時器
let debounceTimer = null

// 監聽 props.filters 變化
watch(
  () => props.filters,
  (newFilters) => {
    localFilters.value = {
      tribe: '',
      food_category: '',
      processing_method: '',
  capture_location: '',
  capture_method: '',
      name: '',
      ...newFilters,
    }
  },
  { deep: true }
)

// 發送篩選變更事件
const emitFiltersChange = () => {
  emit('filters-change', { ...localFilters.value })
}

// 防抖動發送篩選變更事件
const debounceEmitFiltersChange = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    emitFiltersChange()
  }, 300)
}

// 清除所有篩選
const clearFilters = () => {
  localFilters.value = {
    tribe: '',
    food_category: '',
    processing_method: '',
    capture_location: '',
    capture_method: '',
    name: '',
  }
  emitFiltersChange()
}

onMounted(() => {
  // 確保初始狀態與 props 同步
  localFilters.value = {
    tribe: '',
    food_category: '',
    processing_method: '',
  capture_location: '',
  capture_method: '',
    name: '',
    ...props.filters,
  }
})
</script>
