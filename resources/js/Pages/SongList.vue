<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Link } from '@inertiajs/vue3'
import axios from 'axios'
import PublicLayout from '@/Layouts/PublicLayout.vue'

const DEBOUNCE_MS = 300

const props = defineProps({ songs: Object })

const loadedSongs = ref([...props.songs.data])
const currentPage = ref(props.songs.meta.current_page)
const lastPage = ref(props.songs.meta.last_page)
const loadingMore = ref(false)

const search = ref('')
const searchResults = ref(null)
const searching = ref(false)
const copiedId = ref(null)

const isSearchActive = computed(() => search.value.trim() !== '')
const displayedSongs = computed(() => (isSearchActive.value ? searchResults.value ?? [] : loadedSongs.value))
const hasMore = computed(() => currentPage.value < lastPage.value)

let debounceTimer = null

watch(search, (value) => {
    clearTimeout(debounceTimer)
    const keyword = value.trim()
    if (keyword === '') {
        searchResults.value = null
        return
    }
    debounceTimer = setTimeout(() => runSearch(keyword), DEBOUNCE_MS)
})

async function runSearch(keyword) {
    searching.value = true
    try {
        const { data } = await axios.get('/api/songs', { params: { q: keyword } })
        searchResults.value = data.data
    } finally {
        searching.value = false
    }
}

async function loadMore() {
    if (isSearchActive.value || !hasMore.value || loadingMore.value) return
    loadingMore.value = true
    try {
        const { data } = await axios.get('/api/songs', { params: { page: currentPage.value + 1 } })
        loadedSongs.value = [...loadedSongs.value, ...data.data]
        currentPage.value = data.meta.current_page
        lastPage.value = data.meta.last_page
    } finally {
        loadingMore.value = false
    }
}

const sentinel = ref(null)
let observer = null

onMounted(() => {
    if (typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) loadMore()
    })
    if (sentinel.value) observer.observe(sentinel.value)
})

onBeforeUnmount(() => {
    observer?.disconnect()
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
                <div v-for="song in displayedSongs" :key="song.id"
                    class="bg-white rounded-xl shadow p-6">
                    <div class="mb-3">
                        <p class="font-semibold text-stone-900 leading-snug break-words" style="font-size: clamp(1.4rem, 4vw, 1.9rem)">
                            <span v-if="song.book_number" class="font-mono text-stone-600 mr-2">[{{ song.book_number }}]</span>{{ song.title_native }}
                        </p>
                        <p v-if="song.title_zh" class="text-stone-500 mt-1">{{ song.title_zh }}</p>
                    </div>
                    <div class="flex flex-wrap justify-end gap-3 items-center">
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
                        <!-- 最小尺寸用「固定像素」而不是會隨字體縮放的單位：
                             min-w-20 這類單位在字體 200% 時最小寬度會變成 160px，
                             而且是排版無法壓縮的硬下限，會直接撐破卡片（chung
                             回報清單跑版的原因）。改用 80px 固定下限確保觸控目標
                             夠大，寬高則由內容決定，字體再大也只長到內容需要的
                             程度。一般字級下外觀與原本的 w-20 h-20 相同。 -->
                        <Link v-if="song.audio_full" :href="`/songs/${song.id}`"
                            class="min-w-[80px] min-h-[80px] px-3 py-2 rounded-full flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-transform flex-col gap-0.5"
                            aria-label="聆聽音樂">
                            <span class="text-3xl leading-none">▶</span>
                            <span class="text-sm leading-none font-medium">聆聽</span>
                        </Link>
                    </div>
                </div>

                <p v-if="!displayedSongs?.length && !searching" class="text-center text-stone-400 py-8">
                    {{ isSearchActive ? '找不到符合的歌曲' : '尚無歌曲' }}
                </p>
                <p v-if="searching" class="text-center text-stone-400 py-4">搜尋中…</p>

                <div v-if="!isSearchActive" ref="sentinel" class="h-4"></div>
                <p v-if="loadingMore" class="text-center text-stone-400 py-4">載入中…</p>
            </div>
        </div>
    </PublicLayout>
</template>
