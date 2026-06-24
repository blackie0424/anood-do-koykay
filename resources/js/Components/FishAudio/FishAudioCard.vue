<template>
  <div
    class="bg-white rounded-lg p-4 shadow-sm flex flex-col gap-2 transition"
    :class="isBase ? 'border-2 border-green-200 ring-1 ring-green-100' : ''"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h4 class="font-medium text-lg">{{ audio.file_name }}</h4>

        <!-- 基本資料頁面的聲音檔案 標籤 -->
        <span
          v-if="isBase"
          class="text-md bg-green-100 text-green-800 px-2 py-0.5 rounded-md flex items-center gap-1"
          title="此檔案為目前魚種基本資料所使用的發音檔"
          aria-hidden="false"
          role="status"
        >
          <!-- 簡單圖示與文字 -->
          <svg
            class="w-3 h-3"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16z" fill="#DCFCE7" />
            <path
              d="M7.5 10.5l1.5 1.5 3.5-4"
              stroke="#16A34A"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          目前基本資料頁面的聲音檔案
        </span>
      </div>

      <div class="flex items-center gap-2">
        <!-- 將客製選項與狀態傳入 OverflowMenu，不改變預設行為 -->
        <OverflowMenu
          :apiUrl="`/fish/${fishId}/audio/${audio.id}`"
          :fishId="fishId.toString()"
          :editUrl="`/fish/${fishId}/audio/${audio.id}/edit`"
          :audio="audio"
          :is-base="isBase"
          :is-playing="currentAudioIsPlaying"
          :enable-set-as-base="enableCustomOption"
          :enable-edit="enableEdit"
          @deleted="$emit('deleted')"
          @set-as-base="$emit('updated')"
        />
      </div>
    </div>

    <!-- 音頻播放控制 -->
    <div class="flex items-center gap-3 mb-3">
      <button
        @click="togglePlay"
        :disabled="playbackState.error && currentAudioId === audio.id"
        :class="[
          'flex items-center justify-center w-12 h-12 rounded-full transition-colors',
          playbackState.error && currentAudioId === audio.id
            ? 'bg-gray-400 cursor-not-allowed text-white'
            : currentAudioIsPlaying
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : currentAudioIsPaused
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white',
        ]"
        :title="getButtonTitle()"
      >
        <!-- 播放圖示 -->
        <svg
          v-if="!currentAudioIsPlaying && !currentAudioIsPaused"
          class="w-5 h-5 ml-0.5"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        <!-- 暫停圖示 -->
        <svg
          v-else-if="currentAudioIsPlaying"
          class="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M6 6h4v12H6zm8-6v12h4V6h-4z" />
        </svg>
        <!-- 恢復播放圖示 -->
        <svg
          v-else-if="currentAudioIsPaused"
          class="w-5 h-5 ml-0.5"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        <!-- 錯誤圖示 -->
        <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          />
        </svg>
      </button>

      <div class="flex-1">
        <div class="text-lg font-medium text-gray-800">{{ audio.name }}</div>
        <div class="text-md text-gray-500">
          {{ getStatusText() }}
        </div>
        <!-- 播放進度 -->
        <div v-if="currentAudioId === audio.id && playbackState.duration > 0" class="mt-1">
          <div class="flex items-center gap-2 text-md text-gray-400">
            <span>{{ formatTime(playbackState.currentTime) }}</span>
            <div class="flex-1 bg-gray-200 rounded-full h-1">
              <div
                class="bg-blue-500 h-1 rounded-full transition-all duration-300"
                :style="{ width: `${(playbackState.currentTime / playbackState.duration) * 100}%` }"
              ></div>
            </div>
            <span>{{ formatTime(playbackState.duration) }}</span>
          </div>
        </div>
      </div>

      <!-- 播放狀態指示器 -->
      <div v-if="currentAudioIsPlaying" class="flex items-center space-x-1">
        <div class="w-1 h-4 bg-blue-500 rounded animate-pulse"></div>
        <div class="w-1 h-6 bg-blue-500 rounded animate-pulse" style="animation-delay: 0.1s"></div>
        <div class="w-1 h-4 bg-blue-500 rounded animate-pulse" style="animation-delay: 0.2s"></div>
      </div>

      <!-- 暫停狀態指示器 -->
      <div v-else-if="currentAudioIsPaused" class="flex items-center">
        <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
      </div>

      <!-- 錯誤狀態指示器 -->
      <div v-else-if="playbackState.error && currentAudioId === audio.id" class="flex items-center">
        <div class="w-2 h-2 bg-red-500 rounded-full"></div>
      </div>
    </div>

    <!-- 錯誤訊息 -->
    <div
      v-if="playbackState.error && currentAudioId === audio.id"
      class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg"
    >
      <div class="flex items-start gap-2">
        <svg
          class="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0"
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
          <p class="text-lg font-medium text-red-800">音頻播放失敗</p>
          <p class="text-md text-red-600 mt-1">{{ getErrorMessage(playbackState.error) }}</p>
          <div class="flex gap-2 mt-2">
            <button
              @click="retryPlay"
              class="text-md bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
              :disabled="retryAttempts >= maxRetryAttempts"
            >
              {{
                retryAttempts >= maxRetryAttempts
                  ? '已達重試上限'
                  : `重試 (${retryAttempts}/${maxRetryAttempts})`
              }}
            </button>
            <button
              @click="dismissError"
              class="text-md text-red-600 hover:text-red-800 px-2 py-1 transition-colors"
            >
              忽略
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 隱藏的音頻元素 -->
    <audio ref="audioElement" :src="audioUrl" preload="none" crossorigin="anonymous"></audio>
  </div>
</template>

<script setup>
import OverflowMenu from '@/Components/UI/OverflowMenu.vue'
import audioPlayerService from '@/services/AudioPlayerService.js'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { formatDateTime } from '@/utils/formatDate.js'

