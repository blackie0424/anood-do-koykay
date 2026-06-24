/**
 * fishApi.js — 魚類相關 API 呼叫模組
 *
 * 封裝所有對 /prefix/api/fish 的 fetch 呼叫，
 * 讓呼叫方不直接依賴 fetch() 與 URL 字串，
 * 使邏輯可被 Vitest 測試取代（DIP）。
 */

const BASE_URL = '/prefix/api'

/**
 * 取得精簡格式的魚類資料（供清單快取更新使用）
 *
 * @param {number|string} id 魚類 ID
 * @returns {Promise<Object|null>} 魚類精簡資料，HTTP 失敗或例外時回傳 null
 */
export async function getFishCompact(id) {
  const response = await fetch(`${BASE_URL}/fish/${id}/compact`)
  if (!response.ok) return null
  const result = await response.json()
  return result.data ?? null
}

/**
 * 取得所有魚類中最新的 updated_at（Unix ms），供快取驗證使用
 *
 * @returns {Promise<number|null>} Unix ms 時間戳，無資料或失敗時回傳 null
 */
export async function getFishLatestAt() {
  try {
    const response = await fetch(`${BASE_URL}/fishs/latest-at`)
    if (!response.ok) return null
    const result = await response.json()
    return result.data?.latest_at ?? null
  } catch {
    return null
  }
}

export async function searchFishs(q) {
  const response = await fetch(`${BASE_URL}/fishs/search?q=${encodeURIComponent(q)}`)
  if (!response.ok) return null
  const result = await response.json()
  return result.data ?? null
}

export async function filterFishs(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const url = qs ? `${BASE_URL}/fishs/filter?${qs}` : `${BASE_URL}/fishs/filter`
  const response = await fetch(url)
  if (!response.ok) return null
  const result = await response.json()
  return result.data ?? null
}

export async function createFish(data) {
  const response = await fetch(`${BASE_URL}/fish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error(`HTTP error ${response.status}`)
  return await response.json()
}

export async function getTribalClassifications(fishId) {
  const response = await fetch(`${BASE_URL}/fish/${fishId}/tribal-classifications`)
  if (!response.ok) return null
  const result = await response.json()
  return result.data ?? null
}

export async function createTribalClassification(fishId, data) {
  const response = await fetch(`${BASE_URL}/fish/${fishId}/tribal-classifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error(`HTTP error ${response.status}`)
  return await response.json()
}

export async function updateTribalClassification(id, data) {
  const response = await fetch(`${BASE_URL}/tribal-classifications/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error(`HTTP error ${response.status}`)
  return await response.json()
}

export async function deleteTribalClassification(id) {
  const response = await fetch(`${BASE_URL}/tribal-classifications/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error(`HTTP error ${response.status}`)
  return await response.json()
}

export async function createFishNote(fishId, data) {
  const response = await fetch(`${BASE_URL}/fish/${fishId}/note`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error(`HTTP error ${response.status}`)
  return await response.json()
}

export async function getFishNotesList(fishId) {
  const response = await fetch(`${BASE_URL}/fish/${fishId}/notes`)
  if (!response.ok) return null
  const result = await response.json()
  return result.data ?? null
}
