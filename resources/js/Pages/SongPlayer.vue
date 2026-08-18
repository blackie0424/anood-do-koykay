<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Link } from '@inertiajs/vue3'
import PublicLayout from '@/Layouts/PublicLayout.vue'
import BackLink from '@/Components/BackLink.vue'
import PlayBar from '@/Components/PlayBar.vue'
import ReportModal from '@/Components/ReportModal.vue'
import RecordingMode from '@/Components/RecordingMode.vue'
import { useCompactLayout } from '@/composables/useCompactLayout'

// 畫面被放大（瀏覽器縮放或系統字體調大）時進入精簡模式
const { isCompact } = useCompactLayout()

const props = defineProps({
    song: Object,
    // 後端判斷這次是不是瀏覽器整頁載入（見 SongController::showPage）。
    // 只用於診斷顯示，不影響任何行為。
    isColdLoad: { type: Boolean, default: false },
    // 診斷模式開關，由後端 .env 的 PLAYER_DIAGNOSTICS 控制
    showDiagnostics: { type: Boolean, default: false },
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

// 底部播放列說明文字。只保留「圖示表達不出來」的狀態：
// - 載入中：緩衝時圖示已是暫停鍵，但沒告訴使用者為什麼沒聲音
// - 點選歌詞播放：逐段模式的唯一提示，圖示完全表達不了
// 「播放中…」已移除（chung）：播放/暫停圖示本身就說明了狀態，文字重複。
const segmentLabel = computed(() => {
    if (isBuffering.value) return '載入中…'
    if (segmentMode.value) return '點選歌詞播放'
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

// iOS 手機（Safari／Chrome／LINE 內建瀏覽器共用同一 WebKit 引擎）反覆整頁
// 載入同一頁時，「第一次正常、之後 seek 失效／currentTime 回報凍結」。已
// 排除：音檔快取（帶了唯一 cb 參數、每次網址都不同仍然壞，見 git 歷史）、
// 導覽方式、play() 呼叫時機。剩下唯一跨頁面殘留的是 WebView 的媒體解碼器
// 狀態——舊頁面的 <audio> 從沒被明確釋放，殘留污染下一次載入。兩層處理：
// 1) src 直接帶 Media Fragment（#t=起始秒）：起始位置在媒體引擎載入層級
//    就決定，不依賴 JS 的 currentTime seek（JS seek 保留當第二層保險）。
// 2) 離開頁面（pagehide／元件卸載）時明確釋放媒體資源（見 releaseAudio），
//    這是 iOS 上「第一次好、之後都壞」這種模式的標準緩解手法。
const audioSrc = computed(() => {
    if (!props.song?.audio_full) return null
    return effectiveStart.value > 0
        ? `${props.song.audio_full}#t=${effectiveStart.value}`
        : props.song.audio_full
})

// 明確釋放媒體資源：暫停、清掉 src、呼叫 load() 讓瀏覽器立刻放掉解碼器。
// 整頁離開（pagehide）跟 SPA 卸載（onBeforeUnmount）都要做。
function releaseAudio() {
    if (!audio.value) return
    try {
        audio.value.pause()
        audio.value.removeAttribute('src')
        audio.value.load()
    } catch (e) {
        // 釋放失敗不影響離開頁面
    }
}
onMounted(() => { window.addEventListener('pagehide', releaseAudio) })
onBeforeUnmount(() => {
    window.removeEventListener('pagehide', releaseAudio)
    releaseAudio()
    if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer)
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

// 自動捲動期間要把捲動事件當成「不是使用者操作」，否則會誤判成使用者
// 接手而關掉自動追蹤。原本用固定 300ms 當保護時間，但平滑捲動的動畫長度
// 會隨距離拉長——字體放大後每行變高、捲動距離變大，動畫常常超過 300ms，
// 保護期先到期、後續的捲動事件就被當成使用者操作，自動追蹤直接失效
// （chung 回報「放大後歌詞不會自動追蹤」的原因）。
// 改成「捲動停止後才解除」：每收到一次捲動事件就把解除時間往後延，
// 動畫多久都不影響，只有真的停下來才會解除。
const PROGRAMMATIC_SCROLL_IDLE_MS = 150
// 保護期的總上限：使用者若在自動捲動途中用力甩動，慣性捲動會持續發出事件、
// 一直把解除時間往後延，控制權可能遲遲交不回去。加上總上限讓最壞情況有明確
// 上界；1.5 秒足以涵蓋放大字體後的長動畫（平滑捲動動畫一般不超過 1 秒）。
const PROGRAMMATIC_SCROLL_MAX_MS = 1500
let programmaticScrollTimer = null
let programmaticScrollStartedAt = 0

function beginProgrammaticScroll() {
    programmaticScroll = true
    programmaticScrollStartedAt = Date.now()
    scheduleProgrammaticScrollRelease()
}

// 解除時間 = 「最後一次捲動事件後 150ms」，但不得超過起算後的總上限
function scheduleProgrammaticScrollRelease() {
    if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer)
    const remaining = Math.max(0, PROGRAMMATIC_SCROLL_MAX_MS - (Date.now() - programmaticScrollStartedAt))
    programmaticScrollTimer = setTimeout(() => {
        programmaticScroll = false
        programmaticScrollTimer = null
    }, Math.min(PROGRAMMATIC_SCROLL_IDLE_MS, remaining))
}

function scrollToLine(idx) {
    const el = lineRefs.value[idx]
    if (!el || !lyricsContainer.value) return
    beginProgrammaticScroll()
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function onContainerScroll() {
    if (programmaticScroll) {
        scheduleProgrammaticScrollRelease() // 動畫還在捲，往後延（但不超過總上限）
        return
    }
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
    <div class="h-dvh flex flex-col overflow-hidden bg-stone-50 relative">
        <!-- 返回 bar（sticky 固定頂部，捲動不消失） -->
        <div class="sticky top-0 z-10 flex-shrink-0 bg-white border-b border-stone-200 px-3 py-2">
            <div class="max-w-2xl mx-auto">
                <BackLink size="lg" />
            </div>
        </div>
        <!-- 標頭：限高 + 內部捲動。外層是 h-dvh overflow-hidden，標頭若不
             設上限，使用者把手機字體調大時它會一路長高，把唯一能縮的歌詞區
             壓到 0，再把底部 PlayBar 擠出畫面（外層 overflow-hidden 會直接
             裁掉）→ 播放鈕點不到、整頁不能用。限高後標頭自己捲，歌詞區與
             播放鈕的空間都保得住。一般字級下內容遠低於 40vh，外觀不變。 -->
        <div class="px-3 pt-3 min-h-0 max-h-[40vh] overflow-y-auto" data-testid="player-header">
            <div class="max-w-2xl mx-auto">
                <div class="text-center mb-4">
                    <h1 class="font-bold text-stone-800" style="font-size: clamp(1.5rem, 5vw, 2rem)">
                        {{ song.title_native }}
                    </h1>
                    <p v-if="song.title_zh" class="text-stone-500 mt-1 text-xl">{{ song.title_zh }}</p>
                    <!-- 畫面被放大時（瀏覽器縮放或系統字體調大）隱藏次要功能，
                         讓高齡使用者專注在核心的「聽聲音＋看歌詞對應」。
                         chung 實測後決定採隱藏策略。已知取捨：歌詞閱讀模式、
                         錄唱、回報問題目前只有這一頁有入口，隱藏後放大字體的
                         使用者沒有其他路徑可到達。 -->
                    <div v-if="!isCompact" class="flex flex-wrap items-center justify-center gap-2 mt-2" data-testid="secondary-actions">
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

        <audio v-if="song.audio_full" ref="audio" :src="audioSrc"
            @timeupdate="onTimeUpdate" @loadedmetadata="onLoaded"
            @playing="onPlaying" @pause="onPause"
            @ended="onEnded" @error="onError" />

        <!-- 底部控制列 -->
        <!-- 書號改放播放列、做成可點圖示連到歌詞閱讀頁（chung 設計）。
             放這裡的額外好處：精簡模式隱藏標頭的次要功能後，歌詞閱讀模式
             仍有入口，不會讓放大字體的使用者完全找不到。
             版面用 PlayBar 既有的 flex-wrap 橫排，放大時自然與播放鈕並排，
             真的放不下才換行。 -->
        <PlayBar :playing="isPlaying" :disabled="!song.audio_full || hasError" :label="segmentLabel" @play="togglePlay">
            <template #leading>
                <Link :href="`/songs/${song.id}/reader`"
                    class="min-w-[56px] min-h-[56px] max-w-[80px] max-h-[80px] p-[8px] rounded-full shrink-0
                           flex flex-col items-center justify-center gap-0.5
                           bg-stone-100 text-stone-600 hover:bg-stone-200 active:scale-95 transition-transform"
                    data-testid="reader-shortcut"
                    :aria-label="song.book_number ? `歌本第 ${song.book_number} 頁，開啟歌詞閱讀模式` : '開啟歌詞閱讀模式'">
                    <span class="leading-none text-[min(1.5rem,28px)]" aria-hidden="true">📖</span>
                    <span class="leading-none font-mono font-semibold text-[min(0.75rem,15px)]">{{ song.book_number || '歌詞' }}</span>
                </Link>
            </template>
        </PlayBar>
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

    <!-- 診斷模式：由後端 .env 的 PLAYER_DIAGNOSTICS 控制，平常關閉。
         欄位說明（給下次出問題時對照用）：
         real  = audio 元素回報的實際播放位置（秒）
         t     = 畫面拿去算歌詞高亮用的時間（正常時等於 real；虛擬計時中為估算值）
         idx   = 目前高亮的歌詞行索引（-1 = 沒有任何一行被高亮）
         virt  = 是否已切換到虛擬計時（真實回報卡住時的備援）
         seg   = 是否在逐段播放模式
         play  = 是否正在播放
         cold  = 這次頁面是不是瀏覽器整頁載入（false = 站內導覽進來的）
         src   = 音檔網址結尾，用來確認有沒有正確帶上 #t= 起始秒數 -->
    <div v-if="showDiagnostics"
        class="fixed bottom-1 left-1 z-[999] text-xs text-white bg-black/70 px-2 py-1 rounded font-mono pointer-events-none">
        （診斷）real={{ audio?.currentTime?.toFixed(2) ?? '-' }} | t={{ currentTime.toFixed(2) }} | idx={{ activeLineIndex }} | virt={{ usingVirtualTime }} | seg={{ segmentMode }} | play={{ isPlaying }} | cold={{ isColdLoad }} | src=…{{ audioSrc?.slice(-14) ?? '-' }}
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
