<template>
  <div>
    <div v-if="loading" class="flex justify-center items-center my-8">
      <svg
        v-if="showSpinner"
        class="animate-spin h-8 w-8"
        :class="spinnerClass"
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
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
      <span class="ml-3" :class="textClass">{{ loadingText }}</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  loading: Boolean,
  error: Boolean,
  type: { type: String, default: 'text' }, // 'image' or 'text'
  loadingText: { type: String, default: '載入中...' },
  errorText: String,
  showSpinner: { type: Boolean, default: true },
  spinnerClass: { type: String, default: 'text-yellow-500' },
  textClass: { type: String, default: 'text-yellow-600' },
})
</script>
