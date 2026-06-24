<script setup>
import { ref } from 'vue'
import { Link } from '@inertiajs/vue3'

const props = defineProps({
  songs: Array,
})
</script>

<template>
  <div class="min-h-screen bg-stone-50 p-4">
    <h1 class="text-3xl font-bold text-center text-stone-800 mb-6">達悟族語歌謠</h1>
    <div class="max-w-2xl mx-auto space-y-4">
      <div v-for="song in songs" :key="song.id"
        class="bg-white rounded-xl shadow p-5 flex items-center justify-between">
        <div>
          <p class="text-2xl font-semibold text-stone-800" style="font-size: clamp(1.25rem, 4vw, 1.75rem)">
            {{ song.title_native }}
          </p>
          <p v-if="song.title_zh" class="text-stone-500 mt-1">{{ song.title_zh }}</p>
        </div>
        <Link :href="`/songs/${song.id}`"
          class="flex-shrink-0 ml-4 bg-blue-600 text-white text-xl font-bold w-16 h-16 rounded-full flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-transform"
          aria-label="播放">
          ▶
        </Link>
      </div>
      <p v-if="!songs?.length" class="text-center text-stone-400 py-8">尚無歌曲</p>
    </div>
  </div>
</template>
