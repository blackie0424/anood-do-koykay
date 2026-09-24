export const READER_PASSIVE_EVENT_TYPES = [
    'touchstart',
    'touchend',
    'pointerdown',
    'pointerup',
    'click',
    'dblclick',
]

export const READER_PASSIVE_LISTENER_OPTIONS = {
    capture: true,
    passive: true,
}

// chung 的 iPhone PWA 真機三次觀察到：這組 passive listener 存在時，
// 停用按鈕區域未再觸發整頁雙擊縮放。這是機制未明的經驗解法，
// 並非官方文件保證的行為，也不宣稱已找到根因。
export function noopReaderTouchListener() {}

export function installReaderPassiveTouchListeners(target) {
    for (const type of READER_PASSIVE_EVENT_TYPES) {
        target.addEventListener(type, noopReaderTouchListener, READER_PASSIVE_LISTENER_OPTIONS)
    }

    return () => {
        for (const type of READER_PASSIVE_EVENT_TYPES) {
            target.removeEventListener(type, noopReaderTouchListener, READER_PASSIVE_LISTENER_OPTIONS)
        }
    }
}
