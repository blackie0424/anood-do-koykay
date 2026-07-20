<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'

const props = defineProps({ songId: Number })

const visible = ref(false)
const reportType = ref('')
const note = ref('')
const timeFrom = ref('')
const timeTo = ref('')
const submitting = ref(false)
const submitted = ref(false)
const error = ref('')

const REPORT_TYPES = [
    { key: 'lyrics_timing',       label: '歌詞與歌曲段落不符（時間對不上）' },
    { key: 'lyrics_early_late',   label: '歌詞顯示太早或太晚' },
    { key: 'lyrics_not_scrolling',label: '歌詞沒有跟著歌曲移動' },
    { key: 'lyrics_text_error',   label: '歌詞文字錯誤' },
    { key: 'lyrics_mismatch',     label: '歌詞與實際演唱不符' },
    { key: 'lyrics_missing',      label: '有一段歌曲沒有對應歌詞' },
    { key: 'song_name_error',     label: '歌曲名稱錯誤' },
    { key: 'audio_not_playing',   label: '音訊無法播放' },
    { key: 'audio_quality',       label: '音訊品質問題（雜音、音量過小）' },
    { key: 'other',               label: '其他' },
]

const needsNote = computed(() => reportType.value === 'other')
const needsTime = computed(() => reportType.value === 'lyrics_missing')

function open() {
    visible.value = true
    submitted.value = false
    reportType.value = ''
    note.value = ''
    timeFrom.value = ''
    timeTo.value = ''
    error.value = ''
}

function close() {
    visible.value = false
}

async function submit() {
    if (!reportType.value) { error.value = '請選擇回報類型'; return }
    if (needsNote.value && !note.value.trim()) { error.value = '請填寫詳細說明'; return }

    error.value = ''
    submitting.value = true

    let noteText = note.value.trim() || null
    if (needsTime.value && (timeFrom.value || timeTo.value)) {
        const range = [timeFrom.value, timeTo.value].filter(Boolean).join(' ~ ')
        noteText = range + (noteText ? '　' + noteText : '')
    }

    try {
        await axios.post(`/api/songs/${props.songId}/reports`, {
            report_type: reportType.value,
            note: noteText,
        })
        submitted.value = true
    } catch {
        error.value = '送出失敗，請稍後再試'
    } finally {
        submitting.value = false
    }
}
</script>

<template>
    <button
        @click="open"
        class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-stone-100 text-stone-500 text-sm hover:bg-stone-200 active:scale-95 transition-transform"
        data-testid="report-btn"
    >
        ⚑ 回報問題
    </button>

    <Teleport to="body">
        <div
            v-if="visible"
            class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            data-testid="report-overlay"
        >
            <div class="absolute inset-0 bg-black/50" @click="close" />
            <div class="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">

                <!-- 感謝提示 -->
                <div v-if="submitted" class="text-center py-6" data-testid="report-thanks">
                    <p class="text-3xl mb-3">🙏</p>
                    <p class="font-semibold text-stone-800 text-lg">感謝回報！</p>
                    <p class="text-stone-500 text-sm mt-1">我們會儘快處理</p>
                    <button @click="close" class="mt-6 px-6 py-2 bg-stone-800 text-white rounded-lg text-sm">關閉</button>
                </div>

                <template v-else>
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-bold text-stone-800 text-lg">回報問題</h3>
                        <button @click="close" class="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
                    </div>

                    <p class="text-xs text-stone-500 mb-3">請選擇問題類型（必填）</p>

                    <div class="space-y-2 mb-4">
                        <label
                            v-for="t in REPORT_TYPES"
                            :key="t.key"
                            class="flex items-start gap-2 cursor-pointer"
                        >
                            <input
                                type="radio"
                                :value="t.key"
                                v-model="reportType"
                                class="mt-0.5 accent-blue-600"
                                :data-testid="`report-type-${t.key}`"
                            />
                            <span class="text-sm text-stone-700">{{ t.label }}</span>
                        </label>
                    </div>

                    <!-- 時間區間（lyrics_missing 選配） -->
                    <div v-if="needsTime" class="mb-3 pl-1">
                        <p class="text-xs text-stone-500 mb-1">時間區間（選填，格式 mm:ss）</p>
                        <div class="flex items-center gap-2">
                            <input v-model="timeFrom" type="text" placeholder="0:00" maxlength="6"
                                class="w-20 border rounded px-2 py-1 text-sm font-mono"
                                data-testid="report-time-from" />
                            <span class="text-stone-400 text-sm">～</span>
                            <input v-model="timeTo" type="text" placeholder="0:00" maxlength="6"
                                class="w-20 border rounded px-2 py-1 text-sm font-mono"
                                data-testid="report-time-to" />
                        </div>
                    </div>

                    <!-- 備註（other 必填，其他選填） -->
                    <div class="mb-4">
                        <label class="text-xs text-stone-500 block mb-1">
                            {{ needsNote ? '詳細說明（必填）' : '備註（選填）' }}
                        </label>
                        <textarea
                            v-model="note"
                            rows="3"
                            placeholder="請描述問題細節…"
                            class="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                            data-testid="report-note"
                        />
                    </div>

                    <p v-if="error" class="text-red-500 text-xs mb-3" data-testid="report-error">{{ error }}</p>

                    <button
                        @click="submit"
                        :disabled="submitting"
                        class="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                        data-testid="report-submit"
                    >
                        {{ submitting ? '送出中…' : '送出回報' }}
                    </button>
                </template>
            </div>
        </div>
    </Teleport>
</template>
