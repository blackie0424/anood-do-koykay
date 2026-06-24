<template>
  <form @submit.prevent class="space-y-4">
    <!-- 魚類提醒 -->
    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div class="w-12 h-12 flex-shrink-0">
        <LazyImage
          :src="fishImage"
          :alt="fishName"
          wrapperClass="w-full h-full bg-gray-200 rounded-lg"
          imgClass="w-full h-full object-contain"
        />
      </div>
      <div>
        <p class="text-sm font-medium text-gray-900">正在編輯 {{ fishName }} 的發音資料</p>
        <p class="text-xs text-gray-500">修改發音名稱或音頻檔案</p>
      </div>
    </div>

    <!-- 發音名稱 -->
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
        發音名稱 <span class="text-red-500">*</span>
      </label>
      <input
        id="name"
        v-model="form.name"
        @blur="touchField('name')"
        type="text"
        :class="[
          'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors',
          errors.name
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
        ]"
        placeholder="例如：太魯閣族發音、阿美族發音"
        required
      />
      <div v-if="errors.name" class="flex items-center gap-1 text-red-500 text-sm mt-1">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        {{ errors.name }}
      </div>
      <div
        v-else-if="touched.name && form.name.length >= 2"
        class="flex items-center gap-1 text-green-500 text-sm mt-1"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
        名稱格式正確
      </div>
    </div>

    <!-- 當前音頻和上傳新音頻 -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1"> 音頻檔案 </label>

      <!-- 當前音頻 -->
      <div v-if="audio.locate && !audioPreview" class="mb-4">
        <p class="text-sm text-gray-600 mb-2">當前音頻：</p>
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <button
            type="button"
            @click="toggleCurrentAudio"
            class="flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600"
          >
            <svg
              v-if="!isCurrentPlaying"
              class="w-4 h-4 ml-0.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h4v12H6zm8-6v12h4V6h-4z" />
            </svg>
          </button>
          <div class="flex-1">
            <p class="text-sm font-medium">{{ audio.name }}</p>
            <p class="text-xs text-gray-500">{{ audio.locate }}</p>
          </div>
        </div>
        <audio
          ref="currentAudioElement"
          :src="`/storage/audio/${audio.locate}`"
          @ended="onCurrentAudioEnded"
          preload="none"
        ></audio>
      </div>

      <!-- 上傳新音頻 -->
      <div
        class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors"
      >
        <div class="space-y-1 text-center">
          <div v-if="!audioPreview">
            <svg
              class="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 48 48"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <div class="flex text-sm text-gray-600">
              <label
                for="audio"
                class="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <span>{{ audio.locate ? '更換音頻' : '上傳音頻' }}</span>
                <input
                  id="audio"
                  name="audio"
                  type="file"
                  accept="audio/*"
                  class="sr-only"
                  @change="handleAudioChange"
                />
              </label>
              <p class="pl-1">或拖拽到此處</p>
            </div>
            <p class="text-xs text-gray-500">MP3, WAV, M4A 最大 50MB</p>
          </div>
          <div v-else class="relative">
            <div class="flex items-center justify-center gap-3 p-4 bg-gray-100 rounded-lg">
              <button
                type="button"
                @click="togglePreviewAudio"
                class="flex items-center justify-center w-10 h-10 bg-green-500 text-white rounded-full hover:bg-green-600"
              >
                <svg
                  v-if="!isPreviewPlaying"
                  class="w-4 h-4 ml-0.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h4v12H6zm8-6v12h4V6h-4z" />
                </svg>
              </button>
              <div class="flex-1">
                <p class="text-sm font-medium">新音頻預覽</p>
                <p class="text-xs text-gray-500">{{ selectedFileName }}</p>
              </div>
            </div>
            <button
              type="button"
              @click="removeAudio"
              class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
              :disabled="uploading"
            >
              ×
            </button>
            <!-- 上傳狀態 -->
            <div v-if="uploading" class="mt-2 text-sm text-blue-600">
              <div class="flex items-center">
                <svg
                  class="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                正在上傳音頻...
              </div>
            </div>
            <div v-else-if="uploadedAudioFilename" class="mt-2 text-sm text-green-600">
              ✓ 音頻上傳成功
            </div>
            <audio
              ref="previewAudioElement"
              :src="audioPreview"
              @ended="onPreviewAudioEnded"
              preload="none"
            ></audio>
          </div>
        </div>
      </div>
      <div v-if="errors.audio" class="flex items-center gap-1 text-red-500 text-sm mt-1">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        {{ errors.audio }}
      </div>

      <!-- 上傳錯誤提示 -->
      <div v-if="uploadError" class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex items-start gap-2">
          <svg
            class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
          <div class="flex-1">
            <p class="text-sm font-medium text-red-800">音頻上傳失敗</p>
            <p class="text-xs text-red-600 mt-1">{{ uploadError }}</p>
            <div class="flex gap-2 mt-2">
              <button
                @click="retryUpload"
                type="button"
                class="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
                :disabled="uploading"
              >
                重新上傳
              </button>
              <button
                @click="uploadError = null"
                type="button"
                class="text-xs text-red-600 hover:text-red-800 px-2 py-1 transition-colors"
              >
                忽略
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 網路錯誤提示 -->
    <div v-if="networkError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-start gap-2">
        <svg
          class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        <div class="flex-1">
          <p class="text-sm font-medium text-red-800">提交失敗</p>
          <p class="text-xs text-red-600 mt-1">{{ networkError }}</p>
          <div class="flex gap-2 mt-2">
            <button
              @click="retrySubmit"
              type="button"
              class="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
              :disabled="processing || retryAttempts >= maxRetryAttempts"
            >
              {{
                retryAttempts >= maxRetryAttempts
                  ? '已達重試上限'
                  : `重試 (${retryAttempts}/${maxRetryAttempts})`
              }}
            </button>
            <button
              @click="networkError = null"
              type="button"
              class="text-xs text-red-600 hover:text-red-800 px-2 py-1 transition-colors"
            >
              忽略
            </button>
          </div>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { router } from '@inertiajs/vue3'
