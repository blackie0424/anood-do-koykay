import { mount, enableAutoUnmount } from '@vue/test-utils'
import { describe, it, expect, vi, afterEach } from 'vitest'
import BackLink from '../Components/BackLink.vue'
import PlayBar from '../Components/PlayBar.vue'
import SongPlayer from '../Pages/SongPlayer.vue'

// SongPlayer 播放中會用 setInterval 輪詢 currentTime，卸載時（onBeforeUnmount）才會停止；
// 沒有這行，任何觸發 'playing' 的測試都會留下一個永遠不會停的計時器。
enableAutoUnmount(afterEach)

// jsdom 沒有實作 scrollIntoView（既有限制），歌詞自動捲動會呼叫到它；補 no-op polyfill
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {})
}

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
    expect(wrapper.find('[aria-label="錄音段落 1"]').exists()).toBe(false)
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
    expect(wrapper.find('[aria-label="錄音段落 1"]').exists()).toBe(true)
  })

  it('未在播放時點錄唱鈕不呼叫 pause', async () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    const audioEl = wrapper.find('audio').element
    let pauseCalls = 0
    audioEl.pause = () => { pauseCalls++ }

    await wrapper.find('[aria-label="接唱錄音"]').trigger('click')

    expect(pauseCalls).toBe(0)
    expect(wrapper.find('[aria-label="錄音段落 1"]').exists()).toBe(true)
  })
})

