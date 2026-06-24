<script setup>
import { ref } from 'vue'
import { useForm } from '@inertiajs/vue3'
import axios from 'axios'

const props = defineProps({ song: Object })

const songForm = useForm({
    title_native: props.song?.title_native ?? '',
    title_zh: props.song?.title_zh ?? '',
    status: props.song?.status ?? 'draft',
})

const lines = ref(props.song?.lines ?? [])
const scoreUploading = ref(false)
const audioUploading = ref(false)
const savingLines = ref(false)
const scoreError = ref('')
const audioError = ref('')

function saveSong() {
    props.song?.id ? songForm.put(`/admin/songs/${props.song.id}`) : songForm.post('/admin/songs')
}

async function uploadScore(e) {
    const file = e.target.files[0]
    if (!file || !props.song?.id) return
    scoreUploading.value = true
    scoreError.value = ''
    const fd = new FormData()
    fd.append('score', file)
    try {
        const { data } = await axios.post(`/api/admin/songs/${props.song.id}/score`, fd)
        if (data.lines_draft?.length) {
            lines.value = data.lines_draft.map((l, i) => ({
                order: i + 1, text_native: l.text_native, text_zh: l.text_zh ?? '',
                start_time: null, end_time: null, audio_line: null,
            }))
        }
    } catch { scoreError.value = '上傳失敗，請稍後再試' }
    finally { scoreUploading.value = false }
}

async function uploadAudio(e) {
    const file = e.target.files[0]
    if (!file || !props.song?.id) return
    audioUploading.value = true
    audioError.value = ''
    const fd = new FormData()
    fd.append('audio', file)
    fd.append('type', 'full')
    try { await axios.post(`/api/admin/songs/${props.song.id}/audio`, fd) }
    catch { audioError.value = '上傳失敗，請稍後再試' }
    finally { audioUploading.value = false }
}

function addLine() {
    lines.value.push({ order: lines.value.length + 1, text_native: '', text_zh: '', start_time: null, end_time: null, audio_line: null })
}

function removeLine(idx) {
    lines.value.splice(idx, 1)
    lines.value.forEach((l, i) => { l.order = i + 1 })
}

async function saveLines() {
    if (!props.song?.id) return
    savingLines.value = true
    try { await axios.post(`/api/admin/songs/${props.song.id}/lines/batch`, { lines: lines.value }) }
    finally { savingLines.value = false }
}
</script>

<template>
    <div class="p-6 max-w-3xl mx-auto space-y-8">
        <div class="flex items-center gap-4">
            <a href="/admin/songs" class="text-blue-600 hover:underline">← 返回清單</a>
            <h1 class="text-2xl font-bold">{{ song?.id ? '編輯歌曲' : '新增歌曲' }}</h1>
        </div>

        <section class="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 class="font-semibold text-lg">基本資料</h2>
            <div>
                <label class="block text-sm font-medium mb-1">族語名稱 *</label>
                <input v-model="songForm.title_native" type="text" required class="w-full border rounded px-3 py-2" />
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">中文名稱</label>
                <input v-model="songForm.title_zh" type="text" class="w-full border rounded px-3 py-2" />
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">狀態</label>
                <select v-model="songForm.status" class="border rounded px-3 py-2">
                    <option value="draft">草稿</option>
                    <option value="published">已發布</option>
                </select>
            </div>
            <button @click="saveSong" :disabled="songForm.processing" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">儲存</button>
        </section>

        <template v-if="song?.id">
            <section class="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 class="font-semibold text-lg">歌譜圖片 (OCR 自動辨識)</h2>
                <input type="file" accept="image/*" @change="uploadScore" :disabled="scoreUploading" class="block" />
                <p v-if="scoreUploading" class="text-stone-500">上傳中…</p>
                <p v-if="scoreError" class="text-red-500">{{ scoreError }}</p>
            </section>

            <section class="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 class="font-semibold text-lg">完整錄音</h2>
                <input type="file" accept="audio/*" @change="uploadAudio" :disabled="audioUploading" class="block" />
                <p v-if="audioUploading" class="text-stone-500">上傳中…</p>
                <p v-if="audioError" class="text-red-500">{{ audioError }}</p>
            </section>

            <section class="bg-white rounded-lg shadow p-6 space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="font-semibold text-lg">歌詞編輯</h2>
                    <button @click="addLine" class="text-blue-600 hover:underline text-sm">+ 新增一句</button>
                </div>
                <div class="space-y-3">
                    <div v-for="(line, idx) in lines" :key="idx" class="border rounded p-3">
                        <div class="flex gap-2 items-center">
                            <span class="text-stone-400 text-sm w-6">{{ idx + 1 }}</span>
                            <input v-model="line.text_native" placeholder="族語歌詞" class="flex-1 border rounded px-2 py-1 text-sm" />
                            <input v-model="line.text_zh" placeholder="中文翻譯" class="flex-1 border rounded px-2 py-1 text-sm" />
                            <input v-model.number="line.start_time" type="number" step="0.1" placeholder="起始(秒)" class="w-24 border rounded px-2 py-1 text-sm" />
                            <input v-model.number="line.end_time" type="number" step="0.1" placeholder="結束(秒)" class="w-24 border rounded px-2 py-1 text-sm" />
                            <button @click="removeLine(idx)" class="text-red-400 hover:text-red-600 text-sm">✕</button>
                        </div>
                    </div>
                </div>
                <button @click="saveLines" :disabled="savingLines" class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50">
                    {{ savingLines ? '儲存中…' : '儲存歌詞' }}
                </button>
            </section>
        </template>
    </div>
</template>
