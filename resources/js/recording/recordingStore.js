import { openDB } from 'idb'

/**
 * 錄音本地儲存層（接唱模式 v1）。
 *
 * 錄音以 blob 形式存放，key 為 `${songId}:${lineId}`。
 * v1 僅存裝置本地、免登入、不上傳。
 *
 * 兩種實作共用同一介面：
 *   put(songId, lineId, blob, duration?) → Promise<void>
 *   getAllForSong(songId)                → Promise<Map<lineId, { blob, duration }>>
 *   remove(songId, lineId)               → Promise<void>
 *   clearSong(songId)                    → Promise<void>
 */

const DB_NAME = 'anood-recordings'
const STORE = 'clips'
const DB_VERSION = 1

function keyOf(songId, lineId) {
    return `${songId}:${lineId}`
}

export function createIndexedDbStore() {
    let dbPromise = null
    let currentDb = null

    function invalidate(db, close = false) {
        if (currentDb !== db) return
        currentDb = null
        dbPromise = null
        if (close) db.close()
    }

    function openConnection() {
        let openedDb = null
        const opening = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE)) {
                    const store = db.createObjectStore(STORE, { keyPath: 'key' })
                    store.createIndex('songId', 'songId', { unique: false })
                }
            },
            blocking() {
                invalidate(openedDb, true)
            },
            terminated() {
                invalidate(openedDb)
            },
        })
        dbPromise = opening
        return opening.then(
            (db) => {
                openedDb = db
                if (dbPromise === opening) currentDb = db
                return db
            },
            (error) => {
                if (dbPromise === opening) dbPromise = null
                throw error
            },
        )
    }

    function getDb() {
        return dbPromise ?? openConnection()
    }

    async function withConnection(operation, retry = true) {
        let db = null
        try {
            db = await getDb()
            return await operation(db)
        } catch (error) {
            if (error?.name === 'InvalidStateError') {
                if (db) invalidate(db, true)
                if (retry) return withConnection(operation, false)
            }
            throw error
        }
    }

    return {
        put(songId, lineId, blob, duration = null) {
            return withConnection(db => db.put(STORE, {
                key: keyOf(songId, lineId), songId, lineId, blob, duration,
            }))
        },
        async getAllForSong(songId) {
            const all = await withConnection(db => db.getAllFromIndex(STORE, 'songId', songId))
            const map = new Map()
            for (const rec of all) map.set(rec.lineId, { blob: rec.blob, duration: rec.duration ?? null })
            return map
        },
        remove(songId, lineId) {
            return withConnection(db => db.delete(STORE, keyOf(songId, lineId)))
        },
        clearSong(songId) {
            return withConnection(async (db) => {
                const transaction = db.transaction(STORE, 'readwrite')
                const store = transaction.objectStore(STORE)
                const keys = await store.index('songId').getAllKeys(songId)
                await Promise.all(keys.map(key => store.delete(key)))
                await transaction.done
            })
        },
    }
}

/**
 * 記憶體實作：供測試與不支援 IndexedDB 的環境注入使用。
 */
export function createMemoryStore() {
    const map = new Map() // key → { songId, lineId, blob, duration }
    return {
        async put(songId, lineId, blob, duration = null) {
            map.set(keyOf(songId, lineId), { songId, lineId, blob, duration })
        },
        async getAllForSong(songId) {
            const out = new Map()
            for (const rec of map.values()) {
                if (rec.songId === songId) out.set(rec.lineId, { blob: rec.blob, duration: rec.duration ?? null })
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
