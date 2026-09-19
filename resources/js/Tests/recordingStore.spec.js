import { beforeEach, describe, it, expect, vi } from 'vitest'
import { createIndexedDbStore, createMemoryStore } from '../recording/recordingStore.js'

const { openDBMock } = vi.hoisted(() => ({ openDBMock: vi.fn() }))

vi.mock('idb', () => ({ openDB: openDBMock }))

function fakeDb(overrides = {}) {
    return {
        put: vi.fn(async () => {}),
        getAllFromIndex: vi.fn(async () => []),
        delete: vi.fn(async () => {}),
        close: vi.fn(),
        ...overrides,
    }
}

beforeEach(() => {
    openDBMock.mockReset()
})

const blob = (s) => new Blob([s], { type: 'audio/webm' })

describe('createMemoryStore', () => {
    it('put 後 getAllForSong 取得對應段落 blob 與時長', async () => {
        const store = createMemoryStore()
        const b = blob('a')
        await store.put(1, 10, b, 1234)
        const map = await store.getAllForSong(1)
        expect(map.get(10).blob).toBe(b)
        expect(map.get(10).duration).toBe(1234)
        expect(map.size).toBe(1)
    })

    it('未給時長時 duration 為 null', async () => {
        const store = createMemoryStore()
        await store.put(1, 10, blob('a'))
        const map = await store.getAllForSong(1)
        expect(map.get(10).duration).toBe(null)
    })

    it('同一段落重複 put 會覆蓋（重錄）', async () => {
        const store = createMemoryStore()
        await store.put(1, 10, blob('old'))
        const b2 = blob('new')
        await store.put(1, 10, b2)
        const map = await store.getAllForSong(1)
        expect(map.size).toBe(1)
        expect(map.get(10).blob).toBe(b2)
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

describe('createIndexedDbStore connection lifecycle', () => {
    it('put → getAllForSong → remove 共用同一條連線', async () => {
        const db = fakeDb({
            getAllFromIndex: vi.fn(async () => [
                { lineId: 10, blob: blob('saved'), duration: 123 },
            ]),
        })
        openDBMock.mockResolvedValue(db)
        const store = createIndexedDbStore()

        await store.put(1, 10, blob('saved'), 123)
        const records = await store.getAllForSong(1)
        await store.remove(1, 10)

        expect(openDBMock).toHaveBeenCalledTimes(1)
        expect(records.get(10).duration).toBe(123)
    })

    it('versionchange 關閉目前連線，下一次操作重新開啟', async () => {
        const firstDb = fakeDb()
        const secondDb = fakeDb()
        openDBMock.mockResolvedValueOnce(firstDb).mockResolvedValueOnce(secondDb)
        const store = createIndexedDbStore()

        await store.put(1, 10, blob('first'))
        const blocking = openDBMock.mock.calls[0][2].blocking
        blocking()
        await store.remove(1, 10)
        blocking()
        await store.getAllForSong(1)

        expect(firstDb.close).toHaveBeenCalledTimes(1)
        expect(openDBMock).toHaveBeenCalledTimes(2)
        expect(secondDb.delete).toHaveBeenCalled()
    })

    it('連線非預期 terminated 後，下一次操作重新開啟', async () => {
        const firstDb = fakeDb()
        const secondDb = fakeDb()
        openDBMock.mockResolvedValueOnce(firstDb).mockResolvedValueOnce(secondDb)
        const store = createIndexedDbStore()

        await store.put(1, 10, blob('first'))
        openDBMock.mock.calls[0][2].terminated()
        await store.remove(1, 10)

        expect(firstDb.close).not.toHaveBeenCalled()
        expect(openDBMock).toHaveBeenCalledTimes(2)
        expect(secondDb.delete).toHaveBeenCalledTimes(1)
    })

    it('連線已關閉的 InvalidStateError 只重連重試一次', async () => {
        const closed = new DOMException('connection closed', 'InvalidStateError')
        const firstDb = fakeDb({ put: vi.fn(async () => { throw closed }) })
        const secondDb = fakeDb()
        openDBMock.mockResolvedValueOnce(firstDb).mockResolvedValueOnce(secondDb)
        const store = createIndexedDbStore()

        await store.put(1, 10, blob('retry'))

        expect(firstDb.close).toHaveBeenCalledTimes(1)
        expect(openDBMock).toHaveBeenCalledTimes(2)
        expect(secondDb.put).toHaveBeenCalledTimes(1)
    })

    it('非連線錯誤不重試', async () => {
        const quota = new DOMException('quota exceeded', 'QuotaExceededError')
        const db = fakeDb({ put: vi.fn(async () => { throw quota }) })
        openDBMock.mockResolvedValue(db)
        const store = createIndexedDbStore()

        await expect(store.put(1, 10, blob('too large'))).rejects.toBe(quota)
        expect(openDBMock).toHaveBeenCalledTimes(1)
        expect(db.put).toHaveBeenCalledTimes(1)
    })
})
