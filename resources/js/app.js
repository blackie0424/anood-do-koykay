import './bootstrap'
import { createApp, h } from 'vue'
import { createInertiaApp } from '@inertiajs/vue3'
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'
import { hideSplash } from './utils/splash'

// iOS Safari 需要頁面上存在 touchstart 監聽器，:active 偽類才會在觸控時
// 觸發——沒有這行的話 AppButton 的按壓回饋（縮小 + 陰影內凹）在 iPhone 上
// 不會出現。passive: true 表示不會呼叫 preventDefault，瀏覽器可放心優化
// 捲動效能；桌面瀏覽器不受影響。
document.addEventListener('touchstart', () => {}, { passive: true })

createInertiaApp({
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.vue`,
            import.meta.glob('./Pages/**/*.vue', { eager: false }),
        ),
    setup({ el, App, props, plugin }) {
        const app = createApp({ render: () => h(App, props) })
            .use(plugin)
            .mount(el)

        hideSplash()

        return app
    },
})

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
}
