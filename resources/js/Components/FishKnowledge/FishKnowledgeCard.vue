<template>
  <div class="bg-gray-50 rounded-lg p-4 border">
    <div class="flex justify-between items-start mb-2">
      <span
        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
      >
        {{ note.note_type || '一般知識' }}
      </span>

      <!-- 三點選單 -->
      <OverflowMenu
        v-if="!readonly"
        :apiUrl="`/fish/${fishId}/knowledge/${note.id}`"
        :fishId="fishId.toString()"
        :editUrl="`/fish/${fishId}/knowledge/${note.id}/edit`"
        @deleted="$emit('deleted')"
      />
    </div>

    <!-- 知識內容 -->
    <div class="mb-3">
      <p class="text-gray-800 text-sm leading-relaxed">{{ note.note }}</p>
    </div>

    <!-- 位置資訊 -->
    <div v-if="note.locate" class="mb-3">
      <span class="text-xs font-medium text-gray-500">位置</span>
      <p class="text-sm text-gray-700 mt-1">{{ note.locate }}</p>
    </div>

    <!-- 時間資訊 -->
    <div class="text-xs text-gray-400">記錄時間: {{ formatDateTime(note.created_at) }}</div>
  </div>
</template>

<script setup>
import OverflowMenu from '@/Components/UI/OverflowMenu.vue'
import { formatDateTime } from '@/utils/formatDate'

const props = defineProps({
  note: {
    type: Object,
    required: true,
  },
  fishId: {
    type: [Number, String],
    required: true,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['updated', 'deleted'])
</script>
