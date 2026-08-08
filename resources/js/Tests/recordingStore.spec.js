import { describe, it, expect } from 'vitest'
import { createMemoryStore } from '../recording/recordingStore.js'

const blob = (s) => new Blob([s], { type: 'audio/webm' })

describe('createMemoryStore', () => {
    it('put 後 getAllForSong 取得對應段落 blob', async () => {
        const store = createMemoryStore()
        const b = blob('a')
        await store.put(1, 10, b)
        const map = await store.getAllForSong(1)
        expect(map.get(10)).toBe(b)
        expect(map.size).toBe(1)
    })

    it('同一段落重複 put 會覆蓋（重錄）', async () => {
        const store = createMemoryStore()
        await store.put(1, 10, blob('old'))
        const b2 = blob('new')
        await store.put(1, 10, b2)
        const map = await store.getAllForSong(1)
        expect(map.size).toBe(1)
        expect(map.get(10)).toBe(b2)
    })

    it('getAllForSong 只回傳該首歌的錄音', async () => {
        const store = createMemoryStore()
        await store.put(1, 10, blob('a'))
        await store.put(2, 10, blob('b'))
        const map = await store.getAllForSong(1)
        expect([...map.keys()]).toEqual([10])
    })

    it('remove 刪除單一段落', async () => {
        const store = createMemoryStore()
        await store.put(1, 10, blob('a'))
        await store.put(1, 11, blob('b'))
        await store.remove(1, 10)
        const map = await store.getAllForSong(1)
        expect(map.has(10)).toBe(false)
        expect(map.has(11)).toBe(true)
    })

    it('clearSong 清掉整首歌但不影響其他歌', async () => {
        const store = createMemoryStore()
        await store.put(1, 10, blob('a'))
        await store.put(1, 11, blob('b'))
        await store.put(2, 10, blob('c'))
        await store.clearSong(1)
        expect((await store.getAllForSong(1)).size).toBe(0)
        expect((await store.getAllForSong(2)).size).toBe(1)
    })

    it('查無資料時回傳空 Map', async () => {
        const store = createMemoryStore()
        expect((await store.getAllForSong(99)).size).toBe(0)
    })
})
