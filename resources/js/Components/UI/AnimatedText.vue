<template>
  <h1 ref="containerRef" :style="{ fontSize: `${dynamicFontSize}px` }" class="flex justify-center transition-all duration-300">
    <span
      v-for="(char, idx) in textArr"
      :key="idx"
      :style="{ animationDelay: `${idx * 0.08}s`, marginRight: '0.1em' }"
      class="animate-outline-fill"
    >
      {{ char }}
    </span>
  </h1>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  text: String,
  fontSize: { type: Number, default: 48 },
})

const textArr = computed(() => props.text.split(''))
const containerRef = ref(null)
const dynamicFontSize = ref(props.fontSize)

const updateFontSize = () => {
  // 取得視窗寬度
  const windowWidth = window.innerWidth
  
  // 計算基礎寬度限制 (左右預留一些邊距)
  const availableWidth = windowWidth - 32 
  
  // 估算每個字元在 1px 字體大小時的寬度係數 (約 0.6) + 間距 (0.1em)
  // 如果字數很多，係數需要更保守
  const charFactor = 0.7 
  const totalChars = props.text.length
  
  // 計算理論上的最大字體大小
  // availableWidth = fontSize * charFactor * totalChars
  // fontSize = availableWidth / (charFactor * totalChars)
  const calculatedSize = availableWidth / (totalChars * charFactor)
  
  // 限制字體大小範圍：最小 14px，最大為傳入的 props.fontSize (48px)
  dynamicFontSize.value = Math.min(Math.max(calculatedSize, 14), props.fontSize)
}

onMounted(() => {
  updateFontSize()
  window.addEventListener('resize', updateFontSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateFontSize)
})
</script>

<style scoped>
@keyframes outline-fill {
  0% {
    color: transparent;
    -webkit-text-stroke: 2px #fff;
    text-stroke: 2px #fff;
    background: transparent;
    opacity: 1;
  }
  60% {
    color: transparent;
    -webkit-text-stroke: 2px #0e171b;
    text-stroke: 2px #0e171b;
    background: transparent;
    opacity: 1;
  }
  100% {
    color: #0e171b;
    -webkit-text-stroke: 0px #0e171b;
    text-stroke: 0px #0e171b;
    background: transparent;
    opacity: 1;
  }
}
.animate-outline-fill {
  display: inline-block;
  opacity: 1;
  color: transparent;
  background: transparent;
  -webkit-text-stroke: 2px #fff;
  animation: outline-fill 1s forwards;
  animation-fill-mode: forwards;
  margin-right: 0.1em; /* 統一間距 */
}

/* 移除之前的 CSS Override，完全交由 JS 控制 */
</style>
