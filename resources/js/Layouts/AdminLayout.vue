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
    <div class="h-screen flex flex-col bg-stone-100">
        <!-- Topnav -->
        <header class="flex-shrink-0 bg-white border-b border-stone-200 px-6 py-3 flex items-center justify-between gap-6">
            <div class="flex items-center gap-6">
                <div>
                    <p class="text-xs text-stone-400 font-medium leading-none">後台管理</p>
                    <p class="text-sm font-bold text-stone-700 mt-0.5">達悟族語歌謠</p>
                </div>
                <nav class="flex items-center gap-1">
                    <Link href="/admin/songs"
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-stone-700 hover:bg-stone-100 text-sm font-medium">
                        🎵 歌曲管理
                    </Link>
                    <Link href="/"
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100 text-sm">
                        👁 查看前台
                    </Link>
                </nav>
            </div>
            <div class="flex items-center gap-3">
                <span v-if="user()" class="text-sm text-stone-500">{{ user().email }}</span>
                <button @click="logout"
                    class="text-sm text-stone-500 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    登出
                </button>
            </div>
        </header>

        <!-- Content -->
        <main class="flex-1 overflow-auto min-h-0">
            <slot />
        </main>
    </div>
</template>
