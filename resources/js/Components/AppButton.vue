<script setup>
import { computed, useAttrs } from 'vue'
import { Link } from '@inertiajs/vue3'
import { playClickSound } from '@/composables/useClickSound'

// 全站按鈕的共用契約：封裝「按下去的回饋」（點擊音效 + 視覺按壓）、停用狀態
// 與觸控目標，各處只需定義自己的行為（連到哪、按了做什麼）與外觀。
//
// 為什麼不用全域監聽整個頁面的點擊：那樣看程式碼不知道聲音哪來的、要猜什麼
// 算可點擊、label 包 input 會重複發聲，而且元件內部若判斷「這次點擊忽略」
// （例如處理中），全域仍會發聲，回饋變得不誠實。集中在這個元件則沒有這些問題。
defineOptions({ inheritAttrs: false })

const props = defineProps({
    // 渲染成哪種標籤：一般按鈕、Inertia 站內連結、或外部連結
    as: { type: String, default: 'button' }, // 'button' | 'link' | 'a'
    href: { type: String, default: null },
    type: { type: String, default: 'button' },
    disabled: { type: Boolean, default: false },
    // 預設樣式；'none' 表示外觀完全交由呼叫端的 class 決定
    variant: { type: String, default: 'none' }, // 'none' | 'primary' | 'secondary' | 'danger' | 'ghost'
    size: { type: String, default: 'none' }, // 'none' | 'icon' | 'pill' | 'block'
    // 個別情境可關掉音效（例如點了會立刻開始播放音樂，beep 會跟音樂撞在一起）
    silent: { type: Boolean, default: false },
})

const emit = defineEmits(['click'])
const attrs = useAttrs()

const VARIANTS = {
    none: '',
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-stone-200 text-stone-700 hover:bg-stone-300',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
    ghost: 'text-stone-600 hover:text-stone-800',
}

const SIZES = {
    none: '',
    // 圓形圖示鈕：固定像素下限與上限，不隨系統字體無限放大（見 SongList 說明）
    icon: 'min-w-[64px] min-h-[64px] max-w-[88px] max-h-[88px] p-[10px] rounded-full flex flex-col items-center justify-center gap-0.5',
    pill: 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm',
    block: 'w-full py-2.5 rounded-lg text-sm font-semibold',
}

// 按下回饋：輕微縮小 + 陰影內凹。只在支援滑鼠的裝置套用 hover（見
// tailwind.config.js 的 hoverOnlyWhenSupported），按壓效果則所有裝置都有。
const PRESS_FEEDBACK = 'transition-transform active:scale-[0.97] active:shadow-inner'

const tag = computed(() => (props.as === 'link' ? Link : props.as === 'a' ? 'a' : 'button'))

const classes = computed(() => [
    PRESS_FEEDBACK,
    VARIANTS[props.variant] ?? '',
    SIZES[props.size] ?? '',
    props.disabled ? 'opacity-40 cursor-not-allowed' : '',
    attrs.class ?? '',
])

// 連結類無法用 disabled 屬性擋下導覽，需要自己攔截
const isLinkLike = computed(() => props.as !== 'button')

function onClick(event) {
    if (props.disabled) {
        event.preventDefault()
        event.stopPropagation()
        return
    }
    if (!props.silent) playClickSound()
    emit('click', event)
}
</script>

<template>
    <component
        :is="tag"
        v-bind="{ ...$attrs, class: undefined }"
        :class="classes"
        :href="isLinkLike ? href : undefined"
        :type="as === 'button' ? type : undefined"
        :disabled="as === 'button' && disabled ? true : undefined"
        :aria-disabled="isLinkLike && disabled ? 'true' : undefined"
        @click="onClick"
    >
        <slot />
    </component>
</template>
