<script setup>
import { ref, onMounted } from 'vue'

const SESSION_KEY = 'consent_accepted'

const visible = ref(false)

onMounted(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
        visible.value = true
    }
})

function accept() {
    sessionStorage.setItem(SESSION_KEY, '1')
    visible.value = false
}

function decline() {
    window.location.href = 'about:blank'
}
</script>

<template>
    <Teleport to="body">
        <div
            v-if="visible"
            class="fixed inset-0 z-50 flex items-center justify-center"
            data-testid="consent-overlay"
        >
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                class="relative mx-4 max-w-lg rounded-2xl bg-white p-8 shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="consent-title"
            >
                <h2 id="consent-title" class="mb-4 text-xl font-bold text-gray-900">
                    網站使用聲明
                </h2>

                <p class="mb-4 text-sm text-gray-700">
                    本網站所有內容（包含文字、圖片、影音、文化資料等）著作權均歸屬於
                    <strong>台東縣蘭嶼鄉天主教文化發展協會</strong>所有，受中華民國《著作權法》保護。
                </p>

                <ol class="mb-6 list-decimal space-y-2 pl-5 text-sm text-gray-700">
                    <li>
                        <strong>著作權歸屬</strong> — 本站全部內容之著作財產權及著作人格權，依《著作權法》第 10 條，歸屬本協會所有。
                    </li>
                    <li>
                        <strong>禁止未授權使用</strong> — 未經本協會書面授權，不得重製、散布、公開傳輸、改作或以任何形式利用本站內容（《著作權法》第 22–29 條）。
                    </li>
                    <li>
                        <strong>文化資產保護</strong> — 本站涉及原住民族文化素材，亦受《原住民族基本法》第 13 條保護，未經族人或相關組織同意不得採集、利用。
                    </li>
                    <li>
                        <strong>違規責任</strong> — 違反著作權法者，依《著作權法》第 88 條須負損害賠償責任，情節嚴重者依第 91 條可處刑事責任。
                    </li>
                    <li>
                        <strong>同意條款</strong> — 按下「我同意並進入」即表示您已閱讀並接受上述聲明；若不同意，請關閉本頁面離開網站。
                    </li>
                </ol>

                <div class="flex flex-col gap-3 sm:flex-row-reverse">
                    <button
                        class="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                        data-testid="consent-accept"
                        @click="accept"
                    >
                        ✅ 我已閱讀並同意，進入網站
                    </button>
                    <button
                        class="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        data-testid="consent-decline"
                        @click="decline"
                    >
                        ❌ 我不同意，離開網站
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>
