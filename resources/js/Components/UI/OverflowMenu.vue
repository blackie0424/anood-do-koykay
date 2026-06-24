<template>
  <div class="flex right-0 top-0 h-full rounded-lg p-2">
    <div class="relative overflow-menu">
      <button
        class="ml-2 text-gray-500 hover:text-gray-700 flex-shrink-0"
        title="更多操作"
        @click.stop="toggleMenu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <circle cx="12" cy="5" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="19" r="1" fill="currentColor" />
        </svg>
      </button>
      <div
        v-if="menuOpen"
        class="absolute right-0 mt-2 w-56 md:w-64 bg-white border rounded-lg shadow-lg z-[9999]"
      >
        <ul class="py-1">
          <li
            v-if="showEdit && enableEdit"
            @click="editData"
            class="px-4 py-2.5 hover:bg-gray-100 cursor-pointer text-base md:text-lg transition-colors"
          >
            編輯
          </li>
          <li v-if="enableSetAsDisplayImage">
            <button
              class="w-full text-left px-4 py-2.5 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg transition-colors flex items-center gap-2"
              :disabled="isDisplayImage || processing"
              @click="handleSetAsDisplayImage"
              :title="isDisplayImage ? '已為圖鑑主圖' : '設為圖鑑主圖'"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                />
              </svg>
              <span>{{ isDisplayImage ? '目前主圖' : '設為圖鑑主圖' }}</span>
            </button>
          </li>
          <li v-if="enableSetAsBase">
            <button
              class="w-full text-left px-4 py-2.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg transition-colors"
              :disabled="isBase || isPlaying || processing"
              @click="handleSetAsBase"
              :title="
                isBase
                  ? '已為基本發音'
                  : isPlaying
                    ? '目前檔案正在播放，無法指定'
                    : '指定為基本發音'
              "
            >
              指定為基本發音
            </button>
          </li>
          <li v-if="enableMergeFish" class="border-t border-gray-100">
            <button
              class="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-base md:text-lg transition-colors flex items-center gap-2"
              @click="handleMergeFish"
              :disabled="processing"
              title="合併重複的魚類資料"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              <span>合併重複魚類</span>
            </button>
          </li>
          <li v-if="showDelete" class="border-t border-gray-100 mt-1">
            <button
              class="w-full text-left px-4 py-2.5 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed text-red-600 text-base md:text-lg transition-colors"
              :disabled="isBase || isPlaying || processing || isDisplayImage"
              @click="deleteData"
              :title="getDeleteTitle()"
            >
              刪除
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { router } from '@inertiajs/vue3'
import axios from 'axios'
import { markFishDeleted } from '@/utils/fishListCache'

const menuOpen = ref(false)
const processing = ref(false)
const props = defineProps({
  apiUrl: { type: String, required: true },
  redirectUrl: { type: String, default: '' },
  fishId: { type: [String, Number], required: true },
  showEdit: { type: Boolean, default: true },
  showDelete: { type: Boolean, default: true },
  editUrl: { type: String, default: '' }, // 新增：外部可設定編輯連結
  // 可選：傳入當前 audio 物件（用於 set-as-base）
  audio: {
    type: Object,
    default: null,
  },
  // 標示該 audio 是否已是基本
  isBase: {
    type: Boolean,
    default: false,
  },
  // 標示該 audio 是否正在播放
  isPlaying: {
    type: Boolean,
    default: false,
  },
  // 是否顯示「指定為基本發音」選項（預設 false，不影響其他使用者）
  enableSetAsBase: {
    type: Boolean,
    default: false,
  },
  // 新增：是否顯示編輯選項（預設 true）
  enableEdit: {
    type: Boolean,
    default: true,
  },
  // 新增：是否當已為基本發音時禁止刪除（預設 false，保持相容性）
  disableDeleteWhenBase: {
    type: Boolean,
    default: false,
  },
  // 捕獲紀錄相關：是否啟用「設為圖鑑主圖」選項
  enableSetAsDisplayImage: {
    type: Boolean,
    default: false,
  },
  // 捕獲紀錄相關：是否已為圖鑑主圖
  isDisplayImage: {
    type: Boolean,
    default: false,
  },
  // 魚類合併：是否啟用「合併重複魚類」選項
  enableMergeFish: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['deleted', 'set-as-base', 'set-as-display-image', 'merge-fish'])

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function getDeleteTitle() {
  if (props.isDisplayImage) return '此捕獲紀錄為圖鑑主圖，無法刪除'
  if (props.disableDeleteWhenBase && props.isBase) return '此檔案已為基本發音，無法刪除'
  return '刪除'
}

// 編輯連結由外部設定，預設為 /fish/{fishId}/edit
function editData() {
  menuOpen.value = false
  const url = props.editUrl || `/fish/${props.fishId}/edit`
  router.visit(url)
}

/**
 * 指定為基本發音：用 Inertia.patch 更新 fish->audio_filename，成功後 emit 事件
 */
async function handleSetAsBase() {
  if (!props.audio || !props.fishId) return
  if (props.isBase || props.isPlaying || processing.value) return

  processing.value = true
  try {
    const filename = props.audio.name || props.audio.file_name || props.audio.filename || ''
    // 如果需要 API 前綴或不同路徑，請調整路徑；此處使用標準 web route
    await router.put(`/fish/${props.fishId}/audio/${props.audio.id}/set-base`, {
      audio_filename: filename,
    })

    emit('set-as-base')
    menuOpen.value = false
  } catch (err) {
    console.error('設定基本發音失敗：', err)
  } finally {
    processing.value = false
  }
}

/**
 * 設為圖鑑主圖
 */
function handleSetAsDisplayImage() {
  if (props.isDisplayImage || processing.value) return

  emit('set-as-display-image')
  menuOpen.value = false
}

/**
<
 * 合併魚類
 */
function handleMergeFish() {
  menuOpen.value = false
  router.visit(`/fish/${props.fishId}/merge`)
}

/**
 * 刪除：保留基本刪除流程（使用 axios 或 fetch），成功後 emit deleted
 */
async function deleteData() {
  menuOpen.value = false

  // 防護檢查：若設定不允許刪除基本發音則直接返回
  if (props.disableDeleteWhenBase && props.isBase) {
    alert('此檔案已為基本發音，無法刪除。')
    return
  }

  if (!confirm('確定要刪除此項目嗎？')) return

  processing.value = true

  // 檢查是否為刪除魚類本身（apiUrl 格式為 /fish/{id}）
  const isFishDeletion = /^\/fish\/\d+$/.test(props.apiUrl)

  // 重要：在發送請求前就標記為已刪除
  // 因為 Inertia 的 onSuccess 會在頁面導航完成後才執行，
  // 那時 Fishs 頁面的 restoreStateFromStorage 已經執行完畢了
  if (isFishDeletion && props.fishId) {
    markFishDeleted(props.fishId)
  }

  // 使用 Inertia DELETE 請求，後端會處理跳轉和訊息顯示
  // 移除 preserveScroll，讓後端的 redirect 能正常導向到列表頁
  router.delete(props.apiUrl, {
    onFinish: () => {
      processing.value = false
    },
  })
}

// 點擊外部自動關閉選單
function handleClickOutside(event) {
  if (!event.target.closest('.overflow-menu')) {
    menuOpen.value = false
  }
}
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* ...簡單樣式，可依專案風格調整... */
</style>
