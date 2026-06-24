<template>
  <div class="space-y-8 md:space-y-10 w-full">
    
    <!-- 頂部：核心識別 -->
    <div v-if="!hideTop" :class="[
      'w-full',
      hideTopOnMobile ? 'hidden lg:block' : ''
    ]">
      <section>
        <FishDetailTop :fish="fish" />
      </section>
      <!-- 頂部額外內容插槽 - 由頁面自行決定要顯示什麼 -->
      <div v-if="$slots['top-extra']" class="mt-6">
        <slot name="top-extra" />
      </div>
    </div>

    <!-- 中部：主要內容 -->
    <div v-if="$slots['middle']" class="w-full">
      <slot name="middle" />
    </div>

    <!-- 底部：次要內容 -->
    <div v-if="$slots['bottom']" class="w-full">
      <slot name="bottom" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import FishDetailTop from '@/Components/FishDetail/FishDetailTop.vue'

// 從 Inertia page props 取得資料
const page = usePage()
const fish = computed(() => page.props.fish)

// Props 定義
defineProps({
  hideTopOnMobile: {
    type: Boolean,
    default: false
  },
  hideTop: {
    type: Boolean,
    default: false
  }
})
</script>
