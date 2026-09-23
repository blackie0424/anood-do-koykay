<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import AppButton from '@/Components/AppButton.vue'
import PublicLayout from '@/Layouts/PublicLayout.vue'
import BackLink from '@/Components/BackLink.vue'
import {
    appendRecent,
    createDiagnosticEntry,
    formatDiagnosticEntry,
    withDelayedScale,
} from '@/utils/readerTouchDiagnostics'
import {
    installReaderPassiveTouchListeners,
    READER_PASSIVE_EVENT_TYPES,
} from '@/utils/readerPassiveTouchListeners'

const props = defineProps({ song: Object })

const lines = computed(() => (props.song?.lines ?? []).filter(l => l.text_native?.trim()))
const total = computed(() => lines.value.length)

const currentIdx = ref(0)
const FONT_KEY = 'songReaderFontSize'
const fontSize = ref(3.5)

const diagnosticsEnabled = ref(false)
const diagnosticEntries = ref([])
const diagnosticListenerConfig = ref('D')
const DIAGNOSTIC_LISTENER_CONFIGS = {
    A: [],
    B: ['touchstart', 'touchend', 'pointerdown', 'pointerup'],
    C: ['click', 'dblclick'],
    D: READER_PASSIVE_EVENT_TYPES,
}
const viewportScale = ref(1)
const viewportListenerOptions = { passive: true }
const delayedScaleTimers = new Set()
let longPressTimer = null
let previousEventAt = null
let nextDiagnosticId = 1
let removeReaderPassiveTouchListeners = null
let removeExperimentalTouchListeners = null

const diagnosticLines = computed(() => (
    [...diagnosticEntries.value].reverse().map(formatDiagnosticEntry)
))

const diagnosticEnvironment = computed(() => {
    const navigatorStandalone = navigator.standalone === true
    const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false

    return [
        `navigator.standalone=${navigatorStandalone}`,
        `display-mode:standalone=${displayModeStandalone}`,
        `UA=${navigator.userAgent}`,
    ].join(' | ')
})

function readViewportScale() {
    return window.visualViewport?.scale ?? 1
}

function updateViewportScale() {
    viewportScale.value = readViewportScale()
}

function recordDiagnosticEvent(event) {
    const now = performance.now()
    updateViewportScale()

    const entry = createDiagnosticEntry(event, {
        id: nextDiagnosticId++,
        now,
        previousAt: previousEventAt,
        scale: viewportScale.value,
        getStyle: (element) => window.getComputedStyle(element),
        elementFromPoint: (x, y) => document.elementFromPoint?.(x, y) ?? null,
    })
    previousEventAt = now
    diagnosticEntries.value = appendRecent(diagnosticEntries.value, entry)

    if (event.type === 'touchend') {
        const timer = window.setTimeout(() => {
            delayedScaleTimers.delete(timer)
            updateViewportScale()
            diagnosticEntries.value = withDelayedScale(
                diagnosticEntries.value,
                entry.id,
                viewportScale.value,
            )
        }, 400)
        delayedScaleTimers.add(timer)
    }
}

function clearDelayedScaleTimers() {
    for (const timer of delayedScaleTimers) window.clearTimeout(timer)
    delayedScaleTimers.clear()
}

function clearDiagnostics() {
    clearDelayedScaleTimers()
    diagnosticEntries.value = []
    previousEventAt = null
}

function installDiagnosticListenerConfig(config) {
    removeExperimentalTouchListeners?.()
    removeExperimentalTouchListeners = null
    diagnosticListenerConfig.value = config
    clearDiagnostics()

    const eventTypes = DIAGNOSTIC_LISTENER_CONFIGS[config]
    if (eventTypes.length) {
        removeExperimentalTouchListeners = installReaderPassiveTouchListeners(
            document,
            eventTypes,
            recordDiagnosticEvent,
        )
    }
}

function startDiagnostics() {
    if (diagnosticsEnabled.value) return

    removeReaderPassiveTouchListeners?.()
    removeReaderPassiveTouchListeners = null
    diagnosticsEnabled.value = true
    updateViewportScale()
    installDiagnosticListenerConfig('D')
    window.visualViewport?.addEventListener('resize', updateViewportScale, viewportListenerOptions)
    window.visualViewport?.addEventListener('scroll', updateViewportScale, viewportListenerOptions)
}

