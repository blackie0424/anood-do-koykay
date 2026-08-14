<script setup>
import { ref, computed, watch } from 'vue'
import PublicLayout from '@/Layouts/PublicLayout.vue'
import BackLink from '@/Components/BackLink.vue'
import PlayBar from '@/Components/PlayBar.vue'
import ReportModal from '@/Components/ReportModal.vue'
import RecordingMode from '@/Components/RecordingMode.vue'

const props = defineProps({ song: Object })

// 接唱錄音：需有原音（audio_full）且至少一段有時間軸才可用
const canRecord = computed(() =>
    !!props.song?.audio_full && (props.song?.lines ?? []).some(l => l.start_time != null)
)
const showRecording = ref(false)

// 進入錄音模式前先暫停原唱，避免原音被錄進使用者的清唱
function openRecording() {
    if (audio.value && isPlaying.value) audio.value.pause()
    showRecording.value = true
}

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

// 底部播放列說明文字：逐段模式提示點歌詞、播放中提示播放中
const segmentLabel = computed(() => (segmentMode.value ? '點選歌詞播放' : isPlaying.value ? '播放中…' : ''))

// 播放起止點：優先由歌詞時間推算，無歌詞時間則 fallback 到 audio_start/audio_end
const effectiveStart = computed(() => {
    const times = (props.song?.lines ?? []).map(l => l.start_time).filter(t => t != null)
    return times.length > 0 ? Math.min(...times) : (props.song?.audio_start ?? 0)
})

const effectiveEnd = computed(() => {
    const times = (props.song?.lines ?? []).map(l => l.end_time).filter(t => t != null)
    return times.length > 0 ? Math.max(...times) : (props.song?.audio_end ?? null)
})

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
        // 退出逐段模式，從 effectiveStart 播放整首
        segmentMode.value = false
        segmentLine.value = null
        autoScroll.value = true
        userScrolled.value = false
        audio.value.currentTime = effectiveStart.value
        audio.value.play().catch(() => { hasError.value = true })
    } else {
        if (isPlaying.value) {
            audio.value.pause()
        } else {
            if (audio.value.currentTime < 0.3) audio.value.currentTime = effectiveStart.value
            audio.value.play().catch(() => { hasError.value = true })
        }
    }
}

function onTimeUpdate() {
    currentTime.value = audio.value?.currentTime ?? 0
    // TODO(暫時)：LINE WebView 歌詞高亮診斷，定位後移除
    console.log('[anood] timeupdate', currentTime.value)

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

    // 整首播放：到達 effectiveEnd 時進入逐段模式
    const end = effectiveEnd.value
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
    if (audio.value) audio.value.currentTime = effectiveStart.value
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
        const doPlay = () => {
            audio.value.currentTime = effectiveStart.value
            audio.value.play().catch(() => { hasError.value = true })
        }
        if (audio.value.readyState >= 2) {
            doPlay()
        } else {
            // 從外部連結完整載入頁面時，Safari 的 canplay 有時遲遲不觸發，
            // 加保險：3 秒後若還沒播放就強制播放一次
            let played = false
            const play = () => {
                if (played || !audio.value) return
                played = true
                audio.value.removeEventListener('canplay', play)
                doPlay()
            }
            audio.value.addEventListener('canplay', play, { once: true })
            setTimeout(play, 3000)
        }
    }
}

const copied = ref(false)

async function share() {
    const url = `https://anood.pongsonotao.org/songs/${props.song.id}`
    if (navigator.share) {
        try {
            await navigator.share({ title: props.song.title_native, url })
        } catch (e) {
            // 使用者取消分享不處理
        }
    } else {
        if (navigator.clipboard) await navigator.clipboard.writeText(url)
        copied.value = true
        setTimeout(() => { copied.value = false }, 2000)
    }
}
</script>

<template>
    <PublicLayout>
    <div class="h-dvh flex flex-col overflow-hidden bg-stone-50 relative">
        <!-- 返回 bar（sticky 固定頂部，捲動不消失） -->
        <div class="sticky top-0 z-10 flex-shrink-0 bg-white border-b border-stone-200 px-3 py-2">
            <div class="max-w-2xl mx-auto">
                <BackLink size="lg" />
            </div>
        </div>
        <!-- 標頭 -->
        <div class="px-3 pt-3 flex-shrink-0">
            <div class="max-w-2xl mx-auto">
                <div class="text-center mb-4">
                    <p v-if="song.book_number" class="font-mono text-stone-500 mb-1" style="font-size: clamp(1rem, 3vw, 1.25rem)">[{{ song.book_number }}]</p>
                    <h1 class="font-bold text-stone-800" style="font-size: clamp(1.5rem, 5vw, 2rem)">
                        {{ song.title_native }}
                    </h1>
                    <p v-if="song.title_zh" class="text-stone-500 mt-1 text-xl">{{ song.title_zh }}</p>
                    <div class="flex items-center justify-center gap-2 mt-2">
                        <button @click="share"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-200 text-stone-700 text-sm hover:bg-stone-300 active:scale-95 transition-transform"
                            :aria-label="copied ? '已複製' : '分享'">
                            <template v-if="copied">✓ 已複製</template>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                class="w-5 h-5">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                <polyline points="16 6 12 2 8 6" />
                                <line x1="12" y1="2" x2="12" y2="15" />
                            </svg>
                        </button>
                        <a :href="`/songs/${song.id}/reader`"
                            class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-stone-700 text-white text-sm hover:bg-stone-600 active:scale-95 transition-transform"
                            aria-label="歌詞閱讀模式">
                            📖 歌詞
                        </a>
                        <button v-if="canRecord" @click="openRecording"
                            class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-600 text-white text-sm hover:bg-rose-500 active:scale-95 transition-transform"
                            aria-label="接唱錄音">
                            🎤 錄唱
                        </button>
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
        <PlayBar :playing="isPlaying" :disabled="!song.audio_full || hasError" :label="segmentLabel" @play="togglePlay" />
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

    <RecordingMode v-if="showRecording" :song="song" @close="showRecording = false" />

    <!-- TODO(暫時)：LINE WebView 歌詞高亮診斷，定位後移除 -->
    <div class="fixed bottom-1 left-1 z-[999] text-xs text-white bg-black/70 px-2 py-1 rounded font-mono pointer-events-none">
        （診斷）t={{ currentTime.toFixed(2) }} idx={{ activeLineIndex }} hasStart={{ (song.lines ?? []).some(l => l.start_time != null) }}
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
.overlay-leave-active {
    transition: opacity 0.3s ease;
}
.overlay-leave-to {
    opacity: 0;
}
</style>
