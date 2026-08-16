<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { router } from '@inertiajs/vue3'
import PublicLayout from '@/Layouts/PublicLayout.vue'
import BackLink from '@/Components/BackLink.vue'
import PlayBar from '@/Components/PlayBar.vue'
import ReportModal from '@/Components/ReportModal.vue'
import RecordingMode from '@/Components/RecordingMode.vue'

const props = defineProps({ song: Object, isColdLoad: { type: Boolean, default: false } })

// 根因確認：問題出在「瀏覽器完整重新載入頁面」（冷啟動）這件事本身，跟
// LINE／Safari／PWA 等瀏覽器種類無關——用 chung 反覆驗證過的「直接貼網址
// 進入」跟「從歌曲清單點連結進入」兩種方式對照，前者（冷啟動）會壞、後者
// （Inertia 前端內部導覽）完全正常，兩者拿到的 song props 資料一模一樣
// （SongController::showPage 對兩種情況回傳同一包資料），差異純粹是瀏覽器
// 有沒有真的重新整頁。
//
// 修法：冷啟動時，畫面先顯示「載入中…」，掛載後立刻悄悄用 Inertia 的
// router.visit 把同一頁重新導覽一次（不是瀏覽器整頁重新載入），讓
// <audio> 元素改走「前端內部導覽」這條已驗證沒問題的路徑掛載，重新導覽
// 完成後才顯示真正的播放介面。
//
// 「是不是冷啟動」原本用前端 JS 記憶體裡的旗標判斷，但實測發現瀏覽器對
// 反覆造訪過的網址可能會做預先載入，導致這個旗標在畫面顯示出來之前就已
// 經被設成「已載入過」，判斷失準。改成完全交給後端判斷：Inertia 前端
// 內部導覽送出的請求一定會帶 X-Inertia 這個 header，瀏覽器真的整頁載入
// 則一定不會帶——這是請求當下的真實狀態，不會被瀏覽器的預先載入／快取
// 影響（見 SongController::showPage）。
const isColdBoot = props.isColdLoad
const isRehydrating = ref(isColdBoot)
// TODO(暫時)：診斷用，確認這招「冷啟動悄悄重新導覽」有沒有被觸發、
// 有沒有正常完成，定位穩定後移除
const revisitState = ref(isColdBoot ? 'pending' : 'skipped')

onMounted(() => {
    if (!isColdBoot) return
    router.visit(window.location.pathname + window.location.search, {
        replace: true,
        preserveScroll: true,
        preserveState: false,
        onFinish: () => { isRehydrating.value = false; revisitState.value = 'finished' },
        onError: () => { isRehydrating.value = false; revisitState.value = 'error' },
        onCancel: () => { isRehydrating.value = false; revisitState.value = 'cancelled' },
        onException: () => { isRehydrating.value = false; revisitState.value = 'exception' },
    })
})

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
const segmentLabel = computed(() => {
    if (isBuffering.value) return '載入中…'
    if (segmentMode.value) return '點選歌詞播放'
    if (isPlaying.value) return '播放中…'
    return ''
})

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

// 根因確定是「冷啟動（瀏覽器完整重新載入）」本身，不是設定 currentTime
// 跟呼叫 play() 的先後順序（曾經以為是順序問題、改成先 play() 再設定
// 秒數，後來證實無效——即使順序改了，冷啟動時 real 還是不會跟著走）。
// 冷啟動的問題改由下方的「悄悄用前端框架內部導覽重新整理一次」機制處理，
// 這裡維持原本單純的寫法：先設定播放位置，再呼叫播放。
function playFrom(time) {
    audio.value.currentTime = time
    audio.value.play().catch(() => { hasError.value = true })
}

function togglePlay() {
    if (!audio.value) return
    if (segmentMode.value) {
        // 退出逐段模式，從 effectiveStart 播放整首
        segmentMode.value = false
        segmentLine.value = null
        autoScroll.value = true
        userScrolled.value = false
        playFrom(effectiveStart.value)
    } else {
        if (isPlaying.value) {
            audio.value.pause()
        } else if (audio.value.currentTime < 0.3) {
            playFrom(effectiveStart.value)
        } else {
            audio.value.play().catch(() => { hasError.value = true })
        }
    }
}

// LINE WebView（iOS WKWebView）從外部連結完整載入頁面（冷啟動）時，audio 的
// timeupdate 事件可能完全不觸發；改用 requestAnimationFrame 逐幀輪詢也不可靠——
// 冷啟動時 rAF 可能被抑制、排程了卻不會真的執行，直到有使用者互動或 SPA 重繪
// 才「叫醒」。改用 setInterval：不依賴畫面渲染節奏，冷啟動時也能穩定執行；
// 250ms 對歌詞高亮已經足夠，不需要每幀更新。timeupdate 仍保留給下方的
// 逐段/整首播放結束判斷使用（多一層保險）。
const TIME_UPDATE_INTERVAL_MS = 250
const audioReadyState = ref(0)
let timeUpdateTimer = null

