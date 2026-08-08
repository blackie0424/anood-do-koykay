/**
 * 錄音本地儲存層（接唱模式 v1）。
 *
 * 錄音以 blob 形式存放，key 為 `${songId}:${lineId}`。
 * v1 僅存裝置本地、免登入、不上傳。
 *
 * 兩種實作共用同一介面：
 *   put(songId, lineId, blob)   → Promise<void>
 *   getAllForSong(songId)       → Promise<Map<lineId, blob>>
 *   remove(songId, lineId)      → Promise<void>
 *   clearSong(songId)           → Promise<void>
 */

const DB_NAME = 'anood-recordings'
const STORE = 'clips'
const DB_VERSION = 1

function keyOf(songId, lineId) {
    return `${songId}:${lineId}`
}

function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(STORE)) {
                const os = db.createObjectStore(STORE, { keyPath: 'key' })
                os.createIndex('songId', 'songId', { unique: false })
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

function tx(db, mode) {
    return db.transaction(STORE, mode).objectStore(STORE)
}

function reqToPromise(req) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

export function createIndexedDbStore() {
    return {
        async put(songId, lineId, blob) {
            const db = await openDb()
            await reqToPromise(tx(db, 'readwrite').put({ key: keyOf(songId, lineId), songId, lineId, blob }))
            db.close()
        },
        async getAllForSong(songId) {
            const db = await openDb()
            const all = await reqToPromise(tx(db, 'readonly').index('songId').getAll(songId))
            db.close()
            const map = new Map()
            for (const rec of all) map.set(rec.lineId, rec.blob)
            return map
        },
        async remove(songId, lineId) {
            const db = await openDb()
            await reqToPromise(tx(db, 'readwrite').delete(keyOf(songId, lineId)))
            db.close()
        },
        async clearSong(songId) {
            const db = await openDb()
            const store = tx(db, 'readwrite')
            const keys = await reqToPromise(store.index('songId').getAllKeys(songId))
            await Promise.all(keys.map(k => reqToPromise(store.delete(k))))
            db.close()
        },
    }
}

/**
 * 記憶體實作：供測試與不支援 IndexedDB 的環境注入使用。
 */
export function createMemoryStore() {
    const map = new Map() // key → { songId, lineId, blob }
    return {
        async put(songId, lineId, blob) {
            map.set(keyOf(songId, lineId), { songId, lineId, blob })
        },
        async getAllForSong(songId) {
            const out = new Map()
            for (const rec of map.values()) {
                if (rec.songId === songId) out.set(rec.lineId, rec.blob)
            }
            return out
        },
        async remove(songId, lineId) {
            map.delete(keyOf(songId, lineId))
        },
        async clearSong(songId) {
            for (const [k, rec] of [...map.entries()]) {
                if (rec.songId === songId) map.delete(k)
            }
        },
    }
}

/**
 * 依環境選擇預設 store：支援 IndexedDB 用之，否則退回記憶體。
 */
export function createDefaultStore() {
    if (typeof indexedDB !== 'undefined') return createIndexedDbStore()
    return createMemoryStore()
}
