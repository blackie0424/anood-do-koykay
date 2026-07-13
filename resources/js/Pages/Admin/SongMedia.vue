<script setup>
import { ref } from 'vue'
import axios from 'axios'
import AdminLayout from '@/Layouts/AdminLayout.vue'
import { parseTime, secondsToMmss } from '@/utils/time'

const props = defineProps({ song: Object })

const scores = ref(props.song?.scores ?? [])
const audioFull = ref(props.song?.audio_full ?? null)
const audioStart = ref(props.song?.audio_start ?? null)
const audioEnd = ref(props.song?.audio_end ?? null)
const trimSaving = ref(false)
const trimSaved = ref(false)
const audioRef = ref(null)
const audioCurrentTime = ref(0)
const scoreUploading = ref(false)
const audioUploading = ref(false)
const scoreError = ref('')
const audioError = ref('')
const reOcrLoadingId = ref(null)
const reOcrSuccessId = ref(null)
const reOcrErrorId = ref(null)
const lightboxUrl = ref(null)

let dragSrcIdx = null


const scoreUploadProgress = ref('')

async function uploadScore(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    scoreUploading.value = true
    scoreError.value = ''
    const errors = []
    for (let i = 0; i < files.length; i++) {
        scoreUploadProgress.value = files.length > 1 ? `上傳第 ${i + 1} / ${files.length} 張…` : '上傳中…'
        const fd = new FormData()
        fd.append('score', files[i])
        try {
            const { data } = await axios.post(`/api/admin/songs/${props.song.id}/scores`, fd)
            scores.value.push(data.score)
            if (data.ocr_error) {
                errors.push(`第 ${i + 1} 張 OCR 失敗：${data.ocr_error}`)
            }
        } catch {
            errors.push(`第 ${i + 1} 張上傳失敗`)
        }
    }
    scoreUploading.value = false
    scoreUploadProgress.value = ''
    scoreError.value = errors.join('；')
    e.target.value = ''
}

async function deleteScore(score) {
    if (!confirm('確定刪除這張樂譜？')) return
    try {
        await axios.delete(`/api/admin/songs/${props.song.id}/scores/${score.id}`)
        scores.value = scores.value.filter(s => s.id !== score.id)
    } catch {
        alert('刪除失敗，請稍後再試')
    }
}

async function reOcr(score) {
    reOcrLoadingId.value = score.id
    reOcrSuccessId.value = null
    reOcrErrorId.value = null
    try {
        const { data } = await axios.post(`/api/admin/songs/${props.song.id}/scores/${score.id}/reocr`)
        const idx = scores.value.findIndex(s => s.id === score.id)
        if (idx !== -1) scores.value[idx] = { ...scores.value[idx], ocr_raw: data.ocr_raw }
        reOcrSuccessId.value = score.id
    } catch {
        reOcrErrorId.value = score.id
    } finally {
        reOcrLoadingId.value = null
    }
}

function onDragStart(idx) {
    dragSrcIdx = idx
}

function onDrop(idx) {
    if (dragSrcIdx === null || dragSrcIdx === idx) return
    const arr = [...scores.value]
    const [moved] = arr.splice(dragSrcIdx, 1)
    arr.splice(idx, 0, moved)
    scores.value = arr
    dragSrcIdx = null
    saveReorder()
}

async function saveReorder() {
    try {
        await axios.put(`/api/admin/songs/${props.song.id}/scores/reorder`, {
            order: scores.value.map(s => s.id),
        })
    } catch {
        alert('排序儲存失敗，請重新整理頁面')
    }
}

function onAudioTimeUpdate() {
    audioCurrentTime.value = audioRef.value?.currentTime ?? 0
}

function markTrimStart() {
    audioStart.value = Math.round(audioCurrentTime.value * 10) / 10
}

function markTrimEnd() {
    audioEnd.value = Math.round(audioCurrentTime.value * 10) / 10
}

async function saveTrim() {
    trimSaving.value = true
    try {
        await axios.put(`/api/admin/songs/${props.song.id}`, {
            audio_start: audioStart.value,
            audio_end: audioEnd.value,
        })
        trimSaved.value = true
        setTimeout(() => { trimSaved.value = false }, 2000)
    } finally {
        trimSaving.value = false
    }
}

async function uploadAudio(e) {
    const file = e.target.files[0]
    if (!file) return
    audioUploading.value = true
    audioError.value = ''
    const fd = new FormData()
    fd.append('audio', file)
    fd.append('type', 'full')
    try {
        const { data } = await axios.post(`/api/admin/songs/${props.song.id}/audio`, fd)
        audioFull.value = data.path
    } catch {
        audioError.value = '上傳失敗，請稍後再試'
    } finally {
        audioUploading.value = false
    }
}
</script>