// 診斷確認：在部分裝置的 LINE WebView 冷啟動情境下，聲音正常播放，
// 但 audio.currentTime／timeupdate 兩者回報的播放位置完全不會前進
// （不是緩衝、readyState 已經是 HAVE_ENOUGH_DATA）。這是純粹的「進度
// 回報」問題，不是播放問題。修法用行為自我偵測，不分平台分支：
// 正常情況下永遠用 audio.currentTime 當真實來源（正常瀏覽器/PWA 完全
// 不受影響，真的緩衝時 currentTime 停滯也還是正確反映）；只有在資料已
// 備妥（readyState>=3）卻連續好幾個 tick 完全沒前進時，才判定為回報卡
// 住，改用 Date.now() 牆鐘時間估算前進量；一旦真實回報又恢復，立刻切
// 回真實值，不會永久分岔成兩套時間軸。
const STALL_TICKS_THRESHOLD = 3 // 連續 3 次（750ms）沒前進才判定回報卡住，避免正常抖動誤判
// 真實回報要接近目前虛擬估算的進度（誤差在這個秒數以內），才信任它、切回真實值。
// 不能只看「有沒有變化」——這台裝置的 real 曾經只是從 0.00 小小跳到 1.00（可能是
// 我們自己在暫停恢復時寫入 audio.currentTime 造成的讀回值），但虛擬估算當時已經
// 到 18 秒，如果只憑「有變化」就切回真實值，畫面會被拉回 1.00 附近，跟實際播放
// 進度差一大截，歌詞跟著跳回開頭，但真正的聲音其實沒被這個賦值動到、繼續往下播。
const REAL_RECOVERY_TOLERANCE_SECONDS = 2
const usingVirtualTime = ref(false)
let lastObservedRealTime = null
let stallTickCount = 0
let virtualBaseTime = 0
let virtualBaseWallClock = 0

function computeCurrentTime() {
    audioReadyState.value = audio.value.readyState
    const real = audio.value.currentTime

    if (usingVirtualTime.value) {
        const estimate = virtualBaseTime + (Date.now() - virtualBaseWallClock) / 1000
        const changed = real !== lastObservedRealTime
        lastObservedRealTime = real
        // 真實回報要「有變化」（代表瀏覽器真的又開始更新了，不是單純凍結
        // 在原地）而且「追上目前估算的進度」（誤差在容許範圍內）兩個條件
        // 都成立，才信任它、切回真實值。只看有沒有變化的話，虛擬計時剛
        // 啟動的那個 tick，估算值會剛好很接近真實值（因為兩者都源自同一
        // 個起點），會被誤判成「已經恢復」而立刻跳回去，等於沒有真的切
        // 到虛擬計時。
        if (changed && Math.abs(real - estimate) <= REAL_RECOVERY_TOLERANCE_SECONDS) {
            // 真實回報追上估算的進度了，才信任、切回真實值
            usingVirtualTime.value = false
            stallTickCount = 0
            return real
        }
        return estimate
    }

    if (lastObservedRealTime !== null && real === lastObservedRealTime && audioReadyState.value >= 3) {
        stallTickCount++
    } else {
        stallTickCount = 0
    }
    lastObservedRealTime = real

    if (stallTickCount >= STALL_TICKS_THRESHOLD) {
        usingVirtualTime.value = true
        virtualBaseTime = real
        virtualBaseWallClock = Date.now()
    }
    return real
}

function startTimeUpdateLoop() {
    if (timeUpdateTimer != null) return
    timeUpdateTimer = setInterval(() => {
        if (audio.value) {
            currentTime.value = computeCurrentTime()
            checkBoundary()
        }
    }, TIME_UPDATE_INTERVAL_MS)
}
function stopTimeUpdateLoop() {
    if (timeUpdateTimer != null) {
        clearInterval(timeUpdateTimer)
        timeUpdateTimer = null
    }
}
onBeforeUnmount(() => { stopTimeUpdateLoop() })

// 診斷確認：歌詞高亮沒有 bug，是音訊緩衝中——瀏覽器觸發 playing 事件後，
// 實際資料還沒備妥（readyState < HAVE_FUTURE_DATA）時播放位置不會前進。
// 緩衝中顯示「載入中…」，讓使用者知道不是按壞了。
const isBuffering = computed(() => isPlaying.value && audioReadyState.value < 3)

