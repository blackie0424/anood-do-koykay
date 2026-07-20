<script setup>
import { ref, computed, watch } from 'vue'
import { Link } from '@inertiajs/vue3'
import PublicLayout from '@/Layouts/PublicLayout.vue'
import ReportModal from '@/Components/ReportModal.vue'

const props = defineProps({ song: Object })

const audio = ref(null)
const currentTime = ref(0)
const isPlaying = ref(false)
const hasError = ref(false)

// 歌詞捲動
const lyricsContainer = ref(null)
const lineRefs = ref([])
const autoScroll = ref(true)
const userScrolled = ref(false)
let programmaticScroll = false

// 逐段播放模式
const segmentMode = ref(false)
const segmentLine = ref(null)

const activeLineIndex = computed(() => {
    if (!props.song?.lines) return -1
    return props.song.lines.findLastIndex(
        (line) => line.start_time !== null && currentTime.value >= line.start_time
    )
})

watch(activeLineIndex, (idx) => {
    if (!autoScroll.value || idx < 0) return
    userScrolled.value = false
    scrollToLine(idx)
})

function scrollToLine(idx) {
    const el = lineRefs.value[idx]
    if (!el || !lyricsContainer.value) return
    programmaticScroll = true
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => { programmaticScroll = false }, 300)
}

function onContainerScroll() {
    if (programmaticScroll) return
    userScrolled.value = true
    autoScroll.value = false
}

function returnToCurrentLine() {
    userScrolled.value = false
    autoScroll.value = true
    scrollToLine(activeLineIndex.value)
}

function togglePlay() {
    if (!audio.value) return
    if (segmentMode.value) {
        // 退出逐段模式，從 audio_start 播放整首
        segmentMode.value = false
        segmentLine.value = null
        autoScroll.value = true
        userScrolled.value = false
        audio.value.currentTime = props.song?.audio_start ?? 0
        audio.value.play().catch(() => { hasError.value = true })
    } else {
        isPlaying.value ? audio.value.pause() : audio.value.play().catch(() => { hasError.value = true })
    }
}

function onTimeUpdate() {
    currentTime.value = audio.value?.currentTime ?? 0

    // 逐段播放模式
    if (segmentMode.value) {
        if (segmentLine.value) {
            const line = segmentLine.value
            const endTime = line.end_time ?? getNextLineStartTime(line)
            if (endTime != null && currentTime.value >= endTime) {
                audio.value.pause()
                segmentLine.value = null
            }
        }
        return
    }

    // 整首播放：到達 audio_end 時進入逐段模式
    const end = props.song?.audio_end
    if (end != null && currentTime.value >= end) {
        audio.value.pause()
        enterSegmentMode()
    }
}

function getNextLineStartTime(line) {
    const lines = props.song?.lines ?? []
    const idx = lines.indexOf(line)
    return lines[idx + 1]?.start_time ?? null
}

function enterSegmentMode() {
    if (segmentMode.value) return
    segmentMode.value = true
    autoScroll.value = false
}

function onEnded() {
    isPlaying.value = false
    enterSegmentMode()
}

function onLoaded() {
    const start = props.song?.audio_start
    if (start != null && audio.value) {
        audio.value.currentTime = start
    }
}

function onError() { hasError.value = true; isPlaying.value = false }

function onPause() { if (audio.value?.paused) isPlaying.value = false }

function playLine(line) {
    if (!audio.value || line.start_time === null) return
    if (segmentMode.value) {
        segmentLine.value = line
    }
    audio.value.currentTime = line.start_time
    audio.value.play().catch(() => { hasError.value = true })
}

const showPlayOverlay = ref(true)

function startPlayFromOverlay() {
    showPlayOverlay.value = false
    if (audio.value && props.song?.audio_full && !hasError.value) {
        audio.value.play().catch(() => { hasError.value = true })
    }
}

