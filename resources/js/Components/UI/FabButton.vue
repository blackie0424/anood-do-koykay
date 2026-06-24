<template>
  <div :class="['fixed z-[60] group', positionClass]">
    <button
      :class="[
        'flex items-center justify-center h-16 transition-all duration-300 shadow-lg font-bold',
        bgClass,
        hoverClass,
        textClass,
        'overflow-hidden',
        'px-6 w-auto rounded-full', // 直接展開
      ]"
      :title="title"
      @click="handleClick"
      style="min-width: 4rem"
    >
      <span class="text-2xl">{{ icon }}</span>
      <span class="ml-2 whitespace-nowrap transition-opacity duration-200 opacity-100">{{
        label
      }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, default: '新增' },
  icon: { type: String, default: '+' },
  title: { type: String, default: '新增' },
  to: { type: String, default: '' },
  bgClass: { type: String, default: 'bg-green-600' },
  hoverClass: { type: String, default: 'hover:bg-green-700' },
  textClass: { type: String, default: 'text-white' },
  position: {
    type: String,
    default: 'right-bottom', // 'left-top', 'right-top', 'left-bottom', 'right-bottom'
    validator: (v) => ['left-top', 'right-top', 'left-bottom', 'right-bottom'].includes(v),
  },
})

const emit = defineEmits(['click'])

function handleClick() {
  if (props.to) {
    window.location.href = props.to
  } else {
    emit('click')
  }
}

const positionClass = computed(() => {
  switch (props.position) {
    case 'left-top':
      return 'left-6 top-6'
    case 'right-top':
      return 'right-6 top-6'
    case 'left-bottom':
      return 'left-6 bottom-20' // 調整為 bottom-20 避免被 BottomNavBar 遮蓋
    case 'right-bottom':
      return 'right-6 bottom-20' // 調整為 bottom-20 避免被 BottomNavBar 遮蓋
    default:
      return 'right-6 bottom-20'
  }
})
</script>
