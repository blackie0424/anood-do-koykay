<template>
  <div
    class="show_image w-full max-w-3xl mx-auto flex items-center justify-center mb-6 p-4 rounded-lg shadow-custom h-60"
  >
    <!-- 使用 picture 標籤支援響應式圖片 -->
    <picture v-if="responsiveUrls && !useDesktopFallback">
      <!-- 手機版本：< 768px -->
      <source :srcset="responsiveUrls.mobile" media="(max-width: 767px)" type="image/webp" />
      <!-- 平板版本：768px - 1023px -->
      <source
        :srcset="responsiveUrls.tablet"
        media="(min-width: 768px) and (max-width: 1023px)"
        type="image/webp"
      />
      <!-- 桌機版本：>= 1024px -->
      <source :srcset="responsiveUrls.desktop" media="(min-width: 1024px)" type="image/webp" />
      <!-- fallback img：使用原始版本 -->
      <img
        :src="responsiveUrls.original"
        :alt="name"
        loading="lazy"
        class="max-h-full max-w-full object-contain rounded-lg"
        @error="onResponsiveError"
      />
    </picture>
    <!-- 當響應式圖片失敗或非響應式圖片時，使用原始版或傳入的圖片 -->
    <img
      v-else
      :src="finalSrc"
      :alt="name"
      loading="lazy"
      class="max-h-full max-w-full object-contain rounded-lg"
    />
  </div>
</template>
<script setup>
import { ref, computed, watch } from 'vue'
import { getResponsiveImageUrls, isResponsiveWebp } from '@/composables/useResponsiveImage.js'

const props = defineProps({
  image: String,
  name: String,
})

const useDesktopFallback = ref(false) // 響應式圖片失敗時，fallback 到原始版

/**
 * 計算響應式圖片 URL 集合
 */
const responsiveUrls = computed(() => {
  if (!isResponsiveWebp(props.image)) {
    return null
  }
  return getResponsiveImageUrls(props.image)
})

/**
 * 計算最終顯示的圖片 URL
 */
const finalSrc = computed(() => {
  // 若響應式圖片失敗，使用原始版 webp
  if (useDesktopFallback.value && responsiveUrls.value) {
    return responsiveUrls.value.original
  }
  return props.image
})

/**
 * 響應式圖片載入失敗時的處理
 */
function onResponsiveError() {
  useDesktopFallback.value = true
}

// 當 image 改變時重設狀態
watch(
  () => props.image,
  () => {
    useDesktopFallback.value = false
  }
)
</script>
