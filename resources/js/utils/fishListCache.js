/**
 * 魚類清單快取管理工具
 *
 * 用於標記需要更新或刪除的魚類 ID，讓 Fishs 頁面在還原快取時
 * 只更新特定魚類資料，同時保留瀏覽位置。
 */

const STALE_IDS_KEY = 'fishs_stale_ids'
const DELETED_IDS_KEY = 'fishs_deleted_ids'
const CREATED_IDS_KEY = 'fishs_created_ids'
const STORAGE_KEY = 'fishs_list_state'

/**
 * 清除 Fishs 頁面的所有快取（強制重新載入時使用）
 * 這會讓 Fishs 頁面下次載入時重新從伺服器取得資料
 */
export function clearFishListCache() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STALE_IDS_KEY)
    sessionStorage.removeItem(DELETED_IDS_KEY)
    sessionStorage.removeItem(CREATED_IDS_KEY)
  } catch (e) {
    // sessionStorage 不可用，忽略
  }
}

/**
 * 標記某筆魚類資料需要更新
 * @param {number|string} fishId - 魚類 ID
 */
export function markFishStale(fishId) {
  try {
    const ids = getStaleIds()
    const id = Number(fishId)
    if (!ids.includes(id)) {
      ids.push(id)
      sessionStorage.setItem(STALE_IDS_KEY, JSON.stringify(ids))
    }
  } catch (e) {
    // sessionStorage 不可用，忽略
  }
}

/**
 * 取得所有需要更新的魚類 ID
 * @returns {number[]} 魚類 ID 陣列
 */
export function getStaleIds() {
  try {
    const raw = sessionStorage.getItem(STALE_IDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(Number) : []
  } catch (e) {
    return []
  }
}

/**
 * 清除所有已標記的魚類 ID
 */
export function clearStaleIds() {
  try {
    sessionStorage.removeItem(STALE_IDS_KEY)
  } catch (e) {
    // 忽略
  }
}

/**
 * 移除特定魚類 ID 的標記
 * @param {number|string} fishId - 魚類 ID
 */
export function removeStaleFishId(fishId) {
  try {
    const ids = getStaleIds()
    const id = Number(fishId)
    const filtered = ids.filter((i) => i !== id)
    if (filtered.length > 0) {
      sessionStorage.setItem(STALE_IDS_KEY, JSON.stringify(filtered))
    } else {
      sessionStorage.removeItem(STALE_IDS_KEY)
    }
  } catch (e) {
    // 忽略
  }
}

// === 刪除標記相關函式 ===

/**
 * 標記某筆魚類資料已被刪除（例如合併後被刪除的來源魚類）
 * @param {number|string} fishId - 魚類 ID
 */
export function markFishDeleted(fishId) {
  try {
    const ids = getDeletedIds()
    const id = Number(fishId)
    if (!ids.includes(id)) {
      ids.push(id)
      sessionStorage.setItem(DELETED_IDS_KEY, JSON.stringify(ids))
    }
  } catch (e) {
    // sessionStorage 不可用，忽略
  }
}

/**
 * 批量標記多筆魚類資料已被刪除
 * @param {Array<number|string>} fishIds - 魚類 ID 陣列
 */
export function markFishesDeleted(fishIds) {
  try {
    const ids = getDeletedIds()
    fishIds.forEach((fishId) => {
      const id = Number(fishId)
      if (!ids.includes(id)) {
        ids.push(id)
      }
    })
    sessionStorage.setItem(DELETED_IDS_KEY, JSON.stringify(ids))
  } catch (e) {
    // sessionStorage 不可用，忽略
  }
}

/**
 * 取得所有已被標記刪除的魚類 ID
 * @returns {number[]} 魚類 ID 陣列
 */
export function getDeletedIds() {
  try {
    const raw = sessionStorage.getItem(DELETED_IDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(Number) : []
  } catch (e) {
    return []
  }
}

/**
 * 清除所有已標記刪除的魚類 ID
 */
export function clearDeletedIds() {
  try {
    sessionStorage.removeItem(DELETED_IDS_KEY)
  } catch (e) {
    // 忽略
  }
}

// === 新增標記相關函式 ===

/**
 * 標記新增的魚類 ID（新增後使用）
 * @param {number|string} fishId - 魚類 ID
 */
export function markFishCreated(fishId) {
  try {
    const ids = getCreatedIds()
    const id = Number(fishId)
    if (!ids.includes(id)) {
      ids.push(id)
      sessionStorage.setItem(CREATED_IDS_KEY, JSON.stringify(ids))
    }
  } catch (e) {
    // sessionStorage 不可用，忽略
  }
}

/**
 * 取得所有新增的魚類 ID
 * @returns {number[]} 魚類 ID 陣列
 */
export function getCreatedIds() {
  try {
    const raw = sessionStorage.getItem(CREATED_IDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(Number) : []
  } catch (e) {
    return []
  }
}

/**
 * 清除所有新增的魚類 ID 標記
 */
export function clearCreatedIds() {
  try {
    sessionStorage.removeItem(CREATED_IDS_KEY)
  } catch (e) {
    // 忽略
  }
}
