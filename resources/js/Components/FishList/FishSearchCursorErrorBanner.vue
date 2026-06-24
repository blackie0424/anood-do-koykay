<template>
  <div v-if="show" class="fixed bottom-16 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded shadow-lg"
       role="alert" aria-live="assertive">
    <span>游標無效，請重新整理或重啟搜尋。</span>
    <button class="ml-3 underline" @click="$emit('retry')">重新嘗試</button>
  </div>
</template>

<script setup>
const props = defineProps({
  show: { type: Boolean, default: false }
})
</script>