function stopDiagnostics({ restoreDefault = true } = {}) {
    if (!diagnosticsEnabled.value) return

    removeExperimentalTouchListeners?.()
    removeExperimentalTouchListeners = null
    window.visualViewport?.removeEventListener('resize', updateViewportScale, viewportListenerOptions)
    window.visualViewport?.removeEventListener('scroll', updateViewportScale, viewportListenerOptions)
    clearDelayedScaleTimers()
    diagnosticsEnabled.value = false
    diagnosticListenerConfig.value = 'D'
    previousEventAt = null
    if (restoreDefault && !removeReaderPassiveTouchListeners) {
        removeReaderPassiveTouchListeners = installReaderPassiveTouchListeners(document)
    }
}

function toggleDiagnostics() {
    diagnosticsEnabled.value ? stopDiagnostics() : startDiagnostics()
}

function cancelDiagnosticsLongPress() {
    if (longPressTimer == null) return
    window.clearTimeout(longPressTimer)
    longPressTimer = null
}

function startDiagnosticsLongPress() {
    cancelDiagnosticsLongPress()
    longPressTimer = window.setTimeout(() => {
        longPressTimer = null
        toggleDiagnostics()
    }, 2000)
}

onMounted(() => {
    const saved = parseFloat(localStorage.getItem(FONT_KEY))
    if (!isNaN(saved) && saved >= 1.5 && saved <= 6) fontSize.value = saved
    removeReaderPassiveTouchListeners = installReaderPassiveTouchListeners(document)
})

onBeforeUnmount(() => {
    stopDiagnostics({ restoreDefault: false })
    removeReaderPassiveTouchListeners?.()
    removeReaderPassiveTouchListeners = null
    cancelDiagnosticsLongPress()
})

function setFontSize(val) {
    fontSize.value = val
    localStorage.setItem(FONT_KEY, val)
}

function prev() {
    if (currentIdx.value > 0) currentIdx.value--
}

function next() {
    if (currentIdx.value < total.value - 1) {
        currentIdx.value++
    }
}

const isLast = computed(() => currentIdx.value === total.value - 1)
const progress = computed(() => total.value > 1 ? (currentIdx.value / (total.value - 1)) * 100 : 100)
const currentLine = computed(() => lines.value[currentIdx.value]?.text_native ?? '')
</script>

