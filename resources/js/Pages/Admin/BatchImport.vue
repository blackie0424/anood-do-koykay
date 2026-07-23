<script setup>
import { ref } from 'vue'
import AdminLayout from '@/Layouts/AdminLayout.vue'
import axios from 'axios'

const activeTab = ref('A')

// ── Tab A：建立歌曲 ──────────────────────────────────────────────────
const stepA = ref(1)

const tocImages = ref([])
const tocEntries = ref([])
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
        tocEntries.value = data.entries.length ? data.entries : [{ title: '', page: 1 }]
    } catch {
        tocError.value = 'OCR 解析失敗，請重試或手動輸入'
        tocEntries.value = [{ title: '', page: 1 }]
    } finally {
        tocLoading.value = false
    }
}

function addTocRow() { tocEntries.value.push({ title: '', page: 1 }) }
function removeTocRow(i) { tocEntries.value.splice(i, 1) }
function goToConfirm() {
    if (tocEntries.value.some(e => !e.title.trim())) { tocError.value = '請填寫所有歌名'; return }
    tocError.value = ''
    stepA.value = 2
}

const createLoading = ref(false)
const createError = ref('')
const createdCount = ref(0)

async function createSongs() {
    createLoading.value = true
    createError.value = ''
    try {
        const songs = tocEntries.value.map(e => ({ title: e.title, start_page: e.page }))
        const { data } = await axios.post('/api/admin/batch-import/create-songs', { songs })
        createdCount.value = data.created
        stepA.value = 3
    } catch (err) {
        const msg = err.response?.data?.message
        createError.value = msg ? `建立失敗：${msg}` : '建立失敗，請重試'
    } finally {
        createLoading.value = false
    }
}

// ── Tab B：上傳樂譜 ──────────────────────────────────────────────────
const scoreResults = ref([])
// shape: { file, page, status, url, matched_songs, selectedSongId, attachError }
// status: 'waiting' | 'uploading' | 'auto' | 'multi' | 'attached' | 'none' | 'error'

const processing = ref(false)
const processError = ref('')

function extractPage(filename) {
    const base = filename.replace(/\.[^.]+$/, '')
    const nums = base.match(/\d+/g)
    return nums ? parseInt(nums[nums.length - 1]) : null
}

function onScoreFiles(e) {
    const files = Array.from(e.target.files).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    )
    scoreResults.value = files.map(file => ({
        file,
        page: extractPage(file.name),
        status: 'waiting',
        url: null,
        matched_songs: [],
        selectedSongId: null,
        attachError: '',
    }))
    processError.value = ''
}

async function processScores() {
    if (!scoreResults.value.length) { processError.value = '請選擇樂譜圖片'; return }
    const unpaged = scoreResults.value.filter(r => r.page === null)
    if (unpaged.length) {
        processError.value = `${unpaged.length} 個檔案無法辨識頁碼（檔名需包含數字，如 page5.jpg）`
        return
    }
    processing.value = true
    processError.value = ''
    for (const result of scoreResults.value) {
        if (result.status !== 'waiting') continue
        result.status = 'uploading'
        try {
            const form = new FormData()
            form.append('image', result.file)
            form.append('page', result.page)
            const { data } = await axios.post('/api/admin/batch-import/upload-score-by-page', form)
            result.url = data.url
            result.matched_songs = data.matched_songs
            if (data.matched_songs.length === 0) {
                result.status = 'none'
            } else if (data.auto_attached) {
                result.status = 'auto'
            } else {
                result.status = 'multi'
                result.selectedSongId = data.matched_songs[0]?.id ?? null
            }
        } catch (err) {
            const status = err.response?.status
            result.status = 'error'
            result.attachError = status ? `HTTP ${status}` : '上傳失敗'
        }
    }
    processing.value = false
}

async function attachScore(result) {
    result.attachError = ''
    try {
        await axios.post('/api/admin/batch-import/attach-score', {
            song_id: result.selectedSongId,
            url: result.url,
        })
        result.status = 'attached'
    } catch {
        result.attachError = '掛上失敗，請重試'
    }
}

const STATUS_ICON = {
    waiting:   '⏳',
    uploading: '🔄',
    auto:      '✅',
    multi:     '⚠️',
    attached:  '✅',
    none:      '❌',
    error:     '🔴',
}
const STATUS_LABEL = {
    auto:      '自動對應成功',
    attached:  '已掛上',
    none:      '找不到對應歌曲',
    waiting:   '等待上傳',
    uploading: '上傳中…',
}
</script>

