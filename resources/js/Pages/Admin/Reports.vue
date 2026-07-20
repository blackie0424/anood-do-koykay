<script setup>
import { ref } from 'vue'
import { Link } from '@inertiajs/vue3'
import AdminLayout from '@/Layouts/AdminLayout.vue'
import axios from 'axios'

const props = defineProps({ reports: Array })

const reports = ref(props.reports)

const LABEL = {
    lyrics_timing:        '歌詞與歌曲段落不符（時間對不上）',
    lyrics_early_late:    '歌詞顯示太早或太晚',
    lyrics_not_scrolling: '歌詞沒有跟著歌曲移動',
    lyrics_text_error:    '歌詞文字錯誤',
    lyrics_mismatch:      '歌詞與實際演唱不符',
    lyrics_missing:       '有一段歌曲沒有對應歌詞',
    song_name_error:      '歌曲名稱錯誤',
    audio_not_playing:    '音訊無法播放',
    audio_quality:        '音訊品質問題',
    other:                '其他',
}

function typeLabel(key) {
    return LABEL[key] ?? key
}

function formatDate(str) {
    if (!str) return ''
    return new Date(str).toLocaleString('zh-TW', { hour12: false })
}

async function toggleResolved(report) {
    const { data } = await axios.patch(`/api/admin/reports/${report.id}`)
    report.resolved = data.resolved
}
</script>

<template>
    <AdminLayout>
        <div class="p-6">
            <h1 class="text-2xl font-bold mb-6">問題回報</h1>

            <div class="bg-white rounded-lg shadow overflow-hidden">
                <table class="w-full text-sm">
                    <thead class="bg-stone-50 border-b">
                        <tr>
                            <th class="text-left p-4 font-medium text-stone-600">歌曲</th>
                            <th class="text-left p-4 font-medium text-stone-600">回報類型</th>
                            <th class="text-left p-4 font-medium text-stone-600">備註</th>
                            <th class="text-left p-4 font-medium text-stone-600">回報時間</th>
                            <th class="p-4 font-medium text-stone-600 text-center w-24">已解決</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr v-for="report in reports" :key="report.id"
                            :class="['hover:bg-stone-50', report.resolved ? 'opacity-50' : '']">
                            <td class="p-4">
                                <Link :href="`/admin/songs/${report.song?.id}/lyrics`"
                                    class="text-blue-600 hover:underline">
                                    {{ report.song?.title_native || '—' }}
                                </Link>
                                <span v-if="report.song?.title_zh" class="text-stone-400 text-xs ml-1">{{ report.song.title_zh }}</span>
                            </td>
                            <td class="p-4 text-stone-700">{{ typeLabel(report.report_type) }}</td>
                            <td class="p-4 text-stone-500 max-w-xs">
                                <span v-if="report.note" class="whitespace-pre-wrap">{{ report.note }}</span>
                                <span v-else class="text-stone-300">—</span>
                            </td>
                            <td class="p-4 text-stone-500 whitespace-nowrap">{{ formatDate(report.created_at) }}</td>
                            <td class="p-4 text-center">
                                <button
                                    @click="toggleResolved(report)"
                                    :class="['w-10 h-6 rounded-full transition-colors',
                                        report.resolved ? 'bg-green-500' : 'bg-stone-200']"
                                    :aria-label="report.resolved ? '標為未解決' : '標為已解決'"
                                    :data-testid="`resolved-toggle-${report.id}`"
                                >
                                    <span :class="['block w-4 h-4 bg-white rounded-full shadow transition-transform mx-auto',
                                        report.resolved ? 'translate-x-2' : '-translate-x-2']" />
                                </button>
                            </td>
                        </tr>
                        <tr v-if="!reports.length">
                            <td colspan="5" class="p-8 text-center text-stone-400">尚無回報</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </AdminLayout>
</template>