const props = defineProps({
  audio: Object,
  fishId: [Number, String],
  // 新增：由父層決定是否開啟此元件的客製選項（預設關閉）
  isBase: {
    type: Boolean,
    default: false,
  },
  enableCustomOption: {
    type: Boolean,
    default: false,
  },
  // 新增：是否顯示編輯功能（預設 true，不變更既有頁面）
  enableEdit: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['updated', 'deleted'])

const audioElement = ref(null)

// 錯誤處理狀態
const retryAttempts = ref(0)
const maxRetryAttempts = 3
const networkRetryDelay = ref(1000) // 初始重試延遲 1 秒

// 從 AudioPlayerService 獲取播放狀態
const currentAudioId = computed(() => audioPlayerService.currentPlayingId.value)
const playbackState = computed(() => audioPlayerService.playbackState)

// 計算當前音頻的播放狀態
const currentAudioIsPlaying = computed(() => audioPlayerService.isPlaying(props.audio.id))

const currentAudioIsPaused = computed(() => audioPlayerService.isPaused(props.audio.id))

// 計算音頻 URL
const audioUrl = computed(() => {
  // 優先使用後端提供的 URL
  if (props.audio.url) {
    return props.audio.url
  }

  // 如果沒有 URL 但有 locate，則手動構建
  if (props.audio.locate) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_STORAGE_URL
    const bucket = import.meta.env.VITE_SUPABASE_BUCKET
    return `${supabaseUrl}/object/public/${bucket}/audio/${props.audio.locate}`
  }

  return null
})

// 組件掛載時設置事件監聽器
onMounted(() => {
  // 監聽播放服務事件
  audioPlayerService.on('error', handleAudioServiceError)
  audioPlayerService.on('ended', handleAudioServiceEnded)
})

// 組件卸載時清理事件監聽器
onUnmounted(() => {
  audioPlayerService.off('error', handleAudioServiceError)
  audioPlayerService.off('ended', handleAudioServiceEnded)
})

/**
 * 切換播放狀態
 */
async function togglePlay() {
  if (!audioUrl.value) {
    console.warn('音頻 URL 不存在')
    return
  }

  if (!audioElement.value) {
    console.warn('音頻元素不存在')
    return
  }

  try {
    await audioPlayerService.play(props.audio.id, audioElement.value, audioUrl.value)
  } catch (error) {
    console.error('播放音頻失敗:', error)
  }
}

/**
 * 重試播放
 */
async function retryPlay() {
  if (!audioUrl.value || !audioElement.value || retryAttempts.value >= maxRetryAttempts) return

  retryAttempts.value++

  try {
    // 等待一段時間後重試，使用指數退避策略
    await new Promise((resolve) =>
      setTimeout(resolve, networkRetryDelay.value * retryAttempts.value)
    )

    // 重置錯誤狀態
    audioPlayerService.playbackState.error = null
    await audioPlayerService.play(props.audio.id, audioElement.value, audioUrl.value)

    // 重試成功，重置計數器
    retryAttempts.value = 0
  } catch (error) {
    console.error(`重試播放失敗 (第 ${retryAttempts.value} 次):`, error)

    if (retryAttempts.value >= maxRetryAttempts) {
      console.error('已達最大重試次數，停止重試')
    }
  }
}

/**
 * 忽略錯誤
 */
function dismissError() {
  audioPlayerService.playbackState.error = null
  retryAttempts.value = 0
}

/**
 * 獲取友善的錯誤訊息
 */
function getErrorMessage(error) {
  if (!error) return ''

  const errorMessages = {
    NotSupportedError: '瀏覽器不支援此音頻格式',
    NotAllowedError: '瀏覽器阻止了音頻播放，請先與頁面互動',
    AbortError: '音頻載入被中斷',
    NetworkError: '網路連線問題，請檢查網路狀態',
    DecodeError: '音頻檔案損壞或格式錯誤',
    '音頻 URL 不存在': '音頻檔案路徑錯誤',
    瀏覽器不支援此音頻格式或來源: '請嘗試使用其他瀏覽器或更新瀏覽器版本',
  }

  // 檢查是否有匹配的錯誤訊息
  for (const [key, message] of Object.entries(errorMessages)) {
    if (error.includes(key)) {
      return message
    }
  }

  // 如果沒有匹配的錯誤訊息，返回原始錯誤
  return error
}

/**
 * 處理音頻服務錯誤事件
 */
function handleAudioServiceError(data) {
  if (data.audioId === props.audio.id) {
    console.error(`音頻 ${props.audio.id} 播放錯誤:`, data.error)
  }
}

/**
 * 處理音頻服務播放結束事件
 */
function handleAudioServiceEnded(data) {
  if (data.audioId === props.audio.id) {
    console.log(`音頻 ${props.audio.id} 播放結束`)
  }
}

/**
 * 獲取按鈕標題
 */
function getButtonTitle() {
  if (playbackState.value.error && currentAudioId.value === props.audio.id) {
    return '播放失敗，點擊重試'
  }

  if (currentAudioIsPlaying.value) {
    return '暫停播放'
  }

  if (currentAudioIsPaused.value) {
    return '恢復播放'
  }

  return '播放音頻'
}

/**
 * 獲取狀態文字
 */
function getStatusText() {
  if (playbackState.value.error && currentAudioId.value === props.audio.id) {
    return '播放失敗'
  }

  if (currentAudioIsPlaying.value) {
    return '正在播放...'
  }

  if (currentAudioIsPaused.value) {
    return '已暫停'
  }

  return '點擊播放'
}

/**
 * 格式化時間
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
</script>

<style scoped>
/* 可選：微調基本發音強調樣式 */
</style>
