<script setup>
import { ref, computed, watch } from 'vue'

// 底部播放列：圓形 icon 按鈕，SongPlayer 與 RecordingMode 共用。
const props = defineProps({
    playing: { type: Boolean, default: false }, // ▶/⏸ 切換
    disabled: { type: Boolean, default: false },
    label: { type: String, default: '' }, // 按鈕上方說明文字，空字串不顯示
    stopMode: { type: Boolean, default: false }, // true 時顯示 ⏹ 停止（整體播放中）
})
const emit = defineEmits(['play', 'stop'])

const loading = ref(false)
// 父層操作完成（playing 改變）時離開 loading
watch(() => props.playing, () => { loading.value = false })

const icon = computed(() => (props.stopMode ? '⏹' : props.playing ? '⏸' : '▶'))
const ariaLabel = computed(() => (props.stopMode ? '停止播放' : props.playing ? '暫停' : '播放'))

// 點擊音效：短促 beep（800Hz、80ms、快速淡出）；不支援 Web Audio 時靜默失敗
function playBeep() {
    try {
        const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
        if (!AC) return
        const ctx = new AC()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = 800
        osc.connect(gain)
        gain.connect(ctx.destination)
        const now = ctx.currentTime
        gain.gain.setValueAtTime(0.2, now)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08)
        osc.start(now)
        osc.stop(now + 0.08)
        osc.onended = () => { try { ctx.close() } catch { /* noop */ } }
    } catch { /* 不支援時靜默 */ }
}

function onClick() {
    if (props.disabled || loading.value) return
    playBeep()
    loading.value = true
    if (props.stopMode) emit('stop')
    else emit('play')
}
</script>

<template>
    <div class="flex-shrink-0 bg-white border-t border-stone-200 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div class="max-w-2xl mx-auto flex flex-col items-center gap-2">
            <p v-if="label" class="text-stone-600 font-medium text-lg">{{ label }}</p>
            <button @click="onClick" :disabled="disabled || loading" :aria-label="ariaLabel"
                :class="['w-16 h-16 rounded-full text-2xl flex items-center justify-center transition-transform active:scale-95',
                    disabled ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        : loading ? 'bg-stone-400 text-white cursor-wait'
                        : stopMode ? 'bg-stone-700 text-white hover:bg-stone-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700']">
                {{ icon }}
            </button>
        </div>
    </div>
</template>
