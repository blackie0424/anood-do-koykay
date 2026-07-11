import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import SongPlayer from '../Pages/SongPlayer.vue'

const mockSong = {
  id: 1,
  title_native: 'Do Koykay',
  title_zh: '飛魚之歌',
  audio_full: '/audio/1.mp3',
  show_zh_lyrics: true,
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

  it('hides zh text and mode button when show_zh_lyrics is false', () => {
    const songWithoutZh = { ...mockSong, show_zh_lyrics: false }
    const wrapper = mount(SongPlayer, { props: { song: songWithoutZh } })
    expect(wrapper.text()).not.toContain('飛魚來了')
    expect(wrapper.text()).not.toContain('全部')
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

  it('sets audio currentTime to audio_start on loadedmetadata', async () => {
    const songWithTrim = { ...mockSong, audio_start: 5.0, audio_end: 30.0 }
    const wrapper = mount(SongPlayer, { props: { song: songWithTrim } })
    const audio = wrapper.find('audio')
    const audioEl = audio.element
    audioEl.currentTime = 0
    await audio.trigger('loadedmetadata')
    expect(audioEl.currentTime).toBe(5.0)
  })

  it('pauses audio when currentTime exceeds audio_end', async () => {
    const songWithTrim = { ...mockSong, audio_start: 5.0, audio_end: 10.0 }
    const wrapper = mount(SongPlayer, { props: { song: songWithTrim } })
    const audio = wrapper.find('audio')
    const audioEl = audio.element
    let paused = false
    audioEl.pause = () => { paused = true }
    audioEl.currentTime = 10.5
    await audio.trigger('timeupdate')
    expect(paused).toBe(true)
  })
})
