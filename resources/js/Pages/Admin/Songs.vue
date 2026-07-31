<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Link, router, usePage } from '@inertiajs/vue3'
import AdminLayout from '@/Layouts/AdminLayout.vue'
import axios from 'axios'

const props = defineProps({ songs: Array })

const page = usePage()
const isAdmin = page.props.auth?.user?.role === 'admin'

const VALID_TABS = ['all', 'no-audio', 'no-score', 'draft', 'ready', 'pending_review', 'published']

const filter = ref('all')
const search = ref('')

onMounted(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && VALID_TABS.includes(tab)) filter.value = tab
    const q = params.get('q')
    if (q) search.value = q
})

watch(filter, (tab) => {
    const url = new URL(window.location.href)
    if (tab === 'all') {
        url.searchParams.delete('tab')
    } else {
        url.searchParams.set('tab', tab)
    }
    window.history.replaceState({}, '', url.toString())
})

watch(search, (q) => {
    const url = new URL(window.location.href)
    if (q) {
        url.searchParams.set('q', q)
    } else {
        url.searchParams.delete('q')
    }
    window.history.replaceState({}, '', url.toString())
})

const filteredSongs = computed(() => {
    if (!props.songs) return []
    let result = props.songs
    switch (filter.value) {
        case 'no-audio': result = result.filter(s => !s.audio_full); break
        case 'no-score': result = result.filter(s => s.scores_count === 0); break
        case 'draft':    result = result.filter(s => s.status !== 'published'); break
        case 'ready':          result = result.filter(s => s.status !== 'published' && s.audio_full && s.scores_count > 0); break
        case 'pending_review': result = result.filter(s => s.status === 'pending_review'); break
        case 'published':      result = result.filter(s => s.status === 'published'); break
    }
    const q = search.value.trim().toLowerCase()
    if (q) {
        result = result.filter(s =>
            s.book_number?.includes(q) ||
            s.title_native?.toLowerCase().includes(q) ||
            s.title_zh?.toLowerCase().includes(q)
        )
    }
    return result
})

const filters = [
    { key: 'all',       label: '全部' },
    { key: 'no-audio',  label: '無音訊' },
    { key: 'no-score',  label: '無歌譜' },
    { key: 'draft',     label: '草稿' },
    { key: 'ready',          label: '待發布' },
    { key: 'pending_review', label: '未審核' },
    { key: 'published',      label: '已發布' },
]

function formatDuration(seconds) {
    if (!seconds) return ''
    const m = Math.floor(seconds / 60)
    const s = String(seconds % 60).padStart(2, '0')
    return `${m}:${s}`
}

async function deleteSong(id) {
    if (!confirm('確定要刪除這首歌嗎？')) return
    await axios.delete(`/api/admin/songs/${id}`)
    router.reload()
}
</script>

<template>
    <AdminLayout>
    <div class="p-6">
        <div class="flex items-center justify-between mb-4">
            <h1 class="text-2xl font-bold">歌曲管理</h1>
            <Link v-if="isAdmin" href="/admin/songs/create" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">新增歌曲</Link>
        </div>

        <!-- 篩選列 -->
        <div class="flex items-center gap-2 mb-4">
            <select v-model="filter" class="border rounded px-3 py-1.5 text-sm bg-white">
                <option v-for="f in filters" :key="f.key" :value="f.key">{{ f.label }}</option>
            </select>
            <input v-model="search" type="search"
                placeholder="搜尋頁碼、族語或中文歌名…"
                class="border rounded px-3 py-1.5 text-sm bg-white flex-1 max-w-xs" />
        </div>

        <div class="bg-white rounded-lg shadow overflow-hidden">
            <table class="w-full">
                <thead class="bg-stone-50 border-b">
                    <tr>
                        <th class="text-left p-4 font-medium text-stone-600 w-20">頁碼</th>
                        <th class="text-left p-4 font-medium text-stone-600">族語名稱</th>
                        <th class="text-left p-4 font-medium text-stone-600">中文名稱</th>
                        <th class="text-left p-4 font-medium text-stone-600 w-16">媒體</th>
                        <th v-if="isAdmin" class="text-left p-4 font-medium text-stone-600">狀態</th>
                        <th class="p-4"></th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    <tr v-for="song in filteredSongs" :key="song.id" class="hover:bg-stone-50">
                        <td class="p-4 font-mono text-stone-500 text-sm">{{ song.book_number || '—' }}</td>
                        <td class="p-4">{{ song.title_native }}</td>
                        <td class="p-4 text-stone-600">{{ song.title_zh || '—' }}</td>
                        <td class="p-4">
                            <span class="flex items-center gap-1">
                                <span v-if="song.audio_full" class="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">音訊{{ song.audio_duration ? ' ' + formatDuration(song.audio_duration) : '' }}</span>
                                <span v-if="song.scores_count > 0" class="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">歌譜</span>
                            </span>
                        </td>
                        <td v-if="isAdmin" class="p-4">
                            <span :class="['px-2 py-1 rounded text-sm font-medium',
                                song.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600']">
                                {{ song.status === 'published' ? '已發布' : '草稿' }}
                            </span>
                        </td>
                        <td class="p-4">
                            <div class="flex gap-2 justify-end flex-wrap">
                                <template v-if="isAdmin">
                                    <Link :href="`/admin/songs/${song.id}/edit`"
                                        class="text-blue-600 hover:underline text-sm">基本資料</Link>
                                    <Link :href="`/admin/songs/${song.id}/media`"
                                        class="text-blue-600 hover:underline text-sm">媒體上傳</Link>
                                    <Link :href="`/admin/songs/${song.id}/lyrics`"
                                        class="text-blue-600 hover:underline text-sm">歌詞編輯</Link>
                                    <button @click="deleteSong(song.id)" class="text-red-500 hover:underline text-sm">刪除</button>
                                </template>
                                <Link v-else :href="`/admin/songs/${song.id}/lyrics`"
                                    class="text-blue-600 hover:underline text-sm">
                                    查看歌詞
                                </Link>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="!filteredSongs.length">
                        <td :colspan="isAdmin ? 6 : 5" class="p-8 text-center text-stone-400">尚無歌曲</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    </AdminLayout>
</template>
