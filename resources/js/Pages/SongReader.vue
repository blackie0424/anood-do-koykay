<script setup>
import { ref, computed, onMounted } from 'vue'
import { Link } from '@inertiajs/vue3'
import PublicLayout from '@/Layouts/PublicLayout.vue'

const props = defineProps({ song: Object })

const lines = computed(() => (props.song?.lines ?? []).filter(l => l.text_native?.trim()))
const total = computed(() => lines.value.length)

const currentIdx = ref(0)
const FONT_KEY = 'songReaderFontSize'
const fontSize = ref(3.5)

onMounted(() => {
    const saved = parseFloat(localStorage.getItem(FONT_KEY))
    if (!isNaN(saved) && saved >= 1.5 && saved <= 6) fontSize.value = saved
})

function setFontSize(val) {
    fontSize.value = val
    localStorage.setItem(FONT_KEY, val)
}

function prev() {
    if (currentIdx.value > 0) currentIdx.value--
}

function next() {
    if (currentIdx.value < total.value - 1) {
        currentIdx.value++
    }
}

const isLast = computed(() => currentIdx.value === total.value - 1)
const progress = computed(() => total.value > 1 ? (currentIdx.value / (total.value - 1)) * 100 : 100)
const currentLine = computed(() => lines.value[currentIdx.value]?.text_native ?? '')
</script>

<template>
    <PublicLayout>
        <div class="min-h-dvh flex flex-col bg-stone-900 text-white select-none">

            <!-- 右上角字體調整 -->
            <div class="fixed top-3 right-3 z-10 flex items-center gap-1">
                <button @click="setFontSize(Math.max(1.5, +(fontSize - 0.5).toFixed(1)))"
                    class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold transition-colors">
                    A-
                </button>
                <button @click="setFontSize(Math.min(6, +(fontSize + 0.5).toFixed(1)))"
                    class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold transition-colors">
                    A+
                </button>
            </div>

            <!-- 頂部：歌曲名稱 + 進度 -->
            <div class="px-5 pt-4 pb-2 flex-shrink-0">
                <p class="text-stone-400 text-sm truncate">{{ song.title_native }}</p>
                <p class="text-stone-500 text-xs mt-0.5">第 {{ currentIdx + 1 }} 段 / 共 {{ total }} 段</p>
            </div>

            <!-- 中央歌詞顯示 -->
            <div class="flex-1 flex items-center justify-center px-6 py-8">
                <p class="text-center leading-relaxed font-medium text-white"
                    :style="{ fontSize: fontSize + 'rem' }">
                    {{ currentLine }}
                </p>
            </div>

            <!-- 底部 -->
            <div class="flex-shrink-0 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3">
                <!-- 進度條 -->
                <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div class="h-full bg-white/50 rounded-full transition-all duration-300"
                        :style="{ width: progress + '%' }"></div>
                </div>

                <!-- 按鈕列 -->
                <div class="flex items-center gap-3">
                    <!-- 上一段 -->
                    <button @click="prev" :disabled="currentIdx === 0"
                        class="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-sm transition-colors shrink-0">
                        ← 上一段
                    </button>

                    <!-- 下一段 / 結束 -->
                    <template v-if="isLast">
                        <Link :href="`/songs/${song.id}`"
                            class="flex-1 h-16 rounded-xl bg-stone-600 hover:bg-stone-500 flex items-center justify-center text-lg font-semibold transition-colors">
                            結束
                        </Link>
                    </template>
                    <button v-else @click="next"
                        class="flex-1 h-16 rounded-xl bg-white text-stone-900 hover:bg-stone-100 flex items-center justify-center text-lg font-semibold transition-colors">
                        下一段 →
                    </button>
                </div>
            </div>
        </div>
    </PublicLayout>
</template>
