<template>
  <form @submit.prevent="submitFish" class="bg-white p-6 rounded shadow-md max-w-md mx-auto">
    <div class="mb-4">
      <!-- 只在建立模式顯示圖片檔名 -->
      <div v-if="!props.fishId && uploadedFileName" class="text-green-600 mb-2">
        圖片已上傳，檔名：{{ uploadedFileName }}
      </div>
      <label for="name" class="block text-xl font-medium text-gray-700 mb-2">魚類名稱</label>
      <input
        type="text"
        id="name"
        v-model="fishName"
        :placeholder="placeholderText"
        :class="['w-full px-3 py-2 text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500', fishName ? 'text-black' : 'text-gray-400']"
        required
      />
    </div>

    <!-- 捕獲紀錄輔助欄位 (僅在新增模式顯示) -->
    <div v-if="!props.fishId" class="space-y-6 pt-6 border-t mt-6">
      <h3 class="text-xl font-semibold text-gray-800 mb-4">捕獲紀錄 (選填)</h3>
      
      <div>
        <label for="tribe" class="block text-xl font-medium text-gray-700 mb-2">部落</label>
        <select id="tribe" v-model="captureData.tribe" class="w-full px-3 py-2 text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option v-for="tribe in tribes" :key="tribe" :value="tribe">{{ tribe }}</option>
        </select>
      </div>

      <div>
        <label for="location" class="block text-xl font-medium text-gray-700 mb-2">捕獲地點</label>
        <input type="text" id="location" v-model="captureData.location" class="w-full px-3 py-2 text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="請輸入捕獲地點" />
      </div>

      <div>
        <label for="captureMethod" class="block text-xl font-medium text-gray-700 mb-2">捕獲方式</label>
        <select id="captureMethod" v-model="captureData.captureMethod" class="w-full px-3 py-2 text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option v-for="(label, value) in capture_methods" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>

      <div>
        <label for="captureDate" class="block text-xl font-medium text-gray-700 mb-2">捕獲日期</label>
        <input type="date" id="captureDate" v-model="captureData.captureDate" class="w-full px-3 py-2 text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label for="notes" class="block text-xl font-medium text-gray-700 mb-2">備註</label>
        <textarea id="notes" v-model="captureData.notes" rows="3" class="w-full px-3 py-2 text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="請輸入相關備註資訊"></textarea>
      </div>
    </div>
  </form>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { router } from '@inertiajs/vue3'
import { markFishStale, markFishCreated } from '@/utils/fishListCache'

const captureData = ref({
  tribe: 'iraraley',
  location: '?',
  captureMethod: 'mamasil',
  captureDate: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD local time instead of UTC to avoid timezone issues
  notes: ''
})

// 建立模式用 uploadedFileName，編輯模式用 fishId、fishNameInit
const props = defineProps({
  uploadedFileName: String, // 建立模式用
  fishId: { type: [String, Number], default: null }, // 編輯模式用
  fishNameInit: { type: String, default: '' }, // 編輯模式用
  tribes: { type: Array, default: () => [] },
  capture_methods: { type: [Array, Object], default: () => ({}) }
})
const emit = defineEmits(['submitted'])

const fishName = ref('')
const submitting = ref(false)

const placeholderText = computed(() => (fishName.value ? '' : '我不知道'))

onMounted(() => {
  // 編輯模式預設帶入名稱
  if (props.fishNameInit) {
    fishName.value = props.fishNameInit
  }
})

// 建立模式：送出新增魚類資訊
async function submitForm() {
  // 如果有 fishId，代表是編輯模式，請用 submitEditForm
  if (props.fishId) return

  const nameToSend = fishName.value || '我不知道'
  if (!props.uploadedFileName) return
  submitting.value = true

  // 使用 Inertia router.post 發送到 /fish（由後端處理 flash 與導向）
  router.post(
    '/fish',
    { 
      name: nameToSend, 
      image: props.uploadedFileName,
      tribe: captureData.value.tribe,
      location: captureData.value.location,
      capture_method: captureData.value.captureMethod,
      capture_date: captureData.value.captureDate,
      notes: captureData.value.notes
    },
    {
      onSuccess: (page) => {
        const fishId = page.props.fish?.id
        // 新增魚類成功，標記新增的魚類 ID，返回 Fishs 頁面時會查詢並插入
        if (fishId) {
          markFishCreated(fishId)
        }
        fishName.value = ''
        // 通知上層元件
        emit('submitted', fishId ?? null)
      },
      onFinish: () => {
        submitting.value = false
      },
    }
  )
}

// 編輯模式：送出更新魚類名稱
async function submitEditForm() {
  // 只有編輯模式才會執行
  if (!props.fishId) return

  const nameToSend = fishName.value || '我不知道'
  const requestUrl = `/fish/${props.fishId}/name`

  submitting.value = true

  // 使用 Inertia router.put 發送到 /fish/${props.fishId}/name
  // 後端會 redirect 並帶 flash message，Inertia 自動處理導向
  router.put(
    requestUrl,
    { name: nameToSend },
    {
      onSuccess: () => {
        // 標記此魚類需要在 Fishs 頁面更新
        markFishStale(props.fishId)
      },
      onFinish: () => {
        submitting.value = false
      },
    }
  )
}

// 只 expose 兩個函式，避免混用
defineExpose({ submitForm, submitEditForm })
</script>
