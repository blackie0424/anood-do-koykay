/**
 * 整體播放計畫產生器（純函式，無副作用）。
 *
 * 規則（接唱模式 v1）：
 * - 依 line.order 由小到大處理每個段落。
 * - 該段有使用者錄音     → { lineId, source: 'user' }
 * - 該段無錄音但有時間軸 → { lineId, source: 'reference', start, end }
 *   （end 取 end_time，沒有則取下一段的 start_time，仍無則 null＝播到音檔結尾）
 * - 該段無錄音也無時間軸 → 跳過（沒有公版可補）
 *
 * 播放時以各段自身長度依序銜接，不對齊原版時間軸。
 *
 * @param {Array<{id:number, order:number, start_time:?number, end_time:?number}>} lines
 * @param {Iterable<number>} recordedLineIds 已有使用者錄音的 line id
 * @returns {Array<{lineId:number, source:'user'|'reference', start?:number, end?:?number}>}
 */
export function buildPlaybackPlan(lines, recordedLineIds = []) {
    const recorded = new Set(recordedLineIds)
    const ordered = [...(lines ?? [])].sort((a, b) => a.order - b.order)
    const plan = []

    for (let i = 0; i < ordered.length; i++) {
        const line = ordered[i]

        if (recorded.has(line.id)) {
            plan.push({ lineId: line.id, source: 'user' })
            continue
        }

        if (line.start_time != null) {
            const nextStart = ordered[i + 1]?.start_time ?? null
            const end = line.end_time ?? nextStart ?? null
            plan.push({ lineId: line.id, source: 'reference', start: line.start_time, end })
        }
        // 無錄音也無時間軸：跳過
    }

    return plan
}
