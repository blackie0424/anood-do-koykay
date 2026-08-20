<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import AppButton from '@/Components/AppButton.vue'
import axios from 'axios'
import { useShareSong } from '@/composables/useShareSong'
import PublicLayout from '@/Layouts/PublicLayout.vue'

const DEBOUNCE_MS = 300

// 卡片上三顆圓形圖示（歌本頁碼／分享／聆聽）共用的尺寸。
// 用固定像素而非會隨字體縮放的單位，並設上限：這些是圖示不是內文，跟著
// 系統字體等比放大會變得過大（chung 回報「現在的圖示都太大了」），也會把
// 卡片撐開。64px 已高於觸控目標建議下限（44px），上限 88px 讓大字體使用者
// 仍略有放大空間但不失控。
const ICON_BUTTON_CLASS =
    'min-w-[64px] min-h-[64px] max-w-[88px] max-h-[88px] p-[10px] rounded-full ' +
    'flex flex-col items-center justify-center gap-0.5'
const ICON_GLYPH_CLASS = 'leading-none text-[min(1.75rem,34px)]'
const ICON_LABEL_CLASS = 'leading-none font-medium text-[min(0.875rem,18px)]'

const props = defineProps({ songs: Object })

const { copiedId, share } = useShareSong()

const loadedSongs = ref([...props.songs.data])
const currentPage = ref(props.songs.meta.current_page)
const lastPage = ref(props.songs.meta.last_page)
const loadingMore = ref(false)

const search = ref('')
const searchResults = ref(null)
const searching = ref(false)

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

</script>

<template>
    <PublicLayout>
        <div class="min-h-screen bg-amber-50 p-4">
            <h1 class="text-3xl font-bold text-center text-stone-800 mb-4">達悟族語歌謠</h1>

            <input v-model="search" type="search"
                placeholder="搜尋頁碼、族語或中文歌名…"
                class="w-full max-w-2xl mx-auto block border-2 border-stone-300 rounded-2xl px-5 py-3 text-lg focus:outline-none focus:border-blue-400 bg-white mb-6" />

            <div class="max-w-2xl mx-auto space-y-4">
                <!-- 卡片內距用固定像素：p-6 這類單位會隨字體放大，200% 時
                     左右各吃掉 48px（共 96px），讓歌名可用寬度大幅縮水。
                     固定 24px 讓出約 50px 給文字，一般字級下與 p-6 相同。 -->
                <div v-for="song in displayedSongs" :key="song.id"
                    class="bg-white rounded-xl shadow p-[24px]">
                    <div class="mb-3">
                        <!-- text-wrap: balance 讓多行長度平均分佈，視覺上像刻意
                             排版而不是被硬切。達悟語長歌名在大字級下必然換行
                             （單行在數學上不可能：字級 45px 時整行需約 790px，
                             但手機可用寬度僅約 390px），只能讓換行更好看。 -->
                        <p class="font-semibold text-stone-900 leading-snug break-words [text-wrap:balance]"
                            style="font-size: clamp(1.4rem, 4vw, 1.9rem)">{{ song.title_native }}</p>
                        <p v-if="song.title_zh" class="text-stone-500 mt-1 break-words">{{ song.title_zh }}</p>
                    </div>
                    <!-- 書號放在按鈕列最左側（chung 設計）：歌名可獨佔整個
                         卡片寬度，書號又不必多佔一行，卡片高度維持不變。 -->
                    <div class="flex flex-wrap gap-3 items-center">
                        <!-- 頁碼可點擊，直接進入歌詞閱讀模式（與 📖 圖示語意
                             一致，也是播放頁「📖 歌詞」的同一個功能） -->
                        <AppButton as="link" v-if="song.book_number" :href="`/songs/${song.id}/reader`"
                            :class="[ICON_BUTTON_CLASS, 'bg-stone-100 text-stone-600 hover:bg-stone-200']"
                            data-testid="book-number" :aria-label="`歌本第 ${song.book_number} 頁，開啟歌詞閱讀模式`">
                            <span :class="ICON_GLYPH_CLASS" aria-hidden="true">📖</span>
                            <span :class="[ICON_LABEL_CLASS, 'font-mono font-semibold']">{{ song.book_number }}</span>
                        </AppButton>
                        <div class="ml-auto flex flex-wrap gap-3 items-center">
                        <AppButton @click="share(song)"
                            :class="[ICON_BUTTON_CLASS, 'bg-stone-200 hover:bg-stone-300 text-stone-700']"
                            :aria-label="copiedId === song.id ? '已複製' : '分享'">
                            <template v-if="copiedId === song.id"><span :class="ICON_GLYPH_CLASS">✓</span></template>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                class="w-[28px] h-[28px]">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                <polyline points="16 6 12 2 8 6" />
                                <line x1="12" y1="2" x2="12" y2="15" />
                            </svg>
                        </AppButton>
                        <AppButton as="link" v-if="song.audio_full" :href="`/songs/${song.id}`"
                            :class="[ICON_BUTTON_CLASS, 'bg-blue-600 text-white hover:bg-blue-700']"
                            aria-label="聆聽音樂">
                            <!-- 只留 ▶ 圖示（chung 實測後決定移除「聆聽」二字）。
                                 aria-label="聆聽音樂" 仍在，螢幕閱讀器讀得到用途。 -->
                            <span :class="ICON_GLYPH_CLASS" aria-hidden="true">▶</span>
                        </AppButton>
                        </div>
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
