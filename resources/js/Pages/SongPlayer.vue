<script setup>
import { ref, computed, watch } from 'vue'
import { Link } from '@inertiajs/vue3'
import PublicLayout from '@/Layouts/PublicLayout.vue'

const props = defineProps({ song: Object })

const audio = ref(null)
const currentTime = ref(0)
const isPlaying = ref(false)
const hasError = ref(false)
const displayMode = ref('both')

// 歌詞行 DOM refs
const lineRefs = ref([])

// 自動捲動狀態
const autoScroll = ref(true)
const userScrolled = ref(false)
let scrollTimeout = null

const activeLineIndex = computed(() => {
    if (!props.song?.lines) return -1
    return props.song.lines.findLastIndex(
        (line) => line.start_time !== null && currentTime.value >= line.start_time
    )
})

// activeLineIndex 變化時自動捲動
watch(activeLineIndex, (idx) => {
    if (!autoScroll.value || idx < 0) return
    // 播放到新的一行，清除 userScrolled（選項 A：下一句時恢復）
    userScrolled.value = false
    scrollToLine(idx)
})

function scrollToLine(idx) {
    const el = lineRefs.value[idx]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function returnToCurrentLine() {
    userScrolled.value = false
    autoScroll.value = true
    scrollToLine(activeLineIndex.value)
}

// 偵測用戶手動滾動
function onUserScroll() {
    if (scrollTimeout) clearTimeout(scrollTimeout)
    // 短暫延遲避免 scrollIntoView 自身觸發
    scrollTimeout = setTimeout(() => {
        if (!autoScroll.value) return
        userScrolled.value = true
        autoScroll.value = false
    }, 50)
}

function togglePlay() {
    if (!audio.value) return
    isPlaying.value ? audio.value.pause() : audio.value.play().catch(() => { hasError.value = true })
}

function onTimeUpdate() {
    currentTime.value = audio.value?.currentTime ?? 0
    const end = props.song?.audio_end
    if (end != null && currentTime.value >= end) {
        audio.value.pause()
    }
}

function onLoaded() {
    const start = props.song?.audio_start
    if (start != null && audio.value) {
        audio.value.currentTime = start
    }
}

function onError() { hasError.value = true; isPlaying.value = false }

function playLine(line) {
    if (!audio.value || line.start_time === null) return
    audio.value.currentTime = line.start_time
    audio.value.play().catch(() => { hasError.value = true })
}

function cycleDisplayMode() {
    const modes = ['both', 'native', 'zh']
    displayMode.value = modes[(modes.indexOf(displayMode.value) + 1) % modes.length]
}

const modeLabel = computed(() => ({ both: '全部', native: '族語', zh: '中文' }[displayMode.value]))
</script>

<template>
    <PublicLayout>
    <div class="min-h-screen bg-stone-50 p-3 pb-32" @scroll.passive="onUserScroll">
        <div class="max-w-2xl mx-auto">
            <!-- 返回清單 -->
            <Link href="/" class="inline-flex items-center gap-1 text-stone-500 hover:text-stone-700 text-sm mb-4">
                ← 返回清單
            </Link>

            <div class="text-center mb-6">
                <h1 class="text-3xl font-bold text-stone-800" style="font-size: clamp(1.5rem, 5vw, 2rem)">
                    {{ song.title_native }}
                </h1>
                <p v-if="song.title_zh" class="text-stone-500 mt-1 text-xl">{{ song.title_zh }}</p>
            </div>

            <div v-if="hasError" class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 text-center text-lg">
                無法播放，請稍後再試
            </div>

            <div class="space-y-2">
                <div v-for="(line, idx) in song.lines" :key="line.id"
                    :ref="el => lineRefs[idx] = el"
                    @click="playLine(line)"
                    :class="['rounded-xl px-3 py-3 transition-colors cursor-pointer select-none',
                        idx === activeLineIndex ? 'bg-blue-100 border-2 border-blue-400' : 'bg-white border border-stone-200 hover:bg-stone-100']">
                    <p v-if="displayMode !== 'zh'" class="font-semibold text-stone-800 leading-snug" style="font-size: clamp(1.5rem, 4vw, 2rem)">
                        {{ line.text_native }}
                    </p>
                    <p v-if="displayMode !== 'native'" class="text-stone-600 leading-snug" style="font-size: clamp(1.5rem, 3vw, 1.75rem)">
                        {{ line.text_zh }}
                    </p>
                </div>
            </div>
        </div>

        <!-- 回到當前行浮動按鈕 -->
        <Transition name="fade">
            <button v-if="userScrolled && isPlaying"
                @click="returnToCurrentLine"
                class="fixed bottom-28 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
                ↩ 回到當前行
            </button>
        </Transition>

        <audio v-if="song.audio_full" ref="audio" :src="song.audio_full"
            @timeupdate="onTimeUpdate" @loadedmetadata="onLoaded"
            @playing="isPlaying = true" @pause="isPlaying = false"
            @ended="isPlaying = false" @error="onError" />

        <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4">
            <div class="max-w-2xl mx-auto flex items-center gap-4">
                <button @click="togglePlay" :disabled="!song.audio_full || hasError"
                    :aria-label="isPlaying ? '暫停' : '播放'"
                    :class="['flex-shrink-0 w-16 h-16 rounded-full text-2xl flex items-center justify-center transition-transform active:scale-95',
                        song.audio_full && !hasError ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-stone-200 text-stone-400 cursor-not-allowed']">
                    {{ isPlaying ? '⏸' : '▶' }}
                </button>
                <div v-if="isPlaying" class="flex-1 text-stone-600 font-medium text-lg">播放中…</div>
                <div v-else class="flex-1" />
                <button @click="cycleDisplayMode"
                    class="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50">
                    {{ modeLabel }}
                </button>
            </div>
        </div>
    </div>
    </PublicLayout>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(8px);
}
</style>
