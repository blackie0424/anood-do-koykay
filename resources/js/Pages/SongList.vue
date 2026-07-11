<script setup>
import { Link } from '@inertiajs/vue3'
import PublicLayout from '@/Layouts/PublicLayout.vue'

defineProps({ songs: Array })
</script>

<template>
    <PublicLayout>
        <div class="min-h-screen bg-amber-50 p-4">
            <h1 class="text-3xl font-bold text-center text-stone-800 mb-6">達悟族語歌謠</h1>
            <div class="max-w-2xl mx-auto space-y-4">
                <div v-for="song in songs" :key="song.id"
                    class="bg-white rounded-xl shadow p-5 flex items-center justify-between">
                    <div>
                        <p class="font-semibold text-stone-900 leading-snug" style="font-size: clamp(1.4rem, 4vw, 1.9rem)">
                            <span v-if="song.book_number" class="font-mono text-stone-600 mr-2">[{{ song.book_number }}]</span>{{ song.title_native }}
                        </p>
                        <p v-if="song.title_zh" class="text-stone-500 mt-1">{{ song.title_zh }}</p>
                    </div>
                    <Link :href="`/songs/${song.id}`"
                        class="flex-shrink-0 ml-4 bg-blue-600 text-white text-xl font-bold w-16 h-16 rounded-full flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-transform"
                        aria-label="播放">▶
                    </Link>
                </div>
                <p v-if="!songs?.length" class="text-center text-stone-400 py-8">尚無歌曲</p>
            </div>
        </div>
    </PublicLayout>
</template>