function onPlaying() {
    isPlaying.value = true
    if (usingVirtualTime.value) {
        // 從暫停恢復播放時，把虛擬計時的起點重新對齊到「暫停當下顯示的
        // 位置」，牆鐘基準也重新對齊到現在。只重置牆鐘、不重置起點的話，
        // 起點會停留在最初判定回報卡住時的舊位置（例如第 2 秒），暫停在
        // 第 27 秒恢復播放時，畫面會瞬間跳回第 2 秒附近重新算——歌詞跟著
        // 跳回開頭，但實際音訊沒有被重設、還是繼續往下播，兩者對不起來。
        virtualBaseTime = currentTime.value
        virtualBaseWallClock = Date.now()
    }
    startTimeUpdateLoop()
}

// 逐段播放模式 / 整首播放到達 effectiveEnd 的暫停判斷。輪詢（setInterval）
// 與原生 timeupdate 都會呼叫這裡，確保即使 timeupdate 在 LINE WebView
// 不可靠時，段落結尾／整首結尾的自動暫停行為依然正常。
function checkBoundary() {
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

function onTimeUpdate() {
    // 虛擬計時 fallback 期間，timeupdate 若剛好帶著卡住的舊值觸發，
    // 不要覆蓋掉正在估算前進的 currentTime。
    if (!usingVirtualTime.value) {
        currentTime.value = audio.value?.currentTime ?? 0
    }
    checkBoundary()
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
    stopTimeUpdateLoop()
    enterSegmentMode()
}

function onLoaded() {
    if (audio.value) audio.value.currentTime = effectiveStart.value
}

function onError() { hasError.value = true; isPlaying.value = false }

function onPause() {
    if (audio.value?.paused) {
        isPlaying.value = false
        stopTimeUpdateLoop()
        // 暫停時清掉「回報卡住」判定用的比對基準，避免恢復播放後的第一個
        // tick 誤判：暫停位置剛好等於暫停前最後一次觀察到的值，如果不清
        // 掉，連續 3 次 tick 還沒真的前進（例如剛恢復還沒開始動）就會被
        // 誤判成回報卡住。已經在虛擬計時 fallback 中的話不清（見下方
        // if），要維持判斷延續性——不然這裡把 lastObservedRealTime 清成
        // null，會讓虛擬計時模式那段「real !== lastObservedRealTime 就切
        // 回真實值」的判斷把 null 誤認成「回報恢復了」，跳回卡住的舊值。
        if (!usingVirtualTime.value) {
            stallTickCount = 0
            lastObservedRealTime = null
        }
    }
}

function playLine(line) {
    if (!audio.value || line.start_time === null) return
    if (segmentMode.value) {
        segmentLine.value = line
    }
    playFrom(line.start_time)
}

const showPlayOverlay = ref(true)

// chung 實測確認：手機瀏覽器（iOS）跟電腦瀏覽器對「使用者手勢」的認定
// 嚴格程度不同——電腦上，等 canplay 事件或用計時器延遲呼叫 play() 都
// 沒事；手機上，只要 play() 不是在使用者點擊當下「同步」呼叫，瀏覽器就
// 可能不把它當一次合法的播放操作，導致設定好的播放位置形同沒設定、直接
// 從頭播。改成點擊當下直接同步呼叫，不再等 canplay／計時器——瀏覽器
// 本身就有能力處理「資料還沒完全備妥就先播、邊播邊載」，不需要我們自己
// 等待。播放位置設定交給 playFrom() 內部（呼叫 play() 前先設定
// currentTime）跟 onLoaded（metadata 一讀到就設定）兩層。
function startPlayFromOverlay() {
    showPlayOverlay.value = false
    if (audio.value && props.song?.audio_full && !hasError.value) {
        playFrom(effectiveStart.value)
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

// 畫面診斷已移除（chung 驗收確認後）；保留這幾個內部狀態給測試用，不會渲染在畫面上
defineExpose({ currentTime, usingVirtualTime, audioReadyState, isBuffering })
</script>

<template>
    <PublicLayout>
    <div v-if="isRehydrating" class="h-dvh flex items-center justify-center bg-stone-50">
        <p class="text-stone-500 text-lg">載入中…</p>
    </div>
    <template v-else>
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
            @playing="onPlaying" @pause="onPause"
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
    </template>

    <!-- TODO(暫時)：chung 仍在驗證冷啟動修法，繼續保留畫面診斷；追查「歌詞
         跳回開頭但聲音沒受影響」那輪的 real／t 對比，跟這次的 cold／revisit
         都留著，定位穩定後一起移除 -->
    <div class="fixed bottom-1 left-1 z-[999] text-xs text-white bg-black/70 px-2 py-1 rounded font-mono pointer-events-none">
        （診斷）real={{ audio?.currentTime?.toFixed(2) ?? '-' }} | t={{ currentTime.toFixed(2) }} | idx={{ activeLineIndex }} | virt={{ usingVirtualTime }} | seg={{ segmentMode }} | playing={{ isPlaying }} | cold={{ isColdBoot }} | revisit={{ revisitState }}
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
