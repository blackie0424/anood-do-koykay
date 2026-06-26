<script setup>
import { ref } from 'vue'
import AdminLayout from '@/Layouts/AdminLayout.vue'

const props = defineProps({ song: Object })

const lines = ref(
    props.song?.lines?.length
        ? props.song.lines.map(l => ({ ...l }))
        : [{ order: 1, text_native: '', text_zh: '', start_time: null, end_time: null }]
)

const audioRef = ref(null)
const currentTime = ref(0)
const saving = ref(false)
const saveSuccess = ref(false)

function formatTime(sec) {
    if (sec == null) return ''
    const m = Math.floor(sec / 60)
    const s = (sec % 60).toFixed(1).padStart(4, '0')
    return `${m}:${s}`
}

function onTimeUpdate() {
    currentTime.value = audioRef.value?.currentTime ?? 0
}

function markStart(line) {
    line.start_time = Math.round(currentTime.value * 10) / 10
}

function markEnd(line) {
    line.end_time = Math.round(currentTime.value * 10) / 10
}

function addLine() {
    lines.value.push({
        order: lines.value.length + 1,
        text_native: '', text_zh: '',
        start_time: null, end_time: null,
    })
}

function removeLine(idx) {
    lines.value.splice(idx, 1)
    lines.value.forEach((l, i) => { l.order = i + 1 })
}

async function saveLines() {
    saving.value = true
    saveSuccess.value = false
    try {
        await axios.post(`/api/admin/songs/${props.song.id}/lines/batch`, {
            lines: lines.value,
        })
        saveSuccess.value = true
        setTimeout(() => { saveSuccess.value = false }, 2000)
    } finally {
        saving.value = false
    }
}
</script>

<template>
    <AdminLayout>
        <div class="flex flex-col h-screen overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm">
                <div class="flex items-center gap-4">
                    <a :href="`/admin/songs/${song.id}/media`" class="text-blue-600 hover:underline text-sm">← 媒體上傳</a>
                    <h1 class="text-xl font-bold">歌詞編輯 — {{ song.title_native }}</h1>
                </div>
                <div class="flex items-center gap-3">
                    <span v-if="saveSuccess" class="text-green-600 text-sm">✓ 已儲存</span>
                    <button @click="saveLines" :disabled="saving"
                        class="bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700 disabled:opacity-50 text-sm">
                        {{ saving ? '儲存中…' : '儲存歌詞' }}
                    </button>
                </div>
            </div>

            <!-- Audio Player -->
            <div v-if="song.audio_full" class="px-6 py-2 bg-stone-50 border-b flex items-center gap-4">
                <audio ref="audioRef" :src="song.audio_full" controls
                    @timeupdate="onTimeUpdate" class="flex-1 h-9" />
                <span class="text-stone-600 font-mono text-sm w-16 text-right">
                    {{ formatTime(currentTime) }}
                </span>
            </div>

            <!-- Main Content -->
            <div class="flex flex-1 overflow-hidden">
                <!-- Left: Score Image -->
                <div class="w-2/5 border-r overflow-y-auto p-4 bg-stone-50">
                    <img v-if="song.score_image" :src="song.score_image" alt="樂譜"
                        class="w-full rounded border" />
                    <p v-else class="text-stone-400 text-center mt-8">尚未上傳樂譜</p>
                </div>

                <!-- Right: Lyrics List -->
                <div class="w-3/5 overflow-y-auto p-4 space-y-3">
                    <div v-for="(line, idx) in lines" :key="idx"
                        class="bg-white rounded-lg border p-3 space-y-2">
                        <div class="flex items-center gap-2">
                            <span class="text-stone-400 font-mono text-xs w-5">{{ idx + 1 }}</span>
                            <input v-model="line.text_native" placeholder="族語歌詞"
                                class="flex-1 border rounded px-2 py-1 text-sm" />
                            <input v-model="line.text_zh" placeholder="中文翻譯"
                                class="flex-1 border rounded px-2 py-1 text-sm" />
                            <button @click="removeLine(idx)"
                                class="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                        </div>
                        <div class="flex items-center gap-2 pl-7">
                            <button @click="markStart(line)"
                                class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200">
                                標記起始
                            </button>
                            <input v-model.number="line.start_time" type="number" step="0.1" placeholder="起始(秒)"
                                class="w-24 border rounded px-2 py-0.5 text-xs" />
                            <button @click="markEnd(line)"
                                class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded hover:bg-orange-200">
                                標記結束
                            </button>
                            <input v-model.number="line.end_time" type="number" step="0.1" placeholder="結束(秒)"
                                class="w-24 border rounded px-2 py-0.5 text-xs" />
                        </div>
                    </div>

                    <button @click="addLine"
                        class="w-full border-2 border-dashed border-stone-300 text-stone-400 rounded-lg py-2 text-sm hover:border-blue-400 hover:text-blue-500">
                        + 新增一行
                    </button>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>
