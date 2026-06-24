<template>
  <div class="space-y-4">
    <!-- 上傳區域 -->
    <div
      data-testid="upload-area"
      class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <div class="flex flex-col items-center gap-3">
        <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <div class="text-gray-600 text-sm">
          <label
            :for="inputId"
            class="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
          >
            點選選取照片
          </label>
          <span v-if="!isLineApp" class="hidden md:inline">，或拖曳到此</span>
        </div>
        <p class="text-xs text-gray-400">PNG、JPG、WEBP、HEIC，最多 {{ maxFiles }} 張</p>
      </div>

      <input
        :id="inputId"
        data-testid="file-input"
        type="file"
        accept="image/*,.heic,.HEIC"
        v-bind="inputAttrs"
        class="hidden"
        ref="fileInputRef"
        @change="onFilesSelected"
      />
    </div>

    <!-- 已選數量 -->
    <div class="flex items-center justify-between text-sm text-gray-500">
      <span>
        已選 <span class="font-semibold text-gray-800">{{ items.length }}</span> / {{ maxFiles }} 張
      </span>
      <button
        v-if="items.length > 0"
        type="button"
        class="text-red-500 hover:text-red-600 text-xs"
        @click="clearAll"
      >
        全部清除
      </button>
    </div>

    <!-- 空清單提示 -->
    <p
      v-if="items.length === 0"
      data-testid="empty-hint"
      class="text-center text-gray-400 text-sm py-4"
    >
      尚未選擇任何照片
    </p>

    <!-- 縮圖列表 -->
    <div v-if="items.length > 0" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      <div
        v-for="(item, index) in items"
        :key="item.id"
        data-testid="thumbnail-item"
        class="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
      >
        <!-- 縮圖 -->
        <img
          v-if="item.preview"
          :src="item.preview"
          :alt="`照片 ${index + 1}`"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
            />
          </svg>
        </div>

        <!-- 轉檔中遮罩（HEIC → JPEG） -->
        <div
          v-if="item.status === 'converting'"
          class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1"
        >
          <svg class="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span class="text-white text-xs">轉檔中</span>
        </div>

        <!-- 上傳狀態遮罩 -->
        <div
          v-if="item.status === 'uploading'"
          class="absolute inset-0 bg-black/40 flex items-center justify-center"
        >
          <svg class="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>

        <!-- 成功標記 -->
        <div
          v-if="item.status === 'done'"
          class="absolute top-1 left-1 bg-green-500 rounded-full p-0.5"
        >
          <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <!-- 錯誤標記 -->
        <div
          v-if="item.status === 'error'"
          class="absolute top-1 left-1 bg-red-500 rounded-full p-0.5"
          :title="item.error"
        >
          <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <!-- HEIC 標籤 -->
        <div
          v-if="item.isHeic && item.status === 'pending'"
          class="absolute bottom-1 left-1 bg-orange-500/80 text-white text-xs px-1 rounded leading-tight"
        >
          HEIC
        </div>

        <!-- 移除按鈕（未上傳中才可移除） -->
        <button
          v-if="item.status !== 'uploading' && item.status !== 'converting'"
          data-testid="remove-btn"
          type="button"
          class="absolute top-1 right-1 bg-gray-800/70 hover:bg-red-600 rounded-full p-0.5 transition-colors"
          @click="removeItem(index)"
        >
          <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- 繼續加入按鈕（未達上限） -->
    <button
      v-if="items.length > 0 && items.length < maxFiles"
      data-testid="add-more-btn"
      type="button"
      class="w-full py-2 border border-dashed border-blue-300 rounded-lg text-blue-600 text-sm hover:bg-blue-50 transition-colors"
      @click="triggerFilePicker"
    >
      + 繼續加入照片（還可加 {{ maxFiles - items.length }} 張）
    </button>

    <!-- 上傳中全域指示器 -->
    <div
      v-if="isUploading"
      data-testid="uploading-indicator"
      class="flex items-center gap-2 text-blue-600 text-sm"
    >
      <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      上傳中，請稍候...
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiFetch } from '@/utils/apiFetch'

let _idCounter = 0