<template>
    <PublicLayout>
        <!-- 配色針對高齡使用者（chung 指示避開深色模式）：
             - 深色底白字對年長者反而吃力（水晶體黃化、散光造成光暈），
               改用「淺底深字」這種一般公認較好讀的方向。
             - 底色用與歌曲清單頁相同的暖色 amber-50 而非純白，降低眩光。
             - 對比度實測（WCAG AAA 門檻 7:1）：
               歌詞 16.9:1／歌名 9.9:1／進度 7.4:1／下一段 6.7:1／結束 10.3:1
             - 主要動作用 blue-700 而非全站慣用的 blue-600：白字對比從
               5.2:1 提升到 6.7:1，年長者藍色辨識力下降時仍看得清楚。 -->
        <div class="min-h-dvh flex flex-col bg-amber-50 text-stone-900 select-none">
            <section v-if="diagnosticsEnabled" aria-label="觸控診斷"
                class="fixed inset-x-2 top-2 z-[999] max-h-[48vh] overflow-auto rounded-lg bg-black/90 p-2 text-[10px] leading-tight text-white pointer-events-none">
                <div class="flex items-center justify-between gap-2">
                    <div class="font-bold">
                        [觸控診斷] scale={{ viewportScale }}／目前組合：{{ diagnosticListenerConfig }}
                    </div>
                    <div class="flex gap-1">
                        <button v-for="config in ['A', 'B', 'C', 'D']" :key="config" type="button"
                            :aria-label="'切換觸控監聽器組合 ' + config"
                            class="pointer-events-auto rounded px-2 py-1 text-black"
                            :class="diagnosticListenerConfig === config ? 'bg-amber-300' : 'bg-white'"
                            @click.passive="installDiagnosticListenerConfig(config)">
                            {{ config }}
                        </button>
                        <button type="button" aria-label="清除觸控診斷"
                            class="pointer-events-auto rounded bg-white px-2 py-1 text-black"
                            @click.passive="clearDiagnostics">
                            清除
                        </button>
                        <button type="button" aria-label="關閉觸控診斷"
                            class="pointer-events-auto rounded bg-white px-2 py-1 text-black"
                            @click.passive="stopDiagnostics">
                            關閉
                        </button>
                    </div>
                </div>
                <div class="break-all">{{ diagnosticEnvironment }}</div>
                <div v-if="diagnosticListenerConfig === 'A'" class="mt-1">
                    A 無事件紀錄（完全不掛觸控／點擊監聽器）
                </div>
                <div v-else-if="diagnosticLines.length === 0" class="mt-1">尚無事件</div>
                <pre v-for="(line, index) in diagnosticLines" :key="index"
                    class="mt-1 whitespace-pre-wrap border-t border-white/30 pt-1">{{ line }}</pre>
            </section>

            <!-- 右上角字體調整 -->
            <div class="fixed top-3 right-3 z-10 flex items-center gap-1">
                <AppButton @click="setFontSize(Math.max(1.5, +(fontSize - 0.5).toFixed(1)))"
                    class="w-9 h-9 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-800 flex items-center justify-center text-sm font-bold transition-colors">
                    A-
                </AppButton>
                <AppButton @click="setFontSize(Math.min(6, +(fontSize + 0.5).toFixed(1)))"
                    class="w-9 h-9 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-800 flex items-center justify-center text-sm font-bold transition-colors">
                    A+
                </AppButton>
            </div>

            <!-- 頂部：返回 + 歌曲名稱 + 進度。
                 返回用與播放頁相同的共用元件 BackLink（智慧返回：有瀏覽歷史就
                 回上一頁，否則導回首頁），行為與播放頁完全一致。 -->
            <div class="px-5 pt-4 pb-2 flex-shrink-0">
                <div class="mb-2 pr-24">
                    <BackLink size="lg" />
                </div>
                <p class="text-stone-700 text-sm truncate">{{ song.title_native }}</p>
                <p data-reader-diagnostics-trigger
                    class="text-stone-600 text-xs mt-0.5 select-none [-webkit-touch-callout:none]"
                    @pointerdown.passive="startDiagnosticsLongPress"
                    @pointerup.passive="cancelDiagnosticsLongPress"
                    @pointercancel.passive="cancelDiagnosticsLongPress"
                    @pointerleave.passive="cancelDiagnosticsLongPress">
                    第 {{ currentIdx + 1 }} 段 / 共 {{ total }} 段
                </p>
            </div>

            <!-- 中央歌詞顯示 -->
            <div class="flex-1 flex items-center justify-center px-6 py-8">
                <p class="text-center leading-relaxed font-medium text-stone-900"
                    :style="{ fontSize: fontSize + 'rem' }">
                    {{ currentLine }}
                </p>
            </div>

            <!-- 底部 -->
            <div class="flex-shrink-0 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3">
                <!-- 進度條 -->
                <div class="w-full h-1 bg-stone-200 rounded-full overflow-hidden">
                    <div class="h-full bg-blue-700 rounded-full transition-all duration-300"
                        :style="{ width: progress + '%' }"></div>
                </div>

                <!-- 按鈕列：加 flex-wrap，字體調大時「上一段」變寬不會擠壓
                     右側主要按鈕，放不下就自動換行 -->
                <div class="flex flex-wrap items-center gap-3 touch-manipulation">
                    <!-- 上一段：只留箭頭（chung）。文字拿掉後改用 aria-label
                         提供名稱，螢幕閱讀器仍讀得到用途。箭頭字級放大並設
                         上限，避免跟著系統字體無限變大。 -->
                    <AppButton @click="prev" :disabled="currentIdx === 0"
                        class="px-6 py-3 min-h-16 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 disabled:opacity-40 transition-colors shrink-0 flex items-center justify-center text-[min(1.5rem,30px)] leading-none"
                        aria-label="上一段">
                        ←
                    </AppButton>

                    <!-- 下一段 / 結束。結束保留文字：它是不同性質的動作，沒有
                         通用圖示，只留符號反而看不懂。 -->
                    <template v-if="isLast">
                        <AppButton as="link" :href="`/songs/${song.id}`"
                            class="flex-1 min-h-16 py-3 rounded-xl bg-stone-700 hover:bg-stone-600 text-white flex items-center justify-center text-lg font-semibold transition-colors">
                            結束
                        </AppButton>
                    </template>
                    <AppButton v-else @click="next"
                        class="flex-1 min-h-16 py-3 rounded-xl bg-blue-700 text-white hover:bg-blue-800 flex items-center justify-center transition-colors text-[min(1.75rem,34px)] leading-none"
                        aria-label="下一段">
                        →
                    </AppButton>
                </div>
            </div>
        </div>
    </PublicLayout>
</template>
