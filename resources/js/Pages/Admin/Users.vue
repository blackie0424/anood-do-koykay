<script setup>
import { ref } from 'vue'
import axios from 'axios'
import AdminLayout from '@/Layouts/AdminLayout.vue'

const props = defineProps({ users: Array })

const users = ref(props.users)
const form = ref({ name: '', email: '', password: '' })
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function createEditor() {
    saving.value = true
    saveError.value = ''
    saveSuccess.value = false
    try {
        const { data } = await axios.post('/api/admin/users', form.value)
        users.value.push(data)
        form.value = { name: '', email: '', password: '' }
        saveSuccess.value = true
        setTimeout(() => { saveSuccess.value = false }, 3000)
    } catch (e) {
        saveError.value = e.response?.data?.message ?? '建立失敗，請稍後再試'
    } finally {
        saving.value = false
    }
}
</script>

<template>
    <AdminLayout>
        <div class="p-6 max-w-3xl">
            <h1 class="text-2xl font-bold mb-6">使用者管理</h1>

            <!-- 新增編輯者 -->
            <section class="bg-white rounded-lg shadow p-6 mb-8">
                <h2 class="text-lg font-semibold mb-4">新增編輯者帳號</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">姓名</label>
                        <input v-model="form.name" type="text" class="w-full border rounded px-3 py-2" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Email</label>
                        <input v-model="form.email" type="email" class="w-full border rounded px-3 py-2" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">密碼（至少 8 字元）</label>
                        <input v-model="form.password" type="password" class="w-full border rounded px-3 py-2" />
                    </div>
                    <p v-if="saveError" class="text-red-500 text-sm">{{ saveError }}</p>
                    <p v-if="saveSuccess" class="text-green-600 text-sm">✓ 編輯者帳號建立成功</p>
                    <button @click="createEditor" :disabled="saving || !form.name || !form.email || !form.password"
                        class="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                        {{ saving ? '建立中…' : '建立帳號' }}
                    </button>
                </div>
            </section>

            <!-- 使用者清單 -->
            <section class="bg-white rounded-lg shadow overflow-hidden">
                <table class="w-full">
                    <thead class="bg-stone-50 border-b">
                        <tr>
                            <th class="text-left p-4 text-sm font-medium text-stone-600">姓名</th>
                            <th class="text-left p-4 text-sm font-medium text-stone-600">Email</th>
                            <th class="text-left p-4 text-sm font-medium text-stone-600">角色</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <tr v-for="u in users" :key="u.id" class="hover:bg-stone-50">
                            <td class="p-4">{{ u.name }}</td>
                            <td class="p-4 text-stone-600">{{ u.email }}</td>
                            <td class="p-4">
                                <span :class="['px-2 py-1 rounded text-xs font-medium',
                                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700']">
                                    {{ u.role === 'admin' ? '管理者' : '編輯者' }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </section>
        </div>
    </AdminLayout>
</template>
