/**
 * 將日期字串格式化為 YYYY/MM/DD（零補位）
 * @param {string|null|undefined} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

/**
 * 將日期字串格式化為繁體中文日期時間（toLocaleString zh-TW）
 * @param {string|null|undefined} dateStr
 * @returns {string}
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-TW')
}