import { apiFetch } from '@/utils/apiFetch'
import { markFishStale } from '@/utils/fishListCache'
import LazyImage from '@/Components/UI/LazyImage.vue'
import { useFormValidation, validationRules } from '@/composables/useFormValidation.js'

const props = defineProps({
  audio: Object,
  fishId: Number,
  fishName: String,
  fishImage: String,
})

const emit = defineEmits(['submitted', 'statusChange'])

// 表單驗證設置
const formValidationRules = {
  name: [
    validationRules.required('發音名稱為必填欄位'),
    validationRules.minLength(2, '發音名稱至少需要 2 個字元'),
    validationRules.maxLength(255, '發音名稱不能超過 255 個字元'),
  ],
  audio: [
    validationRules.fileSize(50 * 1024 * 1024, '音頻檔案不能超過 50MB'),
    validationRules.audioFile('請選擇有效的音頻檔案'),
  ],
}

const {
  form,
  errors,
  touched,
  isValid,
  hasErrors,
  validateAll,
  touchField,
  setServerErrors,
  clearErrors,
  clearFieldError,
} = useFormValidation(
  {
    name: '',
    audio: null,
  },
  formValidationRules
)

const processing = ref(false)
const audioPreview = ref(null)
const selectedFileName = ref('')
const uploading = ref(false)
const uploadedAudioFilename = ref(null)
const canSubmit = ref(true)
const networkError = ref(null)
const uploadError = ref(null)
const retryAttempts = ref(0)
const maxRetryAttempts = 3

// 音頻播放狀態
const isCurrentPlaying = ref(false)
const isPreviewPlaying = ref(false)
const currentAudioElement = ref(null)
const previewAudioElement = ref(null)

// 初始化表單資料
onMounted(() => {
  if (props.audio) {
    form.name = props.audio.name || ''
  }
})

async function handleAudioChange(event) {
  const file = event.target.files[0]
  if (file) {
    // 先進行檔案驗證
    clearFieldError('audio')
    uploadError.value = null

    const audioValidationError = validationRules.audioFile()(file)
    if (audioValidationError) {
      errors.value.audio = audioValidationError
      return
    }

    const sizeValidationError = validationRules.fileSize(50 * 1024 * 1024)(file)
    if (sizeValidationError) {
      errors.value.audio = sizeValidationError
      return
    }

    form.audio = file
    selectedFileName.value = file.name
    canSubmit.value = false
    uploading.value = true
    emit('statusChange', { canSubmit: false, uploading: true })

    // 建立預覽
    const reader = new FileReader()
    reader.onload = (e) => {
      audioPreview.value = e.target.result
    }
    reader.readAsDataURL(file)

    // 自動上傳音頻
    await uploadAudioFile(file)
  }
}

