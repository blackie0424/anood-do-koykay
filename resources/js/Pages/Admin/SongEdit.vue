<script setup>
import { ref } from 'vue'
import axios from 'axios'
import AdminLayout from '@/Layouts/AdminLayout.vue'

const props = defineProps({ song: Object })

const form = ref({
    title_native: props.song?.title_native ?? '',
    title_zh: props.song?.title_zh ?? '',
    status: props.song?.status ?? 'draft',
    show_zh_lyrics: props.song?.show_zh_lyrics ?? false,
})
const saving = ref(false)
const saveError = ref('')

async function saveSong() {
    saving.value = true
    saveError.value = ''
    try {
        if (props.song?.id) {
            await axios.put(`/api/admin/songs/${props.song.id}`, form.value)
            window.location.href = `/admin/songs/${props.song.id}/media`
        } else {
            const { data } = await axios.post('/api/admin/songs', form.value)
            window.location.href = `/admin/songs/${data.id}/media`
        }
    } catch {
        saveError.value = '儲存失敗，請稍後再試'
        saving.value = false
    }
}
</script>

<template>
    <AdminLayout>
        <div class="p-6 max-w-xl mx-auto space-y-6">
            <div class="flex items-center gap-4">
                <a href="/admin/songs" class="text-blue-600 hover:underline">← 返回清單</a>
                <h1 class="text-2xl font-bold">{{ song?.id ? '編輯歌曲' : '新增歌曲' }}</h1>
            </div>

            <section class="bg-white rounded-lg shadow p-6 space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">族語名稱 *</label>
                    <input v-model="form.title_native" type="text" required
                        class="w-full border rounded px-3 py-2" />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">中文名稱</label>
                    <input v-model="form.title_zh" type="text" class="w-full border rounded px-3 py-2" />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">狀態</label>
                    <select v-model="form.status" class="border rounded px-3 py-2">
                        <option value="draft">草稿</option>
                        <option value="published">已發布</option>
                    </select>
                </div>
                <div class="flex items-center gap-2">
                    <input id="show_zh_lyrics" v-model="form.show_zh_lyrics" type="checkbox"
                        class="w-4 h-4 rounded border-stone-300 text-blue-600" />
                    <label for="show_zh_lyrics" class="text-sm font-medium">
                        顯示中文字幕切換按鈕（前台播放頁開放用戶切換顯示/隱藏中文歌詞）
                    </label>
                </div>
                <p v-if="saveError" class="text-red-500 text-sm">{{ saveError }}</p>
                <div class="flex items-center gap-4">
                    <button @click="saveSong" :disabled="saving"
                        class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                        {{ saving ? '儲存中…' : '儲存並前往上傳媒體' }}
                    </button>
                    <a v-if="song?.id" :href="`/admin/songs/${song.id}/lyrics`"
                        class="text-blue-600 hover:underline text-sm">前往歌詞編輯 →</a>
                </div>
            </section>
        </div>
    </AdminLayout>
</template>
