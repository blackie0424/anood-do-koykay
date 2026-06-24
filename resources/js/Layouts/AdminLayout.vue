<script setup>
import { Link, router } from '@inertiajs/vue3'
import { usePage } from '@inertiajs/vue3'

const page = usePage()
const user = () => page.props.auth?.user

function logout() {
    router.post('/logout')
}
</script>

<template>
    <div class="min-h-screen flex bg-stone-100">
        <!-- Sidebar -->
        <aside class="w-56 flex-shrink-0 bg-white border-r border-stone-200 flex flex-col">
            <div class="p-4 border-b border-stone-200">
                <p class="text-xs text-stone-400 font-medium">後台管理</p>
                <p class="text-sm font-bold text-stone-700 mt-1">達悟族語歌謠</p>
            </div>

            <nav class="flex-1 p-3 space-y-1">
                <Link href="/admin/songs"
                    class="flex items-center gap-2 px-3 py-2 rounded-lg text-stone-700 hover:bg-stone-100 text-sm font-medium">
                    🎵 歌曲管理
                </Link>
            </nav>

            <div class="p-3 border-t border-stone-200">
                <Link href="/" class="flex items-center gap-2 px-3 py-2 rounded-lg text-stone-500 hover:bg-stone-100 text-sm">
                    👁 查看前台
                </Link>
            </div>
        </aside>

        <!-- Main -->
        <div class="flex-1 flex flex-col min-w-0">
            <!-- Top bar -->
            <header class="bg-white border-b border-stone-200 px-6 py-3 flex items-center justify-end gap-4">
                <span v-if="user()" class="text-sm text-stone-500">{{ user().email }}</span>
                <button @click="logout"
                    class="text-sm text-stone-500 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    登出
                </button>
            </header>

            <!-- Content -->
            <main class="flex-1 overflow-auto">
                <slot />
            </main>
        </div>
    </div>
</template>
