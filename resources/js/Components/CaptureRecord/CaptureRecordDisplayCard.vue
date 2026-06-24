<template>
  <div
    class="rounded-xl border-2 overflow-hidden"
    :class="index % 2 === 0 ? 'bg-white border-teal-200' : 'bg-slate-50 border-slate-200'"
  >
    <!-- 卡片標題區：編號 -->
    <div
      class="px-4 py-3 flex items-center justify-between"
      :class="
        index % 2 === 0
          ? 'bg-teal-50 border-b border-teal-100'
          : 'bg-slate-100 border-b border-slate-200'
      "
    >
      <div class="flex items-center gap-3">
        <span
          class="inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-lg"
          :class="index % 2 === 0 ? 'bg-teal-500' : 'bg-slate-500'"
        >
          {{ index + 1 }}
        </span>
        <span class="text-lg font-semibold text-gray-800">第 {{ index + 1 }} 筆紀錄</span>
      </div>
    </div>

    <!-- 卡片內容區 -->
    <div class="p-4 flex flex-col gap-4">
      <!-- 捕獲時間 -->
      <div v-if="record.capture_date" class="flex items-center text-base text-gray-900 font-medium">
        <span class="text-gray-600 mr-2">📅</span>
        捕獲時間：{{ formatDate(record.capture_date) }}
      </div>

      <!-- 捕獲地點 -->
      <div
        v-if="record.location"
        class="flex flex-wrap items-center text-base text-gray-900 font-medium gap-1"
      >
        <span class="text-gray-600 mr-1">📍</span>
        捕獲地點：
        <span v-if="record.tribe" class="bg-gray-200 text-sm px-2 py-0.5 rounded">{{
          record.tribe
        }}</span>
        <span class="break-all">{{ record.location }}</span>
      </div>

      <!-- 捕獲方式 -->
      <div
        v-if="record.capture_method"
        class="flex items-center text-base text-gray-900 font-medium"
      >
        <span class="text-gray-600 mr-2">🎣</span>
        捕獲方式：{{ record.capture_method }}
      </div>

      <!-- 捕獲照片 -->
      <LazyImage
        :src="record.image_url"
        :alt="`${fishName} 捕獲紀錄 ${index + 1}`"
        class="w-full h-auto object-cover rounded-lg shadow-sm border border-gray-200"
      />

      <!-- 捕獲說明 -->
      <div v-if="record.notes" class="bg-amber-50 rounded-lg p-4 border border-amber-200">
        <div class="flex items-start gap-2">
          <span class="text-amber-600 text-lg leading-none mt-0.5">📝</span>
          <div>
            <span class="text-base font-medium text-amber-800 block mb-1">捕獲說明</span>
            <p class="text-base text-gray-800 leading-relaxed whitespace-pre-line break-words">
              {{ record.notes }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import LazyImage from '@/Components/UI/LazyImage.vue'
import { formatDate } from '@/utils/formatDate'

defineProps({
  record: { type: Object, required: true },
  index: { type: Number, required: true },
  fishName: { type: String, default: '' },
})
</script>
