<script setup>
import { ref, computed } from 'vue'
import AdminLayout from '@/Layouts/AdminLayout.vue'
import axios from 'axios'

// ── Step state ──────────────────────────────────────────────────────
const step = ref(1)

// ── Step 1: TOC ─────────────────────────────────────────────────────
const tocImages = ref([])
const tocEntries = ref([])   // [{title, page}]
const tocLoading = ref(false)
const tocError = ref('')

function onTocFiles(e) {
    tocImages.value = Array.from(e.target.files).slice(0, 4)
    tocError.value = ''
}

async function ocrToc() {
    if (!tocImages.value.length) { tocError.value = '請選擇 1–4 張目錄圖片'; return }
    tocLoading.value = true
    tocError.value = ''
    try {
        const form = new FormData()
        tocImages.value.forEach(f => form.append('images[]', f))
        const { data } = await axios.post('/api/admin/batch-import/ocr-toc', form)
        tocEntries.value = data.entries.length
            ? data.entries
            : [{ title: '', page: 1 }]
    } catch {
        tocError.value = 'OCR 解析失敗，請重試或手動輸入'
        tocEntries.value = [{ title: '', page: 1 }]
    } finally {
        tocLoading.value = false
    }
}

function addTocRow() { tocEntries.value.push({ title: '', page: 1 }) }
function removeTocRow(i) { tocEntries.value.splice(i, 1) }
function confirmToc() {
    if (tocEntries.value.some(e => !e.title.trim())) { tocError.value = '請填寫所有歌名'; return }
    step.value = 2
}

// ── Step 2: Upload scores ────────────────────────────────────────────
const scoreFiles = ref([])
const uploadProgress = ref(0)  // 0–100
const uploading = ref(false)
const uploadedUrls = ref([])  // [{page, url}]
const uploadError = ref('')
const BATCH = 30

function onScoreFiles(e) {
    scoreFiles.value = Array.from(e.target.files).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    )
    uploadProgress.value = 0
    uploadedUrls.value = []
    uploadError.value = ''
}

const totalBatches = computed(() => Math.ceil(scoreFiles.value.length / BATCH))

async function uploadScores() {
    if (!scoreFiles.value.length) { uploadError.value = '請選擇樂譜圖片'; return }
    uploading.value = true
    uploadProgress.value = 0
    uploadError.value = ''
    uploadedUrls.value = []
    try {
        for (let b = 0; b < totalBatches.value; b++) {
            const batch = scoreFiles.value.slice(b * BATCH, (b + 1) * BATCH)
            const form = new FormData()
            batch.forEach((f, i) => {
                form.append('images[]', f)
                const pageNum = b * BATCH + i + 1
                form.append('pages[]', pageNum)
            })
            const { data } = await axios.post('/api/admin/batch-import/upload-scores', form)
            uploadedUrls.value.push(...data.uploads)
            uploadProgress.value = Math.round(((b + 1) / totalBatches.value) * 100)
        }
        step.value = 3
    } catch (err) {
        const status = err.response?.status
        const msg = err.response?.data?.message
        uploadError.value = status
            ? `上傳失敗（HTTP ${status}${msg ? '：' + msg : ''}），請重試`
            : '上傳失敗，請重試'
    } finally {
        uploading.value = false
    }
}

// ── Step 3: Create songs ─────────────────────────────────────────────
const createLoading = ref(false)
const createError = ref('')
const created = ref(0)

const previewSongs = computed(() => {
    const sorted = [...tocEntries.value].sort((a, b) => a.page - b.page)
    return sorted.map((entry, i) => {
        const next = sorted[i + 1]
        const endPage = next ? next.page - 1 : Math.max(...uploadedUrls.value.map(u => u.page), entry.page)
        const pages = endPage - entry.page + 1
        return { ...entry, end_page: endPage, pages }
    })
})

const hasDuplicatePage = computed(() =>
    previewSongs.value.some((s, i) =>
        previewSongs.value.findIndex(x => x.page === s.page) !== i
    )
)

async function createSongs() {
    createLoading.value = true
    createError.value = ''
    try {
        const songs = previewSongs.value.map(s => ({
            title: s.title,
            start_page: s.page,
            end_page: s.end_page,
        }))
        const { data } = await axios.post('/api/admin/batch-import/create-songs', {
            songs,
            score_urls: uploadedUrls.value,
        })
        created.value = data.created
        step.value = 4
    } catch {
        createError.value = '建立失敗，請重試'
    } finally {
        createLoading.value = false
    }
}
</script>

