import { createApp, h } from 'vue'
import { createInertiaApp } from '@inertiajs/vue3'
import './bootstrap'

const pages = import.meta.glob('./Pages/**/*.vue')

createInertiaApp({
  resolve: (name) => {
    const page = pages[`./Pages/${name}.vue`]().then((module) => {
      return module.default
    })
    return page
  },
  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(App, props) })
      .use(plugin)
      .mount(el)
  },
})
