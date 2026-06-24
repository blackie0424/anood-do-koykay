<template>
  <div class="bg-white rounded-lg shadow-md p-4">
    <div class="flex justify-between items-start">
      <div class="flex-1">
        <!-- 部落標籤 -->
        <div class="flex items-center justify-between mb-3">
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
          >
            {{ classification.tribe }}
          </span>
        </div>

        <!-- 分類資訊 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 class="text-sm font-medium text-gray-700 mb-1">飲食分類</h4>
            <p class="text-lg text-gray-900">
              {{ classification.food_category || '尚未紀錄' }}
            </p>
          </div>
          <div>
            <h4 class="text-sm font-medium text-gray-700 mb-1">處理方式</h4>
            <p class="text-lg text-gray-900">
              {{ classification.processing_method || '尚未紀錄' }}
            </p>
          </div>
        </div>

        <!-- 調查備註 -->
        <div v-if="classification.notes" class="mb-4">
          <h4 class="text-sm font-medium text-gray-700 mb-2">調查備註</h4>
          <div class="bg-gray-50 rounded-lg p-3">
            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ classification.notes }}</p>
          </div>
        </div>

        <!-- 時間資訊 -->
        <div class="flex flex-wrap gap-4 text-xs text-gray-500">
          <span>建立時間: {{ formatDateTime(classification.created_at) }}</span>
          <span v-if="classification.updated_at !== classification.created_at">
            更新時間: {{ formatDateTime(classification.updated_at) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatDateTime } from '@/utils/formatDate'

const props = defineProps({
  classification: Object,
  fishId: Number,
})

const emit = defineEmits(['updated', 'deleted'])
</script>