<template>
    <AdminLayout>
        <div class="p-6 max-w-2xl mx-auto space-y-6">
            <div class="flex items-center gap-4">
                <a :href="`/admin/songs/${song.id}/edit`" class="text-blue-600 hover:underline">← 返回基本資料</a>
                <h1 class="text-2xl font-bold">上傳媒體 — {{ song.title_native }}</h1>
            </div>

            <!-- 樂譜圖片 -->
            <section class="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 class="font-semibold text-lg">樂譜圖片（OCR 自動辨識歌詞）</h2>

                <!-- 已上傳圖片列表（可拖曳排序） -->
                <div v-if="scores.length" class="space-y-3">
                    <div v-for="(score, idx) in scores" :key="score.id"
                        draggable="true"
                        @dragstart="onDragStart(idx)"
                        @dragover.prevent
                        @drop.prevent="onDrop(idx)"
                        class="border rounded-lg bg-stone-50 cursor-grab overflow-hidden">
                        <!-- 圖片 -->
                        <img :src="score.image_url" alt="樂譜"
                            class="w-full object-contain max-h-96 bg-white cursor-zoom-in hover:opacity-90 transition-opacity"
                            @click="lightboxUrl = score.image_url" />
                        <!-- 辨識中提示 -->
                        <div v-if="reOcrLoadingId === score.id"
                            class="flex items-center justify-center gap-2 px-3 py-3 bg-blue-50 border-t border-blue-100 text-blue-700 text-sm font-medium">
                            <svg class="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            辨識中，請稍候…
                        </div>
                        <!-- 操作列 -->
                        <div v-else class="flex items-center gap-3 px-3 py-2 border-t">
                            <span class="text-stone-400 font-mono text-xs select-none">第 {{ idx + 1 }} 張</span>
                            <div class="flex-1">
                                <p v-if="reOcrSuccessId === score.id" class="text-green-600 text-xs">✓ 辨識完成</p>
                                <p v-if="reOcrErrorId === score.id" class="text-red-500 text-xs">辨識失敗</p>
                            </div>
                            <button @click="reOcr(score)"
                                class="text-xs text-blue-600 hover:underline">
                                重新辨識
                            </button>
                            <button @click="deleteScore(score)"
                                class="text-xs text-red-400 hover:text-red-600">✕ 刪除</button>
                        </div>
                    </div>
                    <p class="text-xs text-stone-400">拖曳可調整順序，調整後自動儲存</p>
                </div>

                <div>
                    <input type="file" accept="image/jpg,image/jpeg,image/png,image/webp"
                        multiple @change="uploadScore" :disabled="scoreUploading" class="block" />
                    <p v-if="scoreUploading" class="text-stone-500 text-sm mt-1">{{ scoreUploadProgress }}</p>
                    <p v-if="scoreError" class="text-yellow-600 text-sm mt-1">⚠️ {{ scoreError }}</p>
                </div>
            </section>

            <!-- 完整錄音 -->
            <section class="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 class="font-semibold text-lg">完整錄音</h2>
                <audio v-if="audioFull" ref="audioRef" :src="audioFull" controls class="w-full"
                    @timeupdate="onAudioTimeUpdate" />
                <!-- 播放區間設定 -->
                <div v-if="audioFull" class="border rounded-lg p-3 space-y-2 bg-stone-50">
                    <p class="text-xs text-stone-500 font-medium">播放區間（跳過頭尾）</p>
                    <div class="flex flex-wrap items-center gap-2">
                        <button @click="markTrimStart"
                            class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                            標記起始
                        </button>
                        <input type="text"
                            :value="secondsToMmss(audioStart)"
                            placeholder="0:00.0"
                            class="w-24 border rounded px-2 py-1 text-xs font-mono"
                            @change="e => { audioStart.value = parseTime(e.target.value) }" />
                        <button @click="markTrimEnd"
                            class="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200">
                            標記結束
                        </button>
                        <input type="text"
                            :value="secondsToMmss(audioEnd)"
                            placeholder="0:00.0"
                            class="w-24 border rounded px-2 py-1 text-xs font-mono"
                            @change="e => { audioEnd.value = parseTime(e.target.value) }" />
                        <button @click="saveTrim" :disabled="trimSaving"
                            class="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50">
                            {{ trimSaving ? '儲存中…' : '儲存區間' }}
                        </button>
                        <span v-if="trimSaved" class="text-green-600 text-xs">✓ 已儲存</span>
                    </div>
                    <p class="text-xs text-stone-400">播放時自動從起始秒數開始，到結束秒數暫停。留空則從頭播到尾。</p>
                </div>
                <input type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/aac,.mp3,.wav,.ogg,.m4a,.aac"
                    @change="uploadAudio" :disabled="audioUploading" class="block" />
                <p v-if="audioUploading" class="text-stone-500 text-sm">上傳中…</p>
                <p v-if="audioError" class="text-red-500 text-sm">{{ audioError }}</p>
            </section>

            <div class="flex flex-col items-end gap-2">
                <p v-if="scoreUploading || audioUploading" class="text-sm text-amber-600">
                    上傳中，請完成後再前往
                </p>
                <a v-if="!scoreUploading && !audioUploading"
                    :href="`/admin/songs/${song.id}/lyrics`"
                    class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
                    前往歌詞編輯 →
                </a>
                <span v-else
                    class="bg-green-600/40 text-white px-6 py-2 rounded cursor-not-allowed select-none">
                    前往歌詞編輯 →
                </span>
            </div>
        </div>

        <!-- Lightbox -->
        <div v-if="lightboxUrl"
            class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            @click="lightboxUrl = null">
            <img :src="lightboxUrl" alt="樂譜放大"
                class="max-w-full max-h-full object-contain rounded shadow-xl"
                @click.stop />
            <button class="absolute top-4 right-4 text-white text-3xl leading-none hover:text-stone-300"
                @click="lightboxUrl = null">✕</button>
        </div>
    </AdminLayout>
</template>
