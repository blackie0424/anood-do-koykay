<script setup>
import { ref, computed } from 'vue'
import { Link } from '@inertiajs/vue3'
import PublicLayout from '@/Layouts/PublicLayout.vue'

const props = defineProps({ songs: Array })

const search = ref('')
const copiedId = ref(null)

const filteredSongs = computed(() => {
    const q = search.value.trim().toLowerCase()
    if (!q) return props.songs
    return props.songs.filter(s =>
        s.book_number?.includes(q) ||
        s.title_native?.toLowerCase().includes(q) ||
        s.title_zh?.toLowerCase().includes(q)
    )
})

async function share(song) {
    const url = `https://anood.pongsonotao.org/songs/${song.id}`
    if (navigator.share) {
        try {
            await navigator.share({ title: song.title_native, url })
        } catch (e) {
            // 使用者取消分享不處理
        }
    } else {
        await navigator.clipboard.writeText(url)
        copiedId.value = song.id
        setTimeout(() => { copiedId.value = null }, 2000)
    }
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
                        <button @click="share(song)"
                            class="w-10 h-10 rounded-full flex items-center justify-center bg-stone-200 hover:bg-stone-300 active:scale-95 transition-transform text-stone-700 text-sm"
                            :aria-label="copiedId === song.id ? '已複製' : '分享'">
                            <template v-if="copiedId === song.id">✓</template>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                class="w-5 h-5">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                <polyline points="16 6 12 2 8 6" />
                                <line x1="12" y1="2" x2="12" y2="15" />
                            </svg>
                        </button>
                        <Link v-if="song.audio_full" :href="`/songs/${song.id}`"
                            class="w-16 h-16 rounded-full flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-transform flex-col gap-0.5"
                            aria-label="聆聽音樂">
                            <span class="text-2xl leading-none">▶</span>
                            <span class="text-xs leading-none font-medium">聆聽</span>
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
