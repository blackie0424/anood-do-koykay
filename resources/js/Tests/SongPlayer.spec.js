import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import SongPlayer from '../Pages/SongPlayer.vue'

const BASE_SONG = {
  id: 1,
  title_native: 'Do Koykay',
  title_zh: '飛魚之歌',
  audio_full: '/audio/1.mp3',
}

// 歌詞有時間 → effectiveStart = 2.0（min），effectiveEnd = 9.0（max）；audio_start/end 應被忽略
const songWithLyricTimes = {
  ...BASE_SONG,
  audio_start: 99.0,
  audio_end: 99.0,
  lines: [
    { id: 1, order: 1, text_native: 'Maomaw', start_time: 2.0, end_time: 6.0 },
    { id: 2, order: 2, text_native: 'Anood',  start_time: 6.0, end_time: 9.0 },
  ],
}

// 歌詞無時間 → fallback 到 audio_start = 5.0，audio_end = 30.0
const songNoLyricTimes = {
  ...BASE_SONG,
  audio_start: 5.0,
  audio_end: 30.0,
  lines: [
    { id: 1, order: 1, text_native: 'Maomaw', start_time: null, end_time: null },
  ],
}

// 無任何時間 → effectiveStart = 0，effectiveEnd = null
const songNoTimes = {
  ...BASE_SONG,
  lines: [
    { id: 1, order: 1, text_native: 'Maomaw', start_time: null, end_time: null },
  ],
}

describe('SongPlayer — 基本渲染', () => {
  it('renders song title', () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    expect(wrapper.text()).toContain('Do Koykay')
    expect(wrapper.text()).toContain('飛魚之歌')
  })

  it('renders all lyric lines', () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    expect(wrapper.text()).toContain('Maomaw')
    expect(wrapper.text()).toContain('Anood')
  })

  it('shows error notice when audio element emits error', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    await wrapper.find('audio').trigger('error')
    expect(wrapper.text()).toContain('無法播放，請稍後再試')
  })

  it('play button is disabled when no audio_full', () => {
    const wrapper = mount(SongPlayer, { props: { song: { ...BASE_SONG, audio_full: null, lines: [] } } })
    const btn = wrapper.find('button[aria-label="播放"], button[aria-label="暫停"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })
})

describe('SongPlayer — effectiveStart（onLoaded）', () => {
  it('優先使用歌詞最小 start_time', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    const audioEl = wrapper.find('audio').element
    audioEl.currentTime = 0
    await wrapper.find('audio').trigger('loadedmetadata')
    expect(audioEl.currentTime).toBe(2.0)
  })

  it('fallback 到 audio_start（無歌詞時間）', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songNoLyricTimes } })
    const audioEl = wrapper.find('audio').element
    audioEl.currentTime = 0
    await wrapper.find('audio').trigger('loadedmetadata')
    expect(audioEl.currentTime).toBe(5.0)
  })

  it('無任何時間時設定為 0', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songNoTimes } })
    const audioEl = wrapper.find('audio').element
    audioEl.currentTime = 0
    await wrapper.find('audio').trigger('loadedmetadata')
    expect(audioEl.currentTime).toBe(0)
  })
})

describe('SongPlayer — effectiveEnd（onTimeUpdate）', () => {
  it('到達歌詞最大 end_time 時暫停', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    const audioEl = wrapper.find('audio').element
    let paused = false
    audioEl.pause = () => { paused = true }
    audioEl.currentTime = 9.1
    await wrapper.find('audio').trigger('timeupdate')
    expect(paused).toBe(true)
  })

  it('fallback 到 audio_end（無歌詞時間）時暫停', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songNoLyricTimes } })
    const audioEl = wrapper.find('audio').element
    let paused = false
    audioEl.pause = () => { paused = true }
    audioEl.currentTime = 30.5
    await wrapper.find('audio').trigger('timeupdate')
    expect(paused).toBe(true)
  })

  it('無 effectiveEnd 時不暫停', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songNoTimes } })
    const audioEl = wrapper.find('audio').element
    let paused = false
    audioEl.pause = () => { paused = true }
    audioEl.currentTime = 999
    await wrapper.find('audio').trigger('timeupdate')
    expect(paused).toBe(false)
  })
})

describe('SongPlayer — startPlayFromOverlay', () => {
  it('readyState >= 2 時套用 effectiveStart（歌詞時間）並播放', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    const audioEl = wrapper.find('audio').element
    let played = false
    audioEl.play = async () => { played = true }
    Object.defineProperty(audioEl, 'readyState', { value: 2, configurable: true })

    await wrapper.find('[aria-label="點擊開始播放"]').trigger('click')

    expect(audioEl.currentTime).toBe(2.0)
    expect(played).toBe(true)
  })

  it('readyState >= 2 時套用 audio_start fallback 並播放', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songNoLyricTimes } })
    const audioEl = wrapper.find('audio').element
    let played = false
    audioEl.play = async () => { played = true }
    Object.defineProperty(audioEl, 'readyState', { value: 2, configurable: true })

    await wrapper.find('[aria-label="點擊開始播放"]').trigger('click')

    expect(audioEl.currentTime).toBe(5.0)
    expect(played).toBe(true)
  })

  it('readyState < 2 時等待 canplay 後再套用 effectiveStart 並播放', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    const audioEl = wrapper.find('audio').element
    let played = false
    audioEl.play = async () => { played = true }
    Object.defineProperty(audioEl, 'readyState', { value: 0, configurable: true })

    await wrapper.find('[aria-label="點擊開始播放"]').trigger('click')
    expect(played).toBe(false)

    audioEl.dispatchEvent(new Event('canplay'))
    await wrapper.vm.$nextTick()

    expect(audioEl.currentTime).toBe(2.0)
    expect(played).toBe(true)
  })
})

describe('SongPlayer — togglePlay', () => {
  it('currentTime 在起點附近時套用 effectiveStart（歌詞時間）', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    const audioEl = wrapper.find('audio').element
    let played = false
    audioEl.play = async () => { played = true }
    audioEl.currentTime = 0

    await wrapper.find('button[aria-label="播放"]').trigger('click')

    expect(audioEl.currentTime).toBe(2.0)
    expect(played).toBe(true)
  })

  it('currentTime 在起點附近時套用 audio_start fallback', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songNoLyricTimes } })
    const audioEl = wrapper.find('audio').element
    let played = false
    audioEl.play = async () => { played = true }
    audioEl.currentTime = 0

    await wrapper.find('button[aria-label="播放"]').trigger('click')

    expect(audioEl.currentTime).toBe(5.0)
    expect(played).toBe(true)
  })

  it('currentTime 在中途（>= 0.3）時不重置位置', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    const audioEl = wrapper.find('audio').element
    let played = false
    audioEl.play = async () => { played = true }
    audioEl.currentTime = 6.0

    await wrapper.find('button[aria-label="播放"]').trigger('click')

    expect(audioEl.currentTime).toBe(6.0)
    expect(played).toBe(true)
  })
})
