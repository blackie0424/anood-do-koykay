<script setup>
import { ref } from 'vue'
import axios from 'axios'
import AdminLayout from '@/Layouts/AdminLayout.vue'

const props = defineProps({ song: Object })

const scoreImage = ref(props.song?.score_image ?? null)
const audioFull = ref(props.song?.audio_full ?? null)
const scoreUploading = ref(false)
const audioUploading = ref(false)
const scoreError = ref('')
const scoreOcrError = ref('')
const scoreSuccess = ref(false)
const audioError = ref('')

async function uploadScore(e) {
    const file = e.target.files[0]
    if (!file) return
    scoreUploading.value = true
    scoreError.value = ''
    scoreOcrError.value = ''
    scoreSuccess.value = false
    const fd = new FormData()
    fd.append('score', file)
    try {
        const { data } = await axios.post(`/api/admin/songs/${props.song.id}/score`, fd)
        scoreImage.value = data.score_image
        if (data.ocr_error) {
            scoreOcrError.value = `圖片上傳成功，但 OCR 辨識失敗：${data.ocr_error}`
        } else if (data.lines_draft?.length) {
            scoreSuccess.value = true
        } else {
            scoreOcrError.value = '圖片上傳成功，但 OCR 未辨識出任何文字'
        }
    } catch {
        scoreError.value = '上傳失敗，請稍後再試'
    } finally {
        scoreUploading.value = false
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
                <img v-if="scoreImage" :src="scoreImage" alt="樂譜" class="max-h-64 rounded border object-contain" />
                <input type="file" accept="image/jpg,image/jpeg,image/png,image/webp"
                    @change="uploadScore" :disabled="scoreUploading" class="block" />
                <p v-if="scoreUploading" class="text-stone-500 text-sm">上傳中…</p>
                <p v-if="scoreError" class="text-red-500 text-sm">{{ scoreError }}</p>
                <p v-if="scoreOcrError" class="text-yellow-600 text-sm">⚠️ {{ scoreOcrError }}</p>
                <p v-if="scoreSuccess" class="text-green-600 text-sm">✓ 上傳成功，歌詞已辨識，請前往歌詞編輯頁查看</p>
            </section>

            <!-- 完整錄音 -->
            <section class="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 class="font-semibold text-lg">完整錄音</h2>
                <audio v-if="audioFull" :src="audioFull" controls class="w-full" />
                <input type="file" accept="audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/aac"
                    @change="uploadAudio" :disabled="audioUploading" class="block" />
                <p v-if="audioUploading" class="text-stone-500 text-sm">上傳中…</p>
                <p v-if="audioError" class="text-red-500 text-sm">{{ audioError }}</p>
            </section>

            <div class="flex justify-end">
                <a :href="`/admin/songs/${song.id}/lyrics`"
                    class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
                    前往歌詞編輯 →
                </a>
            </div>
        </div>
    </AdminLayout>
</template>
