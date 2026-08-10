import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { Link } from '@inertiajs/vue3'
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

describe('SongPlayer — 接唱錄音鈕顯示條件', () => {
  it('有 audio_full 且段落有時間軸時顯示錄唱鈕', () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    expect(wrapper.find('[aria-label="接唱錄音"]').exists()).toBe(true)
  })

  it('段落無時間軸時隱藏錄唱鈕', () => {
    const wrapper = mount(SongPlayer, { props: { song: songNoLyricTimes } })
    expect(wrapper.find('[aria-label="接唱錄音"]').exists()).toBe(false)
  })

  it('無 audio_full 時隱藏錄唱鈕', () => {
    const wrapper = mount(SongPlayer, { props: { song: { ...BASE_SONG, audio_full: null, lines: songWithLyricTimes.lines } } })
    expect(wrapper.find('[aria-label="接唱錄音"]').exists()).toBe(false)
  })

  it('預設不顯示錄音介面', () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    expect(wrapper.find('[aria-label="整體播放我的接唱版本"]').exists()).toBe(false)
  })

  it('點錄唱鈕進入錄音模式時暫停原唱播放', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    const audioEl = wrapper.find('audio').element
    let paused = false
    audioEl.pause = () => { paused = true }
    // 模擬正在播放
    await wrapper.find('audio').trigger('playing')

    await wrapper.find('[aria-label="接唱錄音"]').trigger('click')

    expect(paused).toBe(true)
    expect(wrapper.find('[aria-label="整體播放我的接唱版本"]').exists()).toBe(true)
  })

  it('未在播放時點錄唱鈕不呼叫 pause', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    const audioEl = wrapper.find('audio').element
    let pauseCalls = 0
    audioEl.pause = () => { pauseCalls++ }

    await wrapper.find('[aria-label="接唱錄音"]').trigger('click')

    expect(pauseCalls).toBe(0)
    expect(wrapper.find('[aria-label="整體播放我的接唱版本"]').exists()).toBe(true)
  })
})

describe('SongPlayer — 返回清單連結快取', () => {
  it('返回清單連結用 mount 觸發 prefetch，快取 5 分鐘', () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    const backLink = wrapper.findComponent(Link)

    expect(backLink.props('href')).toBe('/')
    expect(backLink.props('prefetch')).toBe('mount')
    expect(backLink.props('cacheFor')).toBe('5m')
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
