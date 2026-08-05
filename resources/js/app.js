import './bootstrap'
import { createApp, h } from 'vue'
import { createInertiaApp } from '@inertiajs/vue3'
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'

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

        // Vue 掛載完成後淡出並移除 splash screen
        const splash = document.getElementById('app-splash')
        if (splash) {
            splash.classList.add('splash-hidden')
            splash.addEventListener('transitionend', () => splash.remove(), { once: true })
        }

        return app
    },
})

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
}