const props = defineProps({
  maxFiles: {
    type: Number,
    default: 5,
  },
  isLineApp: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['uploaded', 'upload-error'])

// 動態載入 heic2any CDN（HEIC 轉檔用）
onMounted(() => {
  if (!window.heic2any) {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/heic2any/dist/heic2any.min.js'
    script.async = true
    document.head.appendChild(script)
  }
})

const fileInputRef = ref(null)
const items = ref([]) // { id, file, preview, status, filename, error, isHeic }
const isUploading = ref(false)

// 唯一 input id（避免多個元件衝突）
const inputId = `batch-upload-input-${Math.random().toString(36).slice(2)}`

// 根據平台決定是否帶 multiple
const inputAttrs = computed(() => (props.isLineApp ? {} : { multiple: true }))

function isHeicFile(file) {
  return (
    file.name.toLowerCase().endsWith('.heic') ||
    file.type === 'image/heic' ||
    file.type === 'image/heif'
  )
}

function onFilesSelected(event) {
  addFiles(Array.from(event.target.files))
  // 清空 input 值，讓同樣的檔案可以再次選取（LINE 逐張加入情境）
  event.target.value = ''
}

function onDrop(event) {
  addFiles(Array.from(event.dataTransfer.files))
}

function addFiles(files) {
  const remaining = props.maxFiles - items.value.length
  if (remaining <= 0) return

  const toAdd = files.slice(0, remaining)
  toAdd.forEach((file) => {
    const id = ++_idCounter
    const item = {
      id,
      file,
      preview: null,
      status: 'pending',
      filename: null,
      error: null,
      isHeic: isHeicFile(file),
    }
    items.value.push(item)

    // 非同步產生縮圖預覽
    const reader = new FileReader()
    reader.onload = (e) => {
      const found = items.value.find((i) => i.id === id)
      if (found) found.preview = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function removeItem(index) {
  items.value.splice(index, 1)
}

function clearAll() {
  items.value = []
}

function triggerFilePicker() {
  fileInputRef.value?.click()
}

async function uploadAll() {
  if (items.value.length === 0) return

  isUploading.value = true
  const failedItems = []

  for (const item of items.value) {
    if (item.status === 'done') continue
    item.error = null

    // HEIC 轉檔
    let uploadFile = item.file
    if (isHeicFile(item.file)) {
      item.status = 'converting'
      if (!window.heic2any) {
        item.status = 'error'
        item.error = '找不到 heic2any 函式庫，請確認 CDN 已載入'
        failedItems.push(item)
        continue
      }
      try {
        const converted = await window.heic2any({ blob: item.file, toType: 'image/jpeg' })
        const newName = item.file.name.replace(/\.heic$/i, '.jpg')
        uploadFile = new File([converted], newName, { type: 'image/jpeg' })
        item.file = uploadFile
        item.isHeic = false
        // 更新縮圖預覽
        const reader = new FileReader()
        reader.onload = (e) => {
          const found = items.value.find((i) => i.id === item.id)
          if (found) found.preview = e.target.result
        }
        reader.readAsDataURL(uploadFile)
      } catch {
        item.status = 'error'
        item.error = 'HEIC 轉檔失敗，請手動轉換後再上傳'
        failedItems.push(item)
        continue
      }
    }

    item.status = 'uploading'

    try {
      // 1. 取得 signed URL
      const signedRes = await apiFetch('/prefix/api/storage/signed-upload-url', {
        method: 'POST',
        body: JSON.stringify({ filename: uploadFile.name }),
      })
      const signedData = await signedRes.json()
      if (!signedRes.ok) throw new Error(signedData.message || '取得上傳網址失敗')

      // 2. PUT 上傳至 S3
      const uploadRes = await fetch(signedData.url, {
        method: 'PUT',
        body: uploadFile,
      })
      if (!uploadRes.ok) throw new Error('圖片上傳失敗')

      item.filename = signedData.filename
      item.status = 'done'
    } catch (e) {
      item.status = 'error'
      item.error = e.message
      failedItems.push(item)
    }
  }

  isUploading.value = false

  if (failedItems.length > 0) {
    emit(
      'upload-error',
      failedItems.map((i) => i.error)
    )
    return
  }

  const filenames = items.value.map((i) => i.filename).filter(Boolean)
  emit('uploaded', filenames)
}

defineExpose({ uploadAll, addFiles, items })
</script>