<template>
    <AdminLayout>
        <div class="p-6 max-w-3xl mx-auto">
            <h1 class="text-2xl font-bold mb-6">批次匯入</h1>

            <!-- Tab 切換 -->
            <div class="flex gap-1 mb-8 border-b">
                <button v-for="tab in ['A', 'B']" :key="tab"
                    @click="activeTab = tab"
                    :data-testid="`tab-${tab}`"
                    :class="['px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                        activeTab === tab
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-stone-500 hover:text-stone-700']">
                    {{ tab === 'A' ? '作業 A：建立歌曲' : '作業 B：上傳樂譜' }}
                </button>
            </div>

            <!-- ─── 作業 A ─────────────────────────────────────────── -->
            <div v-if="activeTab === 'A'" data-testid="tab-A-panel">

                <!-- Step 1: OCR 目錄 -->
                <div v-if="stepA === 1">
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
                                <span class="text-xs text-stone-400 w-5">{{ i + 1 }}</span>
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

                    <button v-if="tocEntries.length" @click="goToConfirm"
                        class="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 text-sm"
                        data-testid="confirm-toc-btn">
                        確認目錄，下一步 →
                    </button>
                </div>

                <!-- Step 2: 確認並建立 -->
                <div v-if="stepA === 2">
                    <h2 class="text-lg font-semibold mb-4">Step 2：確認並批次建立歌曲</h2>
                    <p class="text-sm text-stone-500 mb-4">
                        共 <strong>{{ tocEntries.length }}</strong> 首，建立後可在作業 B 逐批上傳樂譜。
                    </p>

                    <div class="bg-white border rounded-lg overflow-hidden mb-5 max-h-96 overflow-y-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-stone-50 border-b text-stone-500 sticky top-0">
                                <tr>
                                    <th class="text-left p-3">歌名</th>
                                    <th class="text-center p-3 w-20">頁碼</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y">
                                <tr v-for="(e, i) in tocEntries" :key="i" class="hover:bg-stone-50">
                                    <td class="p-3">{{ e.title }}</td>
                                    <td class="p-3 text-center font-mono">{{ e.page }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <p v-if="createError" class="text-red-500 text-xs mb-3" data-testid="create-error">{{ createError }}</p>

                    <div class="flex gap-3">
                        <button @click="stepA = 1"
                            class="text-stone-500 hover:text-stone-700 px-4 py-2 text-sm">← 返回編輯</button>
                        <button @click="createSongs" :disabled="createLoading"
                            class="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                            data-testid="create-btn">
                            {{ createLoading ? '建立中…' : `批次建立 ${tocEntries.length} 首歌曲` }}
                        </button>
                    </div>
                </div>

                <!-- Step 3: 完成 -->
                <div v-if="stepA === 3" class="text-center py-10" data-testid="step-A-done">
                    <p class="text-4xl mb-4">✅</p>
                    <p class="text-xl font-semibold mb-2">已建立 {{ createdCount }} 首歌曲</p>
                    <p class="text-stone-500 text-sm mb-6">歌曲已標記為「待審核」，請前往作業 B 上傳樂譜</p>
                    <button @click="activeTab = 'B'"
                        class="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
                        data-testid="go-to-tab-B">
                        前往作業 B 上傳樂譜 →
                    </button>
                </div>
            </div>

            <!-- ─── 作業 B ─────────────────────────────────────────── -->
            <div v-if="activeTab === 'B'" data-testid="tab-B-panel">
                <h2 class="text-lg font-semibold mb-4">作業 B：批次上傳樂譜</h2>
                <p class="text-sm text-stone-500 mb-4">
                    選取樂譜圖片（多選），系統依檔名中的頁碼自動對應歌曲。<br>
                    檔名需包含數字頁碼，如 <code class="bg-stone-100 px-1 rounded">anood no tao 5.png</code>
                </p>

                <input type="file" multiple accept="image/*" @change="onScoreFiles"
                    class="block mb-3" data-testid="score-file-input" />

                <p v-if="processError" class="text-red-500 text-xs mb-3" data-testid="process-error">{{ processError }}</p>

                <button v-if="scoreResults.length" @click="processScores" :disabled="processing"
                    class="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm mb-5"
                    data-testid="process-btn">
                    {{ processing ? '上傳中…' : `開始上傳（${scoreResults.length} 張）` }}
                </button>

                <!-- Results list -->
                <div v-if="scoreResults.length" class="space-y-2">
                    <div v-for="(r, i) in scoreResults" :key="i"
                        :data-testid="`score-result-${i}`"
                        class="flex items-center gap-3 p-3 rounded-lg bg-white border">
                        <!-- Status icon -->
                        <span class="text-lg w-6 text-center flex-shrink-0">{{ STATUS_ICON[r.status] }}</span>

                        <!-- File info -->
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium truncate">{{ r.file.name }}</p>
                            <p class="text-xs text-stone-400">
                                頁碼：{{ r.page ?? '無法辨識' }}
                                <template v-if="r.status === 'auto' || r.status === 'attached'">
                                    → {{ r.matched_songs[0]?.title_native }}
                                </template>
                            </p>
                        </div>

                        <!-- Multi-match：下拉選擇 + 掛上按鈕 -->
                        <template v-if="r.status === 'multi'">
                            <select v-model="r.selectedSongId"
                                class="border rounded px-2 py-1 text-sm max-w-xs"
                                :data-testid="`song-select-${i}`">
                                <option v-for="s in r.matched_songs" :key="s.id" :value="s.id">
                                    {{ s.title_native }}
                                </option>
                            </select>
                            <button @click="attachScore(r)"
                                class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex-shrink-0"
                                :data-testid="`attach-btn-${i}`">
                                掛上
                            </button>
                            <span v-if="r.attachError" class="text-red-500 text-xs">{{ r.attachError }}</span>
                        </template>

                        <!-- 其他狀態 label -->
                        <template v-else>
                            <span class="text-xs text-stone-500 flex-shrink-0">
                                {{ STATUS_LABEL[r.status] ?? r.attachError }}
                            </span>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>
