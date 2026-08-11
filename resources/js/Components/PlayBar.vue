<script setup>
import { computed } from 'vue'

// 底部播放列：圓形 icon 按鈕，SongPlayer 與 RecordingMode 共用。
const props = defineProps({
    playing: { type: Boolean, default: false }, // ▶/⏸ 切換
    disabled: { type: Boolean, default: false },
    label: { type: String, default: '' }, // 按鈕上方說明文字，空字串不顯示
    stopMode: { type: Boolean, default: false }, // true 時顯示 ⏹ 停止（整體播放中）
})
const emit = defineEmits(['play', 'stop'])

const icon = computed(() => (props.stopMode ? '⏹' : props.playing ? '⏸' : '▶'))
const ariaLabel = computed(() => (props.stopMode ? '停止播放' : props.playing ? '暫停' : '播放'))

function onClick() {
    if (props.disabled) return
    if (props.stopMode) emit('stop')
    else emit('play')
}
</script>

<template>
    <div class="flex-shrink-0 bg-white border-t border-stone-200 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div class="max-w-2xl mx-auto flex flex-col items-center gap-2">
            <p v-if="label" class="text-stone-600 font-medium text-lg">{{ label }}</p>
            <button @click="onClick" :disabled="disabled" :aria-label="ariaLabel"
                :class="['w-16 h-16 rounded-full text-2xl flex items-center justify-center transition-transform active:scale-95',
                    disabled ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        : stopMode ? 'bg-stone-700 text-white hover:bg-stone-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700']">
                {{ icon }}
            </button>
        </div>
    </div>
</template>
