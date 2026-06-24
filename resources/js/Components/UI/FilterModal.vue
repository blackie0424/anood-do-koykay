<template>
  <transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-40 flex items-start justify-center bg-black/30"
      @click.self="close"
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-lg shadow-lg mt-16 p-4 w-full max-w-xl relative border border-gray-200 dark:border-gray-700"
      >
        <!-- 關閉按鈕 -->
        <button
          class="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full p-3 shadow-lg transition text-2xl flex items-center justify-center"
          style="width: 48px; height: 48px"
          @click="close"
          aria-label="關閉篩選"
        >
          <svg
            class="w-7 h-7"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            viewBox="0 0 24 24"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div class="text-gray-800 dark:text-gray-100">
          <FilterPanel
            :filters="filters"
            :tribes="tribes"
            :food-categories="foodCategories"
            :processing-methods="processingMethods"
            :capture-methods="captureMethods"
            @filters-change="forwardFiltersChange"
          />
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import FilterPanel from '@/Components/UI/FilterPanel.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  filters: { type: Object, default: () => ({}) },
  tribes: { type: Array, default: () => [] },
  foodCategories: { type: Array, default: () => [] },
  processingMethods: { type: Array, default: () => [] },
  captureMethods: { type: Array, default: () => [] },
})

const emit = defineEmits(['close', 'filters-change'])

const close = () => emit('close')
const forwardFiltersChange = (newFilters) => emit('filters-change', newFilters)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
