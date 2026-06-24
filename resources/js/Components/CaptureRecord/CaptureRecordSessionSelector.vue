<template>
  <div class="mb-4">
    <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
      選擇過去的捕獲資訊，或手動填寫
    </p>
    <div class="flex flex-col gap-2">
      <button
        v-for="session in sessions"
        :key="`${session.capture_date}-${session.tribe}-${session.location}-${session.capture_method}`"
        data-testid="session-option"
        type="button"
        class="w-full rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-left text-sm text-blue-800 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/50"
        @click="$emit('select', session)"
      >
        <span class="font-medium">{{ session.capture_date }}</span>
        &nbsp;·&nbsp;{{ session.tribe }} &nbsp;·&nbsp;{{ session.location }} &nbsp;·&nbsp;{{
          session.capture_method
        }}
        <span class="ml-1 text-xs text-blue-600 dark:text-blue-400"
          >({{ session.record_count }} 筆)</span
        >
      </button>

      <button
        data-testid="manual-option"
        type="button"
        class="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        @click="$emit('select', null)"
      >
        手動填寫
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  sessions: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['select'])
</script>
