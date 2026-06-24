<template>
  <div class="bg-white rounded-lg shadow-md overflow-visible relative">
    <!-- 捕獲照片 -->
    <div class="aspect-w-16 aspect-h-12 bg-gray-100 relative overflow-hidden rounded-t-lg">
      <LazyImage
        :src="recordImageUrl"
        :alt="`${record.tribe} 捕獲紀錄`"
        wrapperClass="w-full h-48 bg-gray-100"
        imgClass="w-full h-full object-cover"
      />

      <!-- 當前主圖標記 -->
      <div
        v-if="isDisplayImage"
        class="absolute top-2 left-2 bg-yellow-500 text-white px-3 py-1 rounded-full flex items-center gap-1 text-lg font-bold shadow-lg"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
        <span>圖鑑主圖</span>
      </div>
    </div>

    <!-- 紀錄資訊 -->
    <div class="p-4">
      <!-- 部落標籤和選單 -->
      <div class="flex items-center mb-1">
        <div class="flex items-center space-x-2 flex-1 min-w-0">
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-base md:text-lg font-medium bg-green-100 text-green-800 truncate"
          >
            {{ record.capture_method }}
          </span>
        </div>

        <!-- 三點選單：靠右 -->
        <div class="ml-2 flex-shrink-0">
          <OverflowMenu
            :apiUrl="`/fish/${fishId}/capture-records/${record.id}`"
            :fishId="fishId.toString()"
            :editUrl="`/fish/${fishId}/capture-records/${record.id}/edit`"
            :enableSetAsDisplayImage="true"
            :isDisplayImage="isDisplayImage"
            @deleted="$emit('deleted')"
            @set-as-display-image="setAsDisplayImage"
          />
        </div>
      </div>
      <div class="mb-1">
        <span
          class="inline-flex items-center px-3 py-1 rounded-full text-base md:text-lg font-medium bg-blue-100 text-blue-800 truncate"
        >
          {{ displayLabel }}
        </span>
      </div>

      <!-- 備註 -->
      <div v-if="record.notes" class="mb-1">
        <span class="text-lg md:text-xl font-medium text-gray-800 break-words"
          >備註：{{ record.notes }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import LazyImage from '@/Components/UI/LazyImage.vue'
import OverflowMenu from '@/Components/UI/OverflowMenu.vue'
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import { markFishStale } from '@/utils/fishListCache'
import { formatDate, formatDateTime } from '@/utils/formatDate'

const props = defineProps({
  record: Object,
  fishId: Number,
  displayCaptureRecordId: Number, // 當前設定為圖鑑主圖的捕獲紀錄 ID
})

const emit = defineEmits(['updated', 'deleted'])

const isUpdating = ref(false)

// 判斷此捕獲紀錄是否為當前圖鑑主圖
const isDisplayImage = computed(() => {
  return props.displayCaptureRecordId === props.record.id
})

// 設定為圖鑑主圖
function setAsDisplayImage() {
  if (isUpdating.value) return

  isUpdating.value = true

  router.put(
    `/fish/${props.fishId}/display-image`,
    { capture_record_id: props.record.id },
    {
      preserveScroll: true,
      onSuccess: () => {
        // 標記此魚類需要在 Fishs 頁面更新（因為主圖改變）
        markFishStale(props.fishId)
        emit('updated')
      },
      onError: (errors) => {
        console.error('設定圖鑑主圖失敗:', errors)
        alert('設定失敗，請稍後再試')
      },
      onFinish: () => {
        isUpdating.value = false
      },
    }
  )
}

// 處理捕獲紀錄圖片 URL
const recordImageUrl = computed(() => {
  // 使用後端已經處理好的 image_url 屬性
  return props.record.image_url || '/images/default-capture.png'
})

// 顯示標籤：若 location 為空則只顯示 tribe
const displayLabel = computed(() => {
  const loc = (props.record.location || '').toString().trim()
  return loc ? `${props.record.tribe} => ${loc}` : props.record.tribe
})
</script>
