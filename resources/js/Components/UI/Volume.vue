<template>
  <span
    :class="[
      'inline-flex items-center justify-center rounded-full ml-2',
      shouldEnableAnimations ? 'transition-colors duration-200' : '',
      optimizedButtonClasses,
    ]"
    style="width: 2.2rem; height: 2.2rem"
    @click="handleClick"
    :disabled="isPlaying"
    :title="buttonTitle"
    role="button"
    :aria-label="buttonTitle"
    :aria-disabled="isPlaying"
    tabindex="0"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <!-- 播放圖示 (預設狀態) -->
    <svg
      v-if="playbackState === 'idle'"
      class="w-5 h-5 text-gray-600"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>

    <!-- 播放中圖示 -->
    <svg
      v-else-if="playbackState === 'playing'"
      class="w-5 h-5 text-white"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
      />
    </svg>

    <!-- 重試中圖示 -->
    <svg
      v-else-if="playbackState === 'retrying'"
      class="w-5 h-5 text-white animate-spin"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
      />
    </svg>

    <!-- 錯誤圖示 -->
    <svg
      v-else-if="playbackState === 'error'"
      class="w-5 h-5 text-white"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-2h-2v2zm0-4h2V7h-2v6z"
      />
    </svg>
  </span>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAudioPlayback } from '@/composables/useAudioPlayback.js'
import animationOptimizer from '@/utils/AnimationOptimizer.js'

const props = defineProps({
  audioUrl: {
    type: String,
    required: true,
  },
  audioId: {
    type: [String, Number],
    default: null,
  },
})

// 使用音頻播放組合式函數
const {
  playbackState,
  buttonClasses,
  buttonTitle,
  isPlaying,
  hasError,
  isClickable,
  isRetrying,
  canRetry,
  retryProgress,
  error,
  retryCount,
  maxRetries,
  handleClick,
} = useAudioPlayback(props.audioUrl, props.audioId)

// 優化的按鈕類別
const optimizedButtonClasses = computed(() => {
  const baseClasses = buttonClasses.value
  const optimizationLevel = animationOptimizer.optimizationLevel

  // 根據優化等級調整類別
  if (optimizationLevel === 'aggressive') {
    return baseClasses.replace(/transition-|animate-|duration-/g, '')
  }

  return baseClasses
})

// 檢查是否應該啟用動畫
const shouldEnableAnimations = computed(() => {
  return animationOptimizer.shouldEnableAnimation('transition')
})

onMounted(() => {
  animationOptimizer.init()
})
</script>
<style scoped>
/* 性能優化的基礎按鈕樣式 */
.volume-button {
  /* 使用 GPU 加速的過渡效果 */
  transition:
    transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
    background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1);

  /* 啟用硬體加速 */
  will-change: transform, background-color, box-shadow;

  /* 優化渲染性能 */
  backface-visibility: hidden;
  transform: translateZ(0);
}

/* 預設狀態樣式 - 優化版本 */
.volume-button--idle {
  @apply bg-gray-200 hover:bg-gray-300 cursor-pointer;

  /* 使用 transform3d 以啟用 GPU 加速 */
  transform: translate3d(0, 0, 0) scale(1);
}

.volume-button--idle:hover {
  transform: translate3d(0, 0, 0) scale(1.05);
  /* 添加微妙的陰影效果 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.volume-button--idle:active {
  transform: translate3d(0, 0, 0) scale(0.95);
  transition-duration: 0.1s;
}

/* 播放中狀態樣式 - 優化版本 */
.volume-button--playing {
  @apply bg-blue-500 cursor-not-allowed;

  /* 使用 GPU 加速的陰影動畫 */
  box-shadow:
    0 0 0 2px rgba(59, 130, 246, 0.3),
    0 4px 12px rgba(59, 130, 246, 0.2);

  transform: translate3d(0, 0, 0) scale(1);

  /* 添加微妙的脈衝效果 */
  animation: playing-pulse 2s ease-in-out infinite;
}

.volume-button--playing:hover {
  @apply bg-blue-500;
  transform: translate3d(0, 0, 0) scale(1);
}

/* 重試中狀態樣式 - 優化版本 */
.volume-button--retrying {
  @apply bg-yellow-500 cursor-not-allowed;

  transform: translate3d(0, 0, 0) scale(1);
  animation: retry-pulse 1.2s ease-in-out infinite;
}

.volume-button--retrying:hover {
  @apply bg-yellow-500;
  transform: translate3d(0, 0, 0) scale(1);
}

/* 錯誤狀態樣式 - 優化版本 */
.volume-button--error {
  @apply bg-red-500 hover:bg-red-600 cursor-pointer;

  transform: translate3d(0, 0, 0) scale(1);
  animation: error-pulse 2s ease-in-out infinite;
}

.volume-button--error:hover {
  transform: translate3d(0, 0, 0) scale(1.05);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.volume-button--error:active {
  transform: translate3d(0, 0, 0) scale(0.95);
  transition-duration: 0.1s;
}

/* 優化的動畫效果 */
@keyframes playing-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 2px rgba(59, 130, 246, 0.3),
      0 4px 12px rgba(59, 130, 246, 0.2);
  }
  50% {
    box-shadow:
      0 0 0 4px rgba(59, 130, 246, 0.2),
      0 6px 16px rgba(59, 130, 246, 0.15);
  }
}