<template>
    <AdminLayout>
        <div class="p-6 max-w-3xl mx-auto">
            <h1 class="text-2xl font-bold mb-6">批次匯入</h1>

            <!-- Step indicator -->
            <div class="flex items-center gap-2 mb-8 text-sm">
                <template v-for="n in [1,2,3]" :key="n">
                    <div :class="['w-7 h-7 rounded-full flex items-center justify-center font-bold',
                        step > n ? 'bg-green-500 text-white' :
                        step === n ? 'bg-blue-600 text-white' :
                        'bg-stone-200 text-stone-500']">{{ n }}</div>
                    <span :class="['flex-1 h-0.5', step > n ? 'bg-green-400' : 'bg-stone-200']" v-if="n < 3" />
                </template>
            </div>

            <!-- Step 1: TOC OCR -->
            <div v-if="step === 1">
                <h2 class="text-lg font-semibold mb-4">Step 1：上傳目錄截圖</h2>
                <label class="block mb-2 text-sm text-stone-600">選取 1–4 張目錄圖片</label>
                <input type="file" multiple accept="image/*" @change="onTocFiles"
                    class="block mb-3" data-testid="toc-file-input" />
                <p v-if="tocImages.length" class="text-xs text-stone-500 mb-3">已選 {{ tocImages.length }} 張</p>

                <button @click="ocrToc" :disabled="tocLoading || !tocImages.length"
                    class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm mb-4"
                    data-testid="ocr-btn">
                    {{ tocLoading ? 'OCR 解析中…' : '開始 OCR 解析' }}
                </button>

                <template v-if="tocEntries.length">
                    <p class="text-sm font-medium mb-2">解析結果（可編輯）</p>
                    <div class="space-y-2 mb-4 max-h-96 overflow-y-auto">
                        <div v-for="(entry, i) in tocEntries" :key="i"
                            class="flex items-center gap-2">
                            <span class="text-xs text-stone-400 w-5">{{ i+1 }}</span>
                            <input v-model="entry.title" placeholder="歌名"
                                class="flex-1 border rounded px-2 py-1 text-sm"
                                :data-testid="`toc-title-${i}`" />
                            <input v-model.number="entry.page" type="number" min="1"
                                class="w-16 border rounded px-2 py-1 text-sm text-center"
                                :data-testid="`toc-page-${i}`" />
                            <button @click="removeTocRow(i)"
                                class="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                        </div>
                    </div>
                    <button @click="addTocRow"
                        class="text-blue-500 hover:underline text-sm mb-4">+ 新增一行</button>
                </template>

                <p v-if="tocError" class="text-red-500 text-xs mb-3" data-testid="toc-error">{{ tocError }}</p>

                <button v-if="tocEntries.length" @click="confirmToc"
                    class="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 text-sm"
                    data-testid="confirm-toc-btn">
                    確認目錄，下一步 →
                </button>
            </div>

            <!-- Step 2: Upload scores -->
            <div v-if="step === 2">
                <h2 class="text-lg font-semibold mb-4">Step 2：上傳樂譜圖片</h2>
                <label class="block mb-2 text-sm text-stone-600">選取所有樂譜圖片（頁序對應檔名排序）</label>
                <input type="file" multiple accept="image/*" @change="onScoreFiles"
                    class="block mb-3" data-testid="score-file-input" />

                <template v-if="scoreFiles.length">
                    <p class="text-sm text-stone-600 mb-4">
                        共 <strong>{{ scoreFiles.length }}</strong> 張，預計分
                        <strong>{{ totalBatches }}</strong> 批上傳（每批最多 {{ BATCH }} 張）
                    </p>

                    <div v-if="uploading || uploadProgress > 0" class="mb-4">
                        <div class="w-full bg-stone-200 rounded-full h-3">
                            <div class="bg-blue-600 h-3 rounded-full transition-all"
                                :style="{ width: uploadProgress + '%' }" />
                        </div>
                        <p class="text-xs text-stone-500 mt-1">{{ uploadProgress }}%</p>
                    </div>

                    <p v-if="uploadError" class="text-red-500 text-xs mb-3" data-testid="upload-error">{{ uploadError }}</p>

                    <button @click="uploadScores" :disabled="uploading"
                        class="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                        data-testid="upload-btn">
                        {{ uploading ? '上傳中…' : '開始上傳' }}
                    </button>
                </template>
            </div>

            <!-- Step 3: Preview & Create -->
            <div v-if="step === 3">
                <h2 class="text-lg font-semibold mb-4">Step 3：確認並建立歌曲</h2>

                <div v-if="hasDuplicatePage"
                    class="bg-yellow-50 border border-yellow-300 text-yellow-800 rounded p-3 text-sm mb-4">
                    ⚠️ 有同頁多首情況，請確認目錄頁碼正確
                </div>

                <div class="bg-white border rounded-lg overflow-hidden mb-5">
                    <table class="w-full text-sm">
                        <thead class="bg-stone-50 border-b text-stone-500">
                            <tr>
                                <th class="text-left p-3">歌名</th>
                                <th class="text-center p-3 w-20">起始頁</th>
                                <th class="text-center p-3 w-20">結束頁</th>
                                <th class="text-center p-3 w-16">張數</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            <tr v-for="(s, i) in previewSongs" :key="i" class="hover:bg-stone-50">
                                <td class="p-3">{{ s.title }}</td>
                                <td class="p-3 text-center font-mono">{{ s.page }}</td>
                                <td class="p-3 text-center font-mono">{{ s.end_page }}</td>
                                <td class="p-3 text-center">{{ s.pages }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p v-if="createError" class="text-red-500 text-xs mb-3" data-testid="create-error">{{ createError }}</p>

                <button @click="createSongs" :disabled="createLoading"
                    class="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                    data-testid="create-btn">
                    {{ createLoading ? '建立中…' : '批次建立歌曲' }}
                </button>
            </div>

            <!-- Step 4: Done -->
            <div v-if="step === 4" class="text-center py-10">
                <p class="text-4xl mb-4">✅</p>
                <p class="text-xl font-semibold mb-2">成功建立 {{ created }} 首歌曲</p>
                <p class="text-stone-500 text-sm mb-6">歌曲已標記為「待審核」，可前往歌曲清單審核</p>
                <a href="/admin/songs?tab=pending_review"
                    class="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium">
                    前往審核清單 →
                </a>
            </div>
        </div>
    </AdminLayout>
</template>
