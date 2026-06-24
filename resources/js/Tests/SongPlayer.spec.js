import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import SongPlayer from '../Pages/SongPlayer.vue'

const mockSong = {
  id: 1,
  title_native: 'Do Koykay',
  title_zh: '飛魚之歌',
  audio_full: '/audio/1.mp3',
  lines: [
    { id: 1, order: 1, text_native: 'Maomaw do koykay', text_zh: '飛魚來了', start_time: 0, end_time: 3.5 },
    { id: 2, order: 2, text_native: 'Anood', text_zh: '海浪', start_time: 3.5, end_time: 7.0 },
  ],
}

describe('SongPlayer', () => {
  it('renders song title', () => {
    const wrapper = mount(SongPlayer, { props: { song: mockSong } })
    expect(wrapper.text()).toContain('Do Koykay')
    expect(wrapper.text()).toContain('飛魚之歌')
  })

  it('renders all lyric lines', () => {
    const wrapper = mount(SongPlayer, { props: { song: mockSong } })
    expect(wrapper.text()).toContain('Maomaw do koykay')
    expect(wrapper.text()).toContain('Anood')
  })

  it('renders both native and zh text by default', () => {
    const wrapper = mount(SongPlayer, { props: { song: mockSong } })
    expect(wrapper.text()).toContain('飛魚來了')
    expect(wrapper.text()).toContain('海浪')
  })

  it('cycles display mode on button click', async () => {
    const wrapper = mount(SongPlayer, { props: { song: mockSong } })
    const modeButton = wrapper.find('button:last-child')

    expect(wrapper.text()).toContain('全部')
    await modeButton.trigger('click')
    expect(wrapper.text()).toContain('族語')
    await modeButton.trigger('click')
    expect(wrapper.text()).toContain('中文')
    await modeButton.trigger('click')
    expect(wrapper.text()).toContain('全部')
  })

  it('shows error notice when audio element emits error', async () => {
    const wrapper = mount(SongPlayer, { props: { song: mockSong } })
    const audio = wrapper.find('audio')
    await audio.trigger('error')
    expect(wrapper.text()).toContain('無法播放，請稍後再試')
  })

  it('play button is disabled when no audio_full', () => {
    const songWithoutAudio = { ...mockSong, audio_full: null }
    const wrapper = mount(SongPlayer, { props: { song: songWithoutAudio } })
    const playButton = wrapper.find('button[aria-label="播放"], button[aria-label="暫停"]')
    expect(playButton.attributes('disabled')).toBeDefined()
  })
})