@keyframes retry-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4);
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(234, 179, 8, 0.1);
    transform: translate3d(0, 0, 0) scale(1.02);
  }
}

@keyframes error-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
    transform: translate3d(0, 0, 0) scale(1.02);
  }
}

/* 焦點狀態 - 優化版本 */
.volume-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  /* 確保焦點狀態也使用 GPU 加速 */
  transform: translate3d(0, 0, 0) scale(1);
}

/* 禁用狀態 */
.volume-button:disabled {
  pointer-events: none;
  opacity: 0.6;
  transform: translate3d(0, 0, 0) scale(1);
}

/* 圖示過渡動畫 - 優化版本 */
.volume-button svg {
  transition:
    transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1);

  /* 啟用硬體加速 */
  will-change: transform, opacity;
  backface-visibility: hidden;
  transform: translateZ(0);
}

/* 圖示狀態變化效果 */
.volume-button--playing svg {
  transform: rotate(0deg) scale(1);
}

.volume-button--retrying svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 響應式設計 - 優化版本 */
@media (max-width: 640px) {
  .volume-button {
    width: 2rem;
    height: 2rem;
    /* 在小螢幕上減少動畫複雜度 */
    will-change: background-color;
  }

  .volume-button svg {
    width: 1rem;
    height: 1rem;
  }

  /* 在行動裝置上簡化動畫 */
  .volume-button--idle:hover {
    transform: translate3d(0, 0, 0) scale(1.02);
  }

  .volume-button--error:hover {
    transform: translate3d(0, 0, 0) scale(1.02);
  }
}

/* 高對比度模式支援 */
@media (prefers-contrast: high) {
  .volume-button--idle {
    @apply border-2 border-gray-600;
  }

  .volume-button--playing {
    @apply border-2 border-blue-700;
  }

  .volume-button--retrying {
    @apply border-2 border-yellow-700;
  }

  .volume-button--error {
    @apply border-2 border-red-700;
  }
}

/* 減少動畫偏好設定 - 優化版本 */
@media (prefers-reduced-motion: reduce) {
  .volume-button,
  .volume-button svg {
    transition: none;
    animation: none;
    will-change: auto;
  }

  .volume-button--playing,
  .volume-button--error,
  .volume-button--retrying {
    animation: none;
  }

  .volume-button--retrying svg {
    animation: none;
  }

  .volume-button--idle:hover,
  .volume-button--error:hover {
    transform: translate3d(0, 0, 0) scale(1);
  }

  .volume-button--idle:active,
  .volume-button--error:active {
    transform: translate3d(0, 0, 0) scale(1);
  }
}

/* 低功耗模式優化 */
@media (prefers-reduced-data: reduce) {
  .volume-button {
    /* 在低功耗模式下簡化動畫 */
    will-change: auto;
  }

  .volume-button--playing,
  .volume-button--error,
  .volume-button--retrying {
    animation-duration: 3s; /* 減慢動畫速度以節省電力 */
  }
}

/* 暗色模式優化 */
@media (prefers-color-scheme: dark) {
  .volume-button--idle {
    @apply bg-gray-700 hover:bg-gray-600;
  }

  .volume-button--idle:hover {
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
  }
}
</style>