async function uploadAudioFile(file) {
  try {
    // 檢查網路連線
    if (!navigator.onLine) {
      throw new Error('無網路連線，請檢查網路狀態')
    }

    // 1. 取得簽名上傳 URL
    const signedUrlResponse = await apiFetch('/prefix/api/storage/signed-upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name }),
    })

    const signedUrlData = await signedUrlResponse.json()
    if (!signedUrlResponse.ok) {
      throw new Error(signedUrlData.message || '取得上傳網址失敗')
    }

    // 2. 直接上傳檔案到 Supabase（帶超時）
    const uploadController = new AbortController()
    const uploadTimeout = setTimeout(() => uploadController.abort(), 30000) // 30秒超時

    const uploadResponse = await fetch(signedUrlData.url, {
      method: 'PUT',
      body: file,
      signal: uploadController.signal,
    })

    clearTimeout(uploadTimeout)

    if (!uploadResponse.ok) {
      throw new Error(`音頻上傳失敗: HTTP ${uploadResponse.status}`)
    }

    // 3. 上傳成功，儲存檔案名稱
    uploadedAudioFilename.value = signedUrlData.filename
    canSubmit.value = true
    emit('statusChange', { canSubmit: true, uploading: false })
  } catch (error) {
    console.error('音頻上傳錯誤:', error)

    let errorMessage = error.message
    if (error.name === 'AbortError') {
      errorMessage = '上傳超時，請檢查網路連線或稍後再試'
    } else if (error.message.includes('NetworkError') || !navigator.onLine) {
      errorMessage = '網路連線問題，請檢查網路狀態'
    }

    uploadError.value = errorMessage
    canSubmit.value = true
    emit('statusChange', { canSubmit: true, uploading: false })
  } finally {
    uploading.value = false
  }
}

async function retryUpload() {
  if (form.audio) {
    uploadError.value = null
    uploading.value = true
    canSubmit.value = false
    emit('statusChange', { canSubmit: false, uploading: true })

    await uploadAudioFile(form.audio)
  }
}

function removeAudio() {
  form.audio = null
  audioPreview.value = null
  selectedFileName.value = ''
  uploadedAudioFilename.value = null
  canSubmit.value = true
  isPreviewPlaying.value = false
  // 清除 input 的值
  const input = document.getElementById('audio')
  if (input) input.value = ''
}

function toggleCurrentAudio() {
  if (isCurrentPlaying.value) {
    currentAudioElement.value?.pause()
    isCurrentPlaying.value = false
  } else {
    // 停止預覽音頻
    if (isPreviewPlaying.value) {
      previewAudioElement.value?.pause()
      isPreviewPlaying.value = false
    }
    currentAudioElement.value?.play()
    isCurrentPlaying.value = true
  }
}

function togglePreviewAudio() {
  if (isPreviewPlaying.value) {
    previewAudioElement.value?.pause()
    isPreviewPlaying.value = false
  } else {
    // 停止當前音頻
    if (isCurrentPlaying.value) {
      currentAudioElement.value?.pause()
      isCurrentPlaying.value = false
    }
    previewAudioElement.value?.play()
    isPreviewPlaying.value = true
  }
}

function onCurrentAudioEnded() {
  isCurrentPlaying.value = false
}

function onPreviewAudioEnded() {
  isPreviewPlaying.value = false
}

function submitForm() {
  // 先進行前端驗證（排除音頻檔案，因為它是可選的）
  const nameValidation = validationRules.required('發音名稱為必填欄位')(form.name)
  if (nameValidation) {
    errors.value.name = nameValidation
    touchField('name')
    return
  }

  processing.value = true
  networkError.value = null
  clearErrors()

  // 準備表單資料
  const formData = {
    name: form.name,
    _method: 'PUT',
  }

  // 如果有上傳新音頻，加入檔案名稱
  if (uploadedAudioFilename.value) {
    formData.audio_filename = uploadedAudioFilename.value
  }

  const updateUrl = `/fish/${props.fishId}/audio/${props.audio.id}`

  router.post(updateUrl, formData, {
    onSuccess: () => {
      retryAttempts.value = 0
      // 標記魚類資料需要更新（清除快取）
      markFishStale(props.fishId)
      emit('submitted')
    },
    onError: (errorResponse) => {
      handleSubmitError(errorResponse)
    },
    onFinish: () => {
      processing.value = false
    },
  })
}

function retrySubmit() {
  if (retryAttempts.value >= maxRetryAttempts) return

  retryAttempts.value++

  // 等待一段時間後重試
  setTimeout(() => {
    submitForm()
  }, 1000 * retryAttempts.value)
}

function handleSubmitError(errorResponse) {
  // 檢查是否為網路錯誤
  if (!navigator.onLine) {
    networkError.value = '無網路連線，請檢查網路狀態後重試'
  } else if (errorResponse.message && errorResponse.message.includes('timeout')) {
    networkError.value = '請求超時，請稍後再試'
  } else if (errorResponse.message && errorResponse.message.includes('500')) {
    networkError.value = '伺服器錯誤，請稍後再試'
  } else if (typeof errorResponse === 'object' && Object.keys(errorResponse).length > 0) {
    // 伺服器端驗證錯誤
    setServerErrors(errorResponse)
  } else {
    networkError.value = '提交失敗，請稍後再試'
  }
}

// 暴露 submitForm 方法和狀態給父元件
defineExpose({
  submitForm,
  canSubmit,
  uploading,
})
</script>