describe('SongPlayer — 返回連結', () => {
  it('頂部有大字返回連結（BackLink size=lg）', () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    const backLink = wrapper.findComponent(BackLink)

    expect(backLink.exists()).toBe(true)
    expect(backLink.props('size')).toBe('lg')
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

describe('SongPlayer — 結尾自動暫停不只依賴 timeupdate（LINE WebView 情境：輪詢也會觸發）', () => {
  it('完全不觸發 timeupdate，輪詢仍會在到達 effectiveEnd 時暫停並進入逐段模式', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
      const audioEl = wrapper.find('audio').element
      audioEl.play = async () => {}
      let paused = false
      audioEl.pause = () => { paused = true }
      Object.defineProperty(audioEl, 'readyState', { value: 4, configurable: true })

      await wrapper.find('audio').trigger('playing')
      // 完全不觸發 timeupdate，只靠輪詢；直接把 currentTime 推到 effectiveEnd(9.0) 之後
      audioEl.currentTime = 9.1
      await vi.advanceTimersByTimeAsync(250)

      expect(paused).toBe(true)
      expect(wrapper.findComponent(PlayBar).props('label')).toBe('點選歌詞播放')
    } finally {
      vi.useRealTimers()
    }
  })

  it('逐段模式下完全不觸發 timeupdate，輪詢仍會在該行 end_time 暫停', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
      const audioEl = wrapper.find('audio').element
      audioEl.play = async () => {}
      let paused = false
      audioEl.pause = () => { paused = true }
      Object.defineProperty(audioEl, 'readyState', { value: 4, configurable: true })

      // 先靠輪詢把整首播完，進入逐段模式
      await wrapper.find('audio').trigger('playing')
      audioEl.currentTime = 9.1
      await vi.advanceTimersByTimeAsync(250)
      expect(wrapper.findComponent(PlayBar).props('label')).toBe('點選歌詞播放')

      // 點第一句進行逐段聆聽
      paused = false
      const maomawLine = wrapper.findAll('p').find((p) => p.text() === 'Maomaw')
      await maomawLine.element.parentElement.dispatchEvent(new Event('click', { bubbles: true }))
      await wrapper.vm.$nextTick()

      // 完全不觸發 timeupdate，只靠輪詢；把 currentTime 推到該行 end_time(6.0) 之後
      audioEl.currentTime = 6.1
      await vi.advanceTimersByTimeAsync(250)

      expect(paused).toBe(true)
    } finally {
      vi.useRealTimers()
    }
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

  it('readyState < 2 時 canplay 遲遲不觸發，3 秒後保險強制播放', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
      const audioEl = wrapper.find('audio').element
      let played = false
      audioEl.play = async () => { played = true }
      Object.defineProperty(audioEl, 'readyState', { value: 0, configurable: true })

      await wrapper.find('[aria-label="點擊開始播放"]').trigger('click')
      expect(played).toBe(false)

      await vi.advanceTimersByTimeAsync(3000)

      expect(audioEl.currentTime).toBe(2.0)
      expect(played).toBe(true)
    } finally {
      vi.useRealTimers()
    }
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

describe('SongPlayer — currentTime 用 setInterval 輪詢（不依賴 timeupdate／rAF）', () => {
  it('播放中即使完全不觸發 timeupdate，輪詢仍會更新歌詞高亮', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
      const audioEl = wrapper.find('audio').element

      await wrapper.find('audio').trigger('playing')

      // 模擬 LINE WebView 冷啟動：audio.currentTime 已經前進到第二句範圍，
      // 但完全不觸發 timeupdate（也不模擬 rAF，因為那個管道被證實不可靠）
      audioEl.currentTime = 6.5
      await vi.advanceTimersByTimeAsync(250)

      const anoodLine = wrapper.findAll('p').find((p) => p.text() === 'Anood')
      expect(anoodLine.element.parentElement.className).toContain('bg-blue-100')
    } finally {
      vi.useRealTimers()
    }
  })

  it('暫停時停止輪詢', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
      const audioEl = wrapper.find('audio').element
      Object.defineProperty(audioEl, 'paused', { value: false, configurable: true })

      await wrapper.find('audio').trigger('playing')
      expect(vi.getTimerCount()).toBeGreaterThan(0)

      Object.defineProperty(audioEl, 'paused', { value: true, configurable: true })
      await wrapper.find('audio').trigger('pause')

      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('播放結束（ended）時停止輪詢', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
      await wrapper.find('audio').trigger('playing')
      expect(vi.getTimerCount()).toBeGreaterThan(0)

      await wrapper.find('audio').trigger('ended')

      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('元件卸載時停止輪詢', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
      await wrapper.find('audio').trigger('playing')
      expect(vi.getTimerCount()).toBeGreaterThan(0)

      wrapper.unmount()

      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('SongPlayer — currentTime 回報卡住時 fallback 到 Date.now() 虛擬計時', () => {
  it('正常前進時全程用真實 currentTime，不啟用虛擬計時', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
      const audioEl = wrapper.find('audio').element
      Object.defineProperty(audioEl, 'readyState', { value: 4, configurable: true })

      await wrapper.find('audio').trigger('playing')

      for (let i = 0; i < 5; i++) {
        audioEl.currentTime = 2.0 + i * 0.25
        await vi.advanceTimersByTimeAsync(250)
      }

      expect(wrapper.vm.usingVirtualTime).toBe(false)
      expect(wrapper.vm.currentTime).toBeCloseTo(3.0, 2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('真的在緩衝（readyState<3）時 currentTime 停滯不會誤判為回報卡住', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
      const audioEl = wrapper.find('audio').element
      Object.defineProperty(audioEl, 'readyState', { value: 1, configurable: true }) // 還在緩衝

      await wrapper.find('audio').trigger('playing')
      audioEl.currentTime = 2.0

      await vi.advanceTimersByTimeAsync(250 * 5) // 連續多個 tick 都沒前進

      expect(wrapper.vm.usingVirtualTime).toBe(false)
      expect(wrapper.vm.isBuffering).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('資料已備妥但連續達到門檻沒前進，判定回報卡住並切換到虛擬計時持續前進', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
      const audioEl = wrapper.find('audio').element
      Object.defineProperty(audioEl, 'readyState', { value: 4, configurable: true }) // 資料已足夠

      await wrapper.find('audio').trigger('playing')
      audioEl.currentTime = 2.0

      // 第 1 次 tick 只是建立基準值，接下來連續 3 次（第 2~4 次）都卡在
      // 同一個值 → 第 4 次判定回報卡住，切換到虛擬計時（這個 tick 本身還
      // 是回報基準值，下一個 tick 才會真正開始用估算的往前推進）
      await vi.advanceTimersByTimeAsync(250)
      expect(wrapper.vm.usingVirtualTime).toBe(false)
      await vi.advanceTimersByTimeAsync(250)
      expect(wrapper.vm.usingVirtualTime).toBe(false)
      await vi.advanceTimersByTimeAsync(250)
      expect(wrapper.vm.usingVirtualTime).toBe(false)
      await vi.advanceTimersByTimeAsync(250)
      expect(wrapper.vm.usingVirtualTime).toBe(true)
      expect(wrapper.vm.currentTime).toBeCloseTo(2.0, 2)

      // 之後即使 audio.currentTime 依然卡住，currentTime 仍會用牆鐘時間繼續往前推進
      await vi.advanceTimersByTimeAsync(250)
      expect(wrapper.vm.currentTime).toBeCloseTo(2.25, 2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('回報恢復（真實 currentTime 又開始變化）時立刻切回真實值', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
      const audioEl = wrapper.find('audio').element
      Object.defineProperty(audioEl, 'readyState', { value: 4, configurable: true })

      await wrapper.find('audio').trigger('playing')
      audioEl.currentTime = 2.0
      await vi.advanceTimersByTimeAsync(250 * 4) // 進入虛擬計時
      expect(wrapper.vm.usingVirtualTime).toBe(true)

      audioEl.currentTime = 6.5 // 真實回報恢復了
      await vi.advanceTimersByTimeAsync(250)

      expect(wrapper.vm.usingVirtualTime).toBe(false)
      expect(wrapper.vm.currentTime).toBeCloseTo(6.5, 2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('虛擬計時期間暫停又恢復播放，不會把暫停的時間也算進前進量', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
      const audioEl = wrapper.find('audio').element
      Object.defineProperty(audioEl, 'readyState', { value: 4, configurable: true })
      Object.defineProperty(audioEl, 'paused', { value: false, configurable: true })

      await wrapper.find('audio').trigger('playing')
      audioEl.currentTime = 2.0
      await vi.advanceTimersByTimeAsync(250 * 4) // 進入虛擬計時，t=2.00
      expect(wrapper.vm.usingVirtualTime).toBe(true)

      // 暫停：停止輪詢，但虛擬計時的狀態還留著
      Object.defineProperty(audioEl, 'paused', { value: true, configurable: true })
      await wrapper.find('audio').trigger('pause')

      // 模擬真的暫停了 5 秒
      await vi.advanceTimersByTimeAsync(5000)

      // 恢復播放：重新對齊牆鐘基準，不該把剛剛暫停的 5 秒也算進去
      Object.defineProperty(audioEl, 'paused', { value: false, configurable: true })
      await wrapper.find('audio').trigger('playing')
      await vi.advanceTimersByTimeAsync(250)

      expect(wrapper.vm.currentTime).toBeCloseTo(2.25, 2)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('SongPlayer — 音訊緩衝中顯示「載入中…」', () => {
  it('playing 已觸發但 readyState<3（緩衝中）時，PlayBar 顯示「載入中…」', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
      const audioEl = wrapper.find('audio').element
      Object.defineProperty(audioEl, 'readyState', { value: 1, configurable: true }) // HAVE_METADATA，還在緩衝

      await wrapper.find('audio').trigger('playing')
      await vi.advanceTimersByTimeAsync(250) // 讓輪詢跑一次，讀到 readyState

      expect(wrapper.findComponent(PlayBar).props('label')).toBe('載入中…')
    } finally {
      vi.useRealTimers()
    }
  })

  it('緩衝完成（readyState>=3）後改顯示「播放中…」', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
      const audioEl = wrapper.find('audio').element
      Object.defineProperty(audioEl, 'readyState', { value: 1, configurable: true })

      await wrapper.find('audio').trigger('playing')
      await vi.advanceTimersByTimeAsync(250)
      expect(wrapper.findComponent(PlayBar).props('label')).toBe('載入中…')

      Object.defineProperty(audioEl, 'readyState', { value: 4, configurable: true }) // HAVE_ENOUGH_DATA
      await vi.advanceTimersByTimeAsync(250)

      expect(wrapper.findComponent(PlayBar).props('label')).toBe('播放中…')
    } finally {
      vi.useRealTimers()
    }
  })

  it('未播放時（isPlaying=false）即使 readyState<3 也不顯示載入中', () => {
    const wrapper = mount(SongPlayer, { props: { song: songWithLyricTimes } })
    expect(wrapper.findComponent(PlayBar).props('label')).not.toBe('載入中…')
  })
})