const isMobile = computed(() => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
const copied = ref(false)

async function copyLink() {
    if (navigator.clipboard) {
        await navigator.clipboard.writeText('https://anood.pongsonotao.org/songs/' + props.song.id)
    }
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
    <PublicLayout>
    <div class="min-h-dvh flex flex-col bg-stone-50 relative">
        <!-- 標頭 -->
        <div class="px-3 pt-3 flex-shrink-0">
            <div class="max-w-2xl mx-auto">
                <Link href="/" class="inline-flex items-center gap-1 text-stone-500 hover:text-stone-700 text-sm mb-4">
                    ← 返回清單
                </Link>
                <div class="text-center mb-4">
                    <p v-if="song.book_number" class="font-mono text-stone-500 mb-1" style="font-size: clamp(1rem, 3vw, 1.25rem)">[{{ song.book_number }}]</p>
                    <h1 class="font-bold text-stone-800" style="font-size: clamp(1.5rem, 5vw, 2rem)">
                        {{ song.title_native }}
                    </h1>
                    <p v-if="song.title_zh" class="text-stone-500 mt-1 text-xl">{{ song.title_zh }}</p>
                    <div class="flex items-center justify-center gap-2 mt-2">
                        <a v-if="isMobile" :href="`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent('https://anood.pongsonotao.org/songs/' + song.id)}`"
                            target="_blank" rel="noopener" aria-label="分享到 LINE"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#06C755] text-white text-sm hover:opacity-90 active:scale-95 transition-transform">
                            <svg viewBox="0 0 24 24" class="w-4 h-4 fill-white flex-shrink-0"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                            分享
                        </a>
                        <a v-else href="#" @click.prevent="copyLink"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-200 text-stone-700 text-sm hover:bg-stone-300 active:scale-95 transition-transform"
                            :aria-label="copied ? '已複製' : '複製連結'">
                            {{ copied ? '✓ 已複製' : '🔗 複製連結' }}
                        </a>
                        <a :href="`/songs/${song.id}/reader`"
                            class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-stone-700 text-white text-sm hover:bg-stone-600 active:scale-95 transition-transform"
                            aria-label="歌詞閱讀模式">
                            📖 歌詞
                        </a>
                        <ReportModal :song-id="song.id" />
                    </div>
                </div>
                <div v-if="hasError" class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 text-center text-lg">
                    無法播放，請稍後再試
                </div>
            </div>
        </div>

        <!-- 歌詞捲動容器（獨立 overflow 容器，scroll 事件綁在此） -->
        <div ref="lyricsContainer"
             class="flex-1 overflow-y-auto min-h-0 px-3 pb-4"
             @scroll.passive="onContainerScroll">
            <div class="max-w-2xl mx-auto space-y-2">
                <div v-for="(line, idx) in song.lines" :key="line.id"
                     :ref="el => lineRefs[idx] = el"
                     @click="playLine(line)"
                     :class="['rounded-xl px-3 py-3 transition-colors cursor-pointer select-none',
                         idx === activeLineIndex ? 'bg-blue-100 border-2 border-blue-400' : 'bg-white border border-stone-200 hover:bg-stone-100']">
                    <p class="font-semibold text-stone-800 leading-snug" style="font-size: clamp(1.5rem, 4vw, 2rem)">
                        {{ line.text_native }}
                    </p>
                </div>
            </div>
        </div>

        <!-- 回到當前行浮動按鈕（正常播放且用戶已手動滑動時顯示） -->
        <Transition name="fade">
            <button v-if="userScrolled && isPlaying && !segmentMode"
                @click="returnToCurrentLine"
                class="fixed bottom-28 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
                ↩ 回到當前行
            </button>
        </Transition>

        <audio v-if="song.audio_full" ref="audio" :src="song.audio_full"
            @timeupdate="onTimeUpdate" @loadedmetadata="onLoaded"
            @playing="isPlaying = true" @pause="onPause"
            @ended="onEnded" @error="onError" />

        <!-- 底部控制列 -->
        <div class="flex-shrink-0 bg-white border-t border-stone-200 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div class="max-w-2xl mx-auto flex items-center gap-4">
                <button @click="togglePlay" :disabled="!song.audio_full || hasError"
                    :aria-label="segmentMode ? '整首播放' : isPlaying ? '暫停' : '播放'"
                    :class="['flex-shrink-0 w-16 h-16 rounded-full text-2xl flex items-center justify-center transition-transform active:scale-95',
                        song.audio_full && !hasError ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-stone-200 text-stone-400 cursor-not-allowed']">
                    {{ isPlaying ? '⏸' : '▶' }}
                </button>
                <div class="flex-1 text-stone-600 font-medium text-lg">
                    <span v-if="segmentMode">▶ 點選歌詞播放</span>
                    <span v-else-if="isPlaying">播放中…</span>
                </div>
            </div>
        </div>
    </div>

    <!-- 進入頁面播放提示覆蓋層 -->
    <Transition name="overlay">
        <div v-if="showPlayOverlay && song.audio_full && !hasError"
            class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 cursor-pointer"
            @click="startPlayFromOverlay"
            role="button"
            aria-label="點擊開始播放">
            <div class="flex flex-col items-center gap-6 select-none">
                <div class="w-36 h-36 rounded-full bg-white/20 border-4 border-white flex items-center justify-center shadow-2xl">
                    <span class="text-7xl text-white ml-3">▶</span>
                </div>
                <p class="text-white text-2xl font-bold tracking-wide drop-shadow-lg">點擊開始播放</p>
                <p class="text-white/70 text-lg">{{ song.title_native }}</p>
            </div>
        </div>
    </Transition>
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
.overlay-leave-active {
    transition: opacity 0.3s ease;
}
.overlay-leave-to {
    opacity: 0;
}
</style>
