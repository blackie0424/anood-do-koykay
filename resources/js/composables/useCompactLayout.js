import { ref, onMounted, onBeforeUnmount } from 'vue'

// 「畫面被放大」實際上有兩種，偵測方式不同：
//   1. 瀏覽器縮放（Zoom）      → 字級單位（rem）不變，但可視範圍變小
//   2. 系統／瀏覽器字體大小設定 → 字級單位變大，但可視範圍不變
// 長者多半是第 2 種（把整支手機的字調大）。與其去猜「放大幾 %」——那需要
// 假設使用者的預設字級，本身就不可靠——不如直接量「目前畫面高度裝得下幾行
// 文字」：兩種情況下這個值都會同步變小，一個判斷就同時涵蓋。
const DEFAULT_ROOT_FONT_SIZE = 16
const DEFAULT_THRESHOLD_ROWS = 30 // 一般手機約 50 行；放大到 200% 時約 25 行

export function useCompactLayout(thresholdRows = DEFAULT_THRESHOLD_ROWS) {
    const isCompact = ref(false)

    function measure() {
        if (typeof window === 'undefined') return

        const rootFontSize =
            parseFloat(getComputedStyle(document.documentElement).fontSize) || DEFAULT_ROOT_FONT_SIZE

        isCompact.value = window.innerHeight / rootFontSize < thresholdRows
    }

    onMounted(() => {
        measure()
        window.addEventListener('resize', measure)
        window.addEventListener('orientationchange', measure)
    })

    onBeforeUnmount(() => {
        window.removeEventListener('resize', measure)
        window.removeEventListener('orientationchange', measure)
    })

    return { isCompact, measure }
}
