<script setup>
import { Link, router } from '@inertiajs/vue3'
import AdminLayout from '@/Layouts/AdminLayout.vue'
import axios from 'axios'

defineProps({ songs: Array })

async function deleteSong(id) {
    if (!confirm('確定要刪除這首歌嗎？')) return
    await axios.delete(`/api/admin/songs/${id}`)
    router.reload()
}
</script>

<template>
    <AdminLayout>
    <div class="p-6">
        <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-bold">歌曲管理</h1>
            <Link href="/admin/songs/create" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">新增歌曲</Link>
        </div>
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <table class="w-full">
                <thead class="bg-stone-50 border-b">
                    <tr>
                        <th class="text-left p-4 font-medium text-stone-600 w-20">頁碼</th>
                        <th class="text-left p-4 font-medium text-stone-600">族語名稱</th>
                        <th class="text-left p-4 font-medium text-stone-600">中文名稱</th>
                        <th class="text-left p-4 font-medium text-stone-600">狀態</th>
                        <th class="p-4"></th>
                    </tr>
                </thead>
                <tbody class="divide-y">
                    <tr v-for="song in songs" :key="song.id" class="hover:bg-stone-50">
                        <td class="p-4 font-mono text-stone-500 text-sm">{{ song.book_number || '—' }}</td>
                        <td class="p-4">{{ song.title_native }}</td>
                        <td class="p-4 text-stone-600">{{ song.title_zh || '—' }}</td>
                        <td class="p-4">
                            <span :class="['px-2 py-1 rounded text-sm font-medium',
                                song.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600']">
                                {{ song.status === 'published' ? '已發布' : '草稿' }}
                            </span>
                        </td>
                        <td class="p-4">
                            <div class="flex gap-2 justify-end">
                                <Link :href="`/admin/songs/${song.id}/edit`" class="text-blue-600 hover:underline text-sm">編輯</Link>
                                <button @click="deleteSong(song.id)" class="text-red-500 hover:underline text-sm">刪除</button>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="!songs?.length">
                        <td colspan="5" class="p-8 text-center text-stone-400">尚無歌曲</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    </AdminLayout>
</template>
