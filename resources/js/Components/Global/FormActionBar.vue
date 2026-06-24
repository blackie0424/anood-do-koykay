<template>
  <div
    class="fixed top-0 left-0 w-full flex justify-between items-center px-2 py-2 bg-white z-20 shadow"
  >
    <button
      type="button"
      class="bg-gray-400 text-white px-3 py-2 rounded-full flex items-center justify-center hover:bg-gray-500 transition"
      @click="goBack"
      aria-label="關閉"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>

    <div class="text-center flex-1">
      <div class="text-lg font-semibold text-[#0e171b]">{{ fishTitle || title }}</div>
      <div v-if="steps && steps.length" class="text-lg text-red-500">{{ currentStepText }}</div>
    </div>

    <div class="w-auto">
      <button
        v-if="showSubmit"
        type="button"
        class="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition flex items-center justify-center w-full"
        :disabled="submitting || showLoading"
        @click="submitNote"
      >
        <span v-if="showLoading" class="mr-2">
          <svg class="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
              fill="none"
            />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </span>
        {{ submitLabel || '送出' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  goBack: { type: Function, required: true },
  submitNote: { type: Function, default: () => {} },
  showSubmit: { type: Boolean, default: true },
  submitting: { type: Boolean, default: false },
  showLoading: { type: Boolean, default: false },
  submitLabel: { type: String, default: '送出' },
  title: { type: String, default: '請新增標題' },
  steps: { type: Array, default: null },
  currentStep: { type: Number, default: null },
  fishName: { type: String, default: null },
})

const fishTitle = computed(() =>
  props.fishName ? `正在為 ${props.fishName} 新增捕獲紀錄` : props.title
)

const currentStepText = computed(() => {
  if (!props.steps || !props.steps.length) return ''
  const idx = Math.max(0, Math.min((props.currentStep || 1) - 1, props.steps.length - 1))
  return props.steps[idx] || ''
})
</script>