<script setup>
import { computed, useAttrs } from 'vue'
import { router } from '@inertiajs/vue3'

// 返回連結：智慧返回——有瀏覽歷史就 history.back()，否則 Inertia 導回首頁。
// 若父層綁了 @click（例如關閉 overlay），則交給父層處理、不做 history 導覽。
defineOptions({ inheritAttrs: false })

const props = defineProps({
    label: { type: String, default: '回上一頁' },
    size: { type: String, default: 'sm' }, // 'sm' | 'lg'
    // 背景色系：'light' = 淺色背景用深色字（預設）；'dark' = 深色背景用淺色字。
    // 歌詞閱讀頁是深色主題，直接用預設色系會看不見。
    theme: { type: String, default: 'light' }, // 'light' | 'dark'
})

const attrs = useAttrs()

const sizeClass = computed(() => (props.size === 'lg' ? 'text-lg font-bold' : 'text-sm'))
const themeClass = computed(() =>
    props.theme === 'dark' ? 'text-stone-300 hover:text-white' : 'text-stone-600 hover:text-stone-800')
const baseClass = computed(() => ['inline-flex items-center gap-1', themeClass.value, sizeClass.value])

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
    <button type="button" @click="onClick" :aria-label="label" :class="baseClass">
        ← {{ label }}
    </button>
</template>
