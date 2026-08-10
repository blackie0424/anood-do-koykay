import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { Link } from '@inertiajs/vue3'
import BackLink from '../Components/BackLink.vue'

describe('BackLink', () => {
    it('有 href 時渲染 Inertia Link（帶 href 與快取）', () => {
        const wrapper = mount(BackLink, { props: { href: '/' } })
        const link = wrapper.findComponent(Link)
        expect(link.exists()).toBe(true)
        expect(link.props('href')).toBe('/')
        expect(link.props('prefetch')).toBe('mount')
        expect(link.props('cacheFor')).toBe('5m')
        expect(wrapper.find('button').exists()).toBe(false)
    })

    it('無 href 時渲染 button，點擊 emit click', async () => {
        const wrapper = mount(BackLink)
        expect(wrapper.findComponent(Link).exists()).toBe(false)
        const btn = wrapper.find('button')
        expect(btn.exists()).toBe(true)
        await btn.trigger('click')
        expect(wrapper.emitted('click')).toBeTruthy()
    })

    it('預設 label 為「返回清單」，可自訂', () => {
        expect(mount(BackLink).text()).toContain('返回清單')
        expect(mount(BackLink, { props: { label: '回上一頁' } }).text()).toContain('回上一頁')
    })

    it('size=lg 用大字、預設 sm 用小字', () => {
        const lg = mount(BackLink, { props: { size: 'lg' } })
        expect(lg.find('button').classes()).toContain('text-lg')
        expect(lg.find('button').classes()).toContain('font-bold')
        const sm = mount(BackLink)
        expect(sm.find('button').classes()).toContain('text-sm')
    })
})
