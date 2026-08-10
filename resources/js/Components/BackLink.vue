<script setup>
import { computed } from 'vue'
import { Link } from '@inertiajs/vue3'

// 返回連結：有 href 時用 Inertia <Link> 導覽（內建 prefetch/cache-for 快取），
// 無 href 時用 <button> 並 emit click（例如關閉 overlay）。
const props = defineProps({
    href: { type: String, default: null },
    label: { type: String, default: '返回清單' },
    size: { type: String, default: 'sm' }, // 'sm' | 'lg'
})
const emit = defineEmits(['click'])

const sizeClass = computed(() => (props.size === 'lg' ? 'text-lg font-bold' : 'text-sm'))
const baseClass = computed(() => ['inline-flex items-center gap-1 text-stone-600 hover:text-stone-800', sizeClass.value])
</script>

<template>
    <Link v-if="href" :href="href" prefetch="mount" cache-for="5m" :aria-label="label" :class="baseClass">
        ← {{ label }}
    </Link>
    <button v-else type="button" @click="emit('click')" :aria-label="label" :class="baseClass">
        ← {{ label }}
    </button>
</template>
