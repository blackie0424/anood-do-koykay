<script setup>
import { Link } from '@inertiajs/vue3'
</script>

<template>
    <div class="relative">
        <slot />

        <!-- 後台管理入口（測試期間用） -->
        <Link href="/login"
            class="fixed bottom-4 right-4 bg-stone-700 text-white text-xs px-3 py-2 rounded-full shadow-lg hover:bg-stone-800 opacity-60 hover:opacity-100 transition-opacity z-50">
            ⚙ 後台
        </Link>
    </div>
</template>
