<script setup>
import { useForm } from '@inertiajs/vue3'

const form = useForm({ email: '', password: '' })

function submit() {
    form.post('/login')
}
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="w-full max-w-md bg-white rounded-lg shadow p-8">
            <h1 class="text-2xl font-bold text-center mb-6">後台管理登入</h1>
            <form @submit.prevent="submit" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">電子信箱</label>
                    <input v-model="form.email" type="email" required
                        class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p v-if="form.errors.email" class="text-red-500 text-sm mt-1">{{ form.errors.email }}</p>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">密碼</label>
                    <input v-model="form.password" type="password" required
                        class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" :disabled="form.processing"
                    class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                    登入
                </button>
            </form>
        </div>
    </div>
</template>
