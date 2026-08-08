<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useSongRecorder } from '@/recording/useSongRecorder.js'

const props = defineProps({
    song: { type: Object, required: true },
    // 依賴注入（測試用）：store / recorderFactory / audioFactory / playStep
    options: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close'])

const rec = useSongRecorder(props.song, props.options)

onMounted(() => { rec.load() })
onBeforeUnmount(() => { rec.stopPlayAll(); rec.dispose() })

function onHoldStart(line, e) {
    e.preventDefault()
    rec.startRecording(line.id)
}
function onHoldEnd(line) {
    if (rec.isRecording(line.id)) rec.stopRecording()
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
                    <p class="text-stone-500 text-sm">壓住段落錄音、放開結束</p>
                </div>
            </div>
        </div>

        <!-- 提示 -->
        <div class="flex-shrink-0 px-4 py-2 bg-amber-50 border-b border-amber-100 text-amber-800 text-sm text-center">
            未錄的段落播放時會用原唱補上，音色會和你的清唱不同，這是正常的。
        </div>

        <div v-if="rec.error.value === 'mic'"
            class="flex-shrink-0 px-4 py-2 bg-red-50 text-red-700 text-sm text-center">
            無法使用麥克風，請確認已授權錄音權限。
        </div>

        <!-- 段落清單 -->
        <div class="flex-1 overflow-y-auto min-h-0 px-3 py-4">
            <div class="max-w-2xl mx-auto space-y-3">
                <div v-for="line in song.lines" :key="line.id"
                    :class="['rounded-xl border p-3',
                        rec.isRecording(line.id) ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-white']">
                    <p class="font-semibold text-stone-800 leading-snug mb-3" style="font-size: clamp(1.25rem, 4vw, 1.75rem)">
                        {{ line.text_native }}
                    </p>
                    <div class="flex items-center gap-2">
                        <button
                            :aria-label="`錄音段落 ${line.order}`"
                            @pointerdown="onHoldStart(line, $event)"
                            @pointerup="onHoldEnd(line)"
                            @pointerleave="onHoldEnd(line)"
                            @pointercancel="onHoldEnd(line)"
                            @contextmenu.prevent
                            :class="['flex-1 select-none touch-none rounded-full py-2.5 text-white font-medium active:scale-95 transition-transform',
                                rec.isRecording(line.id) ? 'bg-red-600' : 'bg-blue-600 hover:bg-blue-700']">
                            <template v-if="rec.isRecording(line.id)">● 錄音中…放開結束</template>
                            <template v-else-if="rec.hasRecording(line.id)">● 壓住重錄</template>
                            <template v-else>● 壓住錄音</template>
                        </button>
                        <button v-if="rec.hasRecording(line.id)"
                            :aria-label="`播放段落 ${line.order}`"
                            @click.stop="rec.playSegment(line.id)"
                            @pointerdown.stop
                            class="flex-shrink-0 rounded-full px-4 py-2.5 bg-stone-200 text-stone-700 font-medium hover:bg-stone-300 active:scale-95 transition-transform">
                            ▶ 播放
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
