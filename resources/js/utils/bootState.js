// 這個模組只有在瀏覽器真的「完整重新載入」網頁時才會被重新執行一次；
// Inertia 的 SPA 內部導覽（router.visit／點連結）不會重新載入頁面、
// 不會重新 evaluate 這個模組，flag 會維持 true。可以用來判斷「這次
// 元件掛載，是不是這個分頁這輩子第一次真正完整載入頁面」。
export const bootState = {
    hasNavigatedOnce: false,
}
