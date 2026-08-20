<script setup>
import { ref, computed, watch } from 'vue'
import AppButton from '@/Components/AppButton.vue'

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

// 音效與按壓回饋由 AppButton 統一處理；這裡只管「這次點擊要不要生效」。
// 處理中（loading）時不該再送出事件，也不該發聲——聽到聲音卻沒反應會誤導。
function onClick() {
    if (props.disabled || loading.value) return
    loading.value = true
    if (props.stopMode) emit('stop')
    else emit('play')
}
</script>

<template>
    <div class="flex-shrink-0 bg-white border-t border-stone-200 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <!-- 狀態文字改放按鈕右側（原本在上方，多佔一整行）。放不下時
             flex-wrap 會讓文字換到下一行，不會擠壓或溢出按鈕。 -->
        <div class="max-w-2xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <!-- leading：父層可在播放鈕左側放額外的操作（例如播放頁的頁碼／
                 歌詞捷徑）。PlayBar 不需要知道放的是什麼，維持單一職責。 -->
            <slot name="leading" />
            <AppButton @click="onClick" :disabled="disabled || loading" :aria-label="ariaLabel"
                :class="['w-16 h-16 max-w-[96px] max-h-[96px] shrink-0 rounded-full text-2xl flex items-center justify-center',
                    disabled ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        : loading ? 'bg-stone-400 text-white cursor-wait'
                        : stopMode ? 'bg-stone-700 text-white hover:bg-stone-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700']">
                {{ icon }}
            </AppButton>
            <p v-if="label" class="text-stone-600 font-medium text-lg">{{ label }}</p>
        </div>
    </div>
</template>
