<script setup>
import { ref, computed } from 'vue'
import { Link } from '@inertiajs/vue3'
import PublicLayout from '@/Layouts/PublicLayout.vue'

const props = defineProps({ songs: Array })

const search = ref('')

const filteredSongs = computed(() => {
    const q = search.value.trim().toLowerCase()
    if (!q) return props.songs
    return props.songs.filter(s =>
        s.book_number?.includes(q) ||
        s.title_native?.toLowerCase().includes(q) ||
        s.title_zh?.toLowerCase().includes(q)
    )
})

function lineShareUrl(songId) {
    return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent('https://anood.pongsonotao.org/songs/' + songId)}`
}
</script>

<template>
    <PublicLayout>
        <div class="min-h-screen bg-amber-50 p-4">
            <h1 class="text-3xl font-bold text-center text-stone-800 mb-4">達悟族語歌謠</h1>

            <input v-model="search" type="search"
                placeholder="搜尋頁碼、族語或中文歌名…"
                class="w-full max-w-2xl mx-auto block border-2 border-stone-300 rounded-2xl px-5 py-3 text-lg focus:outline-none focus:border-blue-400 bg-white mb-6" />

            <div class="max-w-2xl mx-auto space-y-4">
                <div v-for="song in filteredSongs" :key="song.id"
                    class="bg-white rounded-xl shadow p-5 flex items-center justify-between">
                    <div>
                        <p class="font-semibold text-stone-900 leading-snug" style="font-size: clamp(1.4rem, 4vw, 1.9rem)">
                            <span v-if="song.book_number" class="font-mono text-stone-600 mr-2">[{{ song.book_number }}]</span>{{ song.title_native }}
                        </p>
                        <p v-if="song.title_zh" class="text-stone-500 mt-1">{{ song.title_zh }}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0 ml-4">
                        <a :href="lineShareUrl(song.id)" target="_blank" rel="noopener"
                            aria-label="分享到 LINE"
                            class="w-10 h-10 rounded-full flex items-center justify-center bg-[#06C755] hover:opacity-90 active:scale-95 transition-transform">
                            <svg viewBox="0 0 24 24" class="w-6 h-6 fill-white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                        </a>
                        <Link :href="`/songs/${song.id}`"
                            class="w-16 h-16 rounded-full flex items-center justify-center bg-blue-600 text-white text-xl font-bold hover:bg-blue-700 active:scale-95 transition-transform"
                            aria-label="播放">▶
                        </Link>
                    </div>
                </div>
                <p v-if="!filteredSongs?.length" class="text-center text-stone-400 py-8">
                    {{ search ? '找不到符合的歌曲' : '尚無歌曲' }}
                </p>
            </div>
        </div>
    </PublicLayout>
</template>
