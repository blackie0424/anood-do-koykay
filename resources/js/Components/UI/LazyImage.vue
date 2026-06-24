<template>
  <div
    :class="['relative flex items-center justify-center bg-gray-100 overflow-hidden', wrapperClass]"
    :style="wrapperStyle"
  >
    <!-- Loading 狀態使用絕對定位覆蓋，不影響圖片佈局 -->
    <div
      v-if="loading && !error"
      class="absolute inset-0 flex items-center justify-center bg-gray-100 z-10"
    >
      <LoadingBar :loading="true" :error="false" type="image" loading-text="資料載入中..." />
    </div>
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
        :alt="alt"
        :loading="imgLoading"
        decoding="async"
        :class="[
          'object-contain transition-opacity duration-300',
          imgClass,
          loading ? 'opacity-0' : 'opacity-100',
        ]"
        :style="imgStyle"
        @load="onLoad"
        @error="onResponsiveError"
      />
    </picture>
    <!-- 當響應式圖片失敗或非響應式圖片時，使用桌機版或原始圖片 -->
    <img
      v-else
      :src="finalSrc"
      :alt="alt"
      :loading="imgLoading"
      decoding="async"
      :class="[
        'object-contain transition-opacity duration-300',
        imgClass,
        loading ? 'opacity-0' : 'opacity-100',
      ]"
      :style="imgStyle"
      @load="onLoad"
      @error="onError"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import LoadingBar from '@/Components/UI/LoadingBar.vue'
import { getResponsiveImageUrls, isResponsiveWebp } from '@/composables/useResponsiveImage.js'

const props = defineProps({
  src: String,
  alt: String,
  wrapperClass: { type: String, default: '' },
  wrapperStyle: { type: [String, Object], default: '' },
  imgClass: { type: String, default: '' },
  imgStyle: { type: [String, Object], default: '' },
  imgIndex: { type: Number, default: 0 }, // 新增：圖片在列表中的索引
  defaultSrc: {
    type: String,
    default: '/images/default.png', // 預設圖片路徑
  },
})

// 從 Inertia 共享資料取得資料夾配置
const page = usePage()
const storageFolders = computed(
  () => page.props.storageFolders || { image: 'images', webp: 'webp' }
)

// 全域圖片快取狀態追蹤（避免已載入的圖片再次顯示 loading）
const imageCache = new Set()

/**
 * 檢查圖片是否已在瀏覽器快取中
 * 使用 Image 物件的 complete 屬性判斷
 */
function isImageCached(src) {
  if (!src) return false
  // 先檢查我們自己的快取記錄
  if (imageCache.has(src)) return true
  // 再使用瀏覽器原生檢測
  const img = new Image()
  img.src = src
  return img.complete && img.naturalWidth > 0
}

// 根據圖片是否已快取來決定初始 loading 狀態
const loading = ref(!isImageCached(props.src))
const error = ref(false)
const useWebp = ref(true) // 是否嘗試使用 webp 格式
const useDesktopFallback = ref(false) // 響應式圖片失敗時，fallback 到桌機版

/**
 * 將圖片 URL 轉換為 webp 格式
 * 根據後端配置的資料夾名稱進行替換
 * 例如: .../dev-images/fish.jpg -> .../dev-webp/fish.webp
 */
function toWebpUrl(url) {
  if (!url) return url
  // 若已經是 webp 格式則直接返回
  if (url.toLowerCase().endsWith('.webp')) return url
  // 若是本地預設圖片則不轉換
  if (url.startsWith('/images/')) return url

  const imageFolder = storageFolders.value.image
  const webpFolder = storageFolders.value.webp

  // 替換資料夾路徑：從 image 資料夾改為 webp 資料夾
  // 並將副檔名改為 .webp
  let webpUrl = url

  // 替換資料夾名稱（處理 URL 中的路徑）
  if (imageFolder && webpFolder) {
    // 匹配資料夾名稱（確保是完整的資料夾名稱，避免部分匹配）
    const folderPattern = new RegExp(`/${escapeRegExp(imageFolder)}/`, 'g')
    webpUrl = webpUrl.replace(folderPattern, `/${webpFolder}/`)
  }

  // 替換副檔名為 .webp
  webpUrl = webpUrl.replace(/\.(jpg|jpeg|png|gif|bmp)$/i, '.webp')

  return webpUrl
}

