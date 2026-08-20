<script setup>
import { computed, useAttrs } from 'vue'
import { router } from '@inertiajs/vue3'
import AppButton from '@/Components/AppButton.vue'

// 返回連結：智慧返回——有瀏覽歷史就 history.back()，否則 Inertia 導回首頁。
// 若父層綁了 @click（例如關閉 overlay），則交給父層處理、不做 history 導覽。
defineOptions({ inheritAttrs: false })

const props = defineProps({
    label: { type: String, default: '返回' },
    size: { type: String, default: 'sm' }, // 'sm' | 'lg'
})

const attrs = useAttrs()

const sizeClass = computed(() => (props.size === 'lg' ? 'text-lg font-bold' : 'text-sm'))
const baseClass = computed(() => ['inline-flex items-center gap-1 text-stone-600 hover:text-stone-800', sizeClass.value])

function onClick(e) {
    if (typeof attrs.onClick === 'function') { attrs.onClick(e); return } // 父層自訂行為（如關閉 overlay）
    if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
        window.history.back()
    } else {
        router.visit('/')
    }
}
</script>

<template>
    <AppButton @click="onClick" :aria-label="label" :class="baseClass">
        ← {{ label }}
    </AppButton>
</template>
