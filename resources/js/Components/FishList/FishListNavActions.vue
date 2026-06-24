<template>
  <!-- desktop variant -->
  <div v-if="variant === 'desktop'" class="flex items-center justify-end w-full px-4 h-10 gap-6">
    <div class="flex items-center gap-3">
      <Link
        v-if="user"
        href="/fish/batch-create"
        class="hidden md:inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-teal-600 text-white hover:bg-teal-700 shadow-md transition-all hover:scale-105 font-bold text-lg tracking-wide"
        title="新增魚類"
      >
        <span class="mr-1 text-2xl leading-none font-normal pb-1">+</span> 新增
      </Link>
      <SearchToggleButton @toggle="$emit('toggle')" />
    </div>
  </div>

  <!-- mobile variant -->
  <div v-else-if="variant === 'mobile'" class="flex items-center justify-end px-2 w-full">
    <div class="flex items-center gap-3">
      <Link
        v-if="user"
        href="/fish/batch-create"
        class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-teal-600 text-white hover:bg-teal-700 shadow-md border border-white/20"
        title="新增魚類"
      >
        <span class="text-2xl leading-none font-light pb-0.5">+</span>
      </Link>
      <SearchToggleButton @toggle="$emit('toggle')" />
    </div>
  </div>
</template>

<script setup>
import { Link } from '@inertiajs/vue3'
import SearchToggleButton from '@/Components/UI/SearchToggleButton.vue'

defineProps({
  variant: {
    type: String,
    required: true,
    validator: (v) => ['desktop', 'mobile'].includes(v),
  },
  user: {
    type: Object,
    default: null,
  },
})

defineEmits(['toggle'])
</script>