/**
 * 轉義正則表達式特殊字元
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 判斷 URL 是否可以轉換為 webp
 */
function canConvertToWebp(url) {
  if (!url) return false
  // 若已經是 webp 或是本地預設圖片則不需轉換
  if (url.toLowerCase().endsWith('.webp')) return false
  if (url.startsWith('/images/')) return false
  // 檢查是否為支援轉換的圖片格式
  return /\.(jpg|jpeg|png|gif|bmp)$/i.test(url)
}

// 計算當前應該載入的圖片 URL
const currentSrc = computed(() => {
  // 若完全載入失敗，顯示預設圖片
  if (error.value) {
    return props.defaultSrc
  }
  // 若應該嘗試 webp 且 URL 可轉換
  if (useWebp.value && canConvertToWebp(props.src)) {
    return toWebpUrl(props.src)
  }
  // 否則使用原始 URL
  return props.src
})

/**
 * 計算響應式圖片 URL 集合
 * 只有當圖片是 webp 格式時才產生響應式版本
 * 回傳 { desktop, tablet, mobile } 或 null
 */
const responsiveUrls = computed(() => {
  // 若發生錯誤則不使用響應式圖片
  if (error.value) {
    return null
  }

  // 取得當前的圖片 URL（可能已轉換為 webp）
  const imageUrl = currentSrc.value

  // 檢查是否為可產生響應式版本的 webp 圖片
  if (!isResponsiveWebp(imageUrl)) {
    return null
  }

  // 產生響應式圖片 URL
  return getResponsiveImageUrls(imageUrl)
})

/**
 * 計算最終顯示的圖片 URL
 * 用於非響應式圖片或響應式圖片 fallback 時
 */
const finalSrc = computed(() => {
  // 若發生錯誤，顯示預設圖片
  if (error.value) {
    return props.defaultSrc
  }
  // 若響應式圖片失敗，使用原始版 webp
  if (useDesktopFallback.value && responsiveUrls.value) {
    return responsiveUrls.value.original
  }
  // 否則使用 currentSrc
  return currentSrc.value
})

function onLoad() {
  loading.value = false
  // 記錄已載入的圖片 URL 到快取
  if (props.src) {
    imageCache.add(props.src)
    // 同時記錄轉換後的 webp URL
    if (canConvertToWebp(props.src)) {
      imageCache.add(toWebpUrl(props.src))
    }
  }
}

/**
 * 響應式圖片載入失敗時的處理
 * 會 fallback 到原始版（檔名.webp）
 */
function onResponsiveError() {
  // 切換到使用桌機版 fallback
  useDesktopFallback.value = true
  // 保持 loading 狀態，等待桌機版載入
}

function onError() {
  // 若正在嘗試 webp 且 URL 可轉換，則 fallback 到原始格式
  if (useWebp.value && canConvertToWebp(props.src)) {
    useWebp.value = false
    // 保持 loading 狀態，等待原始格式載入
    return
  }
  // 若原始格式也失敗，則顯示預設圖片
  loading.value = false
  error.value = true
}

// 當 src 改變時重設狀態（但檢查是否已快取）
watch(
  () => props.src,
  (newSrc) => {
    // 檢查新圖片是否已在快取中
    const cached = isImageCached(newSrc)
    loading.value = !cached
    error.value = false
    useWebp.value = true // 重新嘗試 webp
    useDesktopFallback.value = false // 重設響應式 fallback 狀態
  }
)

// 根據 imgIndex 決定 loading 屬性
const imgLoading = computed(() => (props.imgIndex < 8 ? 'eager' : 'lazy'))
</script>
