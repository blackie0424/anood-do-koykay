<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import AdminLayout from '@/Layouts/AdminLayout.vue'

const props = defineProps({ song: Object })

const titleNative = ref(props.song?.title_native ?? '')
const titleZh = ref(props.song?.title_zh ?? '')
const titleEditing = ref(false)
const titleSaving = ref(false)
const titleSaved = ref(false)
let titleSaveTimer = null

const CHORD_RE = /^[A-G](m|maj|dim|aug|min)?(maj7|m7|dim7|mmaj7|7|9|11|13|6|sus2|sus4|add9|add2)?(#|b)?(\/[A-G])?$/

function isFilteredLine(line) {
    const t = line.trim()
    if (!t) return true
    if (/^[\d\s\-\.|·•:]+$/.test(t)) return true
    const tokens = t.split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return true
    const chordCount = tokens.filter(tok => CHORD_RE.test(tok)).length
    const numericCount = tokens.filter(tok => /^\d+$/.test(tok)).length
    if (chordCount / tokens.length > 0.6) return true
    if (numericCount / tokens.length > 0.4) return true
    return false
}

const lines = ref(
    props.song?.lines?.length
        ? props.song.lines
            .filter(l => !isFilteredLine(l.text_native || ''))
            .map((l, i) => ({ ...l, order: i + 1 }))
        : [{ order: 1, text_native: '', text_zh: '', start_time: null, end_time: null }]
)

function filterOcrLines(ocrRaw) {
    if (!ocrRaw) return ''
    const titleWords = (props.song.title_native || '').toLowerCase().split(/\s+/).filter(Boolean)
    return ocrRaw.split('\n').filter((line, idx) => {
        const t = line.trim()
        if (!t) return false
        if (idx === 0 && titleWords.length > 0) {
            const lower = t.toLowerCase()
            return titleWords.some(w => lower.includes(w))
        }
        return !isFilteredLine(line)
    }).join('\n')
}

const filteredOcrRaw = computed(() => {
    const scores = props.song?.scores ?? []
    if (!scores.length) return ''
    return scores.map((score, i) => {
        const filtered = filterOcrLines(score.ocr_raw || '')
        return scores.length > 1 ? `--- 第${i + 1}張 ---\n${filtered}` : filtered
    }).filter(Boolean).join('\n\n')
})

const lightboxUrl = ref(null)

function openLightbox(url) {
    lightboxUrl.value = url
}

function closeLightbox() {
    lightboxUrl.value = null
}

function onLightboxKey(e) {
    if (e.key === 'Escape') closeLightbox()
}

watch(lightboxUrl, (url) => {
    if (url) {
        document.addEventListener('keydown', onLightboxKey)
    } else {
        document.removeEventListener('keydown', onLightboxKey)
    }
})

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

function onTitleInput() {
    clearTimeout(titleSaveTimer)
    titleSaveTimer = setTimeout(saveTitle, 500)
}

async function saveTitle() {
    titleSaving.value = true
    try {
        await axios.put(`/api/admin/songs/${props.song.id}`, {
            title_native: titleNative.value,
            title_zh: titleZh.value,
        })
        titleSaved.value = true
        setTimeout(() => { titleSaved.value = false }, 2000)
    } finally {
        titleSaving.value = false
    }
}

function markStart(line) {
    line.start_time = Math.round(currentTime.value * 10) / 10
}

function markEnd(line, idx) {
    line.end_time = Math.round(currentTime.value * 10) / 10
    if (lines.value[idx + 1]) lines.value[idx + 1].start_time = Math.round(currentTime.value * 10) / 10
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
            <!-- Step Navbar -->
            <div class="px-6 py-3 bg-white border-b shadow-sm">
                <div class="flex items-center justify-between">
                    <nav class="flex items-center gap-1 text-sm min-w-0 flex-1">
                        <a :href="`/admin/songs/${song.id}/edit`" class="text-stone-400 hover:text-blue-600 shrink-0">基本資料</a>
                        <span class="text-stone-300 mx-1 shrink-0">›</span>
                        <a :href="`/admin/songs/${song.id}/media`" class="text-stone-400 hover:text-blue-600 shrink-0">媒體上傳</a>
                        <span class="text-stone-300 mx-1 shrink-0">›</span>
                        <!-- Inline title display / edit -->
                        <span class="shrink-0">(</span>
                        <template v-if="!titleEditing">
                            <span class="text-stone-600 font-medium truncate max-w-xs">{{ titleNative || '族語名稱' }}</span>
                            <template v-if="titleZh">
                                <span class="text-stone-400 mx-0.5">/</span>
                                <span class="text-stone-600 truncate max-w-[8rem]">{{ titleZh }}</span>
                            </template>
                        </template>
                        <template v-else>
                            <input v-model="titleNative" @input="onTitleInput" @blur="titleEditing = false" placeholder="族語名稱"
                                class="border rounded px-2 py-0.5 text-sm w-full max-w-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                            <span class="text-stone-400 mx-1">/</span>
                            <input v-model="titleZh" @input="onTitleInput" @blur="titleEditing = false" placeholder="中文名稱"
                                class="border rounded px-2 py-0.5 text-sm w-full max-w-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                            <span v-if="titleSaving" class="text-stone-400 text-xs ml-1">儲存中…</span>
                            <span v-else-if="titleSaved" class="text-green-600 text-xs ml-1">✓</span>
                        </template>
                        <span class="shrink-0">)</span>
                        <span class="font-semibold text-stone-800 ml-1 shrink-0">歌詞編輯</span>
                        <button @click="titleEditing = !titleEditing"
                            class="ml-1 text-stone-400 hover:text-blue-500 text-xs px-1 shrink-0" title="編輯歌曲名稱">✏️</button>
                    </nav>
                    <div class="flex items-center gap-3 shrink-0">
                        <span v-if="saveSuccess" class="text-green-600 text-sm">✓ 已儲存</span>
                        <button @click="saveLines" :disabled="saving"
                            class="bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700 disabled:opacity-50 text-sm">
                            {{ saving ? '儲存中…' : '儲存歌詞' }}
                        </button>
                    </div>
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

            <!-- Three-column Content -->
            <div class="flex flex-1 overflow-hidden">
                <!-- Col 1: Score Images -->
                <div class="w-1/3 border-r overflow-y-auto p-4 bg-stone-50">
                    <p class="text-xs text-stone-400 mb-2 font-medium">原圖（點擊放大）</p>
                    <template v-if="song.scores?.length">
                        <div v-for="(score, i) in song.scores" :key="score.id" class="mb-3">
                            <p v-if="song.scores.length > 1" class="text-xs text-stone-400 mb-1">第 {{ i + 1 }} 張</p>
                            <img :src="score.image_url" alt="樂譜"
                                class="w-full rounded border cursor-zoom-in hover:opacity-90 transition-opacity"
                                @click="openLightbox(score.image_url)" />
                        </div>
                    </template>
                    <p v-else class="text-stone-400 text-center mt-8 text-sm">尚未上傳樂譜</p>
                </div>

                <!-- Col 2: OCR Raw -->
                <div class="w-1/3 border-r overflow-y-auto p-4 bg-stone-50">
                    <p class="text-xs text-stone-400 mb-2 font-medium">OCR 辨識結果（可複製）</p>
                    <pre v-if="filteredOcrRaw" class="font-mono text-xs whitespace-pre-wrap text-stone-700 select-text cursor-text">{{ filteredOcrRaw }}</pre>
                    <p v-else class="text-stone-400 text-center mt-8 text-sm">尚無 OCR 資料</p>
                </div>

                <!-- Col 3: Lyrics Editor -->
                <div class="w-1/3 overflow-y-auto p-4 space-y-3">
                    <p class="text-xs text-stone-400 font-medium">歌詞編輯</p>
                    <div v-for="(line, idx) in lines" :key="idx"
                        class="bg-white rounded-lg border p-3 space-y-2">
                        <div class="flex items-start gap-2">
                            <span class="text-stone-400 font-mono text-xs w-5 mt-2">{{ idx + 1 }}</span>
                            <textarea v-model="line.text_native" placeholder="族語歌詞" rows="2"
                                class="flex-1 border rounded px-2 py-1 text-sm resize-y" />
                            <textarea v-model="line.text_zh" placeholder="中文翻譯" rows="2"
                                class="flex-1 border rounded px-2 py-1 text-sm resize-y" />
                            <button @click="removeLine(idx)"
                                class="text-red-400 hover:text-red-600 text-xs px-1 mt-1">✕</button>
                        </div>
                        <div class="flex items-center gap-2 pl-7">
                            <button @click="markStart(line)"
                                class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200">
                                標記起始
                            </button>
                            <input v-model.number="line.start_time" type="number" step="0.1" placeholder="起始(秒)"
                                class="w-20 border rounded px-2 py-0.5 text-xs" />
                            <button @click="markEnd(line, idx)"
                                class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded hover:bg-orange-200">
                                標記結束
                            </button>
                            <input v-model.number="line.end_time" type="number" step="0.1" placeholder="結束(秒)"
                                class="w-20 border rounded px-2 py-0.5 text-xs" />
                        </div>
                    </div>

                    <button @click="addLine"
                        class="w-full border-2 border-dashed border-stone-300 text-stone-400 rounded-lg py-2 text-sm hover:border-blue-400 hover:text-blue-500">
                        + 新增一行
                    </button>
                </div>
            </div>
        </div>

        <!-- Lightbox -->
        <Teleport to="body">
            <div v-if="lightboxUrl"
                class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-zoom-out"
                @click="closeLightbox"
                @keydown="onLightboxKey"
                tabindex="0">
                <img :src="lightboxUrl" alt="樂譜放大"
                    class="max-w-[95vw] max-h-[95vh] object-contain rounded shadow-2xl"
                    @click.stop />
            </div>
        </Teleport>
    </AdminLayout>
</template>
