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

    // 逐段播放：到達 end_time 時暫停
    if (segmentMode.value && segmentLine.value) {
        const line = segmentLine.value
        const endTime = line.end_time ?? getNextLineStartTime(line)
        if (endTime != null && currentTime.value >= endTime) {
            audio.value.pause()
            segmentLine.value = null
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

function playLine(line) {
    if (!audio.value || line.start_time === null) return
    if (segmentMode.value) {
        segmentLine.value = line
    }
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
    <div class="h-screen flex flex-col bg-stone-50">
        <!-- 標頭 -->
        <div class="px-3 pt-3 flex-shrink-0">
            <div class="max-w-2xl mx-auto">
                <Link href="/" class="inline-flex items-center gap-1 text-stone-500 hover:text-stone-700 text-sm mb-4">
                    ← 返回清單
                </Link>
                <div class="text-center mb-4">
                    <h1 class="font-bold text-stone-800" style="font-size: clamp(1.5rem, 5vw, 2rem)">
                        {{ song.title_native }}
                    </h1>
                    <p v-if="song.title_zh" class="text-stone-500 mt-1 text-xl">{{ song.title_zh }}</p>
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
                    <p v-if="displayMode !== 'zh'" class="font-semibold text-stone-800 leading-snug" style="font-size: clamp(1.5rem, 4vw, 2rem)">
                        {{ line.text_native }}
                    </p>
                    <p v-if="displayMode !== 'native'" class="text-stone-600 leading-snug" style="font-size: clamp(1.5rem, 3vw, 1.75rem)">
                        {{ line.text_zh }}
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
            @playing="isPlaying = true" @pause="isPlaying = false"
            @ended="onEnded" @error="onError" />

        <!-- 底部控制列 -->
        <div class="flex-shrink-0 bg-white border-t border-stone-200 p-4">
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
