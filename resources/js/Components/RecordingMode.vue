<script setup>
import { onMounted, onBeforeUnmount, computed } from 'vue'
import { useSongRecorder } from '@/recording/useSongRecorder.js'

const props = defineProps({
    song: { type: Object, required: true },
    // 依賴注入（測試用）：store / micRecorder / audioFactory / playStep
    options: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close'])

const rec = useSongRecorder(props.song, props.options)

// 有某段正在錄音時，其他段的按鈕鎖住（一次只錄一段）
const isSomeRecording = computed(() => rec.recordingLineId.value !== null)

onMounted(() => {
    rec.load()
    rec.prepare() // 預取麥克風授權，之後按錄音才能即時開始
})
onBeforeUnmount(() => { rec.stopPlayAll(); rec.dispose() })

function toggleRecord(line) {
    if (rec.isRecording(line.id)) rec.stopRecording()
    else rec.startRecording(line.id)
}
</script>

<template>
    <div class="fixed inset-0 z-[60] bg-stone-50 flex flex-col">
        <!-- 標頭 -->
        <div class="flex-shrink-0 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 border-b border-stone-200 bg-white">
            <div class="max-w-2xl mx-auto flex items-center gap-3">
                <button @click="emit('close')" aria-label="關閉錄音"
                    class="text-stone-500 hover:text-stone-800 text-2xl leading-none">✕</button>
                <div class="flex-1 min-w-0">
                    <h2 class="font-bold text-stone-800 truncate">{{ song.title_native }}</h2>
                    <p class="text-stone-500 text-sm">點段落開始錄音、再點一次停止</p>
                </div>
            </div>
        </div>

        <!-- 提示 -->
        <div class="flex-shrink-0 px-4 py-2 bg-amber-50 border-b border-amber-100 text-amber-800 text-sm text-center">
            未錄的段落播放時會用原唱補上，音色會和你的清唱不同，這是正常的。
        </div>

        <div v-if="rec.error.value" role="alert"
            class="flex-shrink-0 px-4 py-2 bg-red-50 text-red-700 text-sm text-center">
            <template v-if="rec.error.value === 'empty'">這段錄音沒有聲音，請再錄一次。</template>
            <template v-else>無法取得麥克風，請確認瀏覽器已授權後重新整理頁面。</template>
        </div>

        <!-- 段落清單 -->
        <div class="flex-1 overflow-y-auto min-h-0 px-3 py-4">
            <div class="max-w-2xl mx-auto space-y-3">
                <div v-for="line in song.lines" :key="line.id"
                    :aria-current="rec.playingLineId.value === line.id ? 'true' : undefined"
                    :class="['rounded-xl border p-3',
                        rec.playingLineId.value === line.id ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300'
                            : rec.isRecording(line.id) ? 'border-red-400 bg-red-50'
                            : 'border-stone-200 bg-white']">
                    <p class="font-semibold text-stone-800 leading-snug mb-3" style="font-size: clamp(1.25rem, 4vw, 1.75rem)">
                        {{ line.text_native }}
                    </p>
                    <div class="flex items-center gap-2">
                        <button
                            :aria-label="`錄音段落 ${line.order}`"
                            @click="toggleRecord(line)"
                            :disabled="isSomeRecording && !rec.isRecording(line.id)"
                            :class="['flex-1 rounded-full py-2.5 text-white font-medium active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed',
                                rec.isRecording(line.id) ? 'bg-red-600'
                                    : rec.hasRecording(line.id) ? 'bg-amber-600 hover:bg-amber-500'
                                    : 'bg-blue-600 hover:bg-blue-700']">
                            <template v-if="rec.isRecording(line.id)">● 錄音中⋯點擊停止</template>
                            <template v-else-if="rec.hasRecording(line.id)">🔴 重新錄音</template>
                            <template v-else>● 開始錄音</template>
                        </button>
                        <button v-if="rec.hasRecording(line.id) && !rec.isRecording(line.id)"
                            :aria-label="rec.previewLineId.value === line.id ? `暫停段落 ${line.order}` : `播放段落 ${line.order}`"
                            @click="rec.playSegment(line.id)"
                            :disabled="isSomeRecording"
                            class="flex-shrink-0 rounded-full px-4 py-2.5 bg-stone-200 text-stone-700 font-medium hover:bg-stone-300 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed">
                            <template v-if="rec.previewLineId.value === line.id">⏸ 暫停</template>
                            <template v-else>▶ 播放</template>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 整體播放 -->
        <div class="flex-shrink-0 bg-white border-t border-stone-200 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div class="max-w-2xl mx-auto">
                <button v-if="!rec.isPlayingAll.value"
                    @click="rec.playAll()"
                    aria-label="整體播放我的接唱版本"
                    class="w-full rounded-full py-3 bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 active:scale-95 transition-transform">
                    ▶ 整體播放我的版本
                </button>
                <button v-else
                    @click="rec.stopPlayAll()"
                    aria-label="停止整體播放"
                    class="w-full rounded-full py-3 bg-stone-700 text-white font-bold text-lg hover:bg-stone-600 active:scale-95 transition-transform">
                    ⏹ 停止播放
                </button>
            </div>
        </div>
    </div>
</template>
