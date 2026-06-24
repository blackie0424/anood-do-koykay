<template>
  <div class="bg-white rounded-xl shadow-md overflow-hidden">
    <Link
      :href="`/fish/${fish.id}`"
      class="block h-full group focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <!-- 圖片區域 - 完整貼合上半部 -->
      <div class="relative">
        <LazyImage
          :src="fish.display_image_url || fish.image_url"
          :alt="fish.name"
          :imgIndex="index"
          wrapperClass="w-full h-[170px] flex items-center justify-center bg-gray-100"
          imgClass="w-full h-full object-cover"
        />
      </div>
      <!-- 文字資訊區域 - 白色背景帶 padding -->
      <div class="p-4 bg-white">
        <div class="flex items-center justify-between h-9">
          <div
            class="text-base font-semibold truncate tracking-wide group-hover:text-blue-600 flex-1 min-w-0"
          >
            {{ fish.name }}
          </div>
          <!-- 音檔播放按鈕靠右 -->
          <div v-if="fish.audio_url" class="ml-2 flex-shrink-0" @click.stop.prevent>
            <Volume :audioUrl="fish.audio_url" />
          </div>
        </div>
      </div>
    </Link>
  </div>
</template>

<script setup>
import { Link } from '@inertiajs/vue3'
import LazyImage from '@/Components/UI/LazyImage.vue'
import Volume from '@/Components/UI/Volume.vue'

const props = defineProps({
  fish: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    default: 0,
  },
})
</script>
