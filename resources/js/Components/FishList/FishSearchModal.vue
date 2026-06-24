<template>
  <transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      @click.self="handleClose"
    >
      <div
        class="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-lg p-6 relative text-xl"
      >
        <button
          class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          @click="handleClose"
          aria-label="關閉搜尋"
        >
          ✕
        </button>
        <h2 class="font-semibold mb-4 text-gray-800 dark:text-gray-100">條件搜尋</h2>
        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- 下拉：族群 -->
          <div>
            <label class="block mb-1 text-gray-600 dark:text-gray-300">部落</label>
            <select
              v-model="localFilters.tribe"
              class="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">請選擇部落</option>
              <option v-for="t in searchOptions.tribes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <!-- 下拉：食物分類 -->
          <div>
            <label class="block mb-1 text-gray-600 dark:text-gray-300">分類</label>
            <select
              v-model="localFilters.food_category"
              class="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">請選擇分類</option>
              <option v-for="fc in searchOptions.dietaryClassifications" :key="fc" :value="fc">
                {{ optionLabel(fc) }}
              </option>
            </select>
          </div>
          <!-- 下拉：魚鱗的處理方式 -->
          <div>
            <label class="block mb-1 text-gray-600 dark:text-gray-300">魚鱗的處理</label>
            <select
              v-model="localFilters.processing_method"
              class="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">請選擇魚鱗的處理方式</option>
              <option v-for="pm in searchOptions.processingMethods" :key="pm" :value="pm">
                {{ optionLabel(pm) }}
              </option>
            </select>
          </div>
          <!-- 文字：捕獲地點 -->
          <div>
            <label class="block mb-1 text-gray-600 dark:text-gray-300">捕獲地點</label>
            <input
              v-model="localFilters.capture_location"
              type="text"
              placeholder="可留空"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <!-- 文字：名稱關鍵字 -->
          <div>
            <label class="block mb-1 text-gray-600 dark:text-gray-300">名稱</label>
            <input
              v-model="localNameQuery"
              type="text"
              placeholder="可留空"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div class="flex justify-between items-center pt-2">
            <button
              type="button"
              @click="handleReset"
              class="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              清除
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              搜尋
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue'

const optionLabelMap = {
  '?': '待確認(?)',
}
const optionLabel = (val) => optionLabelMap[val] ?? val

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  filters: {
    type: Object,
    default: () => ({
      tribe: '',
      food_category: '',
      processing_method: '',
      capture_location: '',
    }),
  },
  nameQuery: {
    type: String,
    default: '',
  },
  searchOptions: {
    type: Object,
    default: () => ({
      tribes: [],
      dietaryClassifications: [],
      processingMethods: [],
    }),
  },
})

const emit = defineEmits(['update:show', 'update:filters', 'update:nameQuery', 'submit', 'reset'])

// 本地狀態
const localFilters = ref({ ...props.filters })
const localNameQuery = ref(props.nameQuery)

// 監聽 props 變化同步到本地狀態
watch(
  () => props.filters,
  (newFilters) => {
    localFilters.value = { ...newFilters }
  },
  { deep: true }
)

watch(
  () => props.nameQuery,
  (newQuery) => {
    localNameQuery.value = newQuery
  }
)

// 關閉對話框
const handleClose = () => {
  emit('update:show', false)
}

// 提交搜尋
const handleSubmit = () => {
  emit('update:filters', { ...localFilters.value })
  emit('update:nameQuery', localNameQuery.value)
  emit('submit')
}

// 清除表單
const handleReset = () => {
  localFilters.value = {
    tribe: '',
    food_category: '',
    processing_method: '',
    capture_location: '',
  }
  localNameQuery.value = ''
  emit('update:filters', { ...localFilters.value })
  emit('update:nameQuery', localNameQuery.value)
  emit('reset')
}
</script>

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
